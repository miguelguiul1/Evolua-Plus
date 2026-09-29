# App Store — "App Privacy" / Nutrition Labels (rascunho)

Rascunho para preencher o questionário "App Privacy" no App Store Connect, baseado no
código real do app. **Revisar antes de publicar** — este arquivo não substitui o
questionário oficial.

## Dados coletados e vinculados à identidade do usuário

| Tipo de dado | Coletado? | Vinculado ao usuário? | Usado para rastreamento? | Finalidade |
|---|---|---|---|---|
| Nome | Sim | Sim | Não | Funcionalidade do app |
| E-mail | Sim | Sim | Não | Funcionalidade do app (login) |
| Número de telefone | Sim (só no checkout) | Sim | Não | Processamento de pagamento |
| Dados de saúde (peso, altura, objetivo, restrições, diário alimentar) | Sim | Sim | Não | Funcionalidade do app |
| Fotos (scanner e evolução corporal) | Sim | Sim | Não | Funcionalidade do app |
| Conteúdo de usuário (mensagens ao assistente de IA) | Sim | Sim | Não | Funcionalidade do app |
| Identificadores (ID de usuário do Supabase Auth) | Sim | Sim | Não | Funcionalidade do app |

**Rastreamento (tracking) entre apps/sites de terceiros: não utilizado.** Não há SDK de
publicidade ou analytics de terceiros no código (`src/lib/analytics.ts` é 100% local,
não envia dados para nenhum servidor externo).

## "Dados usados para rastrear você": Não

## "Dados vinculados a você": Sim (nome, e-mail, telefone, dados de saúde, fotos, conteúdo do usuário, identificadores)

## "Dados não vinculados a você": Nenhum identificado no momento

## Base legal / finalidade declarada

Todos os dados acima são coletados para **funcionalidade do app** (App Functionality) —
ou seja, são necessários para o app operar (gerar planos, responder no assistente,
analisar fotos, autenticar o usuário). Nenhum dado é coletado para publicidade de
terceiros, analytics de terceiros, ou revenda de dados.

## Terceiros que recebem dados

- **Supabase** (banco de dados, autenticação e armazenamento de arquivos) — operador de
  dados, conforme descrito na Política de Privacidade.
- **Provedor de modelos de IA** (usado pelas Edge Functions de geração de cardápio,
  assistente e scanner) — recebe apenas os dados necessários para gerar a resposta
  solicitada. **Confirmar qual provedor antes de preencher o formulário oficial**, pois a
  Apple exige listar terceiros processadores relevantes conforme a política deles.
- **Kirvano** (processador de pagamento) — quando a integração de checkout estiver
  ativa, receberá nome/e-mail/telefone para processar a compra.

## Pendências antes de preencher o formulário oficial

1. Confirmar o provedor de IA por trás das Edge Functions para declarar corretamente.
2. Confirmar o fluxo final de dados do checkout com a Kirvano.
3. Confirmar se a conta Apple Developer usada já tem a política de privacidade pública
   (`/privacidade`) hospedada e acessível antes de submeter à revisão.
