import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/tenant";
import { IntegracoesView } from "@/components/admin/integracoes-view";

export default async function IntegracoesPage() {
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="font-title text-h1 text-ink mb-2">Integrações</h1>
        <p className="font-body text-oliveGray">
          Ferramentas e serviços ligados ao condomínio.
        </p>
      </div>
      <IntegracoesView />
    </div>
  );
}
