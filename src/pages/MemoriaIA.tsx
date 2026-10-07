import { useMemo, useState } from "react";
import { Brain, Plus, Trash2, ShieldCheck, EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import EmptyState from "@/components/ds/EmptyState";
import {
  MEMORY_CATEGORIES,
  useAiMemory,
  useAiMemoryMutations,
  type MemoryCategory,
} from "@/hooks/useAiMemory";

const MemoriaIA = () => {
  const { data: rows = [], isLoading } = useAiMemory();
  const { add, update, forget } = useAiMemoryMutations();
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<MemoryCategory>("preferencia");

  const grouped = useMemo(
    () =>
      MEMORY_CATEGORIES.map((c) => ({
        ...c,
        items: rows.filter((r) => r.category === c.id),
      })),
    [rows],
  );

  const handleAdd = async () => {
    if (!content.trim()) return;
    try {
      await add.mutateAsync({ content, category });
      setContent("");
      toast.success("Informação salva na memória da IA");
    } catch (e) {
      toast.error("Não consegui salvar agora", { description: "Tente novamente em instantes." });
    }
  };

  return (
    <main className="min-h-dvh bg-background pt-24 pb-10 md:pb-16">
      <div className="container mx-auto max-w-3xl">
        <header className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
            <Brain className="w-3 h-3" /> Memória da IA
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            O que a IA lembra sobre você
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Essas informações personalizam as respostas e sugestões. Você pode editar ou apagar quando quiser.
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-secondary/60 rounded-full px-3 py-1">
            <ShieldCheck className="w-3 h-3" /> Seus dados são privados e usados apenas na sua conta.
          </p>
        </header>

        <Card className="p-4 mb-6 border-border/60">
          <p className="font-display font-semibold text-sm text-foreground mb-3">Adicionar informação</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {MEMORY_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                  category === c.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-primary/10 hover:text-primary"
                }`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder={MEMORY_CATEGORIES.find((c) => c.id === category)?.hint}
            />
            <Button onClick={handleAdd} disabled={!content.trim() || add.isPending} size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-secondary/60 animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Brain}
            title="A memória ainda está vazia"
            description="Adicione preferências, restrições ou hábitos para a IA considerar nas próximas respostas."
          />
        ) : (
          <div className="space-y-6">
            {grouped
              .filter((g) => g.items.length > 0)
              .map((g) => (
                <section key={g.id}>
                  <h2 className="font-display font-semibold text-sm text-foreground mb-2">
                    {g.emoji} {g.label}
                  </h2>
                  <div className="space-y-2">
                    {g.items.map((m) => (
                      <div
                        key={m.id}
                        className={`flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 ${
                          m.active ? "" : "opacity-60"
                        }`}
                      >
                        <p className="flex-1 text-sm text-foreground">{m.content}</p>
                        <button
                          title={m.active ? "Ignorar temporariamente" : "Voltar a considerar"}
                          onClick={() => update.mutate({ id: m.id, active: !m.active })}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {m.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          title="Esquecer esta informação"
                          onClick={async () => {
                            await forget.mutateAsync(m.id);
                            toast.success("Informação esquecida pela IA");
                          }}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default MemoriaIA;