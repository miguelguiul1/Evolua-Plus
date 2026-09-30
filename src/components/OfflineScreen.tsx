import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const OfflineScreen = () => (
  <div className="fixed inset-0 z-[200] bg-background flex items-center justify-center px-6">
    <div className="text-center max-w-sm">
      <WifiOff className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
      <p className="font-display font-semibold text-foreground mb-2">Você está offline</p>
      <p className="text-sm text-muted-foreground mb-6">
        Verifique sua conexão com a internet. Assim que ela voltar, o Evolua Plus volta a funcionar normalmente.
      </p>
      <Button variant="hero" onClick={() => window.location.reload()}>Tentar novamente</Button>
    </div>
  </div>
);

export default OfflineScreen;
