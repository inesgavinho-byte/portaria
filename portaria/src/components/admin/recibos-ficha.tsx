"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, FileDown, Send } from "lucide-react";
import {
  emitirRecibo,
  marcarReciboEnviado,
  type ReciboEnvioFormState,
} from "@/lib/actions/financeiro";
import {
  enviarReciboPorEmail,
  verReciboPdf,
} from "@/lib/actions/recibo-automatico";
import type { Recibo } from "@/types/database";

const EURO = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

const CANAIS: { valor: string; rotulo: string }[] = [
  { valor: "email", rotulo: "E-mail" },
  { valor: "entrega_em_mao", rotulo: "Entrega em mão" },
  { valor: "correio_simples", rotulo: "Correio simples" },
  { valor: "correio_registado", rotulo: "Correio registado" },
  { valor: "portal", rotulo: "Portal" },
  { valor: "outro", rotulo: "Outro" },
];

const CANAL_ROTULO = Object.fromEntries(CANAIS.map((c) => [c.valor, c.rotulo]));

export type PagamentoSemRecibo = {
  id: string;
  valor_cents: number;
  data_pagamento: string;
};

function formatarData(data: string | null) {
  if (!data) return "—";
  return new Date(data).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Secção de recibos da ficha do condómino: estado de envio por recibo
 * ("a administração enviou?"), registo do envio (canal + data) e emissão
 * de recibo para pagamentos que ainda não o têm.
 */
export function RecibosFicha({
  recibos,
  pagamentosSemRecibo,
}: {
  recibos: Recibo[];
  pagamentosSemRecibo: PagamentoSemRecibo[];
}) {
  const router = useRouter();
  const [pendentesEmissao, setPendentesEmissao] = useState<Set<string>>(new Set());
  const [emissaoErro, setEmissaoErro] = useState<string | null>(null);
  const [transition, startTransition] = useTransition();

  async function emitir(pagamentoId: string) {
    setEmissaoErro(null);
    setPendentesEmissao((atual) => new Set(atual).add(pagamentoId));
    const resultado = await emitirRecibo(pagamentoId);
    setPendentesEmissao((atual) => {
      const proximo = new Set(atual);
      proximo.delete(pagamentoId);
      return proximo;
    });
    if (resultado?.error) {
      setEmissaoErro(resultado.error);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="divide-y divide-warmBeige/10">
      {recibos.length === 0 && pagamentosSemRecibo.length === 0 && (
        <div className="p-8 text-center">
          <p className="font-body text-sm text-oliveGray">Ainda não há recibos nem pagamentos a emitir recibo.</p>
        </div>
      )}

      {recibos.map((recibo) =>
        recibo.estado === "anulado" ? (
          <div key={recibo.id} className="p-5 flex items-center gap-4">
            <div className="flex-1">
              <h3 className="font-body text-sm text-ink line-through">Recibo {recibo.numero}</h3>
              <p className="font-body text-xs text-alert mt-0.5">Anulado{recibo.motivo_anulacao ? ` — ${recibo.motivo_anulacao}` : ""}</p>
            </div>
            <p className="font-body text-sm text-oliveGray">{EURO.format(recibo.valor_cents / 100)}</p>
          </div>
        ) : (
          <ReciboRow key={recibo.id} recibo={recibo} />
        )
      )}

      {emissaoErro && (
        <div className="px-5 py-3 border-l-4 border-alert bg-alert/5">
          <p className="font-body text-sm text-alert">{emissaoErro}</p>
        </div>
      )}

      {pagamentosSemRecibo.map((pagamento) => (
        <div key={pagamento.id} className="p-5 flex items-center gap-4">
          <div className="flex-1">
            <h3 className="font-body text-sm text-ink">Pagamento de {formatarData(pagamento.data_pagamento)}</h3>
            <p className="font-body text-xs text-oliveGray mt-0.5">Ainda sem recibo emitido</p>
          </div>
          <p className="font-body text-sm text-ink shrink-0">{EURO.format(pagamento.valor_cents / 100)}</p>
          <button
            type="button"
            disabled={pendentesEmissao.has(pagamento.id) || transition}
            onClick={() => emitir(pagamento.id)}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 border border-warmBeige/40 font-body text-[11px] tracking-widest uppercase text-oliveGray hover:text-ink hover:border-warmBeige transition-colors disabled:opacity-60"
          >
            <Send className="w-3.5 h-3.5" />
            {pendentesEmissao.has(pagamento.id) ? "A emitir…" : "Emitir recibo"}
          </button>
        </div>
      ))}
    </div>
  );
}

function ReciboRow({ recibo }: { recibo: Recibo }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ReciboEnvioFormState, FormData>(
    marcarReciboEnviado,
    {}
  );
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const enviado = !!recibo.enviado_em;
  const inputClass = "border border-warmBeige/40 bg-paper font-body text-xs text-ink px-2 py-1.5 focus:outline-none focus:border-warmBeige";

  async function abrirPdf() {
    setErro(null);
    const res = await verReciboPdf(recibo.id);
    if (res.url) window.open(res.url, "_blank");
    else setErro(res.error ?? "Erro a gerar o PDF.");
  }

  async function enviarEmail() {
    setErro(null);
    setAEnviar(true);
    const res = await enviarReciboPorEmail(recibo.id);
    setAEnviar(false);
    if (res.error) setErro(res.error);
    else router.refresh();
  }

  return (
    <div className="p-5">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h3 className="font-body text-sm text-ink">Recibo {recibo.numero}</h3>
          <p className="font-body text-xs text-oliveGray mt-0.5">
            Emitido a {formatarData(recibo.emitido_em)}
            {recibo.periodo_inicio ? ` · ${recibo.periodo_inicio.slice(0, 7)}${recibo.periodo_fim && recibo.periodo_fim !== recibo.periodo_inicio ? ` a ${recibo.periodo_fim.slice(0, 7)}` : ""}` : ""}
          </p>
        </div>
        {enviado ? (
          <span className="shrink-0 inline-flex items-center gap-1.5 font-body text-xs text-success">
            <Check className="w-3.5 h-3.5" />
            Enviado {formatarData(recibo.enviado_em)} · {CANAL_ROTULO[recibo.canal_envio ?? ""] ?? recibo.canal_envio}
          </span>
        ) : (
          <span className="shrink-0 font-body text-xs tracking-widest uppercase text-alert border border-alert/40 px-2 py-1">
            Por enviar
          </span>
        )}
        <p className="font-body text-sm text-ink w-20 text-right shrink-0">{EURO.format(recibo.valor_cents / 100)}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={abrirPdf}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-warmBeige/40 font-body text-[11px] tracking-widest uppercase text-oliveGray hover:text-ink hover:border-warmBeige transition-colors"
        >
          <FileDown className="w-3.5 h-3.5" />
          PDF
        </button>
        {!enviado && (
          <button
            type="button"
            onClick={enviarEmail}
            disabled={aEnviar || pending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-warmBeige/40 font-body text-[11px] tracking-widest uppercase text-oliveGray hover:text-ink hover:border-warmBeige transition-colors disabled:opacity-60"
          >
            <Send className="w-3.5 h-3.5" />
            {aEnviar ? "A enviar…" : "Enviar por email"}
          </button>
        )}
      </div>
      {erro && <p className="mt-2 font-body text-xs text-alert">{erro}</p>}

      {!enviado && (
        <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="recibo_id" value={recibo.id} />
          <select name="canal_envio" defaultValue="email" className={inputClass} aria-label="Canal de envio">
            {CANAIS.map((canal) => (
              <option key={canal.valor} value={canal.valor}>{canal.rotulo}</option>
            ))}
          </select>
          <input
            type="date"
            name="data_envio"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={inputClass}
            aria-label="Data do envio"
          />
          <button
            type="submit"
            disabled={pending}
            className="px-3 py-1.5 bg-ink text-paper font-body text-[11px] tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-60"
          >
            {pending ? "A registar…" : "Marcar como enviado"}
          </button>
          {state.error && <span className="font-body text-xs text-alert">{state.error}</span>}
        </form>
      )}
    </div>
  );
}
