/**
 * Camada mínima de eventos de ativação (Pré-Beta 04).
 * Não instala nenhuma plataforma externa: apenas emite um CustomEvent
 * e registra em modo dev, pronto para plugar um provedor no futuro.
 */
export type ActivationEvent =
  | "calculator_completed"
  | "signup_started"
  | "signup_completed"
  | "onboarding_started"
  | "onboarding_completed"
  | "plan_generation_started"
  | "plan_generation_completed"
  | "first_food_logged"
  | "routine_profile_started"
  | "routine_profile_completed";

export const track = (event: ActivationEvent, payload: Record<string, unknown> = {}) => {
  try {
    window.dispatchEvent(new CustomEvent("evolua:analytics", { detail: { event, payload } }));
    if (import.meta.env.DEV) console.debug("[analytics]", event, payload);
  } catch {
    /* noop */
  }
};
