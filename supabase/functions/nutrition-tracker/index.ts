import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, requireUser, rateLimit, readJson, isResponse } from "../_shared/guard.ts";
import { loadUserContext } from "../_shared/userContext.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);
  const auth = await requireUser(req);
  if (isResponse(auth)) return auth;
  const limited = rateLimit("nutrition-tracker:" + auth.userId, 30);
  if (limited) return limited;


  try {
    const body = await readJson(req);
    if (isResponse(body)) return body;
    const { action, foodName: rawFood, quantity: rawQty, dailyLog } = body as Record<string, unknown>;
    if (action !== "estimate" && action !== "analyze") return json({ error: "Ação inválida." }, 400);
    const foodName = typeof rawFood === "string" ? rawFood.slice(0, 200) : "";
    const quantity = typeof rawQty === "string" ? rawQty.slice(0, 100) : "";
    if (action === "estimate" && !foodName.trim()) return json({ error: "Informe o alimento." }, 400);
    if (action === "analyze" && !Array.isArray(dailyLog)) return json({ error: "Registro inválido." }, 400);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Contexto do usuário vem do banco para ações que precisam de preferências.
    let prefContext = "";
    if (action === "analyze") {
      const ctx = await loadUserContext(req, auth.userId);
      if (isResponse(ctx)) return ctx;
      if (ctx.preferences?.objective) prefContext = `\nObjetivo do usuário: ${ctx.preferences.objective}`;
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "estimate") {
      // Estimate nutritional info for a food item
      systemPrompt = `Você é o Evolua Plus AI, assistente de nutrição baseado em IA (NÃO é nutricionista nem médico). Estime os valores nutricionais do alimento informado. Retorne APENAS JSON (sem markdown):
{"calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number}
Valores devem ser para a quantidade especificada. Seja preciso baseando-se em tabelas nutricionais brasileiras (TACO/IBGE).`;
      userPrompt = `Alimento: ${foodName}, Quantidade: ${quantity}`;
    } else if (action === "analyze") {
      // Analyze daily consumption
      systemPrompt = `Você é o Evolua Plus AI, assistente de nutrição baseado em IA (NÃO é nutricionista nem médico; não diagnostique nem prescreva). Analise o consumo alimentar diário e retorne APENAS JSON (sem markdown):
{
  "resumo": {"calorias_total": number, "proteina_total": number, "carb_total": number, "gordura_total": number, "fibra_total": number},
  "meta_sugerida": {"calorias": number, "proteina": number, "carbs": number, "gordura": number, "fibra": number},
  "pontuacao": number,
  "status": "excelente" | "bom" | "regular" | "precisa_melhorar",
  "excessos": ["string"],
  "deficiencias": ["string"],
  "sugestoes": ["string"],
  "proximo_passo": "string"
}
- pontuacao de 0 a 100
- Compare com metas baseadas no objetivo do usuário
- Sugira ajustes práticos e específicos
- Identifique excessos e deficiências de macro/micronutrientes${prefContext}`;
      userPrompt = `Registro alimentar do dia:\n${JSON.stringify(dailyLog)}`;
    }

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
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao processar" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const clean = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      console.error("Parse error:", content);
      return new Response(JSON.stringify({ error: "Erro ao interpretar resposta" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nutrition-tracker error:", e);
    return new Response(JSON.stringify({ error: "Erro interno. Tente novamente." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
