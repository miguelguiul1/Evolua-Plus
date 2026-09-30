import { useId, useMemo, useState } from "react";
import { Info, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FOOD_CATALOG, canonicalKey, describeCategory, parseFreeText } from "@/lib/foodPreferences";
import { MAX_DISLIKED, hasDisliked, mergeDisliked, removeDisliked } from "@/lib/dislikedFoods";

type Props = {
  /** Lista completa (grade + texto livre) — a mesma que vai para disliked_foods. */
  disliked: string[];
  onChange: (next: string[]) => void;
  /** Rótulos da grade, para "peixes" digitado virar o item "Peixe" da grade. */
  gridFoods: string[];
  disabled?: boolean;
};

const MAX_SUGGESTIONS = 6;

/**
 * "Outros alimentos que você não gosta": texto livre com autocomplete, chips removíveis,
 * aviso para texto que não parece alimento e explicação das categorias amplas.
 */
const DislikedFoodsEditor = ({ disliked, onChange, gridFoods, disabled }: Props) => {
  const [text, setText] = useState("");
  const [rejected, setRejected] = useState<string[]>([]);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [adjustKeep, setAdjustKeep] = useState<string[]>([]);
  const inputId = useId();
  const listId = useId();

  const gridSet = useMemo(() => new Set(gridFoods), [gridFoods]);
  const freeItems = disliked.filter((d) => !gridSet.has(d));
  const categories = disliked.map((d) => ({ item: d, cat: describeCategory(d) })).filter((c) => c.cat);
  const full = disliked.length >= MAX_DISLIKED;

  const suggestions = useMemo(() => {
    const q = canonicalKey(text.split(/[,;\n]/).pop() ?? "");
    if (q.length < 2) return [];
    return FOOD_CATALOG.filter((f) => {
      const k = canonicalKey(f);
      return (k.startsWith(q) || k.includes(` ${q}`)) && !hasDisliked(disliked, f);
    }).slice(0, MAX_SUGGESTIONS);
  }, [text, disliked]);

  const add = (items: string[]) => {
    if (!items.length) return;
    onChange(mergeDisliked(disliked, items, gridFoods));
  };

  const submit = () => {
    const { foods, rejected: bad } = parseFreeText(text);
    add(foods);
    setRejected(bad);
    setText("");
  };

  const pickSuggestion = (food: string) => {
    // Mantém o que já foi digitado antes da última vírgula ("jiló, coen" + Coentro).
    const parts = text.split(/[,;\n]/);
    parts.pop();
    const { foods } = parseFreeText(parts.join(","));
    add([...foods, food]);
    setText("");
    setRejected([]);
  };

  const startAdjust = (item: string, members: string[]) => {
    setAdjusting(item);
    setAdjustKeep(members);
  };

  const applyAdjust = (item: string, members: string[]) => {
    // Tudo marcado = mantém a categoria inteira; senão troca a categoria pelos itens escolhidos.
    if (adjustKeep.length !== members.length) {
      const chosen = adjustKeep.map((m) => m.charAt(0).toLocaleUpperCase("pt-BR") + m.slice(1));
      onChange(mergeDisliked(removeDisliked(disliked, item), chosen, gridFoods));
    }
    setAdjusting(null);
  };

  return (
    <div className="mt-2" id="nao-gosto">
      <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        Outros alimentos que você não gosta
      </h3>
      <p className="text-sm text-muted-foreground mb-3">
        Não achou na lista acima? Escreva aqui — ex.: <em>fígado, jiló e coentro</em>. A IA nunca vai usar esses alimentos.
      </p>

      <div className="relative">
        <div className="flex gap-2">
          <label htmlFor={inputId} className="sr-only">Alimento que você não gosta</label>
          <input
            id={inputId}
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (rejected.length) setRejected([]);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            disabled={disabled || full}
            maxLength={300}
            role="combobox"
            aria-expanded={suggestions.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            placeholder={full ? `Limite de ${MAX_DISLIKED} alimentos atingido` : "Digite um ou mais alimentos"}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          />
          <Button type="button" variant="outline" onClick={submit} disabled={disabled || full || !text.trim()} className="gap-1 shrink-0">
            <Plus className="w-4 h-4" aria-hidden="true" /> Adicionar
          </Button>
        </div>
        {suggestions.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-popover shadow-soft overflow-hidden"
          >
            {suggestions.map((s) => (
              <li key={s} role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => pickSuggestion(s)}
                  className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-secondary"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {rejected.length > 0 && (
        <div role="status" className="mt-2 rounded-lg bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
          Hmm, não reconhecemos {rejected.map((r) => `“${r}”`).join(", ")} como alimento. Confira a grafia
          {rejected.some((r) => /\p{L}/u.test(r)) && (
            <>
              {" "}ou{" "}
              <button
                type="button"
                className="text-primary font-medium underline"
                onClick={() => {
                  add(rejected.filter((r) => /\p{L}/u.test(r)));
                  setRejected([]);
                }}
              >
                adicione assim mesmo
              </button>
            </>
          )}
          .
        </div>
      )}

      {freeItems.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {freeItems.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full text-sm font-medium bg-destructive/10 border-2 border-destructive text-destructive"
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(removeDisliked(disliked, item))}
                disabled={disabled}
                aria-label={`Remover ${item}`}
                className="p-0.5 rounded-full hover:bg-destructive/20"
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      {categories.map(({ item, cat }) => {
        const members = cat!.members;
        const preview = members.slice(0, 4).join(", ");
        const isAdjusting = adjusting === item;
        return (
          <div key={item} className="mt-3 rounded-xl border border-border bg-card p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="text-muted-foreground flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  <strong className="text-foreground">{item}:</strong> inclui {preview}
                  {members.length > 4 ? ` e mais ${members.length - 4}` : ""}.
                </span>
              </p>
              {!isAdjusting && (
                <Button type="button" variant="ghost" size="sm" onClick={() => startAdjust(item, members)} disabled={disabled}>
                  Ajustar
                </Button>
              )}
            </div>
            {isAdjusting && (
              <fieldset className="mt-3">
                <legend className="text-xs text-muted-foreground mb-2">
                  Desmarque o que você come normalmente:
                </legend>
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => {
                    const on = adjustKeep.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setAdjustKeep((k) => (on ? k.filter((x) => x !== m) : [...k, m]))}
                        className={`px-3 py-1 rounded-full text-xs font-medium border-2 transition-all ${
                          on
                            ? "bg-destructive/10 border-destructive text-destructive"
                            : "bg-secondary border-border text-secondary-foreground"
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button type="button" size="sm" onClick={() => applyAdjust(item, members)} disabled={!adjustKeep.length}>
                    Aplicar
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setAdjusting(null)}>
                    Cancelar
                  </Button>
                </div>
              </fieldset>
            )}
          </div>
        );
      })}

      {/* Lista completa: grade + texto livre, para revisar e remover a qualquer momento */}
      <div className="mt-6 rounded-xl border border-border p-4">
        <p className="text-sm font-medium text-foreground mb-2">
          Sua lista completa de alimentos que não gosta ({disliked.length})
        </p>
        {disliked.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum alimento marcado ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {disliked.map((item) => (
              <span key={item} className="inline-flex items-center gap-1 pl-3 pr-1 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                {item}
                <button
                  type="button"
                  onClick={() => onChange(removeDisliked(disliked, item))}
                  disabled={disabled}
                  aria-label={`Remover ${item} da lista`}
                  className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          Alterações valem para os próximos planos e trocas depois que você salvar.
        </p>
      </div>
    </div>
  );
};

export default DislikedFoodsEditor;
