import { Link } from "react-router-dom";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

/**
 * Rascunho gerado automaticamente para viabilizar a publicação nas lojas (Google Play e
 * App Store exigem uma política de privacidade acessível sem login). PRECISA DE REVISÃO
 * jurídica/humana antes de publicar — em especial o e-mail de contato (placeholder) e a
 * confirmação de que a lista de dados coletados continua correta conforme o produto evolui.
 */
const Privacidade = () => (
  <div className="min-h-screen bg-background pt-24 pb-20">
    <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
      <header className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
          Política de <span className="text-primary">Privacidade</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Última atualização: 28 de setembro de 2026. Vigora tanto para o site quanto para o aplicativo
          Evolua Plus (Android/iOS).
        </p>
      </header>

      <div className="space-y-8">
        <Section title="1. Quem somos">
          <p>
            O Evolua Plus é uma plataforma de nutrição personalizada por inteligência artificial.
            Esta política explica quais dados coletamos, por que coletamos, como usamos, com quem
            compartilhamos e quais direitos você tem sobre eles, em conformidade com a Lei Geral de
            Proteção de Dados (LGPD — Lei nº 13.709/2018).
          </p>
          <p>
            Dúvidas, solicitações ou reclamações sobre seus dados podem ser enviadas para{" "}
            <a href="mailto:[EMAIL_DE_CONTATO]" className="text-primary hover:underline">[EMAIL_DE_CONTATO]</a>.
          </p>
        </Section>

        <Section title="2. Quais dados coletamos">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-foreground">Dados de cadastro:</strong> nome, e-mail e senha
              (armazenada de forma criptografada pelo provedor de autenticação; nunca em texto puro).
            </li>
            <li>
              <strong className="text-foreground">Dados de saúde e alimentação informados por você:</strong>{" "}
              peso, altura, objetivo, restrições e preferências alimentares, diário alimentar, registro
              de hidratação, fotos de evolução corporal (quando você opta por enviá-las) e metas
              nutricionais.
            </li>
            <li>
              <strong className="text-foreground">Interações com a IA:</strong> mensagens trocadas com o
              assistente de IA, histórico do scanner de alimentos/geladeira (fotos enviadas para análise
              e o resultado), memória e insights gerados pela IA para personalizar suas recomendações.
            </li>
            <li>
              <strong className="text-foreground">Dados de uso:</strong> favoritos, plano de refeições
              gerado, preferências de aparência (tema claro/escuro) e informações técnicas básicas de
              acesso (como logs de erro), usadas apenas para manter o serviço funcionando.
            </li>
            <li>
              <strong className="text-foreground">Permissão de câmera (aplicativo):</strong> usada
              exclusivamente quando você opta por tirar uma foto no Scanner de alimentos/geladeira. Não
              acessamos a câmera em segundo plano.
            </li>
          </ul>
        </Section>

        <Section title="3. Como usamos seus dados">
          <p>
            Usamos os dados acima para: (i) criar e manter sua conta; (ii) gerar planos alimentares,
            respostas do assistente de IA e recomendações personalizadas com base no que você informou;
            (iii) analisar fotos de alimentos/geladeira quando você usa o Scanner; (iv) acompanhar sua
            evolução (peso, hidratação, diário alimentar) e exibir seu histórico e insights; e (v)
            comunicação sobre sua conta (ex.: confirmação de cadastro, redefinição de senha).
          </p>
          <p>
            Não vendemos seus dados pessoais a terceiros. Dados de saúde/alimentação informados por você
            são tratados como dados sensíveis nos termos da LGPD e usados apenas para as finalidades
            descritas nesta política.
          </p>
        </Section>

        <Section title="4. Inteligência artificial">
          <p>
            Parte dos recursos do Evolua Plus (geração de cardápios, assistente de IA, scanner de
            alimentos, verificação de mitos nutricionais) funciona enviando as informações relevantes
            (por exemplo, sua pergunta, foto do alimento, ou seus dados de perfil) para um provedor de
            modelos de IA processar e gerar uma resposta. Esses dados são usados apenas para gerar a
            resposta solicitada e não são usados pelo provedor de IA para treinar modelos de terceiros
            fora do nosso acordo de uso.
          </p>
        </Section>

        <Section title="5. Onde seus dados ficam armazenados">
          <p>
            Utilizamos a Supabase (infraestrutura de banco de dados, autenticação e armazenamento de
            arquivos) como nosso operador de dados, responsável por armazenar e proteger as informações
            descritas acima em nosso nome, sob instruções nossas e contrato de processamento de dados.
          </p>
        </Section>

        <Section title="6. Seus direitos como titular dos dados">
          <p>Nos termos da LGPD, você pode a qualquer momento solicitar:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Confirmação de que tratamos seus dados e acesso a eles;</li>
            <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
            <li>Exportação dos seus dados em formato legível (disponível em Configurações → Exportar meus dados);</li>
            <li>Exclusão completa da sua conta e de todos os dados associados (disponível em Configurações → Excluir conta, ou solicitando pelo e-mail de contato);</li>
            <li>Revogação do consentimento e informações sobre com quem compartilhamos seus dados.</li>
          </ul>
          <p>
            Ao excluir sua conta pelo aplicativo, removemos permanentemente seu cadastro, arquivos
            enviados (como fotos de evolução) e todos os registros vinculados (diário alimentar,
            hidratação, evolução, conversas com a IA e favoritos). Essa ação não pode ser desfeita.
          </p>
        </Section>

        <Section title="7. Compartilhamento de dados">
          <p>
            Compartilhamos dados apenas com prestadores de serviço estritamente necessários para operar
            o app (hospedagem/banco de dados e provedor de modelos de IA, mencionados acima) e quando
            exigido por lei ou ordem judicial. Não compartilhamos seus dados de saúde com anunciantes.
          </p>
        </Section>

        <Section title="8. Retenção">
          <p>
            Mantemos seus dados enquanto sua conta estiver ativa. Ao solicitar a exclusão da conta, os
            dados são removidos permanentemente, exceto quando a lei exigir retenção por prazo maior
            (por exemplo, obrigações fiscais sobre pagamentos já realizados).
          </p>
        </Section>

        <Section title="9. Alterações nesta política">
          <p>
            Podemos atualizar esta política para refletir mudanças no produto ou na legislação. A data no
            topo desta página indica a versão vigente.
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
