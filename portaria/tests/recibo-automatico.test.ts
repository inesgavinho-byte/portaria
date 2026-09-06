import { describe, expect, it } from "vitest";
import {
  resolverDestinatarios,
  decidirEmissao,
  formatarEuros,
  periodoLabel,
  emailValido,
  MESES_PT,
} from "../src/lib/financeiro/recibo-automatico";
import { montarReciboHtml } from "../src/lib/pdf/recibo-pdf";

describe("resolverDestinatarios", () => {
  it("devolve proprietário e inquilino com email, sem duplicados (case-insensitive)", () => {
    const destinos = resolverDestinatarios([
      { papel: "inquilino", email: "Inquilino@X.pt " },
      { papel: "proprietario", email: "Maria@Exemplo.pt" },
      { papel: "proprietario", email: "maria@exemplo.pt" },
    ]);
    expect(destinos).toEqual(["Maria@Exemplo.pt", "Inquilino@X.pt"]);
  });

  it("ignora contactos sem email e emails inválidos", () => {
    const destinos = resolverDestinatarios([
      { papel: "proprietario", email: null },
      { papel: "inquilino", email: "" },
      { papel: "representante", email: "sem-arroba" },
      { papel: "proprietario", email: "boa@exemplo.pt" },
    ]);
    expect(destinos).toEqual(["boa@exemplo.pt"]);
  });

  it("lista vazia quando a fração não tem contactos com email", () => {
    expect(resolverDestinatarios([{ papel: "proprietario", email: null }])).toEqual([]);
  });
});

describe("emailValido", () => {
  it("rejeita vazios e formatos sem domínio", () => {
    expect(emailValido(null)).toBe(false);
    expect(emailValido("   ")).toBe(false);
    expect(emailValido("a@b")).toBe(false);
    expect(emailValido("a b@c.pt")).toBe(false);
    expect(emailValido("a@b.pt")).toBe(true);
  });
});

describe("decidirEmissao", () => {
  it("emite só quando o toggle está ON e o pagamento ainda não tem recibo", () => {
    expect(decidirEmissao({ jaTemRecibo: false, automatico: true })).toBe(true);
    expect(decidirEmissao({ jaTemRecibo: true, automatico: true })).toBe(false);
    expect(decidirEmissao({ jaTemRecibo: false, automatico: false })).toBe(false);
    expect(decidirEmissao({ jaTemRecibo: true, automatico: false })).toBe(false);
  });
});

describe("formatarEuros e periodoLabel", () => {
  it("formata valores em euros pt-PT", () => {
    expect(formatarEuros(1080000)).toBe("10 800,00 €");
    expect(formatarEuros(5000)).toBe("50,00 €");
  });

  it("label de período em PT com todos os meses", () => {
    expect(periodoLabel(2026, 1)).toBe("Janeiro de 2026");
    expect(periodoLabel(2026, 12)).toBe(`${MESES_PT[11]} de 2026`);
  });
});

describe("montarReciboHtml", () => {
  const base = {
    tenant: {
      nome: "Condomínio Exemplo",
      morada: "Rua das Flores, 1, Lisboa",
      email: "geral@exemplo.pt",
    },
    perfil: {
      nif: "500000000",
      iban: "PT50000201231234567890154",
      administrador_nome: "Maria Admin",
      administrador_empresa: null,
    },
    logoDataUri: null,
    hoje: "5 de Setembro de 2026",
    recibo: { numero: "R-2026-000042", valorCents: 1080000 },
    fracao: { codigo: "4.D", proprietario: "Maria Silva" },
    pagamento: {
      metodo: "transferencia",
      referencia: "Extrato bancário — TRF",
      dataPagamento: "2026-09-03",
    },
    quotas: [
      { ano: 2026, mes: 7, valorCents: 540000 },
      { ano: 2026, mes: 8, valorCents: 540000 },
    ],
  };

  it("contém número, condómino, fração, total, quotas e NIF", () => {
    const html = montarReciboHtml(base);
    expect(html).toContain("RECIBO n.º R-2026-000042");
    expect(html).toContain("Maria Silva");
    expect(html).toContain("4.D");
    expect(html).toContain("10 800,00 €");
    expect(html).toContain("Julho de 2026");
    expect(html).toContain("Agosto de 2026");
    expect(html).toContain("NIF 500000000");
    expect(html).toContain("Transferência bancária");
    expect(html).toContain("TOTAL");
  });

  it("sem quotas alocadas mostra linha única com o total", () => {
    const html = montarReciboHtml({ ...base, quotas: [] });
    expect(html).toContain("Quotas de condomínio");
    expect(html).toContain("10 800,00 €");
  });

  it("não deixa valores indefinidos nem placeholders no documento", () => {
    const html = montarReciboHtml({ ...base, pagamento: { metodo: null, referencia: null, dataPagamento: null } });
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("null");
    expect(html).not.toContain("{{");
  });
});
