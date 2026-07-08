import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { sanitizarHtml } from "@/lib/sanitize";
import { AvisoForm } from "@/components/admin/aviso-form";

export default async function EditarAvisoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getCurrentUserInTenant();
  const supabase = await createClient();

  const { data: aviso } = await supabase
    .from("avisos")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", ctx!.tenant.id)
    .single();

  if (!aviso) notFound();

  return (
    <div>
      <Link
        href="/configuracao/avisos"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-4 transition-colors"
      >
        <ChevronLeft className="w-3 h-3" />
        Voltar
      </Link>
      <h1 className="font-title text-h1 text-ink mb-2">Editar aviso</h1>
      <p className="font-body text-oliveGray mb-8">
        Atualize o conteúdo do aviso.
      </p>
      {/* Conteúdo sanitizado antes de chegar ao Tiptap, que faz parse
          do HTML no browser (conteúdo antigo pode ser pré-sanitização) */}
      <AvisoForm aviso={{ ...aviso, conteudo: sanitizarHtml(aviso.conteudo) }} />
    </div>
  );
}
