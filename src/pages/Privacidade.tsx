import { Link } from "react-router-dom";

const Section = ({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="space-y-3 scroll-mt-24">
    <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

const Mail = () => (
  <a href="mailto:[EMAIL_DE_CONTATO]" className="text-primary hover:underline">[EMAIL_DE_CONTATO]</a>
);

type Row = { dado: string; finalidade: string; ia: string; saude?: boolean };

const DADOS: { grupo: string; itens: Row[] }[] = [
  {
    grupo: "Conta",
    itens: [
      { dado: "Nome, e-mail e senha (guardada só como hash criptográfico)", finalidade: "criar e proteger sua conta, recuperar a senha", ia: "não" },
      { dado: "Registro dos seus consentimentos (finalidade, versão do texto, data)", finalidade: "comprovar e respeitar suas escolhas", ia: "não" },
    ],
  },
  {
    grupo: "Perfil físico e metas",
    itens: [
      { dado: "Idade, sexo, altura, nível de atividade e esportes", finalidade: "calcular gasto calórico e metas", ia: "sim (plano alimentar)", saude: true },
      { dado: "Metas de calorias, água, proteína, carboidratos, gorduras e peso-alvo", finalidade: "acompanhar seu progresso", ia: "sim (plano, troca de refeição, assistente)", saude: true },
    ],
  },
  {
    grupo: "Evolução corporal",
    itens: [
      { dado: "Peso, medidas (cintura, quadril, braço, coxa, peito, pescoço), % de gordura e anotações", finalidade: "mostrar sua evolução", ia: "apenas o peso mais recente (plano e assistente)", saude: true },
      { dado: "Fotos de evolução corporal", finalidade: "comparação visual, visível só para você", ia: "não", saude: true },
    ],
  },
  {
    grupo: "Alimentação",
    itens: [
      { dado: "Objetivo, restrições e alergias, alimentos de que gosta e não gosta", finalidade: "personalizar e evitar alimentos proibidos", ia: "sim", saude: true },
      { dado: "Diário alimentar (alimentos, quantidades, calorias e macros) e água", finalidade: "acompanhamento diário", ia: "sim (análise do dia e resumos do assistente)", saude: true },
      { dado: "Favoritos, plano alimentar gerado e resultados do scanner", finalidade: "histórico e atalhos", ia: "não (ficam guardados na sua conta)", saude: true },
    ],
  },
  {
    grupo: "Rotina e treino (opcional)",
    itens: [
      { dado: "Horários e refeições habituais, água habitual, treino, períodos ocupados e observações", finalidade: "plano personalizado", ia: "sim (plano alimentar)", saude: true },
    ],
  },
  {
    grupo: "Assistente de IA",
    itens: [
      { dado: "Conversas com o assistente", finalidade: "histórico da conversa", ia: "sim (as últimas mensagens a cada pergunta)", saude: true },
      { dado: "Memória da IA (informações que você pede para lembrar) e insights", finalidade: "personalizar respostas e dicas", ia: "sim (assistente e troca de refeição)", saude: true },
    ],
  },
  {
    grupo: "Enviados para análise e não guardados",
    itens: [
      { dado: "Fotos de alimentos, pratos e geladeira; perguntas do verificador de mitos; nome e quantidade de alimento para estimar calorias", finalidade: "gerar a análise pedida", ia: "sim; só o resultado é guardado, a foto não", saude: true },
    ],
  },
  {
    grupo: "No seu aparelho",
    itens: [
      { dado: "Cache do plano, lista de compras, rascunho da calculadora, tema e preferências de exibição", finalidade: "funcionar mais rápido e offline", ia: "não (apagados ao sair da conta, exceto tema e preferências)" },
    ],
  },
];

/**
 * RASCUNHO para revisão jurídica. Não publicar sem revisão. Descreve apenas o que o código faz
 * (ver LGPD_MAPA_DADOS.md). Os placeholders entre colchetes precisam ser preenchidos e estão
 * listados em LGPD_RELATORIO.md.
 */
const Privacidade = () => (
  <div className="min-h-screen bg-background pt-24 pb-20">
    <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
      <header className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
          Política de <span className="text-primary">Privacidade</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Última atualização: 3 de outubro de 2026. Vale para o site e para o aplicativo Evolua Plus
          (Android/iOS).
        </p>
      </header>

      <div className="space-y-8">
        <Section title="1. Quem é o controlador e como falar conosco">
          <p>
            O controlador dos seus dados é <strong>[NOME_DO_CONTROLADOR]</strong>, inscrito sob o nº
            [CNPJ_OU_CPF_DO_CONTROLADOR], com endereço em [ENDERECO_DO_CONTROLADOR]. Esta política explica
            quais dados tratamos, por quê, com quem compartilhamos e quais são os seus direitos, conforme a
            Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018).
          </p>
          <p>
            <strong>Encarregado pelo tratamento de dados (DPO):</strong> [NOME_DO_ENCARREGADO], pelo
            e-mail <Mail />. Esse é o canal para dúvidas, pedidos e reclamações sobre seus dados.
          </p>
        </Section>

        <Section title="2. Quais dados tratamos">
          <p>
            Os itens marcados com <strong>🩺</strong> são <strong>dados pessoais sensíveis referentes à
            saúde</strong>. Só os tratamos com o seu consentimento específico.
          </p>
          {DADOS.map((g) => (
            <div key={g.grupo}>
              <h3 className="font-medium text-foreground mt-4 mb-2">{g.grupo}</h3>
              <ul className="space-y-2">
                {g.itens.map((r) => (
                  <li key={r.dado} className="rounded-lg border border-border/60 p-3">
                    <p className="text-foreground">{r.saude ? "🩺 " : ""}{r.dado}</p>
                    <p className="text-xs mt-1">Para quê: {r.finalidade}. Enviado à IA: {r.ia}.</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p>
            Não usamos ferramentas de publicidade nem de rastreamento. O código de barras lido no scanner
            é consultado na base pública Open Food Facts; só o código vai, sem nenhum dado da sua conta.
          </p>
        </Section>

        <Section title="3. Bases legais">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Dados de saúde (🩺):</strong> seu consentimento específico e destacado (art. 11, I),
              dado na tela “Seus dados de saúde” logo após o cadastro.
            </li>
            <li>
              <strong>Envio de dados de saúde ao provedor de IA:</strong> um consentimento separado e
              opcional (art. 11, I). Ele é pedido quando você usa uma função de IA pela primeira vez, ou na
              mesma tela.
            </li>
            <li>
              <strong>Dados de conta:</strong> execução do contrato de uso do aplicativo (art. 7º, V).
            </li>
            <li>
              <strong>Registros de acesso e segurança:</strong> cumprimento de obrigação legal (art. 7º, II,
              e Marco Civil da Internet) e legítimo interesse em manter o serviço seguro (art. 7º, IX).
            </li>
          </ul>
        </Section>

        <Section title="4. Como usamos a inteligência artificial">
          <p>
            As funções de IA (assistente, plano alimentar, troca de refeição, scanner de alimentos, porções e
            geladeira, verificador de mitos e estimativa e análise do diário) enviam <strong>só os dados
            necessários para cada pedido</strong>. <strong>Seu nome e seu e-mail não são enviados.</strong>
          </p>
          <p>
            O provedor de IA é o <strong>Google</strong>, com os modelos <strong>Gemini</strong> acessados
            pela API Gemini. Ele é usado em todas essas funções. Os pedidos saem dos nossos servidores (as
            funções do Supabase) direto para o Google, sem intermediários.
          </p>
          <p>
            As respostas da IA são estimativas geradas automaticamente e podem conter erros. Elas não
            substituem um profissional de saúde (veja os{" "}
            <Link to="/termos" className="text-primary hover:underline">Termos de Uso</Link>). O uso que o Google
            faz desses dados, incluindo retenção e treinamento de modelos, segue os termos da API Gemini
            aplicáveis à nossa conta: [CONFIRMAR_TERMOS_DO_GOOGLE_GEMINI_API].
          </p>
        </Section>

        <Section title="5. Com quem compartilhamos">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Supabase</strong>: banco de dados, autenticação, armazenamento das fotos e execução das funções do servidor;</li>
            <li><strong>Google (API Gemini)</strong>: processamento de IA, conforme a seção 4;</li>
            <li><strong>Lovable</strong>: login com Google no site, quando você escolhe essa opção;</li>
            <li><strong>Vercel</strong>: hospedagem do site (registros técnicos de acesso);</li>
            <li><strong>Google Fonts</strong>: fontes do site (recebe endereço IP e navegador);</li>
            <li><strong>Open Food Facts</strong>: consulta do código de barras, sem dados da conta.</li>
          </ul>
          <p>
            Não vendemos seus dados e não os compartilhamos com anunciantes. Também podemos compartilhá-los
            quando a lei ou uma ordem judicial exigir. Pagamentos, quando existirem, são feitos no site do
            parceiro de pagamento, que trata esses dados sob a política dele.
          </p>
        </Section>

        <Section title="6. Transferência internacional">
          <p>
            O provedor de IA (Google) e os de infraestrutura acima podem processar dados fora do Brasil
            ([PAISES_DE_PROCESSAMENTO]). Nossos servidores de banco de dados ficam em
            [REGIAO_DOS_SERVIDORES]. A transferência ocorre com base no seu consentimento específico
            (art. 33, VIII) e nas garantias contratuais dos provedores
            ([CONFIRMAR_MECANISMO_DE_TRANSFERENCIA]).
          </p>
        </Section>

        <Section title="7. Por quanto tempo guardamos">
          <ul className="list-disc pl-5 space-y-2">
            <li>Os dados da sua conta ficam guardados enquanto a conta existir;</li>
            <li>
              Ao excluir a conta, apagamos na hora o cadastro, as fotos de evolução e todos os registros
              ligados a ela (diário, água, evolução, metas, preferências, rotina, plano, favoritos, histórico
              do scanner, conversas, memória e insights da IA e o registro de consentimentos);
            </li>
            <li>
              Cópias de segurança (backups) do banco podem conter seus dados por até [PRAZO_BACKUPS] e depois
              são descartadas automaticamente;
            </li>
            <li>Registros de acesso são guardados por [PRAZO_LOGS_DE_ACESSO], conforme a lei;</li>
            <li>Fotos de alimentos e da geladeira enviadas para análise não são guardadas por nós.</li>
          </ul>
        </Section>

        <Section id="direitos" title="8. Seus direitos e como exercê-los">
          <p>Pela LGPD (art. 18), você pode:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Confirmar e acessar</strong> seus dados: eles aparecem nas telas do app, e você pode usar <em>Configurações → Exportar meus dados</em>;</li>
            <li><strong>Corrigir</strong> dados: edite perfil, preferências, registros e memória da IA no próprio app;</li>
            <li><strong>Portabilidade</strong>: <em>Exportar meus dados</em> gera um arquivo com todos os seus dados, incluindo as fotos;</li>
            <li><strong>Excluir</strong>: <em>Configurações → Excluir conta</em> apaga tudo de forma permanente. Também dá para apagar itens um a um (registros, fotos, conversas, memória);</li>
            <li><strong>Revogar o consentimento</strong>: em <em>Configurações → Privacidade e consentimentos</em>, a qualquer momento. O app avisa o que deixa de funcionar;</li>
            <li><strong>Saber com quem compartilhamos</strong> (seção 5) e <strong>as consequências de não consentir</strong>: sem o consentimento de saúde o app não funciona; sem o de IA, só as funções de IA param;</li>
            <li><strong>Pedir revisão</strong> de decisões automatizadas, <strong>se opor</strong> a um tratamento ou <strong>reclamar</strong> à Autoridade Nacional de Proteção de Dados (ANPD).</li>
          </ul>
          <p>
            Para qualquer pedido que não dê para fazer pelo app, escreva para <Mail />. Respondemos em até
            [PRAZO_DE_RESPOSTA].
          </p>
        </Section>

        <Section title="9. Segurança">
          <p>
            Cada conta só acessa os próprios dados, com regras de acesso aplicadas no banco. As fotos de
            evolução são exibidas no app por links temporários, que expiram em minutos. As conexões são
            criptografadas (HTTPS). Nenhum sistema é 100% seguro. Se houver um incidente que possa causar
            risco ou dano relevante, avisaremos você e a ANPD, conforme a lei.
          </p>
        </Section>

        <Section title="10. Crianças e adolescentes">
          <p>
            O Evolua Plus é destinado a maiores de 18 anos (veja os{" "}
            <Link to="/termos" className="text-primary hover:underline">Termos de Uso</Link>) e não coleta dados
            de crianças e adolescentes de forma intencional.
          </p>
        </Section>

        <Section title="11. Alterações desta política">
          <p>
            Quando esta política mudar, a data no topo será atualizada. Se a mudança afetar o que você
            autorizou, pediremos o seu consentimento de novo no app.
          </p>
        </Section>
      </div>

      <div className="mt-12 text-sm">
        <Link to="/" className="text-primary hover:underline">← Voltar ao início</Link>
      </div>
    </div>
  </div>
);

export default Privacidade;
