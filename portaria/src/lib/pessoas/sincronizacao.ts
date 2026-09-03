// Lógica pura da sincronização fracoes → pessoas/fracao_pessoas.
// Vive fora de "use server" para ser testável sem Supabase (padrão de
// src/lib/financeiro/recebimentos).

export type PapelCandidato = "proprietario" | "inquilino";

export type CandidatoPessoa = {
  papel: PapelCandidato;
  nome: string;
  email: string | null;
  telefone: string | null;
};

export type ContactosDesnormalizados = {
  proprietario_nome: string | null;
  proprietario_email: string | null;
  proprietario_telefone: string | null;
  inquilino_nome: string | null;
};

// A chave de dedupe tem de coincidir com o índice único da migração
// 20260902600000 (tenant_id, lower(btrim(nome))): trim + minúsculas +
// espaços internos colapsados, para "Maria  Silva " e "maria silva"
// caírem na mesma pessoa.
export function chavePessoa(nome: string): string {
  return nome.trim().replace(/\s+/g, " ").toLowerCase();
}

// A partir dos campos desnormalizados de uma fração, produz os candidatos
// a pessoa/associação, sem duplicados: nomes que colidem (ex.: inquilino
// com o mesmo nome do proprietário) ficam numa só pessoa, e o proprietário
// vence na escolha dos contactos porque é quem traz e-mail e telefone.
export function candidatosPessoaDaFracao(
  contactos: ContactosDesnormalizados,
): CandidatoPessoa[] {
  const porChave = new Map<string, CandidatoPessoa>();

  const candidatos: CandidatoPessoa[] = [
    {
      papel: "proprietario",
      nome: (contactos.proprietario_nome ?? "").trim(),
      email: contactos.proprietario_email?.trim() || null,
      telefone: contactos.proprietario_telefone?.trim() || null,
    },
    {
      papel: "inquilino",
      nome: (contactos.inquilino_nome ?? "").trim(),
      email: null,
      telefone: null,
    },
  ];

  for (const candidato of candidatos) {
    if (!candidato.nome) continue;
    const chave = chavePessoa(candidato.nome);
    const existente = porChave.get(chave);
    if (existente) {
      existente.email = existente.email ?? candidato.email;
      existente.telefone = existente.telefone ?? candidato.telefone;
    } else {
      porChave.set(chave, candidato);
    }
  }

  return [...porChave.values()];
}

// Decide o que acontece a cada associação vigente da fração, dado o conjunto
// de pessoas que continuam a ter o papel:
//   - quem continua → fica como está;
//   - quem saiu → fecha-se com `ate` (histórico não se apaga);
//   - quem entrou → cabe ao chamador criar (devolvido em "aAbrir").
export type PlanoAssociacoes = {
  aFechar: string[];
  aAbrir: { pessoaId: string; papel: PapelCandidato }[];
  inalteradas: string[];
};

export function planearAssociacoes(
  vigentes: { pessoa_id: string; papel: string }[],
  atuais: { pessoaId: string; papel: PapelCandidato }[],
): PlanoAssociacoes {
  const chavesAtuais = new Set(atuais.map((a) => `${a.pessoaId}:${a.papel}`));
  const chavesVigentes = new Set(vigentes.map((v) => `${v.pessoa_id}:${v.papel}`));

  return {
    aFechar: vigentes
      .filter((v) => !chavesAtuais.has(`${v.pessoa_id}:${v.papel}`))
      .map((v) => v.pessoa_id),
    aAbrir: atuais.filter((a) => !chavesVigentes.has(`${a.pessoaId}:${a.papel}`)),
    inalteradas: vigentes
      .filter((v) => chavesAtuais.has(`${v.pessoa_id}:${v.papel}`))
      .map((v) => v.pessoa_id),
  };
}
