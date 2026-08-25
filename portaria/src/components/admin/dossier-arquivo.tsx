"use client";

import { useActionState, useMemo, useState } from "react";
import { FileText, Paperclip, Plus, Search, X } from "lucide-react";
import { criarDocumento, type DocumentoFormState } from "@/lib/actions/documentos";
import { CATEGORIA_LABEL, CATEGORIAS_DOSSIER, DOCUMENTO_ACCEPT } from "@/lib/documentos";
import type { Documento, DocumentoCategoria } from "@/types/database";

export type ArquivoItem = Pick<
  Documento,
  "id" | "titulo" | "categoria" | "data_documento" | "contraparte" | "n_mensagens"
> & { citado: number };

/**
 * Arquivo documental do fornecedor.
 *
 * Duas coisas que a versão anterior não permitia e o processo exigiu: carregar
 * uma comunicação como comunicação, com a sua data e a sua contraparte; e ver,
 * de cada documento, quantas vezes está citado no histórico — porque um
 * documento que ninguém cita é um ficheiro, não uma prova.
 */
export function DossierArquivo({
  fornecedorId,
  redirectTo,
  itens,
  children,
}: {
  fornecedorId: string;
  redirectTo: string;
  itens: ArquivoItem[];
  children?: (item: ArquivoItem) => React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<DocumentoCategoria | "tudo">("tudo");

  const presentes = useMemo(() => {
    const ordem = new Map(CATEGORIAS_DOSSIER.map((c, i) => [c, i]));
    return [...new Set(itens.map((i) => i.categoria))].sort(
      (a, b) => (ordem.get(a) ?? 99) - (ordem.get(b) ?? 99),
    );
  }, [itens]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return itens.filter((item) => {
      if (filtro !== "tudo" && item.categoria !== filtro) return false;
      if (!termo) return true;
      return (
        item.titulo.toLowerCase().includes(termo) ||
        (item.contraparte ?? "").toLowerCase().includes(termo)
      );
    });
  }, [itens, busca, filtro]);

  return (
    <section className="portaria-panel overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-britishGreen/10 px-5 py-4 md:px-6">
        <div className="min-w-0">
          <p className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-britishGreen">
            Arquivo
          </p>
          <h2 className="mt-1 font-title text-h3 text-ink">Comunicações e documentos</h2>
          <p className="mt-1 font-body text-xs leading-5 text-oliveGray">
            {itens.length} no arquivo deste fornecedor. Um documento é fonte; para sustentar uma
            afirmação tem de ser citado num acontecimento.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-britishGreen px-4 py-2.5 font-body text-xs font-semibold text-white transition-colors hover:bg-britishGreenDeep"
        >
          {aberto ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {aberto ? "Fechar" : "Juntar documento"}
        </button>
      </div>

      {aberto && (
        <FormularioUpload
          fornecedorId={fornecedorId}
          redirectTo={redirectTo}
          onConcluido={() => setAberto(false)}
        />
      )}

      {itens.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-britishGreen/10 bg-white/40 px-5 py-3 md:px-6">
          <label className="relative flex min-w-[12rem] flex-1 items-center">
            <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-oliveGray" />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Procurar por título ou contraparte"
              className="w-full rounded-lg border border-britishGreen/15 bg-paper py-2 pl-9 pr-3 font-body text-xs text-ink placeholder:text-oliveGray/70 focus:border-britishGreen/40 focus:outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            <Chip activo={filtro === "tudo"} onClick={() => setFiltro("tudo")}>
              Tudo {itens.length}
            </Chip>
            {presentes.map((categoria) => (
              <Chip
                key={categoria}
                activo={filtro === categoria}
                onClick={() => setFiltro(categoria)}
              >
                {CATEGORIA_LABEL[categoria]} {itens.filter((i) => i.categoria === categoria).length}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {visiveis.length === 0 ? (
        <p className="px-5 py-6 font-body text-sm text-oliveGray md:px-6">
          {itens.length === 0
            ? "Sem documentos no arquivo. Junte comunicações, orçamentos, facturas ou comprovativos — ficam imediatamente associados a este fornecedor."
            : "Nenhum documento corresponde ao filtro."}
        </p>
      ) : (
        <ul className="divide-y divide-britishGreen/10">
          {visiveis.map((item) => (
            <li
              key={item.id}
              className="grid gap-2 px-5 py-3.5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4 md:px-6"
            >
              <div className="min-w-0">
                <div className="flex items-start gap-2.5">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-britishGreen" />
                  <div className="min-w-0">
                    <p className="font-body text-sm leading-5 text-ink">{item.titulo}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-body text-[0.7rem] text-oliveGray">
                      <span className="font-semibold uppercase tracking-[0.08em]">
                        {CATEGORIA_LABEL[item.categoria]}
                      </span>
                      {item.data_documento && <span>· {item.data_documento}</span>}
                      {item.contraparte && <span>· {item.contraparte}</span>}
                      {item.n_mensagens && <span>· {item.n_mensagens} mensagens</span>}
                      <span className={item.citado > 0 ? "text-britishGreen" : "text-alert"}>
                        · {item.citado > 0 ? `citado ${item.citado}×` : "não citado"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 pl-6 md:pl-0">{children?.(item)}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1 font-body text-[0.7rem] font-semibold transition-colors ${
        activo
          ? "bg-britishGreen text-white"
          : "border border-britishGreen/15 text-oliveGray hover:text-britishGreen"
      }`}
    >
      {children}
    </button>
  );
}

function FormularioUpload({
  fornecedorId,
  redirectTo,
  onConcluido,
}: {
  fornecedorId: string;
  redirectTo: string;
  onConcluido: () => void;
}) {
  const [state, formAction, pending] = useActionState<DocumentoFormState, FormData>(
    criarDocumento,
    {},
  );
  const [categoria, setCategoria] = useState<DocumentoCategoria>("comunicacao");
  const campo =
    "w-full rounded-lg border border-britishGreen/15 bg-paper px-3 py-2.5 font-body text-sm text-ink placeholder:text-oliveGray/70 focus:border-britishGreen/40 focus:outline-none";
  const etiqueta =
    "mb-1.5 block font-body text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-oliveGray";

  return (
    <form
      action={formAction}
      onSubmit={() => setTimeout(onConcluido, 1200)}
      className="border-b border-britishGreen/10 bg-white/50 px-5 py-5 md:px-6"
    >
      <input type="hidden" name="fornecedor_id" value={fornecedorId} />
      <input type="hidden" name="redirect_to" value={redirectTo} />

      {state.error && <p className="mb-3 font-body text-sm text-alert">{state.error}</p>}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <label className={etiqueta} htmlFor="doc-titulo">
            Título
          </label>
          <input
            id="doc-titulo"
            name="titulo"
            required
            maxLength={200}
            placeholder="Ex.: Pedido de esclarecimento de dúvidas"
            className={campo}
          />
          {state.fieldErrors?.titulo && (
            <p className="mt-1 font-body text-xs text-alert">{state.fieldErrors.titulo}</p>
          )}
        </div>

        <div className="lg:col-span-3">
          <label className={etiqueta} htmlFor="doc-categoria">
            Categoria
          </label>
          <select
            id="doc-categoria"
            name="categoria"
            value={categoria}
            onChange={(event) => setCategoria(event.target.value as DocumentoCategoria)}
            className={campo}
          >
            {CATEGORIAS_DOSSIER.map((valor) => (
              <option key={valor} value={valor}>
                {CATEGORIA_LABEL[valor]}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <label className={etiqueta} htmlFor="doc-data">
            Data do documento
          </label>
          <input id="doc-data" type="date" name="data_documento" className={campo} />
          {state.fieldErrors?.data_documento && (
            <p className="mt-1 font-body text-xs text-alert">{state.fieldErrors.data_documento}</p>
          )}
        </div>

        <div className="lg:col-span-2">
          <label className={etiqueta} htmlFor="doc-mensagens">
            {categoria === "comunicacao" ? "N.º de mensagens" : "Ano"}
          </label>
          {categoria === "comunicacao" ? (
            <input
              id="doc-mensagens"
              type="number"
              min={1}
              name="n_mensagens"
              placeholder="13"
              className={campo}
            />
          ) : (
            <input id="doc-mensagens" type="number" name="ano" placeholder="2026" className={campo} />
          )}
        </div>

        <div className="lg:col-span-5">
          <label className={etiqueta} htmlFor="doc-contraparte">
            {categoria === "comunicacao" ? "Remetente ou destinatário" : "Emitente"}
          </label>
          <input
            id="doc-contraparte"
            name="contraparte"
            maxLength={200}
            placeholder="Ex.: Pinturas Verticais / administração"
            className={campo}
          />
        </div>

        <div className="lg:col-span-7">
          <label className={etiqueta} htmlFor="doc-ficheiro">
            Ficheiro
          </label>
          <input
            id="doc-ficheiro"
            type="file"
            name="ficheiro"
            accept={DOCUMENTO_ACCEPT}
            required
            className="w-full rounded-lg border border-dashed border-britishGreen/25 bg-paper px-3 py-2 font-body text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-britishGreen/10 file:px-3 file:py-1.5 file:font-body file:text-xs file:font-semibold file:text-britishGreen"
          />
          {state.fieldErrors?.ficheiro && (
            <p className="mt-1 font-body text-xs text-alert">{state.fieldErrors.ficheiro}</p>
          )}
        </div>

        <div className="lg:col-span-12">
          <label className={etiqueta} htmlFor="doc-descricao">
            Nota (opcional)
          </label>
          <textarea id="doc-descricao" name="descricao" rows={2} className={campo} />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-britishGreen px-5 py-2.5 font-body text-xs font-semibold text-white transition-colors hover:bg-britishGreenDeep disabled:opacity-60"
        >
          <Paperclip className="h-3.5 w-3.5" />
          {pending ? "A carregar…" : "Arquivar"}
        </button>
        <p className="font-body text-[0.7rem] text-oliveGray">
          PDF, Word, Excel ou imagem, até 25 MB.
        </p>
      </div>
    </form>
  );
}
