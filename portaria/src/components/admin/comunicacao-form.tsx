"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { criarComunicacao, type ComunicacaoFormState } from "@/lib/actions/comunicacoes";

type FracaoOpcao = {
  id: string;
  codigo: string;
  proprietario_nome: string | null;
  inquilino_nome: string | null;
};

type DocumentoOpcao = {
  id: string;
  titulo: string;
  origem: "publicado" | "confidencial";
};

export function ComunicacaoForm({
  fracoes,
  documentos,
  preSelecionadas,
}: {
  fracoes: FracaoOpcao[];
  documentos: DocumentoOpcao[];
  // Ids de frações pré-selecionadas (ex.: a chegar da ficha do condómino).
  // Quando presente, parte com essas frações e só elas; sem ele, parte com
  // todas selecionadas — comportamento antigo.
  preSelecionadas?: string[];
}) {
  const [state, formAction, pending] = useActionState<ComunicacaoFormState, FormData>(criarComunicacao, {});
  const idsValidos = preSelecionadas
    ? preSelecionadas.filter((fid) => fracoes.some((f) => f.id === fid))
    : undefined;
  // `null` significa "todas": o estado explícito só existe quando a seleção
  // deixa de ser "todas" ou chega de fora como subconjunto.
  const [selecionadas, setSelecionadas] = useState<Set<string> | null>(
    idsValidos ? new Set(idsValidos) : null
  );
  const todasSelecionadas = selecionadas === null;
  function alternarFracao(fracaoId: string) {
    setSelecionadas((atual) => {
      if (atual === null) {
        // De "todas" para "todas menos esta".
        const proximo = new Set(fracoes.map((f) => f.id));
        proximo.delete(fracaoId);
        return proximo;
      }
      const proximo = new Set(atual);
      if (proximo.has(fracaoId)) proximo.delete(fracaoId);
      else proximo.add(fracaoId);
      // De volta a "todas" sem estado especial quando cobre o conjunto inteiro.
      return proximo.size === fracoes.length ? null : proximo;
    });
  }
  const inputClass = "w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige";
  const labelClass = "block font-body text-xs tracking-widest uppercase text-oliveGray mb-2";
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-8 max-w-4xl">
      {state.error && (
        <div className="border-l-4 border-alert bg-alert/5 px-4 py-3">
          <p className="font-body text-sm text-alert">{state.error}</p>
        </div>
      )}

      <section className="bg-paper border border-warmBeige/20 p-5 md:p-6">
        <h2 className="font-title text-xl text-ink mb-5">Registo da comunicação</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="assunto" className={labelClass}>Assunto</label>
            <input id="assunto" name="assunto" required maxLength={240}
              placeholder="Ex.: Circular de quotas — 3.º trimestre de 2026" className={inputClass} />
            {state.fieldErrors?.assunto && <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.assunto}</p>}
          </div>
          <div>
            <label htmlFor="tipo" className={labelClass}>Tipo</label>
            <select id="tipo" name="tipo" defaultValue="circular" className={inputClass}>
              <option value="circular">Circular</option>
              <option value="convocatoria">Convocatória</option>
              <option value="ata">Ata</option>
              <option value="quotas">Quotas</option>
              <option value="obras_manutencao">Obras ou manutenção</option>
              <option value="cobranca">Cobrança</option>
              <option value="entrega_documental">Entrega documental</option>
              <option value="aviso">Aviso</option>
              <option value="geral">Comunicação geral</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div>
            <label htmlFor="estado" className={labelClass}>Estado inicial</label>
            <select id="estado" name="estado" defaultValue="rascunho" className={inputClass}>
              <option value="rascunho">Rascunho</option>
              <option value="preparada">Preparada</option>
              <option value="em_envio">Em envio</option>
              <option value="concluida">Concluída</option>
              <option value="arquivada">Arquivada</option>
            </select>
          </div>
          <div>
            <label htmlFor="data_comunicacao" className={labelClass}>Data da comunicação</label>
            <input id="data_comunicacao" name="data_comunicacao" type="date" defaultValue={hoje} required className={inputClass} />
          </div>
          <div>
            <label htmlFor="data_limite" className={labelClass}>Data-limite <span className="normal-case tracking-normal text-oliveGray/60">(opcional)</span></label>
            <input id="data_limite" name="data_limite" type="date" className={inputClass} />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="descricao" className={labelClass}>Nota interna <span className="normal-case tracking-normal text-oliveGray/60">(opcional)</span></label>
            <textarea id="descricao" name="descricao" rows={4} maxLength={8000} className={inputClass}
              placeholder="Contexto, instruções de acompanhamento ou informação relevante para a administração." />
          </div>
        </div>
      </section>

      <section className="bg-paper border border-warmBeige/20 p-5 md:p-6">
        <h2 className="font-title text-xl text-ink mb-2">Destinatários</h2>
        <p className="font-body text-sm text-oliveGray mb-5">Cada fração terá o seu próprio estado de entrega e ficará com este registo no dossiê administrativo.</p>
        <div className="grid gap-5 md:grid-cols-2 mb-5">
          <div>
            <label htmlFor="papel_destinatario" className={labelClass}>Destinatário principal</label>
            <select id="papel_destinatario" name="papel_destinatario" defaultValue="proprietario" className={inputClass}>
              <option value="proprietario">Proprietário</option>
              <option value="inquilino">Inquilino</option>
              <option value="ambos">Proprietário e inquilino</option>
              <option value="representante">Representante</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div>
            <label htmlFor="canal" className={labelClass}>Canal previsto</label>
            <select id="canal" name="canal" defaultValue="email" className={inputClass}>
              <option value="email">E-mail</option>
              <option value="correio_simples">Correio simples</option>
              <option value="correio_registado">Correio registado</option>
              <option value="entrega_em_mao">Entrega em mão</option>
              <option value="portal">Portal</option>
              <option value="outro">Outro</option>
            </select>
          </div>
        </div>
        <label className="inline-flex items-center gap-2 font-body text-sm text-ink mb-4 cursor-pointer">
          <input type="checkbox" checked={todasSelecionadas} onChange={() => setSelecionadas(todasSelecionadas ? new Set<string>() : null)} className="accent-ink" />
          Selecionar todas as frações
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-y-auto border border-warmBeige/20 p-3">
          {fracoes.map((fracao) => (
            <label key={fracao.id} className="flex items-start gap-2 p-2 hover:bg-softCream/50 cursor-pointer">
              <input
                type="checkbox"
                name="fracao_ids"
                value={fracao.id}
                checked={todasSelecionadas || (selecionadas?.has(fracao.id) ?? false)}
                onChange={() => alternarFracao(fracao.id)}
                className="mt-1 accent-ink"
              />
              <span className="min-w-0">
                <span className="block font-body text-sm text-ink">{fracao.codigo}</span>
                <span className="block font-body text-xs text-oliveGray truncate">{fracao.proprietario_nome ?? fracao.inquilino_nome ?? "Sem contacto"}</span>
              </span>
            </label>
          ))}
        </div>
        {state.fieldErrors?.fracoes && <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.fracoes}</p>}
      </section>

      <section className="bg-paper border border-warmBeige/20 p-5 md:p-6">
        <h2 className="font-title text-xl text-ink mb-2">Documento associado</h2>
        <p className="font-body text-sm text-oliveGray mb-5">A ligação não duplica o ficheiro e pode ser completada mais tarde a partir da ficha da comunicação.</p>
        <div className="grid gap-5 md:grid-cols-[180px_1fr]">
          <div>
            <label htmlFor="documento_tipo" className={labelClass}>Arquivo</label>
            <select id="documento_tipo" name="documento_tipo" defaultValue="" className={inputClass}>
              <option value="">Sem documento</option>
              <option value="publicado">Documentos publicados</option>
              <option value="confidencial">Arquivo confidencial</option>
            </select>
          </div>
          <div>
            <label htmlFor="documento_id" className={labelClass}>Ficheiro</label>
            <select id="documento_id" name="documento_id" defaultValue="" className={inputClass}>
              <option value="">Selecionar mais tarde</option>
              {documentos.map((documento) => (
                <option key={`${documento.origem}-${documento.id}`} value={documento.id}>
                  {documento.origem === "confidencial" ? "Arquivo confidencial" : "Publicado"} — {documento.titulo}
                </option>
              ))}
            </select>
            {state.fieldErrors?.documento && <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.documento}</p>}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <button type="submit" disabled={pending}
          className="px-8 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50">
          {pending ? "A criar..." : "Criar comunicação"}
        </button>
        <Link href="/comunicacoes" className="px-4 py-3 font-body text-sm tracking-widest uppercase text-oliveGray hover:text-ink transition-colors">Cancelar</Link>
      </div>
    </form>
  );
}
