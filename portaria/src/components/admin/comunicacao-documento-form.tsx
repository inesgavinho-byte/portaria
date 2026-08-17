"use client";

import { useActionState } from "react";
import { associarDocumentoComunicacao } from "@/lib/actions/comunicacoes";

type DocumentoOpcao = { id: string; titulo: string; origem: "publicado" | "confidencial" };

export function ComunicacaoDocumentoForm({
  comunicacaoId,
  documentos,
}: {
  comunicacaoId: string;
  documentos: DocumentoOpcao[];
}) {
  const [state, formAction, pending] = useActionState(associarDocumentoComunicacao, {});
  const inputClass = "w-full px-3 py-2 border border-warmBeige/40 bg-paper font-body text-sm text-ink focus:outline-none focus:border-warmBeige";

  return (
    <form action={formAction} className="mt-5 grid gap-3 md:grid-cols-[150px_1fr_auto] items-end border-t border-warmBeige/15 pt-5">
      <input type="hidden" name="comunicacao_id" value={comunicacaoId} />
      <label className="block">
        <span className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2">Arquivo</span>
        <select name="documento_tipo" defaultValue="publicado" className={inputClass}>
          <option value="publicado">Publicado</option>
          <option value="confidencial">Confidencial</option>
        </select>
      </label>
      <label className="block">
        <span className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2">Documento</span>
        <select name="documento_id" defaultValue="" required className={inputClass}>
          <option value="" disabled>Selecionar documento</option>
          {documentos.map((documento) => (
            <option key={`${documento.origem}-${documento.id}`} value={documento.id}>
              {documento.origem === "confidencial" ? "Confidencial" : "Publicado"} — {documento.titulo}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} className="px-4 py-2.5 bg-ink text-paper font-body text-xs tracking-widest uppercase hover:bg-oliveGray disabled:opacity-50">
        {pending ? "A associar..." : "Associar"}
      </button>
      {state.error && <p className="md:col-span-3 font-body text-sm text-alert">{state.error}</p>}
    </form>
  );
}
