import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, requireUser, rateLimit, readJson, isResponse, validateImage } from "../_shared/guard.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);
  const auth = await requireUser(req);
  if (isResponse(auth)) return auth;
  const limited = rateLimit("portion-scanner:" + auth.userId, 12);
  if (limited) return limited;


  try {
    const body = await readJson(req);
    if (isResponse(body)) return body;
    const { imageBase64 } = body as Record<string, unknown>;
    const badImage = validateImage(imageBase64);
    if (badImage) return badImage;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");

    const systemPrompt = `Você é o Evolua Plus AI, assistente de nutrição baseado em IA (NÃO é nutricionista nem profissional de saúde). Todos os números são ESTIMATIVAS visuais, nunca valores exatos. Analise a foto de um prato/porção. Retorne APENAS JSON válido (sem markdown):
{
  "prato": "string breve descrevendo o prato",
  "porcao_estimada": "string ex: 250g, 1 prato médio",
  "calorias_totais": number,
  "itens": [{"alimento":"string","quantidade":"string","calorias":number,"proteina":number,"carb":number,"gordura":number}],
  "avaliacao": "string curta sobre valor nutricional",
  "dica": "string curta com uma sugestão prática"
}
Seja realista nas quantidades. Sem texto extra fora do JSON.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analise esta porção e retorne o JSON." },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: "Erro na análise" }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let raw = data.choices?.[0]?.message?.content ?? "";
    raw = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const parsed = JSON.parse(start >= 0 ? raw.slice(start, end + 1) : raw);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("portion-scanner error:", err);
    return new Response(JSON.stringify({ error: "Erro interno. Tente novamente." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});