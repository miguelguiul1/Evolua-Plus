import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, ArrowRight } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      setStatus(ok ? "ready" : "invalid");
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) finish(true);
    });

    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

      // Fluxo PKCE (?code=...)
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        finish(!error);
        return;
      }
      // Fluxo implícito (#access_token=...&type=recovery)
      if (hash.get("type") === "recovery" || hash.get("access_token")) {
        finish(true);
        return;
      }
      // Sem token de recuperação na URL — verificar se há sessão de recuperação ativa
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        // Sessão existe mas NÃO é de recuperação (acesso direto sem link). Redirecionar.
        navigate("/dashboard", { replace: true });
        return;
      }
      // Sem sessão e sem token: link inválido
      finish(false);
    })();

    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Senha atualizada com sucesso! 🎉" });
      navigate("/dashboard", { replace: true });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : undefined;
      const m = String(errorMessage ?? "").toLowerCase();
      const desc = m.includes("session missing") || m.includes("jwt") || m.includes("expired")
        ? "Link inválido ou expirado. Peça um novo link de redefinição."
        : m.includes("should be at least")
        ? "A senha precisa ter pelo menos 6 caracteres."
        : m.includes("pwned") || m.includes("compromised")
        ? "Essa senha apareceu em vazamentos. Escolha outra mais segura."
        : errorMessage || "Não foi possível atualizar a senha.";
      toast({ title: "Erro", description: desc, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (status === "checking") {
    return (
      <div className="min-h-screen bg-background pt-20 pb-16 flex items-center justify-center">
        <p className="text-muted-foreground">Validando link...</p>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen bg-background pt-20 pb-16 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-muted-foreground">Link inválido ou expirado.</p>
        <Button variant="hero" onClick={() => navigate("/auth")}>Pedir um novo link</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-16 flex items-center justify-center">
      <div className="w-full max-w-md mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Nova senha</h1>
          <p className="mt-2 text-muted-foreground">Digite sua nova senha</p>
        </div>
        <div className="bg-card rounded-2xl shadow-soft p-8">
          <form onSubmit={handleReset} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Nova senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-foreground">Confirmar senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>
            <Button variant="hero" size="lg" className="w-full gap-2" type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Atualizar senha"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
