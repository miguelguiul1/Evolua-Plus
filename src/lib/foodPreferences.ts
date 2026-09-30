/**
 * Preferências alimentares (não gosto / alergias → termos proibidos).
 *
 * A implementação vive em supabase/functions/_shared/foodPreferences.ts e é o MESMO arquivo
 * usado pelas Edge Functions — não há espelho. Este reexport existe só para o alias "@/lib".
 */
export * from "../../supabase/functions/_shared/foodPreferences.ts";
