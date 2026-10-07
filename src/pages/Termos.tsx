import { Link } from "react-router-dom";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

/**
 * RASCUNHO para revisão jurídica. Não publicar sem revisão — em especial controlador, e-mail
 * de contato (placeholders) e condições comerciais (planos, reembolso) descritas em "Vendas".
 * Placeholders listados em LGPD_RELATORIO.md.
 */
const Termos = () => (
  <div className="min-h-dvh bg-background pt-24 pb-20 [overflow-wrap:anywhere]">
    <div className="container mx-auto max-w-3xl">
      <header className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
          Termos de <span className="text-primary">Uso</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Última atualização: 30 de setembro de 2026. Vigora tanto para o site quanto para o aplicativo
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

        <Section title="3. O Evolua Plus não substitui nutricionista nem médico">
          <p className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-foreground">
            <strong>Importante:</strong> o Evolua Plus é uma ferramenta de apoio baseada em inteligência
            artificial. Ele <strong>não é nutricionista, médico nem profissional de saúde</strong>, não faz
            diagnóstico, não prescreve dietas terapêuticas nem medicamentos e{" "}
            <strong>não substitui consulta, avaliação ou acompanhamento profissional</strong>.
          </p>
          <p>
            Planos alimentares, receitas, estimativas de calorias e nutrientes, análises de fotos e respostas
            do assistente são <strong>gerados automaticamente e podem conter erros</strong>. Valores
            nutricionais e porções identificados por foto são aproximados.
          </p>
          <p>
            Procure um nutricionista ou médico antes de mudar sua alimentação, principalmente se você tiver
            doença ou condição de saúde (como diabetes, hipertensão, doença renal ou transtorno alimentar),
            estiver grávida ou amamentando, tomar medicamentos ou tiver passado por cirurgia recente. Em caso de
            emergência, procure atendimento médico imediatamente.
          </p>
        </Section>

        <Section title="4. Alergias e restrições alimentares">
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-foreground">
            <strong>Se você tem alergia ou intolerância alimentar, confira sempre os ingredientes e os
            rótulos antes de consumir qualquer alimento ou receita sugerida pelo app.</strong>
          </p>
          <p>
            O app tenta evitar os alimentos que você marca como restrição, alergia ou “não gosto”, mas{" "}
            <strong>não garante</strong> que uma sugestão esteja livre deles. A IA pode errar, deixar passar
            um ingrediente, um derivado ou um nome diferente do mesmo alimento, e não conhece a composição de
            produtos industrializados, nem riscos de contaminação cruzada. A decisão de consumir é sempre sua.
            Em caso de alergia grave, siga a orientação do seu médico.
          </p>
        </Section>

        <Section title="5. Sua conta">
          <p>
            Você é responsável por manter a confidencialidade da sua senha e por todas as atividades
            realizadas na sua conta. Você deve ter pelo menos 18 anos, ou a maioridade civil aplicável no
            seu país, para criar uma conta. Informações fornecidas no cadastro devem ser verdadeiras. Para
            usar o app, você precisa autorizar o tratamento dos seus dados de saúde, e para usar as funções
            de IA, o envio desses dados aos provedores de IA, como explica a{" "}
            <Link to="/privacidade" className="text-primary hover:underline">Política de Privacidade</Link>.
          </p>
        </Section>

        <Section title="6. Planos pagos e cobrança">
          <p>
            Alguns recursos do Evolua Plus podem exigir uma assinatura paga. Preços, formas de pagamento,
            periodicidade e política de reembolso são exibidos na tela de contratação (página "Planos")
            antes da confirmação da compra. Assinaturas feitas por uma loja de aplicativos (Google Play ou
            App Store) seguem também as políticas de cobrança e cancelamento dessas plataformas.
          </p>
        </Section>

        <Section title="7. Uso aceitável">
          <p>Ao usar o Evolua Plus, você concorda em não:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Usar o aplicativo para fins ilegais ou fraudulentos;</li>
            <li>Tentar acessar contas de outros usuários ou dados que não são seus;</li>
            <li>Fazer engenharia reversa, copiar ou redistribuir o aplicativo sem autorização;</li>
            <li>Enviar conteúdo ofensivo, malicioso ou que viole direitos de terceiros pelo assistente de IA.</li>
          </ul>
        </Section>

        <Section title="8. Propriedade intelectual">
          <p>
            O Evolua Plus, sua marca, design, código e conteúdo original são de propriedade de
            [NOME_DO_CONTROLADOR]. Você mantém a titularidade sobre os dados pessoais que você
            fornece (fotos, textos, medições), que usamos apenas conforme nossa Política de Privacidade.
          </p>
        </Section>

        <Section title="9. Cancelamento e exclusão de conta">
          <p>
            Você pode excluir sua conta a qualquer momento em Configurações → Excluir conta. Isso remove
            permanentemente seus dados, conforme descrito na Política de Privacidade. Podemos suspender
            ou encerrar contas que violem estes Termos.
          </p>
        </Section>

        <Section title="10. Limitação de responsabilidade">
          <p>
            O Evolua Plus é fornecido "como está". Não garantimos que as recomendações geradas por IA
            sejam livres de erros e não nos responsabilizamos por decisões tomadas exclusivamente com
            base no conteúdo do aplicativo sem orientação profissional adequada.
          </p>
        </Section>

        <Section title="11. Alterações nestes termos">
          <p>
            Podemos atualizar estes Termos para refletir mudanças no produto ou na legislação. A data no
            topo desta página indica a versão vigente. Mudanças relevantes serão comunicadas no
            aplicativo ou por e-mail.
          </p>
        </Section>

        <Section title="12. Contato">
          <p>
            Dúvidas sobre estes Termos podem ser enviadas para{" "}
            <a href="mailto:[EMAIL_DE_CONTATO]" className="text-primary hover:underline">[EMAIL_DE_CONTATO]</a>.
          </p>
        </Section>
      </div>

      <div className="mt-12 text-sm">
        <Link to="/" className="tap-link text-primary hover:underline">← Voltar ao início</Link>
      </div>
    </div>
  </div>
);

export default Termos;
