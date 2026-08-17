"use client";

import { useState } from "react";
import { BookOpen, CheckCircle2, Plus, Save, ShieldCheck } from "lucide-react";
import {
  guardarConfiguracaoDocumental,
  guardarFonteDocumentalIA,
} from "@/lib/actions/ia-documental";
import type { IAConfiguracaoDocumental, IADocumentalFonte } from "@/types/database";

export function IADocumentalConfiguracao({
  configuracao,
  fontes,
}: {
  configuracao: IAConfiguracaoDocumental;
  fontes: IADocumentalFonte[];
}) {
  const [instrucoes, setInstrucoes] = useState(configuracao.instrucoes);
  const [guardrails, setGuardrails] = useState(configuracao.guardrails);
  const [modelo, setModelo] = useState(configuracao.modelo);
  const [revisao, setRevisao] = useState(configuracao.exige_revisao_humana);
  const [estado, setEstado] = useState<string | null>(null);
  const [fonte, setFonte] = useState({ titulo: "", referencia: "", url: "", conteudoResumo: "", markdown: "", ativa: true });

  async function guardarConfiguracao() {
    setEstado("A guardar…");
    const resultado = await guardarConfiguracaoDocumental({
      instrucoes,
      guardrails,
      exigeRevisaoHumana: revisao,
      modelo,
    });
    setEstado(resultado.error ?? "Configuração guardada.");
  }

  async function adicionarFonte() {
    setEstado("A guardar fonte…");
    const resultado = await guardarFonteDocumentalIA(fonte);
    if (!resultado.error) setFonte({ titulo: "", referencia: "", url: "", conteudoResumo: "", markdown: "", ativa: true });
    setEstado(resultado.error ?? "Fonte guardada.");
  }

  const input = "w-full border border-warmBeige/35 bg-paper px-3 py-2.5 font-body text-sm text-ink focus:outline-none focus:border-warmBeige";
  const label = "mb-1.5 block font-body text-[11px] uppercase tracking-widest text-oliveGray";

  return (
    <div className="space-y-8">
      <section className="border border-warmBeige/20 bg-paper p-6">
        <div className="mb-5 flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-warmBeige" />
          <div>
            <h2 className="font-title text-h3 text-ink">Instruções e guardrails</h2>
            <p className="mt-1 font-body text-sm text-oliveGray">Estas regras orientam todos os rascunhos da IA para este condomínio. A chave da IA não é guardada aqui.</p>
          </div>
        </div>
        <div className="space-y-5">
          <label className="block">
            <span className={label}>Instruções de redação e operação</span>
            <textarea value={instrucoes} onChange={(evento) => setInstrucoes(evento.target.value)} rows={7} className={input} />
          </label>
          <label className="block">
            <span className={label}>Guardrails obrigatórios</span>
            <textarea value={guardrails} onChange={(evento) => setGuardrails(evento.target.value)} rows={8} className={input} />
          </label>
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <label className="block">
              <span className={label}>Modelo configurado no ambiente</span>
              <input value={modelo} onChange={(evento) => setModelo(evento.target.value)} className={input} placeholder="gpt-4o" />
            </label>
            <label className="flex items-center gap-3 border border-warmBeige/25 px-4 py-3 font-body text-sm text-ink">
              <input type="checkbox" checked={revisao} onChange={(evento) => setRevisao(evento.target.checked)} />
              Exigir revisão humana
            </label>
          </div>
          <p className="font-body text-xs text-oliveGray">A IA só funciona quando a variável de ambiente <code>OPENAI_API_KEY</code> estiver configurada na Netlify. Nunca introduza chaves nesta página.</p>
          <button type="button" onClick={guardarConfiguracao} className="inline-flex items-center gap-2 bg-ink px-5 py-3 font-body text-xs uppercase tracking-widest text-paper hover:bg-oliveGray">
            <Save className="h-4 w-4" /> Guardar regras
          </button>
        </div>
      </section>

      <section className="border border-warmBeige/20 bg-paper p-6">
        <div className="mb-5 flex items-start gap-3">
          <BookOpen className="mt-0.5 h-5 w-5 text-warmBeige" />
          <div>
            <h2 className="font-title text-h3 text-ink">Fontes legais e internas</h2>
            <p className="mt-1 font-body text-sm text-oliveGray">A IA cita apenas fontes ativas e informação disponível no contexto da sessão.</p>
          </div>
        </div>
        <div className="mb-6 space-y-2">
          {fontes.length === 0 ? <p className="font-body text-sm text-oliveGray">Ainda não existem fontes configuradas.</p> : fontes.map((item) => (
            <div key={item.id} className="border-l-2 border-warmBeige/50 pl-4 py-2">
              <p className="font-body text-sm text-ink">{item.titulo} {!item.ativa && <span className="text-oliveGray">— inativa</span>}</p>
              {item.referencia && <p className="font-body text-xs text-oliveGray">{item.referencia}</p>}
              {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="font-body text-xs text-oliveGray underline hover:text-ink">Abrir fonte</a>}
            </div>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label><span className={label}>Título</span><input value={fonte.titulo} onChange={(e) => setFonte({ ...fonte, titulo: e.target.value })} className={input} placeholder="Lei n.º 8/2022" /></label>
          <label><span className={label}>Referência</span><input value={fonte.referencia} onChange={(e) => setFonte({ ...fonte, referencia: e.target.value })} className={input} placeholder="Artigos relevantes" /></label>
          <label className="md:col-span-2"><span className={label}>URL oficial</span><input value={fonte.url} onChange={(e) => setFonte({ ...fonte, url: e.target.value })} className={input} placeholder="https://diariodarepublica.pt/..." /></label>
          <label className="md:col-span-2"><span className={label}>Resumo ou instrução de uso</span><textarea value={fonte.conteudoResumo} onChange={(e) => setFonte({ ...fonte, conteudoResumo: e.target.value })} rows={3} className={input} /></label>
          <label className="md:col-span-2"><span className={label}>Fonte em Markdown (.md)</span><input type="file" accept=".md,text/markdown,text/plain" onChange={async (e) => { const ficheiro = e.target.files?.[0]; if (!ficheiro) return; if (!ficheiro.name.toLowerCase().endsWith(".md")) { setEstado("Selecione um ficheiro Markdown (.md)."); return; } if (ficheiro.size > 180000) { setEstado("A fonte Markdown excede o limite de 180 KB."); return; } const markdown = await ficheiro.text(); setFonte((atual) => ({ ...atual, markdown, titulo: atual.titulo || ficheiro.name.replace(/\.md$/i, "") })); setEstado(`Markdown preparado: ${ficheiro.name}. A IA receberá apenas excertos relevantes.`); }} className={input} /></label>
          {fonte.markdown && <p className="md:col-span-2 font-body text-xs text-oliveGray">Markdown preparado: {(fonte.markdown.length / 1024).toFixed(1)} KB. Será dividido em blocos pesquisáveis no servidor.</p>}
        </div>
        <div className="mt-4 flex items-center justify-between gap-4">
          <label className="flex items-center gap-2 font-body text-sm text-ink"><input type="checkbox" checked={fonte.ativa} onChange={(e) => setFonte({ ...fonte, ativa: e.target.checked })} />Fonte ativa</label>
          <button type="button" onClick={adicionarFonte} className="inline-flex items-center gap-2 border border-ink px-5 py-3 font-body text-xs uppercase tracking-widest text-ink hover:bg-ink/5"><Plus className="h-4 w-4" />Adicionar fonte</button>
        </div>
      </section>
      {estado && <p className="flex items-center gap-2 font-body text-sm text-oliveGray"><CheckCircle2 className="h-4 w-4 text-warmBeige" />{estado}</p>}
    </div>
  );
}
