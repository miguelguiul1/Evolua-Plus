# Relatório — Alimentos não gostados e alergias

Branch: `feat/alimentos-nao-gostados` (criada a partir de `feat/app-nativo-release`).
Esta funcionalidade foi **refeita do zero**: a branch original, feita em outro computador, nunca chegou ao GitHub.

## 1. Causa real do bug

A lista `user_preferences.disliked_foods` já chegava às quatro Edge Functions (via `_shared/userContext.ts`), mas:

1. **A regra no prompt era fraca.** Era só uma linha como `NÃO usar: coentro, peixe`, misturada ao resto do perfil. Não dizia que valia para tempero, guarnição e opções alternativas, e não separava alergia (risco à saúde) de gosto pessoal.
2. **Nada validava a resposta da IA.** O JSON devolvido pelo modelo ia direto para o usuário. Se a IA ignorasse a regra, o alimento aparecia no plano.
3. **A IA não sabia o que a palavra cobria.** "Peixe" não virava tilápia/salmão/atum, "cilantro" não era "coentro", "tomates" não era "tomate".
4. **Alergias digitadas em "Outra restrição"** (ex.: "alergia a nozes") iam só como texto para a IA, sem virar bloqueio.
5. **Não havia campo de texto livre.** Só dava para marcar alimentos da grade fixa.

## 2. O que mudou

### Etapa 1 — lógica pura e compartilhada
- **Um único módulo**, `supabase/functions/_shared/foodPreferences.ts`, usado pelas Edge Functions **e** pelo front (o front o reexporta em `src/lib/foodPreferences.ts`). **Não existe espelho** para manter em sincronia.
  - Decisão: importar o arquivo das functions no front foi viável. Ele é TypeScript puro, só com imports relativos, e o Vite/tsc/vitest o aceitam.
- **Paridade entre runtimes:** `_shared/foodPreferences.cases.ts` tem 34 casos com resultado esperado. Os mesmos casos rodam no vitest (Node) e no `deno test` (Deno). O teste do vitest também confirma que o front usa a mesma função do módulo das functions.
- **Normalização:** minúsculas, sem acento, sem artigo inicial, hífen = espaço, cada palavra no singular (`limões`→`limao`, `pães`→`pao`, `nozes`→`noz`, `grãos-de-bico`→`grao de bico`).
- **Casamento por palavra inteira**, nunca por substring: "ervilha" não casa "berinjela", "cebola" não casa "cebolinha".
- **Sinônimos:** cilantro = coentro, aipim/macaxeira = mandioca, jerimum = abóbora, mexerica/bergamota = tangerina, entre outros.
- **Categorias amplas:** peixe, frutos do mar, carne/carne vermelha, castanhas/oleaginosas expandem para os membros.
- **"leite" NÃO expande para derivados** (ver seção 6). Derivados só entram quando a origem é **alergia** (ex.: alergia a amendoim → paçoca, pé de moleque).
- **Exceções:** expressões que contêm o termo mas são outro alimento, como `leite de amêndoas/coco/aveia/soja`, `batata-doce`, `couve-flor`, `alho-poró`, `carne de soja`, `pão de queijo` e `manteiga de amendoim`.
- **Negação:** "sirva **sem** cebola" e "**zero** lactose" não contam como violação.
- **Parser de texto livre:** "não gosto de fígado, jiló e coentro" → Fígado, Jiló, Coentro. Separadores: vírgula, ponto e vírgula, quebra de linha, `/`, " e ", " ou ". Recusa texto que não é alimento (números, "asdfgh", "nada"). Deduplica por acento, plural e sinônimo.
- **Alergias** vêm primeiro e ganham prioridade máxima na mesma lista de termos. Se o mesmo alimento é "não gosto" e alergia, prevalece a alergia.

### Etapa 2 — Edge Functions
- **Laço genérico:** `_shared/aiGuard.ts` (`generateWithGuard`) faz gerar → validar → regenerar → sanitizar e recebe a chamada da IA como parâmetro.
- **Regras por função:** ficam em `_shared/recipeGuards.ts`.
  - O parse do meal-plan e do meal-swap foi **movido** para cá **sem mudar o comportamento**: cercas de markdown, vírgula sobrando, array solto, 1–3 opções, trava de suplementação.
- **Prompt:** a regra absoluta pedida entrou literalmente: "NUNCA inclua os seguintes alimentos, nem como ingrediente, acompanhamento, tempero ou guarnição, incluindo variações e derivados diretos: …".
  - Restrições/alergias vão numa **linha própria**, marcadas como PRIORIDADE MÁXIMA.
  - Categorias aparecem expandidas para a IA, ex.: `Peixe (tilápia, salmão, …)`.
- **Varredura pós-IA:** nome, ingredientes, preparo e opções alternativas de cada receita.
  - Se houver violação, **regenera até 2 vezes**, informando à IA o que violou e onde.
  - Se persistir, **sanitiza** e registra `console.warn`.
- **Como a sanitização funciona:**
  - **meal-plan:** se a refeição tem uma opção alternativa limpa, ela é **promovida** a principal (com os macros dela). Só quando nenhuma opção está limpa o texto é sanitizado: o ingrediente é removido e as menções viram "um ingrediente de sua preferência". Lista de compras, dicas e suplementação são sempre limpas, mas não disparam regeneração.
  - **meal-swap:** sanitiza a receita. O `motivo_troca` que cita o alimento vira texto neutro.
  - **analyze-fridge:** apenas as **receitas**. Receitas proibidas são removidas se sobrar alguma limpa; senão são sanitizadas. Os alimentos identificados na foto **não** são alterados (são o que a pessoa tem na geladeira).
  - **nutrition-chat** (texto livre): **uma** regeneração e aviso no log, sem sanitizar. Não conta como violação quando o próprio usuário perguntou sobre o alimento, nem citações como "evite coentro" / "como você não gosta de…".
- **O que a sanitização garante:**
  - Nunca devolve lista de ingredientes vazia: usa "Ingrediente de sua preferência (substituto)".
  - Nunca devolve receita sem nome: usa "Opção adaptada às suas preferências".
- **Limite de tempo:** nenhuma nova regeneração começa depois de 75 s (meal-plan), 40 s (meal-swap) ou 45 s (geladeira). Nesse caso a resposta é sanitizada direto, para não estourar o tempo máximo da Edge Function.
- **`userContext.ts`:** `disliked_foods` passa a aceitar até **80** itens (antes 40), porque agora há texto livre.

### Etapa 3 — Interface
- **Preferências:** a grade continua igual, com o mesmo visual e comportamento. Abaixo dela há **"Outros alimentos que você não gosta"**:
  - campo de texto livre, autocomplete de um catálogo de 180 alimentos brasileiros (aceita itens fora dele), chips removíveis;
  - aviso gentil para texto que não parece alimento, com "adicione assim mesmo";
  - para categorias amplas, "Peixe: inclui tilápia, salmão, sardinha, atum e mais 17", com botão **Ajustar** (desmarque o que você come; a categoria vira só os itens escolhidos);
  - **"Sua lista completa (N)"**: vê e remove qualquer item, da grade ou do texto livre, a qualquer momento (também pelo link `/preferencias#nao-gosto`);
  - grade e texto livre gravam a **mesma** lista, sem duplicatas: digitar "peixes" marca o item "Peixe" da grade. O que entra em "não gosto" sai de "gosto".
- **"Outra restrição"** mostra o que foi entendido: "Entendido: a IA nunca vai usar Camarão". Se não reconhecer, sugere o formato "Alergia a camarão".
- **Ao salvar:** se o plano salvo já contém um alimento recém-marcado, aparece um aviso com o atalho **"Ver plano"**. Nada é apagado nem regenerado.
- **Plano Semanal:** em cada refeição aberta há o botão discreto **"Não gosto de um alimento desta receita"**.
  - Mostra chips com o prato e os ingredientes, sem quantidade (ex.: "200 g de peito de frango" → "Peito de frango").
  - Tocar num chip adiciona o alimento à lista e oferece **"Trocar agora"**, que usa o fluxo de troca já existente, e **"Ver minha lista"**. **Nada é trocado automaticamente.**
  - A lista é relida do banco antes de gravar, para não sobrescrever com cache antigo.
- **Fora de escopo:** o Onboarding manteve só a grade. Ele carrega e regrava a lista inteira, então itens de texto livre **não se perdem** ao refazer o onboarding.

### Etapa 4 — ferramenta extra
- `scripts/smoke-edge-functions.ts`: roda o `index.ts` **real** de meal-plan e meal-swap contra um Supabase **falso** em localhost, com `MOCK_AI=true`. Substitui o `supabase functions serve`, que exige Docker (ver seção 4).

## 3. Arquivos

| Arquivo | Mudança |
|---|---|
| `supabase/functions/_shared/foodPreferences.ts` | **novo** — módulo único (front + functions) |
| `supabase/functions/_shared/foodPreferences.cases.ts` | **novo** — casos de paridade (vitest + deno) |
| `supabase/functions/_shared/foodPreferences.test.ts` | **novo** — deno test |
| `supabase/functions/_shared/aiGuard.ts` | **novo** — laço gerar/validar/regenerar/sanitizar |
| `supabase/functions/_shared/recipeGuards.ts` | **novo** — regras por função + parse movido |
| `supabase/functions/_shared/recipeGuards.test.ts` | **novo** — deno test com IA simulada |
| `supabase/functions/_shared/userContext.ts` | limite de 80 itens; comentários de lint para Deno |
| `supabase/functions/meal-plan/index.ts` | prompt + guard |
| `supabase/functions/meal-swap/index.ts` | prompt + guard |
| `supabase/functions/analyze-fridge/index.ts` | prompt + guard (só receitas) |
| `supabase/functions/nutrition-chat/index.ts` | prompt + 1 regeneração com log |
| `src/lib/foodPreferences.ts` | **novo** — reexport do módulo único |
| `src/lib/foodPreferences.test.ts` | **novo** — paridade + integração com os dados do app |
| `src/lib/dislikedFoods.ts` (+ `.test.ts`) | **novo** — mesclar/remover/detectar itens novos/achar no plano |
| `src/components/preferencias/DislikedFoodsEditor.tsx` (+ `.test.tsx`) | **novo** — campo livre |
| `src/pages/Preferencias.tsx` | campo livre, retorno de "Outra restrição", aviso "Ver plano" |
| `src/pages/PlanoSemanal.tsx` | "Não gosto de um alimento desta receita" |
| `scripts/smoke-edge-functions.ts` | **novo** — smoke test sem Docker |

## 4. Verificação das Edge Functions

### O que foi checado (todos passam)

| Comando | Resultado |
|---|---|
| `npx tsc -p tsconfig.app.json --noEmit` | 0 erros |
| `npm run lint` (eslint, projeto todo) | 0 erros, 0 avisos |
| `npx vitest run` | 4 arquivos, **53 testes** passando |
| `deno check` (4 `index.ts` + todos os `_shared/*.ts`) | 0 erros (12 arquivos) |
| `deno lint --rules-exclude=no-import-prefix` (4 funções + `_shared`) | 0 problemas |
| `deno test --no-lock supabase/functions/_shared/` | **62 testes** passando |
| `npm run build` | build ok (PWA gerado) |
| `deno run -A --no-lock scripts/smoke-edge-functions.ts` | 11/11 checagens ok |

Deno 2.9.7 foi instalado via `winget install DenoLand.Deno`. Ele só entra no PATH depois de reabrir o terminal/VS Code.

Sobre o `deno lint`:
- **`no-import-prefix` foi excluída:** ela reclama dos imports `npm:`/`jsr:` inline, que são o padrão das Edge Functions do Supabase. Resolver exigiria um `deno.json` com import map, o que poderia mudar o deploy.
- **`no-control-regex`:** as regex de caracteres de controle em `userContext.ts` e `meal-plan` são intencionais. Ganharam `deno-lint-ignore` sem mudar o código.

Rodei o Deno sempre com `--no-lock`. Assim nenhum `deno.lock` fica no repositório para o deploy ler por engano.

### `supabase functions serve`
**Não foi possível.** A CLI (`npx supabase@2`, v2.118.0) respondeu:
`docker: command not found (podman also not found) — install Docker Desktop or Podman`.
O `serve` roda as funções dentro de containers Docker, e o Docker não está instalado nesta máquina.

**Alternativa executada:** `scripts/smoke-edge-functions.ts`.
- Sobe um Supabase falso em `localhost:54329`, que responde `/auth/v1/user` e os SELECTs de `profiles`, `user_preferences`, `user_goals`, `weight_log`, `user_routine_profile` e `ai_memory`.
- Roda o `index.ts` real com `MOCK_AI=true` e faz POST como um app faria.
- Com `disliked_foods = [Frango, Espinafre, Peixe]` e `Alergia a amendoim`:
  - **meal-plan:** respondeu 200, 7 dias × 4 refeições, sem nenhum termo proibido. "Omelete de espinafre" e "Frango grelhado" foram trocados pelas alternativas limpas ("Vitamina de banana" e "Carne moída com arroz"), o "Sanduíche de atum" saiu das opções e Espinafre/Frango saíram da lista de compras. O log registrou "SANITIZADA".
  - **meal-swap:** respondeu 200 com receita com nome e sem termo proibido.

Isso prova que o código real das funções (auth, contexto, prompt, guard, resposta HTTP) roda de ponta a ponta. Não prova o comportamento da IA real (ver abaixo).

### O que os testes cobrem
- **Módulo de termos:** todos os pontos pedidos, rodando igual no vitest e no deno:
  - `buildForbiddenTerms`, `findForbiddenHits`, `buildForbiddenPromptLine`, `scanForViolations`, `sanitizeTextField`, `sanitizeIngredientList`;
  - acento, plural, sinônimo cilantro/coentro, categoria peixe, alergia a amendoim;
  - "ervilha" × "berinjela", "cebola" × "cebolinha", "leite" sem expandir para derivados, "leite de amêndoas";
  - "queijo minas", "carne moída", "grão-de-bico";
  - negação ("sem cebola"), intolerância à lactose × "sem lactose".
- **Fluxo com IA simulada** (`recipeGuards.test.ts`):

  | Caso | meal-plan | meal-swap |
  |---|---|---|
  | (a) resposta limpa → 1 chamada, sem regeneração | ✔ | ✔ |
  | (b) proibido na 1ª, limpo na 2ª → regenera 1 vez e entrega o limpo; o feedback diz à IA o que violou | ✔ | ✔ |
  | (c) proibido sempre → 3 chamadas, sanitiza, `console.warn`, resultado sem o termo, nome e ingredientes nunca vazios | ✔ | ✔ |
  | (d) JSON inválido/vazio → não lança; devolve `null` e a função responde o mesmo erro 500 amigável de antes | ✔ | ✔ |

  Também cobertos:
  - proibido na 1ª + JSON inválido na 2ª → sanitiza a 1ª;
  - erro HTTP 429/402 na 1ª chamada → repassado como antes;
  - erro HTTP na regeneração → sanitiza a anterior;
  - tempo esgotado → sanitiza sem regenerar;
  - lista vazia → nunca regenera;
  - alternativa limpa é promovida com os macros dela;
  - parse preserva as regras antigas (cercas, vírgula sobrando, array solto, opções, suplementação).
- **analyze-fridge:** remove só as receitas proibidas; os alimentos da foto ficam intactos; formato inválido → erro controlado.
- **nutrition-chat:** resposta limpa → 1 chamada; sugestão proibida → exatamente 1 regeneração + aviso; citação legítima ou alimento perguntado pelo usuário não dispara regeneração.
- **Interface:**
  - frase natural vira vários itens;
  - grade e texto livre sem duplicata;
  - aviso para texto que não é alimento;
  - autocomplete;
  - Ajustar categoria;
  - remover da lista completa;
  - detecção de refeições do plano salvo que contêm o alimento novo.

### O que ainda NÃO é coberto
- **Comportamento da IA real (Gemini/GPT).** Nenhum teste chamou o gateway. Não sei com que frequência o modelo vai obedecer à regra na 1ª tentativa, nem quanto tempo/custo as regenerações vão somar em produção.
- **As telas no navegador.** `/preferencias` e `/plano-semanal` exigem login, e o login só funciona com o Supabase de produção, que não foi usado. Os componentes foram testados com Testing Library, mas o visual precisa do roteiro manual abaixo.
- **analyze-fridge e nutrition-chat pelo `index.ts` real:** eles não têm `MOCK_AI`, então o smoke test não os executa. A lógica deles está coberta pelos testes do guard.
- **APK:** não foi gerado nem testado nesta rodada.

### O que encontrei e corrigi durante a verificação
- Um termo conceitual "lactose" faria "iogurte **sem lactose**" contar como violação. Agora "lactose"/"glúten" viram listas de alimentos, não termos, e "sem X" é tratado como negação.
- O extrator de alergia devolvia o nome sem acento ("Camarao"). Agora extrai do texto original.
- A rede de segurança final do guard varria o objeto inteiro. Na geladeira, isso censuraria os alimentos **identificados na foto**. Restringi a checagem ao escopo de cada função.
- `deno-lint-ignore` precisa estar na linha imediatamente anterior. Com o `eslint-disable-next-line` que já existia, um dos dois sempre falhava. Passei a usar `deno-lint-ignore` acima e `eslint-disable-line` na própria linha.

## 5. Casos de borda (resultado real)

- **"leite" × "leite de amêndoas":** quem marca "Leite" **continua recebendo** leite de amêndoas, de coco, de aveia, de soja, de castanha e de arroz (exceções explícitas).
  - **Decisão:** bloquear seria um bug claro, porque a grade tem "Leite" e "Leite de amêndoas" como itens separados.
  - "Leite" **bloqueia** o que contém a palavra: café com leite, leite em pó, **doce de leite**, **creme de leite**, **leite condensado** e "leite sem lactose". **Não bloqueia** queijo, iogurte ou manteiga (sem expansão para derivados, como pedido).
  - **Mantive assim:** doce/creme de leite são feitos de leite e o nome é explícito. Liberá-los seria um julgamento de gosto que o sistema não tem como fazer.
- **Alergia a leite / APLV:** aí sim expande para derivados (queijo, iogurte, manteiga…), mas continua permitindo bebidas vegetais.
- **Intolerância à lactose:** bloqueia laticínios, mas permite "X sem lactose"/"zero lactose" e bebidas vegetais.
- **Alergia ao glúten:** bloqueia trigo, pão, macarrão, bolo… e **aveia** (risco de contaminação cruzada; escolha conservadora). Permite "pão de queijo", "sem glúten" e cuscuz de milho.
- **Duas palavras:** "Queijo minas" bloqueia "queijo minas frescal", mas **não** "queijo prato". "Carne moída" bloqueia "carne moída", mas não "carne assada".
- **Hífen:** "Grão-de-bico" = "grão de bico" = "grãos-de-bico".
- **"Batata" × "batata-doce":** são itens separados na grade, então "Batata" não bloqueia batata-doce, baroa nem salsa.
- **Sanitizador:** nunca devolve lista de ingredientes vazia nem receita sem nome. Testado nos dois casos, inclusive quando **todos** os ingredientes são proibidos.

### Formatos de alergia/restrição
**Reconhecidos:**
- Alergia a/ao/à/aos/às X: "Alergia a camarão", "Alergia ao glúten", "alergia à castanha", "alergia aos ovos", "alergia às nozes".
- Alérgico/alérgica a X, com vários itens: "Alérgico a camarão e amendoim".
- "Alergia: kiwi".
- Intolerância à/a lactose: "Intolerância à lactose", "intolerância a lactose", "intolerante à lactose".
- "restrição a soja", "alergia a proteína do leite".
- "celíaco", "doença celíaca", "APLV", "sem glúten", "sem lactose".
- "Vegetariano" e "Vegano" (bloqueiam carnes; o vegano também bloqueia ovos, laticínios e mel).
- Todas as restrições prontas da tela ("Intolerância à lactose", "Alergia ao glúten", "Alergia a frutos do mar", "Alergia a amendoim").

**NÃO reconhecidos:** vão só como texto para a IA, sem bloqueio verificado.
- "não posso comer camarão", "evito glúten", "camarão me faz mal";
- alimento antes da palavra: "camarão (alergia)", "camarão - alergia";
- siglas além de APLV.

A tela avisa quando não reconhece e sugere o formato "Alergia a X". "Diabetes" e "Hipertensão" não são alimentos: continuam só no prompt, como antes.

## 6. Limitações conhecidas
- **IA real não testada** (ver seção 4).
- **Custo e tempo:** no pior caso, meal-plan faz 3 chamadas de ~16 mil tokens. O limite de 75 s evita estourar a Edge Function, mas planos que precisarem regenerar vão demorar mais.
- **JSON inválido na 1ª resposta não é regenerado.** Mantive o comportamento anterior (erro amigável e "Tentar novamente"), em vez de gastar mais chamadas.
- **meal-swap agora recusa resposta que não seja objeto JSON.** Antes, um array ou número passava direto para a tela e quebrava a refeição.
- **Palavras compostas não são reconhecidas:** "bacalhoada" não é detectada como peixe (só "bacalhau"); "moqueca de peixe" é.
- **"Carne" inclui porco e cordeiro**, não só carne bovina. Use **Ajustar** se quiser restringir.
- **Singular aproximado:** regras de português cobrem os casos comuns; plurais irregulares raros podem escapar.
- **Negação** só vale para "sem"/"zero" imediatamente antes do alimento.
- **nutrition-chat não sanitiza:** se a IA insistir após a regeneração, a resposta é entregue e o aviso fica no log (conforme pedido).
- **A sanitização de texto** pode gerar frases pouco naturais ("Grelhe a um ingrediente de sua preferência…"). Por isso ela é o último recurso, e no plano a alternativa limpa é preferida.
- **Lista limitada a 80 itens** (front e functions).

## 7. Banco de dados
**Nenhuma migration é necessária** (confirmado em `supabase/migrations/20260305042943_…sql`):
- `disliked_foods` já é `TEXT[]` sem limite de tamanho;
- `user_id` é `UNIQUE` (o `upsert` usado pela tela funciona);
- a RLS já cobre select/insert/update (e delete, em `20260806023322_…sql`) apenas da própria linha.

O texto livre é gravado na **mesma** coluna.

## 8. Deploy (não executado)

```bash
# Edge Functions — o _shared/ é empacotado automaticamente com cada função
npx supabase@2 functions deploy meal-plan meal-swap analyze-fridge nutrition-chat --project-ref icmyqmvcwzdfleuxyiux
```

O front (Preferências e Plano Semanal) sai no próximo deploy do site (Vercel) e, no app, num novo build:

```bash
npm run build:apk    # ou build:aab para a Play Store
```

As functions podem ir antes do front: a regra e a validação passam a valer para a lista que já existe. O front novo depende das functions só para o campo livre ter efeito.

## 9. Roteiro de teste manual

### App (web)
1. Em **Meu Perfil Alimentar**, marque "Peixe" na grade.
   - **Esperado:** aparece "Peixe: inclui tilápia, salmão, sardinha, atum e mais 17".
   - Clique em **Ajustar**, desmarque tudo menos "salmão" e aplique. **Esperado:** "Peixe" sai da grade e "Salmão" aparece como chip.
2. No campo livre, digite `não gosto de fígado, jiló e coentro` + Enter. **Esperado:** 3 chips.
   - Digite `coentros` + Enter. **Esperado:** nada novo (sem duplicata).
   - Digite `asdfgh`. **Esperado:** aviso gentil.
3. Em "Outra restrição", escreva `alergia a camarão`. **Esperado:** "Entendido: a IA nunca vai usar Camarão."
4. Salve. Se já houver plano com algum desses alimentos. **Esperado:** aviso "Seu plano atual tem N refeições com…", com **Ver plano**, e nada muda no plano.
5. Gere um novo plano. **Esperado:** nenhum fígado, jiló, coentro, cilantro, salmão ou camarão em nome, ingredientes, preparo, opções ou lista de compras.
6. Abra uma refeição, toque em **"Não gosto de um alimento desta receita"** e escolha um ingrediente.
   - **Esperado:** "foi adicionado… Nada foi trocado."
   - Clique em **Trocar agora**. **Esperado:** a nova refeição não tem o alimento.
   - Clique em **Ver minha lista**. **Esperado:** abre Preferências já na lista, com o item.
7. Na lista completa, remova um item e salve. **Esperado:** o item volta a poder aparecer em planos novos.
8. **Assistente:** peça "ideias de jantar". **Esperado:** não sugere os itens da lista.
   - Pergunte "salmão engorda?". **Esperado:** responde normalmente sobre salmão.
9. **Geladeira:** fotografe algo com coentro. **Esperado:** coentro aparece nos alimentos identificados, mas nenhuma receita sugerida o usa.
10. **Logs** (Supabase → Edge Functions → Logs): procure `[meal-plan] tentativa`, `regeneração` e `SANITIZADA`. Eles mostram com que frequência a IA real desobedece.

### APK
1. Gere com `npm run build:apk` e instale num aparelho.
2. Repita os passos 1, 2, 6 e 7. Atenção:
   - o autocomplete e os chips com o teclado virtual aberto;
   - o painel de chips no Plano Semanal em telas estreitas;
   - o link "Ver minha lista" rolando até a seção.
3. Modo avião:
   - **Esperado:** salvar mostra a mensagem de erro e o que foi digitado na tela não se perde.
   - Com a conexão de volta, **esperado:** salvar funciona.

## 10. Decisões tomadas sem consultar (seguras e reversíveis)
- **Módulo único em vez de espelho.** O front importa o arquivo das functions.
- **Alergias:** priorizadas e expandidas para derivados diretos. "Não gosto" nunca expande.
- **Aveia na lista de glúten.** Escolha conservadora (contaminação cruzada).
- **Vegetariano/Vegano viraram bloqueio verificado** (antes eram só texto no prompt).
- **Plano:** promover a alternativa limpa antes de sanitizar texto. **Geladeira:** remover receitas proibidas quando sobra alguma limpa.
- **JSON inválido na 1ª tentativa:** mantido o comportamento antigo (erro amigável, sem nova chamada).
- **Limites de tempo** para regenerar (75/40/45 s).
- **Deno:** `--no-lock`, e `no-import-prefix` excluída do lint, para não criar `deno.json`/`deno.lock` que possam mudar o deploy.
- **Smoke test** com Supabase falso no lugar do `functions serve` (sem Docker).
- **Limite da lista** subiu de 40 para 80 itens.

## 11. Teste com IA real (projeto de teste)

**Status: NÃO EXECUTADO.** Nenhuma chamada à IA real foi feita. Foram 0 chamadas, então não há números de violações, regenerações nem tempos.

O teste esbarrou em quatro bloqueios. Nenhum deles se resolve com segurança sem você:

| # | Bloqueio | Evidência |
|---|---|---|
| 1 | **Projeto de teste pausado** (status `INACTIVE`) | O deploy falhou com `Cannot retrieve service for project laehlabpoayhkglhavfi with current status 'INACTIVE'`. **Nenhuma função foi publicada.** |
| 2 | **Falta o secret `LOVABLE_API_KEY`** | Secrets existentes (só nomes): `MOCK_AI`, `SUPABASE_ANON_KEY`, `SUPABASE_DB_URL`, `SUPABASE_JWKS`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`. Sem a chave, analyze-fridge e nutrition-chat respondem erro 500. |
| 3 | **O secret `MOCK_AI` existe** | Se ele estiver `true`, meal-plan e meal-swap devolvem o plano fixo de teste, e não a IA real. O script detecta isso e para. |
| 4 | **`.env.test` sem usuário de teste** | O arquivo só tem `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY` e `VITE_SUPABASE_URL`. Faltam `TEST_USER_EMAIL` e `TEST_USER_PASSWORD`. |

### Checagens de segurança feitas
- **Projeto ligado:** `supabase/.temp/project-ref` = **`laehlabpoayhkglhavfi`** (teste). O `.env.test` também aponta para ele.
- **Atenção ao `config.toml`:** ele ainda tem `project_id = "icmyqmvcwzdfleuxyiux"` (**produção**). Por isso todo comando usa `--project-ref laehlabpoayhkglhavfi` explicitamente.
- A conta logada na CLI **não tem acesso** ao projeto de produção: ele nem aparece em `projects list`.
- **`.env.test` está no `.gitignore`.** Nenhum valor de senha, token ou chave foi impresso, commitado ou registrado.
- **Não reativei o projeto por conta própria.** Isso muda o estado da conta Supabase e, sem a chave da IA e o usuário de teste, não permitiria rodar o teste. Anotado como a opção mais segura.

### O que ficou pronto
- **Cabeçalho `x-evolua-guard`** nas 4 funções (commit `9c8bbaa`). Ele informa, por requisição, `attempts` (chamadas ao modelo), `regenerations` e `sanitized`. Só traz contagens, nenhum dado do usuário, e o corpo da resposta não mudou. Com ele dá para medir o custo real sem depender dos logs.
- **`scripts/test-ia-real.ts`** (commit `352d6e2`), rodável com `deno run -A --no-lock scripts/test-ia-real.ts`:
  - **Travas de segurança:**
    - aborta se o `.env.test` não apontar para `laehlabpoayhkglhavfi`;
    - nunca imprime credenciais;
    - aborta se detectar respostas de MOCK.
  - **Preferências do usuário de teste:** grava `disliked_foods = ["Fígado", "Jiló", "Peixe", "Coentro", "Leite"]` e `restrictions = ["Alergia a amendoim"]`. Guarda as originais e **restaura mesmo se der erro no meio**. Se o usuário não tinha linha, ela é apagada no fim.
  - **Chamadas:** 5 × meal-plan, 8 × meal-swap (refeições variadas, várias contendo o alimento proibido de propósito) e 5 × nutrition-chat ("Me sugira um jantar", "Me passa uma receita com peixe", "O que comer no lanche?", …).
    - O analyze-fridge só roda se `FRIDGE_IMAGE` apontar para uma foto. Não há imagem de teste no repositório, então por padrão é pulado com aviso.
  - **Teto de 25 chamadas REAIS ao modelo**, contando as regenerações internas pelo cabeçalho. Uma requisição só sai se o pior caso dela (3 no plano/troca, 2 no chat) ainda couber no teto. Sem regenerações, o roteiro usa 18.
  - **Varredura do resultado final** com o mesmo módulo do projeto:
    - meal-plan e meal-swap: resposta inteira, incluindo opções, lista de compras e dicas;
    - chat: mesma regra de citação legítima usada na função.
    - Conta violações por caminho (incluindo tilápia, salmão, atum, pasta de amendoim) e as menções a leite vegetal, que não podem ser bloqueadas.
  - **Tempos:** média, mínimo e máximo por função. Marca chamadas acima de 80% do limite de 150 s.
  - **Logs:** se `SUPABASE_ACCESS_TOKEN` estiver definido, consulta os logs do projeto de teste (API de analytics) e conta "regeneração" e "SANITIZADA".
  - As respostas completas vão para um arquivo temporário **fora do repositório**.
  - Testado até onde dá sem os bloqueios: `deno check` e lint ok. Ao rodar, para com segurança: `PARADO: Faltam no .env.test: TEST_USER_EMAIL, TEST_USER_PASSWORD`.

### Como destravar (na ordem)
1. **Reativar o projeto de teste:** Dashboard do Supabase → projeto *Evolua Plus* (`laehlabpoayhkglhavfi`) → **Restore project**. Espere o status ficar `ACTIVE`, pode levar alguns minutos.
2. **Cadastrar a chave da IA sem passar pelo histórico do terminal.**
   - Crie `.env.secrets.local` na raiz. Esse nome já é ignorado pelo git (regra `.env.*.local`). Coloque nele `LOVABLE_API_KEY=<sua chave>` e `MOCK_AI=false`.
   - Rode:
     ```bash
     npx supabase@2 secrets set --env-file .env.secrets.local --project-ref laehlabpoayhkglhavfi
     npx supabase@2 secrets list --project-ref laehlabpoayhkglhavfi   # confira só os nomes
     ```
   - A chave é a do gateway de IA da Lovable (`ai.gateway.lovable.dev`), a mesma que o projeto de produção recebe do Lovable Cloud. Se não houver como obter essa chave fora do Lovable, o teste com IA real precisa ser feito lá, ou as funções precisariam de outro provedor de IA configurável.
3. **Criar o usuário de teste**, se ainda não existir: Dashboard → Authentication → Add user (e-mail + senha, com "Auto confirm"). Acrescente ao `.env.test`:
   ```
   TEST_USER_EMAIL=...
   TEST_USER_PASSWORD=...
   ```
4. **Publicar e rodar:**
   ```bash
   npx supabase@2 functions deploy meal-plan meal-swap analyze-fridge nutrition-chat --project-ref laehlabpoayhkglhavfi --use-api
   deno run -A --no-lock scripts/test-ia-real.ts
   # opcional: SUPABASE_ACCESS_TOKEN=... para contar nos logs; FRIDGE_IMAGE=foto.jpg para a geladeira
   ```
5. **Depois do teste:** se os testes E2E dependem do mock, volte com `MOCK_AI=true`. Pause o projeto de novo, se quiser.

### Recomendação
**Ainda não dá para declarar pronto para produção com base em IA real**, porque o teste não rodou. O que está comprovado:
- a lógica de validação, com 62 testes Deno e 53 do vitest;
- o código real das funções de ponta a ponta com IA simulada (smoke test).

O que falta medir:
- quantas vezes o modelo desobedece na 1ª tentativa;
- quanto tempo as regenerações somam no meal-plan (a geração leva ~30–60 s e o limite para regenerar é 75 s);
- se as receitas sanitizadas ficam aceitáveis.

**Critério sugerido para liberar:**
- 0 violações no resultado final (garantido pela validação);
- regeneração em no máximo ~1 de cada 5 planos;
- nenhuma chamada acima de ~120 s.

**Se as regenerações forem frequentes,** o primeiro ajuste é repetir a lista proibida também na mensagem do usuário, não só no prompt de sistema. O segundo é pedir que a IA devolva um campo `"alimentos_evitados"`, para ela "pensar" na restrição antes de escrever o plano.
