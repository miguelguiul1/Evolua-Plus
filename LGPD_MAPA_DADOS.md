# Mapa de dados pessoais — Evolua Plus

Data: 30/09/2026, atualizado em 03/10/2026 (IA: Lovable AI Gateway → API Gemini do Google) · Branch: `chore/migracao-supabase` · Fonte: leitura do código (migrations, `src/`,
`supabase/functions/`). **Nada aqui foi conferido no banco de produção.** Este é um documento
técnico, não um parecer jurídico.

Legenda: **🩺 = dado sensível de saúde** (LGPD art. 5º, II, e art. 11). O enquadramento é uma
**sugestão técnica** e precisa de validação jurídica. Por segurança, o mapa trata como saúde todo
dado que revela condição física, corpo, hábitos alimentares, restrições ou alergias.

## 1. Onde os dados ficam e para onde vão

| Destino | Papel (sugestão) | O que recebe | Onde está no código |
|---|---|---|---|
| **Supabase** (projeto `icmyqmvcwzdfleuxyiux`) | operador: banco, autenticação, Storage, Edge Functions | todos os dados das tabelas abaixo e as fotos de evolução | `src/integrations/supabase/client.ts`, `supabase/` |
| **Google — API Gemini** (`generativelanguage.googleapis.com/v1beta/openai`, modelo padrão `gemini-2.5-flash`) | operador: processamento de IA | o conteúdo de cada chamada de IA (seção 3), nas **8** funções de IA, direto das Edge Functions (sem intermediário) | `supabase/functions/_shared/aiClient.ts` (secret `GEMINI_API_KEY`; `AI_MODEL` e `AI_BASE_URL` opcionais) |
| **Lovable Cloud Auth** (`@lovable.dev/cloud-auth-js`) | operador do login com Google na web | fluxo OAuth (e-mail e nome da conta Google) | `src/integrations/lovable/index.ts`, `Auth.tsx` |
| **Google (OAuth)** | controlador próprio da conta Google | login, quando a pessoa escolhe "Entrar com Google" | `Auth.tsx`, `lib/nativeGoogleAuth.ts` (desligado) |
| **Open Food Facts** (`world.openfoodfacts.org`) | terceiro (base pública) | **só o código de barras** e o IP do aparelho; nenhum dado da conta | `components/BarcodeScanner.tsx:129` |
| **Google Fonts** (`fonts.googleapis.com`) | terceiro | IP e user-agent do navegador ao carregar a fonte | `src/index.css:1` |
| **Vercel** | operador: hospedagem do site | IP, user-agent e URL acessada (logs de acesso) | `vercel.json` |
| **Kirvano** (checkout) | controlador próprio do pagamento | dados que a pessoa digitar **no site da Kirvano**. O app só abre o link, que hoje é o placeholder `"#"` | `pages/Checkout.tsx:21` |
| **Aparelho (localStorage do navegador/WebView)** | — | cache do plano, lista de compras, rascunho da calculadora/onboarding, tema e preferências de tela | `lib/planoStorage.ts`, `lib/onboardingDraft.ts` e outros |

Não há SDK de analytics, publicidade nem rastreamento: `lib/analytics.ts` só dispara um
`CustomEvent` local. O app não envia `user_id`, nome nem e-mail para a IA: os prompts levam só os
dados de contexto listados na seção 3.

## 2. Dados coletados, por tabela

### Conta e cadastro
| Dado | Onde | Finalidade | 🩺 |
|---|---|---|---|
| E-mail, senha (hash), data de criação, último login | `auth.users` (Supabase Auth) | autenticação, recuperação de senha | |
| Nome (`full_name`) | `auth.users.raw_user_meta_data` e `profiles.full_name` | saudação e personalização | |
| Consentimentos (finalidade, versão do texto, data) | `auth.users.raw_user_meta_data.consents` **e** `user_consents` (tabela nova, migration pendente) | prova e controle do consentimento | |
| `is_premium` | `profiles` | plano pago (ainda não usado) | |

### Perfil físico e metas
| Dado | Onde | Finalidade | 🩺 |
|---|---|---|---|
| Idade, sexo, altura | `profiles.age`, `.sex`, `.height_cm` | cálculo de TMB/TDEE e metas; enviado à IA do plano | 🩺 |
| Nível de atividade, esportes | `profiles.activity_level`, `.sports` | metas; enviado à IA do plano | 🩺 |
| Onboarding concluído | `profiles.onboarding_completed(_at)` | fluxo do app | |
| Metas (kcal, água, proteína, carbo, gordura, TMB, TDEE, peso-alvo) | `user_goals` | acompanhamento; enviado à IA (plano, troca, chat) | 🩺 |

### Evolução corporal
| Dado | Onde | Finalidade | 🩺 |
|---|---|---|---|
| Peso, altura, cintura, quadril, braço, coxa, peito, pescoço, % de gordura, notas | `weight_log` | gráfico de evolução; o **último peso** vai para a IA (plano, chat) | 🩺 |
| Fotos corporais (antes/depois, frente/lado) | Storage `progress/<userId>/…` + `progress_photos` (caminho, tipo, notas) | comparação visual. **Não vão para a IA** | 🩺 |

### Alimentação e preferências
| Dado | Onde | Finalidade | 🩺 |
|---|---|---|---|
| Objetivo (emagrecer, ganhar massa, manter) | `user_preferences.objective` | plano e recomendações; enviado à IA | 🩺 |
| Restrições e alergias | `user_preferences.restrictions` | nunca sugerir o alimento; enviado à IA | 🩺 |
| Alimentos que gosta e que não gosta | `user_preferences.liked_foods/disliked_foods` | personalização; enviado à IA | 🩺 |
| Diário alimentar (alimento, quantidade, refeição, kcal e macros, data) | `food_log` | acompanhamento; enviado à IA na análise do dia e nos resumos do chat | 🩺 |
| Água (ml por dia) | `water_log` | hidratação | 🩺 |
| Alimentos favoritos (nome e macros) | `food_favorites` | atalhos | 🩺 |
| Favoritos gerais (receitas, artigos, respostas) | `global_favorites` | atalhos | |
| Plano alimentar gerado | `meal_plans.plan_data` | exibição do plano | 🩺 |
| Histórico do scanner (**só o JSON do resultado**; a foto não é guardada) | `scan_history.result` | histórico | 🩺 |

### Rotina e treino (perfil opcional)
| Dado | Onde | Finalidade | 🩺 |
|---|---|---|---|
| Horários das refeições, o que costuma comer, água habitual | `user_routine_profile` | plano personalizado; enviado à IA | 🩺 |
| Se treina, esportes, frequência, período | `user_routine_profile` | plano personalizado; enviado à IA | 🩺 |
| Períodos ocupados, pouco tempo para cozinhar, notas livres | `user_routine_profile` | plano personalizado; enviado à IA | 🩺 (notas livres podem conter qualquer coisa) |

### Assistente de IA
| Dado | Onde | Finalidade | 🩺 |
|---|---|---|---|
| Conversas (pergunta e resposta) | `chat_messages` | histórico; as **últimas 10** vão para a IA a cada mensagem | 🩺 (quase sempre sobre saúde/alimentação) |
| Memória da IA (fatos que a pessoa pediu para lembrar) | `ai_memory` | personalização; enviada à IA (chat e troca de refeição) | 🩺 |
| Insights gerados (mensagem, categoria, status) | `ai_insights` | cards de dica | 🩺 |

### Dados enviados à IA que **não** ficam guardados
| Dado | Função | 🩺 |
|---|---|---|
| Foto da geladeira | analyze-fridge | 🩺 (revela hábitos alimentares) |
| Foto do alimento/prato | food-scan, portion-scanner | 🩺 |
| Pergunta de mito alimentar | myth-checker | pode conter dado de saúde |
| Nome e quantidade de um alimento para estimar macros | nutrition-tracker (`estimate`) | 🩺 |

### Aparelho (localStorage, não sai do aparelho)
| Dado | Chave | 🩺 | Apagado no logout |
|---|---|---|---|
| Rascunho da calculadora/onboarding (peso, altura, idade, sexo, atividade, metas) | `evolua:onboardingDraft:v1` (expira em 7 dias) | 🩺 | sim |
| Plano em cache | `evoluaPlano:<userId>` | 🩺 | sim |
| Lista de compras | `evolua:lista:*` | | sim |
| Conquistas e notificações lidas | `evolua:achievements`, `evoluaNotificacoesLidas` | | sim |
| Sessão (tokens) | `sb-…-auth-token` | | sim (o próprio `signOut`) |
| Tema e configurações de exibição | `evoluaTheme`, `evoluaConfig` | | não (preferência do aparelho) |

## 3. O que cada chamada de IA envia

Todas vão direto das Edge Functions para a API Gemini do Google, pelo módulo `_shared/aiClient.ts`. Nenhuma envia nome, e-mail ou `user_id`. O modelo é o mesmo em todas (`AI_MODEL`, padrão `gemini-2.5-flash`).

| Função | Modelo | Dados enviados |
|---|---|---|
| `analyze-fridge` | Gemini 2.5 Flash | foto da geladeira, objetivo, restrições, gosta e não gosta |
| `food-scan` | Gemini 2.5 Flash | foto do alimento e objetivo |
| `portion-scanner` | Gemini 2.5 Flash | foto do prato |
| `myth-checker` | Gemini 2.5 Flash | texto da pergunta |
| `nutrition-tracker` | Gemini 2.5 Flash | `estimate`: alimento e quantidade; `analyze`: diário do dia e objetivo |
| `meal-plan` | Gemini 2.5 Flash | objetivo, peso, altura, idade, sexo, nível de atividade, esportes, metas de kcal e macros, restrições, gosta e não gosta, perfil de rotina (horários, refeições habituais, treino, notas) |
| `meal-swap` | Gemini 2.5 Flash | refeição a trocar, motivo, objetivo, meta calórica, restrições, gosta e não gosta, memória da IA |
| `nutrition-chat` | Gemini 2.5 Flash (`reasoning_effort: "none"`) | últimas 10 mensagens, objetivo, metas de kcal e proteína, restrições, gosta e não gosta, memória da IA, totais de hoje, resumo de 7 dias (médias e alimentos frequentes), peso atual e variação |

**Transferência internacional**: o código não mostra em que país o Google
processa os dados, nem em que região o projeto Supabase está hospedado. Isso precisa ser confirmado
nos contratos e no painel. Ver `LGPD_RELATORIO.md`.
