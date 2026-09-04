import { redirect } from "next/navigation";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { NotificacoesForm } from "@/components/admin/notificacoes-form";
import { LogoutButton } from "@/components/app/logout-button";

const ROLE_LABEL = {
  admin: "Administração",
  condomino: "Condómino",
  inquilino: "Inquilino",
} as const;

export default async function ContaPage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  return (
    <div className="max-w-2xl pb-10">
      <header className="mb-10 border-b border-black/[0.07] pb-8">
        <p className="doorkeeper-eyebrow mb-4">Conta</p>
        <h1 className="font-title text-[clamp(3.1rem,11vw,5rem)] font-normal leading-[0.92] text-ink">
          O teu perfil.
        </h1>
      </header>

      <dl className="divide-y divide-black/[0.07] border-y border-black/[0.07]">
        <Linha label="Email" valor={ctx.user.email ?? "—"} />
        <Linha label="Edifício" valor={ctx.tenant.nome} />
        <Linha label="Fração" valor={ctx.membership.fracao ?? "—"} />
        <Linha
          label="Perfil"
          valor={
            ROLE_LABEL[ctx.membership.role as keyof typeof ROLE_LABEL] ??
            String(ctx.membership.role)
          }
        />
      </dl>

      <section className="mt-12">
        <h2 className="mb-5 font-title text-2xl font-normal text-ink">Notificações</h2>
        <NotificacoesForm inicial={ctx.membership.notificacoes_email !== false} />
      </section>

      <div className="mt-12 border-t border-black/[0.07] pt-6">
        <LogoutButton />
      </div>
    </div>
  );
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-4 py-4 font-body text-sm">
      <dt className="text-oliveGray">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-ink">{valor}</dd>
    </div>
  );
}
