import { LoginForm } from "@/components/app/login-form";
import { getCurrentTenant } from "@/lib/supabase/tenant";
import { DoorKeeperWordmark } from "@/components/brand/doorkeeper-marks";

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
    <div className="grid min-h-screen bg-softCream lg:grid-cols-[minmax(0,0.9fr)_minmax(30rem,1.1fr)]">
      <div className="hidden bg-doorkeeperGreen p-12 lg:flex lg:flex-col lg:justify-between">
        <DoorKeeperWordmark tone="green" priority className="h-40 w-64 object-contain object-left" />
        <p className="max-w-md font-title text-5xl font-normal leading-[0.95] text-white">
          A porta de entrada para um edifício bem gerido.
        </p>
      </div>
      <div className="flex items-center justify-center px-6 py-14 sm:px-12">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-soft sm:p-10">
        <DoorKeeperWordmark tone="light" priority className="mx-auto mb-9 h-24 w-40 object-contain" />
        <div className="mb-9 text-center">
          <p className="mb-3 font-body text-xs font-semibold uppercase tracking-[0.15em] text-doorkeeperTurquoise">
            Área reservada
          </p>
          <h1 className="font-title text-4xl font-normal text-ink">
            {tenant?.nome ?? "Bem-vindo"}
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
    </div>
  );
}
