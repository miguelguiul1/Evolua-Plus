import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, requireUser, rateLimit, readJson, isResponse, validateImage } from "../_shared/guard.ts";
import { loadUserContext } from "../_shared/userContext.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);
  const auth = await requireUser(req);
  if (isResponse(auth)) return auth;
  const limited = rateLimit("analyze-fridge:" + auth.userId, 8);
  if (limited) return limited;


  try {
    const body = await readJson(req);
    if (isResponse(body)) return body;
    const { imageBase64 } = body as Record<string, unknown>;
    const badImage = validateImage(imageBase64);
    if (badImage) return badImage;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Contexto do usuário vem SEMPRE do banco (RLS ativa via JWT).
    const ctx = await loadUserContext(req, auth.userId);
    if (isResponse(ctx)) return ctx;

    let preferencesContext = "";
    if (ctx.preferences) {
      const parts: string[] = [];
      if (ctx.preferences.objective) parts.push(`Objetivo do usuário: ${ctx.preferences.objective}`);
      if (ctx.preferences.restrictions?.length) parts.push(`Restrições alimentares: ${ctx.preferences.restrictions.join(", ")}`);
      if (ctx.preferences.disliked_foods?.length) parts.push(`Alimentos que NÃO gosta (NUNCA use nas receitas): ${ctx.preferences.disliked_foods.join(", ")}`);
      if (ctx.preferences.liked_foods?.length) parts.push(`Alimentos preferidos (priorize nas receitas): ${ctx.preferences.liked_foods.join(", ")}`);
      if (parts.length) preferencesContext = `\n\nPERFIL DO USUÁRIO:\n${parts.join("\n")}`;
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analise esta foto da geladeira e identifique os alimentos. Retorne o JSON com alimentos, receitas e dicas." },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao processar a imagem" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleanContent);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Erro ao interpretar a resposta da IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Shape esperado: JSON com alimentos, receitas e dicas como arrays.
    const hasValidShape =
      parsed && Array.isArray(parsed.alimentos) && Array.isArray(parsed.receitas) && Array.isArray(parsed.dicas);
    if (!hasValidShape) {
      console.error("Unexpected AI shape:", content.substring(0, 300));
      return new Response(JSON.stringify({ error: "Erro ao interpretar a resposta da IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-fridge error:", e);
    return new Response(JSON.stringify({ error: "Erro interno. Tente novamente." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
