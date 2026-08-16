"use client";

import { useState } from "react";
import { LockKeyhole, Loader2, ShieldCheck } from "lucide-react";
import { migrarFicheiroHistoricoParaAdministracao } from "@/lib/actions/documentos-administracao";

export function MigrarQuotasHistorico({ tenantId }: { tenantId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function migrar() {
    setLoading(true);
    setMessage(null);
    const result = await migrarFicheiroHistoricoParaAdministracao({
      ficheiroPath: `${tenantId}/historico_2026/EUROPA_quotas_atualizado.xlsx`,
      titulo: "Mapa de quotizações e reconciliação — 2026",
      descricao: "Fonte de trabalho importada para reconciliação financeira. Acesso exclusivo da administração.",
      categoria: "conta",
      ano: 2026,
    });
    setMessage(result.error ?? "Ficheiro migrado para o arquivo confidencial.");
    setLoading(false);
  }

  return (
    <section className="mb-8 border border-warmBeige/30 bg-paper p-5">
      <div className="flex gap-3">
        <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-ink" />
        <div className="min-w-0 flex-1">
          <h2 className="font-title text-lg text-ink">Migrar fonte financeira protegida</h2>
          <p className="mt-1 font-body text-sm text-oliveGray">
            Move `EUROPA_quotas_atualizado.xlsx` da pasta de importação para este arquivo confidencial. O original deixa de existir no bucket partilhado.
          </p>
          <button
            onClick={migrar}
            disabled={loading}
            className="mt-4 inline-flex items-center gap-2 bg-ink px-4 py-2 font-body text-xs uppercase tracking-widest text-paper transition-colors hover:bg-oliveGray disabled:opacity-50"
          >
            {loading ? <><Loader2 className="h-3 w-3 animate-spin" />A migrar...</> : <><ShieldCheck className="h-3 w-3" />Migrar agora</>}
          </button>
          {message && <p className="mt-3 font-body text-sm text-oliveGray">{message}</p>}
        </div>
      </div>
    </section>
  );
}
