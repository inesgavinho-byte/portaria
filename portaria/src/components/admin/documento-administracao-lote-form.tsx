"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2, LockKeyhole, TriangleAlert, Upload } from "lucide-react";
import { DOCUMENTO_ACCEPT } from "@/lib/documentos";
import {
  criarDocumentosAdministracaoEmLote,
  type DocumentoAdministracaoLoteState,
} from "@/lib/actions/documentos-administracao";

const CATEGORIAS = [
  { value: "outro", label: "Classificar automaticamente pelo ficheiro" },
  { value: "ata", label: "Ata" },
  { value: "conta", label: "Contas / Orçamento" },
  { value: "contrato", label: "Contrato" },
  { value: "regulamento", label: "Regulamento" },
  { value: "manual", label: "Manual" },
  { value: "apolice", label: "Apólice" },
  { value: "circular", label: "Circular" },
];

export function DocumentoAdministracaoLoteForm() {
  const [state, formAction, pending] = useActionState<
    DocumentoAdministracaoLoteState,
    FormData
  >(criarDocumentosAdministracaoEmLote, {});

  return (
    <form action={formAction} className="space-y-6">
      <div className="flex gap-3 border-l-4 border-ink bg-ink/5 px-4 py-3">
        <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-ink" />
        <div className="font-body text-sm text-ink">
          <p>Todos os ficheiros serão guardados no Arquivo confidencial, acessível apenas à administração.</p>
          <p className="mt-1 text-oliveGray">Cada ficheiro cria o seu próprio registo. O título é gerado a partir do nome do ficheiro e pode ser refinado posteriormente.</p>
        </div>
      </div>

      {state.error && (
        <div className="border-l-4 border-alert bg-alert/5 px-4 py-3">
          <p className="font-body text-sm text-alert">{state.error}</p>
        </div>
      )}

      {typeof state.carregados === "number" && (
        <div className="border-l-4 border-success bg-success/5 px-4 py-3">
          <div className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            <p className="font-body text-sm text-ink">{state.carregados} documento{state.carregados === 1 ? "" : "s"} guardado{state.carregados === 1 ? "" : "s"} no arquivo confidencial.</p>
          </div>
        </div>
      )}

      {state.falhas && state.falhas.length > 0 && (
        <div className="border-l-4 border-alert bg-alert/5 px-4 py-3">
          <div className="flex gap-2">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-alert" />
            <div>
              <p className="font-body text-sm text-alert">Alguns ficheiros não foram carregados.</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 font-body text-sm text-ink">
                {state.falhas.map((falha) => <li key={falha}>{falha}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="categoria" className="mb-2 block font-body text-xs uppercase tracking-widest text-oliveGray">Categoria inicial</label>
          <select id="categoria" name="categoria" defaultValue="outro"
            className="w-full border border-warmBeige/40 bg-paper px-4 py-3 font-body text-ink focus:border-warmBeige focus:outline-none">
            {CATEGORIAS.map((categoria) => <option key={categoria.value} value={categoria.value}>{categoria.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="ano" className="mb-2 block font-body text-xs uppercase tracking-widest text-oliveGray">Ano <span className="normal-case tracking-normal text-oliveGray/60">(opcional)</span></label>
          <input id="ano" name="ano" type="number" min={1900} max={2100} placeholder="Ex.: 2026"
            className="w-full border border-warmBeige/40 bg-paper px-4 py-3 font-body text-ink focus:border-warmBeige focus:outline-none" />
        </div>
      </div>

      <div>
        <label htmlFor="descricao" className="mb-2 block font-body text-xs uppercase tracking-widest text-oliveGray">Nota comum <span className="normal-case tracking-normal text-oliveGray/60">(opcional)</span></label>
        <textarea id="descricao" name="descricao" rows={3} maxLength={500}
          placeholder="Ex.: Arquivo de transição administrativa recebido em agosto de 2026."
          className="w-full resize-none border border-warmBeige/40 bg-paper px-4 py-3 font-body text-ink focus:border-warmBeige focus:outline-none" />
      </div>

      <div>
        <label htmlFor="ficheiros" className="mb-2 block font-body text-xs uppercase tracking-widest text-oliveGray">Ficheiros</label>
        <input id="ficheiros" name="ficheiros" type="file" required multiple accept={DOCUMENTO_ACCEPT}
          className="w-full font-body text-sm text-oliveGray file:mr-4 file:border-0 file:bg-warmBeige file:px-4 file:py-2 file:font-body file:text-sm file:uppercase file:tracking-widest file:text-paper hover:file:bg-oliveGray" />
        <p className="mt-2 font-body text-xs text-oliveGray">PDF, Word, Excel ou imagem. Máximo 25 MB por ficheiro e 30 ficheiros por lote.</p>
      </div>

      <div className="flex items-center gap-4 border-t border-warmBeige/20 pt-4">
        <button type="submit" disabled={pending}
          className="inline-flex items-center gap-2 bg-ink px-8 py-3 font-body text-sm uppercase tracking-widest text-paper transition-colors hover:bg-oliveGray disabled:opacity-50">
          <Upload className="h-4 w-4" />
          {pending ? "A carregar..." : "Carregar documentos"}
        </button>
        <Link href="/configuracao/documentos-administracao" className="px-4 py-3 font-body text-sm uppercase tracking-widest text-oliveGray transition-colors hover:text-ink">Cancelar</Link>
      </div>
    </form>
  );
}
