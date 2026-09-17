import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "./components/Navbar";
import MobileTabBar from "./components/MobileTabBar";
import Index from "./pages/Index";
import ProtectedRoute from "./components/ProtectedRoute";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";
import { PageSkeleton } from "./components/ds/Skeletons";

const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Preferencias = lazy(() => import("./pages/Preferencias"));
const Scanner = lazy(() => import("./pages/Scanner"));
const Receitas = lazy(() => import("./pages/Receitas"));
const Educacao = lazy(() => import("./pages/Educacao"));
const Biblioteca = lazy(() => import("./pages/Biblioteca"));
const Historico = lazy(() => import("./pages/Historico"));
const PlanoSemanal = lazy(() => import("./pages/PlanoSemanal"));
const DiarioAlimentar = lazy(() => import("./pages/DiarioAlimentar"));
const AssistenteIA = lazy(() => import("./pages/AssistenteIA"));
const Evolucao = lazy(() => import("./pages/Evolucao"));
const Guias = lazy(() => import("./pages/Guias"));
const Insights = lazy(() => import("./pages/Insights"));
const Vendas = lazy(() => import("./pages/Vendas"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Favoritos = lazy(() => import("./pages/Favoritos"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const MemoriaIA = lazy(() => import("./pages/MemoriaIA"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const PlanoPersonalizado = lazy(() => import("./pages/PlanoPersonalizado"));


const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 } },
});

const routeTitles: Record<string, string> = {
  "/": "Evolua Plus — alimentação inteligente e acessível",
  "/vendas": "Planos — Evolua Plus",
  "/checkout": "Checkout — Evolua Plus",
  "/auth": "Entrar — Evolua Plus",
  "/reset-password": "Redefinir senha — Evolua Plus",
  "/onboarding": "Onboarding — Evolua Plus",
  "/dashboard": "Painel — Evolua Plus",
  "/preferencias": "Meu perfil alimentar — Evolua Plus",
  "/scanner": "Scanner de alimentos — Evolua Plus",
  "/receitas": "Receitas — Evolua Plus",
  "/educacao": "Educação alimentar — Evolua Plus",
  "/biblioteca": "Biblioteca de alimentos — Evolua Plus",
  "/historico": "Histórico — Evolua Plus",
  "/plano-semanal": "Plano semanal — Evolua Plus",
  "/plano-personalizado": "Plano personalizado — Evolua Plus",
  "/diario": "Diário alimentar — Evolua Plus",
  "/assistente": "Assistente IA — Evolua Plus",
  "/memoria-ia": "Memória da IA — Evolua Plus",
  "/evolucao": "Evolução corporal — Evolua Plus",
  "/guias": "Guias — Evolua Plus",
  "/insights": "Insights — Evolua Plus",
  "/favoritos": "Favoritos — Evolua Plus",
  "/configuracoes": "Ajustes — Evolua Plus",
};

const PageTitle = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = routeTitles[pathname] ?? "Evolua Plus";
  }, [pathname]);
  return null;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const P = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <PageTitle />
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-background focus:text-foreground focus:text-sm focus:shadow-soft focus:border focus:border-border"
          >
            Pular para o conteúdo principal
          </a>
          <RouteErrorBoundary>
            <Navbar />
            <Suspense fallback={<PageSkeleton />}>
              <main id="main-content" className="contents">
                <Routes>
                  <Route path="/vendas" element={<Vendas />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/" element={<Index />} />
                  <Route path="/index" element={<Navigate to="/" replace />} />
                  <Route path="/home" element={<Navigate to="/" replace />} />
                  <Route path="/onboarding" element={<P><Onboarding /></P>} />
                  <Route path="/dashboard" element={<P><Dashboard /></P>} />

                  <Route path="/preferencias" element={<P><Preferencias /></P>} />
                  <Route path="/scanner" element={<P><Scanner /></P>} />
                  <Route path="/receitas" element={<P><Receitas /></P>} />
                  <Route path="/educacao" element={<P><Educacao /></P>} />
                  <Route path="/biblioteca" element={<P><Biblioteca /></P>} />
                  <Route path="/historico" element={<P><Historico /></P>} />
                  <Route path="/plano-semanal" element={<P><PlanoSemanal /></P>} />
                  <Route path="/plano-personalizado" element={<P><PlanoPersonalizado /></P>} />
                  <Route path="/diario" element={<P><DiarioAlimentar /></P>} />
                  <Route path="/assistente" element={<P><AssistenteIA /></P>} />
                  <Route path="/memoria-ia" element={<P><MemoriaIA /></P>} />
                  <Route path="/evolucao" element={<P><Evolucao /></P>} />
                  <Route path="/guias" element={<P><Guias /></P>} />
                  <Route path="/insights" element={<P><Insights /></P>} />
                  <Route path="/favoritos" element={<P><Favoritos /></P>} />
                  <Route path="/configuracoes" element={<P><Configuracoes /></P>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </Suspense>
            <MobileTabBar />
          </RouteErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;