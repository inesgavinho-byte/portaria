import { describe, expect, it } from "vitest";
import {
  BLUEPRINTS_BASE,
  TIPOS_BLUEPRINT,
  VARIAVEIS_DISPONIVEIS,
  preencherBlueprint,
  variaveisUsadas,
} from "../src/lib/blueprints";

const TOKENS_VALIDOS = new Set(VARIAVEIS_DISPONIVEIS.map((v) => v.token));
const TIPOS_VALIDOS = new Set(TIPOS_BLUEPRINT.map((t) => t.valor));

function tokensUsados(html: string): string[] {
  return [...html.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]);
}

describe("blueprints base", () => {
  it("tem nomes únicos — o seletor do «novo» usa o nome como chave", () => {
    const nomes = BLUEPRINTS_BASE.map((b) => b.nome);
    expect(new Set(nomes).size).toBe(nomes.length);
  });

  it("inclui os três modelos originais", () => {
    const nomes = BLUEPRINTS_BASE.map((b) => b.nome);
    expect(nomes).toContain("Circular de Quotas");
    expect(nomes).toContain("Convocatória");
    expect(nomes).toContain("Ata");
  });

  it.each(BLUEPRINTS_BASE)(
    "«$nome» tem tipo válido e só usa variáveis conhecidas e declaradas",
    (b) => {
      expect(b.nome.length).toBeGreaterThan(0);
      expect(TIPOS_VALIDOS.has(b.tipo)).toBe(true);
      expect(b.conteudo_template.length).toBeGreaterThan(0);
      for (const token of tokensUsados(b.conteudo_template)) {
        expect(TOKENS_VALIDOS.has(token)).toBe(true);
        expect(b.variaveis).toContain(token);
      }
    }
  );

  it.each(BLUEPRINTS_BASE)(
    "«$nome» preenchido com todos os dados não deixa placeholders visíveis",
    (b) => {
      const preenchido = preencherBlueprint(
        b.conteudo_template,
        {
          nome: "Condomínio Exemplo",
          morada: "Rua das Flores, 1, Lisboa",
          email: "geral@exemplo.pt",
        },
        {
          nif: "500000000",
          iban: "PT50000201231234567890154",
          administrador_nome: "Maria Admin",
          administrador_empresa: null,
        },
        "5 de Setembro de 2026",
        {
          assembleia: { numero: "2", data: "30 de Setembro de 2026" },
          circular: { numero: "7", assunto: "Assunto de teste" },
        }
      );
      expect(preenchido).not.toContain("{{");
      if (tokensUsados(b.conteudo_template).includes("condominio.nome")) {
        expect(preenchido).toContain("Condomínio Exemplo");
      }
    }
  );

  it("variaveisUsadas extrai apenas tokens válidos, sem repetidos", () => {
    const html =
      "<p>{{condominio.nome}} {{condominio.nome}} {{token.inexistente}} {{condominio.nif}}</p>";
    expect(variaveisUsadas(html)).toEqual(["condominio.nome", "condominio.nif"]);
  });
});
