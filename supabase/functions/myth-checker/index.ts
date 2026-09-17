import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, requireUser, rateLimit, readJson, isResponse } from "../_shared/guard.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);
  const auth = await requireUser(req);
  if (isResponse(auth)) return auth;
  const limited = rateLimit("myth-checker:" + auth.userId, 15);
  if (limited) return limited;


  try {
    const body = await readJson(req);
    if (isResponse(body)) return body;
    const { question: rawQuestion } = body as Record<string, unknown>;
    const question = typeof rawQuestion === "string" ? rawQuestion.slice(0, 500) : "";
    if (!question || typeof question !== "string" || question.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Pergunta inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é o Evolua Plus AI, assistente baseado em IA especializado em desmistificar mitos alimentares (NÃO é nutricionista nem médico; nunca diagnostique nem prescreva). Se a afirmação envolver doença, medicamento, gravidez ou transtorno alimentar, explique de forma educativa e oriente avaliação com profissional de saúde. 
Responda APENAS com JSON válido, sem markdown. Use este formato:
{"veredicto":"MITO" ou "VERDADE" ou "PARCIALMENTE VERDADE","explicacao":"explicação clara em 2-3 frases","fonte":"nome da instituição científica que embasa a resposta"}

Base suas respostas em evidências de: OMS, Harvard T.H. Chan, Ministério da Saúde, estudos publicados em journals revisados por pares. Seja direto e acessível.`,
          },
          {
            role: "user",
            content: `A seguinte afirmação é mito ou verdade? "${question.trim()}"`,
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Muitas requisições, tente novamente em alguns segundos." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) throw new Error(`AI error: ${response.status}`);

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\s*/g, "").replace(/```/g, "").trim();

    const result = JSON.parse(content);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("myth-checker error:", e);
    return new Response(JSON.stringify({ error: "Erro ao verificar. Tente reformular sua pergunta." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
