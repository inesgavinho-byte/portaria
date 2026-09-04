import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DoorKeeperWordmark } from "@/components/brand/doorkeeper-marks";

/**
 * Header discreto da landing — flutua sobre o hero escuro.
 */
export function LandingHeader() {
  return (
    <header className="absolute top-0 inset-x-0 z-50">
      <div className="container-page flex items-center justify-between py-6">
        <Link
          href="/"
          className="transition-opacity hover:opacity-80"
        >
          <DoorKeeperWordmark tone="charcoal" priority className="h-16 w-28 object-contain object-left" />
        </Link>

        <nav className="flex items-center gap-8">
          <a
            href="#produto"
            className="hidden md:inline font-body text-sm text-paper/60 hover:text-paper transition-colors"
          >
            Produto
          </a>
          <a
            href="#confianca"
            className="hidden md:inline font-body text-sm text-paper/60 hover:text-paper transition-colors"
          >
            Segurança
          </a>
          <Link
            href="/login"
            className="hidden sm:inline font-body text-sm text-paper/60 hover:text-paper transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="/contactos"
            className="group inline-flex items-center gap-2 rounded-full bg-doorkeeperTerracotta px-5 py-2.5 font-body text-sm font-semibold text-white transition-colors hover:bg-white hover:text-ink"
          >
            Ver demonstração
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
