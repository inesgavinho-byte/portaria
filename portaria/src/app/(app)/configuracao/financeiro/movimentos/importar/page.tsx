import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/tenant";
import { ImportarExtratoForm } from "@/components/admin/importar-extrato-form";

export const metadata = { title: "Importar extrato — Portaria" };

export default async function ImportarExtratoPage() {
  const ctx = await requireAdmin();
  if (!ctx) redirect("/inicio");

  return (
    <div className="max-w-2xl">
      <div className="mb-7">
        <p className="mb-1 font-body text-xs font-semibold uppercase tracking-[0.12em] text-britishGreen">Financeiro</p>
        <h1 className="font-title text-h1 text-ink">Importar extrato bancário</h1>
        <p className="mt-2 max-w-xl font-body text-sm leading-6 text-oliveGray">
          Lê o ficheiro XLSX exportado do Millennium BCP e cria os movimentos bancários como prova de saídas e entradas
          reais. A importação é idempotente: reimportar o mesmo ficheiro não duplica nada.
        </p>
      </div>

      <ImportarExtratoForm />
    </div>
  );
}
