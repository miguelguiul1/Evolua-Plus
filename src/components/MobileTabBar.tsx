import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ScanLine, NotebookPen, Sparkles, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/useAuth";
import { useConsent } from "@/hooks/useConsent";
import { useSetupStatus } from "@/hooks/useOnboarding";

const tabs = [
  { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { to: "/diario", label: "Diário", icon: NotebookPen },
  { to: "/scanner", label: "Scanner", icon: ScanLine },
  { to: "/assistente", label: "IA", icon: Sparkles },
  { to: "/evolucao", label: "Evolução", icon: TrendingUp },
];

/** Telas logadas onde a barra faz sentido (públicas, onboarding e 404 ficam de fora). */
const TAB_ROUTES = [
  "/dashboard", "/diario", "/scanner", "/assistente", "/evolucao",
  "/preferencias", "/receitas", "/educacao", "/biblioteca", "/historico",
  "/plano-semanal", "/memoria-ia", "/guias", "/insights", "/favoritos", "/configuracoes",
];

const isTextField = (el: Element | null) =>
  !!el && (el.matches("textarea, select, [contenteditable='true']") ||
    (el.matches("input") && !["checkbox", "radio", "button", "submit", "range", "file"].includes((el as HTMLInputElement).type)));

/** Enquanto um campo de texto está em foco (teclado aberto), a barra sai da frente. */
const useTypingFocus = () => {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const update = () => setTyping(isTextField(document.activeElement));
    // No focusout o próximo elemento ainda não recebeu o foco; confere no tick seguinte.
    const onFocusOut = () => setTimeout(update, 0);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);
  return typing;
};

/** Navegação inferior mobile-first para as áreas mais usadas do app. */
const MobileTabBar = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const consent = useConsent();
  const { data: setup } = useSetupStatus();
  const typing = useTypingFocus();

  // Sem consentimento de saúde o app mostra a tela de consentimento em qualquer rota logada;
  // sem onboarding, redireciona para /onboarding. Em nenhum dos dois casos a barra aparece.
  const visible =
    !!user && TAB_ROUTES.includes(pathname) && !consent.loading && consent.health &&
    !!setup && !setup.needsOnboarding && !typing;

  // O <html> marcado faz o <main> reservar a altura da barra + safe-area (ver index.css).
  useEffect(() => {
    document.documentElement.classList.toggle("has-tabbar", visible);
    return () => document.documentElement.classList.remove("has-tabbar");
  }, [visible]);

  if (!visible) return null;

  return (
    <nav
      aria-label="Navegação principal"
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                className={`flex h-[var(--tabbar-content-h)] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`flex h-8 w-12 items-center justify-center rounded-xl transition-colors ${
                    active ? "bg-primary/10" : ""
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileTabBar;
