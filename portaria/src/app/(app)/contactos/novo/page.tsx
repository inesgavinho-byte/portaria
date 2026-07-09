import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/supabase/tenant";
import { ContactoForm } from "@/components/admin/contacto-form";

export default async function NovoContactoPage() {
  const ctx = await requireAdmin();
  if (!ctx) redirect("/login");

  return (
    <div>
      <Link href="/contactos"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-4 transition-colors">
        <ChevronLeft className="w-3 h-3" /> Voltar
      </Link>
      <h1 className="font-title text-h1 text-ink mb-2">Novo contacto</h1>
      <p className="font-body text-oliveGray mb-8">
        Registe um fornecedor, empresa ou pessoa.
      </p>
      <ContactoForm />
    </div>
  );
}
