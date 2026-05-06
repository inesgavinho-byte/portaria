"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  criarDocumento,
  type DocumentoFormState,
} from "@/lib/actions/documentos";

const CATEGORIAS = [
  { value: "ata", label: "Ata" },
  { value: "conta", label: "Contas / Orçamento" },
  { value: "contrato", label: "Contrato" },
  { value: "regulamento", label: "Regulamento" },
  { value: "manual", label: "Manual" },
  { value: "apolice", label: "Apólice" },
  { value: "outro", label: "Outro" },
];

export function DocumentoForm() {
  const [state, formAction, pending] = useActionState<
    DocumentoFormState,
    FormData
  >(criarDocumento, {});

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
            defaultValue=""
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
            Ano <span className="normal-case tracking-normal text-oliveGray/60">(opcional)</span>
          </label>
          <input
            id="ano"
            name="ano"
            type="number"
            min={1900}
            max={2100}
            placeholder="2026"
            className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
          />
          {state.fieldErrors?.ano && (
            <p className="mt-2 text-sm text-alert font-body">
              {state.fieldErrors.ano}
            </p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="descricao"
          className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
        >
          Descrição <span className="normal-case tracking-normal text-oliveGray/60">(opcional)</span>
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={3}
          maxLength={500}
          className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige resize-none"
        />
      </div>

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

      <div className="flex items-center gap-4 pt-4 border-t border-warmBeige/20">
        <button
          type="submit"
          disabled={pending}
          className="px-8 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50"
        >
          {pending ? "A carregar..." : "Carregar documento"}
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
