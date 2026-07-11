"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2 } from "lucide-react";
import {
  criarContrato,
  atualizarContrato,
  type ContratoFormState,
} from "@/lib/actions/contratos";
import { extrairDadosContrato } from "@/lib/actions/extrair-contrato";
import type { Contrato } from "@/types/database";

const inputClass =
  "w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige";
const labelClass =
  "block font-body text-xs tracking-widest uppercase text-oliveGray mb-2";
const opcional = (
  <span className="normal-case tracking-normal text-oliveGray/60">(opcional)</span>
);

type Campos = {
  titulo: string;
  referencia: string;
  fornecedor_id: string;
  data_inicio: string;
  data_fim: string;
  valor: string;
  valor_anual: string;
  renovacao_automatica: boolean;
  descricao: string;
  notas_internas: string;
};

export function ContratoForm({
  contrato,
  fornecedores,
}: {
  contrato?: Contrato;
  fornecedores: { id: string; nome: string }[];
}) {
  const isEdit = !!contrato;
  const action = isEdit ? atualizarContrato.bind(null, contrato.id) : criarContrato;
  const [state, formAction, pending] = useActionState<ContratoFormState, FormData>(
    action,
    {}
  );

  const [campos, setCampos] = useState<Campos>({
    titulo: contrato?.titulo ?? "",
    referencia: contrato?.referencia ?? "",
    fornecedor_id: contrato?.fornecedor_id ?? "",
    data_inicio: contrato?.data_inicio ?? "",
    data_fim: contrato?.data_fim ?? "",
    valor: contrato?.valor != null ? String(contrato.valor) : "",
    valor_anual: contrato?.valor_anual != null ? String(contrato.valor_anual) : "",
    renovacao_automatica: contrato?.renovacao_automatica ?? false,
    descricao: contrato?.descricao ?? "",
    notas_internas: contrato?.notas_internas ?? "",
  });
  const set = <K extends keyof Campos>(k: K, v: Campos[K]) =>
    setCampos((c) => ({ ...c, [k]: v }));

  // ---- Extracção automática via PDF ----
  const fileRef = useRef<HTMLInputElement>(null);
  const [analisando, setAnalisando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [fornecedorDetetado, setFornecedorDetetado] = useState<string | null>(null);

  function idPorNome(nome: string): string | null {
    const alvo = nome.trim().toLowerCase();
    if (!alvo) return null;
    const exato = fornecedores.find((f) => f.nome.toLowerCase() === alvo);
    if (exato) return exato.id;
    const parcial = fornecedores.find(
      (f) =>
        f.nome.toLowerCase().includes(alvo) || alvo.includes(f.nome.toLowerCase())
    );
    return parcial?.id ?? null;
  }

  async function extrair() {
    const f = fileRef.current?.files?.[0];
    if (!f) {
      setMensagem("Selecione primeiro o PDF do contrato.");
      return;
    }
    setAnalisando(true);
    setMensagem(null);
    setFornecedorDetetado(null);
    try {
      const fd = new FormData();
      fd.append("ficheiro", f);
      const res = await extrairDadosContrato(fd);
      if (res.indisponivel) {
        setMensagem(
          "Extracção automática indisponível — falta configurar a chave da OpenAI."
        );
      } else if (res.error) {
        setMensagem(res.error);
      } else if (res.dados) {
        const d = res.dados;
        const fid = d.fornecedor ? idPorNome(d.fornecedor) : null;
        setCampos((prev) => ({
          ...prev,
          titulo: d.titulo ?? prev.titulo,
          referencia: d.referencia ?? prev.referencia,
          data_inicio: d.data_inicio ?? prev.data_inicio,
          data_fim: d.data_fim ?? prev.data_fim,
          valor: d.valor != null ? String(d.valor) : prev.valor,
          renovacao_automatica: d.renovacao_automatica ?? prev.renovacao_automatica,
          notas_internas: d.notas ?? prev.notas_internas,
          fornecedor_id: fid ?? prev.fornecedor_id,
        }));
        if (d.fornecedor && !fid) setFornecedorDetetado(d.fornecedor);
        setMensagem("Dados extraídos. Reveja e corrija antes de guardar.");
      }
    } catch {
      setMensagem("Não foi possível analisar o contrato. Preencha à mão.");
    } finally {
      setAnalisando(false);
    }
  }

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {state.error && (
        <div className="border-l-4 border-alert bg-alert/5 px-4 py-3">
          <p className="font-body text-sm text-alert">{state.error}</p>
        </div>
      )}

      {/* Extracção automática a partir de um PDF */}
      <div className="border border-warmBeige/30 bg-softCream/30 p-5">
        <p className={labelClass}>Extrair dados de um PDF {opcional}</p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            disabled={analisando}
            className="font-body text-sm text-ink file:mr-4 file:py-2 file:px-4 file:border file:border-warmBeige/40 file:bg-paper file:font-body file:text-xs file:tracking-widest file:uppercase file:text-oliveGray hover:file:border-warmBeige"
          />
          <button
            type="button"
            onClick={extrair}
            disabled={analisando}
            className="inline-flex items-center gap-2 px-5 py-2 border border-warmBeige/50 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink hover:border-warmBeige transition-colors disabled:opacity-50"
          >
            {analisando ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> A analisar contrato…
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" /> Extrair dados do contrato
              </>
            )}
          </button>
        </div>
        {mensagem && (
          <p className="mt-3 font-body text-sm text-oliveGray">{mensagem}</p>
        )}
        <p className="mt-2 font-body text-xs text-oliveGray/70">
          A análise preenche os campos abaixo; reveja sempre. O PDF anexa-se ao
          contrato no detalhe, depois de guardar.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="titulo" className={labelClass}>Título</label>
          <input id="titulo" name="titulo" required maxLength={200}
            placeholder="Manutenção de elevadores"
            value={campos.titulo} onChange={(e) => set("titulo", e.target.value)}
            className={inputClass} />
          {state.fieldErrors?.titulo && (
            <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.titulo}</p>
          )}
        </div>
        <div>
          <label htmlFor="referencia" className={labelClass}>Referência {opcional}</label>
          <input id="referencia" name="referencia" maxLength={100}
            value={campos.referencia} onChange={(e) => set("referencia", e.target.value)}
            className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="fornecedor_id" className={labelClass}>Fornecedor {opcional}</label>
        <select id="fornecedor_id" name="fornecedor_id"
          value={campos.fornecedor_id} onChange={(e) => set("fornecedor_id", e.target.value)}
          className={inputClass}>
          <option value="">Nenhum</option>
          {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
        {fornecedorDetetado && (
          <p className="mt-2 font-body text-xs text-oliveGray">
            Fornecedor detetado no PDF: <strong>{fornecedorDetetado}</strong> — não
            está registado. Crie-o em Fornecedores e volte a associar.
          </p>
        )}
        {fornecedores.length === 0 && (
          <p className="mt-2 font-body text-xs text-oliveGray">
            Ainda não há fornecedores. Crie-os em Fornecedores.
          </p>
        )}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="data_inicio" className={labelClass}>Início</label>
          <input id="data_inicio" name="data_inicio" type="date"
            value={campos.data_inicio} onChange={(e) => set("data_inicio", e.target.value)}
            className={inputClass} />
          {state.fieldErrors?.data_inicio && (
            <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.data_inicio}</p>
          )}
        </div>
        <div>
          <label htmlFor="data_fim" className={labelClass}>Fim / renovação</label>
          <input id="data_fim" name="data_fim" type="date"
            value={campos.data_fim} onChange={(e) => set("data_fim", e.target.value)}
            className={inputClass} />
          {state.fieldErrors?.data_fim && (
            <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.data_fim}</p>
          )}
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="valor" className={labelClass}>Valor (€) {opcional}</label>
          <input id="valor" name="valor" type="text" inputMode="decimal"
            value={campos.valor} onChange={(e) => set("valor", e.target.value)}
            className={inputClass} />
          {state.fieldErrors?.valor && (
            <p className="mt-2 text-sm text-alert font-body">{state.fieldErrors.valor}</p>
          )}
        </div>
        <div>
          <label htmlFor="valor_anual" className={labelClass}>Valor anual (€) {opcional}</label>
          <input id="valor_anual" name="valor_anual" type="text" inputMode="decimal"
            value={campos.valor_anual} onChange={(e) => set("valor_anual", e.target.value)}
            className={inputClass} />
        </div>
      </div>
      <label className="flex items-center gap-3 font-body text-sm text-ink cursor-pointer">
        <input type="checkbox" name="renovacao_automatica"
          checked={campos.renovacao_automatica}
          onChange={(e) => set("renovacao_automatica", e.target.checked)}
          className="w-4 h-4 accent-warmBeige" />
        Renovação automática
      </label>
      <div>
        <label htmlFor="descricao" className={labelClass}>Descrição {opcional}</label>
        <textarea id="descricao" name="descricao" rows={3}
          value={campos.descricao} onChange={(e) => set("descricao", e.target.value)}
          className={inputClass} />
      </div>
      <div>
        <label htmlFor="notas_internas" className={labelClass}>
          Notas internas {opcional}
        </label>
        <textarea id="notas_internas" name="notas_internas" rows={3}
          placeholder="Visível apenas à administração."
          value={campos.notas_internas} onChange={(e) => set("notas_internas", e.target.value)}
          className={inputClass} />
      </div>
      <div className="flex items-center gap-4 pt-4 border-t border-warmBeige/20">
        <button type="submit" disabled={pending}
          className="px-8 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50">
          {pending ? "A guardar..." : isEdit ? "Guardar alterações" : "Criar contrato"}
        </button>
        <Link href={isEdit ? `/contratos/${contrato.id}` : "/contratos"}
          className="px-8 py-3 font-body text-sm tracking-widest uppercase text-oliveGray hover:text-ink transition-colors">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
