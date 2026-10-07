import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  MacroProgressRing, AchievementBadge, EvolutionCard, NutritionCard,
  ScannerResultCard, AIMessageCard, GoalCard, HydrationCard, MealCard, DailyHabitCard,
} from "@/components/ds";
import { Flame, Info, Sparkles } from "lucide-react";

const scales = [
  { name: "primary", label: "Primary — Verde Evolução" },
  { name: "accent", label: "Accent — Dourado Conquista" },
  { name: "neutral", label: "Neutral — Sage" },
  { name: "success", label: "Success" },
  { name: "warning", label: "Warning" },
  { name: "info", label: "Info" },
  { name: "error", label: "Error" },
];
const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const radiusDemo: Record<string, string> = {
  xs: "rounded-xs", sm: "rounded-sm", md: "rounded-md", lg: "rounded-lg",
  xl: "rounded-xl", "2xl": "rounded-2xl", full: "rounded-full",
};
const shadowDemo: Record<string, string> = {
  xs: "shadow-xs", sm: "shadow-sm", md: "shadow-md", lg: "shadow-lg",
  xl: "shadow-xl", floating: "shadow-floating", dropdown: "shadow-dropdown", modal: "shadow-modal",
};
const durationDemo: Record<string, string> = {
  fast: "duration-fast", normal: "duration-normal", slow: "duration-slow", slower: "duration-slower",
};

const Section = ({ id, title, description, children }: {
  id: string; title: string; description?: string; children: React.ReactNode;
}) => (
  <section id={id} className="scroll-mt-28 py-12 border-t border-border first:border-t-0">
    <h2 className="type-h2 text-foreground">{title}</h2>
    {description && <p className="type-body text-muted-foreground mt-2 max-w-2xl">{description}</p>}
    <div className="mt-8">{children}</div>
  </section>
);

const DesignSystem = () => {
  const [habit, setHabit] = useState(false);

  return (
    <main className="min-h-dvh bg-background pt-24 pb-24">
      <div className="container mx-auto max-w-5xl">
        <header className="pb-8">
          <span className="type-label inline-flex items-center gap-2">
            <Sparkles className="size-3.5" aria-hidden="true" /> Fundamentos
          </span>
          <h1 className="type-display-lg text-foreground mt-3">Evolua Plus Design System</h1>
          <p className="type-body-lg text-muted-foreground mt-4 max-w-2xl">
            Base oficial de design da plataforma. Todo novo componente, tela ou funcionalidade
            deve utilizar exclusivamente os tokens e padrões descritos aqui.
          </p>
        </header>

        <Section
          id="cores"
          title="Cores e escalas"
          description="Cada cor possui 11 tonalidades (50 → 950) para estados, fundos, badges e gráficos. Nunca use valores literais como bg-white ou text-black."
        >
          <div className="space-y-6">
            {scales.map((s) => (
              <div key={s.name}>
                <p className="type-label mb-2">{s.label}</p>
                <div className="grid grid-cols-11 gap-1 overflow-hidden rounded-md">
                  {steps.map((step) => (
                    <div key={step} className="text-center">
                      <div
                        className="h-12 w-full rounded-xs border border-border/50"
                        style={{ backgroundColor: `hsl(var(--${s.name}-${step}))` }}
                      />
                      <span className="type-caption text-[10px]">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="tipografia"
          title="Tipografia"
          description="Display: Space Grotesk. Corpo: DM Sans. Use as classes utilitárias — nunca tamanhos arbitrários."
        >
          <div className="space-y-4">
            {[
              ["type-display-xl", "Display XL"],
              ["type-display-lg", "Display LG"],
              ["type-h1", "Heading 1"],
              ["type-h2", "Heading 2"],
              ["type-h3", "Heading 3"],
              ["type-h4", "Heading 4"],
              ["type-body-lg", "Body Large"],
              ["type-body", "Body"],
              ["type-body-sm", "Body Small"],
              ["type-caption", "Caption"],
              ["type-label", "Label"],
            ].map(([cls, label]) => (
              <div key={cls} className="flex flex-wrap items-baseline gap-4 border-b border-border pb-3">
                <code className="type-caption font-mono w-40 shrink-0">.{cls}</code>
                <span className={cls}>{label} — Evolua sempre</span>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="espacamento"
          title="Espaçamento e raio"
          description="Escala base de 4px. Raio: xs (chips), sm (inputs), md (botões), lg (cards), xl (painéis), 2xl (modais), full (pílulas e avatares)."
        >
          <div className="flex flex-wrap items-end gap-3">
            {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32].map((s) => (
              <div key={s} className="text-center">
                <div className="bg-primary-300 rounded-xs" style={{ width: s * 4, height: s * 4 }} />
                <span className="type-caption">{s * 4}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            {Object.keys(radiusDemo).map((r) => (
              <div key={r} className="text-center">
                <div className={`size-20 bg-surface border border-border ${radiusDemo[r]}`} />
                <span className="type-caption">{r}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="sombras"
          title="Sombras e elevação"
          description="xs/sm para cards em repouso, md/lg para hover, xl e floating para destaque, dropdown para menus e modal para diálogos."
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {Object.keys(shadowDemo).map((s) => (
              <div key={s} className={`h-24 rounded-lg bg-card border border-border flex items-center justify-center ${shadowDemo[s]}`}>
                <span className="type-caption">shadow-{s}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="motion"
          title="Motion"
          description="fast (150ms) para hover e cores, normal (250ms) para cards e tabs, slow (400ms) para gráficos e progresso, slower (650ms) para reveals. Curvas: ease-out padrão, ease-spring para interações táteis."
        >
          <div className="flex flex-wrap gap-4">
            {Object.keys(durationDemo).map((d) => (
              <div
                key={d}
                className={`ds-surface p-6 transition-transform ease-out hover:-translate-y-2 ${durationDemo[d]}`}
              >
                <span className="type-body-sm">duration-{d}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section id="componentes" title="Componentes base" description="Todos os primitivos shadcn já herdam os tokens do sistema.">
          <div className="space-y-8">
            <div className="flex flex-wrap gap-3">
              {(["default", "secondary", "outline", "ghost", "accent", "success", "destructive", "premium", "hero", "link"] as const).map((v) => (
                <Button key={v} variant={v}>{v}</Button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ds-input">Input</Label>
                <Input id="ds-input" placeholder="Digite aqui" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ds-select">Select</Label>
                <Select>
                  <SelectTrigger id="ds-select"><SelectValue placeholder="Escolha um objetivo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emagrecer">Emagrecer</SelectItem>
                    <SelectItem value="massa">Ganhar massa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox id="ds-check" /><Label htmlFor="ds-check">Checkbox</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="ds-switch" /><Label htmlFor="ds-switch">Switch</Label>
              </div>
              <Tooltip>
                <TooltipTrigger asChild><Button variant="outline">Tooltip</Button></TooltipTrigger>
                <TooltipContent>Dica contextual</TooltipContent>
              </Tooltip>
            </div>

            <Slider defaultValue={[60]} max={100} step={1} aria-label="Exemplo de slider" />

            <div className="flex flex-wrap gap-2">
              <Badge>Padrão</Badge>
              <Badge variant="secondary">Secundário</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Erro</Badge>
            </div>

            <Progress value={68} />
            <div className="space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>

            <Alert>
              <Info className="size-4" />
              <AlertTitle>Informação</AlertTitle>
              <AlertDescription>Alertas usam os tokens semânticos de estado.</AlertDescription>
            </Alert>

            <Tabs defaultValue="a">
              <TabsList>
                <TabsTrigger value="a">Visão geral</TabsTrigger>
                <TabsTrigger value="b">Detalhes</TabsTrigger>
              </TabsList>
              <TabsContent value="a" className="type-body-sm pt-4">Conteúdo da primeira aba.</TabsContent>
              <TabsContent value="b" className="type-body-sm pt-4">Conteúdo da segunda aba.</TabsContent>
            </Tabs>

            <Accordion type="single" collapsible>
              <AccordionItem value="1">
                <AccordionTrigger>Quando usar cada raio?</AccordionTrigger>
                <AccordionContent className="type-body-sm">
                  Cards usam lg, painéis e modais usam xl/2xl, chips e badges usam full.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </Section>

        <Section
          id="marca"
          title="Componentes da marca"
          description="Componentes exclusivos do Evolua Plus, disponíveis em @/components/ds."
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <EvolutionCard label="Peso atual" value={78.4} unit="kg" delta={-1.2} hint="Últimos 30 dias" />
            <GoalCard title="Calorias" current={1580} target={2100} unit=" kcal" />
            <NutritionCard title="Almoço" calories={620} protein={42} carbs={58} fat={18} />
            <HydrationCard consumedMl={1500} goalMl={2500} onAdd={() => {}} />
            <ScannerResultCard name="Iogurte natural integral" confidence={92} portion="170 g" calories={118} />
            <MealCard meal="Jantar" name="Salmão grelhado com legumes" calories={540} time="19:30" />
            <DailyHabitCard title="Beber água ao acordar" streak={12} done={habit} onToggle={() => setHabit((v) => !v)} />
            <AchievementBadge title="30 dias de constância" description="Registro diário completo" unlocked icon={Flame} />
            <div className="ds-surface p-5 flex justify-around">
              <MacroProgressRing value={72} max={100} label="Proteína" unit="g" />
              <MacroProgressRing value={45} max={100} label="Carbo" unit="g" tone="accent" />
            </div>
            <AIMessageCard>Seu consumo de proteína está 18% abaixo da meta desta semana.</AIMessageCard>
          </div>
        </Section>

        <Section
          id="graficos"
          title="Gráficos"
          description="Sempre nesta ordem: Chart 1 verde (métrica principal), Chart 2 dourado (meta/conquista), Chart 3 verde claro (comparativo), Chart 4 azul oceano (hidratação/dados), Chart 5 terracota (alerta suave)."
        >
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex-1 text-center">
                <div className="h-16 rounded-md" style={{ backgroundColor: `hsl(var(--chart-${i}))` }} />
                <span className="type-caption">chart-{i}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="praticas"
          title="Boas práticas"
          description="Regras obrigatórias para qualquer nova tela da plataforma."
        >
          <ul className="type-body space-y-3 text-muted-foreground list-disc pl-5">
            <li>Use apenas tokens semânticos (<code>bg-card</code>, <code>text-muted-foreground</code>) — nunca <code>bg-white</code> ou hex direto.</li>
            <li>Ícones Lucide: 16px em textos, 18–20px em cards, 24px em cabeçalhos; espessura 2 e <code>aria-hidden</code> quando decorativos.</li>
            <li>Botões só com ícone precisam de <code>aria-label</code> e alvo mínimo de 44×44 px.</li>
            <li>Contraste mínimo AA; foco visível é global e não deve ser removido.</li>
            <li>Mobile first: valide sempre em 360px antes de expandir para desktop.</li>
            <li>Animações discretas: nada acima de 650ms; respeite <code>prefers-reduced-motion</code>.</li>
            <li>Cards seguem <code>.ds-surface</code> ou <code>.ds-surface-interactive</code>.</li>
          </ul>
        </Section>
      </div>
    </main>
  );
};

export default DesignSystem;