import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import type { Fornecedor } from "@/types/database";

export default async function FornecedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ arquivados?: string }>;
}) {
  const { arquivados } = await searchParams;
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");
  const verArquivados = arquivados === "1";

  const supabase = await createClient();
  const { data } = await supabase
    .from("fornecedores")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .eq("ativo", !verArquivados)
    .order("nome", { ascending: true });

  const lista: Fornecedor[] = data ?? [];

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-title text-h1 text-ink mb-2">Fornecedores</h1>
          <p className="font-body text-oliveGray">
            Empresas e prestadores de serviços do condomínio.
          </p>
        </div>
        <Link href="/fornecedores/novo"
          className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors">
          <Plus className="w-4 h-4" /> Novo fornecedor
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        <Link href="/fornecedores"
          className={`px-4 py-1.5 border font-body text-xs tracking-widest uppercase transition-colors ${
            !verArquivados ? "bg-ink text-paper border-ink" : "border-warmBeige/40 text-oliveGray hover:text-ink"
          }`}>Ativos</Link>
        <Link href="/fornecedores?arquivados=1"
          className={`px-4 py-1.5 border font-body text-xs tracking-widest uppercase transition-colors ${
            verArquivados ? "bg-ink text-paper border-ink" : "border-warmBeige/40 text-oliveGray hover:text-ink"
          }`}>Arquivados</Link>
      </div>

      {lista.length === 0 ? (
        <div className="bg-paper border border-warmBeige/20 p-12 text-center">
          <p className="font-body text-oliveGray">
            {verArquivados ? "Sem fornecedores arquivados." : "Ainda não há fornecedores."}
          </p>
        </div>
      ) : (
        <div className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
          {lista.map((f) => (
            <Link key={f.id} href={`/fornecedores/${f.id}`}
              className="flex items-center justify-between gap-4 p-4 hover:bg-softCream/40 transition-colors">
              <div className="min-w-0">
                <div className="flex items-baseline gap-3">
                  <h2 className="font-title text-lg text-ink truncate">{f.nome}</h2>
                  {f.categoria && (
                    <span className="font-body text-xs text-oliveGray">{f.categoria}</span>
                  )}
                </div>
                <p className="font-body text-sm text-oliveGray mt-1 truncate">
                  {[f.contacto_nome, f.telefone, f.email].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
