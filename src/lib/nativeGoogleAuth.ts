import { Capacitor } from "@capacitor/core";
import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/integrations/supabase/client";

/**
 * Login nativo com Google via Supabase OAuth direto (PKCE + deep link), independente do
 * broker web da Lovable (que não funciona dentro do WebView local do app empacotado).
 *
 * Fica atrás de VITE_ENABLE_NATIVE_GOOGLE porque só passa a funcionar depois que:
 * 1. Um OAuth Client (Android) for criado no Google Cloud Console com o SHA-1 do keystore;
 * 2. O provider Google for ativado no painel do Supabase com esse Client ID/Secret.
 * Ver GOOGLE_LOGIN_NATIVO.md para o passo a passo. Com a flag desligada (padrão), nada
 * neste arquivo é chamado.
 */
export const NATIVE_GOOGLE_ENABLED = import.meta.env.VITE_ENABLE_NATIVE_GOOGLE === "true";

export const NATIVE_GOOGLE_REDIRECT_URL = "com.evoluaplus.app://login-callback";

export const isNativeGoogleAvailable = () =>
  NATIVE_GOOGLE_ENABLED && Capacitor.isNativePlatform();

/** Abre o consentimento do Google no navegador do sistema (não na WebView do app). */
export async function signInWithGoogleNative(): Promise<{ error: Error | null }> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: NATIVE_GOOGLE_REDIRECT_URL, skipBrowserRedirect: true },
  });
  if (error || !data?.url) {
    return { error: error ?? new Error("Não foi possível iniciar o login com Google") };
  }
  await Browser.open({ url: data.url });
  return { error: null };
}

let listenerRegistered = false;

/**
 * Registra o listener que recebe o app de volta depois do consentimento do Google
 * (com.evoluaplus.app://login-callback?code=...) e troca o código pela sessão Supabase.
 * Chamar uma única vez (ex.: no AuthProvider), só quando isNativeGoogleAvailable().
 */
export function registerNativeGoogleDeepLink() {
  if (listenerRegistered) return;
  listenerRegistered = true;

  App.addListener("appUrlOpen", async (event: URLOpenListenerEvent) => {
    if (!event.url.startsWith(NATIVE_GOOGLE_REDIRECT_URL)) return;
    try {
      await supabase.auth.exchangeCodeForSession(event.url);
    } catch {
      // Sessão não trocada: o usuário permanece deslogado e pode tentar novamente.
    } finally {
      Browser.close().catch(() => {});
    }
  });
}
