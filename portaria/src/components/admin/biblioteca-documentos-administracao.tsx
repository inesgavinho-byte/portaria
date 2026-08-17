"use client";

import { useMemo, useState } from "react";
import { FileText, Search, FolderOpen } from "lucide-react";
import { CATEGORIA_LABEL, TEMA_DOCUMENTO_LABEL, TEMAS_DOCUMENTO, type TemaDocumento } from "@/lib/documentos";
import { DocumentoAdministracaoDownload } from "@/components/admin/documento-administracao-download";
import { DocumentoAdministracaoPreview } from "@/components/admin/documento-administracao-preview";
import type { DocumentoAdministracao } from "@/types/database";

export function BibliotecaDocumentosAdministracao({ documentos }: { documentos: DocumentoAdministracao[] }) {
  const [pesquisa, setPesquisa] = useState("");
  const [tema, setTema] = useState<TemaDocumento | "todos">("todos");
  const [categoria, setCategoria] = useState<"todos" | DocumentoAdministracao["categoria"]>("todos");

  const filtrados = useMemo(() => {
    const termo = pesquisa.trim().toLocaleLowerCase("pt-PT");
    return documentos.filter((documento) => {
      const texto = `${documento.titulo} ${documento.descricao ?? ""} ${(documento.palavras_chave ?? []).join(" ")}`.toLocaleLowerCase("pt-PT");
      return (tema === "todos" || documento.tema === tema)
        && (categoria === "todos" || documento.categoria === categoria)
        && (!termo || texto.includes(termo));
    });
  }, [categoria, documentos, pesquisa, tema]);

  const grupos = useMemo(() => {
    const mapa = new Map<TemaDocumento, DocumentoAdministracao[]>();
    for (const item of filtrados) {
      const chave = item.tema ?? "geral";
      mapa.set(chave, [...(mapa.get(chave) ?? []), item]);
    }
    return TEMAS_DOCUMENTO.map((chave) => [chave, mapa.get(chave) ?? []] as const).filter(([, itens]) => itens.length > 0);
  }, [filtrados]);

  const categorias = Array.from(new Set(documentos.map((documento) => documento.categoria))).sort();

  return (
    <section className="space-y-6">
      <div className="grid gap-3 border border-warmBeige/20 bg-softCream/25 p-4 md:grid-cols-[1fr_auto_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-oliveGray" />
          <input value={pesquisa} onChange={(evento) => setPesquisa(evento.target.value)} placeholder="Pesquisar por título, descrição ou palavra-chave…" className="w-full border border-warmBeige/35 bg-paper py-2.5 pl-10 pr-3 font-body text-sm text-ink focus:outline-none focus:border-warmBeige" />
        </label>
        <select value={tema} onChange={(evento) => setTema(evento.target.value as TemaDocumento | "todos")} className="border border-warmBeige/35 bg-paper px-3 py-2.5 font-body text-sm text-ink focus:outline-none">
          <option value="todos">Todos os temas</option>
          {TEMAS_DOCUMENTO.map((valor) => <option key={valor} value={valor}>{TEMA_DOCUMENTO_LABEL[valor]}</option>)}
        </select>
        <select value={categoria} onChange={(evento) => setCategoria(evento.target.value as typeof categoria)} className="border border-warmBeige/35 bg-paper px-3 py-2.5 font-body text-sm text-ink focus:outline-none">
          <option value="todos">Todos os tipos</option>
          {categorias.map((valor) => <option key={valor} value={valor}>{CATEGORIA_LABEL[valor]}</option>)}
        </select>
      </div>

      <p className="font-body text-xs text-oliveGray">{filtrados.length} {filtrados.length === 1 ? "documento encontrado" : "documentos encontrados"}</p>

      {grupos.length === 0 ? (
        <div className="border border-warmBeige/20 bg-paper p-12 text-center">
          <FolderOpen className="mx-auto mb-3 h-7 w-7 text-warmBeige" />
          <p className="font-body text-sm text-oliveGray">Nenhum documento corresponde aos filtros selecionados.</p>
        </div>
      ) : grupos.map(([chave, itens]) => (
        <section key={chave} className="border border-warmBeige/20 bg-paper">
          <header className="flex items-center justify-between gap-4 border-b border-warmBeige/15 bg-softCream/35 px-5 py-3">
            <h2 className="font-title text-xl text-ink">{TEMA_DOCUMENTO_LABEL[chave]}</h2>
            <span className="font-body text-xs uppercase tracking-widest text-oliveGray">{itens.length}</span>
          </header>
          <div className="divide-y divide-warmBeige/10">
            {itens.map((documento) => (
              <article key={documento.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-warmBeige" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-title text-lg text-ink">{documento.titulo}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-xs text-oliveGray">
                    <span>{CATEGORIA_LABEL[documento.categoria]}</span>
                    {documento.ano && <span>· {documento.ano}</span>}
                    {documento.ficheiro_tamanho && <span>· {(documento.ficheiro_tamanho / 1024 / 1024).toFixed(1)} MB</span>}
                  </div>
                  {documento.descricao && <p className="mt-2 font-body text-sm text-oliveGray">{documento.descricao}</p>}
                  {(documento.palavras_chave ?? []).length > 0 && <p className="mt-2 font-body text-xs text-oliveGray">{documento.palavras_chave.join(" · ")}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <DocumentoAdministracaoPreview documentoId={documento.id} />
                  <DocumentoAdministracaoDownload documentoId={documento.id} />
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}
