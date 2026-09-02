import Link from "next/link";
import type { ReactNode } from "react";

export type LegalSection = {
  titulo: string;
  paragrafos?: string[];
  lista?: string[];
  tabela?: { colunas: string[]; linhas: string[][] };
};

/**
 * Página legal do produto (/privacidade, /termos). Tema da landing (night).
 * O conteúdo vive nas páginas, não aqui — este componente só compõe.
 */
export function LegalPage({
  titulo,
  intro,
  secoes,
}: {
  titulo: string;
  intro: string;
  secoes: LegalSection[];
}) {
  return (
    <div className="bg-night min-h-screen">
      <div className="container-page py-20 md:py-28">
        <div className="max-w-3xl">
          <p className="font-body text-xs tracking-[0.35em] uppercase text-paper/40 mb-6">
            Informação legal
          </p>
          <h1 className="font-title text-4xl md:text-5xl text-paper mb-8">
            {titulo}
          </h1>
          <p className="font-body text-sm text-paper/50 italic mb-14 leading-relaxed">
            {intro}
          </p>

          <div className="space-y-12">
            {secoes.map((secao) => (
              <section key={secao.titulo}>
                <h2 className="font-title text-xl text-paper mb-4">
                  {secao.titulo}
                </h2>
                <div className="space-y-4 font-body text-paper/70 leading-relaxed">
                  {secao.paragrafos?.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                  {secao.lista && (
                    <ul className="space-y-2 list-disc pl-5 marker:text-paper/30">
                      {secao.lista.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {secao.tabela && (
                    <div className="overflow-x-auto border border-white/10 rounded-lg">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="border-b border-white/10 text-paper/40">
                            {secao.tabela.colunas.map((c) => (
                              <th key={c} className="px-4 py-3 font-medium">
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {secao.tabela.linhas.map((linha, i) => (
                            <tr
                              key={i}
                              className="border-b border-white/5 last:border-0 align-top"
                            >
                              {linha.map((celula, j) => (
                                <td key={j} className="px-4 py-3">
                                  {celula}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>

          <p className="mt-16 font-body text-xs text-paper/40">
            Documentos de referência anexos a cada contrato de subcontratação:{" "}
            <Link href="/termos" className="underline hover:text-paper/70">
              Termos de Serviço
            </Link>{" "}
            ·{" "}
            <Link href="/privacidade" className="underline hover:text-paper/70">
              Política de Privacidade
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function LegalFooterLinks(): ReactNode {
  return (
    <>
      <Link href="/privacidade" className="hover:text-paper/80 transition-colors">
        Privacidade
      </Link>
      <Link href="/termos" className="hover:text-paper/80 transition-colors">
        Termos
      </Link>
    </>
  );
}
