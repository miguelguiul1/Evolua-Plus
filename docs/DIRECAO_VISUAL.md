# Direção visual — Evolua Plus ("Feira")

**Status:** Fase 1, proposta para aprovação. Nenhum código foi alterado.
**Base:** a auditoria mobile (27 telas × 360/390/412), a PR A mesclada (`fix/mobile-base`, f6d5753) e a direção "Feira" já escolhida.
**Teste que guia tudo:** tapando o logo, a tela ainda parece do Evolua Plus.
**Ideia central:** a IA é uma função do produto (ela monta o plano, lê a foto, responde dúvidas), não a cara do produto. A cara é a de uma cozinha de casa: papel, tinta, tomate, folha, mesa posta.

---

## 0. O que mantive da direção, o que ajustei e por quê

| Item da direção | Decisão | Justificativa |
|---|---|---|
| Papel `#F5EFE4`, tinta `#221D1A` | **Mantém** | Contraste de 14,6:1 (AAA). |
| Tomate `#B23A22` para ações | **Mantém, com 2 regras** | Passa AA como texto (5,2:1 no papel) e com texto branco por cima (6,0:1). Tem dois riscos. (1) É um vermelho-alaranjado, perto do "vermelho de erro". Por isso o erro vira **beterraba `#8C1D40`**, sempre com ícone e texto, e ações destrutivas (excluir conta, apagar registro) usam **contorno beterraba**, nunca tomate cheio. (2) Tomate e folha têm a mesma luminância (contraste entre si de **1,02:1**). Para quem tem daltonismo vermelho-verde, os dois viram quase a mesma cor. Então **nunca** use tomate × folha como única diferença: nem em "bom/ruim", nem em séries de gráfico, nem em status. Sempre junte forma, ícone, texto ou diferença de claridade. |
| Folha `#4E6B2F` | **Mantém** | 5,3:1 no papel. Fica para sinais positivos e itens concluídos, sempre com ícone. |
| Mostarda só em detalhes | **Mantém, e a regra fica mais dura** | Mostarda `#C9962B` no papel dá **2,3:1** e reprova como texto. Ela só aparece como preenchimento (selo, marcador, fundo de chip), com texto em tinta por cima (6,3:1). |
| Fraunces (títulos) | **Mantém, com instância fixa** | Fraunces tem os eixos `opsz`, `SOFT` e `WONK`. Com `opsz` > 18, o `WONK` liga sozinho e as letras h/n/m ficam inclinadas. Isso soa "excêntrico", não "cozinha". Vou instanciar com WONK 0 e SOFT ~50 (mais macia, sem extravagância), só pesos 400–700, só latim. O arquivo `wght` latino tem **36,6 KB**. |
| Atkinson Hyperlegible (texto) | **Troca para Atkinson Hyperlegible *Next*** | A versão *Next* (fev/2025) tem 7 pesos e uma versão variável. O próprio Braille Institute a recomenda para a maioria dos casos. Um só arquivo variável latino tem **34 KB**, contra 17 KB + 17 KB da original em dois pesos estáticos. O peso é igual, e a hierarquia ganha pesos intermediários. |
| Peso das fontes | **+14 KB no total** | Hoje: DM Sans 35 KB + Space Grotesk 22 KB = 57 KB. Depois: Fraunces 36,6 KB + Atkinson Next 34 KB ≈ 71 KB. Medido nos pacotes Fontsource 5.3.0. |

### Tokens de cor (claro e escuro, todos conferidos em WCAG AA)

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--papel` (fundo) | `#F5EFE4` | `#1C1714` | fundo da página |
| `--cartao` | `#FBF8F2` | `#26201C` | superfícies |
| `--tinta` (texto) | `#221D1A` | `#EFE6D8` | texto principal (14,6:1 / 13,0:1) |
| `--tinta-suave` | `#6B5F55` | `#B3A595` | texto secundário (5,8:1 / 6,7:1) |
| `--tomate` (ação) | `#B23A22` | `#E0694F` | botão principal, link de ação. No escuro, o texto do botão é tinta escura (5,3:1). |
| `--folha` | `#4E6B2F` | `#9DBB72` | concluído, positivo (sempre com ícone) |
| `--mostarda` | `#C9962B` | `#D9AE4F` | detalhe, selo, marcador. **Nunca texto no claro.** |
| `--beterraba` (erro) | `#8C1D40` | `#F08AB0` | erro e destrutivo (8,4:1 / 6,9:1), sempre com ícone e texto |
| `--borda-campo` | `#8F8274` | `#7A6D60` | borda de input (3,5:1 / 3,2:1, passa o mínimo de 3:1 para componente) |
| `--borda-suave` | `#E3D9C9` | `#3A322C` | divisórias decorativas (não precisam de 3:1) |

O modo escuro é quente: fundo marrom-tinta, não preto puro, e nenhuma cor saturada sobre preto.

---

## 1. Diagnóstico por tela: o que parece genérico

Os padrões abaixo se repetem no app inteiro. São eles que fazem as telas parecerem "mais um app de IA", e não o Evolua Plus.

- **P1: cabeçalho-molde.** Toda página abre do mesmo jeito: selo em pílula com emoji ou ícone, depois um H1 com uma palavra em verde, depois um subtítulo cinza centralizado. Há **15 páginas** com `<span className="text-primary">` dentro do H1. Exemplos: `Scanner.tsx:112–116` ("🔬 Função principal" + "Scanner **Inteligente**") e `DiarioAlimentar.tsx:285–289` ("📊 Acompanhamento diário" + "Diário **Alimentar**").
- **P2: citação motivacional repetida.** `components/MotivationalQuote.tsx` aparece em **9 páginas**: Dashboard, Diário, Plano Semanal, Preferências, Scanner, Educação, Receitas, Biblioteca e Plano Personalizado. Ela troca de frase a cada 10 s. Algumas frases contrariam as regras de saúde: "Disciplina pesa gramas. Arrependimento pesa toneladas." tem tom de culpa, e "Músculos são construídos na cozinha…" mira corpo. A citação também usa o ícone `Sparkles`.
- **P3: `Sparkles` como marca.** O ícone de "brilhinho de IA" aparece em **25 arquivos**, inclusive onde não há IA nenhuma: "Primeiro registro realizado" em `Evolucao.tsx:169`, "Score do dia" em `ScoreCard.tsx:35` e a citação motivacional. Na barra inferior, a aba "IA" também usa `Sparkles` (`MobileTabBar.tsx:12`).
- **P4: degradês verde→dourado.** `bg-gradient-*` aparece em 19 arquivos. Exemplos: o destaque do Dashboard (`Dashboard.tsx:119,144`), o filete de `AiInsightCard.tsx:36`, `Evolucao.tsx:261` e a água em azul degradê (`WaterTracker.tsx:103`, a única cor fora da paleta).
- **P5: animações sem função.** `animate-pulse` infinito na chama da sequência (`StreakCard.tsx:5`) e no "analisando" (`FoodScanner.tsx:359`). `animate-fade-in`/`fade-up` aparece em 39 lugares, entrando em tudo, o tempo todo.
- **P6: emoji como ícone.** São 94 emojis em telas e dados: Diário 8, Educação 9, Água 7, Lista de compras 7, conquistas 7 e outros. Emoji muda de desenho em cada sistema (Android, iOS, Windows), então a cara do app muda junto.
- **P7: ícones genéricos do Lucide em quadradinhos `bg-primary/10`.** Esse é o padrão do shadcn de fábrica, visto em `ds/EmptyState.tsx`, `StreakCard`, nos cards de estatística etc.

### Tela por tela

| Tela | Arquivo(s) | O que parece genérico ou contraria as regras | Direção |
|---|---|---|---|
| **Landing /** | `HeroSection.tsx`, `landing/*` | Selo "Powered by AI · Nutrição inteligente 24h" (`HeroSection.tsx:30`). H1 com "Inteligência Artificial" em degradê. "Preciso como um nutricionista" (`:57`). Mockup de dashboard falso (`DashboardMockup.tsx`). **Números inventados**: "1.000+ planos", "4,9/5", "95% recomendam" (`SocialProof.tsx:4–7`). **Depoimentos inventados**, inclusive de uma "Médica · BH" que "recomenda aos pacientes" (`SocialProof.tsx`). Rodapé "Seu nutricionista inteligente 24h" (`SiteFooter.tsx:14`). São 11 seções seguidas, todas com o mesmo molde. | Refazer com a voz da cozinha e só afirmações verdadeiras (detalhes na seção 6). |
| **/vendas** | `Vendas.tsx` | Depoimentos ilustrativos com **perda de peso** ("perdi 2kg sem passar fome", `:76`), mesmo com a nota "ainda não há clientes reais". "Resultados Rápidos" (`:70`). | Remover depoimentos e a promessa de resultado. Deixar espaço para depoimentos reais. |
| **/checkout** | `Checkout.tsx` | Degradê e `Sparkles` no resumo. | Visual de recibo de feira: tinta sobre papel, sem brilho. |
| **/auth, /reset-password** | `Auth.tsx`, `ResetPassword.tsx` | Tela de boas-vindas com orbes desfocados e degradê. "Senha atualizada com sucesso! 🎉". | Papel com uma forma da marca em SVG estático. Microcopy simples. |
| **Consentimento** | `consent/ConsentScreen.tsx` | Só o estilo é genérico (card shadcn padrão). | **Só estilo**: tipografia e cores novas. Texto e lógica intocados. |
| **Onboarding** | `Onboarding.tsx` | Visual de formulário padrão. Emoji nos objetivos (`lib/objectives.ts`). | Passos como "fichas de receita" numeradas. Ícones SVG próprios no lugar dos emojis. |
| **Dashboard** | `Dashboard.tsx` | **13+ blocos** com o mesmo peso visual: destaque em degradê, Score 0–100, Sequência, Card IA, 6 cards da semana, Água, Refeições, Evolução, Metas com 5 macros, citação e 4 atalhos. "👋" no nome. O Score dá **30 de 100 pontos para calorias** (`useEngagement.ts:52`). | Ver seção 5. |
| **Diário** | `DiarioAlimentar.tsx`, `diario/*` | Cabeçalho-molde (P1). `Sparkles` no botão de IA. Citação no fim. Emojis por refeição. | Página de caderno: data em Fraunces e as refeições como linhas de uma lista de mercado. |
| **Plano semanal** | `PlanoSemanal.tsx`, `plano/SmartShoppingList.tsx` | P1, P2 e P3. A lista de compras usa emoji por categoria. | Cardápio semanal como quadro de cozinha, com o dia de hoje em destaque. Lista de compras com ícones SVG de categoria. |
| **Plano personalizado** | `PlanoPersonalizado.tsx` | Formulário longo sem respiro. Bloco de aviso cinza. | Passos numerados e um aviso em caixa de papel com borda de tinta. |
| **Assistente** | `AssistenteIA.tsx` | Título "Evolua Plus **AI**" com `Bot`, `Brain` e `Sparkles` juntos (6 ícones de IA). | O assistente se chama pelo que faz ("Tire uma dúvida"). Um marcador discreto e único "IA" onde a resposta é gerada. |
| **Scanner** | `Scanner.tsx`, `FoodScanner.tsx` | "🔬 Função principal" e "Scanner **Inteligente**". Linha de varredura com brilho (`shadow-glow`) e `Sparkles` pulsando. | Visual de "balança de feira". A varredura vira indicador de progresso real (etapas), sem brilho. |
| **Evolução** | `Evolucao.tsx` | "Sua jornada de **transformação**" (`:242`). O primeiro dado é "Peso atual", seguido de "Desde o início" com ícone `TrendingDown` (`:252–256`). Textos como "Tendência de queda: X kg" (`:126`). | Hábitos primeiro (dias com registro, água). Peso vira um dos registros, com linguagem neutra e sem seta de "queda = bom". Ver nota sobre lógica na seção 6. |
| **Insights** | `Insights.tsx` | "Central de insights" com 4 `Sparkles`. "Score médio" no topo. | Resumo da semana em frases curtas e gráfico de constância. |
| **Receitas** | `Receitas.tsx` | "Pratos **Baratos** & Rápidos". Citação. Emojis nos dados (`data/receitas.ts`). | Fichas de receita: título em Fraunces, tempo e custo como etiqueta de feira. |
| **Biblioteca** | `Biblioteca.tsx` | P1 e P2. | Índice tipo dicionário de alimentos. |
| **Educação, Guias** | `Educacao.tsx`, `Guias.tsx` | P1, P2 e 9 emojis. | Leitura editorial: coluna estreita, Fraunces nos títulos e fonte citada no rodapé de cada guia. |
| **Histórico, Favoritos** | `Historico.tsx`, `Favoritos.tsx` | "Meu **Histórico**" e "Meus **Favoritos**" com o molde P1. | Listas simples com estado vazio próprio (seção 4). |
| **Memória IA** | `MemoriaIA.tsx` | Visual de "IA". | Visual de "anotações sobre você", com controle claro de apagar. |
| **Preferências, Configurações** | `Preferencias.tsx`, `Configuracoes.tsx` | P1 e P2 em Preferências. Chips padrão. | Chips como etiquetas de papel. Sem citação. |
| **Privacidade, Termos** | `Privacidade.tsx`, `Termos.tsx` | Só tipografia. | **Só estilo**: texto e placeholders intocados. |
| **404** | `NotFound.tsx` | "404" grande e genérico. | "Essa página não está na despensa." com link de volta. |

---

## 2. Referências pesquisadas

Cada referência separa **fato** (o que a fonte diz), **opinião** (minha leitura) e **princípio** (o que levo para o Evolua). Nada é copiado. Só extraio princípios.

**Saúde, nutrição e hábitos**

1. **Guia Alimentar para a População Brasileira, 2ª ed., Ministério da Saúde (2014)**: <https://bvsms.saude.gov.br/bvs/publicacoes/guia_alimentar_populacao_brasileira_2ed.pdf>
   - *Fato:* é o documento oficial. Resume suas recomendações em "10 passos": base em alimentos in natura ou minimamente processados, evitar ultraprocessados, comer com regularidade e atenção, desenvolver habilidades culinárias, planejar o tempo para a alimentação, desconfiar de propaganda.
   - *Princípio:* a voz do produto é "comida de verdade, planejar, cozinhar", não "macros e déficit". Qualquer conteúdo educativo cita esta fonte.
2. **Panelinha (Rita Lobo)**: <https://panelinha.com.br/>
   - *Fato:* o slogan é "Receitas que funcionam". O livro "Panelinha – receitas que funcionam" é citado no Guia Alimentar do Ministério da Saúde ([Bloomberg Línea](https://www.bloomberglinea.com.br/especiais/personagens-bloomberg-linea/rita-lobo-2/)).
   - *Opinião:* a marca vem de fotografia de comida real, tipografia editorial e texto em segunda pessoa, prático.
   - *Princípio:* tom de quem cozinha em casa. A receita é a estrela, não a tecnologia.
3. **Headspace (ilustração e marca)**: <https://www.itsnicethat.com/articles/italic-studio-headspace-graphic-design-project-250424>
   - *Fato:* a reformulação de 2024 manteve o círculo laranja como base do sistema de ilustração e revisou a paleta pensando em contraste e acessibilidade.
   - *Opinião:* poucas formas geométricas, sempre as mesmas, viram marca.
   - *Princípio:* um kit pequeno de formas SVG (círculo-tomate, folha, grão, prato), reutilizado em tudo.
4. **Apple, pausa dos anéis de atividade no watchOS 11**: <https://www.bgr.com/tech/watchos-11-activity-rings-have-big-changes-heres-whats-new/>
   - *Fato:* desde o watchOS 11, dá para pausar os anéis (descanso, lesão, folga) sem perder a sequência de prêmios.
   - *Opinião:* até quem popularizou sequências recuou da punição.
   - *Princípio:* constância medida por "dias com registro na semana", nunca por uma sequência que zera.
5. **Lally et al. (2010), "How are habits formed"**, *European Journal of Social Psychology* 40(6): <https://doi.org/10.1002/ejsp.674>
   - *Fato:* a automaticidade levou de 18 a 254 dias. **Perder uma oportunidade não afetou de forma relevante a formação do hábito.**
   - *Princípio:* falhar um dia não pode "quebrar" nada na interface.
6. **Simpson & Mazzeo (2017), contagem de calorias e sintomas de transtorno alimentar**, *Eating Behaviors* 26: <https://doi.org/10.1016/j.eatbeh.2017.02.002>
   - *Fato:* estudo transversal com universitários. O uso regular de rastreadores de calorias se associou a atitudes ansiosas com comida e a mais dieta restritiva. É associação, não causa.
   - *Princípio:* calorias e peso nunca são celebração nem placar. Ficam em segundo plano, como informação.

**Tipografia e acessibilidade**

7. **Atkinson Hyperlegible Next, Braille Institute**: <https://www.brailleinstitute.org/freefont/>
   - *Fato:* lançada em fev/2025, com 7 pesos, versão variável e mais de 150 idiomas. É recomendada pelo Braille Institute para a maioria dos casos. Licença livre.
   - *Princípio:* legibilidade para baixa visão como parte da marca: texto do app em Atkinson Next.
8. **Fraunces, Undercase Type**: <https://github.com/undercasetype/Fraunces>
   - *Fato:* fonte variável com `opsz` (9–144), `SOFT` (0–100) e `WONK` (troca automática quando opsz > 18). Licença OFL.
   - *Opinião:* uma serifa "de livro de receita antigo".
   - *Princípio:* usar só nos títulos, com WONK desligado.
9. **WCAG 2.2, critérios 2.3.3 (animação a partir de interações) e 2.2.2 (pausar, parar, ocultar)**: <https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html>
   - *Fato:* movimento não essencial disparado por interação deve poder ser desligado. `prefers-reduced-motion` é técnica suficiente. Parallax é citado como exemplo de movimento muitas vezes não essencial. Movimento automático cai no 2.2.2.
   - *Princípio:* todo movimento novo tem versão reduzida, e o que é automático pausa.

**Motion**

10. **Material Design 3, tokens de easing e duração**: <https://m3.material.io/styles/motion/easing-and-duration/tokens-specs>
    - *Fato:* as durações vêm em faixas por distância percorrida: curtas de 50–200 ms, médias de 250–400 ms, longas de 450–600 ms. Há curvas "standard" e "emphasized", cada uma com variantes de entrada e saída.
    - *Princípio:* duração proporcional ao tamanho do movimento. Tokens nomeados, não números soltos.
11. **Apple HIG, Motion; critérios de Reduced Motion da App Store**: <https://developer.apple.com/design/human-interface-guidelines/motion> e <https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria/>
    - *Fato:* com Reduced Motion ligado, desativar ou trocar parallax, blur animado, efeitos de profundidade, giro e zoom. Movimento que comunica mudança de estado deve continuar, só que mais simples.
    - *Princípio:* em modo reduzido, troca-se deslocamento por fade curto, mas o feedback não some.
12. **web.dev, "How to create high-performance CSS animations"**: <https://web.dev/articles/animations-guide>
    - *Fato:* animar só `transform` e `opacity` evita layout e paint e pode rodar no compositor.
    - *Princípio:* barra de progresso com `scaleX`, não com `width`.

**Fora da área**

13. **Nielsen Norman Group, estados vazios**: <https://www.nngroup.com/articles/empty-state-interface-design/>
    - *Fato:* três diretrizes. Mostrar o status do sistema (sem "vazio" enquanto carrega), ensinar no contexto e dar o atalho direto para a próxima ação.
    - *Princípio:* todo vazio tem uma frase do que é, uma do porquê e um botão.
14. **Mailchimp Content Style Guide, voz e tom**: <https://styleguide.mailchimp.com/voice-and-tone/>
    - *Fato:* a voz é estável e o tom muda com o estado emocional de quem lê. Humor só quando é natural. Clareza acima de graça.
    - *Princípio:* mesma voz em todo lugar, com tom mais calmo em erro e em temas de corpo.
15. **GOV.UK, guia de estilo A–Z**: <https://www.gov.uk/guidance/style-guide/a-to-z>
    - *Fato:* linguagem simples é obrigatória, com voz ativa, sem jargão e com o principal primeiro.
    - *Princípio:* "Registre o almoço", não "Efetue o registro da refeição".

---

## 3. Sistema de motion

**Regra de entrada:** cada animação precisa declarar sua função: **feedback**, **progresso**, **orientação** ou **identidade**. Sem função, não entra.

### Tokens

| Token | Valor | Para quê |
|---|---|---|
| `--dur-toque` | 100 ms | resposta ao toque (pressionar) |
| `--dur-curta` | 180 ms | marcar, alternar, aparecer um ícone |
| `--dur-media` | 280 ms | entrada de painel ou folha, troca de conteúdo |
| `--dur-longa` | 450 ms | progresso que enche, celebração |
| `--dur-ambiente` | 18–24 s por ciclo | só o fundo da landing (identidade) |
| `--ease-padrao` | `cubic-bezier(0.2, 0, 0, 1)` | quase tudo |
| `--ease-entrada` | `cubic-bezier(0.05, 0.7, 0.1, 1)` | elemento que chega |
| `--ease-saida` | `cubic-bezier(0.3, 0, 0.8, 0.15)` | elemento que sai (mais rápido que a entrada) |
| `--ease-linear` | `linear` | só no loop ambiente |

**Intensidade máxima:** deslocamento de até 8 px dentro da página, até 24 px para painéis, escala entre 0,96 e 1,04. Sem overshoot nem quique, sem giro acima de 6°, sem blur animado, sem parallax.

**Propriedades:** só `transform` e `opacity`. Barras de progresso usam `scaleX` com `transform-origin: left`. Anéis (SVG) atualizam sem animar o traço: o número muda com um fade de 180 ms.

### Catálogo (tudo o que pode se mexer)

| Momento | Função | Movimento | Modo reduzido |
|---|---|---|---|
| Tocar em botão ou chip | feedback | escala 0,97 por 100 ms | igual (sem deslocamento) |
| Marcar refeição ou copo d'água | feedback | o ícone de check entra com escala 0,6→1 e opacidade, 180 ms | só opacidade |
| Barra de água ou de refeições do dia | progresso | `scaleX` até o valor, 450 ms | troca instantânea |
| Meta do dia atingida (água, todas as refeições) | feedback e identidade | "carimbo": escala 1,08→1 e opacidade, 280 ms, uma vez | só opacidade |
| Scanner analisando a foto | progresso | etapas reais ("Lendo a foto → Identificando → Calculando") com barra em `scaleX`. Sem brilho e sem pulso infinito. | texto das etapas sem movimento |
| Gerar plano, IA respondendo | progresso | três pontos com opacidade alternada, 1,2 s por ciclo, **só enquanto espera** | texto "Montando…" |
| Abrir folha ou modal | orientação | sobe 24 px e opacidade, 280 ms; sai em 180 ms | fade de 120 ms |
| Trocar de dia no calendário ou no cardápio | orientação | conteúdo desliza 8 px no sentido do toque, 180 ms | fade |
| Esqueleto de carregamento | progresso | opacidade 0,6↔1, 1,2 s | estático |
| Fundo da landing | identidade | 3 a 5 formas SVG (tomate, folha, grão) com translate e rotação de até 6°, ciclo de 18–24 s. **Pausa fora da tela** (IntersectionObserver + `animation-play-state`). | estático |
| Ícones parados (chama, brilho) | — | **não entra** (sem função) | — |
| Fade-in em toda seção ao rolar | — | **não entra** (sem função) | — |

**Orçamento:** todo o motion novo (CSS, SVGs e o pequeno JS de pausa) fica abaixo de **150 KB**. Estimativa: ~20 KB. O peso real será medido antes e depois em cada PR. Nada depende de hover: todo estado de hover tem equivalente de toque ou foco.

---

## 4. Estados vazios e de sucesso (microcopy em português)

**Estrutura de todo estado vazio:** ilustração SVG pequena do kit (≤ 3 KB), um título que diz o que está vazio, uma frase que diz por que vale preencher e um botão com a próxima ação.

**Regras do texto:**
- O texto nunca culpa ("você ainda não…" só quando é neutro).
- Nada de peso, calorias ou "resultado".
- Enquanto carrega, mostra esqueleto, nunca o texto de vazio.

### Vazios

| Onde | Título | Frase | Botão |
|---|---|---|---|
| Diário, hoje sem registro | Seu caderno de hoje está em branco | Anote o que comeu, do jeito que lembrar. Não precisa ser exato. | Anotar uma refeição |
| Diário, dia passado vazio | Nada anotado neste dia | Tudo bem. Dá pra anotar agora, se lembrar. | Anotar neste dia |
| Plano semanal sem plano | Ainda não tem cardápio na mesa | Em poucos minutos a gente monta a semana com o que você gosta e tem por perto. | Montar meu cardápio |
| Lista de compras vazia | Lista de compras em branco | Ela se preenche sozinha quando você monta o cardápio. | Ver cardápio |
| Lista de compras concluída | Tudo na sacola | Boa feira! | — |
| Receitas, filtro sem resultado | Nenhuma receita com esses filtros | Tire um filtro ou tente outra palavra. | Limpar filtros |
| Biblioteca, busca sem resultado | Não achamos "{termo}" | Confira a grafia ou procure pelo nome mais comum. | Limpar busca |
| Favoritos | Nenhuma receita guardada | Toque no coração de uma receita para ela aparecer aqui. | Ver receitas |
| Histórico do scanner | Nenhuma foto analisada ainda | Fotografe um prato ou a geladeira para começar. | Abrir o scanner |
| Evolução, sem registros | Seu primeiro registro começa aqui | Anote medidas ou fotos quando quiser. Elas ficam só com você. | Fazer um registro |
| Insights, poucos dados | Ainda é cedo para um resumo | Com 3 dias anotados, a gente mostra como foi sua semana. | Anotar hoje |
| Memória da IA vazia | Nada anotado sobre você | O que você contar ao assistente pode ficar aqui, e você apaga quando quiser. | Conversar |
| Assistente, primeira vez | Pergunte do jeito que falaria na cozinha | Ex.: "O que faço com abobrinha e ovo?" | (sugestões em chips) |
| Água, zero copos | Primeiro copo do dia? | Um toque e está marcado. | + 1 copo |
| Sem internet | Sem conexão agora | Assim que a internet voltar, é só tentar de novo. | Tentar de novo |

> Este texto foi conferido no código: o app não guarda registros offline (só detecta a conexão, em `useOnlineStatus.ts`). Por isso não prometo "fica guardado".

### Sucessos (sempre sobre hábito, nunca sobre corpo)

| Momento | Texto | Forma |
|---|---|---|
| Primeira refeição anotada | Primeira anotação feita. O caderno começou. | carimbo + aviso curto |
| Todas as refeições do dia anotadas | Dia todo anotado. | carimbo no card do dia |
| Meta de água do dia | Copo cheio por hoje. | barra completa + carimbo |
| Cardápio da semana criado | Cardápio da semana na mesa. | aviso + leva ao cardápio |
| 4 dias com anotação na semana | 4 dias anotados nesta semana. Constância é isso. | marcação na semana, sem sequência que zera |
| 7 de 7 dias na semana | Semana inteira anotada. | selo mostarda discreto |
| Receita guardada | Guardada nos favoritos. | ícone de coração preenche |
| Registro de evolução salvo | Registro salvo. | aviso curto, **sem comentar o número** |
| Perfil ou preferências salvos | Preferências salvas. O próximo cardápio já usa isso. | aviso |
| Senha trocada | Senha trocada. Pode entrar com a nova. | aviso (sem 🎉) |

**Erros:** beterraba, com ícone e texto, dizendo o que aconteceu e o que fazer. Exemplo: "Não deu para salvar. Confira a internet e tente de novo."

---

## 5. Dashboard: "o que fazer agora"

**Hoje:** são 13+ blocos com o mesmo peso. O usuário precisa decidir sozinho por onde começar.

**Proposta**, de cima para baixo no celular:

1. **Saudação curta**, sem emoji: "Boa tarde, Ana." Fraunces, alinhada à esquerda.
2. **Um único destaque, "Agora"**: um cartão grande em papel com borda de tinta, uma frase e **um** botão tomate. O conteúdo é escolhido pelo estado que já existe no app, sem lógica nova:
   - sem perfil completo → "Complete seu perfil para montar o cardápio."
   - sem plano → "Monte o cardápio da semana."
   - próxima refeição por anotar → "Anote o almoço." (usa `nextMeal`, que já é calculado)
   - tudo anotado → "Dia anotado. Que tal ver a receita de amanhã?"
3. **"Hoje" em uma linha de três sinais compactos**, sem cards: refeições anotadas `2 de 4` · água `5 de 8 copos` (toque soma 1) · plano de hoje (link).
4. **"Sua semana"**: 7 marcas (dias com anotação), ●○ com forma e texto, não só cor. Toque leva a Insights.
5. **Atalhos** em lista simples: Receitas, Lista de compras, Evolução, Perfil.

**O que sai do dashboard:**
- A citação motivacional.
- O degradê.
- O Score 0–100 como número principal, porque premia calorias. Ele continua disponível em Insights, com o nome "Resumo do dia".
- O card de sequência que zera.
- As 6 caixas da semana.
- As 5 barras de macros. Elas vão para o Diário, onde fazem sentido.

**O que fica:** o card de dica da IA, mas só quando houver dica, em segundo plano, abaixo de "Sua semana", com o marcador "IA".

**Sem lógica nova:** tudo isso usa dados que a página já recebe (`engagement.week[].logged`, `nextMeal`, `hasPlan`, a água). É reorganização visual.

---

## 6. Manter, remover, transformar

**Manter**
- O nome, o logo e o desenho do logo.
- Toda a estrutura de rotas e as funcionalidades.
- Os textos jurídicos e os placeholders.
- O aviso "não substitui nutricionista ou médico".
- As correções mobile da PR A (alvos de 44 px, dvh, safe-area, margem de 20 px).
- A tradução EN de /vendas.

**Remover**
- Os números inventados da landing ("1.000+", "4,9/5", "95%").
- Os depoimentos inventados (landing e /vendas), substituídos por um espaço "Depoimentos reais entram aqui" que só aparece quando houver conteúdo.
- O selo "Powered by AI".
- "Preciso como um nutricionista" e "Seu nutricionista inteligente 24h".
- O `DashboardMockup`.
- A `MotivationalQuote` das 9 páginas.
- `Sparkles` fora de funções de IA.
- Pulso infinito, fade-in em tudo, orbes e degradês.
- "Resultados rápidos" e "Fast Results".
- Promessas de perda de peso.

**Transformar**
- O cabeçalho-molde vira um componente `CabecalhoPagina`: título em Fraunces à esquerda, uma frase de apoio e, opcionalmente, uma ação. Nada de pílula, emoji ou palavra colorida.
- Os emojis viram um kit de **~16 ícones SVG próprios**: traço de 2 px, cantos arredondados, inspirados em utensílios e alimentos. Exemplos: copo, prato, panela, sacola, folha, tomate, grão, caderno, balança de feira, relógio de cozinha, coração, câmera, conversa, calendário, check e alerta.
- A IA ganha **um marcador único e discreto**: "IA" em versalete com um ponto mostarda. Ele aparece onde o conteúdo foi gerado (plano, resposta, análise da foto, dica). A aba "IA" da barra inferior passa a se chamar **"Assistente"**, com ícone de balão de conversa.
- A sequência vira "dias anotados nesta semana", sem zerar.
- A Evolução passa a abrir por hábitos. O peso fica em linguagem neutra: "Variação desde o primeiro registro". Sem ícone de queda e sem "transformação".
- A conquista "Variação de 5kg" (`useEngagement.ts:211`) **deixa de ser exibida**, filtrada só na apresentação, em `AchievementsGrid`. Mudar a regra dentro do hook seria mexer em lógica, e isso eu não faço sem você pedir.
- A água sai do azul degradê e passa a usar a paleta: barra em tinta, copo em SVG.

---

## 7. Roadmap: PRs pequenas, uma por assunto

Regras para todas as PRs:
- Cada uma sai de uma branch própria criada a partir da `main`.
- Build e lint passam antes do commit.
- Cada PR traz o link de preview da Vercel, o peso antes e depois da primeira carga e screenshots em 360/390/412.
- **Nenhuma é mesclada sem "aprovei".**

| # | Branch | Assunto | Escopo |
|---|---|---|---|
| 1 | `design/tokens` | Cores claro + escuro | Tokens da tabela da seção 0, mapeados nas variáveis do shadcn. Erro beterraba com ícone. Modo escuro quente. Sem mudar layout. |
| 2 | `design/fontes` | Tipografia | Fraunces (instanciada: wght 400–700, WONK 0, SOFT 50) + Atkinson Hyperlegible Next, em woff2 latino com preload. Remove DM Sans e Space Grotesk. Escala tipográfica. |
| 3 | `design/motion` | Motion base | Tokens da seção 3, utilitários, `prefers-reduced-motion`. Remove pulsos infinitos e fade-in genérico. Progresso em `scaleX`. |
| 4 | `design/icones` | Kit de ícones SVG | Os ~16 ícones próprios, a troca dos emojis da interface (não os dos dados de receitas) e o marcador "IA". |
| 5 | `design/cabecalhos` | Cabeçalho de página | `CabecalhoPagina` nas 15 páginas e remoção da citação motivacional nas 9. |
| 6 | `design/estados` | Estados vazios e de sucesso | Componentes, kit de ilustrações SVG e microcopy da seção 4. |
| 7 | `design/dashboard` | Dashboard | A proposta da seção 5. |
| 8 | `design/landing` | Landing | Nova landing honesta, fundo animado com orçamento medido e espaços para fotos e depoimentos reais. Créditos em `CREDITS.md`. Meta de primeira carga até ~1,2 MB (hoje 964 KB). |
| 9 | `design/vendas-checkout-auth` | Vendas, Checkout, Auth, Reset | Mesma identidade e remoção dos depoimentos de /vendas. |
| 10 | `design/diario-plano` | Diário, Plano semanal, Lista, Plano personalizado | Caderno e cardápio. |
| 11 | `design/scanner-assistente` | Funções de IA | Scanner com progresso real, Assistente e Memória da IA. |
| 12 | `design/evolucao-insights` | Evolução e Insights | Hábitos primeiro, peso neutro, conquista de peso oculta. |
| 13 | `design/conteudo` | Receitas, Biblioteca, Educação, Guias, Favoritos, Histórico | Fichas e leitura editorial. |
| 14 | `design/conta` | Onboarding, Consentimento (só estilo), Preferências, Configurações, Privacidade e Termos (só estilo), 404 | |

As PRs 1–3 são a fundação: sem elas, as outras ficam inconsistentes. A ordem das PRs 4–14 pode mudar se você preferir ver alguma tela antes.

---

## O que só você pode me dar

1. **Fotos**, se quiser fotografia na landing e nas receitas: suas ou de banco com licença comercial livre (vão creditadas em `CREDITS.md`). Sem elas, entram placeholders desenhados.
2. **Depoimentos reais**, com autorização de uso. Sem eles, o espaço fica oculto.
3. **Valores dos placeholders legais** (`[NOME_DO_CONTROLADOR]`, `[EMAIL_DE_CONTATO]` etc.), quando quiser publicar.
4. **Logo, uma decisão de marca.** O logo atual é verde (`#2D6A4F`-ish), um tom diferente da folha `#4E6B2F` da paleta nova. Mantenho o logo como está (só otimizado). Se você quiser, posso propor uma versão recolorida em tinta ou folha, sem mudar o desenho, mas só faço se você pedir.
