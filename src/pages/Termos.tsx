import { Link } from "react-router-dom";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

/**
 * Rascunho gerado automaticamente para viabilizar a publicação nas lojas. PRECISA DE
 * REVISÃO jurídica/humana antes de publicar — em especial o e-mail de contato
 * (placeholder) e as condições comerciais (planos, reembolso) descritas em "Vendas".
 */
const Termos = () => (
  <div className="min-h-screen bg-background pt-24 pb-20">
    <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
      <header className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
          Termos de <span className="text-primary">Uso</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Última atualização: 28 de setembro de 2026. Vigora tanto para o site quanto para o aplicativo
          Evolua Plus (Android/iOS).
        </p>
      </header>

      <div className="space-y-8">
        <Section title="1. Aceitação dos termos">
          <p>
            Ao criar uma conta ou usar o Evolua Plus, você concorda com estes Termos de Uso e com a
            nossa <Link to="/privacidade" className="text-primary hover:underline">Política de Privacidade</Link>.
            Se você não concordar, não utilize o aplicativo.
          </p>
        </Section>

        <Section title="2. O que é o Evolua Plus">
          <p>
            O Evolua Plus é uma ferramenta de apoio à alimentação que usa inteligência artificial para
            gerar planos alimentares, sugestões de receitas, análise de alimentos por foto e
            acompanhamento de hábitos (diário alimentar, hidratação, evolução de peso).
          </p>
        </Section>

        <Section title="3. Não somos aconselhamento médico">
          <p>
            O conteúdo gerado pelo Evolua Plus, incluindo planos alimentares e respostas do assistente de
            IA, tem caráter informativo e não substitui a orientação de um médico, nutricionista ou outro
            profissional de saúde habilitado. Antes de iniciar qualquer mudança significativa na sua
            alimentação, especialmente se você tiver condições de saúde pré-existentes, consulte um
            profissional. Em caso de emergência médica, procure atendimento imediato.
          </p>
        </Section>

        <Section title="4. Sua conta">
          <p>
            Você é responsável por manter a confidencialidade da sua senha e por todas as atividades
            realizadas na sua conta. Você deve ter pelo menos 18 anos, ou a maioridade civil aplicável no
            seu país, para criar uma conta. Informações fornecidas no cadastro devem ser verdadeiras.
          </p>
        </Section>

        <Section title="5. Planos pagos e cobrança">
          <p>
            Alguns recursos do Evolua Plus podem exigir uma assinatura paga. Preços, formas de pagamento,
            periodicidade e política de reembolso são exibidos na tela de contratação (página "Planos")
            antes da confirmação da compra. Assinaturas feitas por uma loja de aplicativos (Google Play ou
            App Store) seguem também as políticas de cobrança e cancelamento dessas plataformas.
          </p>
        </Section>

        <Section title="6. Uso aceitável">
          <p>Ao usar o Evolua Plus, você concorda em não:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Usar o aplicativo para fins ilegais ou fraudulentos;</li>
            <li>Tentar acessar contas de outros usuários ou dados que não são seus;</li>
            <li>Fazer engenharia reversa, copiar ou redistribuir o aplicativo sem autorização;</li>
            <li>Enviar conteúdo ofensivo, malicioso ou que viole direitos de terceiros pelo assistente de IA.</li>
          </ul>
        </Section>

        <Section title="7. Propriedade intelectual">
          <p>
            O Evolua Plus, sua marca, design, código e conteúdo original são de propriedade da equipe
            responsável pelo produto. Você mantém a titularidade sobre os dados pessoais que você
            fornece (fotos, textos, medições), que usamos apenas conforme nossa Política de Privacidade.
          </p>
        </Section>

        <Section title="8. Cancelamento e exclusão de conta">
          <p>
            Você pode excluir sua conta a qualquer momento em Configurações → Excluir conta. Isso remove
            permanentemente seus dados, conforme descrito na Política de Privacidade. Podemos suspender
            ou encerrar contas que violem estes Termos.
          </p>
        </Section>

        <Section title="9. Limitação de responsabilidade">
          <p>
            O Evolua Plus é fornecido "como está". Não garantimos que as recomendações geradas por IA
            sejam livres de erros e não nos responsabilizamos por decisões tomadas exclusivamente com
            base no conteúdo do aplicativo sem orientação profissional adequada.
          </p>
        </Section>

        <Section title="10. Alterações nestes termos">
          <p>
            Podemos atualizar estes Termos para refletir mudanças no produto ou na legislação. A data no
            topo desta página indica a versão vigente. Mudanças relevantes serão comunicadas no
            aplicativo ou por e-mail.
          </p>
        </Section>

        <Section title="11. Contato">
          <p>
            Dúvidas sobre estes Termos podem ser enviadas para{" "}
            <a href="mailto:[EMAIL_DE_CONTATO]" className="text-primary hover:underline">[EMAIL_DE_CONTATO]</a>.
          </p>
        </Section>
      </div>

      <div className="mt-12 text-sm">
        <Link to="/" className="text-primary hover:underline">← Voltar ao início</Link>
      </div>
    </div>
  </div>
);

export default Termos;
