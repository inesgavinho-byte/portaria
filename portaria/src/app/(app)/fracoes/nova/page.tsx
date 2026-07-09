import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/supabase/tenant";
import { FracaoForm } from "@/components/admin/fracao-form";

export default async function NovaFracaoPage() {
  const ctx = await requireAdmin();
  if (!ctx) redirect("/login");

  return (
    <div className="max-w-3xl">
      <Link
        href="/fracoes"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-4 transition-colors"
      >
        <ChevronLeft className="w-3 h-3" />
        Voltar
      </Link>
      <h1 className="font-title text-h1 text-ink mb-2">Nova fração</h1>
      <p className="font-body text-oliveGray mb-8">
        Registe uma fração do condomínio.
      </p>
      <FracaoForm />
    </div>
  );
}
