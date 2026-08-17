import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { montarDocumentoHtml, carregarLogoDataUri } from "@/lib/pdf/documento-blueprint";
import { ExportarBlueprint } from "@/components/admin/exportar-blueprint";
import type { Blueprint, TenantPerfil } from "@/types/database";

const inputClass =
  "w-full px-3 py-2 border border-warmBeige/40 bg-paper font-body text-sm text-ink focus:outline-none focus:border-warmBeige";
const labelClass =
  "block font-body text-[11px] tracking-widest uppercase text-oliveGray mb-1.5";

export default async function BlueprintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ numero?: string; assunto?: string }>;
}) {
  const { id } = await params;
  const { numero: numeroRaw, assunto: assuntoRaw } = await searchParams;
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");

  const numero = (numeroRaw ?? "").trim() || null;
  const assunto = (assuntoRaw ?? "").trim() || null;

  const supabase = await createClient();
  const [{ data: blueprint }, { data: perfil }] = await Promise.all([
    supabase.from("blueprints").select("*").eq("id", id)
      .eq("tenant_id", ctx.tenant.id).single(),
    supabase.from("tenant_perfil").select("*")
      .eq("tenant_id", ctx.tenant.id).single(),
  ]);

  if (!blueprint) notFound();
  const bp = blueprint as Blueprint;

  const agora = new Date();
  const hoje = agora.toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const logoDataUri = await carregarLogoDataUri(ctx.tenant.logo_url);
  const html = montarDocumentoHtml({
    tenant: ctx.tenant,
    perfil: (perfil as TenantPerfil) ?? null,
    bodyTemplate: bp.conteudo_template,
    hoje,
    ano: agora.getFullYear(),
    numero,
    assunto,
    logoDataUri,
  });

  return (
    <div className="max-w-3xl">
      <Link href="/blueprints"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-6 transition-colors">
        <ChevronLeft className="w-3 h-3" /> Modelos
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="font-body text-xs tracking-widest uppercase text-oliveGray mb-1">
            Pré-visualização
          </p>
          <h1 className="font-title text-h1 text-ink">{bp.nome}</h1>
        </div>
        <div className="flex flex-col items-end gap-3 shrink-0">
          <Link href={`/blueprints/${bp.id}/assistente`}
            className="inline-flex items-center gap-2 bg-ink px-5 py-2 font-body text-xs tracking-widest uppercase text-paper hover:bg-oliveGray transition-colors">
            <span aria-hidden="true">✦</span> Elaborar com IA
          </Link>
          <Link href={`/blueprints/${bp.id}/editar`}
            className="inline-flex items-center gap-2 px-5 py-2 border border-warmBeige/40 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink hover:border-warmBeige transition-colors">
            <Pencil className="w-3.5 h-3.5" /> Editar template
          </Link>
          <ExportarBlueprint blueprintId={bp.id} numero={numero} assunto={assunto} />
        </div>
      </div>

      {/* Dados variáveis desta emissão (GET → recompõe a pré-visualização) */}
      <form method="get" className="grid sm:grid-cols-[8rem_1fr_auto] gap-3 items-end mb-6 bg-softCream/30 border border-warmBeige/20 p-4">
        <div>
          <label htmlFor="numero" className={labelClass}>N.º da circular</label>
          <input id="numero" name="numero" defaultValue={numero ?? ""} placeholder="1" className={inputClass} />
        </div>
        <div>
          <label htmlFor="assunto" className={labelClass}>Assunto</label>
          <input id="assunto" name="assunto" defaultValue={assunto ?? ""} placeholder="Quotizações do 3.º trimestre de 2026" className={inputClass} />
        </div>
        <button type="submit"
          className="px-5 py-2 border border-warmBeige/40 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink hover:border-warmBeige transition-colors">
          Atualizar
        </button>
      </form>

      {/* Documento composto: o mesmo HTML que gera o PDF */}
      <article className="bg-paper border border-warmBeige/30 shadow-sm p-12">
        <div
          className="prose prose-sm max-w-none font-body text-ink prose-headings:font-title"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </article>

      <p className="mt-4 font-body text-xs text-oliveGray">
        O cabeçalho, assinaturas e rodapé são gerados a partir dos dados do
        condomínio. Exportar gera este documento em PDF e guarda-o em Documentos.
      </p>
    </div>
  );
}
