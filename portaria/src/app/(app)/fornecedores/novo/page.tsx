import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/supabase/tenant";
import { FornecedorForm } from "@/components/admin/fornecedor-form";

export default async function NovoFornecedorPage() {
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");

  return (
    <div>
      <Link href="/fornecedores"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-4 transition-colors">
        <ChevronLeft className="w-3 h-3" /> Voltar
      </Link>
      <h1 className="font-title text-h1 text-ink mb-2">Novo fornecedor</h1>
      <p className="font-body text-oliveGray mb-8">
        Depois de criar, pode anexar alvarás, certidões e seguros no detalhe.
      </p>
      <FornecedorForm />
    </div>
  );
}
