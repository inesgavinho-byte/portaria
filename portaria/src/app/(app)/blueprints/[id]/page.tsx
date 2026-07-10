import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { preencherBlueprint } from "@/lib/blueprints";
import { sanitizarHtml } from "@/lib/sanitize";
import { ExportarBlueprint } from "@/components/admin/exportar-blueprint";
import type { Blueprint, TenantPerfil } from "@/types/database";

export default async function BlueprintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");

  const supabase = await createClient();
  const [{ data: blueprint }, { data: perfil }] = await Promise.all([
    supabase.from("blueprints").select("*").eq("id", id)
      .eq("tenant_id", ctx.tenant.id).single(),
    supabase.from("tenant_perfil").select("*")
      .eq("tenant_id", ctx.tenant.id).single(),
  ]);

  if (!blueprint) notFound();
  const bp = blueprint as Blueprint;

  const hoje = new Date().toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const html = sanitizarHtml(
    preencherBlueprint(
      bp.conteudo_template,
      { nome: ctx.tenant.nome, morada: ctx.tenant.morada },
      (perfil as TenantPerfil) ?? null,
      hoje
    )
  );

  return (
    <div className="max-w-3xl">
      <Link href="/blueprints"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-6 transition-colors">
        <ChevronLeft className="w-3 h-3" /> Modelos
      </Link>

      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <p className="font-body text-xs tracking-widest uppercase text-oliveGray mb-1">
            Pré-visualização
          </p>
          <h1 className="font-title text-h1 text-ink">{bp.nome}</h1>
        </div>
        <div className="flex flex-col items-end gap-3 shrink-0">
          <Link href={`/blueprints/${bp.id}/editar`}
            className="inline-flex items-center gap-2 px-5 py-2 border border-warmBeige/40 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink hover:border-warmBeige transition-colors">
            <Pencil className="w-3.5 h-3.5" /> Editar template
          </Link>
          <ExportarBlueprint blueprintId={bp.id} />
        </div>
      </div>

      <p className="font-body text-sm text-oliveGray mb-6">
        Com os dados reais do {ctx.tenant.nome} já preenchidos.
      </p>

      {/* Documento pronto: dados do condomínio já substituídos */}
      <article className="bg-paper border border-warmBeige/30 shadow-sm p-10">
        {ctx.tenant.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ctx.tenant.logo_url} alt="" className="h-16 mb-8 object-contain" />
        )}
        <div
          className="prose prose-sm max-w-none font-body text-ink prose-headings:font-title"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </article>

      <p className="mt-4 font-body text-xs text-oliveGray">
        Os campos por preencher aparecem como linha em branco. A exportação
        gera um PDF com o logótipo e guarda-o em Documentos.
      </p>
    </div>
  );
}
