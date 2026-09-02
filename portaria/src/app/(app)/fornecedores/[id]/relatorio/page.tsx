import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { RelatorioFornecedor, type MovimentoRelatorio } from "@/components/relatorios/relatorio-fornecedor";
import { apurarTotais } from "@/lib/relatorios/apuramentos";
import type {
  Contrato,
  ContratoMemoriaEvento,
  Despesa,
  Fornecedor,
  PosicaoImputacao,
} from "@/types/database";

const anoDe = (valor: string | null) => {
  if (!valor) return null;
  const ano = new Date(valor).getFullYear();
  return Number.isNaN(ano) ? null : String(ano);
};

type RelatorioProps = { params: Promise<{ id: string }>; searchParams: Promise<{ ano?: string; modo?: string }> };

/**
 * Invólucro de diagnóstico.
 *
 * Em produção o Next.js substitui a mensagem de qualquer excepção não capturada
 * por um digest, para não expor detalhes. O efeito prático é que uma falha aqui
 * se torna indiagnosticável sem acesso aos logs da plataforma.
 *
 * Capturando a excepção dentro do nosso próprio código, a mensagem continua a
 * ser nossa e pode ser mostrada. O destinatário é um administrador autenticado
 * do condomínio, a ver o seu próprio dossiê: proporcional, e a alternativa é um
 * número opaco.
 */
export default async function RelatorioFornecedorPage(props: RelatorioProps) {
  try {
    return await CorpoRelatorio(props);
  } catch (erro) {
    // `redirect()` e `notFound()` sinalizam-se por excepção, com um digest
    // prefixado por NEXT_. Essas têm de passar intactas, ou a navegação e o 404
    // deixam de funcionar. Só se captura o que é falha genuína.
    const digest = (erro as { digest?: unknown } | null)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_")) throw erro;
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    const pilha = erro instanceof Error ? (erro.stack ?? "").split("\n").slice(1, 6).join("\n") : "";
    console.error("[relatorio-fornecedor] falha ao compor o documento", erro);
    return (
      <div className="mx-auto max-w-2xl py-16">
        <div className="portaria-panel px-6 py-7">
          <h1 className="font-title text-h3 text-ink">Não foi possível compor o relatório</h1>
          <p className="mt-2 font-body text-sm leading-6 text-oliveGray">
            O dossiê do fornecedor está intacto. A falha ocorreu ao gerar o documento.
          </p>
          <p className="mt-4 font-body text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-oliveGray">Causa</p>
          <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap rounded-lg bg-softCream px-3 py-2.5 font-mono text-[0.7rem] leading-5 text-ink">
            {mensagem}
          </pre>
          {pilha && (
            <>
              <p className="mt-4 font-body text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-oliveGray">
                Origem
              </p>
              <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap rounded-lg bg-softCream px-3 py-2.5 font-mono text-[0.66rem] leading-5 text-oliveGray">
                {pilha}
              </pre>
            </>
          )}
        </div>
      </div>
    );
  }
}

/**
 * Carrega e apura. A composição está em `RelatorioFornecedor` e recebe isto por
 * propriedades: uma única passagem de dados alimenta o ecrã e a impressão, sem
 * segunda consulta nem segundo render.
 */
async function CorpoRelatorio({ params, searchParams }: RelatorioProps) {
  const [{ id }, filtros] = await Promise.all([params, searchParams]);
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");
  const supabase = await createClient();
  const [{ data: fornecedor }, { data: contratos }] = await Promise.all([
    supabase.from("fornecedores").select("*").eq("id", id).eq("tenant_id", ctx.tenant.id).single(),
    supabase
      .from("contratos")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .eq("fornecedor_id", id)
      .order("data_inicio", { ascending: true }),
  ]);
  if (!fornecedor) notFound();
  const f = fornecedor as Fornecedor;
  const cts = (contratos ?? []) as Contrato[];
  const contratoIds = cts.map((contrato) => contrato.id);
  const despesaQuery = supabase.from("despesas").select("*").eq("tenant_id", ctx.tenant.id).eq("fornecedor_id", id);
  const memoriaQuery = contratoIds.length
    ? supabase
        .from("contrato_memoria_eventos")
        .select(
          "id,contrato_id,data_evento,tipo,titulo,resumo,natureza,valor_cents,despesa_id,movimento_id,efeito,criado_em,contrato_memoria_evidencias(id,localizador,citacao,papel,ia_documental_fontes(id,titulo,referencia,url,documento_id))",
        )
        .eq("tenant_id", ctx.tenant.id)
        .in("contrato_id", contratoIds)
        .order("data_evento", { ascending: true })
        .order("criado_em", { ascending: true })
    : Promise.resolve({ data: [] });
  const [{ data: despesas }, { data: memoria }] = await Promise.all([
    despesaQuery.order("data_documento", { ascending: true }),
    memoriaQuery,
  ]);
  const ds = (despesas ?? []) as Despesa[];
  const despesaIds = ds.map((despesa) => despesa.id);
  // A relação canónica movimento → fornecedor é `fornecedor_id`, não o texto da
  // descrição ou da contraparte. Movimentos ligados apenas a uma despesa deste
  // fornecedor continuam a ser recolhidos para não desaparecerem do relatório,
  // mas ficam identificados como não atribuídos.
  const movimentosSelect =
    "id,fornecedor_id,despesa_id,data_movimento,tipo,valor_cents,descricao,contraparte,referencia_externa,confirmado,estado_reconciliacao";
  const [{ data: movimentosDoFornecedor }, { data: movimentosPorDespesa }] = await Promise.all([
    supabase
      .from("movimentos_bancarios")
      .select(movimentosSelect)
      .eq("tenant_id", ctx.tenant.id)
      .eq("fornecedor_id", id)
      .order("data_movimento", { ascending: true }),
    despesaIds.length
      ? supabase
          .from("movimentos_bancarios")
          .select(movimentosSelect)
          .eq("tenant_id", ctx.tenant.id)
          .in("despesa_id", despesaIds)
          .order("data_movimento", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);
  const todosMovimentos = [
    ...new Map(
      [
        ...((movimentosDoFornecedor ?? []) as MovimentoRelatorio[]),
        ...((movimentosPorDespesa ?? []) as MovimentoRelatorio[]),
      ].map((m) => [m.id, m]),
    ).values(),
  ].sort((a, b) => a.data_movimento.localeCompare(b.data_movimento));
  const todosEventos = (memoria ?? []) as ContratoMemoriaEvento[];

  // Posições das partes sobre a imputação dos pagamentos deste fornecedor.
  // Consulta separada e por movimento: as posições não pertencem à memória do
  // contrato, e nenhum apuramento financeiro as lê.
  const movimentoIds = todosMovimentos.map((movimento) => movimento.id);
  const { data: posicoesData } = movimentoIds.length
    ? await supabase
        .from("imputacoes_posicoes")
        .select(
          "id,tenant_id,movimento_id,despesa_id,parte,parte_descricao,tipo,fundamento,estado,data_posicao,observacoes,criado_em,atualizado_em,imputacoes_posicoes_evidencias(id,localizador,citacao,ia_documental_fontes(id,titulo,referencia,url,documento_id))",
        )
        .eq("tenant_id", ctx.tenant.id)
        .in("movimento_id", movimentoIds)
        .order("data_posicao", { ascending: true })
    : { data: [] };
  const todasPosicoes = (posicoesData ?? []) as PosicaoImputacao[];

  const anos = Array.from(
    new Set(
      [
        ...ds.map((d) => anoDe(d.data_documento ?? d.criado_em)),
        ...todosMovimentos.map((m) => anoDe(m.data_movimento)),
        ...todosEventos.map((e) => anoDe(e.data_evento)),
      ].filter((ano): ano is string => Boolean(ano)),
    ),
  ).sort((a, b) => Number(b) - Number(a));
  const ano = filtros.ano && anos.includes(filtros.ano) ? filtros.ano : "";
  const financeiro = filtros.modo === "financeiro";
  const despesasPeriodo = ds.filter((d) => !ano || anoDe(d.data_documento ?? d.criado_em) === ano);
  const movimentosPeriodo = todosMovimentos.filter((m) => !ano || anoDe(m.data_movimento) === ano);
  const eventosPeriodo = todosEventos.filter((e) => !ano || anoDe(e.data_evento) === ano);

  const totais = apurarTotais({ id, despesasPeriodo, movimentosPeriodo, eventosPeriodo, contratos: cts });

  // Chamada directa, não `<RelatorioFornecedor .../>`: um elemento JSX só é
  // executado mais tarde, pelo motor de render do React Server Components —
  // já fora do `try/catch` de `RelatorioFornecedorPage`, que só cobre a
  // execução síncrona desta função. Chamar a função aqui faz a composição
  // inteira (incluindo tudo o que ainda não está protegido por um try/catch
  // próprio, como a secção de imputações) correr dentro desse `try`, para
  // que uma falha inesperada mostre a mensagem real em vez de cair na
  // fronteira de erro genérica da rota (`error.tsx`, só com o digest).
  return RelatorioFornecedor({
    fornecedorId: id,
    fornecedor: f,
    tenantNome: ctx.tenant.nome,
    contratos: cts,
    despesas: despesasPeriodo,
    movimentos: movimentosPeriodo,
    eventos: eventosPeriodo,
    posicoes: todasPosicoes.filter((posicao) =>
      movimentosPeriodo.some((movimento) => movimento.id === posicao.movimento_id),
    ),
    anos,
    ano,
    financeiro,
    totais,
    geradoEm: new Date().toISOString(),
    hrefFiltro: (novos) => {
      const p = new URLSearchParams();
      const a = novos.ano ?? ano;
      const m = novos.modo ?? (financeiro ? "financeiro" : "completo");
      if (a) p.set("ano", a);
      if (m === "financeiro") p.set("modo", m);
      return `/fornecedores/${id}/relatorio${p.size ? `?${p}` : ""}`;
    },
  });
}
