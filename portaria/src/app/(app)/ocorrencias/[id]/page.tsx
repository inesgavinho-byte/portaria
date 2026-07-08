import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { getOcorrenciaDetalhe } from "@/lib/supabase/ocorrencias";
import { OcorrenciaDetalhe } from "@/components/app/ocorrencia-detalhe";

export default async function OcorrenciaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fotos?: string }>;
}) {
  const { id } = await params;
  const { fotos } = await searchParams;
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  const detalhe = await getOcorrenciaDetalhe(id, ctx.tenant.id);
  if (!detalhe) notFound();

  const podeAdicionar =
    detalhe.ocorrencia.criado_por === ctx.user.id ||
    ctx.membership.role === "admin";

  return (
    <div>
      <Link
        href="/ocorrencias"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-6 transition-colors"
      >
        <ChevronLeft className="w-3 h-3" />
        As minhas ocorrências
      </Link>

      {fotos === "erro" && (
        <div className="border-l-4 border-alert bg-alert/5 px-4 py-3 mb-8">
          <p className="font-body text-sm text-alert">
            A ocorrência foi criada, mas houve um problema ao carregar as
            fotografias. Pode adicioná-las abaixo.
          </p>
        </div>
      )}

      <OcorrenciaDetalhe
        ocorrencia={detalhe.ocorrencia}
        eventos={detalhe.eventos}
        fotografias={detalhe.fotografias}
        podeAdicionarFotografias={podeAdicionar}
      />
    </div>
  );
}
