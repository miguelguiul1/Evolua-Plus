# Guia de publicação — Evolua Plus

Este arquivo reúne o passo a passo para publicar o app nas lojas e um checklist do que
ainda depende de você. Ele é atualizado conforme o projeto evolui — a seção
"Atualizações" no final registra o que mudou em cada rodada de trabalho.

## Visão geral do que já está pronto

- App Android empacotado via Capacitor, assinado com keystore de release
  (`android/keystore.properties`, fora do git — ver `RELATORIO_NOITE.md` para onde o
  `.jks` está guardado).
- `versionCode 1` / `versionName "1.0.0"`.
- Ícone adaptativo, splash claro/escuro, status bar sincronizada com o tema.
- Páginas legais em `/privacidade` e `/termos` (rascunho — precisam da sua revisão).
- Exclusão de conta funcional (Configurações → Excluir conta).
- `store/` com rascunhos de texto e dos formulários de privacidade das duas lojas.

---

## Google Play

### 1. Conta de desenvolvedor
1. Crie uma conta em [play.google.com/console](https://play.google.com/console) (taxa
   única de US$ 25).
2. Complete a verificação de identidade (pode levar alguns dias).

### 2. Criar o app no Play Console
1. "Criar app" → nome "Evolua Plus" → idioma padrão pt-BR → tipo "App" → gratuito
   (mesmo que tenha compras/assinaturas dentro do app, o app em si costuma ser listado
   como gratuito com compras no app).
2. Preencha a ficha da loja com o conteúdo de `store/textos-loja.md`.
3. Suba o ícone 512×512, o gráfico de recursos 1024×500 e os screenshots — ver
   `store/screenshots-e-graficos.md` para tamanhos e quais telas capturar.

### 3. Formulários obrigatórios
1. **Política de privacidade**: publique `/privacidade` (ex.:
   `https://balanced-you-plan.vercel.app/privacidade`) e cole a URL no Play Console.
   **Revise o texto antes** — hoje ele tem o placeholder `[EMAIL_DE_CONTATO]`.
2. **Segurança dos dados**: preencha usando `store/google-play-seguranca-dados.md` como
   base.
3. **Classificação indicativa**: responda o questionário do Play Console (o app trata de
   saúde/alimentação/corpo — responda com atenção, sem marcar "conteúdo genérico" sem
   revisar).
4. **Público-alvo e conteúdo**: declare que o app não é direcionado a crianças.

### 4. Enviar o AAB
1. Gere o AAB assinado: `npm run build:aab` (ver `RELATORIO_NOITE.md` para a versão mais
   recente gerada e onde ela está).
2. Play Console → Produção (ou, recomendado para o primeiro envio, **Teste fechado**) →
   "Criar nova versão" → suba `android/app/build/outputs/bundle/release/app-release.aab`.
3. Preencha "Notas da versão" com o texto de `store/textos-loja.md` ("Novidades desta
   versão").

### 5. Teste fechado (recomendado antes de ir para produção)
1. Crie uma lista de testadores (e-mails) em Teste fechado.
2. Envie o link de opt-in para você mesmo e mais 1–2 pessoas de confiança.
3. Use por alguns dias no celular real antes de promover para produção — este é o
   momento de pegar bugs que só aparecem fora do ambiente de desenvolvimento.

### 6. Revisão e publicação
- A revisão do Google costuma levar de algumas horas a poucos dias no primeiro envio.
- Depois de aprovado, promova de "Teste fechado" para "Produção" quando estiver
  confiante.

---

## App Store (iOS)

**Pré-requisito: você precisa de um Mac com Xcode instalado.** Nada disso pode ser feito
só pelo Windows/CLI.

### 1. Conta Apple Developer
1. Inscreva-se em [developer.apple.com](https://developer.apple.com/) (taxa anual de
   US$ 99).

### 2. Preparar o projeto no Xcode
1. Abra `ios/App/App.xcworkspace` no Xcode (não o `.xcodeproj`).
2. Em "Signing & Capabilities", selecione seu Team (conta Apple Developer) e confirme o
   Bundle Identifier `com.evoluaplus.app` (precisa bater com o registrado no App Store
   Connect).
3. Confirme a versão (`Marketing Version` = `1.0.0`, `Current Project Version` = `1`),
   espelhando o Android.
4. Rode `npx cap sync ios` sempre que o código web mudar antes de arquivar uma nova
   build.

### 3. App Store Connect
1. Crie o app em [appstoreconnect.apple.com](https://appstoreconnect.apple.com/) com o
   mesmo Bundle ID.
2. Preencha a ficha com `store/textos-loja.md` (descrição, subtítulo, palavras-chave).
3. Suba o ícone 1024×1024 e os screenshots por tamanho de tela — ver
   `store/screenshots-e-graficos.md`.
4. Preencha o questionário **App Privacy** usando `store/app-privacy-apple.md` como base.
5. Cole a URL de `/privacidade` no campo de política de privacidade.

### 4. TestFlight (recomendado antes da revisão)
1. No Xcode: Product → Archive.
2. Organizer → "Distribute App" → App Store Connect → Upload.
3. Em App Store Connect → TestFlight, adicione a build e convide testadores internos
   (sua própria conta) e depois externos, se quiser.
4. Teste no dispositivo físico antes de enviar para revisão.

### 5. Enviar para revisão
1. App Store Connect → selecione a build testada no TestFlight → "Enviar para revisão".
2. A revisão da Apple costuma levar de 1 a 3 dias.

### Pendências específicas do iOS (ver `RELATORIO_NOITE.md` para detalhes)
- Login nativo com Google (se algum dia habilitado) precisa do URL Scheme
  `com.evoluaplus.app://login-callback` cadastrado no `Info.plist` via Xcode — hoje não
  está cadastrado.
- Confirmar textos de permissão (`NSCameraUsageDescription` etc.) no `Info.plist` estão
  claros para o revisor da Apple.

---

## Checklist do que depende de você

- [ ] Revisar e aprovar o texto de `/privacidade` e `/termos` (trocar
      `[EMAIL_DE_CONTATO]` pelo e-mail real de contato/DPO).
- [ ] Decidir e informar qual provedor de IA está por trás das Edge Functions, para
      declarar corretamente nos formulários de privacidade das duas lojas.
- [ ] Preencher o link real da Kirvano em `KIRVANO_CHECKOUT_URL`
      (`src/pages/Checkout.tsx`) quando o checkout estiver pronto para produção.
- [ ] Criar a conta de desenvolvedor Google Play (US$ 25, única vez).
- [ ] Criar a conta Apple Developer (US$ 99/ano) e ter acesso a um Mac com Xcode.
- [ ] Tirar os screenshots reais (ver `store/screenshots-e-graficos.md`).
- [ ] Fazer backup do keystore de release e das senhas (`android/keystore.properties` +
      o `.jks` — caminho exato no `RELATORIO_NOITE.md`). **Sem isso não é possível
      publicar atualizações do app depois.**
- [ ] Testar o APK em um celular Android real antes do primeiro envio (ver
      `RELATORIO_NOITE.md` para como instalar).
- [ ] Se quiser ligar o login nativo com Google: seguir `GOOGLE_LOGIN_NATIVO.md`.
- [ ] Revisar a classificação indicativa/conteúdo sensível (app trata de saúde, peso e
      imagens corporais) nas duas lojas.

---

## Atualizações

### 2026-09-29 — Auditoria noturna e preparação para envio
- Corrigido: link de redefinição de senha por e-mail agora aponta para o domínio web
  público (antes apontava para `https://localhost` dentro do app nativo — quebrado).
- Adicionado: páginas `/privacidade` e `/termos`, exclusão de conta confirmada (já
  existia, agora documentada), scaffolding do login Google nativo atrás de flag.
- Adicionado: pasta `store/` com rascunhos de texto e formulários de privacidade.
- Ver `RELATORIO_NOITE.md` para a lista completa e detalhada desta rodada.
