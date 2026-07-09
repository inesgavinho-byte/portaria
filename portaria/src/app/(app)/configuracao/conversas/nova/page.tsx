import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { ConversaNovaForm } from "@/components/admin/conversa-nova-form";

export default async function NovaConversaPage() {
  const ctx = await requireAdmin();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: ocorrencias } = await supabase
    .from("ocorrencias")
    .select("id, titulo")
    .eq("tenant_id", ctx.tenant.id)
    .order("criado_em", { ascending: false })
    .limit(100);

  return (
    <div>
      <Link href="/configuracao/conversas"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-4 transition-colors">
        <ChevronLeft className="w-3 h-3" /> Voltar
      </Link>
      <h1 className="font-title text-h1 text-ink mb-2">Nova conversa</h1>
      <p className="font-body text-oliveGray mb-8">
        Um assunto com histórico contínuo, opcionalmente ligado a uma ocorrência.
      </p>
      <ConversaNovaForm ocorrencias={ocorrencias ?? []} />
    </div>
  );
}
