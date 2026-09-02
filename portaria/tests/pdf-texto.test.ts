import { describe, expect, it } from "vitest";
import {
  PDF_MAX_PAGINAS,
  ePdf,
  extrairTextoPdfLocal,
} from "@/lib/ai/pdf-texto";

// -------------------------------------------------------------------------
// Fixture: constrói um PDF mínimo mas válido (xref com offsets calculados),
// com camada de texto opcional — já exercitado contra o pdf.js real.
// -------------------------------------------------------------------------

function pdfMinimo(opts: {
  paginas: number;
  textoPorPagina?: (pagina: number) => string;
}): Buffer {
  const { paginas, textoPorPagina } = opts;
  const objetos: (string | undefined)[] = [];

  objetos[1] = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  const kids = [];
  for (let i = 0; i < paginas; i++) kids.push(`${4 + i * 2} 0 R`);
  objetos[2] = `2 0 obj\n<< /Type /Pages /Kids [ ${kids.join(" ")} ] /Count ${paginas} >>\nendobj\n`;
  objetos[3] = "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";

  for (let i = 0; i < paginas; i++) {
    const idPagina = 4 + i * 2;
    const idConteudo = idPagina + 1;
    objetos[idPagina] =
      `${idPagina} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
      `/Resources << /Font << /F1 3 0 R >> >> /Contents ${idConteudo} 0 R >>\nendobj\n`;
    const texto = textoPorPagina
      ? textoPorPagina(i + 1).replace(/([()\\])/g, "\\$1")
      : null;
    const stream = texto
      ? `BT /F1 12 Tf 72 720 Td (${texto}) Tj ET`
      : "";
    objetos[idConteudo] =
      `${idConteudo} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`;
  }

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let id = 1; id < objetos.length; id++) {
    offsets[id] = pdf.length;
    pdf += objetos[id];
  }
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objetos.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objetos.length; id++) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objetos.length} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

describe("ePdf", () => {
  it("reconhece o MIME do PDF", () => {
    expect(ePdf("application/pdf")).toBe(true);
  });

  it("rejeita não-PDF e ausência de tipo", () => {
    expect(ePdf("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(false);
    expect(ePdf("image/jpeg")).toBe(false);
    expect(ePdf(null)).toBe(false);
    expect(ePdf(undefined)).toBe(false);
    expect(ePdf("")).toBe(false);
  });
});

describe("extrairTextoPdfLocal", () => {
  it("extrai o texto de um PDF válido com camada de texto", async () => {
    const dados = new Uint8Array(
      pdfMinimo({
        paginas: 2,
        textoPorPagina: (p) => `Ata numero ${p}: aprovada a quota ordinaria.`,
      })
    );

    const resultado = await extrairTextoPdfLocal(dados);

    expect(resultado.estado).toBe("texto");
    if (resultado.estado !== "texto") return;
    expect(resultado.texto).toContain("quota ordinaria");
    expect(resultado.texto).toContain("Ata numero 1");
    expect(resultado.texto).toContain("Ata numero 2");
    expect(resultado.paginasTotal).toBe(2);
    expect(resultado.paginasExtraidas).toBe(2);
    expect(resultado.truncado).toBe(false);
  });

  it("PDF digitalizado sem camada de texto devolve sem_texto (nunca lança)", async () => {
    const dados = new Uint8Array(pdfMinimo({ paginas: 2 }));

    const resultado = await extrairTextoPdfLocal(dados);

    expect(resultado.estado).toBe("sem_texto");
    if (resultado.estado !== "sem_texto") return;
    expect(resultado.paginasTotal).toBe(2);
  });

  it("texto abaixo do limiar útil conta como sem_texto", async () => {
    const dados = new Uint8Array(
      pdfMinimo({ paginas: 1, textoPorPagina: () => "ok" })
    );

    const resultado = await extrairTextoPdfLocal(dados);

    expect(resultado.estado).toBe("sem_texto");
  });

  it("bytes corrompidos devolvem falha e nunca lançam excepção", async () => {
    const resultado = await extrairTextoPdfLocal(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    expect(resultado.estado).toBe("falha");
  });

  it("buffer vazio devolve falha", async () => {
    const resultado = await extrairTextoPdfLocal(new Uint8Array([]));
    expect(resultado.estado).toBe("falha");
  });

  it("respeita o teto de páginas e assinala o truncamento", async () => {
    const dados = new Uint8Array(
      pdfMinimo({
        paginas: PDF_MAX_PAGINAS + 2,
        textoPorPagina: (p) => `Pagina ${p} do regulamento do condomínio.`,
      })
    );

    const resultado = await extrairTextoPdfLocal(dados);

    expect(resultado.estado).toBe("texto");
    if (resultado.estado !== "texto") return;
    expect(resultado.paginasTotal).toBe(PDF_MAX_PAGINAS + 2);
    expect(resultado.paginasExtraidas).toBe(PDF_MAX_PAGINAS);
    expect(resultado.truncado).toBe(true);
    expect(resultado.texto).toContain("Pagina 1 ");
    expect(resultado.texto).not.toContain(`Pagina ${PDF_MAX_PAGINAS + 1} `);
  }, 60_000);
});
