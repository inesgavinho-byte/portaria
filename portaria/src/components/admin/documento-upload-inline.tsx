"use client";

import { useActionState } from "react";
import { Upload } from "lucide-react";
import { criarDocumento, type DocumentoFormState } from "@/lib/actions/documentos";
import { DOCUMENTO_ACCEPT } from "@/lib/documentos";

const CATEGORIAS = [
  { value: "outro", label: "Outro" },
  { value: "contrato", label: "Contrato" },
  { value: "apolice", label: "Seguro / Apólice" },
  { value: "regulamento", label: "Certidão / Alvará" },
];

/**
 * Upload de documento associado a um fornecedor ou contrato.
 * Reaproveita a Server Action criarDocumento (guarda no Storage e na
 * biblioteca de Documentos) com a associação via FK.
 */
export function DocumentoUploadInline({
  fornecedorId,
  contratoId,
  redirectTo,
  categoriaDefault = "outro",
}: {
  fornecedorId?: string;
  contratoId?: string;
  redirectTo: string;
  categoriaDefault?: string;
}) {
  const [state, formAction, pending] = useActionState<DocumentoFormState, FormData>(
    criarDocumento,
    {}
  );
  const inputClass =
    "w-full px-4 py-2.5 border border-warmBeige/40 bg-paper font-body text-sm text-ink focus:outline-none focus:border-warmBeige";

  return (
    <form action={formAction} className="space-y-3">
      {fornecedorId && <input type="hidden" name="fornecedor_id" value={fornecedorId} />}
      {contratoId && <input type="hidden" name="contrato_id" value={contratoId} />}
      <input type="hidden" name="redirect_to" value={redirectTo} />

      {state.error && (
        <p className="font-body text-sm text-alert">{state.error}</p>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <input
          name="titulo"
          required
          maxLength={200}
          placeholder="Título do documento"
          className={inputClass}
        />
        <select name="categoria" defaultValue={categoriaDefault} className={inputClass}>
          {CATEGORIAS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      {(state.fieldErrors?.titulo || state.fieldErrors?.categoria) && (
        <p className="text-sm text-alert font-body">
          {state.fieldErrors?.titulo ?? state.fieldErrors?.categoria}
        </p>
      )}

      <input
        name="ficheiro"
        type="file"
        required
        accept={DOCUMENTO_ACCEPT}
        className="w-full file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-warmBeige file:text-paper file:font-body file:text-xs file:tracking-widest file:uppercase hover:file:bg-oliveGray file:transition-colors font-body text-sm text-oliveGray"
      />
      {state.fieldErrors?.ficheiro && (
        <p className="text-sm text-alert font-body">{state.fieldErrors.ficheiro}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 px-5 py-2 border border-warmBeige/40 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink hover:border-warmBeige transition-colors disabled:opacity-50"
      >
        <Upload className="w-3.5 h-3.5" />
        {pending ? "A carregar..." : "Anexar documento"}
      </button>
    </form>
  );
}
