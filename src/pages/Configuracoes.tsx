import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sun, Moon, Monitor, User, Bell, Ruler, Download, Trash2, KeyRound, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import ConfirmDialog from "@/components/ds/ConfirmDialog";
import { useTheme, ThemeMode } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { clearStoredPlano } from "@/lib/planoStorage";
import { resolveAppUrl } from "@/lib/appUrl";

type Prefs = {
  peso: "kg" | "lb";
  medida: "cm" | "in";
  idioma: "pt-BR" | "en" | "es";
  notif: Record<string, boolean>;
};

const PREFS_KEY = "evoluaConfig";
const defaultPrefs: Prefs = {
  peso: "kg",
  medida: "cm",
  idioma: "pt-BR",
  notif: { hidratacao: true, refeicoes: true, evolucao: true, ia: true, novidades: false },
};

const notifLabels: Record<string, string> = {
  hidratacao: "Lembretes de hidratação",
  refeicoes: "Lembretes para registrar refeições",
  evolucao: "Lembretes de evolução corporal",
  ia: "Insights da IA",
  novidades: "Novidades da plataforma",
};

const Section = ({ icon: Icon, title, children }: { icon: typeof User; title: string; children: React.ReactNode }) => (
  <section className="bg-card rounded-2xl border border-border/50 shadow-soft p-5">
    <h2 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4">
      <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </span>
      {title}
    </h2>
    {children}
  </section>
);

const Configuracoes = () => {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<Prefs>(() => {
    try {
      return { ...defaultPrefs, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") };
    } catch {
      return defaultPrefs;
    }
  });
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => setFullName(data?.full_name ?? ""));
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar");
    } else {
      toast.success("Perfil atualizado");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    }
    toast.success("Você saiu da sua conta");
    navigate("/", { replace: true });
  };


  const changePassword = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${resolveAppUrl()}/reset-password`,
    });
    if (error) {
      toast.error("Erro ao enviar e-mail");
    } else {
      toast.success("Enviamos um link de redefinição para seu e-mail");
    }
  };

  const exportData = async () => {
    if (!user) return;
    const [food, water, weight, goals] = await Promise.all([
      supabase.from("food_log").select("*").eq("user_id", user.id),
      supabase.from("water_log").select("*").eq("user_id", user.id),
      supabase.from("weight_log").select("*").eq("user_id", user.id),
      supabase.from("user_goals").select("*").eq("user_id", user.id),
    ]);
    const payload = {
      exportado_em: new Date().toISOString(),
      diario_alimentar: food.data ?? [],
      hidratacao: water.data ?? [],
      evolucao: weight.data ?? [],
      metas: goals.data ?? [],
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `evolua-plus-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Seus dados foram exportados");
  };

  const deleteAccount = async () => {
    if (!user) return;
    try {
      // A exclusão (dados + arquivos + usuário de autenticação) acontece no backend,
      // que identifica o usuário pelo token da sessão — nunca por um ID enviado daqui.
      const { data, error } = await supabase.functions.invoke("delete-account", { body: {} });
      if (error || !data?.success) throw error ?? new Error("falha");
    } catch {
      return toast.error("Não foi possível excluir sua conta agora");
    }
    await clearStoredPlano(user.id);
    toast.success("Sua conta foi excluída");
    try {
      await signOut();
    } catch {
      /* usuário já removido: apenas limpamos a sessão local */
    }
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    navigate("/", { replace: true });
  };

  const themes: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
    { id: "light", label: "Claro", icon: Sun },
    { id: "dark", label: "Escuro", icon: Moon },
    { id: "system", label: "Sistema", icon: Monitor },
  ];

  return (
    <div className="min-h-screen bg-background pt-20 pb-24 md:pb-16">
      <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
        <header className="text-center mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Config<span className="text-primary">urações</span>
          </h1>
          <p className="mt-3 text-muted-foreground text-sm">Aparência, conta, preferências e notificações.</p>
        </header>

        <div className="space-y-4">
          <Section icon={Sun} title="Aparência">
            <div className="grid grid-cols-3 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`rounded-xl border p-3 text-sm font-medium flex flex-col items-center gap-2 transition-all min-h-11 ${
                    theme === t.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              ))}
            </div>
          </Section>

          <Section icon={User} title="Conta">
            <div className="space-y-4">
              <div>
                <Label htmlFor="config-nome">Nome completo</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input id="config-nome" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
                  <Button onClick={saveProfile} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">E-mail: {user?.email}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={changePassword} className="gap-2">
                  <KeyRound className="w-4 h-4" /> Alterar senha
                </Button>
                <Button variant="outline" onClick={exportData} className="gap-2">
                  <Download className="w-4 h-4" /> Exportar meus dados
                </Button>
                <ConfirmDialog
                  title="Excluir sua conta?"
                  description="Sua conta de acesso, arquivos e todos os registros (alimentação, hidratação, evolução, IA e favoritos) serão removidos permanentemente. Esta ação não pode ser desfeita."
                  confirmLabel="Excluir tudo"
                  onConfirm={deleteAccount}
                  trigger={
                    <Button variant="outline" className="gap-2 text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" /> Excluir conta
                    </Button>
                  }
                />
              </div>
              <div className="pt-2 border-t border-border/60">
                <Button variant="outline" onClick={handleSignOut} className="gap-2 w-full sm:w-auto">
                  <LogOut className="w-4 h-4" /> Sair da conta
                </Button>
              </div>
            </div>

          </Section>

          <Section icon={Ruler} title="Preferências">
            <div className="grid sm:grid-cols-3 gap-3">
              <label className="text-xs text-muted-foreground">
                Idioma
                <select
                  value={prefs.idioma}
                  onChange={(e) => setPrefs({ ...prefs, idioma: e.target.value as Prefs["idioma"] })}
                  className="mt-1.5 w-full h-11 rounded-xl border border-border bg-background text-foreground text-sm px-3 focus:border-primary focus:outline-none"
                >
                  <option value="pt-BR">Português (BR)</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </label>
              <label className="text-xs text-muted-foreground">
                Peso
                <select
                  value={prefs.peso}
                  onChange={(e) => setPrefs({ ...prefs, peso: e.target.value as Prefs["peso"] })}
                  className="mt-1.5 w-full h-11 rounded-xl border border-border bg-background text-foreground text-sm px-3 focus:border-primary focus:outline-none"
                >
                  <option value="kg">Quilogramas (kg)</option>
                  <option value="lb">Libras (lb)</option>
                </select>
              </label>
              <label className="text-xs text-muted-foreground">
                Medidas
                <select
                  value={prefs.medida}
                  onChange={(e) => setPrefs({ ...prefs, medida: e.target.value as Prefs["medida"] })}
                  className="mt-1.5 w-full h-11 rounded-xl border border-border bg-background text-foreground text-sm px-3 focus:border-primary focus:outline-none"
                >
                  <option value="cm">Centímetros (cm)</option>
                  <option value="in">Polegadas (in)</option>
                </select>
              </label>
            </div>
          </Section>

          <Section icon={Bell} title="Notificações">
            <div className="space-y-3">
              {Object.entries(notifLabels).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <Label htmlFor={`notif-${key}`} className="text-sm font-normal text-foreground">{label}</Label>
                  <Switch
                    id={`notif-${key}`}
                    checked={prefs.notif[key]}
                    onCheckedChange={(v) => setPrefs({ ...prefs, notif: { ...prefs.notif, [key]: v } })}
                  />
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;