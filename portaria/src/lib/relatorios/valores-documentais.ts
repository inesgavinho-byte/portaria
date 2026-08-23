export type FonteDocumentalValor = { id: string; titulo: string; referencia: string | null; url: string | null; conteudo_markdown: string | null };
export type ValorDocumental = { cents: number; descricao: string; fonte: FonteDocumentalValor };

function cents(valor: string) {
  return Math.round(Number(valor.replaceAll(".", "").replace(",", ".")) * 100);
}

/** Extrai apenas linhas canónicas da biblioteca documental, nunca notas livres. */
export function resolverValoresDocumentais(fontes: FonteDocumentalValor[]) {
  const lateral: ValorDocumental[] = [];
  const historicos: ValorDocumental[] = [];
  for (const fonte of fontes) {
    const markdown = fonte.conteudo_markdown ?? "";
    const lateralMatch = markdown.match(/^Valor:\s*([\d.]+,\d{2})\s*EUR\s*\+\s*IVA\s*(\d+)%\.?$/mi);
    if (lateralMatch) {
      const base = cents(lateralMatch[1]);
      lateral.push({ cents: base + Math.round(base * Number(lateralMatch[2]) / 100), descricao: "Valor contratual documentado", fonte });
    }
    const proposta = markdown.match(/^[-*]\s*Valor global:\s*\*\*€([\d.]+)\*\*/mi);
    if (proposta) historicos.push({ cents: cents(`${proposta[1]},00`), descricao: "Proposta original", fonte });
    const mapa = markdown.match(/^Valor total da obra indicado:\s*([\d.]+)\s*EUR\.?$/mi);
    if (mapa) historicos.push({ cents: cents(`${mapa[1]},00`), descricao: "Mapa administrativo posterior", fonte });
    const contribuicao = markdown.match(/^Total da contribuição extraordinária:\s*([\d.]+,\d{2})\s*EUR\.?$/mi);
    if (contribuicao) historicos.push({ cents: cents(contribuicao[1]), descricao: "Contribuição extraordinária", fonte });
  }
  return { lateral, historicos };
}
