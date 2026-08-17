import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/tenant";
import { ContribuicaoExtraordinariaForm } from "@/components/admin/contribuicao-extraordinaria-form";

export default async function NovaContribuicaoExtraordinariaPage() {
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");

  return (
    <div>
      <Link href="/contribuicoes-extraordinarias" className="inline-flex items-center gap-1.5 mb-6 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink"><ChevronLeft className="w-3.5 h-3.5" /> Contribuições extraordinárias</Link>
      <div className="mb-8"><p className="font-body text-xs tracking-[0.18em] uppercase text-warmBeige mb-2">Financeiro administrativo</p><h1 className="font-title text-h1 text-ink mb-2">Nova contribuição extraordinária</h1><p className="font-body text-oliveGray max-w-2xl">Registe uma obra ou chamada de capital sem misturar os respetivos valores com quotas ordinárias. A distribuição de cada prestação respeita a permilagem registada nas frações.</p></div>
      <ContribuicaoExtraordinariaForm />
    </div>
  );
}
