import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clock, Apple, Flame, ChevronDown, ChevronUp, Trash2, Search, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ds/ConfirmDialog";

interface ScanRecord {
  id: string;
  created_at: string;
  result: {
    alimentos?: { nome: string; quantidade: string; calorias: number }[];
    receitas?: { nome: string; ingredientes: string[]; tempo: string; calorias: number; proteina: number; carb: number; gordura: number }[];
    dicas?: string[];
    itens?: { alimento: string; quantidade: string; calorias: number; proteina: number; carb: number; gordura: number }[];
    prato?: string;
    avaliacao?: string;
  };
}

const isPortionResult = (r: ScanRecord["result"]) =>
  Array.isArray(r.itens) && r.itens.length > 0 && typeof r.prato === "string";

const Historico = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loadingScans, setLoadingScans] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [periodo, setPeriodo] = useState(0); // dias, 0 = tudo

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      loadScans();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `loadScans` só depende de `user` (já coberto) e `navigate` é estável entre renders; incluir `loadScans` recriaria o efeito a cada render.
  }, [user, loading]);

  const loadScans = async () => {
    const { data, error } = await supabase
      .from("scan_history")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    if (!error && data) setScans(data as ScanRecord[]);
    setLoadingScans(false);
  };

  const deleteScan = async (id: string) => {
    const { error } = await supabase.from("scan_history").delete().eq("id", id);
    if (!error) {
      setScans((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Análise removida" });
    }
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const filtered = useMemo(() => {
    const limite = periodo ? Date.now() - periodo * 86400000 : 0;
    const q = search.trim().toLowerCase();
    return scans.filter((s) => {
      const inPeriod = !limite || new Date(s.created_at).getTime() >= limite;
      if (!inPeriod) return false;
      if (!q) return true;
      const nomes = [
        ...(s.result.alimentos ?? []).map((a) => a.nome),
        ...(s.result.receitas ?? []).map((r) => r.nome),
      ].join(" ").toLowerCase();
      return nomes.includes(q);
    });
  }, [scans, search, periodo]);

  const stats = useMemo(() => {
    const alimentos = [
      ...filtered.flatMap((s) => s.result.alimentos ?? []),
      ...filtered.filter((s) => isPortionResult(s.result)).flatMap((s) => (s.result.itens ?? []).map((i) => ({ nome: i.alimento, quantidade: i.quantidade, calorias: i.calorias }))),
    ];
    const receitas = filtered.flatMap((s) => s.result.receitas ?? []);
    const cont: Record<string, number> = {};
    alimentos.forEach((a) => { cont[a.nome] = (cont[a.nome] || 0) + 1; });
    const top = Object.entries(cont).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { scans: filtered.length, alimentos: alimentos.length, receitas: receitas.length, top };
  }, [filtered]);

  const exportCSV = () => {
    const linhas = [["Data", "Alimentos", "Receitas"]];
    filtered.forEach((s) => {
      linhas.push([
        formatDate(s.created_at),
        (s.result.alimentos ?? []).map((a) => `${a.nome} (${a.calorias} kcal)`).join(" | "),
        (s.result.receitas ?? []).map((r) => r.nome).join(" | "),
      ]);
    });
    const csv = linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `evolua-plus-historico-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Histórico exportado" });
  };

  if (loading || loadingScans) {
    return (
      <div className="min-h-screen bg-background pt-20 pb-16 flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-24 md:pb-16">
      <div className="container mx-auto px-6 max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Meu <span className="text-primary">Histórico</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            Veja todas as análises de geladeira que você já fez
          </p>
        </div>

        {scans.length === 0 ? (
          <div className="bg-card rounded-2xl shadow-soft p-12 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-display font-semibold text-foreground mb-2">Nenhuma análise ainda</p>
            <p className="text-sm text-muted-foreground mb-6">Use o Scanner para analisar sua geladeira</p>
            <Button variant="hero" onClick={() => navigate("/scanner")}>Ir para o Scanner</Button>
          </div>
        ) : (
          <>
            {/* Estatísticas */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Análises", value: stats.scans },
                { label: "Alimentos", value: stats.alimentos },
                { label: "Receitas", value: stats.receitas },
              ].map((s) => (
                <div key={s.label} className="bg-card rounded-2xl shadow-soft border border-border/50 p-4 text-center">
                  <p className="font-display text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {stats.top.length > 0 && (
              <div className="bg-card rounded-2xl shadow-soft border border-border/50 p-4 mb-4">
                <p className="text-sm font-display font-semibold text-foreground mb-2">Alimentos mais detectados</p>
                <div className="flex flex-wrap gap-2">
                  {stats.top.map(([nome, n]) => (
                    <span key={nome} className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
                      {nome} · {n}x
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Busca, período e exportação */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar alimento ou receita..."
                  className="w-full h-11 pl-10 pr-3 rounded-xl border border-border bg-background text-foreground text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <select
                value={periodo}
                onChange={(e) => setPeriodo(Number(e.target.value))}
                className="h-11 rounded-xl border border-border bg-background text-foreground text-sm px-3 focus:border-primary focus:outline-none"
              >
                <option value={0}>Todo o período</option>
                <option value={7}>Últimos 7 dias</option>
                <option value={30}>Últimos 30 dias</option>
                <option value={90}>Últimos 90 dias</option>
              </select>
              <Button variant="outline" onClick={exportCSV} className="gap-2">
                <Download className="w-4 h-4" /> Exportar
              </Button>
            </div>

          <div className="space-y-4">
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhuma análise encontrada nesse filtro.</p>
            )}
            {filtered.map((scan) => (
              <div key={scan.id} className="bg-card rounded-2xl shadow-soft overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === scan.id ? null : scan.id)}
                  className="w-full p-5 flex items-center justify-between text-left"
                >
                  <div>
                    <p className="font-display font-semibold text-foreground text-sm">
                      {isPortionResult(scan.result)
                        ? `${scan.result.itens!.length} ${scan.result.itens!.length === 1 ? "item" : "itens"} · ${scan.result.prato}`
                        : `${scan.result.alimentos?.length || 0} alimentos · ${scan.result.receitas?.length || 0} receitas`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {formatDate(scan.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ConfirmDialog
                      trigger={
                        <button
                          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      }
                      title="Excluir análise"
                      description="Deseja excluir esta análise do histórico? Essa ação não pode ser desfeita."
                      onConfirm={() => deleteScan(scan.id)}
                    />
                    {expanded === scan.id ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                  </div>
                </button>

                {expanded === scan.id && (
                  <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
                    {/* Foods */}
                    {scan.result.alimentos && (
                      <div>
                        <h3 className="font-display text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
                          <Apple className="w-4 h-4 text-primary" /> Alimentos
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          {scan.result.alimentos.map((a) => (
                            <div key={a.nome} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 text-xs">
                              <span className="text-foreground font-medium">{a.nome}</span>
                              <span className="text-primary font-semibold">{a.calorias} cal</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recipes */}
                    {scan.result.receitas && (
                      <div>
                        <h3 className="font-display text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
                          <Flame className="w-4 h-4 text-accent" /> Receitas
                        </h3>
                        <div className="space-y-2">
                          {scan.result.receitas.map((r) => (
                            <div key={r.nome} className="p-3 rounded-lg border border-border">
                              <div className="flex justify-between items-center">
                                <p className="font-medium text-foreground text-sm">{r.nome}</p>
                                <span className="text-xs text-primary">⏱ {r.tempo}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {r.calorias} kcal · {r.proteina}g prot · {r.carb}g carb · {r.gordura}g gord
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Portion items */}
                    {isPortionResult(scan.result) && (
                      <>
                        <div>
                          <h3 className="font-display text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
                            <Apple className="w-4 h-4 text-primary" /> {scan.result.prato}
                          </h3>
                          <div className="grid grid-cols-2 gap-2">
                            {scan.result.itens!.map((item) => (
                              <div key={item.alimento} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 text-xs">
                                <span className="text-foreground font-medium">{item.alimento}</span>
                                <span className="text-primary font-semibold">{Math.round(item.calorias)} cal</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {scan.result.avaliacao && (
                          <p className="text-xs text-muted-foreground italic">{scan.result.avaliacao}</p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Historico;
