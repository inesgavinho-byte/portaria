import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { sanitizarHtml } from "@/lib/sanitize";
import { Mural } from "@/components/condomino/mural";
import type { Aviso } from "@/types/database";
import type { Vista } from "@/lib/actions/vista";

export default async function AvisosPage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  const role = ctx.membership.role;
  const isAdmin = role === "admin";
  const vistas: Vista[] = isAdmin
    ? ["admin", "condomino", "inquilino"]
    : role === "inquilino"
    ? ["inquilino"]
    : ["condomino"];
  const raw = (await cookies()).get("portaria-vista")?.value as Vista | undefined;
  const vista: Vista = isAdmin && raw && vistas.includes(raw) ? raw : vistas[0];

  // Vista de condómino ou inquilino → Mural (inquilino sem financeiro/assembleia)
  if (vista !== "admin") {
    return (
      <Mural
        tenantId={ctx.tenant.id}
        tenantNome={ctx.tenant.nome}
        condominoCompleto={vista === "condomino"}
      />
    );
  }

  // Vista de administração → lista simples dos avisos publicados
  const supabase = await createClient();
  const { data: avisos } = await supabase
    .from("avisos")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .eq("ativo", true)
    .order("publicado_em", { ascending: false });

  return (
    <div>
      <div className="mb-12">
        <h1 className="font-title text-h1 text-ink mb-2">Mural de avisos</h1>
        <p className="font-body text-oliveGray">
          Comunicações da administração ordenadas pela mais recente.
        </p>
      </div>

      {!avisos || avisos.length === 0 ? (
        <div className="bg-paper border border-warmBeige/20 p-12 text-center">
          <p className="font-body text-oliveGray">
            Não existem avisos publicados de momento.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {avisos.map((aviso: Aviso) => (
            <article key={aviso.id} className="bg-paper border-l-4 border-warmBeige p-6">
              <div className="flex items-start justify-between mb-3">
                <h2 className="font-title text-h3 text-ink">{aviso.titulo}</h2>
                {aviso.prioridade !== "normal" && (
                  <span className={`${aviso.prioridade === "urgente" ? "bg-alert text-paper" : "bg-oliveGray text-paper"} font-body text-xs tracking-widest uppercase px-3 py-1`}>
                    {aviso.prioridade}
                  </span>
                )}
              </div>
              <p className="font-body text-xs text-oliveGray">
                {new Date(aviso.publicado_em).toLocaleDateString("pt-PT", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <div
                className="prose prose-sm max-w-none mt-4 font-body text-ink prose-headings:font-title prose-a:text-warmBeige hover:prose-a:text-oliveGray"
                dangerouslySetInnerHTML={{ __html: sanitizarHtml(aviso.conteudo) }}
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
