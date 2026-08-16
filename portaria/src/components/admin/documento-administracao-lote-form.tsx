"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { CheckCircle2, LockKeyhole, TriangleAlert, Upload } from "lucide-react";
import { DOCUMENTO_ACCEPT, DOCUMENTO_TIPOS_VALIDOS } from "@/lib/documentos";
import type { Documento } from "@/types/database";
import {
  finalizarDocumentosAdministracaoEmLote,
  prepararDocumentosAdministracaoEmLote,
  removerDocumentosAdministracaoTemporarios,
  type DocumentoAdministracaoLoteItem,
  type DocumentoAdministracaoLoteResultado,
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

const TAMANHO_MAXIMO_BYTES = 25 * 1024 * 1024;
type FormState = DocumentoAdministracaoLoteResultado & { progresso?: string };

export function DocumentoAdministracaoLoteForm() {
  const [state, setState] = useState<FormState>({});
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const files = Array.from((form.elements.namedItem("ficheiros") as HTMLInputElement)?.files ?? []);
    const categoria = String(formData.get("categoria") ?? "outro") as Documento["categoria"];
    const descricao = String(formData.get("descricao") ?? "").trim();
    const anoRaw = String(formData.get("ano") ?? "").trim();
    const ano = anoRaw ? Number.parseInt(anoRaw, 10) : null;

    if (files.length === 0 || files.length > 30) {
      setState({ error: "Selecione entre 1 e 30 ficheiros." });
      return;
    }
    if (anoRaw && (Number.isNaN(ano) || !ano || ano < 1900 || ano > 2100)) {
      setState({ error: "Ano inválido." });
      return;
    }

    setPending(true);
    setState({ progresso: "A preparar um envio seguro para o Arquivo confidencial..." });
    const falhas: string[] = [];

    const candidatos = files
      .map((file, ordem) => ({ file, ordem }))
      .filter(({ file }) => {
        if (file.size === 0 || file.size > TAMANHO_MAXIMO_BYTES) {
          falhas.push(`${file.name}: excede o limite de 25 MB ou está vazio.`);
          return false;
        }
        if (!DOCUMENTO_TIPOS_VALIDOS[file.type]) {
          falhas.push(`${file.name}: tipo de ficheiro não suportado.`);
          return false;
        }
        return true;
      });

    if (candidatos.length === 0) {
      setState({ error: "Nenhum ficheiro é válido para carregamento.", falhas });
      setPending(false);
      return;
    }

    const preparado = await prepararDocumentosAdministracaoEmLote({
      ficheiros: candidatos.map(({ file, ordem }) => ({
        ordem,
        nome: file.name,
        tamanho: file.size,
        tipo: file.type,
      })),
    });
    falhas.push(...(preparado.falhas ?? []));
    if (preparado.error || !preparado.ficheiros) {
      setState({ error: preparado.error ?? "Não foi possível preparar o carregamento.", falhas });
      setPending(false);
      return;
    }

    const enviados: DocumentoAdministracaoLoteItem[] = [];
    for (const [indice, ficheiroAssinado] of preparado.ficheiros.entries()) {
      const file = files[ficheiroAssinado.ordem];
      setState({ progresso: `A enviar ${indice + 1} de ${preparado.ficheiros.length} ficheiros para o arquivo privado...` });
      try {
        const resposta = await fetch(ficheiroAssinado.signedUrl, {
          method: "PUT",
          headers: { "content-type": file.type, "x-upsert": "false" },
          body: file,
        });
        if (!resposta.ok) throw new Error("Falha no envio");
        enviados.push({
          nome: ficheiroAssinado.nome,
          path: ficheiroAssinado.path,
          tamanho: ficheiroAssinado.tamanho,
          tipo: ficheiroAssinado.tipo,
        });
      } catch {
        falhas.push(`${file.name}: não foi possível enviar para o arquivo privado.`);
      }
    }

    if (enviados.length === 0) {
      setState({ error: "Nenhum ficheiro foi carregado.", falhas });
      setPending(false);
      return;
    }

    setState({ progresso: "A criar os registos confidenciais do lote..." });
    const resultado = await finalizarDocumentosAdministracaoEmLote({
      categoria,
      descricao: descricao || undefined,
      ano,
      ficheiros: enviados,
    });

    if (resultado.error) {
      await removerDocumentosAdministracaoTemporarios(enviados.map((ficheiro) => ficheiro.path));
      setState({ ...resultado, falhas: [...falhas, ...(resultado.falhas ?? [])] });
      setPending(false);
      return;
    }

    setState({ carregados: resultado.carregados, falhas: [...falhas, ...(resultado.falhas ?? [])] });
    form.reset();
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex gap-3 border-l-4 border-ink bg-ink/5 px-4 py-3">
        <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-ink" />
        <div className="font-body text-sm text-ink">
          <p>Os ficheiros seguem diretamente do seu navegador para o Arquivo confidencial, sem atravessar o servidor da aplicação.</p>
          <p className="mt-1 text-oliveGray">Cada ficheiro cria um registo próprio e permanece acessível apenas à administração do condomínio.</p>
        </div>
      </div>

      {state.progresso && <p className="font-body text-sm text-oliveGray">{state.progresso}</p>}
      {state.error && <div className="border-l-4 border-alert bg-alert/5 px-4 py-3"><p className="font-body text-sm text-alert">{state.error}</p></div>}
      {typeof state.carregados === "number" && <div className="border-l-4 border-success bg-success/5 px-4 py-3"><div className="flex gap-2"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" /><p className="font-body text-sm text-ink">{state.carregados} documento{state.carregados === 1 ? "" : "s"} guardado{state.carregados === 1 ? "" : "s"} no arquivo confidencial.</p></div></div>}
      {state.falhas && state.falhas.length > 0 && <div className="border-l-4 border-alert bg-alert/5 px-4 py-3"><div className="flex gap-2"><TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-alert" /><div><p className="font-body text-sm text-alert">Alguns ficheiros não foram carregados.</p><ul className="mt-2 list-disc space-y-1 pl-5 font-body text-sm text-ink">{state.falhas.map((falha) => <li key={falha}>{falha}</li>)}</ul></div></div></div>}

      <div className="grid gap-6 md:grid-cols-2">
        <div><label htmlFor="categoria" className="mb-2 block font-body text-xs uppercase tracking-widest text-oliveGray">Categoria inicial</label><select id="categoria" name="categoria" defaultValue="outro" className="w-full border border-warmBeige/40 bg-paper px-4 py-3 font-body text-ink focus:border-warmBeige focus:outline-none">{CATEGORIAS.map((categoria) => <option key={categoria.value} value={categoria.value}>{categoria.label}</option>)}</select></div>
        <div><label htmlFor="ano" className="mb-2 block font-body text-xs uppercase tracking-widest text-oliveGray">Ano <span className="normal-case tracking-normal text-oliveGray/60">(opcional)</span></label><input id="ano" name="ano" type="number" min={1900} max={2100} placeholder="Ex.: 2026" className="w-full border border-warmBeige/40 bg-paper px-4 py-3 font-body text-ink focus:border-warmBeige focus:outline-none" /></div>
      </div>

      <div><label htmlFor="descricao" className="mb-2 block font-body text-xs uppercase tracking-widest text-oliveGray">Nota comum <span className="normal-case tracking-normal text-oliveGray/60">(opcional)</span></label><textarea id="descricao" name="descricao" rows={3} maxLength={500} placeholder="Ex.: Arquivo de transição administrativa recebido em agosto de 2026." className="w-full resize-none border border-warmBeige/40 bg-paper px-4 py-3 font-body text-ink focus:border-warmBeige focus:outline-none" /></div>

      <div><label htmlFor="ficheiros" className="mb-2 block font-body text-xs uppercase tracking-widest text-oliveGray">Ficheiros</label><input id="ficheiros" name="ficheiros" type="file" required multiple accept={DOCUMENTO_ACCEPT} className="w-full font-body text-sm text-oliveGray file:mr-4 file:border-0 file:bg-warmBeige file:px-4 file:py-2 file:font-body file:text-sm file:uppercase file:tracking-widest file:text-paper hover:file:bg-oliveGray" /><p className="mt-2 font-body text-xs text-oliveGray">PDF, Word, Excel ou imagem. Máximo 25 MB por ficheiro e 30 ficheiros por lote.</p></div>

      <div className="flex items-center gap-4 border-t border-warmBeige/20 pt-4"><button type="submit" disabled={pending} className="inline-flex items-center gap-2 bg-ink px-8 py-3 font-body text-sm uppercase tracking-widest text-paper transition-colors hover:bg-oliveGray disabled:opacity-50"><Upload className="h-4 w-4" />{pending ? "A carregar..." : "Carregar documentos"}</button><Link href="/configuracao/documentos-administracao" className="px-4 py-3 font-body text-sm uppercase tracking-widest text-oliveGray transition-colors hover:text-ink">Cancelar</Link></div>
    </form>
  );
}
