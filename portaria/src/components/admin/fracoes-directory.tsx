"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleCheck, Search, UserPlus, X } from "lucide-react";
import { FracaoActions } from "@/components/admin/fracao-actions";
import type { Fracao } from "@/types/database";

type Filtro = "todas" | "arrendadas" | "incompletas";

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "arrendadas", label: "Arrendadas" },
  { id: "incompletas", label: "A completar" },
];

const EURO = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

function normalizar(valor: string | null) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function incompleta(fracao: Fracao) {
  return (
    !fracao.proprietario_nome ||
    (!fracao.proprietario_email && !fracao.proprietario_telefone) ||
    fracao.permilagem == null
  );
}

export function FracoesDirectory({ fracoes }: { fracoes: Fracao[] }) {
  const [pesquisa, setPesquisa] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const resultados = useMemo(() => {
    const termo = normalizar(pesquisa.trim());

    return fracoes.filter((fracao) => {
      if (filtro === "arrendadas" && !fracao.inquilino_nome) return false;
      if (filtro === "incompletas" && !incompleta(fracao)) return false;
      if (!termo) return true;

      return [
        fracao.codigo,
        fracao.piso,
        fracao.tipologia,
        fracao.proprietario_nome,
        fracao.proprietario_email,
        fracao.proprietario_telefone,
        fracao.inquilino_nome,
      ].some((valor) => normalizar(valor).includes(termo));
    });
  }, [filtro, fracoes, pesquisa]);

  return (
    <section className="mt-12">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="doorkeeper-eyebrow">Directório</p>
          <h2 className="mt-2 font-title text-3xl font-normal text-ink">
            Frações e contactos
          </h2>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
          <div className="relative min-w-0 sm:w-72">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-oliveGray" />
            <input
              type="search"
              value={pesquisa}
              onChange={(event) => setPesquisa(event.target.value)}
              placeholder="Pesquisar fração ou pessoa"
              aria-label="Pesquisar fração ou pessoa"
              className="h-11 w-full rounded-full border border-black/[0.09] bg-white pl-11 pr-10 font-body text-sm text-ink outline-none transition-colors placeholder:text-oliveGray/70 focus:border-doorkeeperTurquoise focus:ring-2 focus:ring-doorkeeperTurquoise/10"
            />
            {pesquisa && (
              <button
                type="button"
                onClick={() => setPesquisa("")}
                aria-label="Limpar pesquisa"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-oliveGray transition-colors hover:bg-softCream hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex rounded-full border border-black/[0.08] bg-white p-1">
            {FILTROS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFiltro(item.id)}
                className={`min-h-9 flex-1 whitespace-nowrap rounded-full px-3 font-body text-xs font-medium transition-colors sm:flex-none ${
                  filtro === item.id
                    ? "bg-doorkeeperGreen text-white"
                    : "text-oliveGray hover:text-ink"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-7">
        <div className="hidden grid-cols-[minmax(7rem,0.75fr)_minmax(14rem,1.5fr)_minmax(12rem,1.1fr)_6.5rem_7rem] gap-5 border-y border-black/[0.07] px-4 py-3 lg:grid">
          <Cabecalho>Fração</Cabecalho>
          <Cabecalho>Proprietário</Cabecalho>
          <Cabecalho>Ocupação</Cabecalho>
          <Cabecalho>Quota</Cabecalho>
          <span className="sr-only">Ações</span>
        </div>

        {resultados.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center border-b border-black/[0.07] text-center">
            <CircleCheck className="h-5 w-5 text-doorkeeperTurquoise" />
            <p className="mt-4 font-title text-2xl font-normal text-ink">
              Nenhuma fração encontrada.
            </p>
            <p className="mt-1 font-body text-sm text-oliveGray">
              Experimenta outra pesquisa ou filtro.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-black/[0.07] border-b border-black/[0.07]">
            {resultados.map((fracao) => (
              <FracaoLinha key={fracao.id} fracao={fracao} />
            ))}
          </ul>
        )}
      </div>

      <p className="mt-4 font-body text-xs text-oliveGray">
        {resultados.length} de {fracoes.length} {fracoes.length === 1 ? "fração" : "frações"}
      </p>
    </section>
  );
}

function FracaoLinha({ fracao }: { fracao: Fracao }) {
  const faltaDados = incompleta(fracao);

  return (
    <li className="group relative py-5 transition-colors hover:bg-white/55 lg:px-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(7rem,0.75fr)_minmax(14rem,1.5fr)_minmax(12rem,1.1fr)_6.5rem_7rem] lg:items-center lg:gap-5">
        <Link href={`/fracoes/${fracao.id}`} className="min-w-0">
          <span className="block font-title text-2xl font-normal text-ink transition-colors group-hover:text-doorkeeperTurquoise">
            {fracao.codigo}
          </span>
          <span className="mt-1 block font-body text-xs text-oliveGray">
            {[fracao.piso, fracao.tipologia].filter(Boolean).join(" · ") || "Sem tipologia"}
            {fracao.permilagem != null ? ` · ${fracao.permilagem}‰` : ""}
          </span>
        </Link>

        <div className="min-w-0">
          <p className="doorkeeper-eyebrow mb-1 lg:hidden">Proprietário</p>
          <p className={`truncate font-body text-sm font-medium ${faltaDados ? "text-doorkeeperTerracotta" : "text-ink"}`}>
            {fracao.proprietario_nome ?? "Proprietário por registar"}
          </p>
          <p className="mt-1 truncate font-body text-xs text-oliveGray">
            {[fracao.proprietario_email, fracao.proprietario_telefone]
              .filter(Boolean)
              .join(" · ") || "Contacto por completar"}
          </p>
        </div>

        <div className="min-w-0">
          <p className="doorkeeper-eyebrow mb-1 lg:hidden">Ocupação</p>
          <p className="truncate font-body text-sm text-ink">
            {fracao.inquilino_nome ?? "Sem inquilino registado"}
          </p>
          <p className="mt-1 font-body text-xs text-oliveGray">
            {fracao.inquilino_nome ? "Arrendada" : "—"}
          </p>
        </div>

        <div>
          <p className="doorkeeper-eyebrow mb-1 lg:hidden">Quota mensal</p>
          <p className="font-body text-sm font-medium text-ink">
            {fracao.quota_mensal_cents != null
              ? EURO.format(fracao.quota_mensal_cents / 100)
              : "—"}
          </p>
        </div>

        <div className="flex items-center gap-1 border-t border-black/[0.06] pt-3 lg:justify-end lg:border-0 lg:pt-0">
          <Link
            href={`/configuracao/membros/novo?role=inquilino&fracao=${encodeURIComponent(fracao.codigo)}`}
            title="Convidar inquilino"
            aria-label={`Convidar inquilino para a fração ${fracao.codigo}`}
            className="rounded-full p-2 text-oliveGray transition-colors hover:bg-britishGreenSoft hover:text-doorkeeperTurquoise"
          >
            <UserPlus className="h-4 w-4" />
          </Link>
          <FracaoActions fracaoId={fracao.id} />
          <Link
            href={`/fracoes/${fracao.id}`}
            title="Abrir dossiê"
            aria-label={`Abrir dossiê da fração ${fracao.codigo}`}
            className="ml-auto rounded-full p-2 text-ink transition-colors hover:bg-britishGreenSoft hover:text-doorkeeperTurquoise lg:ml-0"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </li>
  );
}

function Cabecalho({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-body text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-oliveGray">
      {children}
    </span>
  );
}
