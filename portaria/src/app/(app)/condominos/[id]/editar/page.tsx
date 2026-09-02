import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { PessoaForm } from "@/components/admin/pessoa-form";
import type { Pessoa } from "@/types/database";

export default async function EditarPessoaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAdmin();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: pessoa } = await supabase
    .from("pessoas")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (!pessoa) notFound();

  return (
    <div className="max-w-3xl">
      <Link
        href={`/condominos/${id}`}
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-4 transition-colors"
      >
        <ChevronLeft className="w-3 h-3" />
        Voltar à ficha
      </Link>
      <h1 className="font-title text-h1 text-ink mb-2">Editar condómino</h1>
      <p className="font-body text-oliveGray mb-8">{pessoa.nome}</p>
      <PessoaForm pessoa={pessoa as Pessoa} />
    </div>
  );
}
