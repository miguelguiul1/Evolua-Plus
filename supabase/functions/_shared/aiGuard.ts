/**
 * gerar → validar → regenerar → sanitizar.
 *
 * A chamada da IA entra como parâmetro (`callAI`), então o fluxo inteiro é testável sem a
 * IA real (ver recipeGuards.test.ts). Garantia: dentro do escopo varrido por `scan`, o valor
 * devolvido NUNCA contém termo proibido — se a IA insistir, o resultado é sanitizado; se nem
 * isso for possível, o valor é null e a função responde com erro controlado.
 */
import type { ForbiddenTerm, Violation } from "./foodPreferences.ts";

/** Erro HTTP do gateway de IA (429, 402, 5xx) — a função decide a resposta ao usuário. */
export class AIHttpError extends Error {
  constructor(public status: number, public body: string) {
    super(`AI gateway error ${status}`);
  }
}

type Logger = Pick<Console, "warn" | "error">;

export type GuardOptions<T> = {
  /** Nome da função, só para os logs. */
  label: string;
  terms: ForbiddenTerm[];
  /** Chama a IA. `feedback` é null na 1ª tentativa e descreve as violações nas seguintes. */
  callAI: (feedback: string | null) => Promise<string>;
  /** Interpreta a resposta bruta; null quando inválida/vazia. Nunca deve lançar. */
  parse: (raw: string) => T | null;
  /** Violações que justificam regenerar. */
  scan: (value: T, terms: ForbiddenTerm[]) => Violation[];
  /** Último recurso quando a IA insiste. Deve devolver um valor sem violações. */
  sanitize: (value: T, terms: ForbiddenTerm[]) => T;
  /** Padrão: 2 regenerações (3 chamadas no total). */
  maxRegenerations?: number;
  /** Não inicia nova regeneração depois desse tempo (evita estourar o limite da Edge Function). */
  timeBudgetMs?: number;
  now?: () => number;
  logger?: Logger;
};

export type GuardResult<T> = {
  /** null apenas quando a IA nunca devolveu algo interpretável. */
  value: T | null;
  /** Chamadas feitas à IA. */
  attempts: number;
  regenerations: number;
  sanitized: boolean;
  /** Violações da última resposta da IA (antes da sanitização). */
  violations: Violation[];
};

const MAX_FEEDBACK_ITEMS = 12;

/** Mensagem de correção enviada à IA na regeneração. */
export function describeViolations(violations: Violation[]): string {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const v of violations) {
    const id = `${v.term.key}|${v.path}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const where = v.path.replace(/^\$\.?/, "") || "resposta";
    const reason = v.term.source === "disliked" ? `usuário não gosta de ${v.term.origin}` : v.term.origin;
    items.push(`"${v.match}" em ${where} (${reason})`);
    if (items.length >= MAX_FEEDBACK_ITEMS) break;
  }
  return `ATENÇÃO: a resposta anterior foi REJEITADA porque incluiu alimentos proibidos para este usuário: ${items.join("; ")}.
Gere a resposta COMPLETA de novo, no mesmo formato, trocando esses itens por alternativas equivalentes. Esses alimentos não podem aparecer em NENHUM campo (nome, ingredientes, preparo, opções), nem como tempero ou guarnição.`;
}

export async function generateWithGuard<T>(opts: GuardOptions<T>): Promise<GuardResult<T>> {
  const {
    label, terms, callAI, parse, scan, sanitize,
    maxRegenerations = 2, timeBudgetMs = Infinity, now = Date.now, logger = console,
  } = opts;
  const startedAt = now();
  let last: T | null = null;
  let violations: Violation[] = [];
  let feedback: string | null = null;
  let attempts = 0;

  for (let attempt = 0; attempt <= maxRegenerations; attempt++) {
    if (attempt > 0 && now() - startedAt > timeBudgetMs) {
      logger.warn(`[${label}] tempo esgotado antes da regeneração ${attempt}; sanitizando a última resposta.`);
      break;
    }

    let raw: string;
    try {
      attempts++;
      raw = await callAI(feedback);
    } catch (e) {
      if (attempt === 0) throw e; // 1ª chamada: a função trata (429, 402, 500) como sempre tratou
      logger.warn(`[${label}] falha na regeneração ${attempt}; sanitizando a última resposta.`, e);
      break;
    }

    const parsed = parse(raw);
    if (parsed === null) {
      if (last === null) return { value: null, attempts, regenerations: attempt, sanitized: false, violations: [] };
      logger.warn(`[${label}] regeneração ${attempt} devolveu resposta inválida; sanitizando a anterior.`);
      break;
    }

    last = parsed;
    violations = terms.length ? scan(parsed, terms) : [];
    if (!violations.length) {
      if (attempt > 0) logger.warn(`[${label}] resposta limpa após ${attempt} regeneração(ões).`);
      return { value: parsed, attempts, regenerations: attempt, sanitized: false, violations: [] };
    }
    logger.warn(
      `[${label}] tentativa ${attempt + 1}: ${violations.length} violação(ões) de alimentos proibidos`,
      [...new Set(violations.map((v) => v.term.key))].slice(0, 20),
    );
    feedback = describeViolations(violations);
  }

  // A IA insistiu (ou falhou na regeneração): sanitiza a última resposta válida.
  // A checagem usa o MESMO escopo de `scan` (ex.: na geladeira, os alimentos da foto não entram).
  const value = sanitize(last as T, terms);
  if (scan(value, terms).length) {
    logger.error(`[${label}] não foi possível remover todos os alimentos proibidos; resposta descartada.`);
    return { value: null, attempts, regenerations: attempts - 1, sanitized: true, violations };
  }
  logger.warn(`[${label}] resposta SANITIZADA após ${attempts} chamada(s) à IA.`);
  return { value, attempts, regenerations: attempts - 1, sanitized: true, violations };
}
