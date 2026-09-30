# Adequação à LGPD — relatório

Data: 30/09/2026 · Branch: `chore/lgpd` (criada a partir de `chore/seguranca` em `7466971`)

> ⚠️ **Não é parecer jurídico.** Tudo o que é texto legal (Política de Privacidade, Termos de Uso
> e os textos das caixas de consentimento) é **RASCUNHO** e precisa de revisão de um advogado.
> O código descreve só o que o app realmente faz. **Fazer merge desta branch publica os rascunhos no
> site**, então revise antes do merge ou segure o deploy.

Nada foi aplicado no banco, não houve deploy e o Supabase de produção não foi usado.

Documentos relacionados: [`LGPD_MAPA_DADOS.md`](LGPD_MAPA_DADOS.md) (mapa de dados) e
[`SECURITY_AUDIT.md`](SECURITY_AUDIT.md) (auditoria de segurança).

---

## 1. O que mudou

| Commit | O que mudou |
|---|---|
| `c46e2e7` | `LGPD_MAPA_DADOS.md`: todos os dados pessoais por tabela, finalidade, destino e quais são de saúde (🩺); o que cada função de IA envia e para qual provedor |
| `f35a774` | Migration **pendente** `user_consents` (histórico de consentimento, RLS por dono, só inserção, hora do servidor, backfill do `user_metadata`). Testada num Postgres 16 local |
| `e2a88ec` | Consentimento explícito: tela após o login, diálogo antes de cada função de IA, card em Configurações para ver, conceder e revogar, e trava nas 8 Edge Functions de IA (403 `ai_consent_required`) |
| `a36011b` | Rascunho de `/privacidade` (reescrita) e de `/termos` (avisos de "não substitui profissional" e de alergias) |
| `1043109` | Onboarding exige 18+ (antes aceitava a partir de 12 anos; os Termos já diziam 18+) |
| `4ec7925` | Exportação completa (paginação, fotos em base64, consentimentos, dados de cadastro) e exclusão cobrindo `user_consents`; teste que garante que exportar e excluir cobrem as mesmas tabelas |
| `f5b71a8` | Texto do consentimento deixa de prometer "só você acessa" |

### Como o consentimento funciona

**Duas finalidades, duas caixas separadas, nenhuma pré-marcada:**
1. **Dados de saúde** (`health_data`): obrigatório para usar o app, porque tudo nele depende desses dados.
2. **Envio aos provedores de IA** (`ai_processing`): opcional; obrigatório só para as funções de IA.
   Só pode ser marcado depois do 1.

**Quando é pedido:**
- A **tela "Seus dados de saúde"** aparece logo após o login, **antes do onboarding**, para quem
  se cadastra por e-mail, para quem usa o Google e para **todas as contas já existentes** no próximo
  acesso. Sem o consentimento de saúde, o app fica bloqueado nessa tela, com as opções "Continuar",
  "Exportar ou excluir meus dados" (Configurações) e "Não concordo — sair".
- **Antes de cada função de IA** (9 pontos no front: assistente, plano, troca de refeição,
  scanner de alimentos, porções e geladeira, verificador de mitos, estimativa de calorias e análise
  do diário), um diálogo pede a autorização se ela faltar. "Agora não" cancela a ação.
- Quando o texto muda, basta subir `CONSENT_VERSION` em `src/lib/consent.ts`. Quem consentiu numa
  versão anterior é convidado a consentir de novo.

**Onde fica registrado:**
- `auth.users.user_metadata.consents`: estado atual (concedido, versão, data). **Funciona já,
  sem migration.** As Edge Functions leem esse campo pelo `auth.getUser()`, no servidor.
- `public.user_consents`: histórico só de inserção (cada concessão ou revogação vira uma linha, com
  a hora do servidor). Passa a ser gravado quando a migration for aplicada. Até lá, o app ignora a
  gravação do histórico sem quebrar. A migration faz o backfill a partir do `user_metadata`,
  preservando as datas.

**Revogar** (Configurações → Privacidade e consentimentos): um diálogo avisa o que deixa de
funcionar. Revogar os dados de saúde revoga também a IA e bloqueia o app na tela de consentimento.
Configurações continua acessível para exportar ou excluir. Revogar não apaga dados já guardados; o
texto aponta para exportar, excluir a conta ou apagar a memória da IA.

**Trava no servidor**: as 8 funções de IA respondem 403 se `health_data` e `ai_processing` não
estiverem concedidos. A trava confere só `granted`, não a versão, para não travar a IA a cada
revisão de texto. A tela do app cuida da versão.

### Decisões tomadas por segurança (revise)

| Decisão | Por quê | Alternativa |
|---|---|---|
| Consentimento **após o login**, não no formulário de cadastro | O login com Google não passa pelo formulário, e as contas antigas também precisam consentir. Assim há um único ponto, que vale para todos | Duplicar as caixas no formulário de cadastro |
| Saúde obrigatória, IA opcional | Sem dados de saúde o app não tem função; a IA é separável | Tornar as duas obrigatórias (menos livre) |
| Estimativa de calorias do diário também exige a IA | Envia o alimento a um provedor de IA | Permitir lançar macros à mão sem IA (feature nova) |
| **Excluir a conta apaga também o histórico de consentimento** | Minimização: nada fica depois da exclusão | Guardar a prova do consentimento por um prazo (art. 16). Decisão jurídica |
| Idade mínima de 18 no onboarding | Os Termos dizem 18+, e o app não coleta consentimento de responsável (art. 14) | Aceitar menores com fluxo de responsável |
| Fotos na exportação em base64 dentro do JSON | Portabilidade real, sem depender de links que expiram e sem biblioteca nova | Um ZIP separado (arquivo mais leve de abrir) |

---

## 2. Direitos do titular: cobertura

| Direito (art. 18) | Como exercer no app | Status |
|---|---|---|
| Confirmação e acesso | telas do app + **Exportar meus dados** | ✅ |
| Correção | edição de perfil, preferências, registros e memória | ✅ |
| Portabilidade | **Exportar meus dados**: as 16 tabelas do mapa (com paginação; antes truncava em 1000 linhas), **arquivos das fotos**, dados de cadastro, consentimentos e último login | ✅ corrigido (`4ec7925`) |
| Eliminação | **Excluir conta**: fotos no Storage (em lotes), as 15 tabelas com `user_id` (inclusive `chat_messages`, `ai_memory` e `user_consents`), `profiles` e o usuário de autenticação. Também há exclusão item a item | ✅ `user_consents` incluída; teste de cobertura |
| Revogação do consentimento | Configurações → Privacidade e consentimentos | ✅ novo |
| Informação sobre compartilhamento e sobre não consentir | Política (seções 5 e 8) e avisos de revogação | ✅ rascunho |
| Revisão de decisão automatizada, oposição, reclamação à ANPD | pelo e-mail do encarregado | ⚠️ só por e-mail |

`src/lib/lgpdCoverage.test.ts` falha se alguém criar uma tabela e esquecer de colocá-la na
exportação **e** na exclusão.

---

## 3. Retenção e minimização (proposta, NÃO aplicada)

### Prazos propostos

| Dado | Hoje | Proposta | Motivo |
|---|---|---|---|
| Conversas (`chat_messages`) | para sempre | **12 meses** por mensagem | a IA usa só as últimas 10; o histórico antigo é só risco |
| Memória da IA (`ai_memory`) | para sempre (inclusive as desativadas) | ativas: enquanto a conta existir (a pessoa controla); **desativadas: apagar em 30 dias** | uma memória desativada não tem finalidade |
| Insights (`ai_insights`) | para sempre | **90 dias** | são dicas de momento |
| Histórico do scanner (`scan_history`) | para sempre | **12 meses** | é consulta de histórico |
| Fotos de evolução | enquanto a conta existir | enquanto a conta existir; **apagar junto com o registro** (já acontece) | é a finalidade do recurso |
| Conta inativa (sem login) | para sempre | **24 meses sem login**: e-mail de aviso e, sem resposta em 30 dias, exclusão completa (mesmo fluxo do `delete-account`) | minimização (art. 15 e 16) |
| Histórico de consentimento | apagado com a conta | decisão jurídica (ver as decisões) | prova de consentimento |
| Backups e logs | não controlados pelo app | confirmar no Supabase/Vercel e colocar na política | `[PRAZO_BACKUPS]`, `[PRAZO_LOGS_DE_ACESSO]` |

SQL de exemplo (requer a extensão `pg_cron`; **não aplicar sem aprovação e sem atualizar a
política**):
```sql
select cron.schedule('lgpd-retencao-diaria', '17 3 * * *', $$
  delete from public.chat_messages where created_at < now() - interval '12 months';
  delete from public.ai_insights   where created_at < now() - interval '90 days';
  delete from public.scan_history  where created_at < now() - interval '12 months';
  delete from public.ai_memory     where active = false and updated_at < now() - interval '30 days';
$$);
```
A exclusão de conta inativa precisa de uma Edge Function agendada, porque tem que apagar o Storage
e o `auth.users`. Ela pode reusar a lógica do `delete-account` com `service_role`.

### Coleta que pode ser reduzida

| Item | Onde | Sugestão |
|---|---|---|
| `scan_history.image_url` | tabela | nunca é preenchida → remover a coluna |
| Idade, sexo, peso e altura enviados à IA do plano | `meal-plan/index.ts:216-224` | as metas já vêm calculadas; testar se o plano mantém a qualidade sem esses dados (minimização do que vai ao provedor) |
| Memória da IA enviada **pelo cliente** ao chat | `nutrition-chat` | carregar do banco no servidor (menos superfície; já limitada a 40 × 300) |
| Altura em dois lugares | `profiles.height_cm` e `weight_log.height_cm` | manter só no perfil, se o histórico de altura não for necessário |
| Nome duplicado | `user_metadata.full_name` e `profiles.full_name` | manter só em `profiles` |
| Esportes em dois lugares | `profiles.sports` e `user_routine_profile.sports` | unificar |
| Rascunho da calculadora (peso, idade, sexo) no `localStorage` por 7 dias, **antes** do consentimento | `components/Calculator.tsx`, `lib/onboardingDraft.ts` | fica só no aparelho e só sobe ao servidor depois do consentimento (o onboarding agora vem depois da tela). Opcional: reduzir para 24 h |
| Trigger do banco aceita idade de 5 a 120 | `validate_profiles` | alinhar para 18+ numa migration futura |
| `is_premium` sem uso | `profiles` | manter (futuro) com a trava da migration de segurança |

Não encontrei coleta sem finalidade além desses pontos. Também não há analytics, publicidade nem
SDK de rastreamento.

---

## 4. O que depende de você (passo a passo)

### 4.1 Revisão jurídica (antes do merge)
1. Revisar `src/pages/Privacidade.tsx`, `src/pages/Termos.tsx` e os textos de `CONSENT_TEXT` em
   `src/lib/consent.ts` (rótulos, detalhes e avisos de revogação). Qualquer mudança nos textos de
   consentimento: suba `CONSENT_VERSION`.
2. Validar: as bases legais (seção 3 da política), o enquadramento de cada dado como sensível no
   mapa, a obrigatoriedade do consentimento de saúde para usar o app, o destino do histórico de
   consentimento na exclusão e a idade mínima.
3. Preencher os placeholders (lista na seção 6).

### 4.2 Confirmações com fornecedores
1. **Lovable** (AI Gateway e Cloud Auth): contrato ou DPA, países de processamento, retenção dos
   prompts e se há uso para treino.
2. **Google (Gemini)** e **OpenAI**, via Lovable: as mesmas perguntas. Confirme quais termos se
   aplicam quando o acesso é pelo gateway.
3. **Supabase**: região do projeto (Settings → General) e retenção de backups (Database → Backups)
   e de logs.
4. **Vercel**: retenção de logs de acesso.
5. Com isso, preencher `[PAISES_DE_PROCESSAMENTO]`, `[REGIAO_DOS_SERVIDORES]`,
   `[CONFIRMAR_MECANISMO_DE_TRANSFERENCIA]`, `[CONFIRMAR_TERMOS_DOS_PROVEDORES_DE_IA]`,
   `[PRAZO_BACKUPS]` e `[PRAZO_LOGS_DE_ACESSO]`.

### 4.3 Ordem segura de publicação

> **Importante:** depois do deploy das Edge Functions, **quem não consentiu perde a IA**. Isso inclui
> quem estiver num **APK antigo**, que não tem a tela de consentimento. Por isso o app novo precisa
> sair antes das funções.

1. **Backup** (como em `SECURITY_AUDIT.md` → "Ordem segura para aplicar as migrations").
2. **Migration `user_consents`**: teste primeiro no projeto de TESTE. Copie
   `supabase/migrations_pendentes/20260930130000_create_user_consents.sql` para
   `supabase/migrations/` e rode `supabase link --project-ref <REF_DO_TESTE> && supabase db push`.
   Depois aplique em produção pelo fluxo da Lovable ou com `supabase db push`. Ela pode ir antes ou
   depois do front: o app funciona nos dois casos, e o backfill traz o que já estiver no `user_metadata`.
3. **Deploy do front** (merge → Vercel). Todos os usuários verão a tela de consentimento no próximo
   acesso.
4. **Novo APK/AAB** com o front novo e publicação na loja. Espere a adoção, ou avise os usuários.
5. **Deploy das 8 Edge Functions de IA** (e do `delete-account`). Só a partir daqui a IA recusa
   quem não consentiu.
6. **Testes** da seção 7.

Rollback da migration (SQL Editor):
```sql
drop table if exists public.user_consents;
drop function if exists public.user_consents_server_time();
```
O estado atual continua no `user_metadata`, e o app segue funcionando. Para desligar só a trava da
IA no servidor, reverta o commit `e2a88ec` nas funções e faça o deploy delas.

### 4.4 Documentos que a LGPD espera e o código não substitui
- **Registro das operações de tratamento** (art. 37). O `LGPD_MAPA_DADOS.md` é um bom ponto de
  partida.
- **Relatório de Impacto à Proteção de Dados (RIPD)** (art. 38), recomendado para dados sensíveis de
  saúde em escala.
- **Plano de resposta a incidentes** (art. 48): quem avisa a ANPD e os titulares, e em quanto tempo.
- **Nomeação do encarregado** e divulgação do contato (art. 41).
- Contratos e DPAs com os operadores (seção 4.2).

---

## 5. Divergências que ainda restam (código × política)

| # | Divergência | O que fazer |
|---|---|---|
| 1 | A política fala do **histórico** de consentimentos, que só existe depois da migration `user_consents`. Até lá, só o estado atual fica guardado (no `user_metadata`) | aplicar a migration |
| 2 | A trava da IA no servidor só vale **depois do deploy das funções**. Até lá, a IA funciona para quem não consentiu (ex.: APK antigo) | seguir a ordem da seção 4.3 |
| 3 | As fotos só ficam **realmente privadas** depois da migration do bucket (`SECURITY_AUDIT.md`, M3), se o bucket estiver público hoje. A política diz apenas que são exibidas por links temporários, o que já é verdade | verificar o bucket no painel e aplicar M3 |
| 4 | "Nome e e-mail não são enviados à IA" vale para os campos do cadastro, mas **texto livre** (chat, notas da rotina, memória, motivo da troca) vai como a pessoa digitou e pode conter qualquer dado | avaliar um aviso no campo do chat |
| 5 | A política cita prazos de backup e de logs que o app não controla | preencher após a seção 4.2 |
| 6 | Retenção hoje: **enquanto a conta existir** (a política diz isso). Os prazos da seção 3 **não estão aplicados**; se forem adotados, a política precisa ser atualizada | decidir e aplicar |
| 7 | Revisão de decisão automatizada e oposição só por e-mail | aceitável; avaliar um formulário |
| 8 | O banco aceita idade a partir de 5 anos (trigger), mas o onboarding exige 18+. A calculadora pública não pede idade mínima (os dados ficam só no aparelho) | alinhar numa migration futura |
| 9 | O checkout ainda é o placeholder `"#"`, e a política fala do "parceiro de pagamento" de forma genérica | nomear a Kirvano na política quando o checkout existir |
| 10 | A política promete aviso de incidente à ANPD e aos titulares; não existe processo definido | plano de incidente (4.4) |

---

## 6. Placeholders para preencher

Os placeholders estão em `src/pages/Privacidade.tsx` e `src/pages/Termos.tsx`.

| Placeholder | Onde | O que colocar |
|---|---|---|
| `[NOME_DO_CONTROLADOR]` | Privacidade §1; Termos §8 | razão social ou nome de quem responde pelo app |
| `[CNPJ_OU_CPF_DO_CONTROLADOR]` | Privacidade §1 | CNPJ (ou CPF, se pessoa física) |
| `[ENDERECO_DO_CONTROLADOR]` | Privacidade §1 | endereço para correspondência |
| `[NOME_DO_ENCARREGADO]` | Privacidade §1 | nome do encarregado (DPO) |
| `[EMAIL_DE_CONTATO]` | Privacidade §1 e §8 (2×); Termos §12 | e-mail do encarregado e de contato |
| `[CONFIRMAR_TERMOS_DOS_PROVEDORES_DE_IA]` | Privacidade §4 | o que os contratos dizem sobre retenção e treino |
| `[PAISES_DE_PROCESSAMENTO]` | Privacidade §6 | países onde Lovable, Google e OpenAI processam |
| `[REGIAO_DOS_SERVIDORES]` | Privacidade §6 | região do projeto Supabase |
| `[CONFIRMAR_MECANISMO_DE_TRANSFERENCIA]` | Privacidade §6 | cláusulas-padrão, consentimento etc. (art. 33) |
| `[PRAZO_BACKUPS]` | Privacidade §7 | retenção dos backups do Supabase |
| `[PRAZO_LOGS_DE_ACESSO]` | Privacidade §7 | retenção dos logs (Marco Civil: validar com o advogado) |
| `[PRAZO_DE_RESPOSTA]` | Privacidade §8 | prazo de resposta aos pedidos do titular |

Para achar: `grep -rnoE "\[[A-Z_]{4,}\]" src`. Também fora dos colchetes:
`KIRVANO_CHECKOUT_URL = "#"` em `src/pages/Checkout.tsx`.

---

## 7. Verificação

| Comando | Resultado |
|---|---|
| `npx tsc -p tsconfig.app.json --noEmit` e `-p tsconfig.node.json` | 0 erros |
| `npx eslint .` | 0 erros |
| `npx vitest run` | **71 testes** passando (10 arquivos; +13 novos: consentimento, tela de consentimento, exportação e cobertura exportar × excluir) |
| `deno check` (9 `index.ts` + `_shared`, 18 arquivos; e os 2 scripts) | 0 erros ¹ |
| `deno test --no-lock supabase/functions/_shared/` | **66 testes** passando (+1: `hasAiConsent`/`requireAiConsent`) |
| `npm run build` | ok |
| Migration `user_consents` num Postgres 16 local | RLS por dono, UPDATE/DELETE negados, finalidade inválida recusada, hora do servidor forçada para o app, backfill com data original, cascata na exclusão |
| `/privacidade` e `/termos` no build (Chromium, 390 px) | renderizam sem erro de JS e sem scroll horizontal |

¹ Mesmo shim local para `deno.land` (bloqueado pelo proxy deste ambiente) descrito em
`SECURITY_AUDIT.md`.

### Testes manuais sugeridos (projeto de TESTE)
1. **Conta nova por e-mail**: após confirmar o e-mail, aparece "Seus dados de saúde", com as duas
   caixas desmarcadas. "Continuar" fica desabilitado até marcar a de saúde.
2. **Conta nova com Google**: a mesma tela aparece antes do onboarding.
3. **Conta antiga**: no próximo acesso, a tela aparece. Depois de consentir, o app segue normalmente.
4. **Consentir só saúde** → abrir o assistente → aparece o diálogo da IA. "Agora não" não envia
   nada; marcar e "Autorizar e continuar" envia.
5. **Configurações → Privacidade**: datas e versão aparecem. Revogar a IA → a próxima função de IA
   pede autorização de novo. Revogar a saúde → o app volta para a tela de consentimento, e
   Configurações continua abrindo.
6. **Depois do deploy das funções**: chamar `nutrition-chat` com o token de uma conta sem
   consentimento → 403 `ai_consent_required`.
7. **Exportar** com mais de 1000 registros no diário e com fotos → o JSON tem tudo, com
   `fotos_de_evolucao_arquivos[].base64` abrindo como imagem e `avisos: []`.
8. **Excluir conta** → login falha, a pasta `progress/<id>` fica vazia e nenhuma linha resta (inclusive
   em `user_consents`, se a migration já estiver aplicada).
9. **Onboarding com 17 anos** → mensagem de 18+.
10. **Migration aplicada**: consentir e revogar gera linhas novas em `user_consents`, e o usuário
    não consegue editar nem apagar essas linhas pela API.
