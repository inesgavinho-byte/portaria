import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { AssembleiaBadge, formatarDataHora, TIPO_LABEL } from "@/components/app/assembleia-badge";
import type { Assembleia } from "@/types/database";

export default async function ConfigAssembleiasPage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("assembleias")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .order("data_hora", { ascending: false, nullsFirst: true })
    .order("criado_em", { ascending: false });

  const lista: Assembleia[] = data ?? [];

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-title text-h1 text-ink mb-2">Gestão de assembleias</h1>
          <p className="font-body text-oliveGray">
            Prepare convocatórias, ordens de trabalhos e atas.
          </p>
        </div>
        <Link href="/configuracao/assembleias/nova"
          className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors">
          <Plus className="w-4 h-4" /> Nova assembleia
        </Link>
      </div>

      {lista.length === 0 ? (
        <div className="bg-paper border border-warmBeige/20 p-12 text-center">
          <p className="font-body text-oliveGray mb-4">Ainda não há assembleias.</p>
          <Link href="/configuracao/assembleias/nova"
            className="font-body text-sm text-warmBeige hover:text-oliveGray transition-colors tracking-widest uppercase">
            Criar a primeira
          </Link>
        </div>
      ) : (
        <div className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
          {lista.map((a) => (
            <Link key={a.id} href={`/configuracao/assembleias/${a.id}`}
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
