/**
 * Apaga do aparelho os dados da conta guardados em localStorage (plano em cache, lista de
 * compras, rascunho do onboarding com peso/idade, conquistas, notificações lidas).
 * Chamado no logout para não deixar dados de saúde num aparelho compartilhado.
 * Preferências do aparelho (tema, configurações de exibição) são mantidas.
 */
const USER_DATA_PREFIXES = ["evoluaPlano:", "evolua:lista:", "evolua:onboardingDraft:", "evolua:achievements", "evoluaNotificacoesLidas"];

export const clearLocalUserData = (storage: Storage | undefined = globalThis.localStorage) => {
  if (!storage) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && USER_DATA_PREFIXES.some((p) => key.startsWith(p))) keys.push(key);
    }
    keys.forEach((k) => storage.removeItem(k));
  } catch {
    /* storage indisponível — nada a limpar */
  }
};
