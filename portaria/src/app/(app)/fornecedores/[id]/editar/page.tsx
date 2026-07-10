import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { FornecedorForm } from "@/components/admin/fornecedor-form";
import type { Fornecedor } from "@/types/database";

export default async function EditarFornecedorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");

  const supabase = await createClient();
  const { data: fornecedor } = await supabase
    .from("fornecedores")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (!fornecedor) notFound();

  return (
    <div>
      <Link href={`/fornecedores/${id}`}
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-4 transition-colors">
        <ChevronLeft className="w-3 h-3" /> Voltar
      </Link>
      <h1 className="font-title text-h1 text-ink mb-8">Editar fornecedor</h1>
      <FornecedorForm fornecedor={fornecedor as Fornecedor} />
    </div>
  );
}
