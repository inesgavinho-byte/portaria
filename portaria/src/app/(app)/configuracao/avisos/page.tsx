import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { Plus } from "lucide-react";
import type { Aviso } from "@/types/database";
import { AvisoActions } from "@/components/admin/aviso-actions";

export default async function ConfigAvisosPage() {
  const ctx = await getCurrentUserInTenant();
  const supabase = await createClient();

  // Admins veem todos os avisos (ativos e inativos), graças à política RLS
  const { data: avisos } = await supabase
    .from("avisos")
    .select("*")
    .eq("tenant_id", ctx!.tenant.id)
    .order("publicado_em", { ascending: false });

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-title text-h1 text-ink mb-2">Gestão de avisos</h1>
          <p className="font-body text-oliveGray">
            Publique, edite e administre as comunicações do condomínio.
          </p>
        </div>
        <Link
          href="/configuracao/avisos/novo"
          className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo aviso
        </Link>
      </div>

      {(!avisos || avisos.length === 0) ? (
        <div className="bg-paper border border-warmBeige/20 p-12 text-center">
          <p className="font-body text-oliveGray mb-4">
            Ainda não existem avisos publicados.
          </p>
          <Link
            href="/configuracao/avisos/novo"
            className="font-body text-sm text-warmBeige hover:text-oliveGray transition-colors tracking-widest uppercase"
          >
            Criar o primeiro
          </Link>
        </div>
      ) : (
        <div className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
          {avisos.map((aviso: Aviso) => (
            <div
              key={aviso.id}
              className={`p-4 flex items-start gap-4 ${
                !aviso.ativo ? "opacity-50" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-title text-lg text-ink truncate">
                    {aviso.titulo}
                  </h2>
                  {aviso.prioridade !== "normal" && (
                    <span className="font-body text-xs uppercase tracking-widest text-oliveGray">
                      · {aviso.prioridade}
                    </span>
                  )}
                  {!aviso.ativo && (
                    <span className="font-body text-xs uppercase tracking-widest text-alert">
                      · arquivado
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
              </div>
              <AvisoActions aviso={aviso} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
