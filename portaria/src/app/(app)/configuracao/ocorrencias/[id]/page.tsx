import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { getOcorrenciaDetalhe } from "@/lib/supabase/ocorrencias";
import { OcorrenciaDetalhe } from "@/components/app/ocorrencia-detalhe";
import { OcorrenciaAdminControls } from "@/components/admin/ocorrencia-admin-controls";
import { SugestaoIA } from "@/components/admin/sugestao-ia";

export default async function ConfigOcorrenciaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  const detalhe = await getOcorrenciaDetalhe(id, ctx.tenant.id);
  if (!detalhe) notFound();

  return (
    <div>
      <Link
        href="/configuracao/ocorrencias"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-6 transition-colors"
      >
        <ChevronLeft className="w-3 h-3" />
        Todas as ocorrências
      </Link>

      <OcorrenciaDetalhe
        ocorrencia={detalhe.ocorrencia}
        eventos={detalhe.eventos}
        fotografias={detalhe.fotografias}
        podeAdicionarFotografias
      >
        <SugestaoIA ocorrenciaId={id} />
        <section className="bg-paper border border-warmBeige/20 p-6">
          <OcorrenciaAdminControls ocorrencia={detalhe.ocorrencia} />
        </section>
      </OcorrenciaDetalhe>
    </div>
  );
}
