import { useState } from "react";
import { BookOpen, FlaskConical, Tag, Scale, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import MotivationalQuote from "@/components/MotivationalQuote";
import MythChecker from "@/components/MythChecker";

type Mito = {
  pergunta: string;
  resposta: string;
  verdade: boolean;
  fonte: string;
};

const mitos: Mito[] = [
  {
    pergunta: "Carboidrato engorda?",
    resposta: "Não diretamente. O excesso calórico engorda, independente da fonte. Carboidratos são a principal fonte de energia do corpo. O importante é a qualidade: prefira integrais e evite ultraprocessados.",
    verdade: false,
    fonte: "Harvard T.H. Chan School of Public Health",
  },
  {
    pergunta: "Comer à noite faz engordar?",
    resposta: "O que determina ganho de peso é o total calórico diário, não o horário. Porém, comer muito antes de dormir pode atrapalhar a digestão e o sono.",
    verdade: false,
    fonte: "Organização Mundial da Saúde",
  },
  {
    pergunta: "Ovo aumenta o colesterol?",
    resposta: "Estudos recentes mostram que o consumo moderado de ovos (1-3 por dia) não aumenta significativamente o colesterol na maioria das pessoas. O ovo é uma excelente fonte de proteína e nutrientes.",
    verdade: false,
    fonte: "Harvard Medical School",
  },
  {
    pergunta: "Proteína é só para quem treina?",
    resposta: "Todos precisam de proteína para manter músculos, ossos, pele e sistema imunológico. A quantidade recomendada é de 0.8 a 1.2g por kg para sedentários.",
    verdade: false,
    fonte: "Ministério da Saúde",
  },
  {
    pergunta: "Beber água ajuda a emagrecer?",
    resposta: "Sim! A água ajuda no metabolismo, reduz a fome e melhora a disposição. Estudos mostram que beber 500ml de água antes das refeições pode reduzir a ingestão calórica.",
    verdade: true,
    fonte: "Journal of Clinical Endocrinology & Metabolism",
  },
  {
    pergunta: "Gordura é sempre ruim?",
    resposta: "Não. Gorduras insaturadas (azeite, castanhas, abacate) são essenciais para hormônios, absorção de vitaminas e saúde cerebral. Evite gorduras trans e limite saturadas.",
    verdade: false,
    fonte: "American Heart Association",
  },
  {
    pergunta: "Jejum intermitente é para todos?",
    resposta: "Não necessariamente. O jejum pode funcionar para algumas pessoas, mas não é superior a outras dietas com o mesmo déficit calórico. Grávidas, diabéticos e adolescentes devem evitar.",
    verdade: false,
    fonte: "New England Journal of Medicine",
  },
];

const macroGuide = [
  {
    nome: "Proteínas",
    icon: "💪",
    funcao: "Construção e reparo muscular, produção de enzimas e hormônios",
    fontes: "Carnes, ovos, laticínios, feijão, lentilha, tofu",
    quantidade: "1.2 a 2.0g por kg de peso",
    dica: "Distribua ao longo do dia em todas as refeições",
  },
  {
    nome: "Carboidratos",
    icon: "⚡",
    funcao: "Principal fonte de energia para o corpo e cérebro",
    fontes: "Arroz, pão, batata, aveia, frutas, legumes",
    quantidade: "45-65% das calorias diárias",
    dica: "Prefira integrais e evite refinados em excesso",
  },
  {
    nome: "Gorduras",
    icon: "🥑",
    funcao: "Produção hormonal, absorção de vitaminas, energia de reserva",
    fontes: "Azeite, castanhas, abacate, peixes gordos, sementes",
    quantidade: "20-35% das calorias diárias",
    dica: "Priorize gorduras mono e poli-insaturadas",
  },
  {
    nome: "Fibras",
    icon: "🌾",
    funcao: "Saúde intestinal, controle de glicose e colesterol, saciedade",
    fontes: "Vegetais, frutas com casca, aveia, feijão, sementes",
    quantidade: "25-30g por dia",
    dica: "Aumente gradualmente e beba bastante água",
  },
];

const labelTips = [
  { titulo: "Porção vs Embalagem", desc: "A tabela nutricional mostra valores POR PORÇÃO, não da embalagem toda. Sempre verifique quantas porções a embalagem contém." },
  { titulo: "Lista de ingredientes", desc: "Os ingredientes são listados do maior para o menor. Se açúcar ou gordura estão no início, o produto tem muito desses itens." },
  { titulo: "% Valor Diário", desc: "Abaixo de 5% é considerado baixo, acima de 15% é alto. Use isso para avaliar nutrientes." },
  { titulo: "Sódio escondido", desc: "Muitos alimentos 'saudáveis' têm excesso de sódio. Limite: até 2.300mg por dia (1 colher de chá de sal)." },
  { titulo: "Açúcar adicionado", desc: "Diferencie açúcar natural (frutas) de adicionado. A OMS recomenda no máximo 25g de açúcar adicionado por dia." },
];

const Educacao = () => {
  const [expandedMito, setExpandedMito] = useState<number | null>(null);
  const [tab, setTab] = useState<"mitos" | "macros" | "rotulos" | "estrategias">("mitos");

  return (
    <div className="min-h-dvh bg-background pt-20 pb-10 md:pb-16">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Educação <span className="text-primary">Alimentar</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            Conteúdo real, baseado em ciência, para você comer melhor
          </p>
        </div>

        <MotivationalQuote />

        {/* Tabs */}
        <div className="mt-8 flex flex-wrap gap-2">
          {[
            { id: "mitos" as const, label: "Mitos & Verdades", icon: FlaskConical },
            { id: "macros" as const, label: "Macronutrientes", icon: Scale },
            { id: "rotulos" as const, label: "Leitura de Rótulos", icon: Tag },
            { id: "estrategias" as const, label: "Estratégias", icon: BookOpen },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-pressed={tab === t.id}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === t.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Myths */}
        {tab === "mitos" && (
          <div className="mt-8 space-y-3">
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">
              🔬 Mitos e Verdades da Nutrição
            </h2>
            <MythChecker />
            {mitos.map((m, i) => (
              <div key={i} className="bg-card rounded-xl shadow-soft border border-border/50 overflow-hidden">
                <button
                  onClick={() => setExpandedMito(expandedMito === i ? null : i)}
                  aria-expanded={expandedMito === i}
                  aria-controls={`mito-resposta-${i}`}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      m.verdade ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                    }`}>
                      {m.verdade ? "VERDADE" : "MITO"}
                    </span>
                    <span className="font-display font-semibold text-foreground text-sm">{m.pergunta}</span>
                  </div>
                  {expandedMito === i ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {expandedMito === i && (
                  <div id={`mito-resposta-${i}`} className="px-4 pb-4 animate-fade-in">
                    <p className="text-sm text-muted-foreground mb-3">{m.resposta}</p>
                    <p className="text-xs text-primary flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Fonte: {m.fonte}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Macros */}
        {tab === "macros" && (
          <div className="mt-8 space-y-4">
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">
              📊 Guia de Macronutrientes
            </h2>
            {macroGuide.map((m) => (
              <div key={m.nome} className="bg-card rounded-xl shadow-soft p-5 border border-border/50">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{m.icon}</span>
                  <h3 className="font-display font-semibold text-foreground text-lg">{m.nome}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground"><strong className="text-foreground">Função:</strong> {m.funcao}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground"><strong className="text-foreground">Fontes:</strong> {m.fontes}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground"><strong className="text-foreground">Quanto:</strong> {m.quantidade}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground"><strong className="text-foreground">Dica:</strong> {m.dica}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Labels */}
        {tab === "rotulos" && (
          <div className="mt-8 space-y-4">
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">
              🏷️ Como Ler Rótulos de Alimentos
            </h2>
            {labelTips.map((tip, i) => (
              <div key={i} className="bg-card rounded-xl shadow-soft p-5 border border-border/50">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-display font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-display font-semibold text-foreground">{tip.titulo}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{tip.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Strategies */}
        {tab === "estrategias" && (
          <div className="mt-8 space-y-6">
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">
              📋 Estratégias para Comer Melhor
            </h2>

            {[
              {
                title: "Monte seu prato ideal",
                items: [
                  "½ do prato: vegetais e salada",
                  "¼ do prato: proteína (carne, ovo, feijão)",
                  "¼ do prato: carboidrato (arroz, batata, mandioca)",
                  "Adicione 1 fonte de gordura boa (azeite, castanhas)",
                ],
              },
              {
                title: "Compras inteligentes",
                items: [
                  "Faça lista antes de ir ao mercado",
                  "Compre em feiras para economizar em frutas e verduras",
                  "Prefira alimentos in natura a industrializados",
                  "Congele porções prontas para a semana",
                ],
              },
              {
                title: "Hábitos que transformam",
                items: [
                  "Beba pelo menos 2L de água por dia",
                  "Coma devagar e mastigue bem",
                  "Não pule o café da manhã",
                  "Planeje suas refeições no domingo",
                  "Mantenha snacks saudáveis por perto",
                ],
              },
              {
                title: "Meal prep econômico",
                items: [
                  "Cozinhe arroz e feijão no domingo para a semana",
                  "Prepare legumes cortados no pote",
                  "Cozinhe frango em quantidade e congele",
                  "Use temperos naturais: alho, cebola, ervas",
                ],
              },
            ].map((section) => (
              <div key={section.title} className="bg-card rounded-xl shadow-soft p-5 border border-border/50">
                <h3 className="font-display font-semibold text-foreground mb-3">{section.title}</h3>
                <ul className="space-y-2">
                  {section.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary mt-0.5">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Educacao;
