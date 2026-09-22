import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/useAuth";
import { useSetupStatus } from "@/hooks/useOnboarding";
import { Button } from "@/components/ui/button";

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const SetupError = ({ onRetry }: { onRetry: () => void }) => (
  <div className="min-h-screen bg-background flex items-center justify-center px-6">
    <div className="text-center max-w-sm">
      <p className="text-foreground font-display font-semibold mb-2">Não foi possível carregar seus dados</p>
      <p className="text-sm text-muted-foreground mb-6">
        Verifique sua conexão com a internet e tente novamente.
      </p>
      <Button variant="hero" onClick={onRetry}>Tentar novamente</Button>
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { data: setup, isLoading: setupLoading, isError, refetch } = useSetupStatus();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/auth" replace />;
  if (setupLoading) return <Spinner />;
  if (isError) return <SetupError onRetry={() => refetch()} />;
  if (!setup) return <Spinner />;

  const onOnboarding = location.pathname === "/onboarding";

  // Sem configuração → onboarding. Já configurado → nunca fica preso no onboarding.
  if (setup.needsOnboarding && !onOnboarding) return <Navigate to="/onboarding" replace />;
  if (!setup.needsOnboarding && onOnboarding) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
