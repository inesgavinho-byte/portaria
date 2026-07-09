import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { reunirAcoes, saudacao } from "@/lib/inicio";

/**
 * Centro de Trabalho — o ponto de entrada diário do administrador.
 * abrir → ver trabalho → agir. Só admins; condóminos vão para /avisos.
 */
export default async function InicioPage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");
  if (ctx.membership.role !== "admin") redirect("/avisos");

  const acoes = await reunirAcoes(ctx.tenant.id);

  return (
    <div className="max-w-2xl">
      <h1 className="font-title text-display text-ink mb-3">{saudacao()}</h1>

      {acoes.length === 0 ? (
        <div className="mt-10 flex items-center gap-3 text-oliveGray">
          <Check className="w-5 h-5 text-success" />
          <p className="font-body text-lg">Tudo concluído.</p>
        </div>
      ) : (
        <>
          <p className="font-body text-lg text-oliveGray mb-10">
            {acoes.length === 1
              ? "Hoje existe uma ação importante."
              : `Hoje existem ${acoes.length} ações importantes.`}
          </p>
          <div className="space-y-3">
            {acoes.map((acao) => (
              <Link
                key={acao.chave}
                href={acao.href}
                className="group flex items-center justify-between gap-4 border border-warmBeige/30 bg-paper px-6 py-5 hover:border-warmBeige hover:bg-softCream/40 transition-colors"
              >
                <span className="font-body text-ink">{acao.texto}</span>
                <ArrowRight className="w-4 h-4 text-oliveGray shrink-0 transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
