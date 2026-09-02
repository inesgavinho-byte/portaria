import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/tenant";
import { listarMovimentosRecebimento } from "@/lib/actions/recebimentos";
import { RecebimentoClassificacao } from "@/components/admin/recebimento-classificacao";

export const metadata = { title: "Recebimentos por classificar — Portaria" };

const euro = (cents: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(cents / 100);

/**
 * Fecho do ciclo de recebimentos: créditos bancários sem pagamento ligado,
 * com sugestões de fracção e de quotas que fecham com o valor. Registar aqui
 * cria o pagamento e reconcilia o movimento — não emite recibo nem altera
 * estados de quotas (semântica do registarPagamento).
 */
export default async function RecebimentosPage() {
  const ctx = await requireAdmin();
  if (!ctx) redirect("/inicio");

  const { porClassificar, classificados } = await listarMovimentosRecebimento();
  const totalCents = porClassificar.reduce((total, movimento) => total + movimento.valorCents, 0);

  return (
    <div className="max-w-3xl">
      <div className="mb-7">
        <p className="mb-1 font-body text-xs font-semibold uppercase tracking-[0.12em] text-britishGreen">
          Financeiro
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-title text-h1 text-ink">Recebimentos por classificar</h1>
          <Link
            href="/configuracao/financeiro/movimentos"
            className="rounded-lg border border-britishGreen/15 px-3 py-1.5 font-body text-xs font-semibold text-oliveGray transition-colors hover:text-britishGreen"
          >
            Movimentos
          </Link>
        </div>
        <p className="mt-2 max-w-xl font-body text-sm leading-6 text-oliveGray">
          Transferências recebidas que ainda não estão ligadas a um pagamento de quotas. As sugestões de fracção
          aceleram a decisão — confirmar é sempre contigo.
        </p>
      </div>

      <div className="mb-6">
        <div className="portaria-panel px-4 py-4">
          <p className="font-body text-[0.67rem] font-semibold uppercase tracking-[0.11em] text-oliveGray">
            Por classificar
          </p>
          <p className="mt-2 font-body text-xl font-semibold tracking-[-0.025em] text-ink">
            {porClassificar.length} movimento{porClassificar.length === 1 ? "" : "s"} ·{" "}
            <span className={totalCents > 0 ? "text-britishGreen" : undefined}>{euro(totalCents)}</span>
          </p>
          <p className="mt-1 font-body text-xs text-oliveGray">
            {classificados} crédito{classificados === 1 ? "" : "s"} já reconciliado{classificados === 1 ? "" : "s"}.
          </p>
        </div>
      </div>

      {porClassificar.length === 0 ? (
        <p className="border-l-2 border-warmBeige/50 bg-softCream/40 px-4 py-3 font-body text-sm text-oliveGray">
          Não há recebimentos por classificar. Os créditos do extrato aparecem aqui depois de importados.
        </p>
      ) : (
        <RecebimentoClassificacao movimentos={porClassificar} />
      )}
    </div>
  );
}
