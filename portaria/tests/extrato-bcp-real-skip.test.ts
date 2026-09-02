import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseExtratoBcp, validarCadeiaSaldos } from "../src/lib/financeiro/extrato-bcp";

/**
 * Smoke contra um extrato real, fora do repositório: o teste salta-se
 * silenciosamente quando o ficheiro não existe na máquina. Nada de dados do
 * utilizador entra no repo nem no output — só contagens e totais.
 */
const CANDIDATOS = [
  "/Users/ig/Downloads/EXTMV12682136341.xlsx",
  "/Users/ig/Documents/Documents - Inês’s MacBook Pro/kimi/Workspaces/EUROPA/EXTMV12682136341.xlsx",
];
const CAMINHO_EXTRATO_REAL = CANDIDATOS.find((caminho) => existsSync(caminho)) ?? CANDIDATOS[0];

// Valores esperados do ficheiro (verificados à mão no Excel).
const ESPERADO = {
  movimentos: 171,
  saldoInicialCents: 513421,
  saldoFinalCents: 1690374,
  somaCreditosCents: 4027976,
  somaDebitosCents: -2851023,
};

describe.skipIf(!existsSync(CAMINHO_EXTRATO_REAL))("extrato real do Millennium BCP (ficheiro local)", () => {
  it("faz o parse integral, valida a cadeia de saldos e fecha as contas", () => {
    const resultado = parseExtratoBcp(readFileSync(CAMINHO_EXTRATO_REAL));
    if (!("movimentos" in resultado)) throw new Error(resultado.erro);

    expect(resultado.movimentos).toHaveLength(ESPERADO.movimentos);
    expect(validarCadeiaSaldos(resultado.movimentos).ok).toBe(true);
    expect(resultado.saldoInicialCents).toBe(ESPERADO.saldoInicialCents);
    expect(resultado.saldoFinalCents).toBe(ESPERADO.saldoFinalCents);

    const somaCreditos = resultado.movimentos
      .filter((m) => m.montanteCents > 0)
      .reduce((soma, m) => soma + m.montanteCents, 0);
    const somaDebitos = resultado.movimentos
      .filter((m) => m.montanteCents < 0)
      .reduce((soma, m) => soma + m.montanteCents, 0);
    expect(somaCreditos).toBe(ESPERADO.somaCreditosCents);
    expect(somaDebitos).toBe(ESPERADO.somaDebitosCents);
  });
});
