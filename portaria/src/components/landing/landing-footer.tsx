import Link from "next/link";
import { DoorKeeperWordmark } from "@/components/brand/doorkeeper-marks";

export function LandingFooter() {
  return (
    <footer className="bg-night border-t border-white/5">
      <div className="container-page py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <DoorKeeperWordmark tone="charcoal" className="h-20 w-32 object-contain object-left opacity-75" />
        <nav className="flex items-center gap-6 font-body text-xs text-paper/40">
          <Link href="/contactos" className="hover:text-paper/80 transition-colors">
            Contactos
          </Link>
          <Link href="/privacidade" className="hover:text-paper/80 transition-colors">
            Privacidade
          </Link>
          <Link href="/termos" className="hover:text-paper/80 transition-colors">
            Termos
          </Link>
          <Link href="/login" className="hover:text-paper/80 transition-colors">
            Área reservada
          </Link>
          <span>© {new Date().getFullYear()}</span>
        </nav>
      </div>
    </footer>
  );
}
