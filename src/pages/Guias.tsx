import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, ChevronDown, Clock } from "lucide-react";

const guias = [
  {
    categoria: "Emagrecimento",
    titulo: "O guia real do déficit calórico",
    tempo: "5 min",
    conteudo: `Emagrecer é uma equação simples: comer menos do que se gasta. Mas simples não é fácil.

**1. Descubra seu gasto energético total (GET)**
Use nossa calculadora ou multiplique seu peso por 30-35 (sedentário/ativo). Retire 300-500 kcal desse valor.

**2. Priorize proteína**
Coma 1,6 a 2,2g de proteína por kg de peso. Isso preserva massa magra e aumenta saciedade.

**3. Volume alimentar importa**
Verduras, frutas e proteínas magras enchem o prato com poucas calorias. Prefira alimentos in natura.

**4. Consistência > perfeição**
Um dia livre não estraga a semana. Um mês perfeito seguido de abandono, sim.`,
  },
  {
    categoria: "Hipertrofia",
    titulo: "Ganhar massa magra sem virar bola",
    tempo: "6 min",
    conteudo: `Ganhar músculo exige superávit calórico controlado — não é vale-tudo.

**1. Superávit de 200-400 kcal**
Mais que isso vira gordura. O corpo só monta cerca de 200g de músculo por semana em condições ideais.

**2. Proteína: 1,8-2,2g/kg**
Distribua em 4-5 refeições ao longo do dia. Whey e frango são práticos, mas ovos, feijão e carnes funcionam igual.

**3. Treino de força é obrigatório**
Sem estímulo mecânico, o excedente calórico vira gordura. Progrida cargas semanalmente.

**4. Sono e recovery**
7-9h de sono. Músculo cresce fora da academia, não dentro.`,
  },
  {
    categoria: "Energia",
    titulo: "Por que você sente sono depois do almoço?",
    tempo: "4 min",
    conteudo: `Aquele apagão pós-almoço tem causa clara.

**1. Pico de insulina**
Refeições ricas em carbo simples (arroz branco + doce + refri) elevam glicose rapidamente e depois derrubam.

**2. Digestão pesada**
Frituras e porções gigantes desviam sangue para o estômago. Cérebro fica em standby.

**3. Solução prática**
Prato colorido, proteína em toda refeição, evite doces no almoço, hidrate. Uma caminhada de 10 min ajuda absurdamente.`,
  },
  {
    categoria: "Rotina",
    titulo: "Meal prep em 90 minutos por semana",
    tempo: "7 min",
    conteudo: `Preparar comida no domingo evita a decisão ruim de terça-feira à noite.

**Escolha 2 proteínas** (frango + carne moída, por exemplo)
**Escolha 2 carboidratos** (arroz integral + batata doce)
**Escolha 3 vegetais** (brócolis, cenoura, tomate)

Cozinhe tudo de uma vez, divida em potes de vidro. Combine diferente cada dia para não enjoar.

**Tempo total: ~90 minutos** — economiza 3-5h de decisões durante a semana.`,
  },
  {
    categoria: "Ciência",
    titulo: "Suplementos que realmente funcionam",
    tempo: "5 min",
    conteudo: `Nem tudo que a indústria vende tem evidência.

**Comprovados:**
- **Creatina** (3-5g/dia): força, massa magra e cognição.
- **Whey Protein**: praticidade para atingir meta de proteína.
- **Vitamina D**: só se houver deficiência (exame).
- **Ômega 3**: reduz inflamação, importante para quem não come peixe.

**Sem evidência forte:**
- Termogênicos milagrosos, "detox", BCAA se a dieta já tem proteína suficiente, colágeno para hipertrofia.

Suplemento **complementa** a comida. Nunca substitui.`,
  },
];

const Guias = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="min-h-dvh bg-background pt-20 pb-10 md:pb-16">
      <div className="container mx-auto max-w-3xl">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
            <BookOpen className="w-3 h-3" /> Guias práticos
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Aprenda o que funciona de verdade
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Artigos rápidos, baseados em ciência, sem enrolação.
          </p>
        </div>

        <div className="space-y-3">
          {guias.map((g, i) => (
            <Card key={i} className="border-border/60 overflow-hidden">
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                aria-expanded={openIdx === i}
                aria-controls={`guia-conteudo-${i}`}
                className="w-full text-left"
              >
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-primary">{g.categoria}</span>
                    <h3 className="font-display font-semibold text-lg mt-1">{g.titulo}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock className="w-3 h-3" /> {g.tempo}
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 transition-transform ${openIdx === i ? "rotate-180" : ""}`} />
                </CardContent>
              </button>
              {openIdx === i && (
                <div id={`guia-conteudo-${i}`} className="px-5 pb-5 border-t border-border pt-4">
                  <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                    {g.conteudo.split("**").map((chunk, idx) =>
                      idx % 2 === 1
                        ? <strong key={idx} className="text-primary font-semibold">{chunk}</strong>
                        : <span key={idx}>{chunk}</span>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Guias;