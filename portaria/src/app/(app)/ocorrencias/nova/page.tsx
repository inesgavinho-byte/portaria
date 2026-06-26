import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/supabase/tenant";
import { OcorrenciaForm } from "@/components/app/ocorrencia-form";

export const metadata = { title: "Reportar ocorrência" };

export default async function NovaOcorrenciaPage() {
  const supabase = await createClient();
  const tenant = await getCurrentTenant();

  const { data: fracoes } = await supabase
    .from("fracoes")
    .select("id, identificacao")
    .eq("tenant_id", tenant!.id)
    .order("identificacao");

  return (
    <div className="max-w-2xl">
      <Link
        href="/ocorrencias"
        className="inline-flex items-center gap-2 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar às ocorrências
      </Link>

      <h1 className="font-title text-h1 text-ink mb-2">Reportar ocorrência</h1>
      <p className="font-body text-oliveGray mb-10">
        Descreva o assunto. A administração será notificada e poderá acompanhar
        o estado.
      </p>

      <OcorrenciaForm fracoes={fracoes ?? []} />
    </div>
  );
}
