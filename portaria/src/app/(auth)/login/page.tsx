import { LoginForm } from "@/components/app/login-form";
import { getCurrentTenant } from "@/lib/supabase/tenant";

export default async function LoginPage() {
  const tenant = await getCurrentTenant();

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
        <LoginForm />
      </div>
    </div>
  );
}
