import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, requireUser, rateLimit, readJson, isResponse, validateImage } from "../_shared/guard.ts";
import { loadUserContext } from "../_shared/userContext.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);
  const auth = await requireUser(req);
  if (isResponse(auth)) return auth;
  const limited = rateLimit("food-scan:" + auth.userId, 12);
  if (limited) return limited;

  // Valida que o usuário autenticado possui perfil acessível via RLS.
  const userCtx = await loadUserContext(req, auth.userId);
  if (isResponse(userCtx)) return userCtx;


  try {
    const body = await readJson(req);
    if (isResponse(body)) return body;
    const { imageBase64, objetivo: rawObjetivo } = body as Record<string, unknown>;
    const objetivo = typeof rawObjetivo === "string" ? rawObjetivo.slice(0, 300) : "";
    const badImage = validateImage(imageBase64);
    if (badImage) return badImage;
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "Imagem inválida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");

    const objetivoCtx = objetivo ? `\nObjetivo do usuário: ${objetivo}. Adapte o campo "analise_objetivo" a esse objetivo.` : "";

    const systemPrompt = `Você é o Evolua Plus AI, assistente de nutrição baseado em IA (NÃO é nutricionista nem profissional de saúde). Identificações por imagem são ESTIMATIVAS: use o campo "confianca" com honestidade, nunca apresente valores como exatos e nunca invente marcas ou produtos. Analise a foto de um alimento, bebida ou produto alimentício.
Responda APENAS com JSON válido (sem markdown, sem backticks) nesta estrutura exata:
{
  "sucesso": boolean,
  "erro": "string ou null",
  "alimentos": [
    {
      "nome": "string",
      "emoji": "string com 1 emoji",
      "categoria": "string (ex: Fruta, Bebida industrializada, Proteína animal)",
      "marca": "string ou null",
      "tipo_produto": "string (natural, industrializado, preparado)",
      "confianca": number (0-100),
      "porcao_base": "string ex: 100g ou 350ml",
      "porcao_base_g": number,
      "quantidade_estimada": "string ex: 1 unidade média (~120g)",
      "ingredientes_visiveis": ["string"],
      "macros": {"calorias": number, "proteina": number, "carboidratos": number, "gorduras": number, "fibras": number, "acucares": number},
      "micros": {"vitamina_c_mg": number, "calcio_mg": number, "ferro_mg": number, "potassio_mg": number, "magnesio_mg": number, "sodio_mg": number},
      "alternativas": [{"nome": "string", "motivo": "string curto"}],
      "analise_objetivo": "string curta (1-2 frases) sobre o impacto para o objetivo do usuário",
      "possiveis_identificacoes": [{"nome": "string", "confianca": number}]
    }
  ]
}

Regras:
- TODOS os macros e micros referem-se à "porcao_base" informada (use 100g para sólidos, 100ml para líquidos).
- Se a foto tiver vários alimentos (ex: prato feito com arroz, feijão, frango e salada), SEPARE e retorne um item por alimento identificado, com a quantidade estimada de cada componente do prato.
- Nunca apresente estimativas como valores exatos: em "quantidade_estimada" use linguagem de estimativa (ex: "aprox. 4 colheres (~120g)").
- Se a imagem estiver ruim, escura, sem alimento ou ilegível: {"sucesso": false, "erro": "mensagem amigável em português", "alimentos": []}.
- Se houver dúvida na identificação, preencha "possiveis_identificacoes" com 2-3 opções e suas confianças; caso contrário use [].
- Sugira 2-3 alternativas mais saudáveis relevantes.
- Nunca invente marcas: use null se não estiver visível.
- Responda SOMENTE o JSON.${objetivoCtx}`;

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
              { type: "text", text: "Analise esta imagem e retorne o JSON nutricional." },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Aguarde alguns segundos e tente novamente." }), {
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
      return new Response(JSON.stringify({ error: "Erro ao analisar a imagem" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    let parsed;
    try {
      const clean = content.replace(/```json/gi, "").replace(/```/g, "").trim();
      const start = clean.indexOf("{");
      const end = clean.lastIndexOf("}");
      parsed = JSON.parse(start >= 0 ? clean.slice(start, end + 1) : clean);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Não consegui interpretar a análise. Tente novamente." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("food-scan error:", err);
    return new Response(JSON.stringify({ error: "Erro interno. Tente novamente." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});