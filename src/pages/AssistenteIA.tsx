import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Bot, Send, Sparkles, User, ShieldCheck, Lightbulb, Brain } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  sumTotals, todayISO, toISODate,
  useFoodLogRange, useGoals, usePreferences, useWeightLog,
} from "@/hooks/useNutrition";
import { memoryToPrompt, useAiMemory } from "@/hooks/useAiMemory";

type Msg = { role: "user" | "assistant"; content: string };

const AssistenteIA = () => {
  const { user } = useAuth();
  const today = todayISO();
  const weekAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return toISODate(d);
  }, []);

  const { data: weekLog = [] } = useFoodLogRange(weekAgo, today);
  const { data: goals } = useGoals();
  const { data: prefs } = usePreferences();
  const { data: weights = [] } = useWeightLog();
  const { data: memory = [] } = useAiMemory();
  const [searchParams, setSearchParams] = useSearchParams();

  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Olá! Sou a **Evolua Plus AI**, sua assistente de alimentação e hábitos saudáveis.\n\nPosso te ajudar com informações gerais sobre nutrição, receitas, rotina e uso da plataforma. Por onde quer começar?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const todayTotals = useMemo(
    () => sumTotals(weekLog.filter((e) => e.logged_at === today)),
    [weekLog, today]
  );

  const context = useMemo(() => {
    const days = Array.from(new Set(weekLog.map((e) => e.logged_at)));
    const weekTotals = sumTotals(weekLog);
    const n = days.length || 1;
    const last = weights[weights.length - 1];
    const first = weights[0];
    return {
      objective: prefs?.objective ?? null,
      memoria: memoryToPrompt(memory),
      restrictions: prefs?.restrictions ?? [],
      disliked_foods: prefs?.disliked_foods ?? [],
      liked_foods: prefs?.liked_foods ?? [],
      calories_goal: goals?.calories_goal,
      protein_goal: goals?.protein_goal,
      water_goal_ml: goals?.water_goal_ml,
      target_weight: goals?.target_weight,
      hoje: {
        calorias: Math.round(todayTotals.calories),
        proteina: Math.round(todayTotals.protein),
        carboidratos: Math.round(todayTotals.carbs),
        gorduras: Math.round(todayTotals.fat),
        fibras: Math.round(todayTotals.fiber),
        refeicoes: weekLog.filter((e) => e.logged_at === today).length,
      },
      semana: {
        dias_registrados: days.length,
        media_calorias: Math.round(weekTotals.calories / n),
        media_proteina: Math.round(weekTotals.protein / n),
        media_fibras: Math.round(weekTotals.fiber / n),
        alimentos_frequentes: Array.from(
          weekLog.reduce((m, e) => m.set(e.food_name, (m.get(e.food_name) ?? 0) + 1), new Map<string, number>())
        ).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([nome]) => nome),
      },
      evolucao: last
        ? {
            peso_atual: Number(last.weight_kg),
            variacao_kg: first ? Number((Number(last.weight_kg) - Number(first.weight_kg)).toFixed(1)) : 0,
            registros: weights.length,
            ultimo_registro: String(last.logged_at).slice(0, 10),
          }
        : null,
    };
  }, [weekLog, prefs, goals, weights, todayTotals, today, memory]);

  const autoInsights = useMemo(() => {
    const out: string[] = [];
    const protGoal = goals?.protein_goal ?? 100;
    const days = new Set(weekLog.map((e) => e.logged_at));
    if (todayTotals.protein > 0 && todayTotals.protein < protGoal * 0.7)
      out.push(`Hoje sua ingestão de proteínas está abaixo da meta (${Math.round(todayTotals.protein)}g de ${protGoal}g). Como posso te ajudar a completar?`);
    if (!days.has(today) && days.size > 0) {
      const lastDay = [...days].sort().pop()!;
      const gap = Math.round((new Date(`${today}T12:00`).getTime() - new Date(`${lastDay}T12:00`).getTime()) / 86400000);
      if (gap >= 2) out.push(`Você ficou ${gap} dias sem registrar refeições. Quer retomar o diário hoje?`);
    }
    if (days.size >= 2) {
      const avgFiber = sumTotals(weekLog).fiber / days.size;
      if (avgFiber < 20) out.push("Percebi que você costuma consumir poucas fibras. Quer ideias simples para aumentar?");
    }
    if (context.evolucao && context.evolucao.registros >= 2)
      out.push(`Sua variação de peso é de ${context.evolucao.variacao_kg}kg desde o primeiro registro. Quer analisar isso comigo?`);
    return out.slice(0, 3);
  }, [weekLog, goals, todayTotals, today, context]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const loadHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(30);
    if (data?.length) setMessages(data as Msg[]);
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `loadHistory` só depende de `user` (já coberto); incluí-la recarregaria o histórico a cada render (ex: a cada tecla digitada).
  }, [user]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading || !user) return;
    const userMsg: Msg = { role: "user", content };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("nutrition-chat", {
        body: {
          messages: newMsgs.slice(-10),
          profile: { memoria: context.memoria, hoje: context.hoje, semana: context.semana, evolucao: context.evolucao },
        },
      });
      if (error) throw error;
      const reply: Msg = { role: "assistant", content: data.reply };
      setMessages([...newMsgs, reply]);

      await supabase.from("chat_messages").insert([
        { user_id: user.id, role: "user", content: userMsg.content },
        { user_id: user.id, role: "assistant", content: reply.content },
      ]);
    } catch (e) {
      toast.error("Erro ao conversar com IA", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "O que posso comer agora?",
    "Trocar minha próxima refeição",
    "Analise meu dia",
    "Como está minha alimentação?",
    "Sugira uma receita",
    "Monte minha lista de compras",
    "Explique meus resultados",
  ];

  // Pergunta vinda de outro módulo (ex.: "Analisar refeição" no diário).
  const prefill = searchParams.get("q");
  useEffect(() => {
    if (!prefill || !user || loading) return;
    setSearchParams({}, { replace: true });
    send(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill, user]);

  return (
    <main className="min-h-screen pt-24 pb-12 bg-background">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
            <Sparkles className="w-3 h-3" /> Assistente inteligente
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Evolua Plus AI
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Respostas rápidas e objetivas sobre alimentação, hábitos e uso da plataforma.
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-secondary/60 rounded-full px-3 py-1">
            <ShieldCheck className="w-3 h-3" />
            Conteúdo informativo — não substitui nutricionista ou médico.
          </p>
        </div>

        {autoInsights.length > 0 && (
          <div className="mb-5 space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-accent" /> O que percebi nos seus registros
            </p>
            {autoInsights.map((i) => (
              <button
                key={i}
                onClick={() => send(i)}
                disabled={loading}
                className="w-full text-left text-sm rounded-xl border border-accent/25 bg-accent/5 hover:bg-accent/10 transition-colors px-4 py-2.5 text-foreground"
              >
                {i}
              </button>
            ))}
          </div>
        )}

        <Card className="border-border/60 bg-card overflow-hidden flex flex-col h-[60vh]">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                }`}>
                  {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user" ? "bg-primary text-primary-foreground whitespace-pre-wrap" : "bg-secondary text-foreground"
                }`}>
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-headings:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-strong:text-foreground prose-a:text-primary">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div className="bg-secondary rounded-2xl px-4 py-3 text-sm text-muted-foreground">
                  Pensando…
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border p-3">
            {messages.length <= 1 && (
              <div className="flex gap-2 flex-wrap mb-3">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Pergunte qualquer coisa sobre nutrição…"
                disabled={loading}
              />
              <Button onClick={() => send()} disabled={loading || !input.trim()} size="icon">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
};

export default AssistenteIA;