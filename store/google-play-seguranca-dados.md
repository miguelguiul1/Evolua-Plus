# Google Play — Formulário "Segurança dos dados" (rascunho)

Baseado no código real do app (tabelas do Supabase usadas em `supabase/functions/delete-account`,
formulários em `src/pages/*.tsx` e permissões do `AndroidManifest.xml`). **Revisar e preencher
diretamente no Play Console** — este arquivo é um rascunho de apoio, não um substituto do
formulário oficial.

## O app coleta ou compartilha algum dos tipos de dados de usuário exigidos?

**Sim.**

## Categorias de dados coletados

### Informações pessoais
- **Nome** — coletado no cadastro e no checkout. Finalidade: funcionalidade do app,
  gerenciamento de conta. Compartilhado com: não. Opcional: não (cadastro)/depende (checkout).
- **E-mail** — coletado no cadastro e no checkout. Finalidade: funcionalidade do app
  (login), comunicação. Compartilhado com: não. Opcional: não.
- **Número de telefone** — coletado apenas na tela de checkout (para contato sobre a
  compra). Finalidade: comunicação, processamento de pagamento. Compartilhado com:
  processador de pagamento (Kirvano) quando a integração estiver ativa. Opcional: não,
  dentro do fluxo de compra.

### Saúde e fitness
- **Informações de fitness/nutrição** (peso, altura, objetivo, restrições alimentares,
  diário alimentar, hidratação, metas, fotos de evolução corporal) — coletadas
  diretamente do usuário. Finalidade: funcionalidade do app (personalização do plano
  alimentar e acompanhamento). Compartilhado com: provedor de IA, apenas para gerar as
  respostas/planos solicitados (não usado para treinar modelos de terceiros fora do
  nosso acordo). Opcional: alguns campos sim, outros necessários para o app funcionar.

### Fotos e vídeos
- **Fotos** — fotos tiradas no Scanner (alimento/geladeira) e fotos de evolução corporal
  enviadas pelo usuário. Finalidade: funcionalidade do app (análise por IA, histórico de
  evolução). Compartilhado com: provedor de IA (apenas as fotos do scanner, para análise).
  Opcional: sim, uso do scanner e envio de fotos de evolução são opcionais.

### Mensagens
- **Outras mensagens do usuário no app** — conversas com o assistente de IA. Finalidade:
  funcionalidade do app. Compartilhado com: provedor de IA. Opcional: sim.

### App activity
- **Interações no app** (favoritos, plano de refeições gerado, preferências de tema) —
  finalidade: funcionalidade do app e personalização. Não compartilhado com terceiros.

## Os dados são criptografados em trânsito?

**Sim** (HTTPS/TLS em todas as chamadas ao Supabase e às Edge Functions de IA;
`android:usesCleartextTraffic="false"` explícito no app).

## Os usuários podem solicitar a exclusão dos dados?

**Sim.** Em Configurações → Excluir conta (exclui conta de autenticação, arquivos e todos
os registros associados — implementado em `supabase/functions/delete-account`). Também
disponível por e-mail (ver Política de Privacidade, `/privacidade`).

## O app segue a Política de Dados do Usuário do Google Play?

A preencher após revisão final do fluxo de pagamento (Kirvano) e do provedor de IA usado,
confirmando os respectivos termos de processamento de dados.

## Pendências antes de preencher o formulário oficial

1. Confirmar qual provedor de IA está por trás das Edge Functions (`food-scan`,
   `nutrition-chat`, `meal-plan`, etc.) para declarar corretamente o compartilhamento de
   dados com terceiros.
2. Confirmar se/quando a integração real com a Kirvano for ativada, se ela recebe nome,
   e-mail e telefone diretamente do app ou coleta novamente na página de pagamento dela.
3. Confirmar se existe qualquer SDK de analytics/publicidade de terceiros — **não
   encontramos nenhum no código** (`src/lib/analytics.ts` apenas emite um evento local,
   sem enviar dados a serviços externos), mas vale reconfirmar antes de publicar.
