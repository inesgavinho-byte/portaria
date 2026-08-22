import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/tenant";
import { obterMapaContasAnual } from "@/lib/actions/mapa-contas";
import { MapaContasAnualView } from "@/components/admin/mapa-contas-anual";

export const metadata = { title: "Mapa de contas — Portaria" };

export default async function MapaContasPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const ctx = await requireAdmin();
  if (!ctx) redirect("/inicio");

  const params = await searchParams;
  const ano = params.ano ? Number.parseInt(params.ano, 10) : undefined;
  const mapa = await obterMapaContasAnual(Number.isFinite(ano) ? ano : undefined);

  return (
    <div className="max-w-none">
      <div className="mb-7">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-britishGreen">Financeiro</p>
        <h1 className="text-h1 font-semibold tracking-[-0.04em] text-ink">Mapa de contas</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-oliveGray">
          Visão anual viva das contas do condomínio: orçamento, realizado, compromissos, previsão e histórico documental.
        </p>
      </div>
      <MapaContasAnualView mapa={mapa} />
    </div>
  );
}
