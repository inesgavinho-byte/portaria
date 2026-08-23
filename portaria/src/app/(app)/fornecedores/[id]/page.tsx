import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CalendarClock,
  ChevronLeft,
  FileSignature,
  FileText,
  Landmark,
  Pencil,
  ReceiptText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { DownloadButton } from "@/components/app/download-button";
import { DocumentoUploadInline } from "@/components/admin/documento-upload-inline";
import { FornecedorArquivar } from "@/components/admin/fornecedor-arquivar";
import type { Contrato, Documento, Fornecedor } from "@/types/database";

type DespesaHistorico = {
  id: string;
  descricao: string;
  numero_documento: string | null;
  referencia: string | null;
  data_documento: string | null;
  data_pagamento: string | null;
  valor_cents: number;
  estado: string;
  criado_em: string;
};

type ObrigacaoHistorico = {
  id: string;
  titulo: string;
  periodicidade: string;
  valor_estimado_cents: number | null;
  proximo_vencimento: string | null;
  estado: string;
  criado_em: string;
};

type MovimentoHistorico = {
  id: string;
  despesa_id: string | null;
  data_movimento: string;
  tipo: "debito" | "credito";
  valor_cents: number;
  descricao: string;
  confirmado: boolean;
  estado_reconciliacao: string;
};

type EventoHistorico = {
  id: string;
  data: string;
  tipo: "contrato" | "obrigacao" | "despesa" | "pagamento" | "documento";
  titulo: string;
  detalhe?: string | null;
  valorCents?: number | null;
  estado?: string | null;
  href?: string | null;
};

const TIPO_LABEL: Record<EventoHistorico["tipo"], string> = {
  contrato: "Contrato",
  obrigacao: "Obrigação",
  despesa: "Despesa",
  pagamento: "Banco",
  documento: "Documento",
};

function formatCurrency(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(value),
  );
}

function iconFor(tipo: EventoHistorico["tipo"]) {
  const className = "h-4 w-4";
  if (tipo === "contrato") return <FileSignature className={className} />;
  if (tipo === "obrigacao") return <CalendarClock className={className} />;
  if (tipo === "despesa") return <ReceiptText className={className} />;
  if (tipo === "pagamento") return <Landmark className={className} />;
  return <FileText className={className} />;
}

export default async function FornecedorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");

  const supabase = await createClient();
  const [
    { data: fornecedor },
    { data: documentos },
    { data: contratos },
    { data: despesas },
    { data: obrigacoes },
  ] = await Promise.all([
    supabase.from("fornecedores").select("*").eq("id", id).eq("tenant_id", ctx.tenant.id).single(),
    supabase
      .from("documentos")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .eq("fornecedor_id", id)
      .order("upload_em", { ascending: false }),
    supabase
      .from("contratos")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .eq("fornecedor_id", id)
      .order("criado_em", { ascending: false }),
    supabase
      .from("despesas")
      .select("id,descricao,numero_documento,referencia,data_documento,data_pagamento,valor_cents,estado,criado_em")
      .eq("tenant_id", ctx.tenant.id)
      .eq("fornecedor_id", id)
      .order("data_documento", { ascending: false }),
    supabase
      .from("obrigacoes_recorrentes")
      .select("id,titulo,periodicidade,valor_estimado_cents,proximo_vencimento,estado,criado_em")
      .eq("tenant_id", ctx.tenant.id)
      .eq("fornecedor_id", id)
      .order("criado_em", { ascending: false }),
  ]);

  if (!fornecedor) notFound();

  const f = fornecedor as Fornecedor;
  const docs = (documentos ?? []) as Documento[];
  const cts = (contratos ?? []) as Contrato[];
  const ds = (despesas ?? []) as DespesaHistorico[];
  const obs = (obrigacoes ?? []) as ObrigacaoHistorico[];
  const despesaIds = ds.map((d) => d.id);

  let movimentos: MovimentoHistorico[] = [];
  if (despesaIds.length > 0) {
    const { data } = await supabase
      .from("movimentos_bancarios")
      .select("id,despesa_id,data_movimento,tipo,valor_cents,descricao,confirmado,estado_reconciliacao")
      .eq("tenant_id", ctx.tenant.id)
      .in("despesa_id", despesaIds)
      .order("data_movimento", { ascending: false });
    movimentos = (data ?? []) as MovimentoHistorico[];
  }

  const linhas = [
    ["Categoria", f.categoria],
    ["Responsável", f.contacto_nome],
    ["Telefone", f.telefone],
    ["Email", f.email],
    ["NIF", f.nif],
    ["Morada", f.morada],
  ].filter(([, v]) => v) as [string, string][];

  const despesasComBanco = new Set(
    movimentos.filter((m) => m.confirmado && m.tipo === "debito" && m.despesa_id).map((m) => m.despesa_id as string),
  );
  const totalRegistado = ds.reduce((acc, d) => acc + Number(d.valor_cents ?? 0), 0);
  const totalBanco = movimentos
    .filter((m) => m.confirmado && m.tipo === "debito")
    .reduce((acc, m) => acc + Number(m.valor_cents ?? 0), 0);
  const totalEmAberto = ds
    .filter((d) => d.estado !== "pago" && !despesasComBanco.has(d.id))
    .reduce((acc, d) => acc + Number(d.valor_cents ?? 0), 0);
  const obrigacoesAtivas = obs.filter((o) => o.estado === "ativa").length;

  const eventos: EventoHistorico[] = [
    ...cts.map((c) => ({
      id: `contrato-${c.id}`,
      data: c.data_inicio ?? c.criado_em,
      tipo: "contrato" as const,
      titulo: c.titulo,
      detalhe: [c.referencia, c.data_fim ? `até ${formatDate(c.data_fim)}` : null].filter(Boolean).join(" · "),
      href: `/contratos/${c.id}`,
    })),
    ...obs.map((o) => ({
      id: `obrigacao-${o.id}`,
      data: o.criado_em,
      tipo: "obrigacao" as const,
      titulo: o.titulo,
      detalhe: [o.periodicidade, o.proximo_vencimento ? `próximo ${formatDate(o.proximo_vencimento)}` : null]
        .filter(Boolean)
        .join(" · "),
      valorCents: o.valor_estimado_cents,
      estado: o.estado,
    })),
    ...ds.map((d) => ({
      id: `despesa-${d.id}`,
      data: d.data_documento ?? d.criado_em,
      tipo: "despesa" as const,
      titulo: d.descricao,
      detalhe: [d.numero_documento, d.referencia].filter(Boolean).join(" · "),
      valorCents: d.valor_cents,
      estado: despesasComBanco.has(d.id) && d.estado !== "pago" ? "pago no banco · por reconciliar" : d.estado,
    })),
    ...movimentos
      .filter((m) => m.confirmado)
      .map((m) => ({
        id: `movimento-${m.id}`,
        data: m.data_movimento,
        tipo: "pagamento" as const,
        titulo: m.tipo === "debito" ? "Saída bancária confirmada" : "Entrada bancária confirmada",
        detalhe: m.descricao,
        valorCents: m.valor_cents,
        estado: m.estado_reconciliacao,
      })),
    ...docs.map((d) => ({
      id: `documento-${d.id}`,
      data: d.upload_em,
      tipo: "documento" as const,
      titulo: d.titulo,
      detalhe: d.ano ? `Documento de ${d.ano}` : "Documento associado ao fornecedor",
    })),
  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const eventosPorAno = eventos.reduce<Record<string, EventoHistorico[]>>((acc, evento) => {
    const ano = String(new Date(evento.data).getFullYear());
    (acc[ano] ??= []).push(evento);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-5xl">
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
          <FornecedorArquivar fornecedorId={id} ativo={f.ativo} />
        </div>
      </div>

      <div className="mb-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Resumo label="Despesas registadas" valor={formatCurrency(totalRegistado)} />
        <Resumo label="Saídas confirmadas" valor={formatCurrency(totalBanco)} />
        <Resumo label="Em aberto" valor={formatCurrency(totalEmAberto)} destaque={totalEmAberto > 0} />
        <Resumo label="Obrigações activas" valor={String(obrigacoesAtivas)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
        <main className="min-w-0">
          <section className="portaria-panel overflow-hidden">
            <div className="border-b border-britishGreen/10 px-5 py-4 md:px-6">
              <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-britishGreen">Histórico</p>
              <h2 className="mt-1 font-title text-h3 text-ink">Relação com o condomínio</h2>
            </div>

            {eventos.length === 0 ? (
              <p className="px-6 py-10 font-body text-sm text-oliveGray">Ainda não existem eventos associados a este fornecedor.</p>
            ) : (
              <div className="px-5 py-5 md:px-6">
                {Object.entries(eventosPorAno)
                  .sort(([a], [b]) => Number(b) - Number(a))
                  .map(([ano, eventosAno]) => (
                    <div key={ano} className="mb-8 last:mb-0">
                      <div className="mb-4 flex items-center gap-3">
                        <span className="rounded-lg bg-britishGreen px-2.5 py-1 font-body text-xs font-semibold text-white">{ano}</span>
                        <div className="h-px flex-1 bg-britishGreen/10" />
                      </div>
                      <div className="space-y-0">
                        {eventosAno.map((evento) => (
                          <Evento key={evento.id} evento={evento} />
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </main>

        <aside className="space-y-6">
          {linhas.length > 0 && (
            <section className="portaria-panel overflow-hidden">
              <div className="border-b border-britishGreen/10 px-5 py-4">
                <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-britishGreen">Ficha</p>
              </div>
              <dl className="divide-y divide-britishGreen/10">
                {linhas.map(([k, v]) => (
                  <div key={k} className="px-5 py-3.5">
                    <dt className="mb-1 font-body text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-oliveGray">{k}</dt>
                    <dd className="break-words font-body text-sm text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              {f.notas && <p className="border-t border-britishGreen/10 px-5 py-4 font-body text-xs leading-5 text-oliveGray whitespace-pre-line">{f.notas}</p>}
            </section>
          )}

          <section className="portaria-panel overflow-hidden">
            <div className="border-b border-britishGreen/10 px-5 py-4">
              <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-britishGreen">Contratos</p>
            </div>
            {cts.length === 0 ? (
              <p className="px-5 py-5 font-body text-sm text-oliveGray">Sem contratos associados.</p>
            ) : (
              <div className="divide-y divide-britishGreen/10">
                {cts.map((c) => (
                  <Link key={c.id} href={`/contratos/${c.id}`} className="block px-5 py-4 transition-colors hover:bg-white/70">
                    <p className="font-body text-sm font-medium text-ink">{c.titulo}</p>
                    {c.data_fim && <p className="mt-1 font-body text-xs text-oliveGray">até {formatDate(c.data_fim)}</p>}
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="portaria-panel overflow-hidden">
            <div className="border-b border-britishGreen/10 px-5 py-4">
              <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-britishGreen">Documentos</p>
            </div>
            {docs.length > 0 && (
              <ul className="divide-y divide-britishGreen/10">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <FileText className="h-4 w-4 shrink-0 text-britishGreen" />
                      <span className="truncate font-body text-sm text-ink">{d.titulo}</span>
                    </span>
                    <DownloadButton documentoId={d.id} />
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t border-britishGreen/10 bg-white/40 p-4">
              <DocumentoUploadInline fornecedorId={id} redirectTo={`/fornecedores/${id}`} categoriaDefault="regulamento" />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Resumo({ label, valor, destaque = false }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className="portaria-panel px-4 py-4">
      <p className="font-body text-[0.67rem] font-semibold uppercase tracking-[0.11em] text-oliveGray">{label}</p>
      <p className={`mt-2 font-body text-xl font-semibold tracking-[-0.025em] ${destaque ? "text-alert" : "text-ink"}`}>{valor}</p>
    </div>
  );
}

function Evento({ evento }: { evento: EventoHistorico }) {
  const conteudo = (
    <div className="grid grid-cols-[82px_30px_minmax(0,1fr)_auto] gap-2 py-3.5 md:grid-cols-[96px_34px_minmax(0,1fr)_auto]">
      <div className="pt-0.5 font-body text-xs text-oliveGray">{formatDate(evento.data)}</div>
      <div className="relative flex justify-center">
        <span className="absolute bottom-[-14px] top-6 w-px bg-britishGreen/10 last:hidden" />
        <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-britishGreen/15 bg-white text-britishGreen">
          {iconFor(evento.tipo)}
        </span>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-body text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-britishGreen">{TIPO_LABEL[evento.tipo]}</span>
          {evento.estado && <span className="rounded-full bg-britishGreenSoft px-2 py-0.5 font-body text-[0.65rem] text-britishGreen">{evento.estado.replaceAll("_", " ")}</span>}
        </div>
        <p className="mt-1 font-body text-sm font-medium text-ink">{evento.titulo}</p>
        {evento.detalhe && <p className="mt-1 font-body text-xs leading-5 text-oliveGray">{evento.detalhe}</p>}
      </div>
      <div className="pl-2 text-right font-body text-sm font-semibold tabular-nums text-ink">
        {evento.valorCents !== undefined && evento.valorCents !== null ? formatCurrency(evento.valorCents) : ""}
      </div>
    </div>
  );

  if (evento.href) {
    return (
      <Link href={evento.href} className="block border-b border-britishGreen/10 transition-colors last:border-b-0 hover:bg-white/60">
        {conteudo}
      </Link>
    );
  }

  return <div className="border-b border-britishGreen/10 last:border-b-0">{conteudo}</div>;
}
