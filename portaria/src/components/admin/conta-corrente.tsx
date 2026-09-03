import type { QuotaMensal } from "@/types/database";
import { saldoQuota } from "@/lib/financeiro/alocacao";

const EURO = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const ESTADO_CLASSE: Record<string, string> = {
  pago: "text-success",
  parcial: "text-alert",
  pendente: "text-alert",
  isento: "text-oliveGray",
};

export type QuotaContaCorrente = QuotaMensal & { fracao_codigo?: string | null };

/**
 * Conta corrente de quotas, mês a mês: devida, pago (alocação real em
 * pago_cents), saldo e estado. Partilha-se entre o dossiê da fração e a
 * ficha do condómino — a fonte é sempre quotas_mensais, que o trigger de
 * alocação (20260903010000) mantém verdadeira.
 */
export function ContaCorrente({
  quotas,
  titulo = "Conta corrente",
  comFracoes = false,
}: {
  quotas: QuotaContaCorrente[];
  titulo?: string;
  comFracoes?: boolean;
}) {
  const ordenadas = [...quotas].sort(
    (a, b) => a.ano - b.ano || a.mes - b.mes,
  );

  const totalDevida = ordenadas.reduce((s, q) => s + q.valor_cents, 0);
  const totalPago = ordenadas.reduce((s, q) => s + Math.min(q.pago_cents, q.valor_cents), 0);
  const totalSaldo = ordenadas.reduce((s, q) => s + saldoQuota(q), 0);

  return (
    <section className="bg-paper border border-warmBeige/20">
      <div className="p-5 md:p-6 border-b border-warmBeige/15">
        <h2 className="font-title text-xl text-ink">{titulo}</h2>
        <p className="font-body text-sm text-oliveGray mt-1">
          Quota a quota: o que devia, o que pagou (alocação real dos
          pagamentos) e o saldo que fica.
        </p>
      </div>
      {ordenadas.length === 0 ? (
        <div className="p-8 text-center">
          <p className="font-body text-sm text-oliveGray">Ainda não há quotas geradas para esta seleção.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full font-body text-sm">
            <thead>
              <tr className="border-b border-warmBeige/15 text-left text-xs tracking-widest uppercase text-oliveGray">
                <th className="px-5 py-3 font-normal">Período</th>
                {comFracoes && <th className="px-3 py-3 font-normal">Fração</th>}
                <th className="px-3 py-3 font-normal">Vencimento</th>
                <th className="px-3 py-3 font-normal text-right">Devida</th>
                <th className="px-3 py-3 font-normal text-right">Pago</th>
                <th className="px-3 py-3 font-normal text-right">Saldo</th>
                <th className="px-5 py-3 font-normal">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warmBeige/10">
              {ordenadas.map((quota) => {
                const saldo = saldoQuota(quota);
                const pago = Math.min(quota.pago_cents, quota.valor_cents);
                return (
                  <tr key={quota.id} className="text-ink">
                    <td className="px-5 py-3">{String(quota.mes).padStart(2, "0")}/{quota.ano}</td>
                    {comFracoes && <td className="px-3 py-3 text-oliveGray">{quota.fracao_codigo ?? "—"}</td>}
                    <td className="px-3 py-3 text-oliveGray">
                      {quota.vencimento
                        ? new Date(`${quota.vencimento}T00:00:00`).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-3 py-3 text-right">{EURO.format(quota.valor_cents / 100)}</td>
                    <td className="px-3 py-3 text-right">{pago > 0 ? EURO.format(pago / 100) : "—"}</td>
                    <td className={`px-3 py-3 text-right ${saldo > 0 ? "text-alert" : "text-success"}`}>
                      {EURO.format(saldo / 100)}
                    </td>
                    <td className={`px-5 py-3 capitalize ${ESTADO_CLASSE[quota.estado] ?? "text-oliveGray"}`}>
                      {quota.estado}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-warmBeige/25 font-medium">
                <td className="px-5 py-3" colSpan={comFracoes ? 3 : 2}>Totais</td>
                <td className="px-3 py-3 text-right">{EURO.format(totalDevida / 100)}</td>
                <td className="px-3 py-3 text-right">{EURO.format(totalPago / 100)}</td>
                <td className={`px-3 py-3 text-right ${totalSaldo > 0 ? "text-alert" : "text-success"}`}>
                  {EURO.format(totalSaldo / 100)}
                </td>
                <td className="px-5 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
