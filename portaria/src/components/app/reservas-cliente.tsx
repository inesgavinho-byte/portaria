"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  Users,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  AlertCircle,
} from "lucide-react";
import { criarReserva, cancelarReserva, type OcupacaoReserva } from "@/lib/actions/reservas";
import type { EspacoComum, Reserva } from "@/types/database";

interface ReservasClienteProps {
  // S9: a lista geral só traz disponibilidade (sem dados pessoais de terceiros).
  espacos: EspacoComum[];
  reservas: OcupacaoReserva[];
  minhasReservas: Reserva[];
  userId: string;
}

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function ReservasCliente({
  espacos,
  reservas,
  minhasReservas,
  userId,
}: ReservasClienteProps) {
  const [espacoAtivo, setEspacoAtivo] = useState<EspacoComum | null>(
    espacos[0] ?? null
  );
  const [dataRef, setDataRef] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [mostrarForm, setMostrarForm] = useState(false);
  const [slotSelecionado, setSlotSelecionado] = useState<{
    data: string;
    hora: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!espacoAtivo) {
    return (
      <div className="text-center py-16">
        <MapPin className="w-8 h-8 text-oliveGray/40 mx-auto mb-3" />
        <p className="font-body text-sm text-oliveGray">
          Sem espaços comuns disponíveis.
        </p>
      </div>
    );
  }

  // Gerar slots de 1h para o espaço ativo no dia de referência
  const slots = gerarSlots(espacoAtivo, dataRef);

  // Filtrar reservas deste espaço neste dia
  const reservasDia = reservas.filter((r) => {
    if (r.espaco_id !== espacoAtivo.id) return false;
    const d = new Date(r.data_inicio);
    return (
      d.getFullYear() === dataRef.getFullYear() &&
      d.getMonth() === dataRef.getMonth() &&
      d.getDate() === dataRef.getDate()
    );
  });

  const minhasReservasDia = minhasReservas.filter((r) => {
    const d = new Date(r.data_inicio);
    return (
      r.espaco_id === espacoAtivo.id &&
      d.getFullYear() === dataRef.getFullYear() &&
      d.getMonth() === dataRef.getMonth() &&
      d.getDate() === dataRef.getDate() &&
      r.estado !== "cancelada"
    );
  });

  const minhaReservaNoDia = minhasReservasDia[0];

  function handleReservar(slotHora: string) {
    setSlotSelecionado({
      data: dataRef.toISOString().split("T")[0],
      hora: slotHora,
    });
    setMostrarForm(true);
    setError(null);
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    if (!slotSelecionado || !espacoAtivo) return;

    const [h, m] = slotSelecionado.hora.split(":").map(Number);
    const inicio = new Date(dataRef);
    inicio.setHours(h, m, 0, 0);

    const duracao = parseInt(formData.get("duracao") as string) || 60;
    const fim = new Date(inicio.getTime() + duracao * 60000);

    startTransition(async () => {
      const result = await criarReserva({
        espaco_id: espacoAtivo.id,
        data_inicio: inicio.toISOString(),
        data_fim: fim.toISOString(),
        motivo: (formData.get("motivo") as string) || undefined,
        num_pessoas: parseInt(formData.get("num_pessoas") as string) || undefined,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setMostrarForm(false);
        setSlotSelecionado(null);
        window.location.reload();
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Tabs de espaços */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {espacos.map((e) => (
          <button
            key={e.id}
            onClick={() => {
              setEspacoAtivo(e);
              setMostrarForm(false);
              setError(null);
            }}
            className={`shrink-0 px-4 py-2 font-body text-sm border transition-colors ${
              espacoAtivo.id === e.id
                ? "bg-ink text-paper border-ink"
                : "bg-paper text-oliveGray border-warmBeige/30 hover:border-ink"
            }`}
          >
            {e.nome}
          </button>
        ))}
      </div>

      {/* Navegação de data */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            const d = new Date(dataRef);
            d.setDate(d.getDate() - 1);
            setDataRef(d);
          }}
          className="p-2 text-oliveGray hover:text-ink"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="font-title text-h3 text-ink">
            {DIAS[dataRef.getDay()]}, {dataRef.getDate()}{" "}
            {dataRef.toLocaleDateString("pt-PT", { month: "long" })}
          </p>
          <p className="font-body text-xs text-oliveGray">
            {espacoAtivo.descricao}
            {espacoAtivo.capacidade && ` · Capacidade: ${espacoAtivo.capacidade}`}
          </p>
        </div>
        <button
          onClick={() => {
            const d = new Date(dataRef);
            d.setDate(d.getDate() + 1);
            setDataRef(d);
          }}
          className="p-2 text-oliveGray hover:text-ink"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Minha reserva no dia */}
      {minhaReservaNoDia && (
        <div className="bg-cream/30 border border-warmBeige/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-sm text-ink">
                A tua reserva:{" "}
                <strong>
                  {new Date(minhaReservaNoDia.data_inicio).toLocaleTimeString(
                    "pt-PT",
                    { hour: "2-digit", minute: "2-digit" }
                  )}
                  {" - "}
                  {new Date(minhaReservaNoDia.data_fim).toLocaleTimeString(
                    "pt-PT",
                    { hour: "2-digit", minute: "2-digit" }
                  )}
                </strong>
              </p>
              {minhaReservaNoDia.motivo && (
                <p className="font-body text-xs text-oliveGray mt-1">
                  {minhaReservaNoDia.motivo}
                </p>
              )}
            </div>
            <form
              action={() =>
                startTransition(async () => {
                  await cancelarReserva(minhaReservaNoDia.id);
                  window.location.reload();
                })
              }
            >
              <button
                type="submit"
                disabled={isPending}
                className="text-xs font-body text-alert hover:underline disabled:opacity-50"
              >
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Grid de slots */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {slots.map((slot) => {
          const ocupado = reservasDia.some((r) => {
            const ri = new Date(r.data_inicio);
            const rf = new Date(r.data_fim);
            const [sh, sm] = slot.hora.split(":").map(Number);
            const slotTime = sh * 60 + sm;
            const riTime = ri.getHours() * 60 + ri.getMinutes();
            const rfTime = rf.getHours() * 60 + rf.getMinutes();
            return slotTime >= riTime && slotTime < rfTime;
          });

          // S9: "minha" deriva das MINHAS reservas (a lista geral já não traz
          // user_id de terceiros).
          const minha = minhasReservasDia.some(
            (r) =>
              new Date(r.data_inicio).getHours() ===
              parseInt(slot.hora.split(":")[0])
          );

          return (
            <button
              key={slot.hora}
              onClick={() => !ocupado && !minhaReservaNoDia && handleReservar(slot.hora)}
              disabled={ocupado || !!minhaReservaNoDia}
              className={`p-3 text-center border transition-colors ${
                ocupado
                  ? "bg-warmBeige/10 border-warmBeige/20 text-oliveGray/50 cursor-not-allowed"
                  : minha
                  ? "bg-cream/50 border-oliveGray/30 text-ink"
                  : "bg-paper border-warmBeige/30 text-ink hover:border-ink"
              }`}
            >
              <span className="font-body text-sm">{slot.hora}</span>
              {ocupado && (
                <span className="block text-[10px] text-oliveGray/60 mt-0.5">
                  Ocupado
                </span>
              )}
              {minha && (
                <span className="block text-[10px] text-oliveGray mt-0.5">
                  A tua
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Formulário de reserva */}
      {mostrarForm && slotSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
          <div className="bg-paper w-full max-w-md p-6 border border-warmBeige/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-title text-h3 text-ink">Nova reserva</h2>
              <button
                onClick={() => {
                  setMostrarForm(false);
                  setError(null);
                }}
                className="p-1 text-oliveGray hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 text-sm font-body text-oliveGray">
              <p>
                {espacoAtivo.nome} · {slotSelecionado.hora} ·{" "}
                {dataRef.toLocaleDateString("pt-PT")}
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-alert/5 border-l-4 border-alert px-4 py-3 mb-4">
                <AlertCircle className="w-4 h-4 text-alert shrink-0" />
                <p className="font-body text-sm text-alert">{error}</p>
              </div>
            )}

            <form action={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2">
                  Duração (minutos)
                </label>
                <select
                  name="duracao"
                  defaultValue={String(espacoAtivo.duracao_maxima_minutos)}
                  className="w-full px-3 py-2 border border-warmBeige/30 bg-paper font-body text-sm text-ink"
                >
                  <option value="60">1 hora</option>
                  <option value="90">1h30</option>
                  <option value="120">2 horas</option>
                </select>
              </div>

              <div>
                <label className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2">
                  N.º de pessoas
                </label>
                <input
                  type="number"
                  name="num_pessoas"
                  min={1}
                  max={espacoAtivo.capacidade ?? undefined}
                  placeholder="Opcional"
                  className="w-full px-3 py-2 border border-warmBeige/30 bg-paper font-body text-sm text-ink"
                />
              </div>

              <div>
                <label className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2">
                  Motivo / nota
                </label>
                <input
                  type="text"
                  name="motivo"
                  placeholder="Opcional"
                  className="w-full px-3 py-2 border border-warmBeige/30 bg-paper font-body text-sm text-ink"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full px-6 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50"
              >
                {isPending ? "A confirmar…" : "Confirmar reserva"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function gerarSlots(espaco: EspacoComum, data: Date): { hora: string }[] {
  const dow = data.getDay();
  let abertura: string | null = null;
  let fecho: string | null = null;

  switch (dow) {
    case 0:
      abertura = espaco.abertura_dom;
      fecho = espaco.fecho_dom;
      break;
    case 1:
      abertura = espaco.abertura_seg;
      fecho = espaco.fecho_seg;
      break;
    case 2:
      abertura = espaco.abertura_ter;
      fecho = espaco.fecho_ter;
      break;
    case 3:
      abertura = espaco.abertura_qua;
      fecho = espaco.fecho_qua;
      break;
    case 4:
      abertura = espaco.abertura_qui;
      fecho = espaco.fecho_qui;
      break;
    case 5:
      abertura = espaco.abertura_sex;
      fecho = espaco.fecho_sex;
      break;
    case 6:
      abertura = espaco.abertura_sab;
      fecho = espaco.fecho_sab;
      break;
  }

  if (!abertura || !fecho) return [];

  const slots: { hora: string }[] = [];
  const [ah, am] = abertura.split(":").map(Number);
  const [fh, fm] = fecho.split(":").map(Number);
  let current = ah * 60 + am;
  const end = fh * 60 + fm;

  while (current < end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push({ hora: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` });
    current += 60; // slots de 1h
  }

  return slots;
}
