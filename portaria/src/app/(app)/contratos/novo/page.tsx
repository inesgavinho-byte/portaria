import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { ContratoForm } from "@/components/admin/contrato-form";

export default async function NovoContratoPage() {
  const ctx = await requireAdmin();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: contactos } = await supabase
    .from("contactos")
    .select("id, nome")
    .eq("tenant_id", ctx.tenant.id)
    .order("nome", { ascending: true });

  return (
    <div>
      <Link href="/contratos"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-4 transition-colors">
        <ChevronLeft className="w-3 h-3" /> Voltar
      </Link>
      <h1 className="font-title text-h1 text-ink mb-2">Novo contrato</h1>
      <p className="font-body text-oliveGray mb-8">Registe um contrato do condomínio.</p>
      <ContratoForm contactos={contactos ?? []} />
    </div>
  );
}
