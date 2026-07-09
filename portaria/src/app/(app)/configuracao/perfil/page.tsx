import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { PerfilForm } from "@/components/admin/perfil-form";
import type { TenantPerfil } from "@/types/database";

export default async function PerfilPage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: perfil } = await supabase
    .from("tenant_perfil")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .single();

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-title text-h1 text-ink mb-2">
          Perfil do condomínio
        </h1>
        <p className="font-body text-oliveGray">
          Os dados do {ctx.tenant.nome}. Alterações refletem-se de imediato
          nas páginas públicas e na plataforma.
        </p>
      </div>

      <PerfilForm tenant={ctx.tenant} perfil={(perfil as TenantPerfil) ?? null} />

      {/* Documentos institucionais — a memória documental vive nos
          Documentos; aqui damos apenas o atalho, sem duplicar sistema */}
      <section className="mt-12 pt-8 border-t border-warmBeige/20">
        <h2 className="font-title text-h3 text-warmBeige mb-4">
          Documentos institucionais
        </h2>
        <p className="font-body text-sm text-oliveGray mb-6">
          O regulamento, a apólice, a escritura e demais documentos do
          condomínio vivem na biblioteca de documentos.
        </p>
        <Link
          href="/configuracao/documentos"
          className="inline-flex items-center gap-3 border border-warmBeige/40 px-6 py-4 hover:border-warmBeige transition-colors group"
        >
          <FileText className="w-5 h-5 text-warmBeige" />
          <span className="font-body text-sm text-ink">
            Gerir documentos do condomínio
          </span>
          <ArrowRight className="w-4 h-4 text-oliveGray transition-transform group-hover:translate-x-1" />
        </Link>
      </section>
    </div>
  );
}
