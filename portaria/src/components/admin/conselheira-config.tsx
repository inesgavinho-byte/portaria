"use client";

import { useActionState } from "react";
import {
  semearLegislacao,
  carregarRegulamento,
  type SemearState,
  type RegulamentoState,
} from "@/lib/actions/conhecimento";

export function ConselheiraConfig({
  openai,
  legislacao,
  regulamento,
}: {
  openai: boolean;
  legislacao: number;
  regulamento: number;
}) {
  const [semState, semAction, semPending] = useActionState<SemearState, FormData>(
    semearLegislacao,
    {}
  );
  const [regState, regAction, regPending] = useActionState<RegulamentoState, FormData>(
    carregarRegulamento,
    {}
  );

  return (
    <div className="space-y-10 max-w-2xl">
      {!openai && (
        <div className="border-l-4 border-alert bg-alert/5 px-4 py-3">
          <p className="font-body text-sm text-alert">
            Falta configurar a variável <code>OPENAI_API_KEY</code> no ambiente.
            A Conselheira fica indisponível até isso estar feito.
          </p>
        </div>
      )}

      {/* Legislação canónica */}
      <section className="space-y-4">
        <div>
          <h2 className="font-title text-h3 text-warmBeige">Legislação</h2>
          <p className="font-body text-sm text-oliveGray mt-1">
            Regime da propriedade horizontal (Código Civil, DL 268/94, Lei
            8/2022) incorporado na plataforma, partilhado por todos os
            condomínios.
          </p>
        </div>
        <p className="font-body text-sm text-ink">
          {legislacao > 0
            ? `${legislacao} fontes de legislação carregadas.`
            : "Ainda não carregada."}
        </p>
        <form action={semAction}>
          <button
            type="submit"
            disabled={semPending || !openai}
            className="px-6 py-3 border border-warmBeige/50 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink hover:border-warmBeige transition-colors disabled:opacity-50"
          >
            {semPending
              ? "A carregar…"
              : legislacao > 0
              ? "Recarregar legislação"
              : "Carregar legislação"}
          </button>
        </form>
        {semState.error && <p className="font-body text-sm text-alert">{semState.error}</p>}
        {semState.ok && (
          <p className="font-body text-sm text-success">
            {semState.n ? `${semState.n} fontes carregadas.` : "Já estava carregada."}
          </p>
        )}
      </section>

      {/* Regulamento do condomínio */}
      <section className="space-y-4 pt-8 border-t border-warmBeige/20">
        <div>
          <h2 className="font-title text-h3 text-warmBeige">Regulamento do condomínio</h2>
          <p className="font-body text-sm text-oliveGray mt-1">
            Carregue o PDF do regulamento. A Conselheira passa a citá-lo em
            conjunto com a legislação.
          </p>
        </div>
        <p className="font-body text-sm text-ink">
          {regulamento > 0
            ? `Regulamento carregado (${regulamento} secções).`
            : "Nenhum regulamento carregado."}
        </p>
        <form action={regAction} className="space-y-3">
          <input
            type="file"
            name="ficheiro"
            accept="application/pdf"
            className="font-body text-sm text-ink file:mr-4 file:py-2 file:px-4 file:border file:border-warmBeige/40 file:bg-paper file:font-body file:text-xs file:tracking-widest file:uppercase file:text-oliveGray hover:file:border-warmBeige"
          />
          <div>
            <button
              type="submit"
              disabled={regPending || !openai}
              className="px-6 py-3 bg-ink text-paper font-body text-xs tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50"
            >
              {regPending ? "A analisar o regulamento…" : "Carregar regulamento"}
            </button>
          </div>
        </form>
        {regState.error && <p className="font-body text-sm text-alert">{regState.error}</p>}
        {regState.ok && (
          <p className="font-body text-sm text-success">
            Regulamento carregado ({regState.n} secções).
          </p>
        )}
      </section>
    </div>
  );
}
