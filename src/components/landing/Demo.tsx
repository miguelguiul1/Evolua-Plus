import { useState } from "react";
import { LayoutDashboard, Camera, ChefHat, Bot, Library, CalendarRange } from "lucide-react";
import DashboardMockup from "./DashboardMockup";

type Tab = { id: string; label: string; icon: React.ElementType; render: () => React.ReactNode };

const RecipesMock = () => (
  <div className="p-5 grid grid-cols-2 gap-3">
    {[
      { name: "Bowl de quinoa", kcal: 520, tag: "Almoço" },
      { name: "Overnight oats", kcal: 380, tag: "Café" },
      { name: "Wrap de frango", kcal: 460, tag: "Jantar" },
      { name: "Salada mediterrânea", kcal: 310, tag: "Almoço" },
    ].map((r) => (
      <div key={r.name} className="rounded-xl border border-border/50 bg-background p-3">
        <div className="h-14 rounded-lg bg-gradient-to-br from-primary/20 to-[hsl(var(--primary-glow))]/10 mb-2" />
        <p className="text-[11px] text-muted-foreground">{r.tag}</p>
        <p className="text-xs font-display font-bold text-foreground leading-tight">{r.name}</p>
        <p className="text-[10px] text-primary font-semibold mt-1">{r.kcal} kcal</p>
      </div>
    ))}
  </div>
);

const ScannerMock = () => (
  <div className="p-5 space-y-3">
    <div className="relative h-32 rounded-xl bg-gradient-to-br from-primary/15 to-secondary flex items-center justify-center overflow-hidden">
      <Camera className="w-8 h-8 text-primary" />
      <div className="absolute inset-x-4 h-0.5 bg-primary/60 animate-pulse" style={{ top: "50%" }} />
    </div>
    <p className="text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-wider">Alimentos detectados</p>
    <div className="flex flex-wrap gap-1.5">
      {["Frango", "Brócolis", "Arroz integral", "Ovos", "Tomate", "Espinafre"].map((f) => (
        <span key={f} className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
          {f}
        </span>
      ))}
    </div>
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-2.5">
      <p className="text-[10px] font-display font-bold text-primary">3 receitas sugeridas</p>
    </div>
  </div>
);

const AIMock = () => (
  <div className="p-5 space-y-2.5">
    <div className="ml-auto max-w-[75%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground text-xs p-3">
      Quero uma refeição com 500 kcal e 40g de proteína
    </div>
    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-secondary text-foreground text-xs p-3 space-y-1.5">
      <p><strong>Sugestão:</strong> Frango grelhado + quinoa + brócolis</p>
      <p className="text-[10px] text-muted-foreground">≈ 495 kcal · 42g prot · 38g carb · 12g gord</p>
    </div>
    <div className="flex gap-1 items-center px-3">
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.2s" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.4s" }} />
    </div>
  </div>
);

const LibraryMock = () => (
  <div className="p-5 space-y-2">
    {[
      { t: "Ovos: mito ou verdade?", tag: "Mitos" },
      { t: "Ômega 3 e cognição", tag: "Ciência" },
      { t: "Fibras e saciedade", tag: "Guia" },
      { t: "Cafeína e performance", tag: "Ciência" },
    ].map((a) => (
      <div key={a.t} className="flex items-center justify-between rounded-xl border border-border/50 bg-background p-3">
        <div>
          <p className="text-xs font-display font-bold text-foreground">{a.t}</p>
          <p className="text-[10px] text-muted-foreground">Baseado em evidência</p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold">{a.tag}</span>
      </div>
    ))}
  </div>
);

const PlanMock = () => (
  <div className="p-5 space-y-2">
    {["Seg", "Ter", "Qua", "Qui", "Sex"].map((d, i) => (
      <div key={d} className="rounded-xl border border-border/50 bg-background p-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-display font-semibold text-primary">{d}</p>
          <p className="text-[10px] text-muted-foreground">{1800 + i * 40} kcal</p>
        </div>
        <div className="flex gap-1">
          {["Café", "Almoço", "Lanche", "Jantar"].map((m) => (
            <div key={m} className="flex-1 h-1.5 rounded-full bg-primary/40" />
          ))}
        </div>
      </div>
    ))}
  </div>
);

const tabs: Tab[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, render: () => <DashboardMockup className="border-0 shadow-none" /> },
  { id: "plano", label: "Plano semanal", icon: CalendarRange, render: () => <MockShell><PlanMock /></MockShell> },
  { id: "scanner", label: "Scanner", icon: Camera, render: () => <MockShell><ScannerMock /></MockShell> },
  { id: "receitas", label: "Receitas", icon: ChefHat, render: () => <MockShell><RecipesMock /></MockShell> },
  { id: "ia", label: "Assistente IA", icon: Bot, render: () => <MockShell><AIMock /></MockShell> },
  { id: "biblioteca", label: "Biblioteca", icon: Library, render: () => <MockShell><LibraryMock /></MockShell> },
];

const MockShell = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
    <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border/50 bg-background/60">
      <div className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
      <div className="w-2.5 h-2.5 rounded-full bg-[hsl(38_92%_55%)]" />
      <div className="w-2.5 h-2.5 rounded-full bg-primary/80" />
      <div className="ml-3 text-[10px] font-display text-muted-foreground">evoluaplus.app</div>
    </div>
    {children}
  </div>
);

const Demo = () => {
  const [active, setActive] = useState(tabs[0].id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <section id="demonstracao" className="py-24 bg-secondary/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-mesh pointer-events-none" aria-hidden />
      <div className="container mx-auto max-w-6xl relative">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-block mb-3 px-3 py-1 rounded-full bg-primary/10 text-primary font-display text-xs font-semibold tracking-wide uppercase">
            Demonstração
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-foreground">
            Veja o Evolua Plus <span className="text-gradient-primary">em ação</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Um app pensado para tornar a nutrição saudável simples, visual e realmente sustentável.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {tabs.map((t) => {
            const activeTab = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="relative max-w-2xl mx-auto">
          <div key={active} className="relative animate-fade-in shadow-premium rounded-2xl">
            {current.render()}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Demo;