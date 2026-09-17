import jsPDF from "jspdf";

/** Identidade visual Evolua Plus aplicada aos PDFs */
const GREEN: [number, number, number] = [45, 106, 79];
const GREEN_DARK: [number, number, number] = [21, 61, 46];
const GREEN_SOFT: [number, number, number] = [92, 156, 130];
const GOLD: [number, number, number] = [212, 160, 60];
const INK: [number, number, number] = [30, 41, 38];
const MUTED: [number, number, number] = [120, 130, 126];
const BORDER: [number, number, number] = [222, 229, 224];
const CARD_BG: [number, number, number] = [250, 252, 250];
const ROW_ALT: [number, number, number] = [244, 248, 245];
const WHITE: [number, number, number] = [255, 255, 255];

/** Opção alternativa equivalente à refeição principal (ex.: "Ou troque por: ..."). */
export type MealAlternative = { nome: string; calorias?: number };

/** Dados de uma refeição renderizada como card individual. */
export type MealCardData = {
  tipo: string;
  nome: string;
  calorias?: number;
  proteina?: number;
  carb?: number;
  gordura?: number;
  /** Linha extra opcional (ex.: ingredientes ou quantidade). */
  detalhe?: string;
  /** Opções equivalentes listadas de forma discreta abaixo da opção principal. */
  alternativas?: MealAlternative[];
};

/** Uma linha da mini-tabela de resumo nutricional (ex.: "Média diária"). */
export type SummaryRow = {
  label: string;
  calorias?: number;
  proteina?: number;
  carb?: number;
  gordura?: number;
};

/** Seção de texto corrido — formato original, mantido para compatibilidade. */
export type TextSection = { kind?: "text"; title: string; lines: string[] };
/** Seção de refeições — cada item vira um card visual com ícone por tipo. */
export type MealsSection = { kind: "meals"; title: string; meals: MealCardData[] };
/** Seção de resumo nutricional em mini-tabela. */
export type SummarySection = { kind: "summary"; title: string; rows: SummaryRow[] };
/** Lista de compras organizada em colunas. */
export type ShoppingSection = { kind: "shopping"; title: string; items: string[] };
/** Sugestões de suplementação em torno do treino — bloco à parte, sempre com aviso próprio. */
export type SupplementSection = {
  kind: "supplement";
  title: string;
  preTreino?: string;
  intraTreino?: string;
  posTreino?: string;
};

export type PdfSection = TextSection | MealsSection | SummarySection | ShoppingSection | SupplementSection;

export type Options = {
  title: string;
  subtitle?: string;
  sections: PdfSection[];
  fileName: string;
};

/** Estilo (cor + iniciais) por tipo de refeição — jsPDF não renderiza emoji de forma confiável. */
const MEAL_TYPE_STYLES: { match: RegExp; color: [number, number, number]; glyph: string }[] = [
  { match: /caf[eé]|manh[ãa]/i, color: GOLD, glyph: "CM" },
  { match: /almo[çc]o/i, color: GREEN, glyph: "AL" },
  { match: /lanche/i, color: GREEN_SOFT, glyph: "LA" },
  { match: /jantar|ceia/i, color: GREEN_DARK, glyph: "JA" },
];
const mealTypeStyle = (tipo: string) =>
  MEAL_TYPE_STYLES.find((m) => m.match.test(tipo)) ?? { color: MUTED, glyph: "•" };

const fmtMacro = (label: string, value?: number, unit = "g") =>
  value != null && Number.isFinite(value) ? `${label} ${Math.round(value)}${unit}` : null;

/** Gera o documento jsPDF com a identidade Evolua Plus (sem salvar/baixar). */
export const buildPdf = ({ title, subtitle, sections }: Omit<Options, "fileName">): jsPDF => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = 0;

  const header = () => {
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, pageW, 86, "F");
    doc.setFillColor(...GOLD);
    doc.rect(0, 86, pageW, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Evolua Plus", margin, 44);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Saúde e nutrição inteligente", margin, 62);
    y = 128;
  };

  /** Rodapé obrigatório: não pode sumir nem ficar menos visível em nenhuma página. */
  const footer = () => {
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.75);
    doc.line(margin, pageH - 40, pageW - margin, pageH - 40);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      `Gerado em ${new Date().toLocaleDateString("pt-BR")} · evoluaplus.app · conteúdo educativo, gerado por IA — não substitui acompanhamento profissional`,
      margin,
      pageH - 26
    );
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 56) {
      footer();
      doc.addPage();
      header();
    }
  };

  header();

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, margin, y);
  y += 20;

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...MUTED);
    doc.text(subtitle, margin, y);
    y += 22;
  }

  /** Título de seção padrão (bullet verde + texto em caixa alta leve), reaproveitado por todos os tipos de bloco. */
  const drawSectionTitle = (label: string) => {
    ensureSpace(34);
    y += 12;
    doc.setFillColor(...GREEN);
    doc.circle(margin + 3, y - 4, 3, "F");
    doc.setTextColor(...GREEN);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(label, margin + 14, y);
    y += 16;
  };

  const drawTextSection = (section: TextSection) => {
    drawSectionTitle(section.title);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    section.lines.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, contentW - 14);
      wrapped.forEach((w: string) => {
        ensureSpace(16);
        doc.text(w, margin + 14, y);
        y += 14;
      });
    });
  };

  const drawMealCard = (meal: MealCardData) => {
    const pad = 10;
    const iconAreaW = 28;
    const textX = margin + pad + iconAreaW;
    const textW = contentW - pad * 2 - iconAreaW;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    const tipoLines: string[] = doc.splitTextToSize(meal.tipo.toUpperCase(), textW);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    const nomeLines: string[] = doc.splitTextToSize(meal.nome, textW);

    const macro = [fmtMacro("P", meal.proteina), fmtMacro("C", meal.carb), fmtMacro("G", meal.gordura)]
      .filter(Boolean)
      .join("   ");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const macroLines: string[] = macro ? doc.splitTextToSize(macro, textW) : [];

    doc.setFontSize(8.75);
    const detalheLines: string[] = meal.detalhe ? doc.splitTextToSize(meal.detalhe, textW) : [];

    const altText = meal.alternativas?.length
      ? `Ou troque por: ${meal.alternativas.map((a) => `${a.nome}${a.calorias != null ? ` (${Math.round(a.calorias)} kcal)` : ""}`).join("; ")}`
      : "";
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    const altLines: string[] = altText ? doc.splitTextToSize(altText, textW) : [];

    const LH = { tipo: 10, nome: 14, macro: 12, detalhe: 11, alt: 10.5 };
    const innerH =
      tipoLines.length * LH.tipo +
      6 +
      nomeLines.length * LH.nome +
      (macroLines.length ? macroLines.length * LH.macro + 3 : 0) +
      (detalheLines.length ? detalheLines.length * LH.detalhe + 3 : 0) +
      (altLines.length ? altLines.length * LH.alt + 3 : 0);
    const cardH = Math.max(innerH + pad * 2, 46);

    ensureSpace(cardH + 10);
    const top = y;

    doc.setFillColor(...CARD_BG);
    doc.roundedRect(margin, top, contentW, cardH, 6, 6, "F");
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.75);
    doc.roundedRect(margin, top, contentW, cardH, 6, 6, "S");

    const style = mealTypeStyle(meal.tipo);
    doc.setFillColor(...style.color);
    doc.roundedRect(margin, top, 4, cardH, 2, 2, "F");

    const iconR = 10;
    const iconCx = margin + pad + iconR;
    const iconCy = top + pad + iconR;
    doc.setFillColor(...style.color);
    doc.circle(iconCx, iconCy, iconR, "F");
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(style.glyph, iconCx, iconCy + 2.6, { align: "center" });

    if (meal.calorias != null && Number.isFinite(meal.calorias)) {
      doc.setTextColor(...style.color);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`${Math.round(meal.calorias)} kcal`, margin + contentW - pad, top + pad + 9, { align: "right" });
    }

    let ty = top + pad + 2;
    doc.setTextColor(...style.color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    tipoLines.forEach((l) => {
      doc.text(l, textX, ty + 6);
      ty += LH.tipo;
    });

    ty += 4;
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    nomeLines.forEach((l) => {
      doc.text(l, textX, ty + 8);
      ty += LH.nome;
    });

    if (macroLines.length) {
      ty += 3;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...GREEN);
      macroLines.forEach((l) => {
        doc.text(l, textX, ty + 6);
        ty += LH.macro;
      });
    }

    if (detalheLines.length) {
      ty += 3;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.75);
      doc.setTextColor(...MUTED);
      detalheLines.forEach((l) => {
        doc.text(l, textX, ty + 6);
        ty += LH.detalhe;
      });
    }

    if (altLines.length) {
      ty += 3;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      altLines.forEach((l) => {
        doc.text(l, textX, ty + 6);
        ty += LH.alt;
      });
    }

    y = top + cardH + 8;
  };

  const drawMealsSection = (section: MealsSection) => {
    drawSectionTitle(section.title);
    section.meals.forEach(drawMealCard);
  };

  const drawSummarySection = (section: SummarySection) => {
    if (!section.rows.length) return;
    drawSectionTitle(section.title);

    const rowH = 26;
    const labelW = contentW * 0.3;
    const colW = (contentW - labelW) / 4;
    const cols = ["Calorias", "Proteína", "Carboidrato", "Gordura"];
    const tableH = rowH * (section.rows.length + 1);

    ensureSpace(tableH + 8);
    const top = y;

    doc.setFillColor(...GREEN);
    doc.rect(margin, top, contentW, rowH, "F");
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    cols.forEach((c, i) => {
      doc.text(c, margin + labelW + colW * i + colW / 2, top + rowH / 2 + 3, { align: "center" });
    });

    section.rows.forEach((row, i) => {
      const rowTop = top + rowH * (i + 1);
      doc.setFillColor(...(i % 2 === 0 ? WHITE : ROW_ALT));
      doc.rect(margin, rowTop, contentW, rowH, "F");

      doc.setTextColor(...INK);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(row.label, margin + 10, rowTop + rowH / 2 + 3);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...INK);
      const values = [
        fmtMacro("", row.calorias, " kcal"),
        fmtMacro("", row.proteina, " g"),
        fmtMacro("", row.carb, " g"),
        fmtMacro("", row.gordura, " g"),
      ];
      values.forEach((v, vi) => {
        doc.text(v ?? "—", margin + labelW + colW * vi + colW / 2, rowTop + rowH / 2 + 3, { align: "center" });
      });
    });

    doc.setDrawColor(...GREEN);
    doc.setLineWidth(1);
    doc.rect(margin, top, contentW, tableH, "S");
    for (let i = 1; i < 5; i++) {
      const lineX = margin + labelW + colW * (i - 1);
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.5);
      doc.line(lineX, top, lineX, top + tableH);
    }

    y = top + tableH + 10;
  };

  const drawShoppingSection = (section: ShoppingSection) => {
    if (!section.items.length) return;
    drawSectionTitle(section.title);

    const numCols = section.items.length > 10 ? 3 : section.items.length > 4 ? 2 : 1;
    const colW = contentW / numCols;
    const rowH = 18;
    const rowsCount = Math.ceil(section.items.length / numCols);

    ensureSpace(rowsCount * rowH + 8);
    const top = y;

    section.items.forEach((item, i) => {
      const col = Math.floor(i / rowsCount);
      const row = i % rowsCount;
      const cx = margin + col * colW;
      const cy = top + row * rowH;

      doc.setDrawColor(...GREEN);
      doc.setLineWidth(0.9);
      doc.roundedRect(cx, cy - 8, 9, 9, 1.5, 1.5, "S");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...INK);
      const maxW = colW - 22;
      const [line] = doc.splitTextToSize(item, maxW);
      doc.text(line, cx + 14, cy);
    });

    y = top + rowsCount * rowH + 8;
  };

  /**
   * Bloco de suplementação — sempre com contorno dourado e aviso próprio, além do
   * rodapé padrão, já que é território mais sensível (alimentação em torno do treino).
   */
  const drawSupplementSection = (section: SupplementSection) => {
    const rows = [
      { label: "Pré-treino", text: section.preTreino },
      { label: "Intra-treino", text: section.intraTreino },
      { label: "Pós-treino", text: section.posTreino },
    ].filter((r): r is { label: string; text: string } => !!r.text);
    if (!rows.length) return;

    drawSectionTitle(section.title);

    const pad = 12;
    const textW = contentW - pad * 2;
    const disclaimer =
      "Sugestões educativas com alimentos comuns — não substitui acompanhamento de nutricionista ou médico.";

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const rowsWithLines = rows.map((r) => ({ ...r, lines: doc.splitTextToSize(r.text, textW) as string[] }));

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    const disclaimerLines: string[] = doc.splitTextToSize(disclaimer, textW);

    const LABEL_H = 13;
    const LINE_H = 13;
    const innerH =
      rowsWithLines.reduce((sum, r) => sum + LABEL_H + r.lines.length * LINE_H + 4, 0) +
      10 +
      disclaimerLines.length * 11;
    const boxH = innerH + pad * 2;

    ensureSpace(boxH + 10);
    const top = y;

    doc.setFillColor(...CARD_BG);
    doc.roundedRect(margin, top, contentW, boxH, 6, 6, "F");
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(1.1);
    doc.roundedRect(margin, top, contentW, boxH, 6, 6, "S");

    let ty = top + pad + 4;
    rowsWithLines.forEach((r) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...GREEN_DARK);
      doc.text(r.label, margin + pad, ty);
      ty += LABEL_H;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...INK);
      r.lines.forEach((l) => {
        doc.text(l, margin + pad, ty);
        ty += LINE_H;
      });
      ty += 4;
    });

    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.5);
    doc.line(margin + pad, ty, margin + contentW - pad, ty);
    ty += 10;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    disclaimerLines.forEach((l) => {
      doc.text(l, margin + pad, ty);
      ty += 11;
    });

    y = top + boxH + 10;
  };

  sections.forEach((section) => {
    switch (section.kind) {
      case "meals":
        drawMealsSection(section);
        break;
      case "summary":
        drawSummarySection(section);
        break;
      case "shopping":
        drawShoppingSection(section);
        break;
      case "supplement":
        drawSupplementSection(section);
        break;
      default:
        drawTextSection(section);
    }
  });

  footer();
  return doc;
};

/** Salva o PDF disparando o download do navegador (comportamento web original). */
export const exportBrandedPdf = ({ title, subtitle, sections, fileName }: Options) => {
  const doc = buildPdf({ title, subtitle, sections });
  doc.save(fileName);
};
