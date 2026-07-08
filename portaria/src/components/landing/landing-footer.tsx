import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="bg-night border-t border-white/5">
      <div className="container-page py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="font-body text-xs tracking-[0.35em] uppercase text-paper/40">
          Portaria
        </p>
        <nav className="flex items-center gap-6 font-body text-xs text-paper/40">
          <Link href="/contactos" className="hover:text-paper/80 transition-colors">
            Contactos
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
