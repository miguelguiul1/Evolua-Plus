import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { resolveNext } from "@/lib/safeNext";
import { resolveAppUrl } from "@/lib/appUrl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Leaf, Heart, Sparkles } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { lovable } from "@/integrations/lovable/index";



const traduzErro = (msg: string) => {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
  if (m.includes("user already registered")) return "Este e-mail já possui conta. Faça login.";
  if (m.includes("password should be at least")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (m.includes("pwned") || m.includes("compromised")) return "Essa senha apareceu em vazamentos. Escolha outra mais segura.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Sem conexão com o servidor. Verifique sua internet.";
  return msg || "Algo deu errado. Tente novamente.";
};

const Auth = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [isLogin, setIsLogin] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  /** Somente rotas internas permitidas — nunca destinos externos. */
  const nextPath = resolveNext(searchParams.get("next")) ?? "/dashboard";

  useEffect(() => {
    if (!authLoading && user) navigate(nextPath, { replace: true });
  }, [user, authLoading, navigate, nextPath]);


  const dismissWelcome = () => {
    setIsLogin(false); // go straight to sign up
    setShowWelcome(false);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({
          title: "Não foi possível entrar com Google",
          description: "Tente novamente em instantes ou use seu e-mail.",
          variant: "destructive",
        });
        return;
      }
      if (result.redirected) return;
      navigate(nextPath, { replace: true });
    } catch {
      toast({ title: "Erro", description: "Falha ao conectar com o Google.", variant: "destructive" });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();
    setLoading(true);

    try {
      if (isForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${resolveAppUrl()}/reset-password`,
        });
        if (error) throw error;
        setSent(true);
        toast({
          title: "E-mail enviado 📧",
          description: "Se existir uma conta com esse e-mail, você receberá o link de redefinição.",
        });
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        toast({ title: "Bem-vindo de volta! 🎉" });
        navigate(nextPath, { replace: true });
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${resolveAppUrl()}/auth?next=${encodeURIComponent(nextPath)}`,
          },
        });

        if (error) throw error;
        toast({
          title: "Conta criada! 📧",
          description: "Verifique seu email para confirmar o cadastro.",
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      toast({
        title: "Erro",
        description: traduzErro(message),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (showWelcome) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background overflow-hidden">
        {/* Gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="absolute -top-32 -left-32 w-[36rem] h-[36rem] rounded-full bg-primary/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-[40rem] h-[40rem] rounded-full bg-accent/15 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

        {/* Floating decorative icons */}
        <Leaf className="absolute top-[18%] left-[12%] w-8 h-8 text-primary/40 animate-fade-in" style={{ animationDelay: "0.3s", animationDuration: "1s" }} />
        <Leaf className="absolute bottom-[22%] right-[14%] w-10 h-10 text-primary/30 animate-fade-in" style={{ animationDelay: "0.6s", animationDuration: "1s" }} />
        <Sparkles className="absolute top-[26%] right-[18%] w-6 h-6 text-accent/60 animate-fade-in" style={{ animationDelay: "0.9s", animationDuration: "1s" }} />
        <Heart className="absolute bottom-[28%] left-[16%] w-6 h-6 text-primary/40 animate-fade-in" style={{ animationDelay: "1.2s", animationDuration: "1s" }} />

        {/* Content */}
        <div className="relative z-10 text-center px-6 max-w-lg">
          <div className="animate-fade-up flex justify-center mb-6">
            <BrandLogo size="lg" showWordmark={false} />
          </div>

          <h1
            className="font-display text-3xl sm:text-4xl font-medium text-muted-foreground animate-fade-up"
            style={{ animationDelay: "0.2s" }}
          >
            Bem-vindo ao
          </h1>

          <div
            className="font-display text-6xl sm:text-8xl font-bold leading-none mt-2 animate-fade-up"
            style={{ animationDelay: "0.5s" }}
          >
            <span className="text-foreground">Evolua</span>
            <span className="text-gradient-primary"> Plus</span>
          </div>

          <p
            className="mt-6 text-base sm:text-lg text-muted-foreground max-w-md mx-auto animate-fade-up"
            style={{ animationDelay: "0.9s" }}
          >
            Nutrição inteligente, personalizada e acessível. Vamos criar sua conta em segundos.
          </p>

          <div
            className="mt-10 animate-fade-up"
            style={{ animationDelay: "1.3s" }}
          >
            <Button variant="hero" size="xl" className="gap-2 group" onClick={dismissWelcome}>
              Começar meu cadastro
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>

          <button
            onClick={() => {
              setIsLogin(true);
              setShowWelcome(false);
            }}
            className="mt-5 text-sm text-muted-foreground hover:text-primary transition-colors animate-fade-in"
            style={{ animationDelay: "1.6s", animationDuration: "1s" }}
          >
            Já tenho conta · <span className="font-semibold text-primary">Entrar</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-16 flex items-center justify-center">
      <div className="w-full max-w-md mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">
            {isForgot ? "Recuperar senha" : isLogin ? "Entrar" : "Criar conta"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isForgot
              ? "Enviaremos um link para você criar uma nova senha"
              : isLogin
              ? "Acesse sua conta para personalizar sua experiência"
              : "Comece sua jornada de nutrição inteligente"}
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-soft p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && !isForgot && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Senha</Label>
              <div className={isForgot ? "hidden" : undefined}>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required={!isForgot}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              </div>
            </div>

            {isLogin && !isForgot && (
              <button
                type="button"
                onClick={() => { setIsForgot(true); setSent(false); }}
                className="text-sm text-primary hover:underline"
              >
                Esqueci minha senha
              </button>
            )}

            {isForgot && sent && (
              <p className="text-sm text-muted-foreground">
                Verifique sua caixa de entrada e a pasta de spam.
              </p>
            )}

            <Button variant="hero" size="lg" className="w-full gap-2" type="submit" disabled={loading}>
              {loading ? "Carregando..." : isForgot ? "Enviar link de recuperação" : isLogin ? "Entrar" : "Criar conta"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {!isForgot && (
            <>
              <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">ou</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full gap-3"
                onClick={handleGoogle}
                disabled={googleLoading}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.94-2.92l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.96H1.27v3.09A12 12 0 0 0 12 24Z" />
                  <path fill="#FBBC05" d="M5.28 14.27a7.2 7.2 0 0 1 0-4.54V6.64H1.27a12 12 0 0 0 0 10.72l4.01-3.09Z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.27 6.64l4.01 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
                </svg>
                {googleLoading ? "Conectando…" : "Continuar com Google"}
              </Button>
            </>
          )}


          <div className="mt-6 text-center">
            <button
              onClick={() => {
                if (isForgot) { setIsForgot(false); setIsLogin(true); return; }
                setIsLogin(!isLogin);
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isForgot ? "Lembrou a senha? " : isLogin ? "Não tem conta? " : "Já tem conta? "}
              <span className="font-semibold text-primary">
                {isForgot ? "Voltar ao login" : isLogin ? "Cadastre-se" : "Entrar"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
