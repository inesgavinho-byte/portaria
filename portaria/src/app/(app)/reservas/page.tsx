import { redirect } from "next/navigation";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { listarEspacos, listarReservas, listarMinhasReservas } from "@/lib/actions/reservas";
import { ReservasCliente } from "@/components/app/reservas-cliente";

export default async function ReservasPage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  const espacos = await listarEspacos();

  // Buscar reservas dos próximos 30 dias para todos os espaços
  const hoje = new Date();
  const daqui30dias = new Date();
  daqui30dias.setDate(daqui30dias.getDate() + 30);

  const reservas = await listarReservas(
    undefined,
    hoje.toISOString(),
    daqui30dias.toISOString()
  );

  const minhasReservas = await listarMinhasReservas();

  return (
    <div>
      <h1 className="font-title text-h1 text-ink mb-2">Reservas</h1>
      <p className="font-body text-oliveGray mb-8">
        Espaços comuns do condomínio.
      </p>

      <ReservasCliente
        espacos={espacos}
        reservas={reservas}
        minhasReservas={minhasReservas}
        userId={ctx.user.id}
      />
    </div>
  );
}
