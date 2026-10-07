import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh bg-background flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-4" />
            <p className="font-display font-semibold text-foreground mb-2">
              Algo deu errado ao carregar esta página
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Pode ser um problema temporário de conexão. Tente novamente.
            </p>
            <Button
              variant="hero"
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
            >
              Recarregar página
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
