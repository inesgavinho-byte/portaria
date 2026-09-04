"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  ChevronDown,
  CircleUserRound,
  FileText,
  House,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { definirVista, type Vista } from "@/lib/actions/vista";
import { NotificacoesBadge } from "@/components/layout/notificacoes-badge";
import {
  DoorKeeperMonogram,
  DoorKeeperWordmark,
} from "@/components/brand/doorkeeper-marks";

export type NavItem = { href: string; label: string; filhos?: NavItem[] };
export type NavGrupo = { titulo?: string; itens: NavItem[] };

interface AppNavProps {
  tenantNome: string;
  userEmail: string;
  fracao: string | null;
  grupos: NavGrupo[];
  vista: Vista;
  vistas: Vista[];
}

function hrefsDoItem(item: NavItem): string[] {
  return [item.href, ...(item.filhos ?? []).flatMap(hrefsDoItem)];
}

export function AppNav({
  tenantNome,
  userEmail,
  fracao,
  grupos,
  vista,
  vistas,
}: AppNavProps) {
  const [aberto, setAberto] = useState(false);
  const [retraida, setRetraida] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const todosHrefs = grupos.flatMap((grupo) =>
    grupo.itens.flatMap(hrefsDoItem),
  );

  useEffect(() => {
    setRetraida(
      window.localStorage.getItem("doorkeeper-sidebar-retraida") === "true" ||
        window.localStorage.getItem("portaria-sidebar-retraida") === "true",
    );
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const atualizar = () => setDesktop(media.matches);
    atualizar();
    media.addEventListener("change", atualizar);
    return () => media.removeEventListener("change", atualizar);
  }, []);

  function alternarSidebar() {
    setRetraida((atual) => {
      const proximo = !atual;
      window.localStorage.setItem(
        "doorkeeper-sidebar-retraida",
        String(proximo),
      );
      return proximo;
    });
  }

  if (vista !== "admin") {
    return (
      <ResidentNavigation
        tenantNome={tenantNome}
        userEmail={userEmail}
        fracao={fracao}
        vista={vista}
      />
    );
  }

  const sidebarOculta = retraida && desktop;

  return (
    <>
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-black/[0.06] bg-white/90 px-5 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <DoorKeeperMonogram className="h-9 w-9" priority />
          <span className="max-w-[11rem] truncate font-body text-sm font-medium text-ink">
            {tenantNome}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <NotificacoesBadge />
          <button
            onClick={() => setAberto(true)}
            aria-label="Abrir menu"
            className="rounded-xl p-2 text-ink transition-colors hover:bg-softCream"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {aberto && (
        <div
          onClick={() => setAberto(false)}
          className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm lg:hidden"
          aria-hidden
        />
      )}

      <aside
        aria-hidden={sidebarOculta || undefined}
        inert={sidebarOculta || undefined}
        className={`fixed left-0 top-0 z-50 flex h-svh w-[15rem] shrink-0 flex-col overflow-hidden bg-doorkeeperGreen text-white shadow-[14px_0_45px_rgba(46,45,44,0.08)] transition-[transform,width,box-shadow] duration-200 ease-out lg:sticky lg:translate-x-0 ${aberto ? "translate-x-0" : "-translate-x-full"} ${retraida ? "lg:w-0 lg:shadow-none" : "lg:w-[15rem]"}`}
      >
        <div className="relative px-5 pb-5 pt-4">
          <Link href="/hoje" onClick={() => setAberto(false)}>
            <DoorKeeperWordmark
              tone="green"
              priority
              className="h-[7.25rem] w-[11.4rem] object-contain object-left"
            />
          </Link>
          <button
            onClick={alternarSidebar}
            aria-label="Retrair navegação"
            title="Retrair navegação"
            className="absolute right-3 top-4 hidden rounded-lg p-1.5 text-white/45 transition-colors hover:bg-white/10 hover:text-white lg:inline-flex"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
          <button
            onClick={() => setAberto(false)}
            aria-label="Fechar menu"
            className="absolute right-3 top-4 rounded-lg p-1.5 text-white/55 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="mt-1 truncate px-3 font-body text-[0.66rem] uppercase tracking-[0.14em] text-white/45">
            {tenantNome}
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {grupos.map((grupo, gi) => (
            <NavGrupoBloco
              key={gi}
              grupo={grupo}
              todosHrefs={todosHrefs}
              onNavigate={() => setAberto(false)}
            />
          ))}
        </nav>

        <UtilizadorRodape
          userEmail={userEmail}
          fracao={fracao}
          vista={vista}
          vistas={vistas}
        />
      </aside>

      {retraida && (
        <button
          onClick={alternarSidebar}
          aria-label="Expandir navegação"
          title="Expandir navegação"
          className="fixed left-4 top-4 z-40 hidden rounded-xl border border-black/[0.07] bg-white/90 p-2.5 text-doorkeeperGreen shadow-float backdrop-blur-xl transition-colors hover:text-doorkeeperTurquoise lg:inline-flex"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      )}
    </>
  );
}

function NavGrupoBloco({
  grupo,
  todosHrefs,
  onNavigate,
}: {
  grupo: NavGrupo;
  todosHrefs: string[];
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const ativo = todosHrefs
    .filter((href) => pathname === href || pathname.startsWith(href + "/"))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <div className={grupo.titulo ? "mt-5" : ""}>
      {grupo.titulo && (
        <p className="mb-2 px-4 font-body text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/35">
          {grupo.titulo}
        </p>
      )}
      <ul className="space-y-1">
        {grupo.itens.map((item) => (
          <NavItemLinha
            key={item.href}
            item={item}
            ativo={ativo}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </div>
  );
}

function NavItemLinha({
  item,
  ativo,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  ativo?: string;
  pathname: string;
  onNavigate: () => void;
}) {
  const filhos = item.filhos ?? [];
  const temFilhos = filhos.length > 0;
  const ramoAtivo = ativo ? hrefsDoItem(item).includes(ativo) : false;
  const classeBase =
    "relative block rounded-xl px-4 py-3 font-body text-sm font-medium transition-colors";

  if (!temFilhos) {
    return (
      <li>
        <Link
          href={item.href}
          onClick={onNavigate}
          className={`${classeBase} ${item.href === ativo ? "bg-white/[0.08] text-doorkeeperTurquoise before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-doorkeeperTurquoise" : "text-white/78 hover:bg-white/[0.06] hover:text-white"}`}
        >
          {item.label}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <details className="group" open={ramoAtivo || undefined}>
        <summary
          className={`${classeBase} flex cursor-pointer list-none items-center justify-between ${ramoAtivo ? "bg-white/[0.08] text-doorkeeperTurquoise before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-doorkeeperTurquoise" : "text-white/78 hover:bg-white/[0.06] hover:text-white"}`}
        >
          <span>{item.label}</span>
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="ml-5 mt-1 space-y-0.5 border-l border-white/10 pl-2">
          <li>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={`block rounded-lg px-3 py-2 font-body text-xs transition-colors ${item.href === ativo ? "text-doorkeeperTurquoise" : "text-white/48 hover:text-white"}`}
            >
              Visão geral
            </Link>
          </li>
          {filhos.map((filho) => (
            <NavItemLinha
              key={filho.href}
              item={filho}
              ativo={ativo}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </details>
    </li>
  );
}

const VISTA_LABEL: Record<Vista, string> = {
  admin: "Administração",
  condomino: "Condómino",
  inquilino: "Inquilino",
};

function UtilizadorRodape({
  userEmail,
  fracao,
  vista,
  vistas,
}: {
  userEmail: string;
  fracao: string | null;
  vista: Vista;
  vistas: Vista[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  async function sair() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function mudar(nova: Vista) {
    if (nova !== vista) startTransition(() => definirVista(nova));
  }

  return (
    <div className="border-t border-white/10 px-4 py-4">
      <p className="truncate font-body text-[0.7rem] text-white/45">
        {fracao ? `${fracao} · ` : ""}
        {userEmail}
      </p>
      <div className="mt-3 flex items-center justify-between gap-3">
        {vistas.length > 1 ? (
          <select
            aria-label="Pré-visualizar a aplicação"
            value={vista}
            onChange={(event) => mudar(event.target.value as Vista)}
            disabled={isPending}
            className="min-w-0 rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1.5 font-body text-[0.68rem] text-white outline-none"
          >
            {vistas.map((item) => (
              <option key={item} value={item} className="text-ink">
                {VISTA_LABEL[item]}
              </option>
            ))}
          </select>
        ) : (
          <span />
        )}
        <button
          onClick={sair}
          className="font-body text-[0.7rem] font-medium text-doorkeeperTurquoise transition-colors hover:text-white"
        >
          Sair
        </button>
      </div>
    </div>
  );
}

function ResidentNavigation({
  tenantNome,
  userEmail,
  fracao,
  vista,
}: {
  tenantNome: string;
  userEmail: string;
  fracao: string | null;
  vista: Vista;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const itens = [
    { href: "/avisos", label: "Hoje", icon: House },
    { href: "/ocorrencias", label: "Prédio", icon: Building2 },
    ...(vista === "condomino"
      ? [{ href: "/documentos", label: "Documentos", icon: FileText }]
      : [{ href: "/regulamento", label: "Regulamento", icon: FileText }]),
    {
      href: "/conta",
      label: "Conta",
      icon: CircleUserRound,
    },
  ];

  async function sair() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-black/[0.06] bg-white/92 px-5 backdrop-blur-xl lg:hidden">
        <div className="min-w-0">
          <p className="truncate font-body text-[0.68rem] font-semibold uppercase tracking-[0.13em] text-doorkeeperTurquoise">
            {tenantNome}
          </p>
          {fracao && (
            <p className="mt-0.5 font-body text-xs text-oliveGray">{fracao}</p>
          )}
        </div>
        <DoorKeeperMonogram className="h-10 w-10" priority />
      </header>

      <aside className="sticky top-0 hidden h-svh w-[15rem] shrink-0 flex-col border-r border-black/[0.07] bg-white px-5 py-5 lg:flex">
        <DoorKeeperWordmark
          tone="light"
          priority
          className="h-28 w-44 object-contain object-left"
        />
        <p className="mt-2 truncate font-body text-xs font-semibold uppercase tracking-[0.14em] text-doorkeeperTurquoise">
          {tenantNome}
        </p>
        <nav className="mt-10 space-y-1">
          {itens.map((item) => {
            const ativo =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={`${item.label}-${item.href}`}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 font-body text-sm transition-colors ${ativo ? "bg-britishGreenSoft text-doorkeeperTurquoise" : "text-oliveGray hover:bg-softCream hover:text-ink"}`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-black/[0.07] pt-4">
          <p className="truncate font-body text-xs text-oliveGray">{userEmail}</p>
          <button
            onClick={sair}
            className="mt-3 font-body text-xs font-semibold text-doorkeeperTurquoise"
          >
            Sair
          </button>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-black/[0.07] bg-white/95 px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(46,45,44,0.06)] backdrop-blur-xl lg:hidden">
        {itens.map((item) => {
          const ativo =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={`${item.label}-${item.href}`}
              href={item.href}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl font-body text-[0.62rem] font-medium transition-colors ${ativo ? "text-doorkeeperTurquoise" : "text-oliveGray"}`}
            >
              <item.icon className="h-[1.15rem] w-[1.15rem]" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
