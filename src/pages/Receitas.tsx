import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Clock, DollarSign, Flame, Search, Heart, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import MotivationalQuote from "@/components/MotivationalQuote";
import { useGlobalFavorites } from "@/hooks/useGlobalFavorites";

import { Receita, receitas, allTags, tagLabels } from "@/data/receitas";

const minutos = (t: string) => parseInt(t) || 0;
const reais = (c: string) => Number(c.replace(/[^\d,]/g, "").replace(",", ".")) || 0;


const Receitas = () => {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [maxTempo, setMaxTempo] = useState(0); // 0 = qualquer
  const [maxCusto, setMaxCusto] = useState(0);
  const [maxCalorias, setMaxCalorias] = useState(0);
  const [minProteina, setMinProteina] = useState(0);
  const [sortBy, setSortBy] = useState<"padrao" | "calorias" | "proteina" | "tempo" | "custo">("padrao");
  const [onlyFavs, setOnlyFavs] = useState(false);
  const { items: globalFavs, isFavorite, toggleFavorite } = useGlobalFavorites();
  const pendingFav = useRef<Set<number>>(new Set());
  const favCount = globalFavs.filter((f) => f.category === "receita").length;

  const handleToggleFav = async (r: Receita) => {
    if (pendingFav.current.has(r.id)) return;
    pendingFav.current.add(r.id);
    try {
      const res = await toggleFavorite({
        id: String(r.id),
        category: "receita",
        title: r.nome,
        subtitle: `${r.tempo} · ${r.calorias} kcal · ${r.proteina}g de proteína`,
        to: "/receitas",
      });
      if (!res.ok) {
        toast.error("Não foi possível salvar o favorito. Verifique sua conexão e tente de novo.");
      }
    } finally {
      pendingFav.current.delete(r.id);
    }
  };

  const filtered = useMemo(() => {
    const list = receitas.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        r.nome.toLowerCase().includes(q) || r.ingredientes.some((i) => i.toLowerCase().includes(q));
      const matchTag = !activeTag || r.tags.includes(activeTag);
      const matchFav = !onlyFavs || isFavorite("receita", String(r.id));
      const matchTempo = !maxTempo || minutos(r.tempo) <= maxTempo;
      const matchCusto = !maxCusto || reais(r.custo) <= maxCusto;
      const matchCal = !maxCalorias || r.calorias <= maxCalorias;
      const matchProt = !minProteina || r.proteina >= minProteina;
      return matchSearch && matchTag && matchFav && matchTempo && matchCusto && matchCal && matchProt;
    });

    const sorted = [...list];
    if (sortBy === "calorias") sorted.sort((a, b) => a.calorias - b.calorias);
    if (sortBy === "proteina") sorted.sort((a, b) => b.proteina - a.proteina);
    if (sortBy === "tempo") sorted.sort((a, b) => minutos(a.tempo) - minutos(b.tempo));
    if (sortBy === "custo") sorted.sort((a, b) => reais(a.custo) - reais(b.custo));
    return sorted;
  }, [search, activeTag, onlyFavs, isFavorite, maxTempo, maxCusto, maxCalorias, minProteina, sortBy]);

  const limparFiltros = () => {
    setSearch(""); setActiveTag(""); setOnlyFavs(false);
    setMaxTempo(0); setMaxCusto(0); setMaxCalorias(0); setMinProteina(0); setSortBy("padrao");
  };

  return (
    <div className="min-h-dvh bg-background pt-20 pb-10 md:pb-16">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Pratos <span className="text-primary">Baratos</span> & Rápidos
          </h1>
          <p className="mt-3 text-muted-foreground">
            Receitas nutritivas, econômicas e prontas em até 15 minutos
          </p>
        </div>

        <MotivationalQuote />

        {/* Search */}
        <div className="mt-8 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por receita ou ingrediente..."
            aria-label="Buscar por receita ou ingrediente"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-xl border-2 border-border bg-background text-foreground focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        {/* Tags */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTag("")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              !activeTag ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            Todas
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag === activeTag ? "" : tag)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeTag === tag ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {tagLabels[tag]}
            </button>
          ))}
          <button
            onClick={() => setOnlyFavs((v) => !v)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
              onlyFavs ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${onlyFavs ? "fill-current" : ""}`} /> Favoritas ({favCount})
          </button>
        </div>

        {/* Filtros avançados */}
        <div className="mt-4 bg-card border border-border/50 rounded-2xl p-4 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-primary" /> Filtros avançados
            </p>
            <Button variant="ghost" size="sm" onClick={limparFiltros}>Limpar</Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: "Tempo máx.", value: maxTempo, set: setMaxTempo, opts: [[0, "Qualquer"], [5, "até 5 min"], [10, "até 10 min"], [15, "até 15 min"]] },
              { label: "Custo máx.", value: maxCusto, set: setMaxCusto, opts: [[0, "Qualquer"], [3, "até R$ 3"], [5, "até R$ 5"], [7, "até R$ 7"]] },
              { label: "Calorias máx.", value: maxCalorias, set: setMaxCalorias, opts: [[0, "Qualquer"], [250, "até 250"], [350, "até 350"], [450, "até 450"]] },
              { label: "Proteína mín.", value: minProteina, set: setMinProteina, opts: [[0, "Qualquer"], [10, "10g+"], [20, "20g+"], [25, "25g+"]] },
            ].map((f) => (
              <label key={f.label} className="text-xs text-muted-foreground">
                {f.label}
                <select
                  value={f.value}
                  onChange={(e) => f.set(Number(e.target.value))}
                  className="mt-1 w-full h-9 rounded-lg border border-border bg-background text-foreground text-sm px-2 focus:border-primary focus:outline-none"
                >
                  {(f.opts as [number, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </label>
            ))}
            <label className="text-xs text-muted-foreground">
              Ordenar por
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="mt-1 w-full h-9 rounded-lg border border-border bg-background text-foreground text-sm px-2 focus:border-primary focus:outline-none"
              >
                <option value="padrao">Padrão</option>
                <option value="calorias">Menos calorias</option>
                <option value="proteina">Mais proteína</option>
                <option value="tempo">Mais rápida</option>
                <option value="custo">Mais barata</option>
              </select>
            </label>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{filtered.length} receita(s) encontrada(s)</p>
        </div>

        {/* Recipes */}
        <div className="mt-8 space-y-4">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="bg-card rounded-2xl shadow-soft overflow-hidden border border-border/50 hover:border-primary/20 transition-colors"
            >
              <div className="p-5">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                    aria-expanded={expanded === r.id}
                    aria-controls={`receita-detalhe-${r.id}`}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-display font-semibold text-foreground">
                        {r.nome}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{r.tempo}</span>
                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{r.custo}</span>
                        <span className="flex items-center gap-1"><Flame className="w-3 h-3" />{r.calorias}cal</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {r.tags.map((t) => (
                        <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                          {tagLabels[t]}
                        </span>
                      ))}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleFav(r)}
                    aria-pressed={isFavorite("receita", String(r.id))}
                    aria-label={isFavorite("receita", String(r.id)) ? `Remover ${r.nome} dos favoritos` : `Adicionar ${r.nome} aos favoritos`}
                    className="shrink-0 mt-0.5 p-1.5 rounded-lg text-muted-foreground hover:text-accent hover:bg-secondary/60 transition-colors"
                  >
                    <Heart className={`w-4 h-4 ${isFavorite("receita", String(r.id)) ? "fill-accent text-accent" : ""}`} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {expanded === r.id && (
                <div id={`receita-detalhe-${r.id}`} className="px-5 pb-5 border-t border-border pt-4 animate-fade-in">
                  <div className="grid grid-cols-4 gap-2 text-center mb-4">
                    <div className="bg-secondary/50 rounded-lg p-2">
                      <p className="font-display font-bold text-foreground text-sm">{r.calorias}</p>
                      <p className="text-xs text-muted-foreground">kcal</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-2">
                      <p className="font-display font-bold text-primary text-sm">{r.proteina}g</p>
                      <p className="text-xs text-muted-foreground">prot</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-2">
                      <p className="font-display font-bold text-accent text-sm">{r.carb}g</p>
                      <p className="text-xs text-muted-foreground">carb</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-2">
                      <p className="font-display font-bold text-foreground text-sm">{r.gordura}g</p>
                      <p className="text-xs text-muted-foreground">gord</p>
                    </div>
                  </div>

                  <h4 className="font-display font-semibold text-foreground text-sm mb-2">Ingredientes:</h4>
                  <ul className="text-sm text-muted-foreground mb-4 space-y-1">
                    {r.ingredientes.map((ing, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {ing}
                      </li>
                    ))}
                  </ul>

                  <h4 className="font-display font-semibold text-foreground text-sm mb-2">Preparo:</h4>
                  <p className="text-sm text-muted-foreground">{r.preparo}</p>
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhuma receita encontrada. Tente outro filtro.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Receitas;
