"use client";

import { useState, useTransition } from "react";
import { Ban, Check, Undo2 } from "lucide-react";
import {
  atribuirFornecedorMovimento,
  marcarMovimentoSemFornecedor,
} from "@/lib/actions/movimentos-bancarios";
import type {
  EstadoAtribuicao,
  FornecedorCandidato,
  SugestaoFornecedor,
} from "@/lib/financeiro/atribuicao-movimentos";

const CONFIANCA_LABEL = {
  exacta: "correspondência exacta",
  provavel: "provável",
  possivel: "possível",
} as const;

export function MovimentoAtribuicao({
  movimentoId,
  estado,
  fornecedorId,
  fornecedorNome,
  fornecedores,
  sugestoes,
}: {
  movimentoId: string;
  estado: EstadoAtribuicao;
  fornecedorId: string | null;
  fornecedorNome: string | null;
  fornecedores: FornecedorCandidato[];
  sugestoes: SugestaoFornecedor[];
}) {
  const [selecionado, setSelecionado] = useState(fornecedorId ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function executar(accao: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setErro(null);
    startTransition(async () => {
      const resultado = await accao();
      if (!resultado.ok) setErro(resultado.error);
    });
  }

  if (estado === "atribuido") {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-britishGreen/10 pt-3">
        <span className="font-body text-xs text-oliveGray">
          Atribuído a <span className="font-semibold text-ink">{fornecedorNome ?? "fornecedor"}</span>
        </span>
        <button
          type="button"
          disabled={isPending}
          onClick={() => executar(() => atribuirFornecedorMovimento(movimentoId, null))}
          className="inline-flex items-center gap-1.5 font-body text-xs font-semibold text-oliveGray transition-colors hover:text-alert disabled:opacity-50"
        >
          <Undo2 className="h-3.5 w-3.5" /> Retirar atribuição
        </button>
        {erro && <span className="font-body text-xs text-alert">{erro}</span>}
      </div>
    );
  }

  if (estado === "nao_aplicavel") {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-britishGreen/10 pt-3">
        <span className="font-body text-xs text-oliveGray">Marcado como sem fornecedor.</span>
        <button
          type="button"
          disabled={isPending}
          onClick={() => executar(() => marcarMovimentoSemFornecedor(movimentoId, false))}
          className="inline-flex items-center gap-1.5 font-body text-xs font-semibold text-oliveGray transition-colors hover:text-britishGreen disabled:opacity-50"
        >
          <Undo2 className="h-3.5 w-3.5" /> Voltar a triar
        </button>
        {erro && <span className="font-body text-xs text-alert">{erro}</span>}
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-britishGreen/10 pt-3">
      {sugestoes.length > 0 && (
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <span className="font-body text-[0.68rem] uppercase tracking-[0.08em] text-oliveGray">Sugestões</span>
          {sugestoes.map((sugestao) => (
            <button
              key={sugestao.fornecedor.id}
              type="button"
              title={sugestao.motivo}
              disabled={isPending}
              onClick={() => setSelecionado(sugestao.fornecedor.id)}
              className={`rounded-lg border px-2.5 py-1 font-body text-[0.7rem] transition-colors disabled:opacity-50 ${
                selecionado === sugestao.fornecedor.id
                  ? "border-britishGreen bg-britishGreenSoft text-britishGreen"
                  : "border-britishGreen/20 text-oliveGray hover:text-britishGreen"
              }`}
            >
              {sugestao.fornecedor.nome}
              <span className="ml-1.5 opacity-60">{CONFIANCA_LABEL[sugestao.confianca]}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`fornecedor-${movimentoId}`}>
          Fornecedor
        </label>
        <select
          id={`fornecedor-${movimentoId}`}
          value={selecionado}
          disabled={isPending}
          onChange={(evento) => setSelecionado(evento.target.value)}
          className="min-w-[220px] rounded-xl border border-britishGreen/20 bg-white/80 px-3 py-2 font-body text-sm text-ink disabled:opacity-50"
        >
          <option value="">Escolher fornecedor…</option>
          {fornecedores.map((fornecedor) => (
            <option key={fornecedor.id} value={fornecedor.id}>
              {fornecedor.nome}
              {fornecedor.ativo ? "" : " (arquivado)"}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={isPending || !selecionado}
          onClick={() => executar(() => atribuirFornecedorMovimento(movimentoId, selecionado))}
          className="inline-flex items-center gap-1.5 rounded-xl bg-britishGreen px-3.5 py-2 font-body text-xs font-semibold text-white transition-colors hover:bg-britishGreenDeep disabled:opacity-40"
        >
          <Check className="h-3.5 w-3.5" /> Atribuir
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() => executar(() => marcarMovimentoSemFornecedor(movimentoId, true))}
          className="inline-flex items-center gap-1.5 rounded-xl border border-britishGreen/15 px-3.5 py-2 font-body text-xs font-semibold text-oliveGray transition-colors hover:text-ink disabled:opacity-50"
        >
          <Ban className="h-3.5 w-3.5" /> Sem fornecedor
        </button>

        {erro && <span className="font-body text-xs text-alert">{erro}</span>}
      </div>
    </div>
  );
}
