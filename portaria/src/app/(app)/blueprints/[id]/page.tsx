import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { preencherBlueprint } from "@/lib/blueprints";
import { CopiarTexto } from "@/components/admin/copiar-texto";
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
    supabase
      .from("blueprints")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .single(),
    supabase
      .from("tenant_perfil")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .single(),
  ]);

  if (!blueprint) notFound();
  const bp = blueprint as Blueprint;

  const hoje = new Date().toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const documento = preencherBlueprint(
    bp.conteudo_template,
    { nome: ctx.tenant.nome, morada: ctx.tenant.morada },
    (perfil as TenantPerfil) ?? null,
    hoje
  );

  return (
    <div className="max-w-3xl">
      <Link
        href="/blueprints"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-6 transition-colors"
      >
        <ChevronLeft className="w-3 h-3" /> Modelos
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="font-title text-h1 text-ink">{bp.nome}</h1>
        <div className="shrink-0">
          <CopiarTexto texto={documento} />
        </div>
      </div>

      {/* Documento pronto: dados do condomínio já substituídos */}
      <article className="bg-paper border border-warmBeige/30 shadow-sm p-10">
        {ctx.tenant.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ctx.tenant.logo_url}
            alt=""
            className="h-16 mb-8 object-contain"
          />
        )}
        <pre className="font-body text-ink whitespace-pre-wrap text-[15px] leading-relaxed">
          {documento}
        </pre>
      </article>

      <p className="mt-4 font-body text-xs text-oliveGray">
        Os campos por preencher (ex.: número e data de assembleia, pontos da
        ordem de trabalhos) aparecem como linha em branco. A geração direta
        para Google Docs fica para quando a integração estiver ativa.
      </p>
    </div>
  );
}
