import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Landmark, FileText, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import type { ContribuicaoExtraordinaria, ContribuicaoPrestacao, ContribuicaoPrestacaoFracao } from "@/types/database";

const EURO = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
const ESTADO_PRESTACAO: Record<ContribuicaoPrestacao["estado"], string> = { prevista: "Prevista", liquidada: "Liquidada", parcial: "Parcial", anulada: "Anulada" };
const ESTADO_FRACAO: Record<ContribuicaoPrestacaoFracao["estado"], string> = { pendente: "Pendente", liquidada: "Liquidada", parcial: "Parcial", dispensada: "Dispensada", anulada: "Anulada" };

type PosicaoComFracao = ContribuicaoPrestacaoFracao & { fracao: { codigo: string } | null };

export default async function ContribuicaoExtraordinariaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");

  const supabase = await createClient();
  const [{ data: contribuicao }, { data: prestacoes }] = await Promise.all([
    supabase.from("contribuicoes_extraordinarias").select("*").eq("id", id).eq("tenant_id", ctx.tenant.id).maybeSingle(),
    supabase.from("contribuicao_prestacoes").select("*").eq("contribuicao_id", id).eq("tenant_id", ctx.tenant.id).order("ordem"),
  ]);
  if (!contribuicao) notFound();

  const c = contribuicao as ContribuicaoExtraordinaria;
  const { data: documentoFonte } = c.documento_administracao_id
    ? await supabase.from("documentos_administracao").select("id, titulo").eq("id", c.documento_administracao_id).eq("tenant_id", ctx.tenant.id).maybeSingle()
    : { data: null };
  const listaPrestacoes = (prestacoes ?? []) as ContribuicaoPrestacao[];
  const idsPrestacoes = listaPrestacoes.map((item) => item.id);
  const { data: posicoes } = idsPrestacoes.length
    ? await supabase.from("contribuicao_prestacao_fracoes").select("*, fracao:fracoes(codigo)").eq("tenant_id", ctx.tenant.id).in("prestacao_id", idsPrestacoes).order("criado_em")
    : { data: [] as PosicaoComFracao[] };
  const listaPosicoes = (posicoes ?? []) as PosicaoComFracao[];
  const totalLiquidado = listaPosicoes.reduce((soma, item) => soma + item.liquidado_cents, 0);
  const totalPrevisto = listaPosicoes.reduce((soma, item) => soma + item.valor_cents, 0);
  const fracoesLiquidadas = listaPosicoes.filter((item) => item.estado === "liquidada").length;

  return (
    <div>
      <Link href="/contribuicoes-extraordinarias" className="inline-flex items-center gap-1.5 mb-6 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink"><ChevronLeft className="w-3.5 h-3.5" /> Contribuições extraordinárias</Link>
      <div className="mb-8">
        <p className="font-body text-xs tracking-[0.18em] uppercase text-warmBeige mb-2">Receita extraordinária</p>
        <h1 className="font-title text-h1 text-ink mb-2">{c.titulo}</h1>
        <p className="font-body text-oliveGray">{c.referencia ?? "Sem referência"}</p>
        {c.descricao && <p className="font-body text-sm text-oliveGray max-w-3xl mt-4 whitespace-pre-wrap">{c.descricao}</p>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <div className="bg-paper border border-warmBeige/20 p-4"><p className="font-body text-xs uppercase tracking-widest text-oliveGray">Total</p><p className="font-title text-2xl text-ink mt-2">{EURO.format(c.total_cents / 100)}</p></div>
        <div className="bg-paper border border-warmBeige/20 p-4"><p className="font-body text-xs uppercase tracking-widest text-oliveGray">Previsto nas posições</p><p className="font-title text-2xl text-ink mt-2">{EURO.format(totalPrevisto / 100)}</p></div>
        <div className="bg-paper border border-warmBeige/20 p-4"><p className="font-body text-xs uppercase tracking-widest text-oliveGray">Liquidado</p><p className="font-title text-2xl text-success mt-2">{EURO.format(totalLiquidado / 100)}</p></div>
        <div className="bg-paper border border-warmBeige/20 p-4"><p className="font-body text-xs uppercase tracking-widest text-oliveGray">Posições liquidadas</p><p className="font-title text-2xl text-success mt-2">{fracoesLiquidadas}/{listaPosicoes.length}</p></div>
      </div>

      <section className="bg-paper border border-warmBeige/20 mb-8">
        <div className="p-5 md:p-6 border-b border-warmBeige/15"><div className="flex items-center gap-2"><Landmark className="w-4 h-4 text-warmBeige" /><h2 className="font-title text-xl text-ink">Prestações</h2></div><p className="font-body text-sm text-oliveGray mt-2">Cada prestação conserva o montante global e a distribuição individual por fração.</p></div>
        <div className="divide-y divide-warmBeige/10">
          {listaPrestacoes.map((prestacao) => {
            const posicoesPrestacao = listaPosicoes.filter((item) => item.prestacao_id === prestacao.id);
            const liquidado = posicoesPrestacao.reduce((soma, item) => soma + item.liquidado_cents, 0);
            const pendentes = posicoesPrestacao.filter((item) => item.estado !== "liquidada").length;
            return <details key={prestacao.id} className="group">
              <summary className="cursor-pointer list-none p-5 hover:bg-softCream/40 transition-colors"><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><p className="font-body text-sm text-ink">{prestacao.designacao}</p><p className="font-body text-xs text-oliveGray mt-1">Vencimento: {new Date(`${prestacao.vencimento}T00:00:00`).toLocaleDateString("pt-PT")} {prestacao.fonte ? `· ${prestacao.fonte}` : ""}</p></div><div className="flex items-center gap-3"><span className="font-body text-xs tracking-widest uppercase text-success">{ESTADO_PRESTACAO[prestacao.estado]}</span><strong className="font-body text-sm text-ink">{EURO.format(prestacao.valor_cents / 100)}</strong></div></div></summary>
              <div className="px-5 pb-5 md:px-6"><div className="grid grid-cols-3 gap-3 py-4 border-t border-warmBeige/10"><div><p className="font-body text-[10px] uppercase tracking-widest text-oliveGray">Frações</p><p className="font-body text-sm text-ink mt-1">{posicoesPrestacao.length}</p></div><div><p className="font-body text-[10px] uppercase tracking-widest text-oliveGray">Liquidado</p><p className="font-body text-sm text-success mt-1">{EURO.format(liquidado / 100)}</p></div><div><p className="font-body text-[10px] uppercase tracking-widest text-oliveGray">Pendentes</p><p className="font-body text-sm text-ink mt-1">{pendentes}</p></div></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{posicoesPrestacao.map((posicao) => <div key={posicao.id} className="border border-warmBeige/15 px-3 py-2"><p className="font-body text-sm text-ink">Fração {posicao.fracao?.codigo ?? "—"}</p><p className="font-body text-xs text-oliveGray mt-1">{EURO.format(posicao.valor_cents / 100)} · <span className={posicao.estado === "liquidada" ? "text-success" : "text-alert"}>{ESTADO_FRACAO[posicao.estado]}</span></p></div>)}</div></div>
            </details>;
          })}
        </div>
      </section>

      <section className="bg-paper border border-warmBeige/20 p-5 md:p-6"><div className="flex items-center gap-2"><FileText className="w-4 h-4 text-warmBeige" /><h2 className="font-title text-xl text-ink">Fonte documental</h2></div>{documentoFonte ? <><p className="font-body text-sm text-oliveGray mt-2">Mapa confidencial associado: {documentoFonte.titulo}.</p><Link href="/configuracao/documentos-administracao" className="inline-block mt-4 font-body text-xs tracking-widest uppercase text-ink hover:text-oliveGray">Abrir Arquivo confidencial</Link></> : <p className="font-body text-sm text-oliveGray mt-2">Ainda não existe um documento confidencial associado a esta contribuição.</p>}</section>
    </div>
  );
}
