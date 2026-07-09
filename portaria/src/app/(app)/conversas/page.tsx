import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import type { Conversa } from "@/types/database";

export default async function ConversasPage() {
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");

  const supabase = await createClient();
  const { data } = await supabase
    .from("conversas")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .order("atualizado_em", { ascending: false });

  const lista: Conversa[] = data ?? [];

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-title text-h1 text-ink mb-2">Conversas</h1>
          <p className="font-body text-oliveGray">
            Histórico contínuo por assunto — notas, chamadas, contactos.
          </p>
        </div>
        <Link href="/conversas/nova"
          className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors">
          <Plus className="w-4 h-4" /> Nova conversa
        </Link>
      </div>

      {lista.length === 0 ? (
        <div className="bg-paper border border-warmBeige/20 p-12 text-center">
          <p className="font-body text-oliveGray mb-4">Ainda não há conversas.</p>
          <Link href="/conversas/nova"
            className="font-body text-sm text-warmBeige hover:text-oliveGray transition-colors tracking-widest uppercase">
            Criar a primeira
          </Link>
        </div>
      ) : (
        <div className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
          {lista.map((c) => (
            <Link key={c.id} href={`/conversas/${c.id}`}
              className="flex items-center gap-4 p-4 hover:bg-softCream/40 transition-colors">
              <MessageSquare className="w-4 h-4 text-warmBeige shrink-0" />
              <div className="flex-1 min-w-0">
                <h2 className="font-title text-lg text-ink truncate">{c.assunto}</h2>
                <p className="font-body text-xs text-oliveGray mt-1">
                  Atualizada {new Date(c.atualizado_em).toLocaleDateString("pt-PT", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                  {c.ocorrencia_id && " · ligada a ocorrência"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
