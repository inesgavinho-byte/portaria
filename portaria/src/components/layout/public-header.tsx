import Link from "next/link";
import { getCurrentTenant } from "@/lib/supabase/tenant";
import { DoorKeeperWordmark } from "@/components/brand/doorkeeper-marks";

export async function PublicHeader() {
  const tenant = await getCurrentTenant();

  return (
    <header className="border-b border-warmBeige/20">
      <div className="container-page flex items-center justify-between py-6">
        <Link href="/" className="flex items-center gap-4 font-title text-xl text-ink transition-opacity hover:opacity-70">
          <DoorKeeperWordmark tone="light" priority className="h-16 w-28 object-contain object-left" />
          {tenant?.nome && <span>{tenant.nome}</span>}
        </Link>
        <nav className="flex items-center gap-8 font-body text-sm">
          <Link href="/historia" className="text-ink hover:text-warmBeige transition-colors">
            História
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
