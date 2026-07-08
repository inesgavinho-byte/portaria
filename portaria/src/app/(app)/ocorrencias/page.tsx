import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { OcorrenciaEstadoBadge } from "@/components/app/ocorrencia-estado-badge";
import { CATEGORIA_LABEL } from "@/lib/ocorrencias";
import type { Ocorrencia } from "@/types/database";

export default async function OcorrenciasPage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  // Filtro explícito por criado_por: um admin também é membro e nesta
  // página vê apenas as SUAS ocorrências (a gestão está em /configuracao)
  const { data: ocorrencias } = await supabase
    .from("ocorrencias")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .eq("criado_por", ctx.user.id)
    .order("criado_em", { ascending: false });

  const lista: Ocorrencia[] = ocorrencias ?? [];

  return (
    <div>
      <div className="flex items-start justify-between mb-12">
        <div>
          <h1 className="font-title text-h1 text-ink mb-2">Ocorrências</h1>
          <p className="font-body text-oliveGray">
            Reporte problemas do edifício e acompanhe a sua resolução.
          </p>
        </div>
        <Link
          href="/ocorrencias/nova"
          className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova ocorrência
        </Link>
      </div>

      {lista.length === 0 ? (
        <div className="bg-paper border border-warmBeige/20 p-12 text-center">
          <p className="font-body text-oliveGray mb-4">
            Ainda não reportou nenhuma ocorrência.
          </p>
          <Link
            href="/ocorrencias/nova"
            className="font-body text-sm text-warmBeige hover:text-oliveGray transition-colors tracking-widest uppercase"
          >
            Reportar a primeira
          </Link>
        </div>
      ) : (
        <div className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
          {lista.map((ocorrencia) => (
            <Link
              key={ocorrencia.id}
              href={`/ocorrencias/${ocorrencia.id}`}
              className="flex items-center justify-between gap-4 p-4 hover:bg-softCream/40 transition-colors"
            >
              <div className="min-w-0">
                <h2 className="font-title text-lg text-ink truncate">
                  {ocorrencia.titulo}
                </h2>
                <p className="font-body text-xs text-oliveGray mt-1">
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
              <OcorrenciaEstadoBadge estado={ocorrencia.estado} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
