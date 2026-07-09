import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { ContratoForm } from "@/components/admin/contrato-form";
import type { Contrato } from "@/types/database";

export default async function EditarContratoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAdmin();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const [{ data: contrato }, { data: contactos }] = await Promise.all([
    supabase.from("contratos").select("*").eq("id", id).eq("tenant_id", ctx.tenant.id).single(),
    supabase.from("contactos").select("id, nome").eq("tenant_id", ctx.tenant.id).order("nome"),
  ]);

  if (!contrato) notFound();

  return (
    <div>
      <Link href="/contratos"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-4 transition-colors">
        <ChevronLeft className="w-3 h-3" /> Voltar
      </Link>
      <h1 className="font-title text-h1 text-ink mb-8">Editar contrato</h1>
      <ContratoForm contrato={contrato as Contrato} contactos={contactos ?? []} />
    </div>
  );
}
