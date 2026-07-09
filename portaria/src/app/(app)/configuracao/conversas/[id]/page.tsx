import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { ConversaMensagemForm } from "@/components/admin/conversa-mensagem-form";
import type { Conversa, ConversaMensagem } from "@/types/database";

export default async function ConversaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAdmin();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: conversa } = await supabase
    .from("conversas")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (!conversa) notFound();
  const c = conversa as Conversa;

  const { data: mensagens } = await supabase
    .from("conversa_mensagens")
    .select("*")
    .eq("conversa_id", id)
    .order("criado_em", { ascending: true });
  const lista = (mensagens ?? []) as ConversaMensagem[];

  return (
    <div className="max-w-2xl">
      <Link href="/configuracao/conversas"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-6 transition-colors">
        <ChevronLeft className="w-3 h-3" /> Conversas
      </Link>

      <h1 className="font-title text-h1 text-ink mb-2">{c.assunto}</h1>
      {c.ocorrencia_id && (
        <Link href={`/configuracao/ocorrencias/${c.ocorrencia_id}`}
          className="inline-flex items-center gap-2 font-body text-xs tracking-widest uppercase text-warmBeige hover:text-oliveGray transition-colors mb-8">
          <AlertCircle className="w-3.5 h-3.5" /> Ver ocorrência ligada
        </Link>
      )}

      <div className="space-y-4 my-8">
        {lista.length === 0 ? (
          <p className="font-body text-sm text-oliveGray">Sem mensagens ainda.</p>
        ) : (
          lista.map((m) => (
            <div key={m.id} className="bg-paper border border-warmBeige/20 p-4">
              <p className="font-body text-ink whitespace-pre-line">{m.corpo}</p>
              <p className="font-body text-xs text-oliveGray mt-2">
                {new Date(m.criado_em).toLocaleString("pt-PT", {
                  day: "numeric", month: "long", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="pt-6 border-t border-warmBeige/20">
        <ConversaMensagemForm conversaId={c.id} />
      </div>
    </div>
  );
}
