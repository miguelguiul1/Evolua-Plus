# Auditoria de segurança — Evolua Plus

Data: 30/09/2026 · Branch: `chore/seguranca` (a partir de `main` em `108a43f`)

Escopo: migrations e RLS, Storage, as 9 Edge Functions, prompt injection/XSS, segredos (código e
histórico do git), dependências, app Android/Capacitor, autenticação e privacidade/LGPD.

Regras seguidas: somente leitura na fase 1; nada foi aplicado em produção, nenhum deploy, nenhum
acesso ao Supabase de produção, nenhuma chave impressa. Onde a configuração só existe no painel
(Supabase/Vercel), o achado está marcado como **“verificar no painel”**.

> Status: **FASE 1 (auditoria)**. As seções "Correções aplicadas" e "O que depende de você"
> são preenchidas na fase 3.

---

## Achados

Classificação: **CRÍTICO** (explorável agora, dano grave) · **ALTO** · **MÉDIO** · **BAIXO**.

### ALTO

**A1 — Limite de uso da IA é só em memória e por instância; não há cota diária por usuário**
- `supabase/functions/_shared/guard.ts:41-53` (`rateLimit`), usado em todas as funções de IA.
- O mapa `buckets` vive na memória de cada instância da Edge Function. Ao escalar (várias
  instâncias, cold starts), o limite se multiplica e zera. Além disso, `buckets.clear()` quando passa de 5000
  chaves zera o limite de todos. Não existe teto por dia/mês. Uma conta criada por script pode
  chamar `meal-plan`/`meal-swap`/`nutrition-chat` em loop, e cada chamada pode virar até 3 chamadas à IA
  (regenerações, `aiGuard.ts:171`). Isso gasta os créditos do workspace da Lovable AI.
- Como corrigir: tabela `ai_usage (user_id, day, function, count)` com RLS sem acesso direto e
  uma função `consume_ai_quota(fn text, max int)` `SECURITY DEFINER` com `search_path` fixo,
  chamada no início de cada função (via client do usuário) e contando de forma atômica
  (`INSERT … ON CONFLICT DO UPDATE … RETURNING count`). Complementar com alerta de consumo no
  painel da Lovable. **Depende de você** (muda o comportamento das funções em produção).

**A2 — Não há consentimento explícito para dados sensíveis de saúde (LGPD art. 11, I)**
- `src/pages/Auth.tsx` (cadastro) e `src/pages/Onboarding.tsx`: não há checkbox nem aceite
  destacado. Peso, medidas, % de gordura, fotos corporais, restrições e alergias são dados de
  saúde, portanto dados sensíveis. Pela LGPD, o consentimento precisa ser específico e destacado,
  e "ao criar a conta você concorda" (Termos) não basta.
- Como corrigir: checkbox obrigatório no cadastro (e para quem já tem conta, no próximo login),
  com links para /privacidade e /termos, e gravar `consent_at`/`consent_version` em `profiles`.
  **Depende de você** (texto jurídico e fluxo).

**A3 — Política de privacidade incompleta para publicação**
- `src/pages/Privacidade.tsx`: e-mail do encarregado é o placeholder `[EMAIL_DE_CONTATO]`.
  Os provedores de IA não são nomeados. Pelo código, o gateway é a Lovable AI
  (`ai.gateway.lovable.dev`), e os modelos são `google/gemini-2.5-flash` e, no chat,
  `openai/gpt-5.6-sol`. Também não há menção à transferência internacional (LGPD art. 33).
  A frase "não são usados pelo provedor de IA para treinar modelos" é uma afirmação que
  você precisa confirmar no contrato da Lovable/Google/OpenAI.
- Como corrigir: ver a seção **Divergências LGPD**. **Depende de você** (texto jurídico).

**A4 — `android:allowBackup="true"`**
- `android/app/src/main/AndroidManifest.xml:4`.
- O backup do Android (Google Drive e `adb backup`) copia o armazenamento do WebView, incluindo o
  `localStorage` com o **refresh token** do Supabase, o cache do plano e o rascunho do onboarding
  (peso, idade, sexo). Quem restaura o backup em outro aparelho entra logado.
- Como corrigir: `allowBackup="false"` (e `fullBackupContent="false"`). **Corrigido na fase 2.**

### MÉDIO

**M1 — Entrada de texto sem limite real nas funções de IA (custo e prompt gigante)**
- `guard.ts:56` aceita corpo de até **12 MB** em todas as funções, inclusive nas só de texto.
- `nutrition-chat/index.ts:54` injeta `profile.memoria` (array vindo do **cliente**) inteiro no
  prompt, sem limite de itens nem de tamanho. `profile.hoje/semana/evolucao` também não são validados.
- `nutrition-tracker/index.ts:60` envia `dailyLog` (array do cliente) inteiro via `JSON.stringify`.
- Como corrigir: limitar o corpo das funções de texto (ex.: 64–256 KB), limitar
  `memoria` (itens × caracteres) e `dailyLog` (itens) e converter os números para `number`.
  **Corrigido na fase 2.** A recomendação extra (depende de você) é carregar a `ai_memory` do banco
  no servidor, em vez de aceitar do cliente.

**M2 — `profiles.is_premium` pode ser alterado pelo próprio usuário**
- `migrations/20260722091304…sql:2` cria a coluna. As policies de `profiles`
  (`20260305042943…sql:12-19`) permitem INSERT/UPDATE de **todas as colunas** da própria linha.
- Hoje o front não usa `is_premium` (grep sem ocorrências). O risco é **latente**: no dia em que o
  premium passar a depender dessa coluna, qualquer usuário vira premium com
  `supabase.from('profiles').update({ is_premium: true })`.
- Como corrigir: trigger que impede `authenticated` de mudar `is_premium` (só `service_role`
  ou webhook de pagamento). **Migration criada, NÃO aplicada** (fase 2).

**M3 — Bucket `progress` não está versionado: não dá para confirmar que é privado nem ver limites**
- A criação do bucket não está em nenhuma migration. As policies em `storage.objects` estão
  corretas (`20260722091304…sql:46-48` e `20260810020206…sql`): pasta `auth.uid()/…`, com SELECT,
  INSERT, UPDATE e DELETE só do dono. O front usa `createSignedUrls` (`Evolucao.tsx:54`),
  o que indica bucket privado, mas **se o bucket estiver `public = true`, qualquer pessoa com a URL
  pública lê a foto sem as policies**.
- Não há `file_size_limit` nem `allowed_mime_types`. A extensão do arquivo vem do nome
  escolhido pelo usuário (`EvolutionForm.tsx:67`), então é possível enviar `.html`/`.svg` ao bucket.
- Como corrigir: migration que força `public = false`, 10 MB e só `image/*`. **Migration criada,
  NÃO aplicada.** Verificar no painel: Storage → `progress` → "Public bucket" desligado.

**M4 — `delete-account` pode deixar fotos para trás**
- `delete-account/index.ts:25-28`: `list(userId, { limit: 1000 })` lê só a 1ª página, e o erro de
  `remove()` é ignorado. Com mais de 1000 arquivos, ou com falha no Storage, as fotos corporais
  continuam no bucket depois de a conta ser apagada.
- Positivo: o `userId` vem **só** do JWT verificado (`getUser`), não do corpo, então não dá para apagar a
  conta de outra pessoa. As tabelas do banco também têm `ON DELETE CASCADE` a partir de
  `auth.users`, inclusive `ai_memory`, `ai_insights` e `user_routine_profile`.
- Como corrigir: paginar até esvaziar, falhar se o `remove` der erro e incluir
  `user_routine_profile` explicitamente. **Corrigido na fase 2.**
- Recomendação extra (depende de você): exigir reautenticação (senha/OTP) antes de excluir. Hoje
  um token roubado basta.

**M5 — Logs das Edge Functions gravam a resposta bruta da IA (dados de saúde)**
- `food-scan/index.ts:118` (`console.error("Failed to parse AI response:", content)`),
  `nutrition-tracker/index.ts:104` (`"Parse error:", content`). A resposta contém o que a pessoa
  comeu e análises sobre ela. Os logs ficam no painel do Supabase, com outra retenção e outros acessos.
- Como corrigir: logar só o tamanho e o tipo do erro. **Corrigido na fase 2.**

**M6 — Exportação de dados incompleta (portabilidade, LGPD art. 18, V)**
- `src/pages/Configuracoes.tsx:110-117` exporta só `food_log`, `water_log`, `weight_log` e
  `user_goals`. A política promete "exportação dos seus dados". Ficam de fora perfil, preferências,
  conversas com a IA, memória, insights, histórico de scans, plano, favoritos, rotina e a lista de
  fotos.
- Como corrigir: incluir todas as tabelas do usuário. **Corrigido na fase 2.**

**M7 — Política de senha fraca (6 caracteres)**
- `Auth.tsx:281` e `ResetPassword.tsx:126,142` usam `minLength={6}`, que é o padrão do Supabase. A regra
  que vale é a do servidor.
- Como corrigir, **no painel** (Authentication → Policies/Providers → Email): mínimo de 8+ e exigir
  letras e números, e ligar "Leaked password protection" (se o plano permitir). Depois,
  alinhar o `minLength` do front. **Depende de você.**

**M8 — Vulnerabilidades em dependências de build (`npm audit`: 1 crítica, 4 altas)**
- `tar` (crítica, path traversal) via `@capacitor/cli`; `@capacitor/cli` e `@capacitor/assets`
  (altas); `sharp`/libvips (alta); `vite` (alta, só no servidor de dev).
- **Nenhuma vai dentro do APK nem do site publicado**: são ferramentas de build e de dev. O risco é na
  máquina de quem compila (extrair um tarball malicioso ou processar uma imagem maliciosa).
- Como corrigir: o `npm audit fix` sugere `@capacitor/cli@8.4.3`, que é um *downgrade*, e `vite@8`,
  que é uma major. Nenhum dos dois é seguro de aplicar sem testar. **Depende de você:** acompanhar os
  patches do Capacitor 8.5.x, planejar vite 6.4.3+/7 e usar `sharp` ≥ 0.35.5 quando sair.

**M9 — Release cai silenciosamente para assinatura debug**
- `android/app/build.gradle:42`: sem `keystore.properties`, `assembleRelease` assina com a
  chave debug, e é fácil distribuir esse APK por engano.
- Como corrigir: falhar o build de release quando não houver keystore, ou pelo menos exibir um
  `logger.warn`. **Depende de você** (pode afetar o CI e o fluxo atual).

**M10 — Política de privacidade diverge do código** (detalhes em **Divergências LGPD**).

### BAIXO

**B1 — CORS `Access-Control-Allow-Origin: *`** em todas as funções (`guard.ts:5`,
`delete-account` usa o `corsHeaders` do supabase-js). A autenticação é por header Bearer, não por
cookie, então um site de terceiros não consegue usar a sessão da vítima. Recomendação: restringir a
`https://balanced-you-plan.vercel.app`, `https://localhost` e `capacitor://localhost` (Capacitor)
e aos domínios de preview da Lovable. **Depende de você** (confirme todas as origens usadas).

**B2 — Site sem headers de segurança** (`vercel.json`): faltam `X-Content-Type-Options`,
`Referrer-Policy`, `X-Frame-Options` e `Permissions-Policy`. **Corrigido na fase 2** (sem CSP. Uma
CSP estrita precisa de testes com Supabase, PWA e Lovable, então **fica como recomendação**).

**B3 — Sessão do Supabase no `localStorage`** (`integrations/supabase/client.ts`, padrão do
supabase-js). No WebView, fica no armazenamento privado do app. Um XSS poderia roubá-la, mas **não
foram encontrados vetores de XSS** (ver seção Prompt injection). Recomendação futura: storage
nativo seguro (Keychain/Keystore) no app.

**B4 — Dados locais não são apagados no logout**: `evoluaPlano:<userId>` (plano),
`evolua:lista:*` (lista de compras), `evolua:onboardingDraft:v1` (peso, idade, sexo),
`evolua:achievements` e `evoluaNotificacoesLidas`. Isso pesa em aparelho compartilhado.
**Corrigido na fase 2.**

**B5 — FileProvider com escopo amplo**: `res/xml/file_paths.xml` usa `external-path path="."`.
O provider não é exportado (`exported="false"`), então só o app concede URIs pontuais. Recomendação:
restringir às pastas usadas pelo export de PDF e pelo compartilhamento. **Depende de teste no
aparelho.**

**B6 — Deep link com esquema próprio** `com.evoluaplus.app://login-callback`
(`AndroidManifest.xml:28`), por enquanto desligado (`VITE_ENABLE_NATIVE_GOOGLE`). Outro app pode
registrar o mesmo esquema. O PKCE reduz o risco. Recomendação: usar App Links verificados (https)
quando ativar.

**B7 — `verify_jwt` declarado só para 4 das 9 funções** (`supabase/config.toml`). O padrão já
é `true` e todas validam o JWT no código (`requireUser`/`getUser`), então é só uma questão de
consistência. **Corrigido na fase 2** (explicitado para as 9).

**B8 — Prompt injection (autoafetante)**: texto livre do usuário entra no *system prompt*
(preferências, restrições, "não gosto", notas de rotina, memória, objetivo). Há sanitização
(remoção de caracteres de controle e limite de tamanho, `userContext.ts:34-57`), e os blocos
são marcados como DADO. Como a IA não tem ferramentas nem acesso a dados de terceiros, o pior
caso é a pessoa "injetar" contra a própria conta. **Ver seção Prompt injection.**

**B9 — Dependência não usada**: `@lovable.dev/mcp-js` (adicionada em `e6adecf`) não é importada
em `src/`, `scripts/` nem `supabase/`. Recomendação: remover para reduzir a superfície. **Depende de
você** (confirme com a Lovable que não é usada pelo editor).

**B10 — `progress_photos.weight_log_id`** pode apontar para um `weight_log` de outra conta, porque a
FK não passa por RLS. Não vaza dados (a leitura continua bloqueada). O único efeito é que, se o dono do log o
apagar, a linha de foto do outro usuário cai em cascata. Recomendação: trigger que verifica se o log
pertence ao mesmo `user_id`.

**B11 — `chat_messages.role`** é livre (o usuário pode gravar `assistant`). Afeta só a própria conta.

### Verificado e OK (sem achado)

- **RLS**: todas as 15 tabelas de `public` têm RLS ativo e policies restritas ao dono
  (`auth.uid() = user_id`, ou `= id` em `profiles`). Não existe nenhuma `USING (true)`. O `anon` teve
  todos os privilégios revogados (`20260814161332…sql:1-16`, incluindo `ALTER DEFAULT PRIVILEGES`).
- **SECURITY DEFINER**: só `handle_new_user()`, com `SET search_path = public` e `EXECUTE`
  revogado de `PUBLIC/anon/authenticated`. As funções de validação e `update_updated_at_column` são
  `SECURITY INVOKER` com `search_path` fixo. **Não existem views.**
- **Edge Functions**: todas as 9 validam o JWT com `auth.getUser(token)` (assinatura verificada no
  servidor), tiram o `user_id` do token e leem o contexto do banco com o client do próprio usuário
  (RLS ativa, sem `service_role`). Só `delete-account` usa `service_role`, e com o id do token.
  Todas as funções de imagem validam o tipo (`data:image/png|jpeg|webp|heic`) e o tamanho (8 MB). As
  respostas de erro são genéricas e não vazam stack, SQL nem nomes internos.
- **Segredos**: o único segredo no repositório e no histórico (256 commits, todas as branches) é
  `VITE_SUPABASE_PUBLISHABLE_KEY`, um JWT com `role = anon`, **público por design**. Os outros campos do
  `.env` são `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID` e `VITE_APP_URL` (públicos). Não há
  `service_role`, `LOVABLE_API_KEY`, chave privada, token do GitHub/Google, keystore nem senha.
  `.env.test`, `keystore.properties`, `*.jks`, `*.keystore`, `.env.*.local` e `supabase/.temp` estão
  no `.gitignore` e **nunca** foram commitados.
- **XSS**: a resposta da IA no chat é renderizada com `react-markdown` v10 **sem** `rehype-raw`
  (HTML cru é ignorado, e URLs `javascript:` são neutralizadas pelo `urlTransform` padrão). As outras
  respostas da IA são renderizadas como texto pelo React. O único `dangerouslySetInnerHTML`
  (`components/ui/chart.tsx:70`) usa configuração estática de cores, sem dado do usuário.
  `action_route`/`route` passam por `<Link to>` do React Router (navegação interna).
- **Redirecionamento**: `resolveNext` (`lib/safeNext.ts`) só aceita rotas de uma lista permitida,
  então não há open redirect. `resetPasswordForEmail` e `emailRedirectTo` usam `VITE_APP_URL` fixo.
- **Android**: `usesCleartextTraffic="false"`. O APK de release não é `debuggable` (padrão do
  AGP). A `MainActivity` é `exported` por necessidade (LAUNCHER). O `FileProvider` não é exportado.
  Permissões: só INTERNET e CAMERA. O `capacitor.config.ts` não tem `server.url` (o app carrega os
  arquivos locais, não um site remoto) nem `allowNavigation`. `WebContentsDebugging` não está
  habilitado (o Capacitor só liga em build debug).
- **Botão Google no nativo**: fica oculto quando `VITE_ENABLE_NATIVE_GOOGLE` não é `true`
  (`Auth.tsx:319`). Mesmo se alguém forçar a chamada, `signInWithOAuth` depende do provider habilitado no
  Supabase e do redirect permitido, então não há brecha.

---

## Storage

| Bucket | Público? | Policies | Observação |
|---|---|---|---|
| `progress` (fotos de evolução) | **Verificar no painel.** O código usa URL assinada (1 h), o que indica privado | SELECT/INSERT/UPDATE/DELETE só na pasta `auth.uid()` | Sem limite de tamanho/tipo (M3) |

Nenhum outro bucket é referenciado no código. O scanner **não** guarda fotos: `scan_history`
recebe só o JSON do resultado (`FoodScanner.tsx:135`, `PortionScanner.tsx:83`, `Scanner.tsx:81`).

---

## Edge Functions

| Função | JWT (`getUser`) | user_id do token | Rate limit/min (memória) | Limite de entrada | Observações |
|---|---|---|---|---|---|
| analyze-fridge | ✅ | ✅ | 8 | imagem ≤ 8 MB, tipo validado | até 3 chamadas à IA por requisição |
| food-scan | ✅ | ✅ | 12 | imagem ≤ 8 MB; objetivo ≤ 300 | logava a resposta da IA (M5) |
| portion-scanner | ✅ | ✅ | 12 | imagem ≤ 8 MB | — |
| myth-checker | ✅ | ✅ | 15 | pergunta ≤ 500; corpo 12 MB (M1) | — |
| nutrition-tracker | ✅ | ✅ | 30 | `dailyLog` sem limite (M1) | logava a resposta da IA (M5) |
| nutrition-chat | ✅ | ✅ | 25 | 10 msgs × 4000; `memoria` sem limite (M1) | memória vem do cliente |
| meal-plan | ✅ | ✅ | 5 | corpo 12 MB (M1) | até 3 chamadas à IA |
| meal-swap | ✅ | ✅ | 15 | refeição e motivo limitados; corpo 12 MB (M1) | até 3 chamadas à IA |
| delete-account | ✅ | ✅ (só do token) | — | sem corpo | paginação do Storage (M4) |

CORS `*` em todas (B1). Cota diária: nenhuma (A1).

---

## Prompt injection e saída da IA

Onde o texto do usuário entra nos prompts:

| Origem | Onde entra | Tratamento |
|---|---|---|
| `user_preferences` (objetivo, restrições, gosta, não gosta) | system prompt de chat, geladeira, plano e troca | do banco via RLS; controle removido; 60 caracteres × 40/80 itens |
| `user_routine_profile` (refeições habituais, notas) | system prompt do plano | do banco; controle removido; 200 a 500 caracteres; marcado como "DADO, não instrução" |
| `ai_memory` | system prompt do chat | **vem do cliente** e não tinha limite (M1) |
| mensagens do chat | mensagens `user`/`assistant` | 10 × 4000 caracteres; `role` só `user`/`assistant` |
| pergunta do mito, objetivo do scan, alimento/quantidade | mensagem do usuário ou system | limitados (500/300/200/100) |

Risco: como a IA não tem ferramentas, não escreve no banco e só vê dados do próprio usuário, a
injeção só consegue piorar a resposta para a própria pessoa (por exemplo, burlar a lista de
proibidos). As respostas de plano, troca e geladeira passam por `generateWithGuard`, que varre e sanitiza os
alimentos proibidos. No front, as saídas são tratadas como texto (ver "XSS" acima).

---

## Dependências

`npm audit`: 15 vulnerabilidades (1 crítica, 4 altas, 8 moderadas, 2 baixas). As críticas e altas
estão listadas em M8 e todas são de build ou dev.

Dependências adicionadas nos últimos 30 commits: `@capacitor/*` (android, app, browser, core,
filesystem, ios, share, splash-screen, status-bar, cli, assets), `@lovable.dev/cloud-auth-js`,
`sharp`, `vite-plugin-pwa` e `@tailwindcss/typography` (só mudou de seção). Removidas:
`@hookform/resolvers`, `date-fns` e `zod`. Todas são pacotes oficiais conhecidos. A única
desnecessária é `@lovable.dev/mcp-js` (B9, mais antiga).

**Alerta do Windows Defender (`Trojan:JS/Tisifi.A`) no APK de debug**, investigado:
- Todas as 1258 entradas do `package-lock.json` vêm de `registry.npmjs.org`, sem tarball de URL
  estranha.
- Scripts de instalação existem só em pacotes conhecidos: `esbuild`, `@swc/core`, `core-js`
  (mensagem de doação) e `sharp` (binário libvips). Nenhum `postinstall` no projeto.
- O código-fonte não tem `eval`, `new Function` nem ofuscação. O único `fromCharCode` está em
  `scripts/test-ia-real.ts` (conversão base64 em teste local, fora do app).
- `index.html` não carrega scripts externos. `public/` tem só ícones, `robots.txt` e
  `placeholder.svg`.
- Conclusão: **não há causa real identificada**. Um APK é um ZIP com JavaScript minificado
  (bundle Vite + `cordova.js` do Capacitor). A família `Tisifi` é heurística e conhecida por falsos
  positivos em JS minificado/empacotado. Recomendação: enviar o APK ao VirusTotal e, se só o
  Defender acusar, reportar como falso positivo em
  https://www.microsoft.com/wdsi/filesubmission.

---

## Privacidade / LGPD

Dados de saúde coletados e destino:

| Dado | Tabela | Vai para a IA? |
|---|---|---|
| Peso, altura, idade, sexo, nível de atividade, esportes | `profiles`, `weight_log` | sim (plano, troca, chat) |
| Medidas corporais (cintura, quadril, braço, coxa, peito, pescoço), % de gordura, notas | `weight_log` | chat recebe peso e variação |
| Fotos corporais (antes/depois) | Storage `progress` + `progress_photos` | **não** |
| Objetivo, restrições/alergias, gosta/não gosta | `user_preferences` | sim |
| Rotina (horários, o que come, treino, notas livres) | `user_routine_profile` | sim (plano) |
| Diário alimentar, água, metas (kcal/macros, TMB/TDEE) | `food_log`, `water_log`, `user_goals` | sim (tracker, chat) |
| Conversas, memória e insights da IA | `chat_messages`, `ai_memory`, `ai_insights` | sim |
| Fotos de comida e geladeira | **não armazenadas**; só o JSON em `scan_history` | sim (imagem) |

Provedor de IA: Lovable AI Gateway → Google (Gemini 2.5 Flash) e OpenAI (chat).

Exclusão: o `delete-account` apaga o Storage do usuário e todas as tabelas (inclusive `ai_memory`),
e as FKs `ON DELETE CASCADE` garantem o resto. Ver M4. Retenção: não existe política automática,
e os dados ficam enquanto a conta existir.

### Divergências LGPD (código × /privacidade e /termos)

1. A política não cita **idade, sexo, nível de atividade, esportes, medidas corporais, % de gordura**
   nem o **perfil de rotina**, e todos são coletados.
2. A política diz que o histórico do scanner guarda as "fotos enviadas para análise". O código **não** guarda
   as fotos, só o resultado. (Corrigir o texto para refletir isso é favorável ao usuário.)
3. A política promete exportação dos dados, mas a exportação era parcial (M6, corrigido).
4. Não nomeia os provedores de IA nem a transferência internacional (A3).
5. Falta o e-mail do encarregado, que ainda é placeholder (A3).
6. Não há consentimento específico para dados sensíveis (A2).
7. A política diz "logs de erro" apenas técnicos, mas os logs das funções gravavam a resposta da IA (M5,
   corrigido).
8. Não informa a retenção de logs de terceiros (Supabase e Lovable).
