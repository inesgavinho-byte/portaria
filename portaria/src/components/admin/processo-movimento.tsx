"use client";

import { useActionState, useState, useTransition } from "react";
import { Gavel, Landmark, Undo2 } from "lucide-react";
import { imputarMovimentoADespesa } from "@/lib/actions/movimentos-bancarios";
import { mudarEstadoPosicao, registarPosicao, type PosicaoFormState } from "@/lib/actions/dossier-imputacoes";
import {
  ESTADOS_POSICAO,
  ESTADO_LABEL_POSICAO,
  PARTES_POSICAO,
  PARTE_LABEL_POSICAO,
  TIPOS_POSICAO,
  TIPO_LABEL_POSICAO,
} from "@/lib/fornecedores/processo";
import type { PosicaoImputacao } from "@/types/database";
import type { DocumentoEscolha } from "@/components/admin/evidencia-juntar";

const campo =
  "w-full rounded-lg border border-britishGreen/15 bg-paper px-3 py-2 font-body text-sm text-ink placeholder:text-oliveGray/70 focus:border-britishGreen/40 focus:outline-none";
const etiqueta =
  "mb-1.5 block font-body text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-oliveGray";
const botaoPrimario =
  "inline-flex items-center gap-2 rounded-xl bg-britishGreen px-4 py-2 font-body text-xs font-semibold text-white transition-colors hover:bg-britishGreenDeep disabled:opacity-60";
const botaoSecundario =
  "inline-flex items-center gap-1.5 rounded-lg border border-britishGreen/20 px-2.5 py-1.5 font-body text-[0.7rem] font-semibold text-britishGreen transition-colors hover:bg-britishGreen/5";

export type FacturaEscolha = { id: string; numero: string; descricao: string; valor: string };

const ESTADO_CLASSE = {
  sustentada: "bg-britishGreenSoft text-britishGreen",
  aceite: "bg-britishGreenSoft text-britishGreen",
  retirada: "bg-softCream text-oliveGray",
  superada: "bg-softCream text-oliveGray",
} as const;

/**
 * O processo sobre um pagamento, no próprio acontecimento do histórico.
 *
 * Duas coisas distintas, lado a lado mas sem se tocarem:
 *  - a imputação — `movimentos_bancarios.despesa_id` — é o que o processo
 *    DEMONSTRA: só se liga o movimento à factura que ele liquidou;
 *  - as posições — `imputacoes_posicoes` — são o que cada parte SUSTENTA,
 *    incluindo quando se contradizem. Nunca mexem na ligação de cima.
 */
export function ProcessoMovimento({
  movimento,
  facturas,
  posicoes,
  documentos,
  redirectTo,
  fornecedorId,
}: {
  movimento: {
    id: string;
    despesa_id: string | null;
    estado_reconciliacao: string;
    tipo: string;
    confirmado: boolean;
  };
  facturas: FacturaEscolha[];
  posicoes: PosicaoImputacao[];
  documentos: DocumentoEscolha[];
  redirectTo: string;
  fornecedorId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [erroImputacao, setErroImputacao] = useState<string | null>(null);
  const [despesaEscolhida, setDespesaEscolhida] = useState("");

  const facturaActual = movimento.despesa_id
    ? facturas.find((factura) => factura.id === movimento.despesa_id)
    : undefined;

  function imputar(despesaId: string | null) {
    setErroImputacao(null);
    startTransition(async () => {
      const resultado = await imputarMovimentoADespesa(movimento.id, despesaId);
      if (!resultado.ok) setErroImputacao(resultado.error);
    });
  }

  return (
    <div className="mt-2.5 rounded-xl border border-britishGreen/15 bg-white/50 p-3.5">
      <p className="flex items-center gap-1.5 font-body text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-britishGreen">
        <Landmark className="h-3 w-3" /> Imputação do pagamento
      </p>

      {facturaActual ? (
        <p className="mt-2 font-body text-xs leading-5 text-ink">
          Imputado a <span className="font-semibold">{facturaActual.numero || facturaActual.descricao}</span>
          {facturaActual.valor && <> · {facturaActual.valor}</>}.
        </p>
      ) : (
        <p className="mt-2 font-body text-xs leading-5 text-oliveGray">
          Factura exacta por identificar — só se imputa o que o processo demonstra.
        </p>
      )}

      {movimento.tipo === "debito" && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {!movimento.despesa_id && facturas.length > 0 && (
            <>
              <select
                value={despesaEscolhida}
                onChange={(event) => setDespesaEscolhida(event.target.value)}
                className="max-w-xs rounded-lg border border-britishGreen/15 bg-paper px-2.5 py-1.5 font-body text-xs text-ink focus:border-britishGreen/40 focus:outline-none"
                aria-label="Factura a imputar"
              >
                <option value="">Escolher factura…</option>
                {facturas.map((factura) => (
                  <option key={factura.id} value={factura.id}>
                    {factura.numero || factura.descricao} · {factura.valor}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!despesaEscolhida || isPending}
                onClick={() => imputar(despesaEscolhida)}
                className="rounded-lg bg-britishGreen px-3 py-1.5 font-body text-[0.7rem] font-semibold text-white transition-colors hover:bg-britishGreenDeep disabled:opacity-50"
              >
                {isPending ? "A imputar…" : "Imputar"}
              </button>
            </>
          )}
          {movimento.despesa_id && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => imputar(null)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-britishGreen/15 px-3 py-1.5 font-body text-[0.7rem] font-semibold text-oliveGray transition-colors hover:text-alert disabled:opacity-50"
            >
              <Undo2 className="h-3 w-3" />
              {isPending ? "A anular…" : "Anular imputação"}
            </button>
          )}
          {facturas.length === 0 && !movimento.despesa_id && (
            <span className="font-body text-[0.7rem] italic text-oliveGray">
              Sem facturas registadas deste fornecedor para imputar.
            </span>
          )}
        </div>
      )}

      {erroImputacao && <p className="mt-2 font-body text-xs text-alert">{erroImputacao}</p>}

      {posicoes.length > 0 && (
        <div className="mt-3 border-t border-britishGreen/10 pt-3">
          <p className="flex items-center gap-1.5 font-body text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-oliveGray">
            <Gavel className="h-3 w-3" /> Posições das partes ({posicoes.length})
          </p>
          <ul className="mt-2 space-y-3">
            {posicoes.map((posicao) => (
              <PosicaoItem
                key={posicao.id}
                posicao={posicao}
                facturas={facturas}
                redirectTo={redirectTo}
                fornecedorId={fornecedorId}
              />
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 border-t border-britishGreen/10 pt-3">
        <PosicaoRegistar
          movimentoId={movimento.id}
          facturas={facturas}
          documentos={documentos}
          redirectTo={redirectTo}
          fornecedorId={fornecedorId}
        />
      </div>
    </div>
  );
}

const FORMATO_DATA = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" });

function formatarData(valor: string) {
  const instante = new Date(valor);
  return Number.isNaN(instante.getTime()) ? valor : FORMATO_DATA.format(instante);
}

function PosicaoItem({
  posicao,
  facturas,
  redirectTo,
  fornecedorId,
}: {
  posicao: PosicaoImputacao;
  facturas: FacturaEscolha[];
  redirectTo: string;
  fornecedorId: string;
}) {
  const [state, formAction, pending] = useActionState<PosicaoFormState, FormData>(
    mudarEstadoPosicao,
    {},
  );
  const factura = posicao.despesa_id
    ? facturas.find((f) => f.id === posicao.despesa_id)
    : undefined;

  return (
    <li className="rounded-lg border border-warmBeige/50 bg-white/70 p-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-body text-xs font-semibold text-ink">
          {PARTE_LABEL_POSICAO[posicao.parte]}
          {posicao.parte_descricao ? ` — ${posicao.parte_descricao}` : ""}
        </span>
        <span className="font-body text-xs text-oliveGray">
          {TIPO_LABEL_POSICAO[posicao.tipo]}
          {factura ? ` ${factura.numero || factura.descricao}` : ""}
        </span>
        <span
          className={`rounded px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.06em] ${ESTADO_CLASSE[posicao.estado]}`}
        >
          {ESTADO_LABEL_POSICAO[posicao.estado]}
        </span>
        <span className="font-body text-[0.66rem] text-oliveGray">
          desde {formatarData(posicao.data_posicao)}
        </span>
      </div>
      <p className="mt-1.5 font-body text-xs leading-5 text-oliveGray">{posicao.fundamento}</p>

      {(posicao.imputacoes_posicoes_evidencias ?? []).length > 0 && (
        <ul className="mt-1.5 space-y-1 border-l-2 border-warmBeige/60 pl-2">
          {(posicao.imputacoes_posicoes_evidencias ?? []).map((evidencia) => (
            <li key={evidencia.id} className="font-body text-[0.7rem] leading-5 text-oliveGray">
              <span className="font-semibold text-ink">
                {evidencia.ia_documental_fontes?.[0]?.titulo ?? "Fonte documental"}
              </span>
              {evidencia.localizador && <span> · {evidencia.localizador}</span>}
              <span className="mt-0.5 block italic">“{evidencia.citacao}”</span>
            </li>
          ))}
        </ul>
      )}

      {posicao.observacoes && (
        <p className="mt-1.5 font-body text-[0.7rem] italic leading-5 text-oliveGray">
          {posicao.observacoes}
        </p>
      )}

      <form action={formAction} className="mt-2 flex flex-wrap items-center gap-2">
        <input type="hidden" name="posicao_id" value={posicao.id} />
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <input type="hidden" name="fornecedor_id" value={fornecedorId} />
        <label className="font-body text-[0.66rem] text-oliveGray" htmlFor={`pos-estado-${posicao.id}`}>
          Estado
        </label>
        <select
          id={`pos-estado-${posicao.id}`}
          name="estado"
          defaultValue={posicao.estado}
          className="rounded-lg border border-britishGreen/15 bg-paper px-2 py-1 font-body text-xs text-ink focus:border-britishGreen/40 focus:outline-none"
        >
          {ESTADOS_POSICAO.map((estado) => (
            <option key={estado.valor} value={estado.valor}>
              {estado.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-britishGreen/15 px-2.5 py-1 font-body text-[0.66rem] font-semibold text-oliveGray transition-colors hover:text-britishGreen disabled:opacity-50"
        >
          {pending ? "A guardar…" : "Actualizar"}
        </button>
        {state.error && <span className="font-body text-xs text-alert">{state.error}</span>}
      </form>
      <p className="mt-1 font-body text-[0.64rem] text-oliveGray/80">
        Retirar ou dar por superada não apaga: a posição fica no histórico do processo.
      </p>
    </li>
  );
}

function PosicaoRegistar({
  movimentoId,
  facturas,
  documentos,
  redirectTo,
  fornecedorId,
}: {
  movimentoId: string;
  facturas: FacturaEscolha[];
  documentos: DocumentoEscolha[];
  redirectTo: string;
  fornecedorId: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState("imputa");
  const [state, formAction, pending] = useActionState<PosicaoFormState, FormData>(
    registarPosicao,
    {},
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className={botaoSecundario}
      >
        {aberto ? "Fechar" : "Registar posição de uma parte"}
      </button>

      {aberto && (
        <form action={formAction} className="mt-3 rounded-xl border border-britishGreen/15 bg-white/60 p-4">
          <input type="hidden" name="movimento_id" value={movimentoId} />
          <input type="hidden" name="redirect_to" value={redirectTo} />
          <input type="hidden" name="fornecedor_id" value={fornecedorId} />

          {state.error && <p className="mb-3 font-body text-xs text-alert">{state.error}</p>}
          {state.ok && (
            <p className="mb-3 font-body text-xs text-britishGreen">Posição registada.</p>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={etiqueta} htmlFor={`pos-parte-${movimentoId}`}>
                Quem sustenta
              </label>
              <select id={`pos-parte-${movimentoId}`} name="parte" required className={campo}>
                {PARTES_POSICAO.map((parte) => (
                  <option key={parte.valor} value={parte.valor}>
                    {parte.label}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.parte && (
                <p className="mt-1 font-body text-xs text-alert">{state.fieldErrors.parte}</p>
              )}
            </div>

            <div>
              <label className={etiqueta} htmlFor={`pos-desc-${movimentoId}`}>
                Quem em concreto <span className="normal-case tracking-normal">(opcional)</span>
              </label>
              <input
                id={`pos-desc-${movimentoId}`}
                name="parte_descricao"
                maxLength={200}
                placeholder='Ex.: "Rui Machado da Silva, mandatário"'
                className={campo}
              />
            </div>

            <div>
              <label className={etiqueta} htmlFor={`pos-tipo-${movimentoId}`}>
                O que sustenta
              </label>
              <select
                id={`pos-tipo-${movimentoId}`}
                name="tipo"
                value={tipo}
                onChange={(event) => setTipo(event.target.value)}
                className={campo}
              >
                {TIPOS_POSICAO.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.label}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.tipo && (
                <p className="mt-1 font-body text-xs text-alert">{state.fieldErrors.tipo}</p>
              )}
            </div>

            {tipo !== "reserva" && (
              <div>
                <label className={etiqueta} htmlFor={`pos-desp-${movimentoId}`}>
                  Factura
                </label>
                <select id={`pos-desp-${movimentoId}`} name="despesa_id" required className={campo}>
                  <option value="">Escolher…</option>
                  {facturas.map((factura) => (
                    <option key={factura.id} value={factura.id}>
                      {factura.numero || factura.descricao} · {factura.valor}
                    </option>
                  ))}
                </select>
                {state.fieldErrors?.despesa && (
                  <p className="mt-1 font-body text-xs text-alert">{state.fieldErrors.despesa}</p>
                )}
              </div>
            )}

            <div>
              <label className={etiqueta} htmlFor={`pos-data-${movimentoId}`}>
                Data em que a parte assumiu
              </label>
              <input
                id={`pos-data-${movimentoId}`}
                type="date"
                name="data_posicao"
                required
                className={campo}
              />
              {state.fieldErrors?.data && (
                <p className="mt-1 font-body text-xs text-alert">{state.fieldErrors.data}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className={etiqueta} htmlFor={`pos-fund-${movimentoId}`}>
                Fundamento
              </label>
              <textarea
                id={`pos-fund-${movimentoId}`}
                name="fundamento"
                rows={2}
                required
                maxLength={4000}
                placeholder="O argumento da parte, por extenso."
                className={campo}
              />
              {state.fieldErrors?.fundamento && (
                <p className="mt-1 font-body text-xs text-alert">{state.fieldErrors.fundamento}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className={etiqueta} htmlFor={`pos-doc-${movimentoId}`}>
                Evidência <span className="normal-case tracking-normal">(opcional)</span>
              </label>
              <select id={`pos-doc-${movimentoId}`} name="documento_id" className={campo}>
                <option value="">Sem evidência documental</option>
                {documentos.map((documento) => (
                  <option key={documento.id} value={documento.id}>
                    {documento.titulo}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.documento && (
                <p className="mt-1 font-body text-xs text-alert">{state.fieldErrors.documento}</p>
              )}
            </div>

            <div>
              <label className={etiqueta} htmlFor={`pos-loc-${movimentoId}`}>
                Localizador
              </label>
              <input
                id={`pos-loc-${movimentoId}`}
                name="localizador"
                maxLength={240}
                placeholder="Ex.: email de 11-06-2025 — ou pág. 3/7"
                className={campo}
              />
            </div>

            <div>
              <label className={etiqueta} htmlFor={`pos-cit-${movimentoId}`}>
                Citação
              </label>
              <textarea
                id={`pos-cit-${movimentoId}`}
                name="citacao"
                rows={2}
                maxLength={2000}
                placeholder="Obrigatória se houver documento — a passagem exacta."
                className={campo}
              />
              {state.fieldErrors?.citacao && (
                <p className="mt-1 font-body text-xs text-alert">{state.fieldErrors.citacao}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className={etiqueta} htmlFor={`pos-obs-${movimentoId}`}>
                Observações <span className="normal-case tracking-normal">(opcional)</span>
              </label>
              <input
                id={`pos-obs-${movimentoId}`}
                name="observacoes"
                maxLength={1000}
                className={campo}
              />
            </div>
          </div>

          <p className="mt-3 font-body text-[0.66rem] leading-5 text-oliveGray">
            Registar uma posição não imputa nada: diz o que a parte sustenta. A imputação — a
            factura que o processo demonstra — é decidida em cima, no bloco &ldquo;Imputação do
            pagamento&rdquo;.
          </p>

          <button type="submit" disabled={pending} className={`mt-3 ${botaoPrimario}`}>
            {pending ? "A registar…" : "Registar posição"}
          </button>
        </form>
      )}
    </div>
  );
}
