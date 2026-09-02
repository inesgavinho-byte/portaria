"use client";

import { useState, useTransition } from "react";
import { Trash2, Zap } from "lucide-react";
import {
  apagarRegra,
  aplicarRegrasPendentes,
  criarRegra,
  type RegraListada,
} from "@/lib/actions/regras-classificacao";

export type FornecedorOpcao = { id: string; nome: string; ativo: boolean };

const data = (iso: string) =>
  new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));

/**
 * Formulário e lista das regras de classificação. Uma regra é a decisão
 * permanente de uma pessoa — aplica-se sozinha, mas fica marcada com
 * proveniência «regra» nos movimentos e é reversível a qualquer momento.
 */
export function RegrasClassificacaoForm({
  regras,
  fornecedores,
  prefillPadrao,
  prefillFornecedorId,
}: {
  regras: RegraListada[];
  fornecedores: FornecedorOpcao[];
  prefillPadrao?: string;
  prefillFornecedorId?: string;
}) {
  const [padrao, setPadrao] = useState(prefillPadrao ?? "");
  const [semFornecedor, setSemFornecedor] = useState(false);
  const [fornecedorId, setFornecedorId] = useState(prefillFornecedorId ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submeter() {
    setErro(null);
    setMensagem(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("padrao", padrao);
      if (semFornecedor) formData.set("sem_fornecedor", "on");
      else formData.set("fornecedor_id", fornecedorId);
      const resultado = await criarRegra(formData);
      if (resultado.ok) {
        setMensagem("Regra criada. Aplica-se a partir de agora aos movimentos pendentes.");
        setPadrao("");
        setFornecedorId("");
        setSemFornecedor(false);
      } else {
        setErro(resultado.error);
      }
    });
  }

  function aplicar() {
    setErro(null);
    setMensagem(null);
    startTransition(async () => {
      const resultado = await aplicarRegrasPendentes();
      if ("error" in resultado) setErro(resultado.error);
      else if (resultado.aplicadas === 0) setMensagem("Nenhum movimento pendente casou com as regras.");
      else setMensagem(`${resultado.aplicadas} movimento(s) classificado(s) pelas regras.`);
    });
  }

  function apagar(id: string) {
    setErro(null);
    setMensagem(null);
    startTransition(async () => {
      const resultado = await apagarRegra(id);
      if (!resultado.ok) setErro(resultado.error);
    });
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(evento) => {
          evento.preventDefault();
          submeter();
        }}
        className="portaria-panel px-5 py-5"
      >
        <label htmlFor="padrao-regra" className="font-body text-sm font-semibold text-ink">
          Padrão na descrição
        </label>
        <input
          id="padrao-regra"
          name="padrao"
          type="text"
          value={padrao}
          onChange={(evento) => setPadrao(evento.target.value)}
          placeholder="com. manutencao conta condominio"
          disabled={isPending}
          className="mt-2 block w-full rounded-xl border border-britishGreen/20 bg-white/80 px-3 py-2.5 font-body text-sm text-ink disabled:opacity-50"
        />
        <p className="mt-1.5 font-body text-xs text-oliveGray">
          Texto que aparece na descrição do movimento, ex.: &quot;com. manutencao conta condominio&quot;. Acentos,
          maiúsculas e pontuação são ignorados.
        </p>

        <fieldset className="mt-4">
          <legend className="font-body text-sm font-semibold text-ink">Acção da regra</legend>
          <div className="mt-2 space-y-2">
            <label className="flex items-center gap-2.5 font-body text-sm text-ink">
              <input
                type="radio"
                name="modo"
                checked={!semFornecedor}
                onChange={() => setSemFornecedor(false)}
                disabled={isPending}
                className="accent-britishGreen"
              />
              Atribuir a um fornecedor
            </label>
            <label className="flex items-center gap-2.5 font-body text-sm text-ink">
              <input
                type="radio"
                name="modo"
                checked={semFornecedor}
                onChange={() => setSemFornecedor(true)}
                disabled={isPending}
                className="accent-britishGreen"
              />
              Marcar como sem fornecedor
            </label>
          </div>
        </fieldset>

        <div className="mt-3">
          <label htmlFor="fornecedor-regra" className="sr-only">
            Fornecedor
          </label>
          <select
            id="fornecedor-regra"
            name="fornecedor_id"
            value={fornecedorId}
            onChange={(evento) => setFornecedorId(evento.target.value)}
            disabled={isPending || semFornecedor}
            className="w-full rounded-xl border border-britishGreen/20 bg-white/80 px-3 py-2.5 font-body text-sm text-ink disabled:opacity-50"
          >
            <option value="">Escolher fornecedor…</option>
            {fornecedores.map((fornecedor) => (
              <option key={fornecedor.id} value={fornecedor.id}>
                {fornecedor.nome}
                {fornecedor.ativo ? "" : " (arquivado)"}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-britishGreen px-4 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-britishGreenDeep disabled:opacity-40"
          >
            Criar regra
          </button>
          <button
            type="button"
            onClick={aplicar}
            disabled={isPending}
            title="Aplica as regras a todos os movimentos pendentes deste condomínio"
            className="inline-flex items-center gap-1.5 rounded-xl border border-britishGreen/20 px-4 py-2 font-body text-sm font-semibold text-britishGreen transition-colors hover:bg-britishGreenSoft disabled:opacity-40"
          >
            <Zap className="h-4 w-4" /> Aplicar às pendentes
          </button>
          {erro && <span className="font-body text-xs text-alert">{erro}</span>}
          {mensagem && <span className="font-body text-xs text-britishGreen">{mensagem}</span>}
        </div>
      </form>

      <div className="portaria-panel px-5 py-5">
        <p className="font-body text-sm font-semibold text-ink">
          Regras activas <span className="tabular-nums text-oliveGray">({regras.length})</span>
        </p>
        <p className="mt-1 font-body text-xs text-oliveGray">
          Quando duas regras casam com o mesmo movimento, vence a primeira criada.
        </p>
        {regras.length === 0 ? (
          <p className="mt-3 border-l-2 border-warmBeige/50 bg-softCream/40 px-4 py-3 font-body text-sm text-oliveGray">
            Ainda não há regras. Cria a primeira a partir de um movimento pendente ou pelo formulário acima.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-britishGreen/10">
            {regras.map((regra) => (
              <li key={regra.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-body text-sm font-medium text-ink">«{regra.padrao}»</p>
                  <p className="mt-0.5 font-body text-xs text-oliveGray">
                    {regra.semFornecedor
                      ? "Marcar como sem fornecedor"
                      : `Atribuir a ${regra.fornecedorNome ?? "fornecedor"}`}{" "}
                    · criada em {data(regra.criadoEm)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => apagar(regra.id)}
                  disabled={isPending}
                  title="Apagar regra"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-britishGreen/15 px-2.5 py-1.5 font-body text-xs font-semibold text-oliveGray transition-colors hover:text-alert disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Apagar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
