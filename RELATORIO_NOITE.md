# Relatório da rodada noturna — Evolua Plus (app nativo)

Trabalho feito na branch **`feat/app-nativo-release`** (não foi mesclada em `main` —
revise os commits e faça o merge quando estiver satisfeito). Nenhum deploy foi feito,
nenhum banco de produção foi alterado, nenhum serviço pago foi usado. Todos os commits
estão pequenos e descritos individualmente (`git log feat/app-nativo-release`).

## Resumo rápido

- ✅ Auditoria do app nativo feita; 4 problemas reais corrigidos, 2 pontos documentados
  como "precisa testar em celular físico" (não dá para validar sem device).
- ✅ Exclusão de conta: **já existia**, completa e correta (não precisei implementar nada).
- ✅ Páginas `/privacidade` e `/termos` criadas (rascunho, precisa da sua revisão).
- ✅ Login Google nativo: código pronto atrás de uma flag desligada por padrão.
- ✅ Materiais de loja (textos, formulários de privacidade, checklist de mídia) em `store/`.
- ✅ TypeScript, lint, testes, build web e build nativo (APK + AAB) passando no final.
- ⚠️ 1 decisão de arquitetura tomada sozinho (ver seção "Decisões tomadas sozinho").
- ⚠️ Alguns itens exigem sua ação manual antes de publicar — lista completa no final.

---

## 1. Auditoria do app nativo

### Problemas encontrados e corrigidos

1. **Link de redefinição de senha/confirmação de cadastro quebrado no app nativo.**
   `resolveAppUrl()` (em `src/lib/appUrl.ts`) já existia para resolver exatamente esse
   problema — usa `VITE_APP_URL` se definida, senão cai para `window.location.origin`.
   O problema: `VITE_APP_URL` **nunca tinha sido definida no `.env` real**, só documentada
   como exemplo em `.env.example`. Resultado: dentro do app empacotado,
   `window.location.origin` é `https://localhost` (a origem local da WebView) — um link
   de e-mail que aponta pra isso é inútil fora do app. Corrigido adicionando
   `VITE_APP_URL="https://balanced-you-plan.vercel.app"` ao `.env` (que já é
   intencionalmente versionado neste projeto — contém só a URL pública e a chave anon do
   Supabase, nunca segredos). Isso corrige tanto o e-mail de redefinição de senha quanto
   o de confirmação de cadastro, que já usavam a mesma função.
   **Ação sua:** nenhuma, já está corrigido e versionado. Só confirme que
   `https://balanced-you-plan.vercel.app` é mesmo o domínio de produção atual (se você
   trocar de domínio no futuro, atualize essa variável).

2. **Teclado cobrindo campos de formulário.** `AndroidManifest.xml` não definia
   `android:windowSoftInputMode` na Activity — adicionado `adjustResize`, o padrão
   recomendado para apps com formulários dentro de uma WebView.

3. **`android:usesCleartextTraffic` não estava explícito.** Já era bloqueado por padrão
   (o `targetSdk` do projeto é 36, e o Android bloqueia HTTP puro por padrão desde a API
   28), mas deixei explícito (`false`) porque revisores de loja e ferramentas de auditoria
   de segurança costumam procurar essa declaração.

4. **Link externo do Checkout (`window.open` para a Kirvano) não é confiável dentro da
   WebView nativa.** Troquei para usar `@capacitor/browser` (abre no navegador do sistema)
   quando `Capacitor.isNativePlatform()`. **Nota:** o link real da Kirvano ainda não foi
   preenchido no código (`KIRVANO_CHECKOUT_URL = "#"` em `src/pages/Checkout.tsx`) — o
   checkout já tinha uma trava (`isPlaceholderCheckout()`) que impede o usuário de seguir
   com um link inválido. Isso não é algo que eu deveria preencher sozinho.

### Pontos revisados sem necessidade de mudança de código

- **Botão voltar do Android**: o Capacitor já trata isso por padrão (volta no histórico da
  WebView; sem histórico, fecha o app). Não há nada de específico do projeto que quebre
  esse comportamento (React Router usa `BrowserRouter`, compatível com o histórico nativo
  do WebView). **Não consegui testar em dispositivo real** — peço que você confirme ao
  instalar o APK, navegando por 2–3 telas e testando o botão voltar físico/gesto.
- **Safe areas / notch**: já havia tratamento com `env(safe-area-inset-bottom)` em vários
  componentes (`MobileTabBar`, `Onboarding`, `PlanoPersonalizado`, `CameraCapture`) e
  `viewport-fit=cover` no `index.html` (de uma rodada anterior). Status bar sincronizada
  com o tema claro/escuro (implementado na rodada anterior, em `src/hooks/useTheme.ts`).
- **Telas de carregamento/erro/offline**: já existiam e cobrem os casos principais —
  `OfflineScreen` (sem internet), `RouteErrorBoundary` (erro ao carregar uma rota),
  `ProtectedRoute`'s `Spinner`/`SetupError` (carregando dados / falha ao carregar).
  Nenhuma tela em branco identificada no fluxo revisado.
- **`console.log`/`console.debug` que exponham dados sensíveis**: nenhum encontrado.
  Existe um único `console.debug` em `src/lib/analytics.ts`, mas é condicional a
  `import.meta.env.DEV` — não roda em produção, e o payload é só o nome do evento de
  ativação (ex.: `"onboarding_completed"`), sem dado sensível.
- **Permissões do `AndroidManifest.xml`**: só `INTERNET` e `CAMERA`, ambas necessárias
  (a câmera é usada no Scanner de alimentos/geladeira, já documentada com comentário no
  próprio manifest). Nada para remover.
- **`targetSdk`/`compileSdk`**: ambos em 36 (o projeto já estava assim antes desta
  rodada). Até onde eu sei, a exigência mínima da Google Play desde meados/fim de 2025
  é `targetSdk 35` — 36 atende com folga. **Recomendo confirmar no Play Console no
  momento do envio**, já que essa exigência sobe todo ano e meu conhecimento tem um
  corte de tempo.
- **`minSdk`**: 24 (Android 7.0, ~2016). Razoável — cobre a esmagadora maioria dos
  aparelhos Android ativos sem exigir recursos muito antigos.

### Cadastro, login e recuperação de senha no app empacotado

- **Login e cadastro por e-mail/senha**: chamadas diretas à API REST do Supabase Auth,
  que funcionam normalmente de qualquer origem (não dependem de `window.location.origin`).
  Devem funcionar no app empacotado sem alteração.
- **Confirmação de cadastro e redefinição de senha por e-mail**: corrigido no item 1
  acima — o link agora aponta para o domínio web público em vez da WebView local. Esse
  é o comportamento esperado e recomendado (o usuário conclui a ação no navegador do
  celular ou do computador, depois volta a usar o app normalmente logado).
- **Login com Google**: já estava desativado no app nativo desde a rodada anterior
  (você escolheu essa opção quando perguntei). Nesta rodada, deixei o código do fluxo
  alternativo pronto, mas desligado — ver seção 4.

---

## 2. Exclusão de conta

**Já estava implementada e correta antes desta rodada** — não precisei criar nada:

- UI em `src/pages/Configuracoes.tsx` → botão "Excluir conta" com `ConfirmDialog`
  (confirmação explícita antes de excluir).
- Edge Function `supabase/functions/delete-account/index.ts`: identifica o usuário pelo
  token da sessão (nunca por um ID enviado do cliente), remove arquivos do Storage,
  todos os registros relacionados (diário, hidratação, peso, fotos de evolução, scanner,
  chat, memória/insights de IA, favoritos, preferências, metas, planos) e por fim o
  usuário de autenticação.

Revisei o código da função e ele já segue boas práticas de segurança (verificação de
token no servidor, uso de service role apenas no backend). Nenhuma mudança foi feita
nem deployada — a função já deve estar publicada, já que o app já a invoca em produção.

---

## 3. Páginas legais

Criadas: `src/pages/Privacidade.tsx` (`/privacidade`) e `src/pages/Termos.tsx`
(`/termos`), rotas públicas (sem exigir login), linkadas no rodapé do site
(`SiteFooter.tsx` — os links já existiam como placeholders `href="#"`, só troquei para
apontar às páginas reais) e em Configurações.

**Conteúdo**: cobre LGPD — dados coletados (cadastro, dados de saúde/alimentação,
interações com IA, fotos), uso de IA, Supabase como operador de dados, direitos do
titular (acesso, correção, exportação, exclusão) e como excluir a conta. Usa
`[EMAIL_DE_CONTATO]` como placeholder.

**⚠️ Isto é um rascunho gerado automaticamente. Precisa da sua revisão (idealmente com
apoio jurídico) antes de publicar** — em particular: substituir `[EMAIL_DE_CONTATO]`
pelo e-mail real de contato/DPO, e confirmar se a lista de dados coletados continua
precisa conforme o produto evoluir.

---

## 4. Login Google nativo (preparado, desligado)

Implementado atrás da flag `VITE_ENABLE_NATIVE_GOOGLE` (padrão `false`/ausente — com ela
desligada, o comportamento é idêntico ao da rodada anterior: botão oculto no app nativo).

**Por que precisou de um fluxo diferente do web**: o botão atual usa
`@lovable.dev/cloud-auth-js`, que faz um redirect de página inteira para uma rota
relativa (`/~oauth/initiate`) que só existe no domínio web publicado pela Lovable —
inexistente dentro da WebView local do app (`https://localhost`). Confirmei isso lendo
o código-fonte do pacote (`node_modules/@lovable.dev/cloud-auth-js/dist/index.js`), não
é uma suposição.

**Solução implementada**: `src/lib/nativeGoogleAuth.ts` usa
`supabase.auth.signInWithOAuth` (fluxo OAuth nativo do próprio Supabase) +
`@capacitor/browser` (abre o consentimento do Google no navegador do sistema, não na
WebView) + um deep link (`com.evoluaplus.app://login-callback`, intent-filter já
adicionado no `AndroidManifest.xml`) capturado por `App.addListener("appUrlOpen", ...)`
em `AuthContext.tsx`, que troca o código pela sessão via
`supabase.auth.exchangeCodeForSession()`.

Documentei o passo a passo completo (Google Cloud Console, provider no Supabase,
redirect URLs) em **`GOOGLE_LOGIN_NATIVO.md`**. Inclui os fingerprints SHA-1 do
keystore de release e do keystore de debug, para referência futura.

**Não consegui testar isso de ponta a ponta** — depende de abrir o navegador do sistema
e voltar via deep link, algo que só um celular/emulador real pode validar. Além disso,
só funciona de verdade depois que você criar o OAuth Client no Google Cloud e ativar o
provider no Supabase (documentado no arquivo acima). Até lá, mantenha a flag desligada.

---

## 5. Materiais de loja (`store/`)

- `store/textos-loja.md`: nome, descrição curta (78 caracteres) e completa, novidades
  da v1.0.0, categoria e palavras-chave sugeridas.
- `store/google-play-seguranca-dados.md` e `store/app-privacy-apple.md`: rascunho dos
  formulários de privacidade das duas lojas, baseado nos dados que o app realmente
  coleta (conferido na Edge Function de exclusão de conta e nos formulários do app).
  Ambos têm uma seção "Pendências" — principalmente **qual provedor de IA está por trás
  das Edge Functions**, que eu não consegui identificar só pelo código (as functions
  chamam uma API de IA através de uma variável de ambiente/segredo do Supabase, que não
  está no repositório).
- `store/screenshots-e-graficos.md`: quais telas capturar, tamanhos exigidos de ícone,
  gráfico de recursos (Google Play) e screenshots por tamanho de tela (App Store).

`PUBLICACAO.md` foi criado (não existia antes) com o passo a passo de publicação nas
duas lojas e um checklist consolidado do que depende de você.

---

## 6. Verificação final

Executado nesta ordem, todos passando:

1. `npx tsc --noEmit` — sem erros.
2. `npx eslint .` — sem erros.
3. `npx vitest run` — 1 teste (suíte mínima do projeto), passou.
4. `npx vite build` — build web ok, PWA gerado (`dist/sw.js`, `dist/workbox-*.js`).
5. `npx cap sync android` e `npx cap sync ios` — ok, `@capacitor/browser` registrado nos
   dois projetos nativos.
6. `./gradlew assembleRelease bundleRelease` — build nativo assinado, sucesso.

### Onde estão os arquivos gerados

- **APK**: `android/app/build/outputs/apk/release/app-release.apk` — **6.303.891 bytes
  (~6,0 MB)**.
- **AAB** (formato exigido pela Play Store): `android/app/build/outputs/bundle/release/app-release.aab`
  — **6.073.799 bytes (~5,8 MB)**.
- Ambos assinados com o keystore de release (`evolua-plus-keystore/evolua-release.jks`,
  fora da pasta do projeto — ver seção "Keystore" abaixo). Confirmei a assinatura com
  `apksigner verify`: certificado `CN=Evolua Plus`, SHA-256
  `F9:91:6E:6E:F2:E3:0C:36:A9:6E:2B:D3:06:9B:81:7A:78:FD:D4:13:F6:5C:E7:2A:06:52:C2:96:B1:80:B9:51`.

### Como instalar o APK no seu celular

1. Transfira `app-release.apk` para o celular (cabo USB, Google Drive, WhatsApp para
   você mesmo, etc.).
2. No celular, abra o arquivo pelo Gerenciador de Arquivos — o Android vai pedir para
   permitir "instalar apps de fontes desconhecidas" para o app usado para abrir o
   arquivo (Chrome, Arquivos, etc.). Permita e continue a instalação.
3. Abra o app e teste o fluxo completo: cadastro, login, scanner, diário, configurações
   e — importante — o botão voltar físico/gesto e o comportamento offline (ative o modo
   avião com o app aberto).

---

## Decisões tomadas sozinho (e por quê)

1. **Google login no app nativo: código pronto, mas mantido desligado por padrão**
   (`VITE_ENABLE_NATIVE_GOOGLE=false`). Essa era a opção mais segura e reversível: o
   fluxo depende de configuração externa (Google Cloud + Supabase) que só você pode
   fazer, e eu não conseguiria testar o resultado sem um dispositivo real. Ligar por
   engano um fluxo não testado e não configurado poderia quebrar o login para usuários
   reais — a flag desligada garante que nada muda até você decidir e configurar.
2. **`.env` com `VITE_APP_URL` adicionada em vez de mudar o código de `resolveAppUrl()`**:
   a função já existia exatamente para resolver esse problema; faltava só a variável.
   Corrigir configuração em vez de reescrever lógica já correta é a mudança mínima e
   mais segura.
3. **Removido o link "Cookies" do rodapé** (`SiteFooter.tsx`) que apontava para `href="#"`
   sem nenhuma página de cookies correspondente e sem uso de cookies de terceiros
   identificado no código. Removi em vez de criar uma página vazia/genérica sobre
   cookies que não refletisse a realidade do app.
4. **Build do Android usando JDK 21 em vez do JDK 25 instalado por padrão** (ver seção
   "Problema de ambiente" abaixo) — não modifiquei nenhum arquivo do projeto por causa
   disso (a incompatibilidade é do Gradle com o JDK, não do projeto), só documentei.

Nenhuma dessas decisões alterou design, rotas ou a lógica de autenticação existente
(fora do que a própria tarefa pediu — o scaffolding do Google nativo, que fica inerte
com a flag desligada).

---

## Problema de ambiente encontrado: JDK 25 incompatível com o Gradle deste projeto

A máquina tem o JDK 25 (Eclipse Adoptium) como padrão, mas o Gradle 8.14.3 usado pelo
projeto (`android/gradle/wrapper/gradle-wrapper.properties`) **falha ao rodar builds de
release** nele (`Unsupported class file major version 69`). Encontrei um JDK 21 já
instalado nesta máquina (`C:\Users\migue\.jdks\jbr-21.0.11`, provavelmente de uma
instalação anterior do Android Studio/IntelliJ) e usei-o para gerar os builds desta
rodada, definindo `JAVA_HOME` manualmente só para esses comandos.

**Não alterei os scripts `build:apk`/`build:aab` do `package.json` para fixar esse
caminho** porque é específico desta máquina (poderia sumir numa atualização do
Android Studio) e não seria portátil para outra máquina ou CI. Isso significa que, se
você rodar `npm run build:apk` ou `npm run build:aab` diretamente, **pode falhar** com
o mesmo erro, a menos que:

- Defina `JAVA_HOME` para um JDK 17 ou 21 antes de rodar (no PowerShell:
  `$env:JAVA_HOME = "C:\Users\migue\.jdks\jbr-21.0.11"` só nessa sessão do terminal), ou
- Instale um JDK 17 LTS "oficial" (ex.: Temurin) e aponte `JAVA_HOME` para ele de forma
  permanente (Configurações do Sistema → Variáveis de Ambiente).

Recomendo a segunda opção a médio prazo, para não depender de um JDK que veio "de
brinde" com outra ferramenta.

## Keystore de release — não esqueça o backup

- Arquivo: `evolua-plus-keystore\evolua-release.jks`, na pasta
  `Imersao Furia das linguagens 2026` (**um nível acima** da pasta do projeto
  `balanced-you-plan`, dentro do seu OneDrive — portanto já tem backup automático na
  nuvem via OneDrive, mas confirme que a sincronização está ativa).
- Senhas: `android/keystore.properties` (dentro do projeto, mas no `.gitignore` — nunca
  vai para o Git). Alias: `evolua-plus`.
- **Sem esses dois arquivos, não é possível publicar nenhuma atualização futura do app
  na Play Store** (o Android exige que toda atualização seja assinada com a mesma
  chave). Faça uma cópia extra desses dois arquivos em outro lugar (ex.: um gerenciador
  de senhas ou outro provedor de nuvem), pois depender só do OneDrive é um único ponto
  de falha.

---

## O que ainda falta / depende de você

Veja também o checklist em `PUBLICACAO.md`. Resumo:

1. Revisar e aprovar `/privacidade` e `/termos` (trocar `[EMAIL_DE_CONTATO]`).
2. Informar qual provedor de IA está por trás das Edge Functions, para os formulários
   de privacidade das lojas.
3. Preencher o link real da Kirvano quando o checkout estiver pronto para produção.
4. Testar o APK em um celular Android real (botão voltar, offline, formulários,
   scanner) — vários pontos desta auditoria não puderam ser validados sem device físico.
5. Fazer backup extra do keystore (ver seção acima).
6. Se quiser habilitar o login Google nativo: seguir `GOOGLE_LOGIN_NATIVO.md`.
7. Resolver o `JAVA_HOME`/JDK antes de rodar `npm run build:apk`/`build:aab` você mesmo
   (ver seção "Problema de ambiente").
8. Contas de desenvolvedor (Google Play US$ 25, Apple Developer US$ 99/ano) e, para
   iOS, acesso a um Mac com Xcode — nada disso pôde ser preparado por mim.
9. Revisar os rascunhos em `store/` antes de submeter às lojas.
10. Fazer o merge de `feat/app-nativo-release` para `main` quando estiver satisfeito com
    a revisão (não fiz isso automaticamente).

Nenhuma tarefa do pedido original ficou sem tentativa — os itens acima são os que
exigem uma decisão, credencial ou dispositivo que só você tem.
