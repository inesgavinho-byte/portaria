import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Sparkles } from "lucide-react";
import { requireAdmin } from "@/lib/supabase/tenant";
import { criarSessaoDocumental, carregarSessaoDocumental } from "@/lib/actions/ia-documental";
import { AssistenteDocumentalChat } from "@/components/admin/assistente-documental-chat";

export default async function AssistenteBlueprintPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sessao?: string }> }) {
  const { id } = await params;
  const { sessao: sessaoId } = await searchParams;
  const ctx = await requireAdmin();
  if (!ctx) redirect("/login");

  let idSessao = sessaoId;
  if (!idSessao) {
    const criada = await criarSessaoDocumental(id);
    if (!criada.id) notFound();
    idSessao = criada.id;
  }
  const carregada = await carregarSessaoDocumental(idSessao);
  if (!carregada.sessao || !carregada.blueprint) notFound();

  return <div className="max-w-7xl"><Link href={`/blueprints/${id}`} className="mb-6 inline-flex items-center gap-1 font-body text-xs uppercase tracking-widest text-oliveGray hover:text-ink"><ChevronLeft className="h-3 w-3" />{carregada.blueprint.nome}</Link><div className="mb-8 flex items-start gap-3"><Sparkles className="mt-1 h-6 w-6 text-warmBeige" /><div><p className="font-body text-xs uppercase tracking-widest text-oliveGray">Elaboração assistida</p><h1 className="font-title text-h1 text-ink">{carregada.blueprint.nome}</h1><p className="mt-2 max-w-3xl font-body text-oliveGray">Registe os pontos como numa conversa. A assistente organiza o rascunho, cita fontes configuradas e deixa a aprovação final consigo.</p></div></div><AssistenteDocumentalChat sessaoInicial={carregada.sessao} mensagensIniciais={carregada.mensagens ?? []} /></div>;
}
