import { Link } from "react-router-dom";
import { Heart, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { useGlobalFavorites, categoryLabels, FavCategory } from "@/hooks/useGlobalFavorites";
import { useFavorites } from "@/hooks/useNutrition";
import EmptyState from "@/components/ds/EmptyState";
import ConfirmDialog from "@/components/ds/ConfirmDialog";
import { ListSkeleton } from "@/components/ds/Skeletons";

const order: FavCategory[] = ["receita", "alimento", "artigo", "ia", "plano"];

const Favoritos = () => {
  const { items, removeFavorite, loading: globalLoading } = useGlobalFavorites();
  const { data: foodFavs = [], isLoading: foodLoading } = useFavorites();
  const isLoading = foodLoading || globalLoading;

  const empty = items.length === 0 && foodFavs.length === 0;

  return (
    <div className="min-h-dvh bg-background pt-20 pb-10 md:pb-16">
      <div className="container mx-auto max-w-3xl">
        <header className="text-center mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Meus <span className="text-primary">Favoritos</span>
          </h1>
          <p className="mt-3 text-muted-foreground text-sm">
            Tudo que você salvou na plataforma, organizado por categoria.
          </p>
        </header>

        {isLoading ? (
          <ListSkeleton items={3} />
        ) : empty ? (
          <EmptyState
            icon={Heart}
            title="Você ainda não salvou nada"
            description="Toque no coração em receitas, alimentos, guias ou respostas da IA para encontrá-los aqui depois."
            actionLabel="Explorar receitas"
            actionTo="/receitas"
          />
        ) : (
          <div className="space-y-6">
            {foodFavs.length > 0 && (
              <section>
                <h2 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-accent" /> Alimentos salvos
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {foodFavs.map((f) => (
                    <div key={f.id} className="bg-card rounded-2xl border border-border/50 shadow-soft p-4 transition-all hover:border-primary/30">
                      <p className="font-display font-semibold text-sm text-foreground">
                        {f.emoji ? `${f.emoji} ` : ""}{f.food_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Number(f.portion_g)}g · {Math.round(Number(f.calories))} kcal · {Math.round(Number(f.protein))}g prot
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {order.map((cat) => {
              const list = items.filter((i) => i.category === cat);
              if (!list.length) return null;
              return (
                <section key={cat}>
                  <h2 className="font-display font-semibold text-foreground mb-3">{categoryLabels[cat]}</h2>
                  <div className="space-y-3">
                    {list.map((f) => (
                      <div
                        key={`${f.category}-${f.id}`}
                        className="bg-card rounded-2xl border border-border/50 shadow-soft p-4 flex items-start justify-between gap-3 transition-all hover:border-primary/30"
                      >
                        <div className="min-w-0">
                          <p className="font-display font-semibold text-sm text-foreground">{f.title}</p>
                          {f.subtitle && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{f.subtitle}</p>}
                          {f.to && (
                            <Link to={f.to} className="text-xs font-medium text-primary hover:underline mt-1.5 inline-block">
                              Abrir
                            </Link>
                          )}
                        </div>
                        <ConfirmDialog
                          title="Remover dos favoritos?"
                          description={`"${f.title}" sairá da sua lista de favoritos.`}
                          confirmLabel="Remover"
                          onConfirm={() => {
                            removeFavorite(f.category, f.id).then((removed) => {
                              if (removed) toast.success("Removido dos favoritos");
                              else toast.error("Não foi possível remover. Tente novamente.");
                            });
                          }}
                          trigger={
                            <button
                              aria-label="Remover dos favoritos"
                              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          }
                        />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favoritos;