"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { definirVista, type Vista } from "@/lib/actions/vista";
import { NotificacoesBadge } from "@/components/layout/notificacoes-badge";

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

export function AppNav({ tenantNome, userEmail, fracao, grupos, vista, vistas }: AppNavProps) {
  const [aberto, setAberto] = useState(false);
  const todosHrefs = grupos.flatMap((grupo) => grupo.itens.flatMap(hrefsDoItem));

  return (
    <>
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-white/70 bg-white/70 px-4 py-3 backdrop-blur-xl">
        <Link href="/" className="font-body text-base font-semibold tracking-[-0.02em] text-ink">{tenantNome}</Link>
        <div className="flex items-center gap-1">
          <NotificacoesBadge />
          <button onClick={() => setAberto(true)} aria-label="Abrir menu" className="rounded-xl p-2 text-oliveGray transition-colors hover:bg-white hover:text-britishGreen"><Menu className="h-5 w-5" /></button>
        </div>
      </div>

      {aberto && <div onClick={() => setAberto(false)} className="lg:hidden fixed inset-0 z-40 bg-ink/20 backdrop-blur-sm" aria-hidden />}

      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-svh w-72 shrink-0 border-r border-white/70 bg-white/60 backdrop-blur-glass flex flex-col shadow-[12px_0_40px_rgba(23,32,28,0.04)] transition-transform lg:translate-x-0 ${aberto ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/" className="flex min-w-0 items-center gap-3" onClick={() => setAberto(false)}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-britishGreen text-sm font-semibold text-white shadow-float">E</span>
            <span className="truncate font-body text-[15px] font-semibold tracking-[-0.02em] text-ink">{tenantNome}</span>
          </Link>
          <div className="flex items-center gap-1">
            <NotificacoesBadge />
            <button onClick={() => setAberto(false)} aria-label="Fechar menu" className="lg:hidden rounded-xl p-1.5 text-oliveGray hover:bg-white hover:text-britishGreen"><X className="h-5 w-5" /></button>
          </div>
        </div>

        {vistas.length > 1 && <VistaToggle vista={vista} vistas={vistas} />}

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {grupos.map((grupo, gi) => <NavGrupoBloco key={gi} grupo={grupo} todosHrefs={todosHrefs} onNavigate={() => setAberto(false)} />)}
        </nav>

        <UtilizadorRodape userEmail={userEmail} fracao={fracao} vista={vista} />
      </aside>
    </>
  );
}

function NavGrupoBloco({ grupo, todosHrefs, onNavigate }: { grupo: NavGrupo; todosHrefs: string[]; onNavigate: () => void }) {
  const pathname = usePathname();
  const ativo = todosHrefs.filter((h) => pathname === h || pathname.startsWith(h + "/")).sort((a, b) => b.length - a.length)[0];

  return (
    <div>
      {grupo.titulo && <p className="mb-2 px-3 font-body text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-oliveGray/70">{grupo.titulo}</p>}
      <ul className="space-y-1">
        {grupo.itens.map((item) => <NavItemLinha key={item.href} item={item} ativo={ativo} pathname={pathname} onNavigate={onNavigate} />)}
      </ul>
    </div>
  );
}

function NavItemLinha({ item, ativo, pathname, onNavigate }: { item: NavItem; ativo?: string; pathname: string; onNavigate: () => void }) {
  const filhos = item.filhos ?? [];
  const temFilhos = filhos.length > 0;
  const ramoAtivo = hrefsDoItem(item).some((href) => pathname === href || pathname.startsWith(href + "/"));

  if (!temFilhos) {
    return <li><Link href={item.href} onClick={onNavigate} className={`block rounded-xl px-3 py-2.5 font-body text-sm font-medium transition-all ${item.href === ativo ? "bg-britishGreen text-white shadow-float" : "text-oliveGray hover:bg-white/90 hover:text-britishGreen"}`}>{item.label}</Link></li>;
  }

  return (
    <li>
      <details className="group" open={ramoAtivo || undefined}>
        <summary className={`flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-2.5 font-body text-sm font-medium transition-all ${ramoAtivo ? "bg-britishGreenSoft/80 text-britishGreen" : "text-oliveGray hover:bg-white/90 hover:text-britishGreen"}`}>
          <span>{item.label}</span>
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="ml-4 mt-1.5 space-y-1 border-l border-britishGreen/10 pl-2">
          <li><Link href={item.href} onClick={onNavigate} className={`block rounded-lg px-3 py-2 font-body text-[0.82rem] transition-colors ${item.href === ativo ? "bg-britishGreen text-white" : "text-oliveGray hover:bg-white hover:text-britishGreen"}`}>Visão geral</Link></li>
          {filhos.map((filho) => <NavItemLinha key={filho.href} item={filho} ativo={ativo} pathname={pathname} onNavigate={onNavigate} />)}
        </ul>
      </details>
    </li>
  );
}

const VISTA_LABEL: Record<Vista, string> = { admin: "Administração", condomino: "Condómino", inquilino: "Inquilino" };

function VistaToggle({ vista, vistas }: { vista: Vista; vistas: Vista[] }) {
  const [isPending, startTransition] = useTransition();
  function mudar(nova: Vista) { if (nova !== vista) startTransition(() => definirVista(nova)); }
  return <div className="px-4 pb-1"><div className="flex rounded-2xl border border-white/80 bg-white/50 p-1 shadow-sm backdrop-blur-xl">{vistas.map((v) => <button key={v} onClick={() => mudar(v)} disabled={isPending} className={`flex-1 rounded-xl px-2 py-2 font-body text-xs font-medium transition-all ${vista === v ? "bg-britishGreen text-white shadow-sm" : "text-oliveGray hover:bg-white hover:text-britishGreen"}`}>{VISTA_LABEL[v]}</button>)}</div></div>;
}

function UtilizadorRodape({ userEmail, fracao, vista }: { userEmail: string; fracao: string | null; vista: Vista }) {
  const router = useRouter();
  const supabase = createClient();
  async function sair() { await supabase.auth.signOut(); router.push("/"); router.refresh(); }
  return <div className="m-3 rounded-2xl border border-white/75 bg-white/60 px-4 py-3 backdrop-blur-xl"><p className="truncate font-body text-xs text-oliveGray">{fracao && vista === "condomino" ? `${fracao} · ` : ""}{userEmail}</p><button onClick={sair} className="mt-2 font-body text-xs font-semibold text-britishGreen hover:text-britishGreenDeep">Sair</button></div>;
}
