import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { OcorrenciaEstadoBadge } from "@/components/app/ocorrencia-estado-badge";
import { CATEGORIA_LABEL, ESTADO_LABEL, ESTADOS } from "@/lib/ocorrencias";
import type { Ocorrencia } from "@/types/database";

export default async function ConfigOcorrenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  const filtro = ESTADOS.includes(estado as Ocorrencia["estado"])
    ? (estado as Ocorrencia["estado"])
    : null;

  const supabase = await createClient();
  let query = supabase
    .from("ocorrencias")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .order("criado_em", { ascending: false });
  if (filtro) query = query.eq("estado", filtro);

  const { data: ocorrencias } = await query;
  const lista: Ocorrencia[] = ocorrencias ?? [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-title text-h1 text-ink mb-2">
          Gestão de ocorrências
        </h1>
        <p className="font-body text-oliveGray">
          Acompanhe e resolva as ocorrências reportadas pelos condóminos.
        </p>
      </div>

      {/* Filtro por estado */}
      <div className="flex flex-wrap gap-2 mb-8">
        <FiltroEstado ativo={filtro === null} href="/configuracao/ocorrencias">
          Todas
        </FiltroEstado>
        {ESTADOS.map((e) => (
          <FiltroEstado
            key={e}
            ativo={filtro === e}
            href={`/configuracao/ocorrencias?estado=${e}`}
          >
            {ESTADO_LABEL[e]}
          </FiltroEstado>
        ))}
      </div>

      {lista.length === 0 ? (
        <div className="bg-paper border border-warmBeige/20 p-12 text-center">
          <p className="font-body text-oliveGray">
            {filtro
              ? `Sem ocorrências no estado "${ESTADO_LABEL[filtro]}".`
              : "Ainda não foram reportadas ocorrências."}
          </p>
        </div>
      ) : (
        <div className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
          {lista.map((ocorrencia) => (
            <Link
              key={ocorrencia.id}
              href={`/configuracao/ocorrencias/${ocorrencia.id}`}
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

function FiltroEstado({
  ativo,
  href,
  children,
}: {
  ativo: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-4 py-1.5 border font-body text-xs tracking-widest uppercase transition-colors ${
        ativo
          ? "bg-ink text-paper border-ink"
          : "border-warmBeige/40 text-oliveGray hover:text-ink hover:border-warmBeige"
      }`}
    >
      {children}
    </Link>
  );
}
