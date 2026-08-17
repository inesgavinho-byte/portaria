"use client";

import { useTransition } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, Landmark, Repeat2 } from "lucide-react";
import type { AlertaOperacional, EventoCalendarioAdministrativo } from "@/types/database";
import { reconhecerAlertaOperacional } from "@/lib/actions/financeiro";

function formatarData(data: string) {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${data}T12:00:00`));
}

function iconeEvento(tipo: EventoCalendarioAdministrativo["tipo"]) {
  if (tipo === "despesa") return <Landmark className="h-4 w-4" />;
  if (tipo === "obrigacao") return <Repeat2 className="h-4 w-4" />;
  return <AlertTriangle className="h-4 w-4" />;
}

function classeSeveridade(severidade: string) {
  return {
    baixa: "border-slate-200 bg-slate-50",
    normal: "border-amber-200 bg-amber-50",
    alta: "border-orange-200 bg-orange-50",
    critica: "border-red-200 bg-red-50",
  }[severidade] ?? "border-slate-200 bg-slate-50";
}

export function CalendarioAdministrativo({
  eventos,
  alertas,
}: {
  eventos: EventoCalendarioAdministrativo[];
  alertas: AlertaOperacional[];
}) {
  const [pending, startTransition] = useTransition();

  function reconhecer(alertaId: string) {
    startTransition(async () => {
      await reconhecerAlertaOperacional(alertaId);
    });
  }

  return (
    <div className="space-y-6">
      <section className="border border-warmBeige/30 bg-paper p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-title text-lg text-ink">Agenda administrativa</h2>
            <p className="mt-1 font-body text-sm text-oliveGray">Vencimentos de despesas e obrigações. Os dados vêm dos registos financeiros; não existe duplicação de eventos.</p>
          </div>
          <CalendarDays className="h-6 w-6 text-oliveGray" />
        </div>

        {eventos.length === 0 ? (
          <p className="py-8 text-center font-body text-sm text-oliveGray">Não existem vencimentos agendados.</p>
        ) : (
          <div className="space-y-2">
            {eventos.map((evento) => (
              <div key={evento.id} className={`flex items-center gap-3 border p-3 ${classeSeveridade(evento.severidade)}`}>
                <div className="text-oliveGray">{iconeEvento(evento.tipo)}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-body text-sm font-medium text-ink">{evento.titulo}</p>
                  {evento.descricao && <p className="mt-0.5 truncate font-body text-xs text-oliveGray">{evento.descricao}</p>}
                </div>
                <div className="text-right">
                  <p className="font-body text-sm text-ink">{formatarData(evento.data)}</p>
                  <p className="font-body text-xs capitalize text-oliveGray">{evento.estado.replaceAll("_", " ")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="border border-warmBeige/30 bg-paper p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-title text-lg text-ink">Alertas por tratar</h2>
            <p className="mt-1 font-body text-sm text-oliveGray">Gerados pela rotina diária exclusivamente para administradores. Reconhecer um alerta não altera a despesa nem a obrigação de origem.</p>
          </div>
          <AlertTriangle className="h-6 w-6 text-amber-600" />
        </div>

        {alertas.length === 0 ? (
          <div className="flex items-center gap-2 py-8 justify-center font-body text-sm text-oliveGray"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Não existem alertas pendentes.</div>
        ) : (
          <div className="space-y-2">
            {alertas.map((alerta) => (
              <div key={alerta.id} className={`flex items-center gap-3 border p-3 ${classeSeveridade(alerta.severidade)}`}>
                <AlertTriangle className="h-4 w-4 text-oliveGray" />
                <div className="min-w-0 flex-1">
                  <p className="font-body text-sm font-medium text-ink">{alerta.titulo}</p>
                  {alerta.descricao && <p className="mt-0.5 font-body text-xs text-oliveGray">{alerta.descricao}</p>}
                </div>
                <button disabled={pending} onClick={() => reconhecer(alerta.id)} className="border border-warmBeige/50 px-3 py-1.5 font-body text-xs text-ink hover:bg-warmBeige/10 disabled:opacity-50">Reconhecer</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
