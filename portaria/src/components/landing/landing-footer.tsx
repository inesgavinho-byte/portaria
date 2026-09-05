import Link from "next/link";
import { DoorKeeperWordmark } from "@/components/brand/doorkeeper-marks";

export function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-graphite">
      <div className="container-page flex flex-col gap-8 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <DoorKeeperWordmark tone="charcoal" className="h-14 w-[7.5rem]" />
          <p className="mt-4 max-w-xs font-body text-xs leading-5 text-white/40">
            Gestão operacional de condomínios, com contexto.
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 font-body text-xs text-white/45" aria-label="Ligações de rodapé">
          <Link href="/contactos" className="transition-colors hover:text-white">Contactos</Link>
          <Link href="/privacidade" className="transition-colors hover:text-white">Privacidade</Link>
          <Link href="/termos" className="transition-colors hover:text-white">Termos</Link>
          <Link href="/login" className="transition-colors hover:text-white">Área reservada</Link>
          <span>© {new Date().getFullYear()}</span>
        </nav>
      </div>
    </footer>
  );
}
