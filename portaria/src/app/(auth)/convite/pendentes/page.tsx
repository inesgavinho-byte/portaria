import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConvitesPendentes } from "@/components/app/convites-pendentes";
import type { ConvitePendente } from "@/lib/actions/convites";

/**
 * S11 — Decisão explícita de convites. O convidado chega aqui depois de
 * definir a palavra-passe (ou após iniciar sessão com convites pendentes)
 * e aceita ou recusa cada convite dirigido ao seu email. Vive fora do
 * grupo (app) porque pode ainda não ser membro de nenhum tenant.
 *
 * A lista vem de convites_pendentes() — SECURITY DEFINER filtrada pelo
 * próprio email; um utilizador sem convites vê o estado "tudo tratado".
 */
export default async function ConvitesPendentesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?erro=link");

  const { data } = await supabase.rpc("convites_pendentes");
  const convites = (data ?? []) as ConvitePendente[];

  return (
    <div className="min-h-screen flex items-center justify-center bg-softCream/40 px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <p className="font-body text-xs tracking-widest uppercase text-oliveGray mb-3">
            Convites
          </p>
          <h1 className="font-title text-h1 text-ink">
            Os seus convites pendentes
          </h1>
          <p className="font-body text-sm text-oliveGray mt-4">
            Foi convidado para um ou mais condomínios. Decida, convite a
            convite, se quer aderir.
          </p>
        </div>
        <ConvitesPendentes convites={convites} />
      </div>
    </div>
  );
}
