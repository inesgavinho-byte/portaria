import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Header discreto da landing — flutua sobre o hero escuro.
 */
export function LandingHeader() {
  return (
    <header className="absolute top-0 inset-x-0 z-50">
      <div className="container-page flex items-center justify-between py-6">
        <Link
          href="/"
          className="flex items-center gap-3 text-paper hover:opacity-80 transition-opacity"
        >
          <ArchMark />
          <span className="font-body text-sm tracking-[0.35em] uppercase">
            Portaria
          </span>
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
            className="group inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 font-body text-sm text-paper hover:bg-white/10 transition-colors"
          >
            Ver demonstração
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </nav>
      </div>
    </header>
  );
}

/** Marca: arco de portaria desenhado em CSS. */
function ArchMark() {
  return (
    <span
      aria-hidden
      className="block w-5 h-6 border border-paper/80 rounded-t-full"
    />
  );
}
