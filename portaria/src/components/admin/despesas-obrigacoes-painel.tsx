"use client";

import { FormEvent, useState, useTransition } from "react";
import {
  BadgeEuro,
  CheckCircle2,
  Clock3,
  FileWarning,
  Plus,
  Repeat2,
  WalletCards,
} from "lucide-react";
import type { Despesa, ObrigacaoRecorrente, EstadoDespesa } from "@/types/database";
import type { DespesaResumo, OpcaoFinanceira } from "@/lib/actions/financeiro";
import {
  atualizarEstadoDespesa,
  atualizarEstadoObrigacao,
  criarDespesa,
  criarObrigacao,
} from "@/lib/actions/financeiro";

const CATEGORIAS = [
  ["seguranca_social", "Segurança Social"],
  ["salario", "Salário"],
  ["elevadores", "Elevadores"],
  ["seguro", "Seguro"],
  ["manutencao", "Manutenção"],
  ["obras", "Obras"],
  ["servicos", "Serviços"],
  ["impostos", "Impostos"],
  ["outro", "Outro"],
] as const;

const ESTADOS: Array<[EstadoDespesa, string]> = [
  ["a_reconciliar", "A reconciliar"],
  ["rascunho", "Rascunho"],
  ["pendente", "Pendente"],
  ["pago", "Pago"],
  ["vencido", "Vencido"],
  ["cancelado", "Cancelado"],
];

type DespesaComRelacoes = Despesa & {
  fornecedores?: { nome: string } | null;
  contratos?: { titulo: string } | null;
  obrigacoes_recorrentes?: { titulo: string } | null;
};

type ObrigacaoComRelacoes = ObrigacaoRecorrente & {
  fornecedores?: { nome: string } | null;
  contratos?: { titulo: string } | null;
};

function euros(cents: number) {
  return (cents / 100).toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function categoriaLabel(valor: string) {
  return CATEGORIAS.find(([chave]) => chave === valor)?.[1] ?? valor;
}

function estadoBadge(estado: string) {
  const estilos: Record<string, string> = {
    a_reconciliar: "bg-violet-100 text-violet-800",
    rascunho: "bg-gray-100 text-gray-700",
    pendente: "bg-amber-100 text-amber-800",
    pago: "bg-emerald-100 text-emerald-800",
    vencido: "bg-red-100 text-red-800",
    cancelado: "bg-slate-100 text-slate-600",
    ativa: "bg-emerald-100 text-emerald-800",
    suspensa: "bg-amber-100 text-amber-800",
    terminada: "bg-slate-100 text-slate-600",
  };
  const etiquetas: Record<string, string> = {
    a_reconciliar: "A reconciliar",
    rascunho: "Rascunho",
    pendente: "Pendente",
    pago: "Pago",
    vencido: "Vencido",
    cancelado: "Cancelado",
    ativa: "Ativa",
    suspensa: "Suspensa",
    terminada: "Terminada",
  };
  return <span className={`inline-flex rounded px-2 py-0.5 text-xs font-body ${estilos[estado] ?? estilos.rascunho}`}>{etiquetas[estado] ?? estado}</span>;
}

function SelectOpcoes({ name, opcoes, vazio = "Sem associação" }: { name: string; opcoes: OpcaoFinanceira[]; vazio?: string }) {
  return (
    <select name={name} defaultValue="" className="w-full border border-warmBeige/30 bg-paper px-3 py-2 font-body text-sm text-ink">
      <option value="">{vazio}</option>
      {opcoes.map((opcao) => <option key={opcao.id} value={opcao.id}>{opcao.nome}</option>)}
    </select>
  );
}

export function DespesasObrigacoesPainel({
  despesas,
  obrigacoes,
  resumo,
  fornecedores,
  contratos,
  documentos,
}: {
  despesas: Despesa[];
  obrigacoes: ObrigacaoRecorrente[];
  resumo: DespesaResumo;
  fornecedores: OpcaoFinanceira[];
  contratos: OpcaoFinanceira[];
  documentos: OpcaoFinanceira[];
}) {
  const [vista, setVista] = useState<"despesas" | "obrigacoes">("despesas");
  const [mostrarDespesa, setMostrarDespesa] = useState(false);
  const [mostrarObrigacao, setMostrarObrigacao] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submeterDespesa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dados = new FormData(event.currentTarget);
    startTransition(async () => {
      const resultado = await criarDespesa(dados);
      if (resultado.error) {
        setMensagem(resultado.error);
        return;
      }
      event.currentTarget.reset();
      setMostrarDespesa(false);
      setMensagem("Despesa registada. O seu estado só será alterado mediante ação explícita da administração.");
    });
  }

  function submeterObrigacao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dados = new FormData(event.currentTarget);
    startTransition(async () => {
      const resultado = await criarObrigacao(dados);
      if (resultado.error) {
        setMensagem(resultado.error);
        return;
      }
      event.currentTarget.reset();
      setMostrarObrigacao(false);
      setMensagem("Obrigação recorrente criada.");
    });
  }

  function marcarComoPago(id: string) {
    const data = window.prompt("Data de pagamento (AAAA-MM-DD):", new Date().toISOString().slice(0, 10));
    if (!data) return;
    startTransition(async () => {
      const resultado = await atualizarEstadoDespesa(id, "pago", data);
      setMensagem(resultado.error ?? "Despesa marcada como paga.");
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <ResumoCard label="A reconciliar" valor={euros(resumo.totalReconciliar)} icon={<FileWarning className="h-5 w-5 text-violet-700" />} />
        <ResumoCard label="Pendente" valor={euros(resumo.totalPendente)} icon={<Clock3 className="h-5 w-5 text-amber-600" />} />
        <ResumoCard label="Pago" valor={euros(resumo.totalPago)} icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} />
        <ResumoCard label="Vencido" valor={euros(resumo.totalVencido)} icon={<BadgeEuro className="h-5 w-5 text-red-600" />} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-warmBeige/30 pb-3">
        <div className="flex gap-1">
          <button onClick={() => setVista("despesas")} className={`px-4 py-2 font-body text-sm ${vista === "despesas" ? "border-b-2 border-ink text-ink" : "text-oliveGray"}`}>Despesas</button>
          <button onClick={() => setVista("obrigacoes")} className={`px-4 py-2 font-body text-sm ${vista === "obrigacoes" ? "border-b-2 border-ink text-ink" : "text-oliveGray"}`}>Obrigações</button>
        </div>
        <button
          onClick={() => vista === "despesas" ? setMostrarDespesa(!mostrarDespesa) : setMostrarObrigacao(!mostrarObrigacao)}
          className="inline-flex items-center gap-1 bg-ink px-4 py-2 font-body text-sm tracking-widest text-paper uppercase hover:bg-oliveGray"
        >
          <Plus className="h-4 w-4" />
          {vista === "despesas" ? "Nova despesa" : "Nova obrigação"}
        </button>
      </div>

      {mensagem && <div className="border-l-4 border-ink bg-ink/5 px-4 py-3 font-body text-sm text-ink">{mensagem}</div>}

      {vista === "despesas" && mostrarDespesa && (
        <form onSubmit={submeterDespesa} className="space-y-4 border border-warmBeige/30 bg-paper p-5">
          <div>
            <h3 className="font-title text-lg text-ink">Registar despesa</h3>
            <p className="mt-1 font-body text-sm text-oliveGray">Uma fatura ou comprovativo não é tratado como pagamento sem estado e data confirmados.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Campo label="Descrição *"><input required name="descricao" className="campo" placeholder="Ex.: Fatura de manutenção de elevadores" /></Campo>
            <Campo label="Valor (€) *"><input required name="valor" inputMode="decimal" className="campo" placeholder="0,00" /></Campo>
            <Campo label="Categoria"><select name="categoria" defaultValue="outro" className="campo">{CATEGORIAS.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}</select></Campo>
            <Campo label="Estado"><select name="estado" defaultValue="a_reconciliar" className="campo">{ESTADOS.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}</select></Campo>
            <Campo label="Fornecedor"><SelectOpcoes name="fornecedor_id" opcoes={fornecedores} /></Campo>
            <Campo label="Contrato"><SelectOpcoes name="contrato_id" opcoes={contratos} /></Campo>
            <Campo label="N.º de fatura/documento"><input name="numero_documento" className="campo" /></Campo>
            <Campo label="Referência"><input name="referencia" className="campo" /></Campo>
            <Campo label="Data do documento"><input type="date" name="data_documento" className="campo" /></Campo>
            <Campo label="Vencimento"><input type="date" name="data_vencimento" className="campo" /></Campo>
            <Campo label="Data de pagamento"><input type="date" name="data_pagamento" className="campo" /></Campo>
            <Campo label="Método"><select name="metodo_pagamento" defaultValue="" className="campo"><option value="">Não confirmado</option><option value="transferencia">Transferência</option><option value="debito_direto">Débito direto</option><option value="mbway">MBway</option><option value="dinheiro">Dinheiro</option><option value="outro">Outro</option></select></Campo>
            <Campo label="Documento confidencial"><SelectOpcoes name="documento_administracao_id" opcoes={documentos} vazio="Associar posteriormente" /></Campo>
            <Campo label="Papel do documento"><select name="papel_documento" defaultValue="fatura" className="campo"><option value="fatura">Fatura</option><option value="comprovativo">Comprovativo</option><option value="nota_credito">Nota de crédito</option><option value="correspondencia">Correspondência</option><option value="outro">Outro</option></select></Campo>
          </div>
          <Campo label="Notas internas"><textarea name="notas" rows={3} className="campo" placeholder="Contexto, divergências ou passos de reconciliação." /></Campo>
          <div className="flex gap-3"><button disabled={pending} className="bg-ink px-5 py-2 font-body text-sm text-paper disabled:opacity-50">Guardar despesa</button><button type="button" onClick={() => setMostrarDespesa(false)} className="border border-warmBeige/50 px-5 py-2 font-body text-sm text-ink">Cancelar</button></div>
        </form>
      )}

      {vista === "obrigacoes" && mostrarObrigacao && (
        <form onSubmit={submeterObrigacao} className="space-y-4 border border-warmBeige/30 bg-paper p-5">
          <div><h3 className="font-title text-lg text-ink">Nova obrigação recorrente</h3><p className="mt-1 font-body text-sm text-oliveGray">Use para compromissos previsíveis; a criação não gera uma despesa nem pagamento.</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            <Campo label="Título *"><input required name="titulo" className="campo" placeholder="Ex.: Segurança Social — porteira" /></Campo>
            <Campo label="Categoria"><select name="categoria" defaultValue="outro" className="campo">{CATEGORIAS.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}</select></Campo>
            <Campo label="Periodicidade"><select name="periodicidade" defaultValue="mensal" className="campo"><option value="mensal">Mensal</option><option value="trimestral">Trimestral</option><option value="semestral">Semestral</option><option value="anual">Anual</option><option value="pontual">Pontual</option></select></Campo>
            <Campo label="Valor estimado (€)"><input name="valor_estimado" inputMode="decimal" className="campo" placeholder="Opcional" /></Campo>
            <Campo label="Próximo vencimento"><input type="date" name="proximo_vencimento" className="campo" /></Campo>
            <Campo label="Fornecedor"><SelectOpcoes name="fornecedor_id" opcoes={fornecedores} /></Campo>
            <Campo label="Contrato"><SelectOpcoes name="contrato_id" opcoes={contratos} /></Campo>
          </div>
          <Campo label="Notas internas"><textarea name="notas" rows={3} className="campo" /></Campo>
          <div className="flex gap-3"><button disabled={pending} className="bg-ink px-5 py-2 font-body text-sm text-paper disabled:opacity-50">Guardar obrigação</button><button type="button" onClick={() => setMostrarObrigacao(false)} className="border border-warmBeige/50 px-5 py-2 font-body text-sm text-ink">Cancelar</button></div>
        </form>
      )}

      {vista === "despesas" ? (
        <TabelaDespesas despesas={despesas as DespesaComRelacoes[]} pending={pending} onPagar={marcarComoPago} onEstado={(id, estado) => startTransition(async () => setMensagem((await atualizarEstadoDespesa(id, estado)).error ?? "Estado atualizado."))} />
      ) : (
        <TabelaObrigacoes obrigacoes={obrigacoes as ObrigacaoComRelacoes[]} pending={pending} onEstado={(id, estado) => startTransition(async () => setMensagem((await atualizarEstadoObrigacao(id, estado)).error ?? "Estado atualizado."))} />
      )}
    </div>
  );
}

function ResumoCard({ label, valor, icon }: { label: string; valor: string; icon: React.ReactNode }) {
  return <div className="border border-warmBeige/30 bg-paper p-4"><div className="mb-2 flex items-center justify-between"><span className="font-body text-xs tracking-widest text-oliveGray uppercase">{label}</span>{icon}</div><p className="font-title text-xl text-ink">{valor}</p></div>;
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block font-body text-xs tracking-widest text-oliveGray uppercase"><span className="mb-2 block">{label}</span>{children}</label>;
}

function TabelaDespesas({ despesas, pending, onPagar, onEstado }: { despesas: DespesaComRelacoes[]; pending: boolean; onPagar: (id: string) => void; onEstado: (id: string, estado: EstadoDespesa) => void }) {
  if (despesas.length === 0) return <Vazio icon={<WalletCards className="h-8 w-8" />} texto="Ainda não existem despesas registadas." />;
  return <div className="overflow-x-auto border border-warmBeige/30"><table className="w-full text-sm"><thead className="bg-warmBeige/10"><tr><Th>Descrição</Th><Th>Fornecedor</Th><Th>Documento</Th><Th>Vencimento</Th><Th>Valor</Th><Th>Estado</Th><Th>Ações</Th></tr></thead><tbody>{despesas.map((despesa) => <tr key={despesa.id} className="border-t border-warmBeige/20"><Td><p className="font-medium text-ink">{despesa.descricao}</p><p className="text-xs text-oliveGray">{categoriaLabel(despesa.categoria)}</p></Td><Td>{despesa.fornecedores?.nome ?? "—"}</Td><Td>{despesa.numero_documento ?? despesa.referencia ?? "—"}</Td><Td>{despesa.data_vencimento ?? "—"}</Td><Td className="font-medium text-ink">{euros(despesa.valor_cents)}</Td><Td>{estadoBadge(despesa.estado)}</Td><Td><div className="flex flex-wrap gap-2">{despesa.estado !== "pago" && <button disabled={pending} onClick={() => onPagar(despesa.id)} className="text-xs text-emerald-700 hover:underline">Marcar pago</button>}{despesa.estado !== "a_reconciliar" && despesa.estado !== "pago" && <button disabled={pending} onClick={() => onEstado(despesa.id, "a_reconciliar")} className="text-xs text-violet-700 hover:underline">Reconciliar</button>}</div></Td></tr>)}</tbody></table></div>;
}

function TabelaObrigacoes({ obrigacoes, pending, onEstado }: { obrigacoes: ObrigacaoComRelacoes[]; pending: boolean; onEstado: (id: string, estado: "ativa" | "suspensa" | "terminada") => void }) {
  if (obrigacoes.length === 0) return <Vazio icon={<Repeat2 className="h-8 w-8" />} texto="Ainda não existem obrigações recorrentes registadas." />;
  return <div className="overflow-x-auto border border-warmBeige/30"><table className="w-full text-sm"><thead className="bg-warmBeige/10"><tr><Th>Obrigação</Th><Th>Fornecedor</Th><Th>Periodicidade</Th><Th>Próximo vencimento</Th><Th>Estimativa</Th><Th>Estado</Th><Th>Ações</Th></tr></thead><tbody>{obrigacoes.map((obrigacao) => <tr key={obrigacao.id} className="border-t border-warmBeige/20"><Td><p className="font-medium text-ink">{obrigacao.titulo}</p><p className="text-xs text-oliveGray">{categoriaLabel(obrigacao.categoria)}</p></Td><Td>{obrigacao.fornecedores?.nome ?? "—"}</Td><Td className="capitalize">{obrigacao.periodicidade}</Td><Td>{obrigacao.proximo_vencimento ?? "—"}</Td><Td>{obrigacao.valor_estimado_cents ? euros(obrigacao.valor_estimado_cents) : "—"}</Td><Td>{estadoBadge(obrigacao.estado)}</Td><Td>{obrigacao.estado === "ativa" ? <button disabled={pending} onClick={() => onEstado(obrigacao.id, "suspensa")} className="text-xs text-amber-700 hover:underline">Suspender</button> : <button disabled={pending} onClick={() => onEstado(obrigacao.id, "ativa")} className="text-xs text-emerald-700 hover:underline">Ativar</button>}</Td></tr>)}</tbody></table></div>;
}

function Th({ children }: { children: React.ReactNode }) { return <th className="px-3 py-2 text-left font-body text-xs tracking-widest text-oliveGray uppercase">{children}</th>; }
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <td className={`px-3 py-2 font-body text-oliveGray ${className}`}>{children}</td>; }
function Vazio({ icon, texto }: { icon: React.ReactNode; texto: string }) { return <div className="border border-dashed border-warmBeige/40 py-12 text-center"><div className="mx-auto mb-3 text-oliveGray/40">{icon}</div><p className="font-body text-oliveGray">{texto}</p></div>; }
