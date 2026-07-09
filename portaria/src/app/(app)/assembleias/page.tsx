import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { AssembleiaBadge, formatarDataHora, TIPO_LABEL } from "@/components/app/assembleia-badge";
import type { Assembleia } from "@/types/database";

export default async function AssembleiasPage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  // RLS mostra só as publicadas (não-rascunho) aos condóminos
  const supabase = await createClient();
  const { data } = await supabase
    .from("assembleias")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .neq("estado", "rascunho")
    .order("data_hora", { ascending: false, nullsFirst: true });

  const lista: Assembleia[] = data ?? [];

  return (
    <div>
      <div className="mb-12">
        <h1 className="font-title text-h1 text-ink mb-2">Assembleias</h1>
        <p className="font-body text-oliveGray">
          Convocatórias, ordens de trabalhos e atas do condomínio.
        </p>
      </div>

      {lista.length === 0 ? (
        <div className="bg-paper border border-warmBeige/20 p-12 text-center">
          <p className="font-body text-oliveGray">
            Não há assembleias publicadas de momento.
          </p>
        </div>
      ) : (
        <div className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
          {lista.map((a) => (
            <Link key={a.id} href={`/assembleias/${a.id}`}
              className="flex items-center justify-between gap-4 p-4 hover:bg-softCream/40 transition-colors">
              <div className="min-w-0">
                <h2 className="font-title text-lg text-ink truncate">{a.titulo}</h2>
                <p className="font-body text-xs text-oliveGray mt-1">
                  {TIPO_LABEL[a.tipo]} · {formatarDataHora(a.data_hora)}
                </p>
              </div>
              <AssembleiaBadge estado={a.estado} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
