import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { guardarTemplate } from "@/lib/actions/blueprints";
import { TemplateEditor } from "@/components/admin/template-editor";
import type { Blueprint } from "@/types/database";

export default async function EditarTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");

  const supabase = await createClient();
  const { data: blueprint } = await supabase
    .from("blueprints")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (!blueprint) notFound();
  const bp = blueprint as Blueprint;

  const action = guardarTemplate.bind(null, bp.id);

  return (
    <div className="max-w-5xl">
      <Link href={`/blueprints/${bp.id}`}
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-6 transition-colors">
        <ChevronLeft className="w-3 h-3" /> Pré-visualização
      </Link>

      <div className="mb-8">
        <p className="font-body text-xs tracking-widest uppercase text-oliveGray mb-1">
          Modo de edição
        </p>
        <h1 className="font-title text-h1 text-ink">{bp.nome}</h1>
        <p className="font-body text-oliveGray mt-2">
          Edite o modelo livremente. As variáveis {`{{...}}`} são substituídas
          na pré-visualização e no PDF.
        </p>
      </div>

      <TemplateEditor
        action={action}
        initialContent={bp.conteudo_template}
        cancelHref={`/blueprints/${bp.id}`}
      />
    </div>
  );
}
