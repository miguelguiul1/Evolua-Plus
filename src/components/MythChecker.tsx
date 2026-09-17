import { useState } from "react";
import { Send, Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

type Result = {
  veredicto: string;
  explicacao: string;
  fonte: string;
};

const MythChecker = () => {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    if (!question.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("myth-checker", {
        body: { question: question.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data);
    } catch (err: unknown) {
      const baseMessage = err instanceof Error ? err.message : undefined;
      let msg = baseMessage || "Erro ao verificar. Tente novamente.";
      if (err instanceof FunctionsHttpError) {
        try {
          const body = await err.context.json();
          if (body?.error) msg = body.error;
          else if (body?.message) msg = body.message;
        } catch {
          /* corpo ilegível — mantém a mensagem padrão */
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    check();
  };

  const getIcon = (veredicto: string) => {
    if (veredicto === "VERDADE") return <CheckCircle className="w-6 h-6 text-primary" />;
    if (veredicto === "MITO") return <XCircle className="w-6 h-6 text-destructive" />;
    return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
  };

  const getBadgeClass = (veredicto: string) => {
    if (veredicto === "VERDADE") return "bg-primary/10 text-primary";
    if (veredicto === "MITO") return "bg-destructive/10 text-destructive";
    return "bg-yellow-500/10 text-yellow-600";
  };

  return (
    <div className="bg-card rounded-xl shadow-soft border border-border/50 p-5 mb-6">
      <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
        🤔 Pergunte à IA: é mito ou verdade?
      </h3>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ex: Comer fruta à noite engorda?"
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          maxLength={200}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>

      {error && (
        <div role="alert" className="mt-3 rounded-lg bg-destructive/10 border border-destructive/30 p-3 flex items-center justify-between gap-2">
          <p className="text-sm text-destructive">{error}</p>
          <button
            type="button"
            onClick={check}
            className="shrink-0 text-xs font-medium text-destructive underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {result && (
        <div role="status" aria-live="polite" className="mt-4 p-4 rounded-lg bg-muted/50 animate-fade-in space-y-2">
          <div className="flex items-center gap-2">
            {getIcon(result.veredicto)}
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getBadgeClass(result.veredicto)}`}>
              {result.veredicto}
            </span>
          </div>
          <p className="text-sm text-foreground">{result.explicacao}</p>
          <p className="text-xs text-muted-foreground">📚 Fonte: {result.fonte}</p>
        </div>
      )}
    </div>
  );
};

export default MythChecker;
