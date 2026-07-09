import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { AssembleiaBadge, formatarDataHora, TIPO_LABEL } from "@/components/app/assembleia-badge";
import type { Assembleia, AssembleiaPonto } from "@/types/database";

export default async function AssembleiaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const [{ data: assembleia }, { data: pontos }] = await Promise.all([
    supabase.from("assembleias").select("*").eq("id", id).eq("tenant_id", ctx.tenant.id).single(),
    supabase.from("assembleia_pontos").select("*").eq("assembleia_id", id).order("ordem", { ascending: true }),
  ]);

  // RLS já esconde rascunhos aos condóminos
  if (!assembleia) notFound();
  const a = assembleia as Assembleia;
  const listaPontos = (pontos ?? []) as AssembleiaPonto[];

  return (
    <div className="max-w-3xl">
      <Link href="/assembleias"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-6 transition-colors">
        <ChevronLeft className="w-3 h-3" /> Assembleias
      </Link>

      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="font-title text-h1 text-ink">{a.titulo}</h1>
        <AssembleiaBadge estado={a.estado} />
      </div>
      <p className="font-body text-oliveGray mb-10">
        {TIPO_LABEL[a.tipo]} · {formatarDataHora(a.data_hora)}
        {a.local && ` · ${a.local}`}
      </p>

      {a.convocatoria && (
        <section className="mb-10">
          <h2 className="font-title text-h3 text-warmBeige mb-3">Convocatória</h2>
          <p className="font-body text-ink whitespace-pre-line">{a.convocatoria}</p>
        </section>
      )}

      {listaPontos.length > 0 && (
        <section className="mb-10">
          <h2 className="font-title text-h3 text-warmBeige mb-3">Ordem de trabalhos</h2>
          <ol className="space-y-3">
            {listaPontos.map((p) => (
              <li key={p.id} className="flex gap-3">
                <span className="font-title text-warmBeige">{p.ordem}.</span>
                <div>
                  <p className="font-body text-ink">{p.titulo}</p>
                  {p.descricao && (
                    <p className="font-body text-sm text-oliveGray mt-1 whitespace-pre-line">
                      {p.descricao}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {a.ata && (
        <section>
          <h2 className="font-title text-h3 text-warmBeige mb-3">Ata</h2>
          <p className="font-body text-ink whitespace-pre-line">{a.ata}</p>
        </section>
      )}
    </div>
  );
}
