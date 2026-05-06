import Link from "next/link";
import { getCurrentTenant } from "@/lib/supabase/tenant";

export async function PublicHeader() {
  const tenant = await getCurrentTenant();

  return (
    <header className="border-b border-warmBeige/20">
      <div className="container-page flex items-center justify-between py-6">
        <Link href="/" className="font-title text-xl text-ink hover:text-oliveGray transition-colors">
          {tenant?.nome ?? "Portaria"}
        </Link>
        <nav className="flex items-center gap-8 font-body text-sm">
          <Link href="/historia" className="text-ink hover:text-warmBeige transition-colors">
            História
          </Link>
          <Link href="/contactos" className="text-ink hover:text-warmBeige transition-colors">
            Contactos
          </Link>
          <Link
            href="/login"
            className="px-5 py-2 bg-ink text-paper hover:bg-oliveGray transition-colors text-xs tracking-widest uppercase"
          >
            Área reservada
          </Link>
        </nav>
      </div>
    </header>
  );
}
