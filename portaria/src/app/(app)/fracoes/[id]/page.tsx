import Link from "next/link";
import { ChevronLeft, FileText, ReceiptText, CircleAlert, Mail, WalletCards, UserRound } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import type { Comunicacao, ComunicacaoDestinatario, Fracao, Ocorrencia, Pagamento, QuotaMensal, Recibo } from "@/types/database";

type EntregaHistorico = ComunicacaoDestinatario & { comunicacao: Comunicacao | null };
type Evento = {
  data: string;
  tipo: "comunicacao" | "quota" | "pagamento" | "recibo" | "ocorrencia";
  titulo: string;
  detalhe: string;
  href: string;
};

const EURO = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

function formatarData(data: string | null) {
  if (!data) return "Data não registada";
  return new Date(`${data.includes("T") ? data : `${data}T00:00:00`}`).toLocaleDateString("pt-PT", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default async function FracaoDossiePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");

  const supabase = await createClient();
  const [{ data: fracao }, { data: entregas }, { data: quotas }, { data: pagamentos }, { data: recibos }, { data: ocorrencias }] = await Promise.all([
    supabase.from("fracoes").select("*").eq("id", id).eq("tenant_id", ctx.tenant.id).maybeSingle(),
    supabase.from("comunicacao_destinatarios").select("*, comunicacao:comunicacoes(*)")
      .eq("fracao_id", id).eq("tenant_id", ctx.tenant.id).order("criado_em", { ascending: false }),
    supabase.from("quotas_mensais").select("*").eq("fracao_id", id).eq("tenant_id", ctx.tenant.id)
      .order("ano", { ascending: false }).order("mes", { ascending: false }),
    supabase.from("pagamentos").select("*").eq("fracao_id", id).eq("tenant_id", ctx.tenant.id)
      .order("data_pagamento", { ascending: false }),
    supabase.from("recibos").select("*").eq("fracao_id", id).eq("tenant_id", ctx.tenant.id)
      .order("emitido_em", { ascending: false }),
    supabase.from("ocorrencias").select("*").eq("fracao_id", id).eq("tenant_id", ctx.tenant.id)
      .order("atualizado_em", { ascending: false }),
  ]);
  if (!fracao) notFound();

  const f = fracao as Fracao;
  const listaEntregas = (entregas ?? []) as EntregaHistorico[];
  const listaQuotas = (quotas ?? []) as QuotaMensal[];
  const listaPagamentos = (pagamentos ?? []) as Pagamento[];
  const listaRecibos = (recibos ?? []) as Recibo[];
  const listaOcorrencias = (ocorrencias ?? []) as Ocorrencia[];
  const pendentes = listaQuotas.filter((quota) => quota.estado === "pendente" || quota.estado === "parcial");
  const totalPendente = pendentes.reduce((soma, quota) => soma + quota.valor_cents, 0);

  const eventos: Evento[] = [
    ...listaEntregas.flatMap((entrega) => entrega.comunicacao ? [{
      data: entrega.comunicacao.data_comunicacao,
      tipo: "comunicacao" as const,
      titulo: entrega.comunicacao.assunto,
      detalhe: `Comunicação ${entrega.estado === "entregue" ? "entregue" : entrega.estado === "enviado" ? "enviada" : entrega.estado}`,
      href: `/comunicacoes/${entrega.comunicacao.id}`,
    }] : []),
    ...listaQuotas.map((quota) => ({
      data: quota.vencimento ?? `${quota.ano}-${String(quota.mes).padStart(2, "0")}-01`,
      tipo: "quota" as const,
      titulo: `Quota — ${String(quota.mes).padStart(2, "0")}/${quota.ano}`,
      detalhe: `${EURO.format(quota.valor_cents / 100)} · ${quota.estado}`,
      href: `/configuracao/financeiro?tab=quotas&ano=${quota.ano}&mes=${quota.mes}`,
    })),
    ...listaPagamentos.map((pagamento) => ({
      data: pagamento.data_pagamento,
      tipo: "pagamento" as const,
      titulo: "Pagamento registado",
      detalhe: `${EURO.format(pagamento.valor_cents / 100)} · ${pagamento.metodo}`,
      href: "/configuracao/financeiro?tab=pagamentos",
    })),
    ...listaRecibos.map((recibo) => ({
      data: recibo.emitido_em,
      tipo: "recibo" as const,
      titulo: `Recibo ${recibo.numero}`,
      detalhe: `${EURO.format(recibo.valor_cents / 100)} · ${recibo.estado}`,
      href: "/configuracao/financeiro?tab=recibos",
    })),
    ...listaOcorrencias.map((ocorrencia) => ({
      data: ocorrencia.atualizado_em,
      tipo: "ocorrencia" as const,
      titulo: ocorrencia.titulo,
      detalhe: `Ocorrência · ${ocorrencia.estado.replaceAll("_", " ")}`,
      href: `/configuracao/ocorrencias/${ocorrencia.id}`,
    })),
  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const icones = {
    comunicacao: Mail,
    quota: WalletCards,
    pagamento: WalletCards,
    recibo: ReceiptText,
    ocorrencia: CircleAlert,
  };

  return (
    <div>
      <Link href="/fracoes" className="inline-flex items-center gap-1.5 mb-6 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink">
        <ChevronLeft className="w-3.5 h-3.5" /> Frações
      </Link>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between mb-8">
        <div>
          <p className="font-body text-xs tracking-[0.18em] uppercase text-warmBeige mb-2">Dossiê administrativo</p>
          <h1 className="font-title text-h1 text-ink mb-2">Fração {f.codigo}</h1>
          <p className="font-body text-oliveGray">{f.tipologia ?? "Tipologia não registada"}{f.permilagem != null ? ` · ${f.permilagem}‰` : ""}</p>
        </div>
        <Link href={`/fracoes/${f.id}/editar`} className="shrink-0 px-5 py-3 border border-warmBeige/40 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink hover:border-warmBeige">Editar fração</Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] mb-8">
        <section className="bg-paper border border-warmBeige/20 p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4"><UserRound className="w-4 h-4 text-warmBeige" /><h2 className="font-title text-xl text-ink">Intervenientes e contacto</h2></div>
          <div className="grid gap-4 sm:grid-cols-2 font-body text-sm">
            <div><p className="text-xs tracking-widest uppercase text-oliveGray mb-1">Proprietário</p><p className="text-ink">{f.proprietario_nome ?? "Não registado"}</p><p className="text-oliveGray mt-1">{f.proprietario_email ?? "Sem e-mail"}</p><p className="text-oliveGray">{f.proprietario_telefone ?? "Sem telefone"}</p></div>
            <div><p className="text-xs tracking-widest uppercase text-oliveGray mb-1">Inquilino</p><p className="text-ink">{f.inquilino_nome ?? "Não registado"}</p><p className="text-oliveGray mt-1">O contacto de inquilino pode ser completado na ficha da fração.</p></div>
          </div>
        </section>
        <section className="bg-paper border border-warmBeige/20 p-5 md:p-6">
          <p className="font-body text-xs tracking-widest uppercase text-oliveGray">Situação financeira</p>
          <p className={totalPendente > 0 ? "font-title text-3xl text-alert mt-2" : "font-title text-3xl text-success mt-2"}>{EURO.format(totalPendente / 100)}</p>
          <p className="font-body text-sm text-oliveGray mt-2">{pendentes.length} {pendentes.length === 1 ? "quota pendente ou parcial" : "quotas pendentes ou parciais"}</p>
          <Link href="/configuracao/financeiro" className="inline-block mt-4 font-body text-xs tracking-widest uppercase text-ink hover:text-oliveGray">Abrir financeiro</Link>
        </section>
      </div>

      <section className="bg-paper border border-warmBeige/20">
        <div className="p-5 md:p-6 border-b border-warmBeige/15"><div className="flex items-center gap-2"><FileText className="w-4 h-4 text-warmBeige" /><h2 className="font-title text-xl text-ink">Histórico completo</h2></div><p className="font-body text-sm text-oliveGray mt-2">Comunicações formais, movimentos financeiros e ocorrências relacionados com esta fração.</p></div>
        {eventos.length === 0 ? (
          <div className="p-10 text-center"><p className="font-body text-sm text-oliveGray">Ainda não há eventos associados a esta fração.</p></div>
        ) : (
          <div className="divide-y divide-warmBeige/10">
            {eventos.map((evento, indice) => {
              const Icone = icones[evento.tipo];
              return <Link key={`${evento.tipo}-${indice}-${evento.data}`} href={evento.href} className="flex gap-4 p-5 hover:bg-softCream/40 transition-colors">
                <Icone className="w-4 h-4 text-warmBeige shrink-0 mt-1" />
                <div className="min-w-0 flex-1"><div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between"><h3 className="font-body text-sm text-ink">{evento.titulo}</h3><span className="font-body text-xs text-oliveGray shrink-0">{formatarData(evento.data)}</span></div><p className="font-body text-xs text-oliveGray mt-1 capitalize">{evento.detalhe}</p></div>
              </Link>;
            })}
          </div>
        )}
      </section>
    </div>
  );
}
