import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/tenant";
import { createClient } from "@/lib/supabase/server";
import { listarRegras } from "@/lib/actions/regras-classificacao";
import { RegrasClassificacaoForm, type FornecedorOpcao } from "@/components/admin/regras-classificacao-form";

export const metadata = { title: "Regras de triagem — Portaria" };

/**
 * Regras de classificação movimento → fornecedor. Uma regra criada aqui é a
 * decisão permanente de uma pessoa: aplica-se sozinha aos movimentos
 * pendentes (também aos que chegam de extrato novo), com proveniência
 * «regra» visível e reversível com um clique na triagem.
 */
export default async function RegrasClassificacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ padrao?: string; fornecedor?: string }>;
}) {
  const ctx = await requireAdmin();
  if (!ctx) redirect("/inicio");

  const [filtros, regras] = await Promise.all([searchParams, listarRegras()]);

  const supabase = await createClient();
  const { data: fornecedoresData } = await supabase
    .from("fornecedores")
    .select("id,nome,ativo")
    .eq("tenant_id", ctx.tenant.id)
    .order("nome", { ascending: true });

  const fornecedores: FornecedorOpcao[] = fornecedoresData ?? [];
  // Prefill vem da triagem («criar regra» num movimento pendente): o padrão
  // já chega normalizado; o fornecedor é opcional.
  const prefillPadrao = filtros.padrao?.slice(0, 120);
  const prefillFornecedorId = fornecedores.some((f) => f.id === filtros.fornecedor)
    ? filtros.fornecedor
    : undefined;

  return (
    <div className="max-w-2xl">
      <div className="mb-7">
        <p className="mb-1 font-body text-xs font-semibold uppercase tracking-[0.12em] text-britishGreen">
          Financeiro
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-title text-h1 text-ink">Regras de triagem</h1>
          <Link
            href="/configuracao/financeiro/movimentos"
            className="rounded-lg border border-britishGreen/15 px-3 py-1.5 font-body text-xs font-semibold text-oliveGray transition-colors hover:text-britishGreen"
          >
            Movimentos
          </Link>
        </div>
        <p className="mt-2 max-w-xl font-body text-sm leading-6 text-oliveGray">
          Quando a descrição de um movimento contém o padrão, a regra atribui o fornecedor — ou marca como sem
          fornecedor — sem precisar de ti. Cada movimento classificado por regra fica com origem «regra» e pode ser
          corrigido à mão a qualquer momento.
        </p>
      </div>

      <RegrasClassificacaoForm
        regras={regras}
        fornecedores={fornecedores}
        prefillPadrao={prefillPadrao}
        prefillFornecedorId={prefillFornecedorId}
      />
    </div>
  );
}
