import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/tenant";
import { estadoConhecimento } from "@/lib/actions/conhecimento";
import { ConselheiraConfig } from "@/components/admin/conselheira-config";

export default async function ConselheiraConfigPage() {
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");

  const estado = await estadoConhecimento();

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-title text-h1 text-ink mb-2">Conselheira</h1>
        <p className="font-body text-oliveGray">
          A base de conhecimento da Conselheira: a legislação incorporada e o
          regulamento do {ctx.tenant.nome}. É com isto que ela responde — e
          cita sempre a fonte.
        </p>
      </div>

      <ConselheiraConfig
        openai={estado.openai}
        legislacao={estado.legislacao}
        regulamento={estado.regulamento}
      />
    </div>
  );
}
