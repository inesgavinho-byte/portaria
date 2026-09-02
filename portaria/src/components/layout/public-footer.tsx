import { getCurrentTenant } from "@/lib/supabase/tenant";

export async function PublicFooter() {
  const tenant = await getCurrentTenant();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-warmBeige/20 bg-softCream/30">
      <div className="container-page py-12">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <p className="font-title text-lg text-ink mb-2">
              {tenant?.nome ?? "Portaria"}
            </p>
            {tenant?.morada && (
              <p className="font-body text-sm text-oliveGray">{tenant.morada}</p>
            )}
          </div>
          <div className="md:text-right font-body text-xs text-oliveGray/70 space-x-4">
            <a href="/privacidade" className="hover:text-oliveGray transition-colors">
              Privacidade
            </a>
            <a href="/termos" className="hover:text-oliveGray transition-colors">
              Termos
            </a>
            <span>
              © {year} {tenant?.nome ?? "Portaria"}. Plataforma desenvolvida em portaria.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
