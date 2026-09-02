"use client";

import { useActionState, useState } from "react";
import { CalendarPlus, Pencil, X } from "lucide-react";
import {
  corrigirAcontecimento,
  criarAcontecimento,
  type AcontecimentoFormState,
} from "@/lib/actions/dossier-eventos";
import {
  NATUREZAS_ACONTECIMENTO,
  TIPOS_ACONTECIMENTO,
} from "@/lib/fornecedores/processo";

const campo =
  "w-full rounded-lg border border-britishGreen/15 bg-paper px-3 py-2 font-body text-sm text-ink placeholder:text-oliveGray/70 focus:border-britishGreen/40 focus:outline-none";
const etiqueta =
  "mb-1.5 block font-body text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-oliveGray";

export type ContratoEscolha = { id: string; titulo: string };

/**
 * Dados do acontecimento de memória necessários para pré-preencher a
 * correcção. É o registo bruto da base, não a linha normalizada da cronologia
 * — o tipo original (`pagamento` que o histórico apresenta como "pagamento
 * declarado") e o contrato a que pertence têm de voltar ao formulário tal
 * como foram guardados.
 */
export type AcontecimentoActual = {
  id: string;
  data_evento: string;
  tipo: string;
  natureza: string;
  titulo: string;
  resumo: string;
  valor_cents: number | null;
};

function CamposAcontecimento({
  state,
  contratos,
  actual,
}: {
  state: AcontecimentoFormState;
  contratos: ContratoEscolha[];
  actual?: AcontecimentoActual;
}) {
  const dataInicial = actual ? actual.data_evento.slice(0, 10) : "";
  const valorInicial = actual?.valor_cents
    ? (actual.valor_cents / 100).toFixed(2).replace(".", ",")
    : "";

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {!actual && (
        <div>
          <label className={etiqueta} htmlFor="evn-contrato">
            Contrato
          </label>
          <select id="evn-contrato" name="contrato_id" required className={campo}>
            <option value="">Escolher…</option>
            {contratos.map((contrato) => (
              <option key={contrato.id} value={contrato.id}>
                {contrato.titulo}
              </option>
            ))}
          </select>
          {state.fieldErrors?.contrato && (
            <p className="mt-1 font-body text-xs text-alert">{state.fieldErrors.contrato}</p>
          )}
        </div>
      )}

      <div>
        <label className={etiqueta} htmlFor={actual ? `evn-data-${actual.id}` : "evn-data"}>
          Data do acontecimento
        </label>
        <input
          id={actual ? `evn-data-${actual.id}` : "evn-data"}
          type="date"
          name="data_evento"
          required
          defaultValue={dataInicial}
          className={campo}
        />
        {state.fieldErrors?.data && (
          <p className="mt-1 font-body text-xs text-alert">{state.fieldErrors.data}</p>
        )}
      </div>

      <div>
        <label className={etiqueta} htmlFor={actual ? `evn-tipo-${actual.id}` : "evn-tipo"}>
          Tipo
        </label>
        <select
          id={actual ? `evn-tipo-${actual.id}` : "evn-tipo"}
          name="tipo"
          defaultValue={actual?.tipo ?? "comunicacao"}
          className={campo}
        >
          {TIPOS_ACONTECIMENTO.map((tipo) => (
            <option key={tipo.valor} value={tipo.valor}>
              {tipo.label}
            </option>
          ))}
        </select>
        {state.fieldErrors?.tipo && (
          <p className="mt-1 font-body text-xs text-alert">{state.fieldErrors.tipo}</p>
        )}
      </div>

      <div>
        <label className={etiqueta} htmlFor={actual ? `evn-nat-${actual.id}` : "evn-nat"}>
          Natureza
        </label>
        <select
          id={actual ? `evn-nat-${actual.id}` : "evn-nat"}
          name="natureza"
          defaultValue={actual?.natureza ?? "facto"}
          className={campo}
        >
          {NATUREZAS_ACONTECIMENTO.map((natureza) => (
            <option key={natureza.valor} value={natureza.valor}>
              {natureza.label} — {natureza.nota}
            </option>
          ))}
        </select>
        {state.fieldErrors?.natureza && (
          <p className="mt-1 font-body text-xs text-alert">{state.fieldErrors.natureza}</p>
        )}
      </div>

      <div className="md:col-span-2">
        <label className={etiqueta} htmlFor={actual ? `evn-tit-${actual.id}` : "evn-tit"}>
          Título
        </label>
        <input
          id={actual ? `evn-tit-${actual.id}` : "evn-tit"}
          name="titulo"
          required
          maxLength={200}
          defaultValue={actual?.titulo ?? ""}
          placeholder="Ex.: Folha de adjudicação entregue a 04-09-2025"
          className={campo}
        />
        {state.fieldErrors?.titulo && (
          <p className="mt-1 font-body text-xs text-alert">{state.fieldErrors.titulo}</p>
        )}
      </div>

      <div className="md:col-span-2">
        <label className={etiqueta} htmlFor={actual ? `evn-res-${actual.id}` : "evn-res"}>
          Resumo
        </label>
        <textarea
          id={actual ? `evn-res-${actual.id}` : "evn-res"}
          name="resumo"
          rows={3}
          required
          maxLength={4000}
          defaultValue={actual?.resumo ?? ""}
          placeholder="O que aconteceu, em linguagem corrente. As evidências juntam-se depois, com a citação exacta."
          className={campo}
        />
        {state.fieldErrors?.resumo && (
          <p className="mt-1 font-body text-xs text-alert">{state.fieldErrors.resumo}</p>
        )}
      </div>

      <div>
        <label className={etiqueta} htmlFor={actual ? `evn-val-${actual.id}` : "evn-val"}>
          Valor <span className="normal-case tracking-normal">(se houver)</span>
        </label>
        <input
          id={actual ? `evn-val-${actual.id}` : "evn-val"}
          name="valor"
          inputMode="decimal"
          defaultValue={valorInicial}
          placeholder="Ex.: 1590,00"
          className={campo}
        />
        {state.fieldErrors?.valor && (
          <p className="mt-1 font-body text-xs text-alert">{state.fieldErrors.valor}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Regista um acontecimento novo na memória da contratação, a partir do dossiê
 * do fornecedor. Sem migração, sem SQL — é o B2 do goal.
 */
export function AcontecimentoRegistar({
  contratos,
  redirectTo,
  fornecedorId,
}: {
  contratos: ContratoEscolha[];
  redirectTo: string;
  fornecedorId: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState<AcontecimentoFormState, FormData>(
    criarAcontecimento,
    {},
  );

  if (contratos.length === 0) {
    return (
      <p className="font-body text-[0.7rem] italic text-oliveGray">
        A memória da contratação pertence a um contrato. Crie primeiro um contrato para este
        fornecedor para poder registar acontecimentos.
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-britishGreen px-3 py-2 font-body text-[0.7rem] font-semibold text-white transition-colors hover:bg-britishGreenDeep"
      >
        {aberto ? <X className="h-3 w-3" /> : <CalendarPlus className="h-3 w-3" />}
        {aberto ? "Fechar" : "Registar acontecimento"}
      </button>

      {aberto && (
        <form action={formAction} className="mt-3 rounded-xl border border-britishGreen/15 bg-white/60 p-4">
          <input type="hidden" name="redirect_to" value={redirectTo} />
          <input type="hidden" name="fornecedor_id" value={fornecedorId} />

          {state.error && <p className="mb-3 font-body text-xs text-alert">{state.error}</p>}
          {state.ok && (
            <p className="mb-3 font-body text-xs text-britishGreen">
              Acontecimento registado — aparece no histórico abaixo.
            </p>
          )}

          <CamposAcontecimento state={state} contratos={contratos} />

          <button
            type="submit"
            disabled={pending}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-britishGreen px-4 py-2 font-body text-xs font-semibold text-white transition-colors hover:bg-britishGreenDeep disabled:opacity-60"
          >
            {pending ? "A registar…" : "Registar"}
          </button>
        </form>
      )}
    </div>
  );
}

/**
 * Corrige um acontecimento existente — B4 do goal: rectificar sem migração.
 * A correcção é do que descreve o acontecimento; não há apagar.
 */
export function AcontecimentoCorrigir({
  actual,
  redirectTo,
  fornecedorId,
}: {
  actual: AcontecimentoActual;
  redirectTo: string;
  fornecedorId: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState<AcontecimentoFormState, FormData>(
    corrigirAcontecimento,
    {},
  );

  return (
    <div className="mt-2.5">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-britishGreen/20 px-2.5 py-1.5 font-body text-[0.7rem] font-semibold text-britishGreen transition-colors hover:bg-britishGreen/5"
      >
        {aberto ? <X className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
        {aberto ? "Cancelar correcção" : "Corrigir"}
      </button>

      {aberto && (
        <form action={formAction} className="mt-3 rounded-xl border border-britishGreen/15 bg-white/60 p-4">
          <input type="hidden" name="evento_id" value={actual.id} />
          <input type="hidden" name="redirect_to" value={redirectTo} />
          <input type="hidden" name="fornecedor_id" value={fornecedorId} />

          {state.error && <p className="mb-3 font-body text-xs text-alert">{state.error}</p>}
          {state.ok && (
            <p className="mb-3 font-body text-xs text-britishGreen">Acontecimento corrigido.</p>
          )}

          <CamposAcontecimento state={state} contratos={[]} actual={actual} />

          <button
            type="submit"
            disabled={pending}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-britishGreen px-4 py-2 font-body text-xs font-semibold text-white transition-colors hover:bg-britishGreenDeep disabled:opacity-60"
          >
            {pending ? "A guardar…" : "Guardar correcção"}
          </button>
        </form>
      )}
    </div>
  );
}
