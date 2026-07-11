import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { MembroActions, ConviteActions } from "@/components/admin/membro-actions";
import { MembroFracaoSelect } from "@/components/admin/membro-fracao-select";
import type { Convite, UserTenant } from "@/types/database";

const ROLE_LABEL: Record<UserTenant["role"], string> = {
  admin: "Administração",
  comissao: "Comissão",
  condomino: "Condómino",
  inquilino: "Inquilino",
};

export default async function MembrosPage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const [{ data: membros }, { data: convites }, { data: fracoes }] =
    await Promise.all([
      supabase
        .from("user_tenants")
        .select("*")
        .eq("tenant_id", ctx.tenant.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("convites")
        .select("*")
        .eq("tenant_id", ctx.tenant.id)
        .is("aceite_em", null)
        .order("criado_em", { ascending: false }),
      supabase
        .from("fracoes")
        .select("id, codigo")
        .eq("tenant_id", ctx.tenant.id)
        .order("codigo", { ascending: true }),
    ]);

  const listaMembros: UserTenant[] = membros ?? [];
  const listaConvites: Convite[] = convites ?? [];
  const listaFracoes = fracoes ?? [];
  const emails = await emailsPorUserId(listaMembros.map((m) => m.user_id));

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-title text-h1 text-ink mb-2">Membros</h1>
          <p className="font-body text-oliveGray">
            Quem tem acesso à plataforma do condomínio.
          </p>
        </div>
        <Link
          href="/configuracao/membros/novo"
          className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors"
        >
          <Plus className="w-4 h-4" />
          Convidar
        </Link>
      </div>

      {listaConvites.length > 0 && (
        <section className="mb-12">
          <h2 className="font-title text-h3 text-warmBeige mb-4">
            Convites pendentes
          </h2>
          <div className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
            {listaConvites.map((convite) => (
              <div key={convite.id} className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-body text-ink truncate">{convite.email}</p>
                  <p className="font-body text-xs text-oliveGray mt-1">
                    {ROLE_LABEL[convite.role]}
                    {convite.fracao && ` · ${convite.fracao}`}
                    {" · expira "}
                    {new Date(convite.expira_em).toLocaleDateString("pt-PT", {
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                </div>
                <ConviteActions conviteId={convite.id} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        {listaConvites.length > 0 && (
          <h2 className="font-title text-h3 text-warmBeige mb-4">
            Com acesso
          </h2>
        )}
        <div className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
          {listaMembros.map((membro) => (
            <div key={membro.id} className="p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-body text-ink truncate">
                  {emails.get(membro.user_id) ?? "—"}
                  {membro.user_id === ctx.user.id && (
                    <span className="font-body text-xs text-oliveGray"> (você)</span>
                  )}
                </p>
                <p className="font-body text-xs text-oliveGray mt-1">
                  {ROLE_LABEL[membro.role]}
                </p>
              </div>
              <MembroFracaoSelect
                membershipId={membro.id}
                fracaoId={membro.fracao_id}
                fracoes={listaFracoes}
              />
              <MembroActions
                membershipId={membro.id}
                isSelf={membro.user_id === ctx.user.id}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * Emails dos membros via admin API (auth.users não é legível com RLS).
 * Sem chave de serviço configurada, degrada para "—".
 */
async function emailsPorUserId(
  userIds: string[]
): Promise<Map<string, string>> {
  const emails = new Map<string, string>();
  const admin = createAdminClient();
  if (!admin || userIds.length === 0) return emails;

  const resultados = await Promise.all(
    userIds.map((id) => admin.auth.admin.getUserById(id))
  );
  resultados.forEach(({ data }, i) => {
    if (data?.user?.email) emails.set(userIds[i], data.user.email);
  });
  return emails;
}
