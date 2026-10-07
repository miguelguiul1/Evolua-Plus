import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  { q: "A IA substitui um nutricionista?", a: "Não. O Evolua Plus é um assistente que organiza sua alimentação com base em ciência nutricional. Para tratamento clínico, condições específicas ou acompanhamento médico, consulte um profissional." },
  { q: "Posso trocar alimentos do plano?", a: "Sim. Você pode informar preferências, aversões e alergias, e a IA sugere substituições equivalentes em macros e calorias." },
  { q: "Funciona para emagrecimento?", a: "Sim. Ao definir 'emagrecer' como objetivo, calculamos um déficit calórico seguro e montamos refeições que sustentam saciedade." },
  { q: "Funciona para hipertrofia (ganho de massa)?", a: "Sim. Com objetivo 'ganhar massa', ajustamos superávit calórico e prioridade proteica adaptada ao seu peso e treino." },
  { q: "Posso cancelar quando quiser?", a: "Sim. Sem fidelidade e sem multa. Você cancela em um clique e mantém acesso até o fim do período pago." },
  { q: "Meus dados estão seguros?", a: "Sim. Usamos criptografia em trânsito e em repouso, autenticação segura e políticas de acesso por usuário. Você é o único que enxerga seus dados." },
  { q: "Como funciona a personalização?", a: "Combinamos seus dados (peso, altura, idade, atividade), objetivos, restrições e preferências para gerar um plano único — e reajustamos com base na sua evolução." },
  { q: "Posso informar alergias?", a: "Sim. Registre lactose, glúten, frutos do mar, amendoim, ovo e qualquer outra restrição — o plano é gerado respeitando essas regras." },
  { q: "Posso informar alimentos que não gosto?", a: "Sim. A IA remove esses alimentos e propõe alternativas equivalentes automaticamente." },
];

const LandingFAQ = () => (
  <section id="faq" className="py-24 bg-background">
    <div className="container mx-auto max-w-3xl">
      <div className="text-center mb-12">
        <span className="inline-block mb-3 px-3 py-1 rounded-full bg-primary/10 text-primary font-display text-xs font-semibold tracking-wide uppercase">
          Dúvidas frequentes
        </span>
        <h2 className="font-display text-3xl sm:text-5xl font-bold text-foreground">
          Tudo o que você precisa saber
        </h2>
        <p className="mt-4 text-muted-foreground text-lg">
          Ainda restou dúvida? Fale com a gente em <a href="mailto:contato@evoluaplus.app" className="text-primary hover:underline">contato@evoluaplus.app</a>.
        </p>
      </div>
      <Accordion type="single" collapsible className="bg-card rounded-2xl border border-border/60 divide-y divide-border/60 px-2 shadow-soft">
        {faqs.map((f, i) => (
          <AccordionItem key={i} value={`i-${i}`} className="border-none px-4">
            <AccordionTrigger className="font-display font-semibold text-left hover:no-underline hover:text-primary transition-colors py-5">
              {f.q}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed">
              {f.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);

export default LandingFAQ;