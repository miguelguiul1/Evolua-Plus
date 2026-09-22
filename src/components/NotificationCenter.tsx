import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Trophy, Droplets, Utensils, Lightbulb, Target, CheckCheck } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useEngagement } from "@/hooks/useEngagement";
import { useAuth } from "@/contexts/useAuth";

type Notif = {
  id: string;
  icon: typeof Bell;
  title: string;
  body: string;
  to: string;
};

const READ_KEY = "evoluaNotificacoesLidas";

const readIds = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(READ_KEY) || "[]");
  } catch {
    return [];
  }
};

/** Central de notificações: conquistas, metas, lembretes e insights da IA. */
const NotificationCenter = () => {
  const { user } = useAuth();
  const e = useEngagement();
  const [read, setRead] = useState<string[]>(readIds);

  useEffect(() => {
    localStorage.setItem(READ_KEY, JSON.stringify(read));
  }, [read]);

  const notifications = useMemo<Notif[]>(() => {
    if (!user) return [];
    const list: Notif[] = [];

    e.achievements.filter((a) => a.unlocked).forEach((a) =>
      list.push({
        id: `conquista-${a.id}`,
        icon: Trophy,
        title: `Conquista desbloqueada: ${a.title}`,
        body: a.description,
        to: "/insights",
      })
    );

    if (e.today.water >= e.goals.waterGoal && e.goals.waterGoal > 0)
      list.push({ id: `meta-agua-${new Date().toDateString()}`, icon: Target, title: "Meta de hidratação atingida", body: "Você bateu sua meta de água hoje. Excelente!", to: "/dashboard" });
    else
      list.push({ id: `lembrete-agua-${new Date().toDateString()}`, icon: Droplets, title: "Lembrete de hidratação", body: `Faltam ${Math.max(0, Math.round((e.goals.waterGoal - e.today.water) / 100) / 10)}L para sua meta de hoje.`, to: "/dashboard" });

    if (e.today.meals === 0)
      list.push({ id: `lembrete-refeicao-${new Date().toDateString()}`, icon: Utensils, title: "Registre sua refeição", body: "Você ainda não registrou nada hoje. Leva menos de um minuto.", to: "/diario" });

    e.proactive.forEach((p, i) =>
      list.push({ id: `insight-${new Date().toDateString()}-${i}`, icon: Lightbulb, title: "Insight da IA", body: p, to: "/assistente" })
    );

    return list.slice(0, 12);
  }, [user, e]);

  const unread = notifications.filter((n) => !read.includes(n.id));

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Central de notificações" className="relative">
          <Bell className="w-4 h-4" />
          {unread.length > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <p className="font-display font-semibold text-sm text-foreground">Notificações</p>
          {unread.length > 0 && (
            <button
              onClick={() => setRead(notifications.map((n) => n.id))}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <CheckCheck className="w-3 h-3" /> Marcar como lidas
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="p-6 text-center text-xs text-muted-foreground">Sem novidades por aqui.</p>
          ) : (
            notifications.map((n) => {
              const isRead = read.includes(n.id);
              return (
                <Link
                  key={n.id}
                  to={n.to}
                  onClick={() => setRead((r) => (r.includes(n.id) ? r : [...r, n.id]))}
                  className={`flex gap-3 px-4 py-3 border-b border-border/40 last:border-0 transition-colors hover:bg-secondary/60 ${
                    isRead ? "opacity-60" : ""
                  }`}
                >
                  <span className="mt-0.5 h-8 w-8 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <n.icon className="w-4 h-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-foreground">{n.title}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">{n.body}</span>
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationCenter;