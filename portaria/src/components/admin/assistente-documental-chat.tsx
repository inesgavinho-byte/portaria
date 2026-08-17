"use client";

import { useState } from "react";
import { CheckCircle2, FilePenLine, Loader2, Send, ShieldAlert, Sparkles } from "lucide-react";
import { aprovarRascunhoDocumental, enviarMensagemDocumental, exportarRascunhoDocumental, guardarRascunhoDocumental } from "@/lib/actions/ia-documental";
import type { IADocumentalMensagem, IADocumentalSessao } from "@/types/database";

export function AssistenteDocumentalChat({ sessaoInicial, mensagensIniciais }: { sessaoInicial: IADocumentalSessao; mensagensIniciais: IADocumentalMensagem[] }) {
  const [sessao, setSessao] = useState(sessaoInicial);
  const [mensagens, setMensagens] = useState(mensagensIniciais);
  const [texto, setTexto] = useState("");
  const [rascunho, setRascunho] = useState(sessaoInicial.rascunho_html ?? "");
  const [loading, setLoading] = useState(false);
  const [estado, setEstado] = useState<string | null>(null);

  async function enviar() {
    const entrada = texto.trim();
    if (!entrada || loading) return;
    setLoading(true); setEstado(null); setTexto("");
    const resultado = await enviarMensagemDocumental(sessao.id, entrada);
    if (resultado.indisponivel) setEstado("A IA ainda não está configurada. A administração deve definir OPENAI_API_KEY na Netlify.");
    else if (resultado.error) setEstado(resultado.error);
    else {
      if (resultado.sessao) { setSessao(resultado.sessao); setRascunho(resultado.sessao.rascunho_html ?? rascunho); }
      if (resultado.mensagens) setMensagens(resultado.mensagens);
    }
    setLoading(false);
  }

  async function guardarRevisao() {
    setEstado("A guardar rascunho…");
    const resultado = await guardarRascunhoDocumental(sessao.id, rascunho);
    setEstado(resultado.error ?? "Rascunho guardado para revisão humana.");
    if (!resultado.error) setSessao({ ...sessao, rascunho_html: rascunho, estado: "em_revisao" });
  }

  async function aprovar() {
    setEstado("A registar aprovação…");
    const resultado = await aprovarRascunhoDocumental(sessao.id);
    setEstado(resultado.error ?? "Rascunho aprovado. Pode agora exportá-lo para PDF.");
    if (!resultado.error) setSessao({ ...sessao, estado: "aprovado" });
  }

  async function exportar() {
    setEstado("A gerar PDF aprovado…");
    const resultado = await exportarRascunhoDocumental(sessao.id);
    setEstado(resultado.error ?? (resultado.documentoId ? "PDF aprovado guardado na biblioteca de Documentos." : "Documento exportado."));
  }

  return <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
    <section className="flex min-h-[680px] flex-col border border-warmBeige/25 bg-paper">
      <header className="border-b border-warmBeige/20 px-5 py-4"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-warmBeige" /><h2 className="font-title text-xl text-ink">Conversa de preparação</h2></div><p className="mt-1 font-body text-xs text-oliveGray">Registe os pontos à medida que são discutidos. A IA pede apenas os elementos em falta.</p></header>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {mensagens.map((mensagem) => <article key={mensagem.id} className={mensagem.papel === "administrador" ? "ml-6 border-l-2 border-ink/50 pl-3" : "mr-4 border-l-2 border-warmBeige/60 pl-3"}><p className="font-body text-[11px] uppercase tracking-widest text-oliveGray">{mensagem.papel === "administrador" ? "Administração" : mensagem.papel === "assistente" ? "Assistente documental" : "Sistema"}</p><p className="mt-1 whitespace-pre-wrap font-body text-sm text-ink">{mensagem.conteudo}</p>{mensagem.citacoes?.length > 0 && <p className="mt-2 font-body text-xs text-oliveGray">Fontes: {mensagem.citacoes.map((c) => c.referencia || c.titulo).join(" · ")}</p>}</article>)}
        {loading && <p className="flex items-center gap-2 font-body text-sm text-oliveGray"><Loader2 className="h-4 w-4 animate-spin" />A estruturar o rascunho…</p>}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); enviar(); }} className="border-t border-warmBeige/20 p-4"><textarea value={texto} onChange={(e) => setTexto(e.target.value)} disabled={loading || sessao.estado === "aprovado"} rows={4} placeholder="Ex.: Foram discutidas três propostas para reparação da cobertura…" className="w-full border border-warmBeige/35 bg-paper p-3 font-body text-sm text-ink focus:outline-none focus:border-warmBeige" /><button type="submit" disabled={!texto.trim() || loading || sessao.estado === "aprovado"} className="mt-3 inline-flex items-center gap-2 bg-ink px-4 py-2.5 font-body text-xs uppercase tracking-widest text-paper disabled:opacity-40"><Send className="h-4 w-4" />Adicionar ponto</button></form>
    </section>
    <section className="min-w-0 border border-warmBeige/25 bg-paper">
      <header className="border-b border-warmBeige/20 px-5 py-4"><div className="flex items-center justify-between gap-3"><div><h2 className="font-title text-xl text-ink">Rascunho assistido</h2><p className="mt-1 font-body text-xs text-oliveGray">Estado: {sessao.estado.replace("_", " ")}</p></div>{sessao.estado === "aprovado" && <CheckCircle2 className="h-5 w-5 text-warmBeige" />}</div></header>
      <div className="space-y-4 p-5"><div className="border border-warmBeige/20 bg-softCream/25 p-3"><p className="flex items-center gap-2 font-body text-xs text-oliveGray"><ShieldAlert className="h-4 w-4 text-warmBeige" />A IA não emite nem envia documentos. Revise o conteúdo e valide os factos antes de aprovar.</p></div>{sessao.avisos?.length > 0 && <div className="border-l-2 border-warmBeige/70 pl-3"><p className="font-body text-xs uppercase tracking-widest text-oliveGray">Pontos a confirmar</p>{sessao.avisos.slice(-6).map((aviso, i) => <p key={i} className="mt-1 font-body text-sm text-ink">{aviso}</p>)}</div>}<label className="block"><span className="mb-1.5 flex items-center gap-2 font-body text-[11px] uppercase tracking-widest text-oliveGray"><FilePenLine className="h-3.5 w-3.5" />Editar rascunho</span><textarea value={rascunho} onChange={(e) => setRascunho(e.target.value)} rows={14} disabled={sessao.estado === "aprovado"} placeholder="O rascunho será preenchido aqui quando houver factos suficientes." className="w-full border border-warmBeige/35 bg-paper p-3 font-mono text-xs text-ink focus:outline-none focus:border-warmBeige" /></label><div className="flex flex-wrap gap-2"><button type="button" onClick={guardarRevisao} disabled={!rascunho || sessao.estado === "aprovado"} className="border border-ink px-4 py-2.5 font-body text-xs uppercase tracking-widest text-ink disabled:opacity-40">Guardar para revisão</button><button type="button" onClick={aprovar} disabled={!rascunho || sessao.estado === "aprovado"} className="bg-ink px-4 py-2.5 font-body text-xs uppercase tracking-widest text-paper disabled:opacity-40">Aprovar rascunho</button>{sessao.estado === "aprovado" && <button type="button" onClick={exportar} className="border border-ink px-4 py-2.5 font-body text-xs uppercase tracking-widest text-ink">Exportar PDF aprovado</button>}</div>{estado && <p className="font-body text-sm text-oliveGray">{estado}</p>}</div>
    </section>
  </div>;
}
