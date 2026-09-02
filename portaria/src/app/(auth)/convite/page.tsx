import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/supabase/tenant";
import { NovaPasswordForm } from "@/components/app/nova-password-form";

/**
 * Aceitação de convite: o convidado chega aqui autenticado (via
 * /auth/confirm) e define a palavra-passe. S11: os convites já não são
 * aceites aqui — no passo seguinte (/convite/pendentes) aceita ou recusa
 * cada convite explicitamente. Vive fora do grupo (app) porque, neste
 * momento, o utilizador ainda não é membro de nenhum tenant.
 */
export default async function ConvitePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?erro=link");

  const tenant = await getCurrentTenant();

  return (
    <div className="min-h-screen flex items-center justify-center bg-softCream/40 px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <p className="font-body text-xs tracking-widest uppercase text-oliveGray mb-3">
            Bem-vindo{tenant ? ` ao ${tenant.nome}` : ""}
          </p>
          <h1 className="font-title text-h1 text-ink">
            Defina a sua palavra-passe
          </h1>
          <p className="font-body text-sm text-oliveGray mt-4">
            Foi convidado para a plataforma do condomínio. Escolha uma
            palavra-passe para concluir o registo.
          </p>
        </div>
        <NovaPasswordForm />
      </div>
    </div>
  );
}
