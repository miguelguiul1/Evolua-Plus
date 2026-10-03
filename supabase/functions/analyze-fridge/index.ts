import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, requireUser, requireAiConsent, rateLimit, readJson, isResponse, validateImage } from "../_shared/guard.ts";
import { chatCompletion, requireAiConfig } from "../_shared/aiClient.ts";
import { loadUserContext } from "../_shared/userContext.ts";
import { buildForbiddenPromptLine, buildForbiddenTerms } from "../_shared/foodPreferences.ts";
import { AIHttpError, guardHeader } from "../_shared/aiGuard.ts";
import { runFridgeGuard } from "../_shared/recipeGuards.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);
  const auth = await requireUser(req);
  if (isResponse(auth)) return auth;
  const noConsent = requireAiConsent(auth);
  if (noConsent) return noConsent;
  const limited = rateLimit("analyze-fridge:" + auth.userId, 8);
  if (limited) return limited;


  try {
    const body = await readJson(req);
    if (isResponse(body)) return body;
    const { imageBase64 } = body as Record<string, unknown>;
    const badImage = validateImage(imageBase64);
    if (badImage) return badImage;
    const aiConfig = requireAiConfig();

    // Contexto do usuário vem SEMPRE do banco (RLS ativa via JWT).
    const ctx = await loadUserContext(req, auth.userId);
    if (isResponse(ctx)) return ctx;

    let preferencesContext = "";
    if (ctx.preferences) {
      const parts: string[] = [];
      if (ctx.preferences.objective) parts.push(`Objetivo do usuário: ${ctx.preferences.objective}`);
      if (ctx.preferences.restrictions?.length) parts.push(`Restrições alimentares: ${ctx.preferences.restrictions.join(", ")}`);
      if (ctx.preferences.liked_foods?.length) parts.push(`Alimentos preferidos (priorize nas receitas, exceto se proibidos): ${ctx.preferences.liked_foods.join(", ")}`);
      if (parts.length) preferencesContext = `\n\nPERFIL DO USUÁRIO:\n${parts.join("\n")}`;
    }
    // Vale só para as RECEITAS sugeridas: os alimentos da foto são o que a pessoa tem.
    const forbiddenTerms = buildForbiddenTerms(ctx.preferences?.disliked_foods ?? [], ctx.preferences?.restrictions ?? []);
    const forbiddenBlock = buildForbiddenPromptLine(forbiddenTerms);
    if (forbiddenBlock) {
      preferencesContext += `\n\nALIMENTOS PROIBIDOS NAS RECEITAS (liste-os normalmente em "alimentos" se estiverem na foto, mas NUNCA os use nas receitas):\n${forbiddenBlock}`;
    }

    const systemPrompt = `Você é o Evolua Plus AI, assistente de nutrição baseado em IA (NÃO é nutricionista, médico nem profissional de saúde; nunca afirme formação, registro profissional ou identidade humana). Todos os valores nutricionais são ESTIMATIVAS. Analise a foto da geladeira e retorne APENAS um JSON válido (sem markdown, sem backticks) com esta estrutura:
{
  "alimentos": [{"nome": "string", "quantidade": "string", "calorias": number}],
  "receitas": [{"nome": "string", "ingredientes": ["string"], "tempo": "string", "calorias": number, "proteina": number, "carb": number, "gordura": number, "preparo": "string"}],
  "dicas": ["string"]
}

Regras:
- Identifique TODOS os alimentos visíveis na foto
- Sugira 3-4 receitas práticas (até 15 min) usando esses alimentos
- Priorize receitas econômicas e saudáveis
- Dê 3 dicas personalizadas sobre nutrição baseadas nos alimentos encontrados
- Calorias são por porção/100g
- Responda SOMENTE com o JSON, sem texto adicional${preferencesContext}`;

    const userText = "Analise esta foto da geladeira e identifique os alimentos. Retorne o JSON com alimentos, receitas e dicas.";

    /** Uma chamada à IA (a foto vai de novo na regeneração). */
    const callAI = async (feedback: string | null): Promise<string> => {
      const response = await chatCompletion(aiConfig, {
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: feedback ? `${userText}\n\n${feedback}` : userText },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
      });
      if (!response.ok) throw new AIHttpError(response.status, await response.text());
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    };

    let guarded;
    try {
      guarded = await runFridgeGuard({ callAI, terms: forbiddenTerms, timeBudgetMs: 45_000 });
    } catch (e) {
      if (!(e instanceof AIHttpError)) throw e;
      if (e.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (e.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", e.status, e.body);
      return new Response(JSON.stringify({ error: "Erro ao processar a imagem" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Shape esperado (alimentos, receitas e dicas como arrays) é checado no parse.
    if (!guarded.value) {
      console.error("Failed to parse AI response (JSON inválido ou formato inesperado)");
      return new Response(JSON.stringify({ error: "Erro ao interpretar a resposta da IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(guarded.value), {
      headers: { ...corsHeaders, "Content-Type": "application/json", ...guardHeader(guarded) },
    });
  } catch (e) {
    console.error("analyze-fridge error:", e);
    return new Response(JSON.stringify({ error: "Erro interno. Tente novamente." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
