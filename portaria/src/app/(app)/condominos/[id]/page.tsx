import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ChevronLeft, FileText, Landmark, Mail, Pencil, Phone, ReceiptText,
  CircleAlert, UserRound, WalletCards,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import type {
  Comunicacao, ComunicacaoDestinatario, FracaoPessoa, Ocorrencia,
  Pagamento, Pessoa, QuotaMensal, Recibo,
} from "@/types/database";

const EURO = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

type Ligacao = FracaoPessoa & {
  fracao: {
    id: string; codigo: string; tipologia: string | null;
    permilagem: number | null; inquilino_nome: string | null;
  } | null;
};
type Entrega = ComunicacaoDestinatario & { comunicacao: Comunicacao | null };

const PAPEL_LABEL: Record<string, string> = {
  proprietario: "Proprietário",
  inquilino: "Inquilino",
  representante: "Representante",
};

function formatarData(data: string | null) {
  if (!data) return "—";
  return new Date(`${data.includes("T") ? data : `${data}T00:00:00`}`).toLocaleDateString("pt-PT", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default async function CondominoFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");

  const supabase = await createClient();
  const { data: pessoa } = await supabase
    .from("pessoas")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id)
    .maybeSingle();
  if (!pessoa) notFound();

  // Tudo parte das frações desta pessoa: é por fração que quotas, pagamentos,
  // recibos, comunicações e ocorrências estão ligados.
  const { data: ligacoes } = await supabase
    .from("fracao_pessoas")
    .select("*, fracao:fracoes(id, codigo, tipologia, permilagem, inquilino_nome)")
    .eq("pessoa_id", id)
    .eq("tenant_id", ctx.tenant.id)
    .is("ate", null)
    .order("criado_em", { ascending: true });

  const fracoesIds = ((ligacoes ?? []) as Ligacao[])
    .map((l) => l.fracao?.id)
    .filter((fid): fid is string => !!fid);

  const temFracoes = fracoesIds.length > 0;
  const [quotasRes, pagamentosRes, recibosRes, entregasRes, ocorrenciasRes] = await Promise.all([
    temFracoes
      ? supabase.from("quotas_mensais").select("*").eq("tenant_id", ctx.tenant.id)
          .in("fracao_id", fracoesIds).order("ano", { ascending: false }).order("mes", { ascending: false })
      : Promise.resolve({ data: [] } as { data: QuotaMensal[] | null }),
    temFracoes
      ? supabase.from("pagamentos").select("*").eq("tenant_id", ctx.tenant.id)
          .in("fracao_id", fracoesIds).order("data_pagamento", { ascending: false }).limit(8)
      : Promise.resolve({ data: [] } as { data: Pagamento[] | null }),
    temFracoes
      ? supabase.from("recibos").select("*").eq("tenant_id", ctx.tenant.id)
          .in("fracao_id", fracoesIds).order("emitido_em", { ascending: false }).limit(8)
      : Promise.resolve({ data: [] } as { data: Recibo[] | null }),
    temFracoes
      ? supabase.from("comunicacao_destinatarios").select("*, comunicacao:comunicacoes(*)")
          .eq("tenant_id", ctx.tenant.id).in("fracao_id", fracoesIds)
          .order("criado_em", { ascending: false }).limit(8)
      : Promise.resolve({ data: [] } as { data: Entrega[] | null }),
    temFracoes
      ? supabase.from("ocorrencias").select("*").eq("tenant_id", ctx.tenant.id)
          .in("fracao_id", fracoesIds).order("atualizado_em", { ascending: false }).limit(8)
      : Promise.resolve({ data: [] } as { data: Ocorrencia[] | null }),
  ]);

  const listaQuotas = (quotasRes.data ?? []) as QuotaMensal[];
  const listaPagamentos = (pagamentosRes.data ?? []) as Pagamento[];
  const listaRecibos = (recibosRes.data ?? []) as Recibo[];
  const listaEntregas = (entregasRes.data ?? []) as Entrega[];
  const listaOcorrencias = (ocorrenciasRes.data ?? []) as Ocorrencia[];

  const emDivida = listaQuotas.filter((q) => q.estado === "pendente" || q.estado === "parcial");
  const dividaCents = emDivida.reduce((soma, q) => soma + q.valor_cents, 0);
  const dividaPorFracao = new Map<string, number>();
  for (const quota of emDivida) {
    dividaPorFracao.set(quota.fracao_id, (dividaPorFracao.get(quota.fracao_id) ?? 0) + quota.valor_cents);
  }
  const pagoAnoCorrente = listaQuotas
    .filter((q) => q.estado === "pago" && q.ano === new Date().getFullYear())
    .reduce((soma, q) => soma + q.valor_cents, 0);

  const destinoComunicacao = fracoesIds.map(encodeURIComponent).join(",");

  return (
    <div>
      <Link href="/condominos" className="inline-flex items-center gap-1.5 mb-6 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink">
        <ChevronLeft className="w-3.5 h-3.5" /> Condóminos
      </Link>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between mb-8">
        <div>
          <p className="font-body text-xs tracking-[0.18em] uppercase text-warmBeige mb-2">Ficha do condómino</p>
          <h1 className="font-title text-h1 text-ink mb-2">{pessoa.nome}</h1>
          <div className="font-body text-sm text-oliveGray flex flex-wrap items-center gap-x-4 gap-y-1">
            {pessoa.email && <span className="inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{pessoa.email}</span>}
            {pessoa.telefone && <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{pessoa.telefone}</span>}
            {!pessoa.email && !pessoa.telefone && <span>Sem contacto registado</span>}
          </div>
        </div>
        <div className="flex gap-3 shrink-0">
          <Link
            href={`/comunicacoes/nova${destinoComunicacao ? `?fracao=${destinoComunicacao}` : ""}`}
            className="px-5 py-3 bg-ink text-paper font-body text-xs tracking-widest uppercase hover:bg-oliveGray transition-colors"
          >
            Nova comunicação
          </Link>
          <Link
            href={`/condominos/${pessoa.id}/editar`}
            className="inline-flex items-center gap-1.5 px-5 py-3 border border-warmBeige/40 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink hover:border-warmBeige transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> Editar
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-8">
        <section className="bg-paper border border-warmBeige/20 p-5 md:p-6">
          <p className="font-body text-xs tracking-widest uppercase text-oliveGray">Em dívida</p>
          <p className={dividaCents > 0 ? "font-title text-3xl text-alert mt-2" : "font-title text-3xl text-success mt-2"}>
            {EURO.format(dividaCents / 100)}
          </p>
          <p className="font-body text-sm text-oliveGray mt-2">
            {emDivida.length === 0
              ? "Sem quotas pendentes nem parciais"
              : `${emDivida.length} ${emDivida.length === 1 ? "quota em aberto" : "quotas em aberto"}`}
          </p>
        </section>
        <section className="bg-paper border border-warmBeige/20 p-5 md:p-6">
          <p className="font-body text-xs tracking-widest uppercase text-oliveGray">Quotas pagas em {new Date().getFullYear()}</p>
          <p className="font-title text-3xl text-ink mt-2">{EURO.format(pagoAnoCorrente / 100)}</p>
          <p className="font-body text-sm text-oliveGray mt-2">Valor integral das quotas liquidadas</p>
        </section>
        <section className="bg-paper border border-warmBeige/20 p-5 md:p-6">
          <div className="flex items-center gap-2 mb-3"><UserRound className="w-4 h-4 text-warmBeige" /><h2 className="font-title text-xl text-ink">Frações</h2></div>
          <p className="font-title text-3xl text-ink">{((ligacoes ?? []) as Ligacao[]).filter((l) => l.fracao).length}</p>
          <p className="font-body text-sm text-oliveGray mt-2">
            {((ligacoes ?? []) as Ligacao[]).map((l) => l.fracao?.codigo).filter(Boolean).join(" · ") || "Nenhuma fração associada"}
          </p>
        </section>
      </div>

      {/* Frações desta pessoa */}
      <section className="bg-paper border border-warmBeige/20 mb-8">
        <div className="p-5 md:p-6 border-b border-warmBeige/15">
          <h2 className="font-title text-xl text-ink">Frações e papéis</h2>
          <p className="font-body text-sm text-oliveGray mt-1">Cada fração com o papel desta pessoa e a dívida da fração.</p>
        </div>
        <div className="divide-y divide-warmBeige/10">
          {((ligacoes ?? []) as Ligacao[]).filter((l) => l.fracao).map((ligacao) => {
            const fracao = ligacao.fracao!;
            return (
              <div key={ligacao.id} className="p-5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <Link href={`/fracoes/${fracao.id}`} className="font-title text-lg text-ink hover:text-oliveGray">{fracao.codigo}</Link>
                    <span className="font-body text-[11px] tracking-widest uppercase text-oliveGray border border-warmBeige/40 px-2 py-0.5">
                      {PAPEL_LABEL[ligacao.papel] ?? ligacao.papel}
                    </span>
                    {fracao.tipologia && <span className="font-body text-xs text-oliveGray">{fracao.tipologia}</span>}
                    {fracao.permilagem != null && <span className="font-body text-xs text-oliveGray">{fracao.permilagem}‰</span>}
                  </div>
                  <p className="font-body text-xs text-oliveGray mt-1">
                    Desde {formatarData(ligacao.desde)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`font-body text-sm ${(dividaPorFracao.get(fracao.id) ?? 0) > 0 ? "text-alert" : "text-success"}`}>
                    {(dividaPorFracao.get(fracao.id) ?? 0) > 0
                      ? `${EURO.format(dividaPorFracao.get(fracao.id)! / 100)} em dívida`
                      : "Sem dívida"}
                  </p>
                </div>
              </div>
            );
          })}
          {temFracoes === false && (
            <div className="p-8 text-center">
              <p className="font-body text-sm text-oliveGray">
                Esta pessoa não tem frações associadas. Associa-a como
                proprietária ou inquilina ao editar a fração em {" "}
                <Link href="/fracoes" className="text-ink underline hover:text-oliveGray">Frações</Link>.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Recibos */}
      <section className="bg-paper border border-warmBeige/20 mb-8">
        <div className="p-5 md:p-6 border-b border-warmBeige/15 flex items-center gap-2">
          <ReceiptText className="w-4 h-4 text-warmBeige" />
          <h2 className="font-title text-xl text-ink">Recibos</h2>
        </div>
        {listaRecibos.length === 0 ? (
          <div className="p-8 text-center"><p className="font-body text-sm text-oliveGray">Ainda não há recibos emitidos para as frações desta pessoa.</p></div>
        ) : (
          <div className="divide-y divide-warmBeige/10">
            {listaRecibos.map((recibo) => (
              <div key={recibo.id} className="p-5 flex items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-body text-sm text-ink">Recibo {recibo.numero}</h3>
                  <p className="font-body text-xs text-oliveGray mt-0.5">Emitido a {formatarData(recibo.emitido_em)}</p>
                </div>
                <span className={`font-body text-xs tracking-widest uppercase px-2 py-1 border ${recibo.estado === "anulado" ? "text-alert border-alert/40" : "text-oliveGray border-warmBeige/40"}`}>
                  {recibo.estado}
                </span>
                <p className="font-body text-sm text-ink w-24 text-right">{EURO.format(recibo.valor_cents / 100)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pagamentos */}
      <section className="bg-paper border border-warmBeige/20 mb-8">
        <div className="p-5 md:p-6 border-b border-warmBeige/15 flex items-center gap-2">
          <WalletCards className="w-4 h-4 text-warmBeige" />
          <h2 className="font-title text-xl text-ink">Pagamentos recentes</h2>
        </div>
        {listaPagamentos.length === 0 ? (
          <div className="p-8 text-center"><p className="font-body text-sm text-oliveGray">Sem pagamentos registados.</p></div>
        ) : (
          <div className="divide-y divide-warmBeige/10">
            {listaPagamentos.map((pagamento) => (
              <div key={pagamento.id} className="p-5 flex items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-body text-sm text-ink capitalize">{pagamento.metodo.replaceAll("_", " ")}</h3>
                  <p className="font-body text-xs text-oliveGray mt-0.5">
                    {formatarData(pagamento.data_pagamento)}{pagamento.referencia ? ` · ${pagamento.referencia}` : ""}
                  </p>
                </div>
                <p className="font-body text-sm text-ink">{EURO.format(pagamento.valor_cents / 100)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Comunicações */}
      <section className="bg-paper border border-warmBeige/20 mb-8">
        <div className="p-5 md:p-6 border-b border-warmBeige/15 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-warmBeige" />
            <h2 className="font-title text-xl text-ink">Comunicações</h2>
          </div>
          {destinoComunicacao && (
            <Link href={`/comunicacoes/nova?fracao=${destinoComunicacao}`} className="font-body text-xs tracking-widest uppercase text-ink hover:text-oliveGray shrink-0">
              Registrar envio
            </Link>
          )}
        </div>
        {listaEntregas.length === 0 ? (
          <div className="p-8 text-center"><p className="font-body text-sm text-oliveGray">Sem comunicações registadas para as frações desta pessoa.</p></div>
        ) : (
          <div className="divide-y divide-warmBeige/10">
            {listaEntregas.map((entrega) => entrega.comunicacao && (
              <Link key={entrega.id} href={`/comunicacoes/${entrega.comunicacao.id}`} className="p-5 flex items-center gap-4 hover:bg-softCream/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <h3 className="font-body text-sm text-ink truncate">{entrega.comunicacao.assunto}</h3>
                  <p className="font-body text-xs text-oliveGray mt-0.5 capitalize">
                    {entrega.estado} · {entrega.canal.replaceAll("_", " ")}
                  </p>
                </div>
                <span className="font-body text-xs text-oliveGray shrink-0">{formatarData(entrega.enviado_em ?? entrega.criado_em)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Ocorrências */}
      <section className="bg-paper border border-warmBeige/20">
        <div className="p-5 md:p-6 border-b border-warmBeige/15 flex items-center gap-2">
          <CircleAlert className="w-4 h-4 text-warmBeige" />
          <h2 className="font-title text-xl text-ink">Ocorrências</h2>
        </div>
        {listaOcorrencias.length === 0 ? (
          <div className="p-8 text-center"><p className="font-body text-sm text-oliveGray">Sem ocorrências nas frações desta pessoa.</p></div>
        ) : (
          <div className="divide-y divide-warmBeige/10">
            {listaOcorrencias.map((ocorrencia) => (
              <Link key={ocorrencia.id} href={`/configuracao/ocorrencias/${ocorrencia.id}`} className="p-5 flex items-center gap-4 hover:bg-softCream/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <h3 className="font-body text-sm text-ink truncate">{ocorrencia.titulo}</h3>
                  <p className="font-body text-xs text-oliveGray mt-0.5 capitalize">{ocorrencia.estado.replaceAll("_", " ")}</p>
                </div>
                <span className="font-body text-xs text-oliveGray shrink-0">{formatarData(ocorrencia.atualizado_em)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Nota de rodapé: quotas parciais contam pelo integral até à fase de alocação */}
      <p className="font-body text-xs text-oliveGray mt-6 flex items-start gap-1.5">
        <Landmark className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        Quotas parciais contam pelo valor integral no total em dívida, enquanto
        não houver alocação por quota dos pagamentos.
      </p>
    </div>
  );
}
