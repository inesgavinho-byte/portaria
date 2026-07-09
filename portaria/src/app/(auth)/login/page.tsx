import { LoginForm } from "@/components/app/login-form";
import { getCurrentTenant } from "@/lib/supabase/tenant";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const [{ erro }, tenant] = await Promise.all([
    searchParams,
    getCurrentTenant(),
  ]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-softCream/40 px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <p className="font-body text-xs tracking-widest uppercase text-oliveGray mb-3">
            Área reservada
          </p>
          <h1 className="font-title text-h1 text-ink">
            {tenant?.nome ?? "Entrar"}
          </h1>
        </div>
        {erro === "link" && (
          <div className="border-l-4 border-alert bg-alert/5 px-4 py-3 mb-6">
            <p className="font-body text-sm text-alert">
              O link já não é válido. Peça um novo em "Esqueceu a
              palavra-passe?" ou contacte a administração.
            </p>
          </div>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
