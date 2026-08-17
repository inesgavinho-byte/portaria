"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { criarContribuicaoExtraordinaria, type CriarContribuicaoExtraordinariaState } from "@/lib/actions/contribuicoes-extraordinarias";

const initialState: CriarContribuicaoExtraordinariaState = {};

type LinhaPrestacao = { id: string; designacao: string; vencimento: string; valor: string };

function eurosParaCents(valor: string) {
  const normalizado = valor.trim().replace(/\./g, "").replace(",", ".");
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? Math.round(numero * 100) : 0;
}

export function ContribuicaoExtraordinariaForm() {
  const [state, formAction, pending] = useActionState(criarContribuicaoExtraordinaria, initialState);
  const [prestacoes, setPrestacoes] = useState<LinhaPrestacao[]>([{ id: crypto.randomUUID(), designacao: "Prestação 1", vencimento: "", valor: "" }]);
  const totalCents = useMemo(() => prestacoes.reduce((soma, linha) => soma + eurosParaCents(linha.valor), 0), [prestacoes]);

  function alterar(id: string, campo: keyof Omit<LinhaPrestacao, "id">, valor: string) {
    setPrestacoes((atual) => atual.map((linha) => linha.id === id ? { ...linha, [campo]: valor } : linha));
  }

  const prestacoesSerializadas = JSON.stringify(prestacoes.map((linha) => ({ designacao: linha.designacao, vencimento: linha.vencimento, valorCents: eurosParaCents(linha.valor) })));

  return (
    <form action={formAction} className="space-y-6 max-w-3xl">
      <input type="hidden" name="total_cents" value={totalCents} />
      <input type="hidden" name="prestacoes" value={prestacoesSerializadas} />
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block md:col-span-2"><span className="font-body text-xs tracking-widest uppercase text-oliveGray">Título</span><input name="titulo" required maxLength={240} className="mt-2 w-full border border-warmBeige/30 bg-white px-3 py-2.5 font-body text-sm text-ink" placeholder="Ex.: Obra de reabilitação da fachada" /><span className="font-body text-xs text-alert mt-1 block">{state.fieldErrors?.titulo}</span></label>
        <label className="block"><span className="font-body text-xs tracking-widest uppercase text-oliveGray">Referência</span><input name="referencia" className="mt-2 w-full border border-warmBeige/30 bg-white px-3 py-2.5 font-body text-sm text-ink" placeholder="Ata ou deliberação" /></label>
        <div><span className="font-body text-xs tracking-widest uppercase text-oliveGray">Total calculado</span><p className="mt-2 px-3 py-2.5 border border-warmBeige/15 bg-softCream/40 font-body text-sm text-ink">{new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(totalCents / 100)}</p><span className="font-body text-xs text-alert mt-1 block">{state.fieldErrors?.total}</span></div>
        <label className="block md:col-span-2"><span className="font-body text-xs tracking-widest uppercase text-oliveGray">Nota administrativa</span><textarea name="descricao" rows={3} className="mt-2 w-full border border-warmBeige/30 bg-white px-3 py-2.5 font-body text-sm text-ink" placeholder="Contexto da obra, deliberação e evidência documental." /></label>
      </div>

      <section className="border border-warmBeige/20"><div className="p-4 border-b border-warmBeige/15 flex items-center justify-between gap-3"><div><h2 className="font-title text-xl text-ink">Prestações</h2><p className="font-body text-xs text-oliveGray mt-1">Cada prestação será distribuída pelas frações segundo a permilagem.</p></div><button type="button" onClick={() => setPrestacoes((atual) => [...atual, { id: crypto.randomUUID(), designacao: `Prestação ${atual.length + 1}`, vencimento: "", valor: "" }])} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 border border-warmBeige/40 font-body text-xs tracking-widest uppercase text-ink"><Plus className="w-3.5 h-3.5" /> Adicionar</button></div>
        <div className="divide-y divide-warmBeige/10">{prestacoes.map((linha, indice) => <div key={linha.id} className="p-4 grid gap-3 md:grid-cols-[1fr_180px_150px_auto]"><label><span className="sr-only">Designação</span><input value={linha.designacao} onChange={(event) => alterar(linha.id, "designacao", event.target.value)} required className="w-full border border-warmBeige/30 bg-white px-3 py-2.5 font-body text-sm text-ink" placeholder="Designação" /></label><label><span className="sr-only">Vencimento</span><input type="date" value={linha.vencimento} onChange={(event) => alterar(linha.id, "vencimento", event.target.value)} required className="w-full border border-warmBeige/30 bg-white px-3 py-2.5 font-body text-sm text-ink" /></label><label><span className="sr-only">Valor em euros</span><input inputMode="decimal" value={linha.valor} onChange={(event) => alterar(linha.id, "valor", event.target.value)} required className="w-full border border-warmBeige/30 bg-white px-3 py-2.5 font-body text-sm text-ink" placeholder="0,00 €" /></label><button type="button" disabled={prestacoes.length === 1} onClick={() => setPrestacoes((atual) => atual.filter((item) => item.id !== linha.id).map((item, ordem) => ({ ...item, designacao: item.designacao.startsWith("Prestação ") ? `Prestação ${ordem + 1}` : item.designacao }))) } className="p-2.5 text-oliveGray hover:text-alert disabled:opacity-30" aria-label={`Remover prestação ${indice + 1}`}><Trash2 className="w-4 h-4" /></button></div>)}</div>
      </section>
      <span className="font-body text-xs text-alert block">{state.fieldErrors?.prestacoes}</span>
      {state.error && <p className="font-body text-sm text-alert">{state.error}</p>}
      {state.sucesso && <p className="font-body text-sm text-success">{state.sucesso}</p>}
      <p className="font-body text-xs text-oliveGray">A criação não emite recibos, não altera quotas ordinárias e não inicia cobrança ou envio automático.</p>
      <button type="submit" disabled={pending} className="px-5 py-3 bg-ink text-paper font-body text-xs tracking-widest uppercase disabled:opacity-50">{pending ? "A criar…" : "Criar contribuição"}</button>
    </form>
  );
}
