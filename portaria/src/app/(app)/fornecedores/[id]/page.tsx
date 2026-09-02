import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  ChevronLeft,
  FileSignature,
  FileText,
  Gavel,
  HardHat,
  Landmark,
  Pencil,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { FornecedorArquivar } from "@/components/admin/fornecedor-arquivar";
import {
  GRUPOS_TIMELINE,
  agruparTimelinePorAno,
  construirTimelineFornecedor,
  resumirFinanceiroFornecedor,
  unirMovimentos,
  type ContratoTimeline,
  type DespesaTimeline,
  type MemoriaEventoTimeline,
  type MovimentoTimeline,
  type ObrigacaoTimeline,
  type SupplierTimelineEvent,
  type SupplierTimelineGroup,
  type SupplierTimelineKind,
} from "@/lib/fornecedores/timeline";
import { DossierArquivo, type ArquivoItem } from "@/components/admin/dossier-arquivo";
import {
  EvidenciaJuntar,
  EvidenciaRemover,
  type DocumentoEscolha,
} from "@/components/admin/evidencia-juntar";
import {
  AcontecimentoCorrigir,
  AcontecimentoRegistar,
  type AcontecimentoActual,
} from "@/components/admin/acontecimento-forms";
import {
  ProcessoMovimento,
  type FacturaEscolha,
} from "@/components/admin/processo-movimento";
import { CATEGORIA_LABEL } from "@/lib/documentos";
import type { Documento, Fornecedor, PosicaoImputacao } from "@/types/database";

const TIPO_LABEL: Record<SupplierTimelineKind, string> = {
  contrato: "Contrato",
  proposta: "Proposta",
  adjudicacao: "Adjudicação",
  execucao: "Execução",
  fatura: "Factura",
  pagamento: "Pagamento",
  pagamento_declarado: "Pagamento declarado",
  decisao: "Decisão",
  garantia: "Garantia",
  conflito: "Conflito",
  comunicacao: "Comunicação",
  obrigacao: "Obrigação",
  documento: "Documento",
  outro: "Registo",
};

/** Filtros por natureza. A ordem é a da utilidade: primeiro o que está em aberto. */
const NATUREZAS_FILTRO: { valor: string; label: string }[] = [
  { valor: "tudo", label: "Todas" },
  { valor: "pendente", label: "Pendentes" },
  { valor: "conflito", label: "Conflitos" },
  { valor: "inferencia", label: "Inferências" },
  { valor: "facto", label: "Factos" },
];

const PAPEL_LABEL_CURTO = {
  primaria: "Primária",
  corroboracao: "Corrobora",
  contradicao: "Contradiz",
} as const;

const PAPEL_CLASSE = {
  primaria: "bg-britishGreenSoft text-britishGreen",
  corroboracao: "bg-softCream text-oliveGray",
  contradicao: "bg-alert/10 text-alert",
} as const;

const NATUREZA_LABEL = {
  facto: "Facto",
  inferencia: "Inferência",
  conflito: "Conflito",
  pendente: "Pendente",
} as const;

const NATUREZA_CLASSE = {
  facto: "border-britishGreen/20 text-britishGreen",
  inferencia: "border-warmBeige/60 text-oliveGray",
  conflito: "border-alert/40 text-alert",
  pendente: "border-oliveGray/30 text-oliveGray",
} as const;

const CONFIRMACAO_LABEL = {
  banco: "confirmado no banco",
  por_confirmar_no_banco: "por confirmar no banco",
  documental: "confirmação documental",
} as const;

function formatCurrency(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(cents / 100);
}

/**
 * Formata uma data, tolerando valores inválidos.
 *
 * `Intl.DateTimeFormat.format()` lança `RangeError: Invalid time value` quando
 * recebe uma Data inválida. Num Server Component isso derruba o render inteiro
 * e o utilizador vê apenas um digest. Uma data ilegível deve degradar para um
 * travessão, não para uma página em branco.
 *
 * A página do relatório já tinha esta guarda; esta não tinha.
 */
function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const instante = new Date(value);
  if (Number.isNaN(instante.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" }).format(instante);
}

function iconFor(kind: SupplierTimelineKind) {
  const className = "h-4 w-4";
  if (kind === "contrato" || kind === "adjudicacao") return <FileSignature className={className} />;
  if (kind === "proposta") return <Sparkles className={className} />;
  if (kind === "obrigacao") return <CalendarClock className={className} />;
  if (kind === "fatura") return <ReceiptText className={className} />;
  if (kind === "pagamento" || kind === "pagamento_declarado") return <Landmark className={className} />;
  if (kind === "execucao") return <HardHat className={className} />;
  if (kind === "decisao") return <Gavel className={className} />;
  if (kind === "garantia") return <ShieldCheck className={className} />;
  if (kind === "conflito") return <AlertTriangle className={className} />;
  return <FileText className={className} />;
}

type FornecedorProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vista?: string; natureza?: string; q?: string }>;
};

/**
 * Invólucro de diagnóstico.
 *
 * Em produção o Next.js substitui a mensagem de qualquer excepção não capturada
 * por um digest, para não expor detalhes. O efeito prático é que uma falha aqui
 * se torna indiagnosticável sem acesso aos logs da plataforma — que é
 * exactamente a situação em que esta página esteve.
 *
 * Capturando a excepção dentro do nosso próprio código, a mensagem continua a
 * ser nossa e pode ser mostrada. O destinatário é um administrador autenticado
 * do condomínio, a ver o seu próprio dossiê: proporcional, e a alternativa é um
 * número opaco. É o mesmo tratamento que a página do relatório já tem.
 */
export default async function FornecedorPage(props: FornecedorProps) {
  try {
    return await CorpoFornecedor(props);
  } catch (erro) {
    // `redirect()` e `notFound()` sinalizam-se por excepção, com um digest
    // prefixado por NEXT_. Essas têm de passar intactas, ou a navegação e o 404
    // deixam de funcionar. Só se captura o que é falha genuína.
    const digest = (erro as { digest?: unknown } | null)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_")) throw erro;
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    const pilha = erro instanceof Error ? (erro.stack ?? "").split("\n").slice(1, 6).join("\n") : "";
    console.error("[fornecedor] falha ao compor o dossiê", erro);
    return (
      <div className="mx-auto max-w-2xl py-16">
        <div className="portaria-panel px-6 py-7">
          <h1 className="font-title text-h3 text-ink">Não foi possível abrir o dossiê do fornecedor</h1>
          <p className="mt-2 font-body text-sm leading-6 text-oliveGray">
            Os dados do fornecedor estão intactos. A falha ocorreu ao compor a página.
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

async function CorpoFornecedor({ params, searchParams }: FornecedorProps) {
  const [{ id }, filtros] = await Promise.all([params, searchParams]);
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");

  const supabase = await createClient();
  const tenantId = ctx.tenant.id;

  // Primeiro passo: o fornecedor e os seus contratos. Os contratos são
  // necessários para ir buscar a memória da contratação, as despesas e os
  // movimentos numa única vaga em paralelo.
  const [{ data: fornecedor }, { data: contratos }] = await Promise.all([
    supabase.from("fornecedores").select("*").eq("id", id).eq("tenant_id", tenantId).single(),
    supabase
      .from("contratos")
      .select("id,titulo,referencia,descricao,data_inicio,data_fim,criado_em")
      .eq("tenant_id", tenantId)
      .eq("fornecedor_id", id)
      .order("data_inicio", { ascending: false }),
  ]);

  if (!fornecedor) notFound();

  const f = fornecedor as Fornecedor;
  const cts = (contratos ?? []) as ContratoTimeline[];
  const contratoIds = cts.map((contrato) => contrato.id);

  const [
    { data: documentos },
    { data: despesas },
    { data: obrigacoes },
    { data: memoria },
  ] = await Promise.all([
    supabase
      .from("documentos")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("fornecedor_id", id)
      // A data do documento manda; o upload é só quando entrou no arquivo.
      .order("data_documento", { ascending: false, nullsFirst: false })
      .order("upload_em", { ascending: false }),
    supabase
      .from("despesas")
      .select("id,descricao,numero_documento,referencia,data_documento,valor_cents,estado,criado_em")
      .eq("tenant_id", tenantId)
      .eq("fornecedor_id", id)
      .order("data_documento", { ascending: false }),
    supabase
      .from("obrigacoes_recorrentes")
      .select("id,titulo,periodicidade,valor_estimado_cents,proximo_vencimento,estado,criado_em")
      .eq("tenant_id", tenantId)
      .eq("fornecedor_id", id)
      .order("criado_em", { ascending: false }),
    contratoIds.length
      ? supabase
          .from("contrato_memoria_eventos")
          .select(
            "id,contrato_id,data_evento,tipo,titulo,resumo,natureza,valor_cents,despesa_id,movimento_id,efeito,contrato_memoria_evidencias(id,localizador,citacao,papel,ia_documental_fontes(id,titulo,referencia,url,documento_id))",
          )
          .eq("tenant_id", tenantId)
          .in("contrato_id", contratoIds)
          .order("data_evento", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const docs = (documentos ?? []) as Documento[];
  const ds = (despesas ?? []) as DespesaTimeline[];
  const obs = (obrigacoes ?? []) as ObrigacaoTimeline[];
  const eventosMemoria = (memoria ?? []) as MemoriaEventoTimeline[];

  // MOVIMENTO → FORNECEDOR é a relação canónica: um débito confirmado no
  // extrato entra aqui mesmo que a factura exacta continue por identificar.
  // Movimentos ligados apenas a uma despesa deste fornecedor são recolhidos
  // em paralelo para que nada desapareça do histórico — duas consultas
  // determinísticas em vez de um filtro composto.
  const despesaIds = ds.map((despesa) => despesa.id);
  const movimentosSelect =
    "id,fornecedor_id,despesa_id,data_movimento,tipo,valor_cents,descricao,contraparte,confirmado,estado_reconciliacao";
  const [{ data: movimentosDoFornecedor }, { data: movimentosPorDespesa }] = await Promise.all([
    supabase
      .from("movimentos_bancarios")
      .select(movimentosSelect)
      .eq("tenant_id", tenantId)
      .eq("fornecedor_id", id)
      .order("data_movimento", { ascending: false }),
    despesaIds.length
      ? supabase
          .from("movimentos_bancarios")
          .select(movimentosSelect)
          .eq("tenant_id", tenantId)
          .in("despesa_id", despesaIds)
          .order("data_movimento", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  const movimentos = unirMovimentos(
    (movimentosDoFornecedor ?? []) as MovimentoTimeline[],
    (movimentosPorDespesa ?? []) as MovimentoTimeline[],
  );

  // Posições das partes sobre a imputação destes pagamentos — o que cada parte
  // sustenta, ao lado da ligação movimento → factura, nunca dentro dela.
  const movimentoIds = movimentos.map((movimento) => movimento.id);
  const { data: posicoesData } = movimentoIds.length
    ? await supabase
        .from("imputacoes_posicoes")
        .select(
          "id,tenant_id,movimento_id,despesa_id,parte,parte_descricao,tipo,fundamento,estado,data_posicao,observacoes,criado_em,atualizado_em,imputacoes_posicoes_evidencias(id,localizador,citacao,ia_documental_fontes(id,titulo,referencia,url,documento_id))",
        )
        .eq("tenant_id", tenantId)
        .in("movimento_id", movimentoIds)
        .order("data_posicao", { ascending: true })
    : { data: [] };
  const posicoes = (posicoesData ?? []) as PosicaoImputacao[];

  const entrada = {
    fornecedorId: id,
    contratos: cts,
    memoria: eventosMemoria,
    despesas: ds,
    movimentos,
    obrigacoes: obs,
  };
  const eventos = construirTimelineFornecedor(entrada);
  const resumo = resumirFinanceiroFornecedor(entrada);

  // Quantas vezes cada documento do arquivo é citado no histórico. Um documento
  // que ninguém cita é um ficheiro; a contagem torna isso visível.
  const citacoesPorDocumento = new Map<string, number>();
  for (const evento of eventos) {
    for (const evidencia of evento.evidence) {
      const documentoId = evidencia.fonte?.documento_id;
      if (documentoId) {
        citacoesPorDocumento.set(documentoId, (citacoesPorDocumento.get(documentoId) ?? 0) + 1);
      }
    }
  }
  const arquivo: ArquivoItem[] = docs.map((documento) => ({
    id: documento.id,
    titulo: documento.titulo,
    categoria: documento.categoria,
    data_documento: documento.data_documento,
    contraparte: documento.contraparte,
    n_mensagens: documento.n_mensagens,
    citado: citacoesPorDocumento.get(documento.id) ?? 0,
  }));
  const escolhas: DocumentoEscolha[] = docs.map((documento) => ({
    id: documento.id,
    titulo: documento.titulo,
    categoria: CATEGORIA_LABEL[documento.categoria],
  }));

  // Facturas (despesas registadas) do fornecedor, para imputar pagamentos e
  // para as posições das partes dizerem a qual factura se referem.
  const facturas: FacturaEscolha[] = ds.map((despesa) => ({
    id: despesa.id,
    numero: despesa.numero_documento ?? despesa.referencia ?? "",
    descricao: despesa.descricao,
    valor: formatCurrency(despesa.valor_cents),
  }));
  const movimentosPorId = new Map(movimentos.map((movimento) => [movimento.id, movimento]));
  const posicoesPorMovimento = new Map<string, PosicaoImputacao[]>();
  for (const posicao of posicoes) {
    const lista = posicoesPorMovimento.get(posicao.movimento_id);
    if (lista) lista.push(posicao);
    else posicoesPorMovimento.set(posicao.movimento_id, [posicao]);
  }
  const memoriaPorId = new Map(eventosMemoria.map((evento) => [evento.id, evento]));
  const contratosEscolha = cts.map((contrato) => ({ id: contrato.id, titulo: contrato.titulo }));

  const grupoAtivo = GRUPOS_TIMELINE.some((grupo) => grupo.valor === filtros.vista)
    ? (filtros.vista as SupplierTimelineGroup | "tudo")
    : "tudo";
  const naturezaAtiva = NATUREZAS_FILTRO.some((n) => n.valor === filtros.natureza)
    ? filtros.natureza
    : "tudo";
  const termo = (filtros.q ?? "").trim().toLowerCase();

  const eventosVisiveis = eventos.filter((evento) => {
    if (grupoAtivo !== "tudo" && evento.group !== grupoAtivo) return false;
    if (naturezaAtiva !== "tudo" && evento.nature !== naturezaAtiva) return false;
    if (!termo) return true;
    return (
      evento.title.toLowerCase().includes(termo) ||
      (evento.summary ?? "").toLowerCase().includes(termo) ||
      evento.evidence.some((e) => e.citacao.toLowerCase().includes(termo))
    );
  });
  const eventosPorAno = agruparTimelinePorAno(eventosVisiveis);
  const pendentes = eventos.filter((evento) => evento.nature === "pendente");
  const filtrado = grupoAtivo !== "tudo" || naturezaAtiva !== "tudo" || termo.length > 0;
  const rota = `/fornecedores/${id}`;
  const comFiltros = (mudanca: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const base = { vista: grupoAtivo, natureza: naturezaAtiva, q: filtros.q ?? "", ...mudanca };
    for (const [chave, valor] of Object.entries(base)) {
      if (valor && valor !== "tudo") params.set(chave, valor);
    }
    const query = params.toString();
    return query ? `${rota}?${query}` : rota;
  };

  const linhas = [
    ["Categoria", f.categoria],
    ["Responsável", f.contacto_nome],
    ["Telefone", f.telefone],
    ["Email", f.email],
    ["NIF", f.nif],
    ["Morada", f.morada],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <div className="mx-auto w-full max-w-[1680px]">
      <Link
        href="/fornecedores"
        className="mb-6 inline-flex items-center gap-1 font-body text-xs font-semibold uppercase tracking-[0.12em] text-oliveGray transition-colors hover:text-britishGreen"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Fornecedores
      </Link>

      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1 className="font-title text-h1 text-ink">{f.nome}</h1>
            {!f.ativo && (
              <span className="rounded-full bg-alert/10 px-2.5 py-1 font-body text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-alert">
                Arquivado
              </span>
            )}
          </div>
          <p className="font-body text-sm text-oliveGray">
            Dossiê completo da relação deste fornecedor com o condomínio.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/fornecedores/${id}/editar`}
            className="inline-flex items-center gap-2 rounded-xl border border-britishGreen/15 bg-white/70 px-4 py-2.5 font-body text-xs font-semibold text-britishGreen transition-colors hover:bg-white"
          >
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Link>
          <Link
            href={`/fornecedores/${id}/relatorio`}
            className="inline-flex items-center gap-2 rounded-xl bg-britishGreen px-4 py-2.5 font-body text-xs font-semibold text-white transition-colors hover:bg-britishGreenDeep"
          >
            <FileText className="h-3.5 w-3.5" /> Relatório
          </Link>
          <FornecedorArquivar fornecedorId={id} ativo={f.ativo} />
        </div>
      </div>

      <div className="mb-3 grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <Resumo
          label="Facturado"
          valor={formatCurrency(resumo.despesasRegistadasCents)}
          nota="Documento fiscal emitido"
        />
        <Resumo
          label="Comprovado"
          valor={formatCurrency(resumo.saidasConfirmadasCents)}
          nota="Débitos com prova bancária"
        />
        <Resumo
          label="Declarado"
          valor={formatCurrency(resumo.pagamentosDeclaradosCents)}
          nota="Sem prova bancária"
          alerta={resumo.pagamentosDeclaradosCents > 0}
        />
        <Resumo
          label="Em aberto"
          valor={formatCurrency(resumo.emAbertoCents)}
          destaque={resumo.emAbertoCents > 0}
          nota={
            resumo.condicionadoCents > 0
              ? `${formatCurrency(resumo.condicionadoCents)} retidos`
              : undefined
          }
        />
        <Resumo
          label="Pendências"
          valor={String(pendentes.length)}
          alerta={pendentes.length > 0}
          nota={pendentes.length > 0 ? "por resolver" : undefined}
        />
        <Resumo
          label="Obrigações activas"
          valor={String(obs.filter((obrigacao) => obrigacao.estado === "ativa").length)}
        />
      </div>

      {(resumo.pagamentosDeclaradosCents > 0 ||
        resumo.entradasConfirmadasCents > 0 ||
        resumo.excedenteCents > 0 ||
        resumo.incoerencias.length > 0) && (
        <div className="mb-7 space-y-2">
          {resumo.pagamentosDeclaradosCents > 0 && (
            <Aviso tom="neutro">
              {formatCurrency(resumo.pagamentosDeclaradosCents)} em pagamentos históricos declarados em documentação
              administrativa, ainda sem prova bancária primária. Não entram em saídas confirmadas.
            </Aviso>
          )}
          {resumo.entradasConfirmadasCents > 0 && (
            <Aviso tom="neutro">
              {formatCurrency(resumo.entradasConfirmadasCents)} em entradas bancárias confirmadas deste fornecedor
              (estornos ou notas de crédito) já descontados do pago líquido.
            </Aviso>
          )}
          {resumo.excedenteCents > 0 && (
            <Aviso tom="alerta">
              O pago líquido confirmado excede o facturado em {formatCurrency(resumo.excedenteCents)}.
            </Aviso>
          )}
          {resumo.incoerencias.map((incoerencia) => (
            <Aviso key={incoerencia} tom="alerta">
              {incoerencia}
            </Aviso>
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,340px)] 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <main className="min-w-0 space-y-6">
          {pendentes.length > 0 && !filtrado && (
            <section className="portaria-panel overflow-hidden">
              <div className="border-b border-britishGreen/10 px-5 py-4 md:px-6">
                <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-alert">
                  Em aberto
                </p>
                <h2 className="mt-1 font-title text-h3 text-ink">
                  {pendentes.length} {pendentes.length === 1 ? "pendência" : "pendências"}
                </h2>
                <p className="mt-1 font-body text-xs leading-5 text-oliveGray">
                  O que falta resolver, decidir ou documentar. É esta a lista de trabalho do dossiê.
                </p>
              </div>
              <ul className="divide-y divide-britishGreen/10">
                {pendentes.slice(0, 8).map((evento) => (
                  <li key={evento.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3 md:px-6">
                    <span className="w-20 shrink-0 font-body text-xs tabular-nums text-oliveGray">
                      {formatDate(evento.date)}
                    </span>
                    <span className="min-w-0 flex-1 font-body text-sm text-ink">{evento.title}</span>
                    {evento.amountCents !== undefined && (
                      <span className="font-body text-sm font-semibold tabular-nums text-ink">
                        {formatCurrency(evento.amountCents)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {pendentes.length > 8 && (
                <Link
                  href={comFiltros({ natureza: "pendente", vista: "tudo" })}
                  className="block border-t border-britishGreen/10 px-5 py-3 font-body text-xs font-semibold text-britishGreen transition-colors hover:bg-white/60 md:px-6"
                >
                  Ver as {pendentes.length} pendências no histórico
                </Link>
              )}
            </section>
          )}

          <section className="portaria-panel overflow-hidden">
            <div className="border-b border-britishGreen/10 px-5 py-4 md:px-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-britishGreen">
                    Histórico
                  </p>
                  <h2 className="mt-1 font-title text-h3 text-ink">Relação com o condomínio</h2>
                </div>
                <AcontecimentoRegistar
                  contratos={contratosEscolha}
                  redirectTo={rota}
                  fornecedorId={id}
                />
              </div>
              {eventos.length > 0 && (
                <form action={rota} className="mt-4 flex flex-wrap items-center gap-2">
                  {grupoAtivo !== "tudo" && <input type="hidden" name="vista" value={grupoAtivo} />}
                  {naturezaAtiva !== "tudo" && (
                    <input type="hidden" name="natureza" value={naturezaAtiva} />
                  )}
                  <label className="relative flex min-w-[13rem] flex-1 items-center">
                    <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-oliveGray" />
                    <input
                      name="q"
                      defaultValue={filtros.q ?? ""}
                      placeholder="Procurar no histórico e nas citações"
                      className="w-full rounded-lg border border-britishGreen/15 bg-paper py-2 pl-9 pr-3 font-body text-xs text-ink placeholder:text-oliveGray/70 focus:border-britishGreen/40 focus:outline-none"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded-lg bg-britishGreen px-3 py-2 font-body text-[0.7rem] font-semibold text-white transition-colors hover:bg-britishGreenDeep"
                  >
                    Procurar
                  </button>
                  {filtrado && (
                    <Link
                      href={rota}
                      className="rounded-lg border border-britishGreen/15 px-3 py-2 font-body text-[0.7rem] font-semibold text-oliveGray transition-colors hover:text-britishGreen"
                    >
                      Limpar
                    </Link>
                  )}
                </form>
              )}

              {eventos.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 font-body text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-oliveGray">
                    Natureza
                  </span>
                  {NATUREZAS_FILTRO.map((natureza) => {
                    const total =
                      natureza.valor === "tudo"
                        ? eventos.length
                        : eventos.filter((evento) => evento.nature === natureza.valor).length;
                    if (total === 0) return null;
                    const activo = natureza.valor === naturezaAtiva;
                    return (
                      <Link
                        key={natureza.valor}
                        href={comFiltros({ natureza: natureza.valor })}
                        className={`rounded-lg px-2.5 py-1 font-body text-[0.7rem] font-semibold transition-colors ${
                          activo
                            ? "bg-britishGreen text-white"
                            : "border border-britishGreen/15 text-oliveGray hover:text-britishGreen"
                        }`}
                      >
                        {natureza.label} <span className="tabular-nums opacity-70">{total}</span>
                      </Link>
                    );
                  })}
                </div>
              )}

              {eventos.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 font-body text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-oliveGray">
                    Vista
                  </span>
                  {GRUPOS_TIMELINE.map((grupo) => {
                    const total =
                      grupo.valor === "tudo"
                        ? eventos.length
                        : eventos.filter((evento) => evento.group === grupo.valor).length;
                    if (total === 0) return null;
                    const ativo = grupo.valor === grupoAtivo;
                    return (
                      <Link
                        key={grupo.valor}
                        href={comFiltros({ vista: grupo.valor })}
                        className={`rounded-lg px-2.5 py-1 font-body text-[0.7rem] font-semibold transition-colors ${
                          ativo
                            ? "bg-britishGreen text-white"
                            : "border border-britishGreen/15 text-oliveGray hover:text-britishGreen"
                        }`}
                      >
                        {grupo.label} <span className="tabular-nums opacity-70">{total}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {filtrado && eventosVisiveis.length > 0 && (
              <p className="border-b border-britishGreen/10 bg-white/40 px-5 py-2.5 font-body text-[0.7rem] text-oliveGray md:px-6">
                {eventosVisiveis.length} de {eventos.length} acontecimentos correspondem ao filtro.
              </p>
            )}

            {eventosVisiveis.length === 0 ? (
              <p className="px-6 py-10 font-body text-sm text-oliveGray">
                {eventos.length === 0
                  ? "Ainda não existem acontecimentos associados a este fornecedor."
                  : "Nenhum acontecimento nesta vista."}
              </p>
            ) : (
              <div className="px-5 py-5 md:px-6">
                {eventosPorAno.map(([ano, eventosAno]) => (
                  <div key={ano} className="mb-8 last:mb-0">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="rounded-lg bg-britishGreen px-2.5 py-1 font-body text-xs font-semibold text-white">
                        {ano}
                      </span>
                      <div className="h-px flex-1 bg-britishGreen/10" />
                      <span className="font-body text-[0.68rem] uppercase tracking-[0.1em] text-oliveGray">
                        {eventosAno.length} {eventosAno.length === 1 ? "registo" : "registos"}
                      </span>
                    </div>
                    <div className="space-y-0">
                      {eventosAno.map((evento) => (
                        <Evento
                          key={evento.id}
                          evento={evento}
                          escolhas={escolhas}
                          rota={rota}
                          fornecedorId={id}
                          facturas={facturas}
                          movimentosPorId={movimentosPorId}
                          posicoesPorMovimento={posicoesPorMovimento}
                          memoriaPorId={memoriaPorId}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <DossierArquivo fornecedorId={id} redirectTo={rota} itens={arquivo} />
        </main>

        <aside className="space-y-6">
          {linhas.length > 0 && (
            <section className="portaria-panel overflow-hidden">
              <div className="border-b border-britishGreen/10 px-5 py-4">
                <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-britishGreen">
                  Ficha
                </p>
              </div>
              <dl className="divide-y divide-britishGreen/10">
                {linhas.map(([k, v]) => (
                  <div key={k} className="px-5 py-3.5">
                    <dt className="mb-1 font-body text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-oliveGray">
                      {k}
                    </dt>
                    <dd className="break-words font-body text-sm text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              {f.notas && (
                <p className="whitespace-pre-line border-t border-britishGreen/10 px-5 py-4 font-body text-xs leading-5 text-oliveGray">
                  {f.notas}
                </p>
              )}
            </section>
          )}

          <section className="portaria-panel overflow-hidden">
            <div className="border-b border-britishGreen/10 px-5 py-4">
              <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-britishGreen">
                Contratos
              </p>
            </div>
            {cts.length === 0 ? (
              <p className="px-5 py-5 font-body text-sm text-oliveGray">Sem contratos associados.</p>
            ) : (
              <div className="divide-y divide-britishGreen/10">
                {cts.map((c) => (
                  <Link
                    key={c.id}
                    href={`/contratos/${c.id}`}
                    className="block px-5 py-4 transition-colors hover:bg-white/70"
                  >
                    <p className="font-body text-sm font-medium text-ink">{c.titulo}</p>
                    {c.data_fim && <p className="mt-1 font-body text-xs text-oliveGray">até {formatDate(c.data_fim)}</p>}
                  </Link>
                ))}
              </div>
            )}
          </section>

        </aside>
      </div>
    </div>
  );
}

function Resumo({
  label,
  valor,
  destaque = false,
  alerta = false,
  nota,
}: {
  label: string;
  valor: string;
  destaque?: boolean;
  /** Marca o mosaico como merecedor de atenção sem o tratar como erro. */
  alerta?: boolean;
  nota?: string;
}) {
  const cor = destaque ? "text-alert" : alerta ? "text-britishGreenDeep" : "text-ink";
  return (
    <div
      className={`portaria-panel px-4 py-4 ${alerta && !destaque ? "ring-1 ring-inset ring-warmBeige/70" : ""}`}
    >
      <p className="font-body text-[0.67rem] font-semibold uppercase tracking-[0.11em] text-oliveGray">
        {label}
      </p>
      <p className={`mt-2 font-body text-xl font-semibold tracking-[-0.025em] tabular-nums ${cor}`}>
        {valor}
      </p>
      {nota && <p className="mt-1.5 font-body text-[0.68rem] leading-4 text-oliveGray">{nota}</p>}
    </div>
  );
}

function Aviso({ tom, children }: { tom: "neutro" | "alerta"; children: React.ReactNode }) {
  const classes =
    tom === "alerta"
      ? "border-alert/40 bg-alert/5 text-alert"
      : "border-warmBeige/60 bg-softCream/50 text-oliveGray";
  return (
    <p className={`rounded-xl border px-4 py-2.5 font-body text-xs leading-5 ${classes}`}>{children}</p>
  );
}

function Evento({
  evento,
  escolhas,
  rota,
  fornecedorId,
  facturas,
  movimentosPorId,
  posicoesPorMovimento,
  memoriaPorId,
}: {
  evento: SupplierTimelineEvent;
  escolhas: DocumentoEscolha[];
  rota: string;
  fornecedorId: string;
  facturas: FacturaEscolha[];
  movimentosPorId: Map<string, MovimentoTimeline>;
  posicoesPorMovimento: Map<string, PosicaoImputacao[]>;
  memoriaPorId: Map<string, MemoriaEventoTimeline>;
}) {
  const mostrarNatureza = evento.nature !== undefined && evento.nature !== "facto";
  const resumoCurto = evento.summary && evento.summary.length > 190;

  // O processo do pagamento segue o acontecimento: no evento do próprio
  // movimento, ou no acontecimento de memória que o absorveu (um pagamento
  // documentado pela memória mantém o processo visível onde a cronologia o
  // apresenta).
  const movimentoId =
    evento.sourceType === "movimento"
      ? evento.sourceId
      : evento.mergedFrom?.find((origem) => origem.sourceType === "movimento")?.sourceId;
  const movimentoProcesso = movimentoId ? movimentosPorId.get(movimentoId) : undefined;
  const posicoesDoMovimento = movimentoId ? (posicoesPorMovimento.get(movimentoId) ?? []) : [];

  // Pré-preencher a correcção com o registo bruto da memória, não com a linha
  // normalizada da cronologia.
  const memoriaActual = evento.memoriaId ? memoriaPorId.get(evento.memoriaId) : undefined;
  const actual: AcontecimentoActual | undefined = memoriaActual
    ? {
        id: memoriaActual.id,
        data_evento: memoriaActual.data_evento,
        tipo: memoriaActual.tipo,
        natureza: memoriaActual.natureza,
        titulo: memoriaActual.titulo,
        resumo: memoriaActual.resumo,
        valor_cents: memoriaActual.valor_cents,
      }
    : undefined;

  const conteudo = (
    <div className="grid grid-cols-[72px_28px_minmax(0,1fr)] gap-x-2 gap-y-1 py-3.5 sm:grid-cols-[86px_32px_minmax(0,1fr)_auto] md:grid-cols-[104px_34px_minmax(0,1fr)_auto] md:gap-x-3">
      <div className="pt-0.5 font-body text-xs text-oliveGray">{formatDate(evento.date)}</div>
      <div className="relative flex justify-center">
        <span className="absolute bottom-[-14px] top-6 w-px bg-britishGreen/10 last:hidden" />
        <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-britishGreen/15 bg-white text-britishGreen">
          {iconFor(evento.kind)}
        </span>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-body text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-britishGreen">
            {TIPO_LABEL[evento.kind]}
          </span>
          {mostrarNatureza && evento.nature && (
            <span
              className={`rounded-full border px-2 py-0.5 font-body text-[0.62rem] font-semibold uppercase tracking-[0.06em] ${NATUREZA_CLASSE[evento.nature]}`}
            >
              {NATUREZA_LABEL[evento.nature]}
            </span>
          )}
          {evento.confirmation && (
            <span className="rounded-full bg-britishGreenSoft px-2 py-0.5 font-body text-[0.65rem] text-britishGreen">
              {CONFIRMACAO_LABEL[evento.confirmation]}
            </span>
          )}
          {evento.state && !evento.confirmation && (
            <span className="rounded-full bg-britishGreenSoft px-2 py-0.5 font-body text-[0.65rem] text-britishGreen">
              {evento.state.replaceAll("_", " ")}
            </span>
          )}
        </div>
        {evento.href ? (
          <Link
            href={evento.href}
            className="mt-1 block font-body text-sm font-medium text-ink transition-colors hover:text-britishGreen"
          >
            {evento.title}
          </Link>
        ) : (
          <p className="mt-1 font-body text-sm font-medium text-ink">{evento.title}</p>
        )}
        {evento.summary && !resumoCurto && (
          <p className="mt-1 font-body text-xs leading-5 text-oliveGray">{evento.summary}</p>
        )}
        {evento.summary && resumoCurto && (
          <details className="mt-1 group">
            <summary className="cursor-pointer list-none font-body text-xs leading-5 text-oliveGray">
              {evento.summary.slice(0, 150).trimEnd()}…{" "}
              <span className="font-semibold text-britishGreen group-open:hidden">ver mais</span>
              <span className="hidden font-semibold text-britishGreen group-open:inline">ver menos</span>
            </summary>
            <p className="mt-1 font-body text-xs leading-5 text-oliveGray">{evento.summary}</p>
          </details>
        )}
        <details className="mt-2" open={evento.evidenceCount === 0 ? false : undefined}>
          <summary className="cursor-pointer list-none font-body text-[0.68rem] font-semibold text-britishGreen">
            {evento.evidenceCount > 0 ? (
              <>Evidência ({evento.evidenceCount})</>
            ) : (
              <span className="text-oliveGray">Sem evidência associada</span>
            )}
          </summary>
          {evento.evidenceCount > 0 && (
            <ul className="mt-2 space-y-2.5 border-l-2 border-britishGreen/15 pl-3">
              {evento.evidence.map((evidencia) => (
                <li key={evidencia.id} className="font-body text-[0.7rem] leading-5 text-oliveGray">
                  <span className="flex flex-wrap items-baseline gap-x-1.5">
                    <span className="font-semibold text-ink">
                      {evidencia.fonte?.titulo ?? "Fonte documental"}
                    </span>
                    {evidencia.localizador && <span>· {evidencia.localizador}</span>}
                    <span className={`rounded px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.06em] ${PAPEL_CLASSE[evidencia.papel]}`}>
                      {PAPEL_LABEL_CURTO[evidencia.papel]}
                    </span>
                    <EvidenciaRemover evidenciaId={evidencia.id} redirectTo={rota} />
                  </span>
                  <span className="mt-0.5 block border-l-2 border-warmBeige/60 pl-2 italic">
                    “{evidencia.citacao}”
                  </span>
                </li>
              ))}
            </ul>
          )}
          {evento.memoriaId && (
            <div className="mt-2.5">
              <EvidenciaJuntar eventoId={evento.memoriaId} redirectTo={rota} documentos={escolhas} />
            </div>
          )}
        </details>

        {actual && (
          <AcontecimentoCorrigir actual={actual} redirectTo={rota} fornecedorId={fornecedorId} />
        )}

        {movimentoProcesso && (
          <ProcessoMovimento
            movimento={{
              id: movimentoProcesso.id,
              despesa_id: movimentoProcesso.despesa_id,
              estado_reconciliacao: movimentoProcesso.estado_reconciliacao,
              tipo: movimentoProcesso.tipo,
              confirmado: movimentoProcesso.confirmado,
            }}
            facturas={facturas}
            posicoes={posicoesDoMovimento}
            documentos={escolhas}
            redirectTo={rota}
            fornecedorId={fornecedorId}
          />
        )}
      </div>
      <div className="col-start-3 font-body text-sm font-semibold tabular-nums text-ink sm:col-start-4 sm:pl-2 sm:text-right">
        {evento.amountCents !== undefined ? formatCurrency(evento.amountCents) : ""}
      </div>
    </div>
  );

  return <div className="border-b border-britishGreen/10 last:border-b-0">{conteudo}</div>;
}
