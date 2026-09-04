import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { FracoesDirectory } from "@/components/admin/fracoes-directory";
import type { Fracao } from "@/types/database";

export default async function FracoesPage() {
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");

  const supabase = await createClient();
  const { data: fracoes } = await supabase
    .from("fracoes")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .order("codigo", { ascending: true });

  const lista: Fracao[] = fracoes ?? [];
  const totalPermilagem = lista.reduce(
    (soma, fracao) => soma + Number(fracao.permilagem ?? 0),
    0,
  );
  const arrendadas = lista.filter((fracao) => fracao.inquilino_nome).length;
  const incompletas = lista.filter(
    (fracao) =>
      !fracao.proprietario_nome ||
      (!fracao.proprietario_email && !fracao.proprietario_telefone) ||
      fracao.permilagem == null,
  ).length;
  const permilagemCompleta = Math.abs(totalPermilagem - 1000) < 0.01;

  return (
    <div className="pb-12">
      <header className="flex flex-col gap-8 border-b border-black/[0.07] pb-9 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="doorkeeper-eyebrow mb-5">Edifício · Pessoas e propriedade</p>
          <h1 className="font-title text-[clamp(3.4rem,7vw,6.2rem)] font-normal leading-[0.88] text-ink">
            {lista.length} {lista.length === 1 ? "fração" : "frações"}.
          </h1>
          <p className="mt-6 max-w-xl font-body text-base leading-relaxed text-oliveGray">
            O registo central de proprietários, inquilinos e dados de cada unidade do {ctx.tenant.nome}.
          </p>
        </div>
        <Link
          href="/fracoes/nova"
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-doorkeeperTerracotta px-6 font-body text-sm font-semibold text-white transition-colors hover:bg-doorkeeperBrown md:self-auto"
        >
          <Plus className="h-4 w-4" />
          Nova fração
        </Link>
      </header>

      <dl className="grid grid-cols-2 border-b border-black/[0.07] lg:grid-cols-4">
        <Resumo label="Registadas" valor={String(lista.length)} />
        <Resumo label="Arrendadas" valor={String(arrendadas)} />
        <Resumo
          label="A completar"
          valor={String(incompletas)}
          alerta={incompletas > 0}
        />
        <Resumo
          label="Permilagem"
          valor={`${totalPermilagem.toLocaleString("pt-PT", { maximumFractionDigits: 2 })}‰`}
          detalhe={permilagemCompleta ? "Completa" : "Deve somar 1 000‰"}
          alerta={!permilagemCompleta}
        />
      </dl>

      <FracoesDirectory fracoes={lista} />
    </div>
  );
}

function Resumo({
  label,
  valor,
  detalhe,
  alerta = false,
}: {
  label: string;
  valor: string;
  detalhe?: string;
  alerta?: boolean;
}) {
  return (
    <div className="border-r border-black/[0.07] px-1 py-6 last:border-r-0 sm:px-5 lg:py-7">
      <dt className="doorkeeper-eyebrow">{label}</dt>
      <dd className={`mt-2 font-title text-3xl font-normal ${alerta ? "text-doorkeeperTerracotta" : "text-ink"}`}>
        {valor}
      </dd>
      {detalhe && (
        <p className={`mt-1 font-body text-xs ${alerta ? "text-doorkeeperTerracotta" : "text-oliveGray"}`}>
          {detalhe}
        </p>
      )}
    </div>
  );
}
