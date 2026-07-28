"use client";

import { useState } from "react";
import Link from "next/link";
import { useActionState } from "react";
import { ChevronLeft, Plus, X } from "lucide-react";
import { criarVotacao, type VotacaoFormState } from "@/lib/actions/votacoes";

interface Props {
  assembleiaId: string;
}

export function VotacaoNovaForm({ assembleiaId }: Props) {
  const [opcoes, setOpcoes] = useState<string[]>(["", ""]);

  const action = criarVotacao.bind(null, assembleiaId);
  const [state, formAction, pending] = useActionState<VotacaoFormState, FormData>(
    action,
    {}
  );

  function addOpcao() {
    setOpcoes([...opcoes, ""]);
  }

  function removeOpcao(index: number) {
    if (opcoes.length <= 2) return;
    setOpcoes(opcoes.filter((_, i) => i !== index));
  }

  function updateOpcao(index: number, value: string) {
    const next = [...opcoes];
    next[index] = value;
    setOpcoes(next);
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="border-l-4 border-alert bg-alert/5 px-4 py-3">
          <p className="font-body text-sm text-alert">{state.error}</p>
        </div>
      )}

      <div>
        <label
          htmlFor="titulo"
          className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
        >
          Título
        </label>
        <input
          id="titulo"
          name="titulo"
          type="text"
          required
          maxLength={200}
          className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
          placeholder="Ex.: Aprovação do orçamento para 2027"
        />
        {state.fieldErrors?.titulo && (
          <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.titulo}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="descricao"
          className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
        >
          Descrição{" "}
          <span className="normal-case tracking-normal text-oliveGray/60">(opcional)</span>
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={3}
          maxLength={500}
          className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige resize-none"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="tipo_quorum"
            className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
          >
            Tipo de quórum
          </label>
          <select
            id="tipo_quorum"
            name="tipo_quorum"
            defaultValue="maioria_simples"
            className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
          >
            <option value="maioria_simples">Maioria simples (&gt;50%)</option>
            <option value="maioria_qualificada">Maioria qualificada (&gt;2/3)</option>
            <option value="unanimidade">Unanimidade (100%)</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="peso_por_permilagem"
            className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
          >
            Peso do voto
          </label>
          <select
            id="peso_por_permilagem"
            name="peso_por_permilagem"
            defaultValue="true"
            className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
          >
            <option value="true">Proporcional à permilagem</option>
            <option value="false">Um condómino = um voto</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2">
          Opções{" "}
          <span className="normal-case tracking-normal text-oliveGray/60">
            (mínimo 2)
          </span>
        </label>
        <div className="space-y-2">
          {opcoes.map((texto, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={texto}
                onChange={(e) => updateOpcao(i, e.target.value)}
                required
                maxLength={200}
                className="flex-1 px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
                placeholder={`Opção ${i + 1}`}
              />
              <button
                type="button"
                onClick={() => removeOpcao(i)}
                disabled={opcoes.length <= 2}
                className="p-3 text-oliveGray hover:text-alert transition-colors disabled:opacity-30"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        {state.fieldErrors?.opcoes && (
          <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.opcoes}</p>
        )}
        <button
          type="button"
          onClick={addOpcao}
          className="mt-2 inline-flex items-center gap-2 font-body text-sm text-oliveGray hover:text-ink transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar opção
        </button>
      </div>

      <input type="hidden" name="opcoes" value={JSON.stringify(opcoes)} />

      <div className="flex items-center gap-4 pt-4 border-t border-warmBeige/20">
        <button
          type="submit"
          disabled={pending}
          className="px-8 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50"
        >
          {pending ? "A criar..." : "Criar votação"}
        </button>
        <Link
          href={`/configuracao/assembleias/${assembleiaId}`}
          className="px-8 py-3 font-body text-sm tracking-widest uppercase text-oliveGray hover:text-ink transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
