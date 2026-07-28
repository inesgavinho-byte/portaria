import { redirect } from "next/navigation";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { listarConversas, detalheConversa, criarConversa } from "@/lib/actions/ia-rag";
import { ChatSidebar } from "@/components/app/chat-sidebar";
import { ChatInterface } from "@/components/app/chat-interface";

export default async function IAPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  const { id } = await searchParams;
  const conversas = await listarConversas();

  let conversaId = id;
  let mensagens: Awaited<ReturnType<typeof detalheConversa>>["mensagens"] = [];

  if (!conversaId) {
    // Criar nova conversa automaticamente
    const { id: novoId } = await criarConversa();
    if (novoId) {
      redirect(`/ia?id=${novoId}`);
    }
  } else {
    const detalhe = await detalheConversa(conversaId);
    if (detalhe.error) {
      redirect("/ia");
    }
    mensagens = detalhe.mensagens ?? [];
  }

  return (
    <div className="flex h-[calc(100vh-140px)] -mx-6 -my-10 md:-mx-12">
      <ChatSidebar conversas={conversas} conversaAtivaId={conversaId} />
      <div className="flex-1 p-6 md:p-8 overflow-hidden">
        <ChatInterface
          conversaId={conversaId!}
          mensagensIniciais={mensagens ?? []}
        />
      </div>
    </div>
  );
}
