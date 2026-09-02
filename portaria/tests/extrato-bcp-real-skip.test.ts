import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseExtratoBcp, validarCadeiaSaldos } from "../src/lib/financeiro/extrato-bcp";

/**
 * Smoke contra um extrato real, FORA do repositório: aponta-se o ficheiro pela
 * variável de ambiente PORTARIA_EXTRATO_SMOKE e o teste salta-se quando não há
 * nenhum. Nada de dados do utilizador entra no repo nem no output — o que se
 * afirma são propriedades internas do ficheiro (cadeia de saldos, identidade
 * contabilística), não valores concretos.
 */
const CAMINHO_EXTRATO_REAL = process.env.PORTARIA_EXTRATO_SMOKE ?? "";

describe.skipIf(!CAMINHO_EXTRATO_REAL || !existsSync(CAMINHO_EXTRATO_REAL))(
  "extrato real do Millennium BCP (ficheiro local)",
  () => {
    it("faz o parse integral, valida a cadeia de saldos e fecha a identidade contabilística", () => {
      const resultado = parseExtratoBcp(readFileSync(CAMINHO_EXTRATO_REAL));
      if (!("movimentos" in resultado)) throw new Error(resultado.erro);

      expect(resultado.movimentos.length).toBeGreaterThan(0);
      expect(validarCadeiaSaldos(resultado.movimentos, resultado.lacunasApos).ok).toBe(true);

      // Identidade contabilística: o saldo final tem de ser o saldo inicial
      // mais a soma algébrica de todos os movimentos do ficheiro.
      const somaMovimentos = resultado.movimentos.reduce((soma, m) => soma + m.montanteCents, 0);
      expect(resultado.saldoInicialCents! + somaMovimentos).toBe(resultado.saldoFinalCents);
    });
  },
);
