import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Camera, ClipboardList, MessageCircle, NotebookPen, ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import FundoFeira from "./FundoFeira";
import { Folha, Grao, MesaPosta, Tomate } from "./Formas";
import MarcadorIA from "./MarcadorIA";

/**
 * Landing "Feira" (prévia). Só afirmações verdadeiras sobre o produto:
 * sem números inventados, sem depoimentos inventados, sem "Powered by AI".
 */

const PASSOS = [
  { n: "1", titulo: "Conte como você come", texto: "Seu objetivo, sua rotina e o que você não come. Leva poucos minutos." },
  { n: "2", titulo: "Receba o cardápio da semana", texto: "Refeições com receitas simples e a lista de compras separada por seção do mercado. A IA monta, você ajusta." },
  { n: "3", titulo: "Anote e acompanhe", texto: "Anote o que comeu do jeito que lembrar e veja sua semana: dias anotados, água e constância." },
];

const RECURSOS = [
  { icon: ClipboardList, titulo: "Cardápio semanal", texto: "Sete dias de refeições pensados para a sua rotina.", ia: true },
  { icon: ShoppingBasket, titulo: "Lista de compras", texto: "Sai pronta do cardápio, por seção do mercado." },
  { icon: NotebookPen, titulo: "Diário", texto: "Anote refeições e água sem complicação." },
  { icon: Camera, titulo: "Foto do prato ou da geladeira", texto: "Uma estimativa do prato ou ideias com o que tem em casa.", ia: true },
  { icon: MessageCircle, titulo: "Assistente", texto: "Tire dúvidas do dia a dia na cozinha.", ia: true },
  { icon: BookOpen, titulo: "Receitas", texto: "Pratos simples, com ingredientes de mercado." },
];

const PERGUNTAS = [
  { q: "O Evolua Plus substitui um nutricionista?", a: "Não. O Evolua Plus é um assistente que organiza sua alimentação. Para tratamento clínico, condições específicas ou acompanhamento médico, consulte um profissional." },
  { q: "Posso trocar alimentos do plano?", a: "Sim. Você pode informar preferências, aversões e alergias, e o app sugere substituições." },
  { q: "Posso cancelar quando quiser?", a: "Sim. Sem fidelidade e sem multa. Você cancela em um clique e mantém acesso até o fim do período pago." },
  { q: "O que acontece com meus dados?", a: "Você é o único que enxerga seus dados e pode exportá-los ou apagá-los quando quiser, em Configurações." },
];

const LandingFeira = () => (
  <div className="text-foreground">
    {/* TOPO */}
    <section className="relative overflow-hidden pt-28 pb-40">
      <FundoFeira />
      <div className="relative container mx-auto max-w-2xl">
        <p className="anim-entrada text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cardápio · lista de compras · diário</p>
        <h1 className="anim-entrada mt-4 font-display text-[2.6rem] leading-[1.05] font-semibold">
          Comida de verdade, num plano que cabe na sua semana.
        </h1>
        <p className="anim-entrada mt-5 text-[17px] leading-relaxed text-muted-foreground">
          O Evolua Plus monta seu cardápio da semana com o que você gosta e encontra no mercado, faz a lista de compras e ajuda você a anotar o que comeu. Sem dieta da moda.
        </p>
        <div className="anim-entrada mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="xl" className="press w-full sm:w-auto">
            <Link to="/auth">Começar grátis <ArrowRight className="ml-1" /></Link>
          </Button>
          <Button asChild size="xl" variant="outline" className="press w-full sm:w-auto">
            <a href="#como-funciona">Como funciona</a>
          </Button>
        </div>
        <p className="mt-5 text-sm text-muted-foreground">Não substitui nutricionista ou médico.</p>
      </div>
    </section>

    {/* LUGAR DA FOTO (até haver fotografia real) */}
    <section className="container mx-auto max-w-2xl pb-14">
      <figure className="overflow-hidden rounded-2xl border border-border">
        <MesaPosta className="block w-full h-auto" />
        <figcaption className="bg-card px-4 py-2.5 text-xs text-muted-foreground">Ilustração provisória: aqui entra uma foto de comida de verdade.</figcaption>
      </figure>
    </section>

    {/* COMO FUNCIONA */}
    <section id="como-funciona" className="container mx-auto max-w-2xl py-14 scroll-mt-24">
      <h2 className="font-display text-3xl font-semibold">Como funciona</h2>
      <ol className="mt-8 space-y-4">
        {PASSOS.map((p) => (
          <li key={p.n} className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <span className="font-display text-3xl font-semibold leading-none text-primary w-8 shrink-0">{p.n}</span>
            <div>
              <p className="font-display text-xl font-semibold">{p.titulo}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{p.texto}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>

    {/* O QUE TEM NO APP */}
    <section id="recursos" className="relative py-14 bg-secondary/60 scroll-mt-24">
      <div className="container mx-auto max-w-2xl">
        <h2 className="font-display text-3xl font-semibold">O que tem no app</h2>
        <p className="mt-2 text-[15px] text-muted-foreground">As partes marcadas com <MarcadorIA className="align-middle" /> usam inteligência artificial. O resultado é uma sugestão: você sempre confere e ajusta.</p>
        <ul className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
          {RECURSOS.map(({ icon: Icon, titulo, texto, ia }) => (
            <li key={titulo} className="flex items-start gap-4 p-4">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-foreground/70 text-foreground">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <p className="font-semibold flex items-center gap-2">{titulo} {ia && <MarcadorIA />}</p>
                <p className="mt-0.5 text-[15px] text-muted-foreground">{texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>

    {/* DO NOSSO JEITO */}
    <section className="container mx-auto max-w-2xl py-14">
      <h2 className="font-display text-3xl font-semibold">Do nosso jeito</h2>
      <div className="mt-8 grid grid-cols-1 gap-4">
        {[
          { F: Tomate, t: "Comida de verdade primeiro", d: "Feijão, arroz, legumes, fruta, ovo. Receitas de mercado, não de suplemento." },
          { F: Folha, t: "Sem placar, sem culpa", d: "Ninguém perde nada por esquecer um dia. A gente olha a semana, não a sequência." },
          { F: Grao, t: "Seus dados são seus", d: "Você exporta ou apaga tudo quando quiser." },
        ].map(({ F, t, d }) => (
          <div key={t} className="flex items-start gap-4">
            <F className="h-12 w-12 shrink-0" />
            <div>
              <p className="font-display text-xl font-semibold">{t}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{d}</p>
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* DEPOIMENTOS: espaço reservado, sem conteúdo inventado */}
    <section className="container mx-auto max-w-2xl pb-14">
      <div className="rounded-2xl border-2 border-dashed border-input p-6 text-center">
        <p className="font-display text-lg font-semibold">Depoimentos reais entram aqui</p>
        <p className="mt-1 text-sm text-muted-foreground">Só com relatos autorizados por quem usa o app. Até lá, este espaço fica vazio.</p>
      </div>
    </section>

    {/* PERGUNTAS */}
    <section id="faq" className="container mx-auto max-w-2xl py-14 scroll-mt-24">
      <h2 className="font-display text-3xl font-semibold">Perguntas</h2>
      <Accordion type="single" collapsible className="mt-6 rounded-2xl border border-border bg-card px-4">
        {PERGUNTAS.map(({ q, a }) => (
          <AccordionItem key={q} value={q} className="last:border-b-0">
            <AccordionTrigger className="text-left font-semibold">{q}</AccordionTrigger>
            <AccordionContent className="text-[15px] leading-relaxed text-muted-foreground">{a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>

    {/* FIM */}
    <section className="relative overflow-hidden bg-foreground text-background dark:bg-card dark:text-foreground dark:border-y dark:border-border py-16">
      <Tomate className="pointer-events-none absolute -right-6 -bottom-8 w-28 opacity-90" />
      <div className="relative container mx-auto max-w-2xl">
        <h2 className="font-display text-3xl font-semibold leading-tight">Comece pela semana que vem.</h2>
        <p className="mt-3 text-[15px] opacity-80">Crie sua conta grátis e conheça o app. O cardápio semanal faz parte do Plus.</p>
        <Button asChild size="xl" className="press mt-8 w-full sm:w-auto">
          <Link to="/auth">Criar conta grátis <ArrowRight className="ml-1" /></Link>
        </Button>
        <p className="mt-5 text-sm opacity-70">O Evolua Plus não substitui nutricionista ou médico.</p>
      </div>
    </section>
  </div>
);

export default LandingFeira;
