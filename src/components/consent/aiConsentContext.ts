import { createContext, useContext } from "react";

/** Fora do provider, nega por segurança (o provider fica na raiz do app, em App.tsx). */
export const AiConsentContext = createContext<() => Promise<boolean>>(() => Promise.resolve(false));

/** `if (!(await requireAiConsent())) return;` antes de chamar uma Edge Function de IA. */
export const useRequireAiConsent = () => useContext(AiConsentContext);
