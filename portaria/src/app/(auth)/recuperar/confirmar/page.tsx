import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NovaPasswordForm } from "@/components/app/nova-password-form";

/**
 * Definição de nova palavra-passe após o link de recuperação.
 * O route handler /auth/confirm já validou o token e criou a sessão.
 */
export default async function RecuperarConfirmarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?erro=link");

  return (
    <div className="min-h-screen flex items-center justify-center bg-softCream/40 px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <p className="font-body text-xs tracking-widest uppercase text-oliveGray mb-3">
            Recuperar acesso
          </p>
          <h1 className="font-title text-h1 text-ink">Nova palavra-passe</h1>
        </div>
        <NovaPasswordForm />
      </div>
    </div>
  );
}
