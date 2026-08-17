import { requireAdmin } from "@/lib/supabase/tenant";
import { redirect } from "next/navigation";
import {
  dashboardFinanceiro,
  listarQuotas,
  listarPagamentos,
  listarRecibos,
  obterConfiguracaoFinanceira,
  listarDespesas,
  listarObrigacoes,
  listarFornecedoresFinanceiro,
  listarContratosFinanceiro,
  listarDocumentosAdministracaoFinanceiro,
  obterResumoDespesas,
} from "@/lib/actions/financeiro";
import { FinanceiroTabs } from "@/components/admin/financeiro-tabs";

export const metadata = { title: "Financeiro — Portaria" };

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; ano?: string; mes?: string }>;
}) {
  const ctx = await requireAdmin();
  if (!ctx) redirect("/inicio");

  const params = await searchParams;
  const tab = params.tab ?? "dashboard";
  const ano = params.ano ? parseInt(params.ano) : new Date().getFullYear();
  const mes = params.mes ? parseInt(params.mes) : new Date().getMonth() + 1;

  const [
    dashboard,
    quotas,
    pagamentos,
    recibos,
    configuracao,
    despesas,
    obrigacoes,
    resumoDespesas,
    fornecedores,
    contratos,
    documentosAdministracao,
  ] = await Promise.all([
    dashboardFinanceiro(ano, mes),
    listarQuotas(ano, mes),
    listarPagamentos(),
    listarRecibos(),
    obterConfiguracaoFinanceira(),
    listarDespesas(),
    listarObrigacoes(),
    obterResumoDespesas(),
    listarFornecedoresFinanceiro(),
    listarContratosFinanceiro(),
    listarDocumentosAdministracaoFinanceiro(),
  ]);

  return (
    <div className="max-w-6xl">
      <h1 className="font-title text-h1 text-ink mb-2">Financeiro</h1>
      <p className="font-body text-oliveGray mb-8">
        Gestão de quotas, pagamentos, recibos e controlo de inadimplência.
      </p>

      <FinanceiroTabs
        tab={tab}
        ano={ano}
        mes={mes}
        dashboard={dashboard}
        quotas={quotas}
        pagamentos={pagamentos}
        recibos={recibos}
        configuracao={configuracao}
        despesas={despesas}
        obrigacoes={obrigacoes}
        resumoDespesas={resumoDespesas}
        fornecedores={fornecedores}
        contratos={contratos}
        documentosAdministracao={documentosAdministracao}
      />
    </div>
  );
}
