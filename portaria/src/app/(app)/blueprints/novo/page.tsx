import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/supabase/tenant";
import { criarBlueprint } from "@/lib/actions/blueprints";
import { TemplateEditor } from "@/components/admin/template-editor";

export default async function NovoBlueprintPage() {
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");

  return (
    <div className="max-w-5xl">
      <Link href="/blueprints"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-6 transition-colors">
        <ChevronLeft className="w-3 h-3" /> Modelos
      </Link>

      <div className="mb-8">
        <h1 className="font-title text-h1 text-ink mb-2">Novo modelo</h1>
        <p className="font-body text-oliveGray">
          Escreva o modelo do zero. Use as variáveis à direita para inserir os
          dados do condomínio, que são substituídos ao pré-visualizar.
        </p>
      </div>

      <TemplateEditor
        action={criarBlueprint}
        novo
        cancelHref="/blueprints"
        guardarLabel="Criar modelo"
      />
    </div>
  );
}
