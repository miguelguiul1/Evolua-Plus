# IA: do Lovable AI Gateway para a API Gemini

Data: 03/10/2026 · Branch: `chore/migracao-supabase`

Nada foi publicado: sem deploy, sem uso de produção e sem chamada real à IA.

## Base da branch

A `main` remota ainda está em `108a43f`, sem `chore/seguranca` nem `chore/lgpd`. Como o
consentimento, a `CONSENT_VERSION`, a política nova e o mapa de dados só existem em `chore/lgpd`,
esta branch foi criada a partir da `main` atualizada **e avançada até `chore/lgpd` (`30131e6`)**, que
já contém `chore/seguranca`. Por isso, um PR desta branch para a `main` inclui as três etapas. Se
preferir revisar por partes, faça o merge na ordem `chore/seguranca` → `chore/lgpd` →
`chore/migracao-supabase`.

## O que mudou

| Commit | Mudança |
|---|---|
| `308f329` | `supabase/functions/_shared/aiClient.ts`: único ponto de chamada de IA. As 8 funções usam `chatCompletion(aiConfig, {...})`; saíram `LOVABLE_API_KEY`, a URL do gateway e o `model` de cada função. Testes com IA simulada e checagem estática. `.env.secrets.example` sem valores |
| `e26e52e` | Política, texto do consentimento, diálogo da IA, Configurações, Termos, mapa de dados e relatório LGPD citam só o Google (API Gemini). `CONSENT_VERSION` → `2026-10-03` |

**Não mudou:** prompts, mensagens, `max_tokens`, `temperature`, regenerações e sanitização
(`aiGuard`/`recipeGuards`), tratamento de status (429, 402, 500), `MOCK_AI`, consentimento no
servidor, limites de entrada e o `delete-account`.

**Uma mudança de comportamento:** o chat (`nutrition-chat`) usava `openai/gpt-5.6-sol` e agora usa o
mesmo modelo Gemini das outras funções. O parâmetro `reasoning_effort: "none"` foi mantido; segundo
a documentação do Google, nos modelos 2.5 ele desliga o "thinking".

### Configuração (secrets das Edge Functions)

| Secret | Obrigatório | Padrão |
|---|---|---|
| `GEMINI_API_KEY` | sim | — |
| `AI_MODEL` | não | `gemini-2.5-flash` |
| `AI_BASE_URL` | não | `https://generativelanguage.googleapis.com/v1beta/openai` |
| `MOCK_AI` | só no projeto de teste | `false` |

Sem `GEMINI_API_KEY`, as funções de IA respondem 500 ("Erro interno"), como antes acontecia sem a
`LOVABLE_API_KEY`. A chave nunca vai para o front (o build não contém a URL nem o nome do secret).

## O que depende de você

1. **Chave do Gemini num projeto do Google Cloud com faturamento ativo.** No uso gratuito, o Google
   usa entradas e respostas para melhorar produtos e revisores humanos podem lê-las
   ([termos da API Gemini](https://ai.google.dev/gemini-api/terms)). Com dados de saúde, use só o
   plano pago.
2. **Cadastrar o secret sem passar pelo terminal:** copie `.env.secrets.example` para
   `.env.secrets.local` (ignorado pelo git), preencha e rode
   `npx supabase@2 secrets set --env-file .env.secrets.local --project-ref <REF>`. Confira só os nomes
   com `npx supabase@2 secrets list --project-ref <REF>`.
3. **Teste real mais barato:** publique só o `myth-checker` no projeto de **teste** e faça **uma**
   chamada com um usuário de teste que tenha o consentimento de IA (o `scripts/test-ia-real.ts` já
   registra esse consentimento). Uma resposta 200 com o veredito indica que chave, URL e modelo estão
   certos. Se der 500, veja nos logs a linha `myth-checker error: AI error: <status>`: 400 ou 403
   costumam indicar chave inválida ou API não habilitada, 404 indica modelo inexistente e 429 indica
   cota.
4. **Depois, o roteiro completo** (`scripts/test-ia-real.ts`, com teto de 25 chamadas) no projeto de
   teste, para comparar a qualidade e as violações de alimentos proibidos com o Gemini direto.
5. **Revisão jurídica** dos textos atualizados (continuam RASCUNHO) e preenchimento de
   `[CONFIRMAR_TERMOS_DO_GOOGLE_GEMINI_API]`, que substitui o placeholder antigo dos provedores.

## Riscos a verificar no teste real

| Risco | Onde | O que fazer se acontecer |
|---|---|---|
| `gemini-2.5-flash` pode não estar mais disponível na API (a documentação já mostra modelos mais novos) | todas | trocar `AI_MODEL`, sem mudar código. Atenção: `reasoning_effort: "none"` vale para modelos 2.5; em modelos mais novos ele pode ser recusado |
| Na **regeneração** do chat, a correção vai como mensagem `system` **depois** das mensagens do usuário. A camada compatível do Gemini pode tratar isso diferente do gateway | `nutrition-chat` (só quando a 1ª resposta viola um alimento proibido) | ver o resultado no roteiro de teste; se falhar, mudar o papel da correção para `user` (mudança de lógica, que precisa da sua aprovação) |
| O Google não usa o status 402; cota estourada vem como 429 | todas | já tratado como "Muitas requisições"; o texto do 402 ("créditos do workspace") fica sem uso |
| Formato de erro diferente do gateway | todas | as funções só leem o status, e o corpo do erro vai só para o log |

## Rollback

`git revert e26e52e 308f329` volta ao Lovable AI Gateway e aos textos anteriores. Nesse caso, a
`CONSENT_VERSION` volta a `2026-09-30` e quem consentiu na versão nova será convidado de novo.

## Verificação

| Comando | Resultado |
|---|---|
| `tsc` (app e node) | 0 erros |
| `eslint .` | 0 erros |
| `vitest run` | 80 testes (11 arquivos), +9 da checagem de centralização |
| `deno check` (funções, `_shared` e scripts) | 0 erros (com o shim local de `deno.land`, bloqueado pelo proxy deste ambiente) |
| `deno test --no-lock supabase/functions/_shared/` | 70 testes, +4 do `aiClient` (configuração, formato da requisição com imagem, fluxo com regeneração e 429 simulados) |
| `npm run build` | ok; o bundle não contém a URL nem o nome do secret do Gemini |
