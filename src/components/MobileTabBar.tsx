import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ScanLine, NotebookPen, Sparkles, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/useAuth";

const tabs = [
  { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { to: "/diario", label: "Diário", icon: NotebookPen },
  { to: "/scanner", label: "Scanner", icon: ScanLine },
  { to: "/assistente", label: "IA", icon: Sparkles },
  { to: "/evolucao", label: "Evolução", icon: TrendingUp },
];

/** Navegação inferior mobile-first para as áreas mais usadas do app. */
const MobileTabBar = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const hidden = ["/", "/auth", "/vendas", "/checkout", "/reset-password", "/onboarding"];
  const knownRoutes = [
    "/dashboard", "/diario", "/scanner", "/assistente", "/evolucao",
    "/preferencias", "/receitas", "/educacao", "/biblioteca", "/historico",
    "/plano-semanal", "/memoria-ia", "/guias", "/insights", "/favoritos", "/configuracoes",
  ];
  if (!user || hidden.includes(pathname) || !knownRoutes.includes(pathname)) return null;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <li key={to}>
              <Link
                to={to}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`flex h-8 w-12 items-center justify-center rounded-xl transition-colors ${
                    active ? "bg-primary/10" : ""
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
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