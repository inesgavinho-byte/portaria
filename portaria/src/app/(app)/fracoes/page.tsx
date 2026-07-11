import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { FracaoActions } from "@/components/admin/fracao-actions";
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
  const totalPermilagem = lista.reduce((s, f) => s + (f.permilagem ?? 0), 0);

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-title text-h1 text-ink mb-2">Frações</h1>
          <p className="font-body text-oliveGray">
            As frações do {ctx.tenant.nome}, respetivos proprietários e
            permilagens.
          </p>
        </div>
        <Link
          href="/fracoes/nova"
          className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova fração
        </Link>
      </div>

      {lista.length === 0 ? (
        <div className="bg-paper border border-warmBeige/20 p-12 text-center">
          <p className="font-body text-oliveGray mb-4">
            Ainda não há frações registadas.
          </p>
          <Link
            href="/fracoes/nova"
            className="font-body text-sm text-warmBeige hover:text-oliveGray transition-colors tracking-widest uppercase"
          >
            Criar a primeira
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
            {lista.map((f) => (
              <div key={f.id} className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3">
                    <h2 className="font-title text-lg text-ink">{f.codigo}</h2>
                    {f.tipologia && (
                      <span className="font-body text-xs text-oliveGray">
                        {f.tipologia}
                      </span>
                    )}
                    {f.permilagem != null && (
                      <span className="font-body text-xs text-oliveGray">
                        · {f.permilagem}‰
                      </span>
                    )}
                  </div>
                  <p className="font-body text-sm text-oliveGray mt-1 truncate">
                    {f.proprietario_nome ?? "Sem proprietário registado"}
                    {f.inquilino_nome && ` · inquilino: ${f.inquilino_nome}`}
                  </p>
                </div>
                <Link
                  href={`/configuracao/membros/novo?role=inquilino&fracao=${encodeURIComponent(f.codigo)}`}
                  title="Convidar inquilino para esta fração"
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 border border-warmBeige/40 font-body text-[11px] tracking-widest uppercase text-oliveGray hover:text-ink hover:border-warmBeige transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Inquilino
                </Link>
                <FracaoActions fracaoId={f.id} />
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between font-body text-sm">
            <span className="text-oliveGray">
              {lista.length} {lista.length === 1 ? "fração" : "frações"}
            </span>
            <span
              className={
                Math.abs(totalPermilagem - 1000) < 0.01
                  ? "text-success"
                  : "text-oliveGray"
              }
            >
              Permilagem total: {totalPermilagem.toFixed(2)}‰
              {Math.abs(totalPermilagem - 1000) >= 0.01 && " (deve somar 1000)"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
