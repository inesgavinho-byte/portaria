"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  criarDocumento,
  atualizarDocumento,
  type DocumentoFormState,
} from "@/lib/actions/documentos";
import { DOCUMENTO_ACCEPT } from "@/lib/documentos";
import type { Documento } from "@/types/database";
import { FileText } from "lucide-react";

const CATEGORIAS = [
  { value: "ata", label: "Ata" },
  { value: "conta", label: "Contas / Orçamento" },
  { value: "contrato", label: "Contrato" },
  { value: "regulamento", label: "Regulamento" },
  { value: "manual", label: "Manual" },
  { value: "apolice", label: "Apólice" },
  { value: "circular", label: "Circular" },
  { value: "outro", label: "Outro" },
];

interface DocumentoFormProps {
  /**
   * Se fornecido, é edição (pré-preenche e usa atualizarDocumento).
   * Se omitido, é criação.
   */
  documento?: Documento;
}

export function DocumentoForm({ documento }: DocumentoFormProps) {
  const isEdit = !!documento;

  const action = isEdit
    ? atualizarDocumento.bind(null, documento.id)
    : criarDocumento;

  const [state, formAction, pending] = useActionState<
    DocumentoFormState,
    FormData
  >(action, {});

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="border-l-4 border-alert bg-alert/5 px-4 py-3">
          <p className="font-body text-sm text-alert">{state.error}</p>
        </div>
      )}

      <div>
        <label
          htmlFor="titulo"
          className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
        >
          Título
        </label>
        <input
          id="titulo"
          name="titulo"
          type="text"
          required
          maxLength={200}
          defaultValue={documento?.titulo ?? ""}
          className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
          placeholder="Ex.: Ata da Assembleia Geral Ordinária 2026"
        />
        {state.fieldErrors?.titulo && (
          <p className="mt-2 text-sm text-alert font-body">
            {state.fieldErrors.titulo}
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="categoria"
            className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
          >
            Categoria
          </label>
          <select
            id="categoria"
            name="categoria"
            required
            defaultValue={documento?.categoria ?? ""}
            className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
          >
            <option value="" disabled>
              Selecione uma categoria
            </option>
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.categoria && (
            <p className="mt-2 text-sm text-alert font-body">
              {state.fieldErrors.categoria}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="ano"
            className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
          >
            Ano{" "}
            <span className="normal-case tracking-normal text-oliveGray/60">
              (opcional)
            </span>
          </label>
          <input
            id="ano"
            name="ano"
            type="number"
            min={1900}
            max={2100}
            placeholder="2026"
            defaultValue={documento?.ano ?? ""}
            className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
          />
          {state.fieldErrors?.ano && (
            <p className="mt-2 text-sm text-alert font-body">
              {state.fieldErrors.ano}
            </p>
          )}
        </div>
      </div>

      {/* Metadados do documento em si, distintos dos do upload. A data de um
          email não é a data em que foi arquivado, e é a primeira que importa ao
          dossiê. Em edição podem ser corrigidos — a fonte documental, quando
          existe, acompanha. */}
      <div className="grid md:grid-cols-3 gap-6">
        <div>
          <label
            htmlFor="data_documento"
            className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
          >
            Data do documento{" "}
            <span className="normal-case tracking-normal text-oliveGray/60">(opcional)</span>
          </label>
          <input
            id="data_documento"
            name="data_documento"
            type="date"
            defaultValue={documento?.data_documento ?? ""}
            className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
          />
          {state.fieldErrors?.data_documento && (
            <p className="mt-2 text-sm text-alert font-body">
              {state.fieldErrors.data_documento}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="contraparte"
            className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
          >
            Emitente / contraparte{" "}
            <span className="normal-case tracking-normal text-oliveGray/60">(opcional)</span>
          </label>
          <input
            id="contraparte"
            name="contraparte"
            type="text"
            maxLength={200}
            defaultValue={documento?.contraparte ?? ""}
            className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
          />
          {state.fieldErrors?.contraparte && (
            <p className="mt-2 text-sm text-alert font-body">
              {state.fieldErrors.contraparte}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="n_mensagens"
            className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
          >
            N.º de mensagens{" "}
            <span className="normal-case tracking-normal text-oliveGray/60">(se fio)</span>
          </label>
          <input
            id="n_mensagens"
            name="n_mensagens"
            type="number"
            min={1}
            defaultValue={documento?.n_mensagens ?? ""}
            className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
          />
          {state.fieldErrors?.n_mensagens && (
            <p className="mt-2 text-sm text-alert font-body">
              {state.fieldErrors.n_mensagens}
            </p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="descricao"
          className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
        >
          Descrição{" "}
          <span className="normal-case tracking-normal text-oliveGray/60">
            (opcional)
          </span>
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={3}
          maxLength={500}
          defaultValue={documento?.descricao ?? ""}
          className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige resize-none"
        />
      </div>

      {isEdit ? (
        <div className="bg-softCream/30 border border-warmBeige/20 p-4">
          <label className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2">
            Ficheiro
          </label>
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-warmBeige shrink-0" />
            <div>
              <p className="font-body text-sm text-ink">
                {documento?.ficheiro_tipo && documento.ficheiro_tamanho
                  ? `${documento.ficheiro_tipo} · ${(documento.ficheiro_tamanho / 1024 / 1024).toFixed(1)} MB`
                  : "Ficheiro carregado"}
              </p>
              <p className="font-body text-xs text-oliveGray">
                Não é possível substituir o ficheiro. Apague e carregue um novo
                se necessário.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <label
            htmlFor="ficheiro"
            className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
          >
            Ficheiro
          </label>
          <input
            id="ficheiro"
            name="ficheiro"
            type="file"
            required
            accept={DOCUMENTO_ACCEPT}
            className="w-full file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-warmBeige file:text-paper file:font-body file:text-sm file:tracking-widest file:uppercase hover:file:bg-oliveGray file:transition-colors font-body text-sm text-oliveGray"
          />
          <p className="mt-2 text-xs text-oliveGray font-body">
            PDF, Word, Excel ou imagem. Máximo 25 MB.
          </p>
          {state.fieldErrors?.ficheiro && (
            <p className="mt-2 text-sm text-alert font-body">
              {state.fieldErrors.ficheiro}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 pt-4 border-t border-warmBeige/20">
        <button
          type="submit"
          disabled={pending}
          className="px-8 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50"
        >
          {pending
            ? "A guardar..."
            : isEdit
            ? "Guardar alterações"
            : "Carregar documento"}
        </button>
        <Link
          href="/configuracao/documentos"
          className="px-8 py-3 font-body text-sm tracking-widest uppercase text-oliveGray hover:text-ink transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
