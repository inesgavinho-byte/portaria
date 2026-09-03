import { describe, expect, it } from "vitest";
import {
  candidatosPessoaDaFracao,
  chavePessoa,
  planearAssociacoes,
} from "../src/lib/pessoas/sincronizacao";

describe("chavePessoa", () => {
  it("normaliza trim, maiúsculas e espaços internos", () => {
    expect(chavePessoa("  Maria   Silva ")).toBe("maria silva");
    expect(chavePessoa("MARIA SILVA")).toBe("maria silva");
    expect(chavePessoa("Maria\tSilva")).toBe("maria silva");
  });

  it("mantém nomes distintos distintos", () => {
    expect(chavePessoa("Maria Silva")).not.toBe(chavePessoa("Maria Sílva"));
  });
});

describe("candidatosPessoaDaFracao", () => {
  it("produz proprietário e inquilino com os seus contactos", () => {
    const candidatos = candidatosPessoaDaFracao({
      proprietario_nome: "João Costa",
      proprietario_email: "joao@example.pt",
      proprietario_telefone: "912 345 678",
      inquilino_nome: "Ana Reis",
    });
    expect(candidatos).toEqual([
      { papel: "proprietario", nome: "João Costa", email: "joao@example.pt", telefone: "912 345 678" },
      { papel: "inquilino", nome: "Ana Reis", email: null, telefone: null },
    ]);
  });

  it("ignora nomes vazios ou só com espaços", () => {
    const candidatos = candidatosPessoaDaFracao({
      proprietario_nome: "   ",
      proprietario_email: null,
      proprietario_telefone: null,
      inquilino_nome: null,
    });
    expect(candidatos).toEqual([]);
  });

  it("colapsa inquilino com o mesmo nome do proprietário numa só pessoa, sem perder contactos", () => {
    const candidatos = candidatosPessoaDaFracao({
      proprietario_nome: "Maria Silva",
      proprietario_email: "maria@example.pt",
      proprietario_telefone: null,
      inquilino_nome: "maria  silva",
    });
    expect(candidatos).toHaveLength(1);
    expect(candidatos[0]).toEqual({
      papel: "proprietario",
      nome: "Maria Silva",
      email: "maria@example.pt",
      telefone: null,
    });
  });
});

describe("planearAssociacoes", () => {
  it("mantém quem continua, fecha quem sai e abre quem entra", () => {
    const plano = planearAssociacoes(
      [
        { pessoa_id: "p1", papel: "proprietario" },
        { pessoa_id: "p2", papel: "inquilino" },
      ],
      [
        { pessoaId: "p1", papel: "proprietario" },
        { pessoaId: "p3", papel: "inquilino" },
      ],
    );
    expect(plano.inalteradas).toEqual(["p1"]);
    expect(plano.aFechar).toEqual(["p2"]);
    expect(plano.aAbrir).toEqual([{ pessoaId: "p3", papel: "inquilino" }]);
  });

  it("fecha tudo quando a fração fica sem contactos", () => {
    const plano = planearAssociacoes(
      [{ pessoa_id: "p1", papel: "proprietario" }],
      [],
    );
    expect(plano.aFechar).toEqual(["p1"]);
    expect(plano.aAbrir).toEqual([]);
  });

  it("a mesma pessoa com papel diferente é saída + entrada", () => {
    const plano = planearAssociacoes(
      [{ pessoa_id: "p1", papel: "inquilino" }],
      [{ pessoaId: "p1", papel: "proprietario" }],
    );
    expect(plano.aFechar).toEqual(["p1"]);
    expect(plano.aAbrir).toEqual([{ pessoaId: "p1", papel: "proprietario" }]);
  });
});
