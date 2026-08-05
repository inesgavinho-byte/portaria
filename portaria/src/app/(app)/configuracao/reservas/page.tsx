import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { listarEspacos, listarReservasAdmin } from "@/lib/actions/reservas";

export default async function ConfigReservasPage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");
  if (ctx.membership.role !== "admin") notFound();

  const espacos = await listarEspacos();

  const hoje = new Date();
  const daqui30dias = new Date();
  daqui30dias.setDate(daqui30dias.getDate() + 30);

  const reservas = await listarReservasAdmin(
    undefined,
    hoje.toISOString(),
    daqui30dias.toISOString()
  );

  return (
    <div>
      <Link
        href="/configuracao"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-6 transition-colors"
      >
        <ChevronLeft className="w-3 h-3" />
        Configuração
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-title text-h1 text-ink">Reservas</h1>
          <p className="font-body text-oliveGray">
            Gerir espaços comuns e reservas.
          </p>
        </div>
        <Link
          href="/configuracao/reservas/novo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo espaço
        </Link>
      </div>

      {/* Lista de espaços */}
      <div className="space-y-4 mb-12">
        {espacos.length === 0 ? (
          <p className="font-body text-sm text-oliveGray">
            Sem espaços comuns configurados.
          </p>
        ) : (
          espacos.map((e) => {
            const reservasEspaco = reservas.filter((r) => r.espaco_id === e.id);
            return (
              <div
                key={e.id}
                className="bg-paper border border-warmBeige/20 p-6"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-title text-h3 text-ink">{e.nome}</h3>
                    <p className="font-body text-sm text-oliveGray mt-1">
                      {e.descricao || "Sem descrição"}
                      {e.capacidade && ` · Capacidade: ${e.capacidade}`}
                    </p>
                    <p className="font-body text-xs text-oliveGray mt-2">
                      Duração: {e.duracao_minima_minutos}-{e.duracao_maxima_minutos}min ·
                      Antecedência: {e.antecedencia_minima_horas}h ·
                      Máx. {e.reservas_por_semana}/semana
                    </p>
                  </div>
                  <Link
                    href={`/configuracao/reservas/${e.id}/editar`}
                    className="font-body text-xs text-oliveGray hover:text-ink underline"
                  >
                    Editar
                  </Link>
                </div>

                {reservasEspaco.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-warmBeige/10">
                    <p className="font-body text-xs tracking-wider uppercase text-oliveGray mb-2">
                      Próximas reservas
                    </p>
                    <ul className="space-y-1">
                      {reservasEspaco.slice(0, 5).map((r) => (
                        <li
                          key={r.id}
                          className="font-body text-sm text-ink flex items-center justify-between"
                        >
                          <span>
                            {new Date(r.data_inicio).toLocaleDateString("pt-PT", {
                              day: "numeric",
                              month: "short",
                            })}{" "}
                            {new Date(r.data_inicio).toLocaleTimeString("pt-PT", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {" - "}
                            {new Date(r.data_fim).toLocaleTimeString("pt-PT", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span
                            className={`text-xs ${
                              r.estado === "confirmada"
                                ? "text-green-700"
                                : r.estado === "pendente"
                                ? "text-amber-700"
                                : "text-oliveGray"
                            }`}
                          >
                            {r.estado}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
