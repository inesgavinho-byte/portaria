import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/supabase/tenant";
import {
  EstadoBadge,
  OCORRENCIA_CATEGORIA_LABEL,
} from "@/components/app/ocorrencia-badges";
import type { Ocorrencia, OcorrenciaEstado } from "@/types/database";

type OcorrenciaComFracao = Ocorrencia & {
  fracoes: { identificacao: string } | null;
};

const ORDEM_ESTADO: Record<OcorrenciaEstado, number> = {
  novo: 0,
  em_curso: 1,
  aguarda_fornecedor: 2,
  resolvido: 3,
  arquivado: 4,
};

export default async function OcorrenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ ordenar?: string }>;
}) {
  const { ordenar } = await searchParams;
  const porEstado = ordenar === "estado";

  const supabase = await createClient();
  const tenant = await getCurrentTenant();

  const { data } = await supabase
    .from("ocorrencias")
    .select("*, fracoes(identificacao)")
    .eq("tenant_id", tenant!.id)
    .order("criado_em", { ascending: false });

  let ocorrencias = (data ?? []) as OcorrenciaComFracao[];
  if (porEstado) {
    ocorrencias = [...ocorrencias].sort(
      (a, b) => ORDEM_ESTADO[a.estado] - ORDEM_ESTADO[b.estado]
    );
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-12 gap-4 flex-wrap">
        <div>
          <h1 className="font-title text-h1 text-ink mb-2">Ocorrências</h1>
          <p className="font-body text-oliveGray">
            Problemas, pedidos e assuntos operacionais do condomínio.
          </p>
        </div>
        <Link
          href="/ocorrencias/nova"
          className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors"
        >
          <Plus className="w-4 h-4" />
          Reportar
        </Link>
      </div>

      <div className="flex items-center gap-4 mb-6 font-body text-xs tracking-widest uppercase">
        <span className="text-oliveGray/70">Ordenar:</span>
        <Link
          href="/ocorrencias"
          className={
            !porEstado ? "text-ink" : "text-oliveGray hover:text-ink"
          }
        >
          Mais recentes
        </Link>
        <Link
          href="/ocorrencias?ordenar=estado"
          className={
            porEstado ? "text-ink" : "text-oliveGray hover:text-ink"
          }
        >
          Abertas primeiro
        </Link>
      </div>

      {ocorrencias.length === 0 ? (
        <div className="bg-paper border border-warmBeige/20 p-12 text-center">
          <p className="font-body text-oliveGray">
            Ainda não há ocorrências registadas.
          </p>
        </div>
      ) : (
        <ul className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
          {ocorrencias.map((o) => (
            <li key={o.id}>
              <Link
                href={`/ocorrencias/${o.id}`}
                className="flex items-center justify-between gap-4 p-5 hover:bg-softCream/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-body text-ink truncate">{o.titulo}</p>
                  <p className="font-body text-xs text-oliveGray mt-1">
                    {OCORRENCIA_CATEGORIA_LABEL[o.categoria]}
                    {o.fracoes?.identificacao && ` · ${o.fracoes.identificacao}`}
                    {" · "}
                    {new Date(o.criado_em).toLocaleDateString("pt-PT", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <EstadoBadge estado={o.estado} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
