import { redirect } from "next/navigation";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { regulamentoDoTenant } from "@/lib/ai/conhecimento-consultas";
import { DownloadRegulamento } from "@/components/condomino/download-regulamento";

export default async function RegulamentoPage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  const { texto, temPdf } = await regulamentoDoTenant();

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-title text-h1 text-ink mb-2">Regulamento do condomínio</h1>
          <p className="font-body text-oliveGray">{ctx.tenant.nome}</p>
        </div>
        {texto && temPdf && <DownloadRegulamento />}
      </div>

      {!texto ? (
        <div className="bg-paper border border-warmBeige/20 p-12 text-center">
          <p className="font-body text-oliveGray">
            Regulamento não disponível. A administração ainda não o carregou.
          </p>
        </div>
      ) : (
        <article className="bg-paper border border-warmBeige/30 shadow-sm p-10">
          <div className="font-body text-ink whitespace-pre-line leading-relaxed">
            {texto}
          </div>
        </article>
      )}
    </div>
  );
}
