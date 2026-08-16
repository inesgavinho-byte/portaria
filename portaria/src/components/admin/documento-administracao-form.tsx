"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";
import { DOCUMENTO_ACCEPT } from "@/lib/documentos";
import {
  criarDocumentoAdministracao,
  type DocumentoAdministracaoFormState,
} from "@/lib/actions/documentos-administracao";

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

export function DocumentoAdministracaoForm() {
  const [state, formAction, pending] = useActionState<
    DocumentoAdministracaoFormState,
    FormData
  >(criarDocumentoAdministracao, {});

  return (
    <form action={formAction} className="space-y-6">
      <div className="flex gap-3 border-l-4 border-ink bg-ink/5 px-4 py-3">
        <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-ink" />
        <p className="font-body text-sm text-ink">
          Este ficheiro será guardado numa biblioteca confidencial, acessível apenas à administração do condomínio.
        </p>
      </div>

      {state.error && (
        <div className="border-l-4 border-alert bg-alert/5 px-4 py-3">
          <p className="font-body text-sm text-alert">{state.error}</p>
        </div>
      )}

      <div>
        <label htmlFor="titulo" className="mb-2 block font-body text-xs uppercase tracking-widest text-oliveGray">
          Título
        </label>
        <input id="titulo" name="titulo" type="text" required maxLength={200}
          className="w-full border border-warmBeige/40 bg-paper px-4 py-3 font-body text-ink focus:border-warmBeige focus:outline-none"
          placeholder="Ex.: Mapa de quotas e reconciliação — 2026" />
        {state.fieldErrors?.titulo && <p className="mt-2 font-body text-sm text-alert">{state.fieldErrors.titulo}</p>}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="categoria" className="mb-2 block font-body text-xs uppercase tracking-widest text-oliveGray">Categoria</label>
          <select id="categoria" name="categoria" required defaultValue=""
            className="w-full border border-warmBeige/40 bg-paper px-4 py-3 font-body text-ink focus:border-warmBeige focus:outline-none">
            <option value="" disabled>Selecione uma categoria</option>
            {CATEGORIAS.map((categoria) => <option key={categoria.value} value={categoria.value}>{categoria.label}</option>)}
          </select>
          {state.fieldErrors?.categoria && <p className="mt-2 font-body text-sm text-alert">{state.fieldErrors.categoria}</p>}
        </div>
        <div>
          <label htmlFor="ano" className="mb-2 block font-body text-xs uppercase tracking-widest text-oliveGray">Ano <span className="normal-case tracking-normal text-oliveGray/60">(opcional)</span></label>
          <input id="ano" name="ano" type="number" min={1900} max={2100} placeholder="2026"
            className="w-full border border-warmBeige/40 bg-paper px-4 py-3 font-body text-ink focus:border-warmBeige focus:outline-none" />
          {state.fieldErrors?.ano && <p className="mt-2 font-body text-sm text-alert">{state.fieldErrors.ano}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="descricao" className="mb-2 block font-body text-xs uppercase tracking-widest text-oliveGray">Descrição <span className="normal-case tracking-normal text-oliveGray/60">(opcional)</span></label>
        <textarea id="descricao" name="descricao" rows={3} maxLength={500}
          className="w-full resize-none border border-warmBeige/40 bg-paper px-4 py-3 font-body text-ink focus:border-warmBeige focus:outline-none" />
      </div>

      <div>
        <label htmlFor="ficheiro" className="mb-2 block font-body text-xs uppercase tracking-widest text-oliveGray">Ficheiro</label>
        <input id="ficheiro" name="ficheiro" type="file" required accept={DOCUMENTO_ACCEPT}
          className="w-full font-body text-sm text-oliveGray file:mr-4 file:border-0 file:bg-warmBeige file:px-4 file:py-2 file:font-body file:text-sm file:uppercase file:tracking-widest file:text-paper hover:file:bg-oliveGray" />
        <p className="mt-2 font-body text-xs text-oliveGray">PDF, Word, Excel ou imagem. Máximo 25 MB.</p>
        {state.fieldErrors?.ficheiro && <p className="mt-2 font-body text-sm text-alert">{state.fieldErrors.ficheiro}</p>}
      </div>

      <div className="flex items-center gap-4 border-t border-warmBeige/20 pt-4">
        <button type="submit" disabled={pending}
          className="bg-ink px-8 py-3 font-body text-sm uppercase tracking-widest text-paper transition-colors hover:bg-oliveGray disabled:opacity-50">
          {pending ? "A guardar..." : "Guardar documento confidencial"}
        </button>
        <Link href="/configuracao/documentos-administracao" className="px-4 py-3 font-body text-sm uppercase tracking-widest text-oliveGray transition-colors hover:text-ink">Cancelar</Link>
      </div>
    </form>
  );
}
