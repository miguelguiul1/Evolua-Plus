import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type FavCategory = "receita" | "alimento" | "artigo" | "ia" | "plano";

export type FavItem = {
  id: string;
  category: FavCategory;
  title: string;
  subtitle?: string;
  to?: string;
  createdAt: string;
};

export type ToggleFavoriteResult = { ok: boolean; added: boolean };

export const categoryLabels: Record<FavCategory, string> = {
  receita: "Receitas",
  alimento: "Alimentos",
  artigo: "Artigos e guias",
  ia: "Respostas da IA",
  plano: "Planos alimentares",
};

/**
 * Favoritos globais persistidos no Supabase.
 * Interface mantida igual para compatibilidade com componentes existentes.
 */
export const useGlobalFavorites = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<FavItem[]>([]);
  const [loading, setLoading] = useState(true);
  const itemsRef = useRef<FavItem[]>([]);

  // Mantém o ref sincronizado imediatamente com cada atualização de estado,
  // evitando toggles concorrentes lerem a lista desatualizada.
  const commitItems = useCallback((updater: (prev: FavItem[]) => FavItem[]) => {
    setItems((prev) => {
      const next = updater(prev);
      itemsRef.current = next;
      return next;
    });
  }, []);

  // Carrega favoritos do Supabase ao montar ou ao mudar o usuário.
  useEffect(() => {
    if (!user) {
      itemsRef.current = [];
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("global_favorites")
      .select("id, category, item_id, title, subtitle, route, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Erro ao carregar favoritos:", error.message);
          commitItems(() => []);
        } else {
          commitItems(() =>
            (data ?? []).map((r) => ({
              id: r.item_id,
              category: r.category as FavCategory,
              title: r.title,
              subtitle: r.subtitle ?? undefined,
              to: r.route ?? undefined,
              createdAt: r.created_at,
            }))
          );
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user, commitItems]);

  const isFavorite = useCallback(
    (category: FavCategory, id: string) => items.some((i) => i.category === category && i.id === id),
    [items]
  );

  const toggleFavorite = useCallback(
    async (item: Omit<FavItem, "createdAt">): Promise<ToggleFavoriteResult> => {
      if (!user) return { ok: false, added: false };
      const exists = itemsRef.current.some((i) => i.category === item.category && i.id === item.id);

      if (exists) {
        const { error } = await supabase
          .from("global_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("category", item.category)
          .eq("item_id", item.id);
        if (error) {
          console.error("Erro ao remover favorito:", error.message);
          return { ok: false, added: true };
        }
        commitItems((prev) => prev.filter((i) => !(i.category === item.category && i.id === item.id)));
        return { ok: true, added: false };
      }

      const { error } = await supabase.from("global_favorites").insert({
        user_id: user.id,
        category: item.category,
        item_id: item.id,
        title: item.title,
        subtitle: item.subtitle ?? null,
        route: item.to ?? null,
      });
      if (error) {
        console.error("Erro ao adicionar favorito:", error.message);
        return { ok: false, added: false };
      }
      const now = new Date().toISOString();
      commitItems((prev) => [{ ...item, createdAt: now }, ...prev]);
      return { ok: true, added: true };
    },
    [user, commitItems]
  );

  const removeFavorite = useCallback(
    async (category: FavCategory, id: string): Promise<boolean> => {
      if (!user) return false;
      const { error } = await supabase
        .from("global_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("category", category)
        .eq("item_id", id);
      if (error) {
        console.error("Erro ao remover favorito:", error.message);
        return false;
      }
      commitItems((prev) => prev.filter((i) => !(i.category === category && i.id === id)));
      return true;
    },
    [user, commitItems]
  );

  return { items, isFavorite, toggleFavorite, removeFavorite, loading };
};