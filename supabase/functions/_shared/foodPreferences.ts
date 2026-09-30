/**
 * Alimentos que o usuário não gosta + alergias/restrições → termos proibidos.
 *
 * Módulo PURO (sem APIs do Deno nem do navegador, só imports relativos): é o MESMO
 * arquivo usado pelas Edge Functions e pelo frontend (reexportado em
 * src/lib/foodPreferences.ts). Não existe espelho para manter em sincronia.
 *
 * Regras de comparação:
 * - minúsculas, sem acento, hífen = espaço ("grão-de-bico" = "grão de bico");
 * - cada palavra no singular ("tomates" = "tomate", "limões" = "limão");
 * - casamento por PALAVRA inteira, nunca substring ("ervilha" não casa "berinjela",
 *   "cebola" não casa "cebolinha");
 * - sinônimos regionais (cilantro = coentro, aipim = mandioca...);
 * - categorias amplas expandem (peixe → tilápia, salmão...), mas alimentos comuns NÃO
 *   expandem para derivados ("leite" não bloqueia queijo). Só alergia expande derivados.
 */

// ---------------------------------------------------------------------------
// Normalização
// ---------------------------------------------------------------------------

const stripAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Palavras terminadas em "s" que já estão no singular. */
const INVARIANT = new Set(["ananas", "lapis", "pires", "atras", "tenis", "onibus", "virus", "gas", "cuscus"]);

/** Singular aproximado do português. Aplicado igual no termo e no texto, então basta ser consistente. */
export function singularize(word: string): string {
  if (word.length <= 3 || INVARIANT.has(word)) return word;
  if (/(oes|aes)$/.test(word)) return word.slice(0, -3) + "ao"; // limões, pães
  if (/aos$/.test(word)) return word.slice(0, -1); // grãos
  if (/ns$/.test(word)) return word.slice(0, -2) + "m"; // atuns
  if (/[rz]es$/.test(word)) return word.slice(0, -2); // nozes, colheres
  if (/ais$/.test(word) && word.length > 4) return word.slice(0, -2) + "l"; // cereais
  if (/eis$/.test(word) && word.length > 4) return word.slice(0, -3) + "el"; // pastéis
  if (/s$/.test(word) && !/ss$/.test(word)) return word.slice(0, -1);
  return word;
}

const LEADING_ARTICLES = new Set(["o", "a", "os", "as", "um", "uma", "uns", "umas"]);

/** Palavras normalizadas (sem acento, minúsculas, singular) de um texto qualquer. */
const normalizeWords = (text: string): string[] =>
  stripAccents(text.normalize("NFC").toLowerCase())
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map(singularize);

/** Chave de comparação de um alimento: "Os Tomates" → "tomate", "Grão-de-bico" → "grao de bico". */
export function normalizeFood(text: string): string {
  const words = normalizeWords(text);
  while (words.length > 1 && LEADING_ARTICLES.has(words[0])) words.shift();
  return words.join(" ");
}

// ---------------------------------------------------------------------------
// Sinônimos, categorias, exceções
// ---------------------------------------------------------------------------

/** O primeiro item de cada grupo é o nome canônico. */
const SYNONYM_GROUPS: string[][] = [
  ["coentro", "cilantro"],
  ["mandioca", "aipim", "macaxeira"],
  ["abóbora", "jerimum"],
  ["mandioquinha", "batata-baroa", "batata-salsa"],
  ["tangerina", "mexerica", "bergamota", "ponkan"],
  ["abacaxi", "ananás"],
  ["brócolis", "brócolos"],
  ["feijão-verde", "feijão-de-corda"],
  ["manjericão", "alfavaca"],
  ["iogurte", "yogurte"],
  ["whey", "whey protein"],
  ["tilápia", "saint peter"],
  ["amendoim", "amendoins"],
];

const SYNONYM_OF = new Map<string, string>();
const SYNONYM_MEMBERS = new Map<string, string[]>();
for (const group of SYNONYM_GROUPS) {
  const canonical = normalizeFood(group[0]);
  SYNONYM_MEMBERS.set(canonical, group);
  for (const member of group) SYNONYM_OF.set(normalizeFood(member), canonical);
}

/** Chave canônica: normaliza e resolve sinônimos ("cilantro" → "coentro"). */
export function canonicalKey(text: string): string {
  const key = normalizeFood(text);
  return SYNONYM_OF.get(key) ?? key;
}

const FISH = [
  "peixe", "tilápia", "salmão", "sardinha", "atum", "bacalhau", "merluza", "pescada", "truta",
  "robalo", "pintado", "tambaqui", "pirarucu", "cação", "anchova", "linguado", "dourado",
  "pacu", "corvina", "badejo", "namorado", "filé de peixe",
];
const SEAFOOD = [
  "frutos do mar", "camarão", "lula", "polvo", "mexilhão", "marisco", "ostra", "lagosta",
  "caranguejo", "siri", "vieira", "sururu", "lagostim",
];
const RED_MEAT = [
  "carne", "carne vermelha", "carne bovina", "carne de porco", "carne moída", "carne seca",
  "charque", "patinho", "alcatra", "picanha", "maminha", "fraldinha", "acém", "músculo",
  "costela", "cupim", "contrafilé", "filé mignon", "lombo", "pernil", "bisteca", "cordeiro",
  "carneiro", "cabrito", "bife",
];
const DAIRY = [
  "leite", "queijo", "iogurte", "requeijão", "manteiga", "creme de leite", "nata",
  "leite condensado", "doce de leite", "coalhada", "ricota", "cream cheese", "chantilly",
  "whey", "muçarela", "mussarela", "parmesão", "catupiry", "kefir", "leite em pó",
];
const GLUTEN = [
  "trigo", "farinha de trigo", "pão", "macarrão", "massa", "biscoito", "bolacha", "bolo",
  "cevada", "centeio", "malte", "cuscuz marroquino", "semolina", "aveia", "cerveja",
  "torrada", "farinha de rosca", "pizza", "lasanha", "croissant", "esfiha", "pastel",
  "coxinha", "quibe", "triguilho", "empanado", "panqueca", "wrap", "tortilha",
];
const NUTS = [
  "castanha", "castanha de caju", "castanha do pará", "noz", "amêndoa", "avelã", "pistache",
  "macadâmia", "pecã",
];
const MEATS_FOR_VEGETARIAN = [
  ...RED_MEAT, "frango", "peru", "peito de peru", "bacon", "presunto", "salsicha", "linguiça",
  "mortadela", "salame", "hambúrguer", "almôndega", "gelatina", "caldo de carne", "caldo de galinha",
  ...FISH, ...SEAFOOD,
];

/** Categorias amplas: o usuário marca uma palavra e o sistema entende o grupo inteiro. */
const CATEGORIES: Record<string, { label: string; members: string[] }> = {
  [normalizeFood("peixe")]: { label: "Peixe", members: FISH },
  [normalizeFood("frutos do mar")]: { label: "Frutos do mar", members: SEAFOOD },
  [normalizeFood("carne")]: { label: "Carne", members: RED_MEAT },
  [normalizeFood("carne vermelha")]: { label: "Carne vermelha", members: RED_MEAT },
  [normalizeFood("castanhas")]: { label: "Castanhas", members: NUTS },
  [normalizeFood("oleaginosas")]: { label: "Oleaginosas", members: NUTS },
};

/** Derivados diretos que só entram quando a origem é ALERGIA (dislike nunca expande). */
const ALLERGY_DERIVATIVES: Record<string, string[]> = {
  [normalizeFood("amendoim")]: ["amendoim", "paçoca", "pé de moleque", "pasta de amendoim"],
  [normalizeFood("leite")]: DAIRY,
  [normalizeFood("ovo")]: ["ovo", "omelete", "maionese", "gemada", "suspiro", "merengue", "fritada", "clara", "gema"],
  [normalizeFood("soja")]: ["soja", "tofu", "shoyu", "molho de soja", "missô", "edamame", "proteína de soja"],
  [normalizeFood("trigo")]: GLUTEN,
  [normalizeFood("gluten")]: GLUTEN,
  [normalizeFood("lactose")]: DAIRY,
};

/**
 * Expressões que CONTÊM o termo mas são outro alimento — não contam como violação.
 * Ex.: quem não gosta de leite não deixa de receber "leite de amêndoas".
 */
const EXCEPTIONS: Record<string, string[]> = {
  leite: [
    "leite de amêndoas", "leite de coco", "leite de aveia", "leite de soja", "leite de castanha",
    "leite de arroz", "leite vegetal",
  ],
  carne: ["carne de soja", "carne vegetal", "carne de frango", "carne de peixe", "carne de caranguejo", "carne de siri"],
  batata: ["batata-doce", "batata-baroa", "batata-salsa"],
  couve: ["couve-flor", "couve-de-bruxelas"],
  alho: ["alho-poró"],
  manteiga: ["manteiga de amendoim", "manteiga de cacau", "manteiga vegana"],
  pao: ["pão de queijo"],
  queijo: ["queijo vegano"],
  macarrao: ["macarrão de arroz"],
};

/** Sufixos que tornam o item seguro para aquela origem ("pão sem glúten"). */
const SAFE_SUFFIXES: Record<string, string[]> = {
  lactose: ["sem lactose", "zero lactose"],
  gluten: ["sem glúten"],
  vegan: ["vegano", "vegana", "vegetal"],
};

// ---------------------------------------------------------------------------
// Catálogo (autocomplete e reconhecimento de alimento)
// ---------------------------------------------------------------------------

export const FOOD_CATALOG: string[] = [
  "Abacate", "Abacaxi", "Abóbora", "Abobrinha", "Açaí", "Acelga", "Agrião", "Aipim", "Alcachofra",
  "Alcaparra", "Alface", "Alho", "Alho-poró", "Almeirão", "Ameixa", "Amêndoa", "Amendoim", "Anchova",
  "Arroz", "Arroz integral", "Aspargo", "Atum", "Aveia", "Avelã", "Azeite", "Azeitona", "Bacalhau",
  "Bacon", "Banana", "Batata", "Batata-doce", "Berinjela", "Beterraba", "Bife de fígado", "Biscoito",
  "Brócolis", "Cação", "Café", "Caju", "Camarão", "Canela", "Caqui", "Carambola", "Carne moída",
  "Carne seca", "Carne vermelha", "Castanha de caju", "Castanha-do-pará", "Cebola", "Cebolinha",
  "Cenoura", "Cereja", "Cevada", "Chia", "Chocolate", "Chuchu", "Coco", "Coentro", "Cogumelo",
  "Costela", "Couve", "Couve-flor", "Coxinha", "Cravo", "Cream cheese", "Creme de leite", "Cupuaçu",
  "Cuscuz", "Damasco", "Doce de leite", "Endívia", "Erva-doce", "Ervilha", "Escarola", "Espinafre",
  "Farinha de mandioca", "Feijão", "Feijão-preto", "Feijão-verde", "Fígado", "Figo", "Frango",
  "Framboesa", "Frutos do mar", "Gengibre", "Goiaba", "Gorgonzola", "Granola", "Grão-de-bico",
  "Graviola", "Hortelã", "Inhame", "Iogurte", "Jaca", "Jiló", "Kiwi", "Lagosta", "Laranja", "Leite",
  "Leite condensado", "Leite de amêndoas", "Leite de coco", "Lentilha", "Limão", "Linguiça",
  "Linhaça", "Lula", "Maçã", "Macarrão", "Mamão", "Mandioca", "Mandioquinha", "Manga", "Manjericão",
  "Manteiga", "Maracujá", "Margarina", "Maxixe", "Mel", "Melancia", "Melão", "Merluza", "Mexerica",
  "Milho", "Miojo", "Moela", "Morango", "Mortadela", "Mostarda", "Muçarela", "Nabo", "Nozes",
  "Orégano", "Ovo", "Palmito", "Pão", "Pão de queijo", "Pão integral", "Páprica", "Pepino", "Pera",
  "Pêssego", "Peixe", "Peru", "Pescada", "Pimenta", "Pimentão", "Pinhão", "Pipoca", "Pistache",
  "Polvo", "Presunto", "Queijo", "Queijo coalho", "Queijo cottage", "Queijo minas", "Quiabo",
  "Quinoa", "Rabanete", "Repolho", "Requeijão", "Ricota", "Rúcula", "Salmão", "Salsicha", "Salsinha",
  "Sardinha", "Semente de abóbora", "Soja", "Sorvete", "Tahine", "Tapioca", "Tilápia", "Tofu",
  "Tomate", "Truta", "Uva", "Uva-passa", "Vagem", "Whey",
];

const CATALOG_KEYS = new Set(FOOD_CATALOG.map(canonicalKey));

/** Palavras que aparecem em texto livre mas não são alimento. */
const NON_FOOD_WORDS = new Set(
  [
    "nada", "tudo", "nenhum", "nenhuma", "qualquer", "coisa", "coisas", "comida", "comidas",
    "alimento", "alimentos", "nao", "sim", "ok", "teste", "gosto", "legal", "ruim", "bom", "sei",
    "talvez", "isso", "aquilo", "etc", "outro", "outros", "outra", "outras", "varios", "tipo",
    "vc", "voce", "eu", "ele", "ela", "obrigado", "oi", "ola", "kkk", "haha", "asdf", "qwerty",
  ].map(singularize),
);

/** Heurística conservadora: aceita alimentos fora do catálogo, recusa lixo evidente. */
export function isLikelyFood(text: string): boolean {
  const raw = text.trim();
  if (raw.length < 2 || raw.length > 60) return false;
  if (!/^[\p{L}\s'-]+$/u.test(raw)) return false; // números, URLs, símbolos
  const key = canonicalKey(raw);
  if (!key) return false;
  if (CATALOG_KEYS.has(key) || CATEGORIES[key] || SYNONYM_MEMBERS.has(key)) return true;
  const words = key.split(" ");
  if (words.length > 4) return false;
  if (words.every((w) => NON_FOOD_WORDS.has(w))) return false;
  if (words.some((w) => !/[aeiou]/.test(w))) return false; // "sdfg"
  if (/[^aeiou\s]{5,}/.test(key)) return false; // "asdfgh"
  if (/(.)\1\1/.test(key)) return false; // "aaaa"
  return true;
}

// ---------------------------------------------------------------------------
// Texto livre
// ---------------------------------------------------------------------------

const INTRO_RE =
  /^(?:eu\s+)?(?:n[aã]o\s+(?:gosto|curto|como|suporto|tolero|quero)|odeio|detesto|tenho\s+nojo|evito|sem)\s*(?:(?:de|do|da|dos|das)\s+)?/iu;
const ARTICLE_RE = /^(?:o|a|os|as|um|uma|uns|umas)\s+/iu;

const capitalize = (s: string) => (s ? s.charAt(0).toLocaleUpperCase("pt-BR") + s.slice(1) : s);

/**
 * "não gosto de fígado, jiló e coentro" → { foods: ["Fígado", "Jiló", "Coentro"], rejected: [] }
 * Separadores: vírgula, ponto e vírgula, quebra de linha, "/", " e ", " ou ".
 */
export function parseFreeText(text: string): { foods: string[]; rejected: string[] } {
  const foods: string[] = [];
  const rejected: string[] = [];
  const chunks = (text ?? "")
    .normalize("NFC")
    .split(/[,;\n\r/]+|\s+(?:e|ou)\s+/iu)
    .map((c) => c.trim())
    .filter(Boolean);
  for (const chunk of chunks) {
    const cleaned = chunk
      .replace(INTRO_RE, "")
      .replace(ARTICLE_RE, "")
      .replace(/[.!?:"“”]+$/u, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleaned) continue;
    if (isLikelyFood(cleaned)) foods.push(capitalize(cleaned.slice(0, 60)));
    else rejected.push(chunk.slice(0, 60));
  }
  return { foods: dedupeFoods(foods), rejected };
}

/** Remove duplicatas pela chave canônica (acento, plural, sinônimo), mantendo a primeira grafia. */
export function dedupeFoods(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list ?? []) {
    if (typeof item !== "string") continue;
    const key = canonicalKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
}

/** Se o item é uma categoria ampla, devolve o que o sistema entende por ela (para a interface). */
export function describeCategory(item: string): { label: string; members: string[] } | null {
  const cat = CATEGORIES[canonicalKey(item)];
  if (!cat) return null;
  const members = cat.members.filter((m) => canonicalKey(m) !== canonicalKey(item));
  return { label: cat.label, members };
}

/** "200 g de peito de frango grelhado" → "Peito de frango grelhado" (para chips na interface). */
export function extractFoodFromIngredient(ingredient: string): string {
  let s = (ingredient ?? "").normalize("NFC").trim();
  s = s.replace(/\([^)]*\)/g, " ");
  s = s.replace(/^[\d\s.,/½¼¾-]+(?:g|kg|mg|ml|l|gr)?\b\.?\s*/iu, "");
  s = s.replace(/^(?:meia|meio|uma?|duas|dois|tr[eê]s|quatro|cinco)\s+/iu, "");
  s = s.replace(
    /^(?:colher(?:es)?(?:\s+de\s+(?:sopa|ch[aá]|sobremesa|caf[eé]))?|x[ií]caras?(?:\s+de\s+ch[aá])?|fatias?|unidades?|pitadas?|punhados?|latas?|copos?|dentes?|folhas?|ramos?|peda[cç]os?|por[cç](?:[aã]o|[oõ]es)|conchas?|scoops?|potes?|ma[cç]os?|talos?)\s+/iu,
    "",
  );
  s = s.replace(/^(?:de|do|da|dos|das)\s+/iu, "");
  s = s.replace(/\s+a\s+gosto$/iu, "").replace(/[.;:,]+$/u, "").replace(/\s+/g, " ").trim();
  return capitalize(s || (ingredient ?? "").trim());
}

// ---------------------------------------------------------------------------
// Alergias e restrições
// ---------------------------------------------------------------------------

export type ForbiddenSource = "allergy" | "restriction" | "disliked";

export type ExtractedRestriction = {
  /** Texto original da restrição. */
  origin: string;
  /** Alimentos (ou chaves de grupo) extraídos. */
  foods: string[];
  source: ForbiddenSource;
  /** Sufixo seguro aplicável ("sem lactose"). */
  safe?: keyof typeof SAFE_SUFFIXES;
  /** Para dietas: lista de exclusões pronta. */
  expanded?: string[];
};

const ALLERGY_RE =
  /(?<!\p{L})(?:alergias?|al[eé]rgic[oa]s?|intoler[aâ]ncias?|intolerantes?|restri[cç](?:[aã]o|[oõ]es))(?!\p{L})\s*[:-]?\s*(?:(?:a|à|ao|aos|às|as|de|do|da|dos|das|com)\s+)?(.+)$/u;
const SEM_RE = /(?<!\p{L})sem\s+(gl[uú]ten|lactose)(?!\p{L})/u;

/**
 * Extrai os alimentos de uma restrição. Reconhece:
 * "Alergia a/ao/à/aos/às X", "alérgico a X", "Intolerância à lactose", "Alergia: X", "restrição a X",
 * "celíaco", "doença celíaca", "APLV", "sem glúten", "sem lactose", "vegetariano", "vegano".
 * Restrições sem alimento (diabetes, hipertensão) devolvem null e só vão para o prompt.
 */
export function extractRestriction(restriction: string): ExtractedRestriction | null {
  const origin = (restriction ?? "").trim();
  if (!origin) return null;
  const n = stripAccents(origin.normalize("NFC").toLowerCase()).replace(/\s+/g, " ").trim();

  if (/\bvegan[oa]s?\b/.test(n)) {
    return {
      origin, source: "restriction", foods: [], safe: "vegan",
      expanded: [...MEATS_FOR_VEGETARIAN, ...DAIRY, "ovo", "mel", "clara", "gema", "maionese"],
    };
  }
  if (/\bvegetarian[oa]s?\b/.test(n)) {
    return { origin, source: "restriction", foods: [], safe: "vegan", expanded: MEATS_FOR_VEGETARIAN };
  }
  if (/\bceliac[oa]s?\b|\bdoenca celiaca\b/.test(n)) {
    return { origin, source: "allergy", foods: ["gluten"], safe: "gluten" };
  }
  if (/\baplv\b/.test(n)) return { origin, source: "allergy", foods: ["leite"] };

  // O corpo sai do texto original (com acento) para a interface e o prompt mostrarem "Camarão".
  const lower = origin.normalize("NFC").toLowerCase();
  const m = lower.match(ALLERGY_RE);
  const sem = lower.match(SEM_RE);
  const body = m ? m[1] : sem ? sem[1] : null;
  if (!body) return null;

  const foods = parseFreeText(body.replace(/prote[ií]na d[oa]\s+/gu, "")).foods;
  if (!foods.length) return null;
  const keys = foods.map(canonicalKey);
  const safe = keys.includes("lactose") ? "lactose" : keys.includes("gluten") ? "gluten" : undefined;
  return { origin, source: "allergy", foods, safe };
}

// ---------------------------------------------------------------------------
// Termos proibidos
// ---------------------------------------------------------------------------

export type ForbiddenTerm = {
  /** Chave normalizada ("grao de bico"). */
  key: string;
  tokens: string[];
  /** Como mostrar para humanos e para a IA. */
  label: string;
  /** Item do usuário que originou o termo ("Peixe", "Alergia a amendoim"). */
  origin: string;
  source: ForbiddenSource;
  /** Expressões (já tokenizadas) que contêm o termo mas não violam. */
  except: string[][];
};

const CONCEPTS = new Set(["lactose", "gluten"]);
const SOURCE_RANK:Record<ForbiddenSource, number> = { allergy: 0, restriction: 1, disliked: 2 };
const MAX_TERMS = 400;

const exceptionsFor = (key: string, safe?: keyof typeof SAFE_SUFFIXES): string[][] => {
  const phrases = [...(EXCEPTIONS[key] ?? [])];
  if (safe) for (const suffix of SAFE_SUFFIXES[safe]) phrases.push(`${key} ${suffix}`);
  return phrases.map((p) => normalizeFood(p).split(" "));
};

/**
 * Lista final de termos proibidos. Alergias/restrições vêm primeiro (prioridade máxima);
 * quando o mesmo termo aparece em mais de uma origem, prevalece a mais grave.
 */
export function buildForbiddenTerms(disliked: string[] = [], restrictions: string[] = []): ForbiddenTerm[] {
  const byKey = new Map<string, ForbiddenTerm>();

  const add = (label: string, origin: string, source: ForbiddenSource, safe?: keyof typeof SAFE_SUFFIXES) => {
    const key = normalizeFood(label);
    if (!key) return;
    const prev = byKey.get(key);
    if (prev && SOURCE_RANK[prev.source] <= SOURCE_RANK[source]) return;
    byKey.set(key, { key, tokens: key.split(" "), label, origin, source, except: exceptionsFor(key, safe) });
  };

  /** Um alimento + seus sinônimos + (se categoria) seus membros. */
  const addFood = (food: string, origin: string, source: ForbiddenSource, safe?: keyof typeof SAFE_SUFFIXES) => {
    const canonical = canonicalKey(food);
    // "lactose"/"glúten" são conceitos: viram a lista de alimentos, não um termo. Como termo,
    // fariam "iogurte sem lactose" parecer violação.
    const expanded: string[] = CONCEPTS.has(canonical) ? [] : [food];
    const category = CATEGORIES[canonical];
    if (category) expanded.push(...category.members);
    if (source === "allergy" && ALLERGY_DERIVATIVES[canonical]) expanded.push(...ALLERGY_DERIVATIVES[canonical]);
    for (const item of expanded) {
      const key = canonicalKey(item);
      const synonyms = SYNONYM_MEMBERS.get(key) ?? [item];
      for (const s of synonyms) add(s, origin, source, safe);
    }
  };

  for (const r of Array.isArray(restrictions) ? restrictions : []) {
    if (typeof r !== "string") continue;
    const ex = extractRestriction(r);
    if (!ex) continue;
    for (const food of ex.expanded ?? []) addFood(food, ex.origin, ex.source, ex.safe);
    for (const food of ex.foods) addFood(food, ex.origin, ex.source, ex.safe);
  }
  for (const d of Array.isArray(disliked) ? disliked : []) {
    if (typeof d === "string" && d.trim()) addFood(d.trim(), d.trim(), "disliked");
  }

  return [...byKey.values()]
    .sort((a, b) => SOURCE_RANK[a.source] - SOURCE_RANK[b.source])
    .slice(0, MAX_TERMS);
}

// ---------------------------------------------------------------------------
// Detecção
// ---------------------------------------------------------------------------

const NEGATIONS = new Set(["sem", "zero"]);

type Token = { norm: string; start: number; end: number };

const tokenize = (text: string): Token[] => {
  const out: Token[] = [];
  for (const m of text.matchAll(/[\p{L}\p{N}]+/gu)) {
    const start = m.index ?? 0;
    out.push({ norm: singularize(stripAccents(m[0].toLowerCase())), start, end: start + m[0].length });
  }
  return out;
};

const matchesAt = (tokens: Token[], at: number, seq: string[]) => {
  if (at < 0 || at + seq.length > tokens.length) return false;
  for (let k = 0; k < seq.length; k++) if (tokens[at + k].norm !== seq[k]) return false;
  return true;
};

export type ForbiddenHit = {
  term: ForbiddenTerm;
  /** Trecho original encontrado. */
  match: string;
  start: number;
  end: number;
};

/** Ocorrências de termos proibidos no texto (por palavra inteira, respeitando exceções). */
export function findForbiddenHits(text: string, terms: ForbiddenTerm[]): ForbiddenHit[] {
  if (typeof text !== "string" || !text || !terms?.length) return [];
  const source = text.normalize("NFC");
  const tokens = tokenize(source);
  const hits: ForbiddenHit[] = [];
  for (const term of terms) {
    const n = term.tokens.length;
    for (let i = 0; i + n <= tokens.length; i++) {
      if (!matchesAt(tokens, i, term.tokens)) continue;
      const excepted = term.except.some((ex) => {
        for (let j = Math.max(0, i + n - ex.length); j <= i; j++) if (matchesAt(tokens, j, ex)) return true;
        return false;
      });
      // "sirva sem cebola" / "zero lactose": ausência declarada não é violação.
      if (excepted || (i > 0 && NEGATIONS.has(tokens[i - 1].norm))) continue;
      const start = tokens[i].start;
      const end = tokens[i + n - 1].end;
      hits.push({ term, match: source.slice(start, end), start, end });
    }
  }
  return hits.sort((a, b) => a.start - b.start || b.end - a.end);
}

export const containsForbidden = (text: string, terms: ForbiddenTerm[]) => findForbiddenHits(text, terms).length > 0;

/**
 * Bloco de regras para o prompt: restrições/alergias em linha própria, com prioridade
 * máxima, e os alimentos não gostados em outra. Vazio quando não há nada a proibir.
 */
export function buildForbiddenPromptLine(terms: ForbiddenTerm[]): string {
  if (!terms?.length) return "";
  const group = (source: ForbiddenSource[]) => {
    const byOrigin = new Map<string, string[]>();
    for (const t of terms) {
      if (!source.includes(t.source)) continue;
      const list = byOrigin.get(t.origin) ?? [];
      if (!list.some((l) => normalizeFood(l) === t.key)) list.push(t.label);
      byOrigin.set(t.origin, list);
    }
    return [...byOrigin.entries()].map(([origin, labels]) => {
      const extra = labels.filter((l) => normalizeFood(l) !== normalizeFood(origin));
      return extra.length ? `${origin} (${extra.join(", ")})` : origin;
    });
  };
  const lines: string[] = [];
  const hard = group(["allergy", "restriction"]);
  if (hard.length) {
    lines.push(
      `RESTRIÇÕES E ALERGIAS — PRIORIDADE MÁXIMA, violar pode causar dano à saúde. NUNCA inclua, nem em traços, como ingrediente, acompanhamento, tempero ou guarnição: ${hard.join("; ")}.`,
    );
  }
  const soft = group(["disliked"]);
  if (soft.length) {
    lines.push(
      `NUNCA inclua os seguintes alimentos, nem como ingrediente, acompanhamento, tempero ou guarnição, incluindo variações e derivados diretos: ${soft.join("; ")}.`,
    );
  }
  return lines.join("\n");
}

export type Violation = {
  /** Caminho do campo ("$.plano[0].refeicoes[1].ingredientes[2]"). */
  path: string;
  term: ForbiddenTerm;
  match: string;
  /** Valor completo do campo. */
  text: string;
};

/** Varre recursivamente todas as strings do valor e aponta onde há termo proibido. */
export function scanForViolations(value: unknown, terms: ForbiddenTerm[], path = "$"): Violation[] {
  if (!terms?.length || value == null) return [];
  if (typeof value === "string") {
    return findForbiddenHits(value, terms).map((h) => ({ path, term: h.term, match: h.match, text: value }));
  }
  if (Array.isArray(value)) return value.flatMap((v, i) => scanForViolations(v, terms, `${path}[${i}]`));
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      scanForViolations(v, terms, `${path}.${k}`),
    );
  }
  return [];
}

// ---------------------------------------------------------------------------
// Sanitização (último recurso, quando a IA insiste)
// ---------------------------------------------------------------------------

export const NEUTRAL_REPLACEMENT = "um ingrediente de sua preferência";
export const NEUTRAL_INGREDIENT = "Ingrediente de sua preferência (substituto)";

const CONNECTORS = new Set(["com", "de", "do", "da", "dos", "das", "e", "ou", "ao", "a", "o", "os", "as", "no", "na", "em"]);

const tidy = (s: string) =>
  s
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,;])\s*(?=[,;.])/g, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,;:.-]+|[\s,;:-]+$/g, "")
    .trim();

/** Remove conectivos soltos no início/fim ("com arroz" → "arroz", "Salada de" → "Salada"). */
const trimConnectors = (s: string) => {
  let words = s.split(" ");
  while (words.length && CONNECTORS.has(stripAccents(words[0].toLowerCase()).replace(/[^a-z]/g, ""))) words = words.slice(1);
  while (words.length && CONNECTORS.has(stripAccents(words[words.length - 1].toLowerCase()).replace(/[^a-z]/g, ""))) words = words.slice(0, -1);
  return words.join(" ");
};

/**
 * Troca menções proibidas por texto neutro (ou remove, se replacement = "").
 * Nunca devolve string vazia: usa `fallback` quando não sobra conteúdo.
 */
export function sanitizeTextField(
  text: string,
  terms: ForbiddenTerm[],
  opts: { replacement?: string; fallback?: string } = {},
): string {
  const replacement = opts.replacement ?? NEUTRAL_REPLACEMENT;
  const fallback = opts.fallback ?? NEUTRAL_REPLACEMENT;
  if (typeof text !== "string") return fallback;
  let out = text.normalize("NFC");
  for (let round = 0; round < 5; round++) {
    const hits = findForbiddenHits(out, terms);
    if (!hits.length) break;
    // Da direita para a esquerda para os índices continuarem válidos; ignora sobreposições.
    let cursor = Infinity;
    for (const h of [...hits].sort((a, b) => b.start - a.start)) {
      if (h.end > cursor) continue;
      let start = h.start;
      if (!replacement) {
        // Leva junto o conectivo imediatamente anterior ("com coentro", "de tilápia").
        const before = out.slice(0, start).match(/(?<!\p{L})(?:com|de|do|da|dos|das|e|ao|a|o|os|as)\s+$/iu);
        if (before) start -= before[0].length;
      }
      out = out.slice(0, start) + replacement + out.slice(h.end);
      cursor = start;
    }
    out = tidy(replacement ? out : trimConnectors(tidy(out)));
  }
  if (findForbiddenHits(out, terms).length || !/\p{L}/u.test(out)) return fallback;
  // Mantém a caixa da primeira letra do original ("Salada" continua maiúscula após remoções).
  return /^\p{Lu}/u.test(text.trim()) ? capitalize(out) : out;
}

/** Remove ingredientes proibidos. Nunca devolve lista vazia. */
export function sanitizeIngredientList(
  list: unknown,
  terms: ForbiddenTerm[],
  fallback: string[] = [NEUTRAL_INGREDIENT],
): string[] {
  const items = Array.isArray(list) ? list.filter((i): i is string => typeof i === "string" && !!i.trim()) : [];
  const clean = items.filter((i) => !containsForbidden(i, terms));
  return clean.length ? clean : [...fallback];
}
