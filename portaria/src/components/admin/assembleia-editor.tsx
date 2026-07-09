"use client";

import { useActionState, useState, useTransition } from "react";
import { Trash2, Plus } from "lucide-react";
import {
  atualizarAssembleia,
  alterarEstadoAssembleia,
  adicionarPonto,
  removerPonto,
  type AssembleiaFormState,
} from "@/lib/actions/assembleias";
import { ESTADO_LABEL, ESTADOS } from "@/lib/assembleias";
import type { Assembleia, AssembleiaPonto } from "@/types/database";

const inputClass =
  "w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige";
const labelClass =
  "block font-body text-xs tracking-widest uppercase text-oliveGray mb-2";

/** Datetime-local espera "YYYY-MM-DDTHH:mm" na hora local. */
function paraInputLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function AssembleiaEditor({
  assembleia,
  pontos,
}: {
  assembleia: Assembleia;
  pontos: AssembleiaPonto[];
}) {
  const action = atualizarAssembleia.bind(null, assembleia.id);
  const [state, formAction, pending] = useActionState<AssembleiaFormState, FormData>(
    action,
    {}
  );

  return (
    <div className="space-y-12 max-w-3xl">
      <EstadoControlo assembleia={assembleia} />

      <form action={formAction} className="space-y-6">
        {state.error && (
          <div className="border-l-4 border-alert bg-alert/5 px-4 py-3">
            <p className="font-body text-sm text-alert">{state.error}</p>
          </div>
        )}
        {state.sucesso && (
          <div className="border-l-4 border-success bg-success/5 px-4 py-3">
            <p className="font-body text-sm text-success">Guardado.</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="titulo" className={labelClass}>Título</label>
            <input id="titulo" name="titulo" required maxLength={200}
              defaultValue={assembleia.titulo} className={inputClass} />
            {state.fieldErrors?.titulo && (
              <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.titulo}</p>
            )}
          </div>
          <div>
            <label htmlFor="tipo" className={labelClass}>Tipo</label>
            <select id="tipo" name="tipo" defaultValue={assembleia.tipo} className={inputClass}>
              <option value="ordinaria">Ordinária</option>
              <option value="extraordinaria">Extraordinária</option>
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="data_hora" className={labelClass}>Data e hora</label>
            <input id="data_hora" name="data_hora" type="datetime-local"
              defaultValue={paraInputLocal(assembleia.data_hora)} className={inputClass} />
            {state.fieldErrors?.data_hora && (
              <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.data_hora}</p>
            )}
          </div>
          <div>
            <label htmlFor="local" className={labelClass}>Local</label>
            <input id="local" name="local" maxLength={200}
              defaultValue={assembleia.local ?? ""} className={inputClass} />
          </div>
        </div>

        <div>
          <label htmlFor="convocatoria" className={labelClass}>Convocatória</label>
          <textarea id="convocatoria" name="convocatoria" rows={5}
            defaultValue={assembleia.convocatoria ?? ""} className={inputClass}
            placeholder="Texto da convocatória enviada aos condóminos." />
        </div>

        <div>
          <label htmlFor="ata" className={labelClass}>Ata</label>
          <textarea id="ata" name="ata" rows={8}
            defaultValue={assembleia.ata ?? ""} className={inputClass}
            placeholder="Ata da reunião (preencher após a assembleia)." />
        </div>

        <button type="submit" disabled={pending}
          className="px-8 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50">
          {pending ? "A guardar..." : "Guardar alterações"}
        </button>
      </form>

      <PontosOrdem assembleiaId={assembleia.id} pontos={pontos} />
    </div>
  );
}

function EstadoControlo({ assembleia }: { assembleia: Assembleia }) {
  const [isPending, startTransition] = useTransition();

  function mudar(e: React.ChangeEvent<HTMLSelectElement>) {
    const novo = e.target.value;
    startTransition(() => alterarEstadoAssembleia(assembleia.id, novo));
  }

  return (
    <div className="flex items-center gap-3 bg-paper border border-warmBeige/20 px-4 py-3">
      <span className={labelClass + " mb-0"}>Estado</span>
      <select defaultValue={assembleia.estado} onChange={mudar} disabled={isPending}
        className="px-3 py-1.5 border border-warmBeige/40 bg-paper font-body text-sm text-ink focus:outline-none focus:border-warmBeige disabled:opacity-50">
        {ESTADOS.map((e) => (
          <option key={e} value={e}>{ESTADO_LABEL[e]}</option>
        ))}
      </select>
      <span className="font-body text-xs text-oliveGray">
        {assembleia.estado === "rascunho"
          ? "Só o admin vê. Mude para «Agendada» para publicar aos condóminos."
          : "Visível aos condóminos."}
      </span>
    </div>
  );
}

function PontosOrdem({
  assembleiaId,
  pontos,
}: {
  assembleiaId: string;
  pontos: AssembleiaPonto[];
}) {
  const add = adicionarPonto.bind(null, assembleiaId);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="pt-8 border-t border-warmBeige/20">
      <h2 className="font-title text-h3 text-warmBeige mb-4">Ordem de trabalhos</h2>

      {pontos.length > 0 && (
        <ol className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10 mb-6">
          {pontos.map((p) => (
            <li key={p.id} className="p-4 flex items-start gap-4">
              <span className="font-title text-warmBeige">{p.ordem}.</span>
              <div className="flex-1 min-w-0">
                <p className="font-body text-ink">{p.titulo}</p>
                {p.descricao && (
                  <p className="font-body text-sm text-oliveGray mt-1 whitespace-pre-line">
                    {p.descricao}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  if (confirming !== p.id) {
                    setConfirming(p.id);
                    setTimeout(() => setConfirming(null), 3000);
                    return;
                  }
                  startTransition(async () => {
                    await removerPonto(p.id, assembleiaId);
                    setConfirming(null);
                  });
                }}
                disabled={isPending}
                className={`p-2 rounded transition-colors disabled:opacity-50 ${
                  confirming === p.id ? "bg-alert text-paper" : "text-oliveGray hover:text-ink hover:bg-softCream/50"
                }`}
                title={confirming === p.id ? "Confirmar" : "Remover"}
                aria-label="Remover ponto"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ol>
      )}

      <form action={add} className="flex flex-col sm:flex-row gap-3">
        <input name="ponto_titulo" required maxLength={200} placeholder="Novo ponto da ordem de trabalhos"
          className={inputClass + " flex-1"} />
        <button type="submit"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-warmBeige/40 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink hover:border-warmBeige transition-colors">
          <Plus className="w-3.5 h-3.5" /> Adicionar
        </button>
      </form>
    </section>
  );
}
