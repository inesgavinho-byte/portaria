import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { FracaoForm } from "@/components/admin/fracao-form";
import type { Fracao } from "@/types/database";

export default async function EditarFracaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAdmin();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: fracao } = await supabase
    .from("fracoes")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (!fracao) notFound();

  return (
    <div className="max-w-3xl">
      <Link
        href="/configuracao/fracoes"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-4 transition-colors"
      >
        <ChevronLeft className="w-3 h-3" />
        Voltar
      </Link>
      <h1 className="font-title text-h1 text-ink mb-2">Editar fração</h1>
      <p className="font-body text-oliveGray mb-8">{fracao.codigo}</p>
      <FracaoForm fracao={fracao as Fracao} />
    </div>
  );
}
