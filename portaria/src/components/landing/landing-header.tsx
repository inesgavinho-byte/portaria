import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DoorKeeperWordmark } from "@/components/brand/doorkeeper-marks";

export function LandingHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <div className="container-page flex items-center justify-between py-6 md:py-8">
        <Link href="/" aria-label="The DoorKeeper — início" className="transition-opacity hover:opacity-65">
          <DoorKeeperWordmark tone="charcoal" priority className="h-11 w-28 sm:h-12 sm:w-[8.5rem]" />
        </Link>

        <nav className="flex items-center gap-6 md:gap-9" aria-label="Navegação principal">
          <a
            href="#produto"
            className="hidden font-body text-xs font-semibold uppercase tracking-[0.14em] text-white/55 transition-colors hover:text-white md:inline"
          >
            Produto
          </a>
          <a
            href="#confianca"
            className="hidden font-body text-xs font-semibold uppercase tracking-[0.14em] text-white/55 transition-colors hover:text-white md:inline"
          >
            Segurança
          </a>
          <Link
            href="/login"
            className="hidden font-body text-xs font-semibold uppercase tracking-[0.14em] text-white/55 transition-colors hover:text-white sm:inline"
          >
            Entrar
          </Link>
          <Link
            href="/contactos"
            className="group inline-flex items-center gap-2 bg-doorkeeperTerracotta px-4 py-3 font-body text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-doorkeeperBrown sm:px-5"
          >
            <span className="sm:hidden">Demo</span>
            <span className="hidden sm:inline">Demonstração</span>
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
