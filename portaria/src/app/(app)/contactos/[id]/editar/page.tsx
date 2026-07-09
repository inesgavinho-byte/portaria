import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { ContactoForm } from "@/components/admin/contacto-form";
import type { Contacto } from "@/types/database";

export default async function EditarContactoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAdmin();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: contacto } = await supabase
    .from("contactos")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (!contacto) notFound();

  return (
    <div>
      <Link href="/contactos"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-4 transition-colors">
        <ChevronLeft className="w-3 h-3" /> Voltar
      </Link>
      <h1 className="font-title text-h1 text-ink mb-8">Editar contacto</h1>
      <ContactoForm contacto={contacto as Contacto} />
    </div>
  );
}
