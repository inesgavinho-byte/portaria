/* eslint-disable @next/next/no-img-element */
import { OcorrenciaEstadoBadge } from "@/components/app/ocorrencia-estado-badge";
import { OcorrenciaTimeline } from "@/components/app/ocorrencia-timeline";
import { FotografiaForm } from "@/components/app/fotografia-form";
import { CATEGORIA_LABEL } from "@/lib/ocorrencias";
import type { Ocorrencia, OcorrenciaEvento } from "@/types/database";

export type FotografiaComUrl = {
  id: string;
  url: string;
};

interface OcorrenciaDetalheProps {
  ocorrencia: Ocorrencia;
  eventos: OcorrenciaEvento[];
  fotografias: FotografiaComUrl[];
  /** Mostrar formulário de juntar fotografias. */
  podeAdicionarFotografias: boolean;
  /** Slot para controlos extra (ex.: controlos de admin). */
  children?: React.ReactNode;
}

/**
 * Detalhe de uma ocorrência — partilhado entre a vista do condómino
 * e a vista de administração (que injeta os seus controlos via children).
 * As fotografias chegam já com URLs assinados gerados no servidor.
 */
export function OcorrenciaDetalhe({
  ocorrencia,
  eventos,
  fotografias,
  podeAdicionarFotografias,
  children,
}: OcorrenciaDetalheProps) {
  return (
    <div className="grid lg:grid-cols-3 gap-12">
      {/* Coluna principal */}
      <div className="lg:col-span-2 space-y-10">
        <div>
          <div className="flex items-start justify-between gap-4 mb-3">
            <h1 className="font-title text-h1 text-ink">{ocorrencia.titulo}</h1>
            <OcorrenciaEstadoBadge estado={ocorrencia.estado} />
          </div>
          <p className="font-body text-xs text-oliveGray">
            {CATEGORIA_LABEL[ocorrencia.categoria]}
            {ocorrencia.fracao && ` · Fração ${ocorrencia.fracao}`}
            {" · "}
            {new Date(ocorrencia.criado_em).toLocaleDateString("pt-PT", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="bg-paper border border-warmBeige/20 p-6">
          <p className="font-body text-ink whitespace-pre-line">
            {ocorrencia.descricao}
          </p>
        </div>

        <section>
          <h2 className="font-title text-h3 text-warmBeige mb-4">
            Fotografias
          </h2>
          {fotografias.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {fotografias.map((foto) => (
                <a
                  key={foto.id}
                  href={foto.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square overflow-hidden border border-warmBeige/20 hover:opacity-90 transition-opacity"
                >
                  <img
                    src={foto.url}
                    alt="Fotografia da ocorrência"
                    className="w-full h-full object-cover"
                  />
                </a>
              ))}
            </div>
          ) : (
            <p className="font-body text-sm text-oliveGray mb-6">
              Sem fotografias.
            </p>
          )}
          {podeAdicionarFotografias && (
            <FotografiaForm ocorrenciaId={ocorrencia.id} />
          )}
        </section>
      </div>

      {/* Coluna lateral — controlos + timeline */}
      <aside className="space-y-10">
        {children}
        <section>
          <h2 className="font-title text-h3 text-warmBeige mb-6">Histórico</h2>
          <OcorrenciaTimeline eventos={eventos} />
        </section>
      </aside>
    </div>
  );
}
