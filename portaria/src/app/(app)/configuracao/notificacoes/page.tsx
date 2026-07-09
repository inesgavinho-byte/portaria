import { redirect } from "next/navigation";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { NotificacoesForm } from "@/components/admin/notificacoes-form";

export default async function NotificacoesPage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  // A coluna tem default true; se for null (linha antiga) tratamos como sim.
  const inicial = ctx.membership.notificacoes_email !== false;

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-title text-h1 text-ink mb-2">Notificações</h1>
        <p className="font-body text-oliveGray">
          A sua preferência de email para o {ctx.tenant.nome}. É pessoal — não
          afeta os outros membros.
        </p>
      </div>

      <NotificacoesForm inicial={inicial} />
    </div>
  );
}
