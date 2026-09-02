"use client";

/**
 * Fronteira de erro da rota do fornecedor.
 *
 * O invólucro em `page.tsx` apanha o que falha durante a composição no
 * servidor. Isto apanha o resto — falhas de hidratação e erros lançados nos
 * componentes de cliente — que de outro modo aparecem como um digest sem
 * contexto e sem caminho de volta.
 */
export default function ErroFornecedor({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl py-16">
      <div className="portaria-panel px-6 py-7">
        <h1 className="font-title text-h3 text-ink">O dossiê do fornecedor não abriu</h1>
        <p className="mt-2 font-body text-sm leading-6 text-oliveGray">
          Os dados estão intactos. Isto é uma falha a desenhar a página.
        </p>
        {error.digest && (
          <p className="mt-4 font-body text-xs text-oliveGray">
            Referência da falha: <span className="font-mono text-ink">{error.digest}</span>
          </p>
        )}
        {error.message && (
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg bg-softCream px-3 py-2.5 font-mono text-[0.7rem] leading-5 text-ink">
            {error.message}
          </pre>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="border border-britishGreen/25 bg-paper px-4 py-2.5 font-body text-xs font-semibold text-britishGreen hover:bg-britishGreenSoft"
          >
            Tentar de novo
          </button>
          <a
            href="/fornecedores"
            className="border border-britishGreen/25 bg-paper px-4 py-2.5 font-body text-xs font-semibold text-britishGreen hover:bg-britishGreenSoft"
          >
            Voltar aos fornecedores
          </a>
        </div>
      </div>
    </div>
  );
}
