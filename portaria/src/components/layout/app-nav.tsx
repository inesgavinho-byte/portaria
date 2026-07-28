"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { definirVista, type Vista } from "@/lib/actions/vista";
import { NotificacoesBadge } from "@/components/layout/notificacoes-badge";

export type NavItem = { href: string; label: string };
export type NavGrupo = { titulo?: string; itens: NavItem[] };

interface AppNavProps {
  tenantNome: string;
  userEmail: string;
  fracao: string | null;
  grupos: NavGrupo[];
  vista: Vista;
  vistas: Vista[];
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

  return (
    <>
      {/* Barra superior (mobile: com botão de menu) */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between bg-paper border-b border-warmBeige/20 px-4 py-3">
        <Link href="/" className="font-title text-lg text-ink">
          {tenantNome}
        </Link>
        <div className="flex items-center gap-1">
          <NotificacoesBadge />
          <button
            onClick={() => setAberto(true)}
            aria-label="Abrir menu"
            className="p-2 text-oliveGray hover:text-ink"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Overlay mobile */}
      {aberto && (
        <div
          onClick={() => setAberto(false)}
          className="lg:hidden fixed inset-0 z-40 bg-ink/30"
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-svh w-72 shrink-0 bg-paper border-r border-warmBeige/20 flex flex-col transition-transform lg:translate-x-0 ${
          aberto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-warmBeige/10">
          <Link
            href="/"
            className="font-title text-lg text-ink hover:text-oliveGray"
            onClick={() => setAberto(false)}
          >
            {tenantNome}
          </Link>
          <div className="flex items-center gap-1">
            <NotificacoesBadge />
            <button
              onClick={() => setAberto(false)}
              aria-label="Fechar menu"
              className="lg:hidden p-1 text-oliveGray hover:text-ink"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {vistas.length > 1 && <VistaToggle vista={vista} vistas={vistas} />}

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {grupos.map((grupo, gi) => (
            <NavGrupoBloco
              key={gi}
              grupo={grupo}
              todosHrefs={grupos.flatMap((g) => g.itens.map((i) => i.href))}
              onNavigate={() => setAberto(false)}
            />
          ))}
        </nav>

        <UtilizadorRodape
          userEmail={userEmail}
          fracao={fracao}
          vista={vista}
        />
      </aside>
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
  // Item ativo = href que é o prefixo mais longo do pathname atual
  const ativo = todosHrefs
    .filter((h) => pathname === h || pathname.startsWith(h + "/"))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <div>
      {grupo.titulo && (
        <p className="px-3 mb-2 font-body text-[0.65rem] tracking-widest uppercase text-oliveGray/60">
          {grupo.titulo}
        </p>
      )}
      <ul className="space-y-0.5">
        {grupo.itens.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={`block px-3 py-2 rounded font-body text-sm transition-colors ${
                item.href === ativo
                  ? "bg-warmBeige/20 text-ink"
                  : "text-oliveGray hover:text-ink hover:bg-softCream/60"
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const VISTA_LABEL: Record<Vista, string> = {
  admin: "Administração",
  condomino: "Condómino",
  inquilino: "Inquilino",
};

function VistaToggle({ vista, vistas }: { vista: Vista; vistas: Vista[] }) {
  const [isPending, startTransition] = useTransition();

  function mudar(nova: Vista) {
    if (nova === vista) return;
    startTransition(() => definirVista(nova));
  }

  return (
    <div className="px-4 pt-4">
      <div className="flex rounded-full border border-warmBeige/40 p-0.5 text-xs font-body">
        {vistas.map((v) => (
          <button
            key={v}
            onClick={() => mudar(v)}
            disabled={isPending}
            className={`flex-1 rounded-full px-2.5 py-1.5 tracking-wide transition-colors ${
              vista === v ? "bg-ink text-paper" : "text-oliveGray hover:text-ink"
            }`}
          >
            {VISTA_LABEL[v]}
          </button>
        ))}
      </div>
    </div>
  );
}

function UtilizadorRodape({
  userEmail,
  fracao,
  vista,
}: {
  userEmail: string;
  fracao: string | null;
  vista: Vista;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function sair() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="border-t border-warmBeige/10 px-6 py-4">
      <p className="font-body text-xs text-oliveGray truncate">
        {fracao && vista === "condomino" ? `${fracao} · ` : ""}
        {userEmail}
      </p>
      <button
        onClick={sair}
        className="mt-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink"
      >
        Sair
      </button>
    </div>
  );
}
