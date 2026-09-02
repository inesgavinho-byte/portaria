"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { obterConfiguracaoFinanceira } from "@/lib/actions/financeiro";
import {
  extrairContraparte,
  hashReferencia,
  parseExtratoBcp,
  validarCadeiaSaldos,
  type LinhaExtrato,
} from "@/lib/financeiro/extrato-bcp";

const TAMANHO_MAXIMO_BYTES = 25 * 1024 * 1024;
// A consulta de duplicados vai em chunks para não estourar o tamanho máximo
// de um `.in()`; a inserção em chunks evita payloads enormes num só pedido.
const TAMANHO_CHUNK_CONSULTA = 100;
const TAMANHO_CHUNK_INSERCAO = 500;
const MAXIMO_AVISOS = 5;

export type ImportarExtratoEstado =
  | {
      estado: "sucesso";
      conta: string | null;
      periodo: string;
      importados: number;
      duplicados: number;
      ignorados: number;
      avisos: string[];
      saldoInicial: string;
      saldoFinal: string;
    }
  | { estado: "erro"; erro: string; avisos?: string[] };

const emEuros = (cents: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(cents / 100);

const formatarData = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

function emChunks<T>(itens: T[], tamanho: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) chunks.push(itens.slice(i, i + tamanho));
  return chunks;
}

/**
 * Importa o extrato XLSX do Millennium BCP para `movimentos_bancarios`.
 *
 * Idempotente por desenho: cada movimento leva uma `referencia_externa` hash
 * do seu conteúdo, com índice único parcial na base — reimportar o mesmo
 * ficheiro (ou extratos sobrepostos) não duplica nada. Se a cadeia de saldos
 * não fechar, nada é escrito: é melhor recusar um ficheiro truncado do que
 * gravar uma prova bancária partida.
 */
export async function importarExtratoBcp(formData: FormData): Promise<ImportarExtratoEstado> {
  const ctx = await requireAdmin();
  if (!ctx) return { estado: "erro", erro: "Sem permissões para esta operação." };

  const ficheiro = formData.get("ficheiro") as File | null;
  if (!ficheiro || ficheiro.size === 0) {
    return { estado: "erro", erro: "Escolhe um ficheiro XLSX para importar." };
  }
  if (!ficheiro.name.toLowerCase().endsWith(".xlsx")) {
    return { estado: "erro", erro: "O extrato tem de ser um ficheiro .xlsx, exportado do Millennium BCP." };
  }
  if (ficheiro.size > TAMANHO_MAXIMO_BYTES) {
    return { estado: "erro", erro: "O ficheiro excede o limite de 25 MB." };
  }

  const resultado = parseExtratoBcp(await ficheiro.arrayBuffer());
  if ("erro" in resultado) return { estado: "erro", erro: resultado.erro };
  if (resultado.movimentos.length === 0) {
    return { estado: "erro", erro: "Nenhum movimento encontrado no extrato." };
  }

  const cadeia = validarCadeiaSaldos(resultado.movimentos);
  if (!cadeia.ok && cadeia.quebra) {
    const movimento = resultado.movimentos[cadeia.quebra.indice];
    return {
      estado: "erro",
      erro:
        `A cadeia de saldos do extrato não fecha no movimento ${cadeia.quebra.indice + 1} ` +
        `(${formatarData(movimento.dataLancamento)} — "${movimento.descricao}"): ` +
        `saldo esperado ${emEuros(cadeia.quebra.esperadoCents)}, saldo no ficheiro ${emEuros(cadeia.quebra.realCents)}. ` +
        "O ficheiro pode estar truncado ou corrompido — exporta o extrato outra vez. Nada foi importado.",
    };
  }

  // O BCP apresenta a conta como "0000045406856047 - EUR"; fica só o número.
  const conta = resultado.metadados.conta?.split(" - ")[0]?.trim() || null;

  const avisos: string[] = [];
  if (conta) {
    const configuracao = await obterConfiguracaoFinanceira();
    const iban = configuracao?.iban?.replace(/\s+/g, "");
    // Aviso, não bloqueio: o número de conta do Millennium nem sempre aparece
    // literalmente no IBAN formatado, mas se aparecer e diferir, é sinal de
    // que o extrato é de outra conta.
    if (iban && !iban.includes(conta)) {
      avisos.push(
        `A conta do extrato (${conta}) não corresponde ao IBAN configurado no financeiro — confirma que é a conta certa.`,
      );
    }
  }

  const supabase = await createClient();
  const referencias = await Promise.all(
    resultado.movimentos.map((linha) =>
      hashReferencia({
        conta,
        dataLancamento: linha.dataLancamento,
        dataValor: linha.dataValor,
        montanteCents: linha.montanteCents,
        descricao: linha.descricao,
        saldoCents: linha.saldoCents,
      }),
    ),
  );

  const referenciasExistentes = new Set<string>();
  for (const chunk of emChunks(referencias, TAMANHO_CHUNK_CONSULTA)) {
    const { data, error } = await supabase
      .from("movimentos_bancarios")
      .select("referencia_externa")
      .eq("tenant_id", ctx.tenant.id)
      .in("referencia_externa", chunk);
    if (error) {
      console.error("Erro ao consultar movimentos existentes do extrato:", error);
      return { estado: "erro", erro: "Erro ao verificar movimentos já existentes. Nada foi importado." };
    }
    for (const registo of data ?? []) {
      if (registo.referencia_externa) referenciasExistentes.add(registo.referencia_externa);
    }
  }

  const novos: { linha: LinhaExtrato; referencia: string }[] = [];
  let duplicados = 0;
  const vistosNesteFicheiro = new Set<string>();
  resultado.movimentos.forEach((linha, i) => {
    const referencia = referencias[i];
    // Repetições dentro do próprio ficheiro (teoricamente possíveis com saldo
    // líquido zero entre elas) contam como duplicados pela mesma lógica.
    if (referenciasExistentes.has(referencia) || vistosNesteFicheiro.has(referencia)) {
      duplicados += 1;
      return;
    }
    vistosNesteFicheiro.add(referencia);
    novos.push({ linha, referencia });
  });

  let importados = 0;
  for (const chunk of emChunks(novos, TAMANHO_CHUNK_INSERCAO)) {
    const { error } = await supabase.from("movimentos_bancarios").insert(
      chunk.map(({ linha, referencia }) => ({
        tenant_id: ctx.tenant.id,
        data_movimento: linha.dataLancamento,
        data_valor: linha.dataValor,
        tipo: linha.montanteCents > 0 ? "credito" : "debito",
        valor_cents: Math.abs(linha.montanteCents),
        descricao: linha.descricao,
        contraparte: extrairContraparte(linha.descricao),
        origem: "extrato_bancario",
        referencia_externa: referencia,
        // O extrato é a prova bancária primária: o que lá está, saiu ou entrou
        // de facto, e é isso que o mapa anual precisa para contar saídas
        // realizadas. O que continua pendente é a triagem de fornecedor —
        // `estado_reconciliacao` fica no default (`nao_reconciliado`).
        confirmado: true,
        fonte_referencia: ficheiro.name,
      })),
    );
    if (error) {
      console.error("Erro ao inserir movimentos do extrato BCP:", error);
      return {
        estado: "erro",
        erro: "Erro ao gravar os movimentos na base de dados. A importação foi interrompida — volta a tentar: é idempotente e não duplica o que já foi gravado.",
      };
    }
    importados += chunk.length;
  }

  for (const erroLinha of resultado.erros.slice(0, MAXIMO_AVISOS)) {
    avisos.push(`Linha ${erroLinha.linha} ignorada: ${erroLinha.motivo}.`);
  }
  if (resultado.erros.length > MAXIMO_AVISOS) {
    avisos.push(`E mais ${resultado.erros.length - MAXIMO_AVISOS} linhas ignoradas.`);
  }

  const primeiro = resultado.movimentos[0];
  const ultimo = resultado.movimentos[resultado.movimentos.length - 1];
  const periodo =
    resultado.metadados.dataInicio && resultado.metadados.dataFim
      ? `${formatarData(resultado.metadados.dataInicio)} – ${formatarData(resultado.metadados.dataFim)}`
      : `${formatarData(ultimo.dataLancamento)} – ${formatarData(primeiro.dataLancamento)}`;

  for (const rota of ["/configuracao/financeiro/movimentos", "/configuracao/financeiro/mapa", "/hoje"]) {
    revalidatePath(rota);
  }

  return {
    estado: "sucesso",
    conta,
    periodo,
    importados,
    duplicados,
    ignorados: resultado.erros.length,
    avisos,
    saldoInicial: emEuros(resultado.saldoInicialCents ?? 0),
    saldoFinal: emEuros(resultado.saldoFinalCents ?? 0),
  };
}
