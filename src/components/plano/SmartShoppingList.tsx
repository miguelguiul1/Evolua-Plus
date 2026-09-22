import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Item = { id: string; name: string; category: string; done: boolean };

const CATEGORIES = [
  { id: "proteinas", label: "Proteínas", emoji: "🍗" },
  { id: "carboidratos", label: "Carboidratos", emoji: "🍚" },
  { id: "frutas", label: "Frutas", emoji: "🍎" },
  { id: "verduras", label: "Verduras e legumes", emoji: "🥦" },
  { id: "laticinios", label: "Laticínios", emoji: "🧀" },
  { id: "bebidas", label: "Bebidas", emoji: "🥤" },
  { id: "temperos", label: "Temperos e outros", emoji: "🧂" },
] as const;

const RULES: [string, string[]][] = [
  ["proteinas", ["frango", "carne", "boi", "peixe", "atum", "ovo", "ovos", "presunto", "linguiça", "calabresa", "whey", "proteína", "lentilha", "feijão", "grão", "sardinha", "peito", "patinho"]],
  ["carboidratos", ["arroz", "macarrão", "pão", "tapioca", "aveia", "batata", "cuscuz", "farinha", "polvilho", "granola", "milho", "massa", "tortilha", "torrada", "biscoito"]],
  ["frutas", ["banana", "maçã", "mamão", "laranja", "abacate", "morango", "uva", "manga", "limão", "melancia", "açaí", "fruta", "passa", "damasco", "abacaxi"]],
  ["verduras", ["alface", "tomate", "cenoura", "abobrinha", "couve", "brócolis", "cebola", "pepino", "abóbora", "espinafre", "beterraba", "repolho", "legume", "verdura", "salada", "chuchu"]],
  ["laticinios", ["leite", "queijo", "iogurte", "requeijão", "manteiga", "creme de leite", "ricota", "mussarela"]],
  ["bebidas", ["água", "suco", "café", "chá", "refrigerante", "bebida"]],
];

const categorize = (name: string) => {
  const n = name.toLowerCase();
  for (const [cat, words] of RULES) if (words.some((w) => n.includes(w))) return cat;
  return "temperos";
};

const slug = (s: string) => s.toLowerCase().replace(/\s+/g, "-").slice(0, 40);

type Props = { source: string[]; onRegenerate?: () => void; regenerating?: boolean };

const SmartShoppingList = ({ source, onRegenerate, regenerating }: Props) => {
  const key = useMemo(() => `evolua:lista:${slug(source.slice(0, 3).join("|"))}`, [source]);
  const [items, setItems] = useState<Item[]>([]);
  const [novo, setNovo] = useState("");

  useEffect(() => {
    let saved: Item[] = [];
    try { saved = JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { saved = []; }
    const base = source.map((name) => ({
      id: slug(name), name, category: categorize(name),
      done: saved.find((s) => s.id === slug(name))?.done ?? false,
    }));
    const extras = saved.filter((s) => !base.some((b) => b.id === s.id));
    setItems([...base, ...extras]);
  }, [key, source]);

  const persist = (next: Item[]) => {
    setItems(next);
    localStorage.setItem(key, JSON.stringify(next));
  };

  const toggle = (id: string) => persist(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  const remove = (id: string) => persist(items.filter((i) => i.id !== id));
  const add = () => {
    const name = novo.trim();
    if (!name) return;
    const id = `${slug(name)}-${Date.now().toString(36)}`;
    persist([...items, { id, name, category: categorize(name), done: false }]);
    setNovo("");
  };

  const done = items.filter((i) => i.done).length;

  return (
    <div className="bg-card rounded-2xl shadow-soft border border-border/50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" /> Lista de compras
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{done}/{items.length} comprados</span>
          {onRegenerate && (
            <Button variant="outline" size="sm" onClick={onRegenerate} disabled={regenerating} className="gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} /> Gerar novamente
            </Button>
          )}
        </div>
      </div>

      <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-5">
        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} />
      </div>

      <div className="space-y-5">
        {CATEGORIES.map((c) => {
          const list = items.filter((i) => i.category === c.id);
          if (!list.length) return null;
          return (
            <div key={c.id}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {c.emoji} {c.label}
              </p>
              <div className="grid sm:grid-cols-2 gap-1.5">
                {list.map((i) => (
                  <div key={i.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary/50 group">
                    <input
                      type="checkbox"
                      checked={i.done}
                      onChange={() => toggle(i.id)}
                      aria-label={`Marcar ${i.name} como comprado`}
                      className="rounded border-border accent-[hsl(var(--primary))]"
                    />
                    <span className={`text-sm flex-1 ${i.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{i.name}</span>
                    <button
                      onClick={() => remove(i.id)}
                      aria-label={`Remover ${i.name}`}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 mt-5">
        <Input
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Adicionar item..."
        />
        <Button onClick={add} size="icon" aria-label="Adicionar item"><Plus className="w-4 h-4" /></Button>
      </div>
    </div>
  );
};

export default SmartShoppingList;