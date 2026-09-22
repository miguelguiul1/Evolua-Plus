import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogIn, LogOut, User, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/useAuth";
import GlobalSearch from "@/components/GlobalSearch";
import BrandLogo from "@/components/BrandLogo";

const NotificationCenter = lazy(() => import("@/components/NotificationCenter"));

const NotificationsFallback = () => (
  <Button variant="ghost" size="icon" aria-label="Central de notificações" className="relative">
    <Bell className="w-4 h-4" />
  </Button>
);

const appLinks = [
  { path: "/", label: "Início" },
  { path: "/dashboard", label: "Painel" },
  { path: "/scanner", label: "Scanner" },
  { path: "/diario", label: "Diário" },
  { path: "/insights", label: "Insights" },
  { path: "/plano-semanal", label: "Plano" },
  { path: "/receitas", label: "Receitas" },
  { path: "/assistente", label: "IA" },
  { path: "/memoria-ia", label: "Memória IA" },
  { path: "/evolucao", label: "Evolução" },
  { path: "/preferencias", label: "Perfil" },
  { path: "/historico", label: "Histórico" },
  { path: "/guias", label: "Guias" },
  { path: "/biblioteca", label: "Alimentos" },
  { path: "/favoritos", label: "Favoritos" },
  { path: "/configuracoes", label: "Ajustes" },
];

const landingLinks = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#beneficios", label: "Benefícios" },
  { href: "#recursos", label: "Recursos" },
  { href: "#planos", label: "Planos" },
  { href: "#faq", label: "FAQ" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const isLanding = location.pathname === "/";
  const isPublicAuth = ["/auth", "/reset-password"].includes(location.pathname);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const Logo = () => (
    <Link to="/" className="group flex items-center gap-2" aria-label="Evolua Plus — página inicial">
      <BrandLogo size="sm" className="transition-transform group-hover:scale-105" />
    </Link>
  );

  // Landing navbar — anchor links, translucent, converts to CTA
  if (isLanding) {
    return (
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/80 backdrop-blur-xl border-b border-border/60 shadow-soft"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />

          <div className="hidden md:flex items-center gap-1">
            {landingLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <Button asChild variant="premium" size="sm" className="h-10 px-5">
                <Link to="/dashboard">Ir para o painel</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="h-10">
                  <Link to="/auth">Entrar</Link>
                </Button>
                <Button asChild variant="premium" size="sm" className="h-10 px-5">
                  <Link to="/auth">Começar grátis</Link>
                </Button>
              </>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {open && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl animate-fade-in">
            <div className="container mx-auto px-6 py-4 flex flex-col gap-1">
              {landingLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-secondary"
                >
                  {l.label}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-2">
                {user ? (
                  <Button asChild variant="premium" className="w-full">
                    <Link to="/dashboard" onClick={() => setOpen(false)}>Ir para o painel</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/auth" onClick={() => setOpen(false)}>Entrar</Link>
                    </Button>
                    <Button asChild variant="premium" className="w-full">
                      <Link to="/auth" onClick={() => setOpen(false)}>Começar grátis</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    );
  }

  // Auth/Redefinir senha — cabeçalho mínimo, sem navegação do app (funil público)
  if (isPublicAuth) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <Link
            to="/"
            className="hidden md:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Voltar ao início
          </Link>
        </div>
      </nav>
    );
  }

  // App navbar — keeps existing internal navigation
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Logo />

        <div className="hidden md:flex items-center gap-1">
          {appLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              aria-current={location.pathname === link.path ? "page" : undefined}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === link.path
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {user ? (
            <div className="flex items-center gap-2 ml-3">
              <GlobalSearch />
              <Suspense fallback={<NotificationsFallback />}>
                <NotificationCenter />
              </Suspense>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" />
                {user.user_metadata?.full_name || user.email?.split("@")[0]}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1 text-muted-foreground">
                <LogOut className="w-4 h-4" /> Sair
              </Button>
            </div>
          ) : (
            <Link to="/auth" className="ml-3">
              <Button variant="hero" size="sm" className="gap-1">
                <LogIn className="w-4 h-4" /> Entrar
              </Button>
            </Link>
          )}
        </div>

        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? "Fechar menu" : "Abrir menu"}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-md animate-fade-in">
          <div className="container mx-auto px-6 py-4 flex flex-col gap-1">
            {appLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setOpen(false)}
                aria-current={location.pathname === link.path ? "page" : undefined}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {user ? (
              <button
                onClick={() => { handleSignOut(); setOpen(false); }}
                className="px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Sair ({user.email?.split("@")[0]})
              </button>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="px-4 py-3 rounded-lg text-sm font-medium bg-primary/10 text-primary flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" /> Entrar / Cadastrar
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
