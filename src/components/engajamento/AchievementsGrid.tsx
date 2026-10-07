import { Lock } from "lucide-react";
import { Achievement } from "@/hooks/useEngagement";

const AchievementsGrid = ({ items }: { items: Achievement[] }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    {items.map((a) => (
      <div
        key={a.id}
        className={`rounded-2xl border p-4 transition-all ${
          a.unlocked
            ? "bg-card border-primary/30 shadow-soft animate-scale-in"
            : "bg-secondary/40 border-border/50"
        }`}
      >
        <div className="flex items-start gap-3">
          <span className={`text-2xl ${a.unlocked ? "" : "grayscale opacity-50"}`}>{a.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="font-display font-semibold text-sm text-foreground flex items-center gap-1.5">
              {a.title}
              {!a.unlocked && <Lock className="w-3 h-3 text-muted-foreground" />}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
            {!a.unlocked && (
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden mt-2">
                <div className="h-full bg-primary/60 rounded-full transition-all duration-500" style={{ width: `${Math.round(a.progress * 100)}%` }} />
              </div>
            )}
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default AchievementsGrid;