import { useState } from "react";
import { Search, Leaf, Heart, Brain, Bone, Eye, Shield } from "lucide-react";

type Alimento = {
  nome: string;
  categoria: string;
  calorias: number;
  beneficios: string[];
  vitaminas: string[];
  minerais: string[];
  funcao: string;
  quandoConsumir: string;
  indicadoPara: string;
  comprovacao: string;
};

const alimentos: Alimento[] = [
  {
    nome: "Ovo", categoria: "Proteína", calorias: 155,
    beneficios: ["Rico em proteína completa", "Fonte de colina para o cérebro", "Contém vitamina D"],
    vitaminas: ["B12", "D", "A", "B2"], minerais: ["Selênio", "Ferro", "Fósforo"],
    funcao: "Construção muscular, saúde cerebral, sistema imunológico",
    quandoConsumir: "Café da manhã ou pós-treino",
    indicadoPara: "Todos, especialmente quem treina",
    comprovacao: "Harvard T.H. Chan School of Public Health",
  },
  {
    nome: "Banana", categoria: "Fruta", calorias: 89,
    beneficios: ["Rica em potássio", "Energia rápida", "Melhora o humor"],
    vitaminas: ["B6", "C"], minerais: ["Potássio", "Magnésio", "Manganês"],
    funcao: "Energia muscular, regulação da pressão arterial, saúde digestiva",
    quandoConsumir: "Pré-treino ou entre refeições",
    indicadoPara: "Praticantes de atividade física, quem precisa de energia rápida",
    comprovacao: "National Institutes of Health (NIH)",
  },
  {
    nome: "Brócolis", categoria: "Vegetal", calorias: 34,
    beneficios: ["Rico em fibras", "Antioxidante poderoso", "Propriedades anticancerígenas"],
    vitaminas: ["C", "K", "A", "Folato"], minerais: ["Cálcio", "Ferro", "Potássio"],
    funcao: "Proteção celular, saúde óssea, fortalecimento imunológico",
    quandoConsumir: "Almoço e jantar",
    indicadoPara: "Todos, especialmente quem busca longevidade",
    comprovacao: "World Health Organization (OMS)",
  },
  {
    nome: "Aveia", categoria: "Cereal", calorias: 68,
    beneficios: ["Rica em beta-glucana", "Controla colesterol", "Saciedade prolongada"],
    vitaminas: ["B1", "B5"], minerais: ["Manganês", "Fósforo", "Magnésio", "Ferro"],
    funcao: "Saúde cardiovascular, controle de glicose, saúde intestinal",
    quandoConsumir: "Café da manhã ou lanches",
    indicadoPara: "Diabéticos, quem quer emagrecer, atletas",
    comprovacao: "American Heart Association",
  },
  {
    nome: "Salmão", categoria: "Proteína", calorias: 208,
    beneficios: ["Rico em ômega-3", "Anti-inflamatório", "Saúde cerebral"],
    vitaminas: ["D", "B12", "B6"], minerais: ["Selênio", "Fósforo", "Potássio"],
    funcao: "Proteção cardiovascular, função cognitiva, saúde articular",
    quandoConsumir: "Almoço ou jantar, 2-3x por semana",
    indicadoPara: "Todos, especialmente idosos e atletas",
    comprovacao: "American Heart Association",
  },
  {
    nome: "Batata-doce", categoria: "Carboidrato", calorias: 86,
    beneficios: ["Índice glicêmico moderado", "Rica em betacaroteno", "Energia sustentada"],
    vitaminas: ["A", "C", "B6"], minerais: ["Potássio", "Manganês"],
    funcao: "Energia para treinos, saúde da pele, sistema imunológico",
    quandoConsumir: "Pré-treino ou almoço",
    indicadoPara: "Atletas, quem busca energia sustentada",
    comprovacao: "Journal of Nutrition",
  },
  {
    nome: "Espinafre", categoria: "Vegetal", calorias: 23,
    beneficios: ["Altíssimo em ferro", "Rico em antioxidantes", "Fortalece ossos"],
    vitaminas: ["K", "A", "C", "Folato"], minerais: ["Ferro", "Cálcio", "Magnésio"],
    funcao: "Saúde sanguínea, proteção ocular, saúde óssea",
    quandoConsumir: "Almoço e jantar, cru ou cozido",
    indicadoPara: "Anêmicos, gestantes, vegetarianos",
    comprovacao: "Ministério da Saúde",
  },
  {
    nome: "Abacate", categoria: "Gordura", calorias: 160,
    beneficios: ["Gordura mono-insaturada", "Reduz colesterol ruim", "Rico em fibras"],
    vitaminas: ["K", "C", "B5", "B6", "E"], minerais: ["Potássio", "Magnésio"],
    funcao: "Saúde cardiovascular, saciedade, absorção de nutrientes",
    quandoConsumir: "Café da manhã, lanches ou saladas",
    indicadoPara: "Quem busca saúde cardíaca e emagrecimento saudável",
    comprovacao: "Harvard T.H. Chan School of Public Health",
  },
  {
    nome: "Castanha-do-Pará", categoria: "Gordura", calorias: 656,
    beneficios: ["Maior fonte de selênio", "Antioxidante", "Saúde da tireoide"],
    vitaminas: ["E", "B1"], minerais: ["Selênio", "Magnésio", "Fósforo", "Zinco"],
    funcao: "Função tireoidiana, proteção contra radicais livres",
    quandoConsumir: "1-2 unidades por dia (não exagere!)",
    indicadoPara: "Todos, especialmente quem tem problemas de tireoide",
    comprovacao: "Organização Mundial da Saúde",
  },
  {
    nome: "Feijão", categoria: "Leguminosa", calorias: 77,
    beneficios: ["Proteína vegetal", "Rico em fibras", "Baixo custo"],
    vitaminas: ["B1", "B6", "Folato"], minerais: ["Ferro", "Potássio", "Magnésio", "Zinco"],
    funcao: "Saúde intestinal, controle de glicose, saciedade",
    quandoConsumir: "Almoço e jantar (combine com arroz para proteína completa)",
    indicadoPara: "Todos, base da alimentação brasileira",
    comprovacao: "Ministério da Saúde - Guia Alimentar",
  },
];

const categorias = ["Todas", ...new Set(alimentos.map((a) => a.categoria))];

const Biblioteca = () => {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Todas");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = alimentos.filter((a) => {
    const matchSearch = a.nome.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "Todas" || a.categoria === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-dvh bg-background pt-20 pb-10 md:pb-16">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Biblioteca de <span className="text-primary">Alimentos</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            Benefícios, vitaminas e ciência por trás de cada alimento
          </p>
        </div>

        {/* Search */}
        <div className="mt-8 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar alimento..."
            aria-label="Buscar alimento"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-xl border-2 border-border bg-background text-foreground focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        {/* Categories */}
        <div className="mt-4 flex flex-wrap gap-2">
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              aria-pressed={catFilter === cat}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                catFilter === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Foods */}
        <div className="mt-8 space-y-4">
          {filtered.map((a) => (
            <div
              key={a.nome}
              className="bg-card rounded-2xl shadow-soft border border-border/50 overflow-hidden hover:border-primary/20 transition-colors"
            >
              <button
                onClick={() => setExpanded(expanded === a.nome ? null : a.nome)}
                aria-expanded={expanded === a.nome}
                aria-controls={`alimento-detalhe-${a.nome}`}
                className="w-full p-5 text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Leaf className="w-5 h-5 text-primary" />
                    <div>
                      <h3 className="font-display font-semibold text-foreground">{a.nome}</h3>
                      <p className="text-xs text-muted-foreground">{a.categoria} • {a.calorias} cal/100g</p>
                    </div>
                  </div>
                  <span className="text-xs text-primary font-medium">{expanded === a.nome ? "Fechar" : "Ver mais"}</span>
                </div>
              </button>

              {expanded === a.nome && (
                <div id={`alimento-detalhe-${a.nome}`} className="px-5 pb-5 border-t border-border pt-4 animate-fade-in space-y-4">
                  {/* Benefits */}
                  <div>
                    <h4 className="flex items-center gap-2 font-display font-semibold text-foreground text-sm mb-2">
                      <Heart className="w-4 h-4 text-primary" /> Benefícios
                    </h4>
                    <ul className="space-y-1">
                      {a.beneficios.map((b, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" /> {b}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Nutrients */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-secondary/50 rounded-xl p-3">
                      <h5 className="flex items-center gap-1 text-xs font-semibold text-foreground mb-2">
                        <Shield className="w-3 h-3 text-primary" /> Vitaminas
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {a.vitaminas.map((v) => (
                          <span key={v} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{v}</span>
                        ))}
                      </div>
                    </div>
                    <div className="bg-secondary/50 rounded-xl p-3">
                      <h5 className="flex items-center gap-1 text-xs font-semibold text-foreground mb-2">
                        <Bone className="w-3 h-3 text-accent" /> Minerais
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {a.minerais.map((m) => (
                          <span key={m} className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-medium">{m}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      <Brain className="w-4 h-4 inline text-primary mr-1" />
                      <strong className="text-foreground">Função:</strong> {a.funcao}
                    </p>
                    <p className="text-muted-foreground">
                      <Eye className="w-4 h-4 inline text-accent mr-1" />
                      <strong className="text-foreground">Quando consumir:</strong> {a.quandoConsumir}
                    </p>
                    <p className="text-muted-foreground">
                      <Heart className="w-4 h-4 inline text-primary mr-1" />
                      <strong className="text-foreground">Indicado para:</strong> {a.indicadoPara}
                    </p>
                  </div>

                  {/* Source */}
                  <div className="bg-primary/5 rounded-lg p-3">
                    <p className="text-xs text-primary font-medium">
                      📚 Comprovação científica: {a.comprovacao}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhum alimento encontrado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Biblioteca;
