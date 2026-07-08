import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { OcorrenciaForm } from "@/components/app/ocorrencia-form";

export default async function NovaOcorrenciaPage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  return (
    <div className="max-w-2xl">
      <Link
        href="/ocorrencias"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-4 transition-colors"
      >
        <ChevronLeft className="w-3 h-3" />
        Voltar
      </Link>
      <h1 className="font-title text-h1 text-ink mb-2">Nova ocorrência</h1>
      <p className="font-body text-oliveGray mb-8">
        Descreva o problema com o máximo de detalhe. A administração será
        informada e poderá acompanhar aqui a resolução.
      </p>
      <OcorrenciaForm fracao={ctx.membership.fracao} />
    </div>
  );
}
