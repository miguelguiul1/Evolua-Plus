# Login com Google no app nativo (Android/iOS)

Hoje o botão **"Continuar com Google"** fica **oculto** quando o app roda como APK/AAB.
O código do fluxo nativo já existe, mas está atrás da flag `VITE_ENABLE_NATIVE_GOOGLE`
(padrão `false`) — com ela desligada, nada muda em relação ao comportamento atual.

## Por que precisou de um fluxo diferente do web

O botão do Google no site usa `@lovable.dev/cloud-auth-js`, que faz
`window.location.href = "/~oauth/initiate?..."` — uma rota relativa que só existe no
domínio web publicado pela Lovable. Dentro do app empacotado, a origem é local
(`https://localhost`), então essa rota não existe e a tela fica em branco/erro.

A solução implementada (`src/lib/nativeGoogleAuth.ts`) usa o suporte nativo do próprio
Supabase para OAuth + deep link:

1. `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: "com.evoluaplus.app://login-callback", skipBrowserRedirect: true } })`
   gera a URL de consulta ao Google sem redirecionar a página atual.
2. Essa URL é aberta no **navegador do sistema** via `@capacitor/browser` (não na
   WebView do app — necessário para o Google aceitar o login e para o Chrome/Safari
   conseguir devolver o controle ao app).
3. Quando o Google termina, ele redireciona para
   `com.evoluaplus.app://login-callback?code=...`. O Android (via `AndroidManifest.xml`,
   intent-filter já adicionado) entrega essa URL de volta para o app.
4. `App.addListener("appUrlOpen", ...)` (registrado em `AuthContext.tsx`, só quando a
   flag está ligada) recebe a URL e chama `supabase.auth.exchangeCodeForSession(url)`,
   completando o login. O `AuthProvider` já escuta `onAuthStateChange`, então a sessão
   aparece automaticamente em todo o app.

## O que falta para ligar de verdade (passo a passo)

### 1. Google Cloud Console

1. Acesse [console.cloud.google.com](https://console.cloud.google.com/) → crie/selecione
   um projeto.
2. **APIs e serviços → Tela de consentimento OAuth**: configure como "Externo", preencha
   nome do app, e-mail de suporte e domínios autorizados.
3. **Credenciais → Criar credenciais → ID do cliente OAuth**:
   - Tipo de aplicativo: **Web application** (não "Android" — quem fala com o Google é o
     Supabase, no servidor, não o app diretamente).
   - Em "URIs de redirecionamento autorizados", adicione:
     ```
     https://icmyqmvcwzdfleuxyiux.supabase.co/auth/v1/callback
     ```
   - Guarde o **Client ID** e o **Client Secret** gerados.
4. Se também usar Google Sign-In nativo do Android futuramente (não é o caso aqui, já
   que usamos o fluxo web do Supabase), o SHA-1 do certificado seria pedido. Fica
   registrado abaixo só para referência/backup:
   - **Release** (`evolua-plus-keystore/evolua-release.jks`, alias `evolua-plus`):
     `SHA1: 5E:3D:6D:EF:1A:D3:9B:49:E9:05:E1:0C:BD:A6:60:2A:8B:96:A6:48`
   - **Debug** (`~/.android/debug.keystore`, alias `androiddebugkey`):
     `SHA1: 0A:00:DA:1A:0C:9B:25:30:C1:AB:05:8C:C8:0A:AA:9F:34:75:71:B0`

### 2. Painel do Supabase

1. **Authentication → Sign In / Providers → Google**: ative e cole o Client ID e Client
   Secret do passo anterior.
2. **Authentication → URL Configuration → Redirect URLs**: adicione
   ```
   com.evoluaplus.app://login-callback
   ```
   (mantenha as URLs web existentes, como `https://balanced-you-plan.vercel.app/**`).

### 3. No projeto

1. No `.env` (local) ou nas variáveis de ambiente do build (CI/Vercel se algum dia
   buildar o app nativo lá), defina:
   ```
   VITE_ENABLE_NATIVE_GOOGLE=true
   ```
2. Rode `npm run build:apk` (ou `build:aab`) normalmente — nada mais precisa mudar no
   código.

### 4. Testar

Só é possível validar de verdade em um **celular Android real ou emulador com Google
Play Services** (o fluxo abre o Chrome/navegador do sistema e depende do retorno via
deep link, o que não é testável no ambiente onde este código foi escrito). Ao testar:

- Toque em "Continuar com Google" → deve abrir o navegador do sistema (não a tela do
  app) pedindo para escolher a conta Google.
- Após escolher a conta, o navegador deve fechar sozinho e o app deve mostrar o usuário
  logado (Dashboard/Onboarding).
- Se nada acontecer após escolher a conta: confira se o Redirect URL
  `com.evoluaplus.app://login-callback` está cadastrado no Supabase (passo 2) e se o
  `AndroidManifest.xml` ainda tem o intent-filter do deep link (não deveria ter sido
  removido, mas vale checar após qualquer `cap sync`/regeneração de ícones).

### iOS

O mesmo `redirectTo` (`com.evoluaplus.app://login-callback`) precisa ser registrado como
URL Scheme no `Info.plist` do projeto iOS (`CFBundleURLTypes`), o que ainda **não foi
feito** — hoje o Info.plist não declara nenhum URL scheme customizado. Isso deve ser
adicionado pelo Xcode (Signing & Capabilities → URL Types) quando o login nativo Google
for habilitado também no iOS.
