"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { importarExtratoBcp, type ImportarExtratoEstado } from "@/lib/actions/importar-extrato";

export function ImportarExtratoForm() {
  const [resultado, setResultado] = useState<ImportarExtratoEstado | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function submeter(formData: FormData) {
    setResultado(null);
    startTransition(async () => {
      const estado = await importarExtratoBcp(formData);
      setResultado(estado);
      if (estado.estado === "sucesso") formRef.current?.reset();
    });
  }

  return (
    <div className="space-y-4">
      <form ref={formRef} action={submeter} className="portaria-panel px-5 py-5">
        <label htmlFor="ficheiro-extrato" className="font-body text-sm font-semibold text-ink">
          Ficheiro do extrato (.xlsx)
        </label>
        <input
          id="ficheiro-extrato"
          name="ficheiro"
          type="file"
          accept=".xlsx"
          required
          disabled={isPending}
          className="mt-2 block w-full rounded-xl border border-britishGreen/20 bg-white/80 px-3 py-2.5 font-body text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-britishGreenSoft file:px-3 file:py-1.5 file:font-body file:text-xs file:font-semibold file:text-britishGreen disabled:opacity-50"
        />
        <p className="mt-2 font-body text-xs text-oliveGray">
          Exporta o extrato em Conta → Movimentos → Exportar (XLSX) no Millennium BCP.
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-britishGreen px-4 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-britishGreenDeep disabled:opacity-40"
        >
          {isPending ? "A importar…" : "Importar"}
        </button>
      </form>

      {resultado?.estado === "erro" && (
        <div role="alert" className="rounded-xl border border-alert/30 bg-alert/10 px-4 py-3 font-body text-sm leading-6 text-alert">
          {resultado.erro}
          {resultado.avisos?.map((aviso) => (
            <p key={aviso} className="mt-1 text-xs opacity-80">
              {aviso}
            </p>
          ))}
        </div>
      )}

      {resultado?.estado === "sucesso" && (
        <div className="portaria-panel px-5 py-5">
          <p className="font-body text-sm font-semibold text-britishGreen">Extrato importado</p>

          <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <div>
              <dt className="font-body text-[0.67rem] font-semibold uppercase tracking-[0.11em] text-oliveGray">Conta</dt>
              <dd className="mt-0.5 font-body text-sm text-ink">{resultado.conta ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-body text-[0.67rem] font-semibold uppercase tracking-[0.11em] text-oliveGray">Período</dt>
              <dd className="mt-0.5 font-body text-sm text-ink">{resultado.periodo}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-body text-[0.67rem] font-semibold uppercase tracking-[0.11em] text-oliveGray">
                Saldo no período
              </dt>
              <dd className="mt-0.5 font-body text-sm tabular-nums text-ink">
                {resultado.saldoInicial} → {resultado.saldoFinal}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <Contador label="importados" valor={resultado.importados} />
            <Contador label="duplicados (já existiam)" valor={resultado.duplicados} />
            <Contador label="ignorados" valor={resultado.ignorados} />
          </div>

          {resultado.avisos.length > 0 && (
            <ul className="mt-4 space-y-1 border-t border-britishGreen/10 pt-3">
              {resultado.avisos.map((aviso) => (
                <li key={aviso} className="font-body text-xs leading-5 text-oliveGray">
                  {aviso}
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 border-t border-britishGreen/10 pt-3 font-body text-xs leading-5 text-oliveGray">
            Os movimentos importados ficam confirmados como prova bancária; a triagem de fornecedor continua na lista
            Por triar.{" "}
            <Link
              href="/configuracao/financeiro/movimentos"
              className="font-semibold text-britishGreen transition-colors hover:text-britishGreenDeep"
            >
              Ver movimentos
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

function Contador({ label, valor }: { label: string; valor: number }) {
  return (
    <span className="rounded-full bg-britishGreenSoft px-3 py-1 font-body text-xs font-semibold text-britishGreen">
      <span className="tabular-nums">{valor}</span> <span className="font-normal">{label}</span>
    </span>
  );
}
