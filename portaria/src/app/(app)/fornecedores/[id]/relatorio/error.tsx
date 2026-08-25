"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Fronteira de erro do relatório.
 *
 * Sem isto, uma falha no render do servidor devolve em produção apenas
 * "Application error" e um digest — número que só se resolve nos logs da
 * plataforma. Aqui mostra-se o digest a par da mensagem, dá-se caminho de
 * regresso e registam-se os detalhes na consola do navegador, para que o
 * diagnóstico não dependa de acesso à infraestrutura.
 */
export default function RelatorioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Falha ao gerar o relatório do fornecedor", {
      mensagem: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl py-16">
      <div className="portaria-panel px-6 py-7">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-alert" />
          <div className="min-w-0">
            <h1 className="font-title text-h3 text-ink">Não foi possível gerar o relatório</h1>
            <p className="mt-2 font-body text-sm leading-6 text-oliveGray">
              O dossiê do fornecedor está intacto. A falha ocorreu ao compor o documento e não
              afecta os dados registados.
            </p>
            {error.digest && (
              <p className="mt-3 font-body text-xs text-oliveGray">
                Referência para diagnóstico:{" "}
                <code className="rounded bg-softCream px-1.5 py-0.5 font-mono text-[0.7rem] text-ink">
                  {error.digest}
                </code>
              </p>
            )}
            {error.message && (
              <p className="mt-2 font-body text-xs leading-5 text-oliveGray">{error.message}</p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-xl bg-britishGreen px-4 py-2.5 font-body text-xs font-semibold text-white transition-colors hover:bg-britishGreenDeep"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Tentar novamente
              </button>
              <Link
                href=".."
                className="inline-flex items-center gap-2 rounded-xl border border-britishGreen/15 bg-white/70 px-4 py-2.5 font-body text-xs font-semibold text-britishGreen transition-colors hover:bg-white"
              >
                Voltar ao fornecedor
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
