"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Tenant, UserTenant } from "@/types/database";
import type { User } from "@supabase/supabase-js";

interface AppHeaderProps {
  user: User;
  tenant: Tenant;
  membership: UserTenant;
}

export function AppHeader({ user, tenant, membership }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const navItems = [
    { href: "/avisos", label: "Avisos" },
    { href: "/documentos", label: "Documentos" },
    { href: "/ocorrencias", label: "Ocorrências" },
    { href: "/assembleias", label: "Assembleias" },
  ];

  if (membership.role === "admin") {
    navItems.unshift({ href: "/inicio", label: "Início" });
    navItems.push({ href: "/configuracao", label: "Configuração" });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="bg-paper border-b border-warmBeige/20">
      <div className="container-page">
        {/* Linha superior — branding e utilizador */}
        <div className="flex items-center justify-between py-4 border-b border-warmBeige/10">
          <Link href="/avisos" className="font-title text-lg text-ink hover:text-oliveGray">
            {tenant.nome}
          </Link>
          <div className="flex items-center gap-6">
            <span className="font-body text-xs text-oliveGray hidden md:inline">
              {membership.fracao && `${membership.fracao} · `}
              {user.email}
            </span>
            <button
              onClick={handleLogout}
              className="font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink"
            >
              Sair
            </button>
          </div>
        </div>

        {/* Linha inferior — navegação */}
        <nav className="flex gap-8 py-4">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`font-body text-sm tracking-wide pb-1 border-b-2 transition-colors ${
                  active
                    ? "border-warmBeige text-ink"
                    : "border-transparent text-oliveGray hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
