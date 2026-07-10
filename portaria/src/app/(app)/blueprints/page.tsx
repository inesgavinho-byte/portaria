import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { BLUEPRINTS_BASE } from "@/lib/blueprints";
import type { Blueprint } from "@/types/database";

export default async function BlueprintsPage() {
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");

  const supabase = await createClient();

  // Garante que os 3 modelos base existem para este condomínio.
  // on_conflict (tenant_id, tipo) → não duplica nem sobrepõe edições.
  await supabase.from("blueprints").upsert(
    BLUEPRINTS_BASE.map((b) => ({
      tenant_id: ctx.tenant.id,
      nome: b.nome,
      tipo: b.tipo,
      conteudo_template: b.conteudo_template,
      variaveis: b.variaveis,
    })),
    { onConflict: "tenant_id,tipo", ignoreDuplicates: true }
  );

  const { data } = await supabase
    .from("blueprints")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .order("nome", { ascending: true });

  const blueprints = (data ?? []) as Blueprint[];

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-title text-h1 text-ink mb-2">Modelos de documento</h1>
        <p className="font-body text-oliveGray">
          Modelos com os dados do {ctx.tenant.nome} já preenchidos. Abra um
          modelo para o ver pronto a usar.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {blueprints.map((b) => (
          <Link
            key={b.id}
            href={`/blueprints/${b.id}`}
            className="group flex items-start gap-4 border border-warmBeige/30 p-6 hover:border-warmBeige hover:bg-softCream/40 transition-colors"
          >
            <FileText className="w-5 h-5 text-warmBeige shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h2 className="font-title text-lg text-ink mb-1 flex items-center gap-2">
                {b.nome}
                <ArrowRight className="w-3.5 h-3.5 text-oliveGray transition-transform group-hover:translate-x-1" />
              </h2>
              <p className="font-body text-sm text-oliveGray">
                {b.variaveis.length} variáveis preenchidas automaticamente.
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
