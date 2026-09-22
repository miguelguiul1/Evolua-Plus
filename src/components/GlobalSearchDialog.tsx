import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { receitas } from "@/data/receitas";
import { useGlobalFavorites, categoryLabels } from "@/hooks/useGlobalFavorites";
import { useFavorites, useFoodLogRange, todayISO, toISODate } from "@/hooks/useNutrition";
import { useAuth } from "@/contexts/useAuth";

const pages = [
  { label: "Painel", to: "/dashboard" },
  { label: "Diário alimentar", to: "/diario" },
  { label: "Scanner de alimentos", to: "/scanner" },
  { label: "Plano semanal", to: "/plano-semanal" },
  { label: "Insights", to: "/insights" },
  { label: "Evolução corporal", to: "/evolucao" },
  { label: "Assistente de IA", to: "/assistente" },
  { label: "Receitas", to: "/receitas" },
  { label: "Biblioteca de alimentos", to: "/biblioteca" },
  { label: "Guias e educação", to: "/guias" },
  { label: "Histórico", to: "/historico" },
  { label: "Favoritos", to: "/favoritos" },
  { label: "Configurações", to: "/configuracoes" },
  { label: "Meu perfil", to: "/preferencias" },
];

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
};

/** Diálogo da pesquisa global, carregado sob demanda (cmdk + dados). */
const GlobalSearchDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items: favs, loading: favsLoading } = useGlobalFavorites();
  const { data: foodFavs = [], isFetching: foodFavsFetching } = useFavorites();
  const { data: recent = [], isFetching: recentFetching } = useFoodLogRange(daysAgo(30), todayISO());

  const diaryNames = useMemo(
    () => [...new Set(recent.map((r) => r.food_name))].slice(0, 20),
    [recent]
  );

  const go = (to: string) => {
    onOpenChange(false);
    navigate(to);
  };

  const searching = (isFetching: boolean) =>
    isFetching && (
      <div className="px-2 py-1.5 text-xs text-muted-foreground animate-pulse" aria-live="polite">
        Buscando…
      </div>
    );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar alimentos, receitas, páginas, favoritos…" />
      <CommandList>
        <CommandEmpty>Nada encontrado. Tente outro termo.</CommandEmpty>

        <CommandGroup heading="Páginas">
          {pages.map((p) => (
            <CommandItem key={p.to} value={`pagina ${p.label}`} onSelect={() => go(p.to)}>
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Receitas">
          {receitas.map((r) => (
            <CommandItem
              key={r.id}
              value={`receita ${r.nome} ${r.ingredientes.join(" ")}`}
              onSelect={() => go("/receitas")}
            >
              {r.nome}
              <span className="ml-auto text-xs text-muted-foreground">{r.calorias} kcal</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {user && (foodFavsFetching || foodFavs.length > 0) && (
          <CommandGroup heading="Alimentos favoritos">
            {searching(foodFavsFetching)}
            {foodFavs.map((f) => (
              <CommandItem key={f.id} value={`alimento ${f.food_name}`} onSelect={() => go("/diario")}>
                {f.emoji ? `${f.emoji} ` : ""}{f.food_name}
                <span className="ml-auto text-xs text-muted-foreground">{Math.round(Number(f.calories))} kcal</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {user && (recentFetching || diaryNames.length > 0) && (
          <CommandGroup heading="Do seu diário (30 dias)">
            {searching(recentFetching)}
            {diaryNames.map((n) => (
              <CommandItem key={n} value={`diario ${n}`} onSelect={() => go("/diario")}>
                {n}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {(favsLoading || favs.length > 0) && (
          <CommandGroup heading="Favoritos">
            {searching(favsLoading)}
            {favs.map((f) => (
              <CommandItem
                key={`${f.category}-${f.id}`}
                value={`favorito ${f.title}`}
                onSelect={() => go(f.to ?? "/favoritos")}
              >
                {f.title}
                <span className="ml-auto text-xs text-muted-foreground">{categoryLabels[f.category]}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default GlobalSearchDialog;