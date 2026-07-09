import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { reunirCalendario, tipoLabel } from "@/lib/calendario";

export default async function CalendarioPage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  const eventos = await reunirCalendario(ctx.tenant.id);

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="font-title text-h1 text-ink mb-2">Calendário</h1>
        <p className="font-body text-oliveGray">
          As obrigações futuras do {ctx.tenant.nome}.
        </p>
      </div>

      {eventos.length === 0 ? (
        <div className="bg-paper border border-warmBeige/20 p-12 text-center">
          <p className="font-body text-oliveGray">
            Não há datas futuras registadas. Agende uma assembleia ou registe
            os contratos e o seguro para as ver aqui.
          </p>
        </div>
      ) : (
        <div className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
          {eventos.map((e, i) => (
            <Link key={i} href={e.href}
              className="group flex items-center gap-4 p-4 hover:bg-softCream/40 transition-colors">
              <div className="w-28 shrink-0">
                <p className="font-body text-sm text-ink">
                  {new Date(e.data).toLocaleDateString("pt-PT", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body text-xs tracking-widest uppercase text-oliveGray">
                  {tipoLabel(e.tipo)}
                </p>
                <p className="font-body text-ink truncate group-hover:text-oliveGray transition-colors">
                  {e.titulo}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
