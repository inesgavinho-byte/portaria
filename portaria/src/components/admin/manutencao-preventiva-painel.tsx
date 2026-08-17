"use client";

import { FormEvent, useState, useTransition } from "react";
import { CalendarCheck2, CheckCircle2, ClipboardList, Plus, Wrench } from "lucide-react";
import type { AtivoManutencao, PlanoManutencao, TarefaManutencao } from "@/types/database";
import type { OpcaoManutencao } from "@/lib/actions/manutencao";
import { atualizarEstadoTarefaManutencao, concluirTarefaManutencao, criarAtivoManutencao, criarPlanoManutencao } from "@/lib/actions/manutencao";

const CATEGORIAS = [
  ["elevadores", "Elevadores"], ["cobertura", "Cobertura"], ["fachada", "Fachada"], ["bombas", "Bombas"], ["extintores", "Extintores"], ["portas", "Portas"], ["eletricidade", "Eletricidade"], ["agua", "Água"], ["outro", "Outro"],
] as const;

function dataPt(data: string | null) {
  if (!data) return "—";
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${data}T12:00:00`));
}

function etiquetaCategoria(valor: string) { return CATEGORIAS.find(([chave]) => chave === valor)?.[1] ?? valor; }

function badge(estado: string) {
  const classes: Record<string, string> = { ativo: "bg-emerald-100 text-emerald-800", inativo: "bg-slate-100 text-slate-700", substituido: "bg-slate-100 text-slate-700", planeada: "bg-sky-100 text-sky-800", agendada: "bg-amber-100 text-amber-800", em_curso: "bg-violet-100 text-violet-800", concluida: "bg-emerald-100 text-emerald-800", cancelada: "bg-slate-100 text-slate-700", suspenso: "bg-amber-100 text-amber-800", terminado: "bg-slate-100 text-slate-700" };
  return <span className={`rounded px-2 py-0.5 font-body text-xs capitalize ${classes[estado] ?? "bg-slate-100 text-slate-700"}`}>{estado.replaceAll("_", " ")}</span>;
}

type AtivoComRelacoes = AtivoManutencao & { fornecedores?: { nome: string } | null; contratos?: { titulo: string } | null };
type PlanoComRelacoes = PlanoManutencao & { ativos_manutencao?: { nome: string } | null; fornecedores?: { nome: string } | null };
type TarefaComRelacoes = TarefaManutencao & { ativos_manutencao?: { nome: string } | null; fornecedores?: { nome: string } | null; planos_manutencao?: { titulo: string } | null };

function Opcoes({ name, opcoes, vazio = "Sem associação" }: { name: string; opcoes: OpcaoManutencao[]; vazio?: string }) {
  return <select name={name} className="campo" defaultValue=""><option value="">{vazio}</option>{opcoes.map((opcao) => <option key={opcao.id} value={opcao.id}>{opcao.nome}</option>)}</select>;
}

export function ManutencaoPreventivaPainel({ ativos, planos, tarefas, fornecedores, contratos }: { ativos: AtivoManutencao[]; planos: PlanoManutencao[]; tarefas: TarefaManutencao[]; fornecedores: OpcaoManutencao[]; contratos: OpcaoManutencao[] }) {
  const [vista, setVista] = useState<"ativos" | "planos" | "tarefas">("tarefas");
  const [mostrarAtivo, setMostrarAtivo] = useState(false);
  const [mostrarPlano, setMostrarPlano] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function guardarAtivo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    startTransition(async () => {
      const resultado = await criarAtivoManutencao(new FormData(form));
      setMensagem(resultado.error ?? "Ativo registado.");
      if (resultado.success) { form.reset(); setMostrarAtivo(false); }
    });
  }

  function guardarPlano(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    startTransition(async () => {
      const resultado = await criarPlanoManutencao(new FormData(form));
      setMensagem(resultado.error ?? "Plano de manutenção registado.");
      if (resultado.success) { form.reset(); setMostrarPlano(false); }
    });
  }

  function concluir(tarefaId: string) {
    const data = window.prompt("Data de conclusão (AAAA-MM-DD):", new Date().toISOString().slice(0, 10));
    if (!data) return;
    const observacoes = window.prompt("Observações da intervenção (opcional):") ?? "";
    startTransition(async () => {
      const resultado = await concluirTarefaManutencao(tarefaId, data, observacoes);
      setMensagem(resultado.error ?? "Tarefa concluída; o plano foi atualizado para o próximo ciclo.");
    });
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="font-title text-h1 text-ink">Manutenção preventiva</h1><p className="mt-2 font-body text-oliveGray">Planeie ativos e ciclos de manutenção. A rotina diária cria tarefas e alertas; concluir uma intervenção requer confirmação humana.</p></div>
      <div className="flex gap-2"><button onClick={() => setMostrarAtivo(!mostrarAtivo)} className="inline-flex items-center gap-1 border border-warmBeige/50 px-4 py-2 font-body text-sm text-ink"><Plus className="h-4 w-4" />Ativo</button><button onClick={() => setMostrarPlano(!mostrarPlano)} className="inline-flex items-center gap-1 bg-ink px-4 py-2 font-body text-sm tracking-widest text-paper uppercase hover:bg-oliveGray"><Plus className="h-4 w-4" />Plano</button></div>
    </div>

    {mensagem && <div className="border-l-4 border-ink bg-ink/5 px-4 py-3 font-body text-sm text-ink">{mensagem}</div>}

    {mostrarAtivo && <form onSubmit={guardarAtivo} className="space-y-4 border border-warmBeige/30 bg-paper p-5"><h2 className="font-title text-lg text-ink">Novo ativo</h2><div className="grid gap-4 md:grid-cols-2"><Campo label="Nome *"><input required name="nome" className="campo" placeholder="Ex.: Elevador A" /></Campo><Campo label="Categoria"><select name="categoria" className="campo">{CATEGORIAS.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}</select></Campo><Campo label="Localização"><input name="localizacao" className="campo" placeholder="Ex.: Torre A, hall" /></Campo><Campo label="Código interno"><input name="codigo_interno" className="campo" /></Campo><Campo label="Fornecedor"><Opcoes name="fornecedor_id" opcoes={fornecedores} /></Campo><Campo label="Contrato"><Opcoes name="contrato_id" opcoes={contratos} /></Campo></div><Campo label="Notas"><textarea name="notas" rows={3} className="campo" /></Campo><Botoes disabled={pending} onCancel={() => setMostrarAtivo(false)} texto="Guardar ativo" /></form>}

    {mostrarPlano && <form onSubmit={guardarPlano} className="space-y-4 border border-warmBeige/30 bg-paper p-5"><h2 className="font-title text-lg text-ink">Novo plano preventivo</h2><p className="font-body text-sm text-oliveGray">Defina apenas ciclos suportados por contrato, relatório de inspeção ou decisão da administração.</p><div className="grid gap-4 md:grid-cols-2"><Campo label="Ativo *"><Opcoes name="ativo_id" opcoes={ativos.map((ativo) => ({ id: ativo.id, nome: ativo.nome }))} vazio="Selecione o ativo" /></Campo><Campo label="Título *"><input required name="titulo" className="campo" placeholder="Ex.: Inspeção periódica" /></Campo><Campo label="Periodicidade"><select name="periodicidade" className="campo"><option value="mensal">Mensal</option><option value="trimestral">Trimestral</option><option value="semestral">Semestral</option><option value="anual">Anual</option><option value="pontual">Pontual</option></select></Campo><Campo label="Próxima execução *"><input required type="date" name="proxima_execucao" className="campo" /></Campo><Campo label="Avisar com antecedência"><input type="number" min="1" max="90" name="antecedencia_alerta_dias" defaultValue="14" className="campo" /></Campo><Campo label="Fornecedor"><Opcoes name="fornecedor_id" opcoes={fornecedores} /></Campo><Campo label="Contrato"><Opcoes name="contrato_id" opcoes={contratos} /></Campo></div><Campo label="Instruções"><textarea name="instrucoes" rows={3} className="campo" placeholder="Verificações, acesso, documentação ou contacto." /></Campo><Botoes disabled={pending} onCancel={() => setMostrarPlano(false)} texto="Guardar plano" /></form>}

    <div className="border-b border-warmBeige/30"><div className="flex gap-1"><Aba ativa={vista === "tarefas"} onClick={() => setVista("tarefas")} icon={<CalendarCheck2 className="h-4 w-4" />} texto="Tarefas" /><Aba ativa={vista === "planos"} onClick={() => setVista("planos")} icon={<ClipboardList className="h-4 w-4" />} texto="Planos" /><Aba ativa={vista === "ativos"} onClick={() => setVista("ativos")} icon={<Wrench className="h-4 w-4" />} texto="Ativos" /></div></div>

    {vista === "tarefas" && <TabelaTarefas tarefas={tarefas as TarefaComRelacoes[]} pending={pending} onConcluir={concluir} onEstado={(id, estado) => startTransition(async () => setMensagem((await atualizarEstadoTarefaManutencao(id, estado)).error ?? "Estado da tarefa atualizado."))} />}
    {vista === "planos" && <TabelaPlanos planos={planos as PlanoComRelacoes[]} />}
    {vista === "ativos" && <TabelaAtivos ativos={ativos as AtivoComRelacoes[]} />}
  </div>;
}

function Aba({ ativa, onClick, icon, texto }: { ativa: boolean; onClick: () => void; icon: React.ReactNode; texto: string }) { return <button onClick={onClick} className={`inline-flex items-center gap-1.5 px-4 py-2.5 font-body text-sm ${ativa ? "border-b-2 border-ink text-ink" : "text-oliveGray"}`}>{icon}{texto}</button>; }
function Campo({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block font-body text-xs tracking-widest text-oliveGray uppercase"><span className="mb-2 block">{label}</span>{children}</label>; }
function Botoes({ disabled, onCancel, texto }: { disabled: boolean; onCancel: () => void; texto: string }) { return <div className="flex gap-3"><button disabled={disabled} className="bg-ink px-5 py-2 font-body text-sm text-paper disabled:opacity-50">{texto}</button><button type="button" onClick={onCancel} className="border border-warmBeige/50 px-5 py-2 font-body text-sm text-ink">Cancelar</button></div>; }
function Cabecalho({ children }: { children: React.ReactNode }) { return <th className="px-3 py-2 text-left font-body text-xs tracking-widest text-oliveGray uppercase">{children}</th>; }
function Celula({ children }: { children: React.ReactNode }) { return <td className="px-3 py-2 font-body text-sm text-oliveGray">{children}</td>; }
function Vazio({ texto }: { texto: string }) { return <div className="border border-dashed border-warmBeige/40 py-12 text-center font-body text-sm text-oliveGray">{texto}</div>; }
function TabelaTarefas({ tarefas, pending, onConcluir, onEstado }: { tarefas: TarefaComRelacoes[]; pending: boolean; onConcluir: (id: string) => void; onEstado: (id: string, estado: "agendada" | "em_curso" | "cancelada") => void }) { if (!tarefas.length) return <Vazio texto="Ainda não existem tarefas de manutenção." />; return <div className="overflow-x-auto border border-warmBeige/30"><table className="w-full"><thead className="bg-warmBeige/10"><tr><Cabecalho>Tarefa</Cabecalho><Cabecalho>Ativo</Cabecalho><Cabecalho>Planeada</Cabecalho><Cabecalho>Fornecedor</Cabecalho><Cabecalho>Estado</Cabecalho><Cabecalho>Ações</Cabecalho></tr></thead><tbody>{tarefas.map((tarefa) => <tr key={tarefa.id} className="border-t border-warmBeige/20"><Celula><p className="font-medium text-ink">{tarefa.titulo}</p><p className="text-xs">{tarefa.planos_manutencao?.titulo ?? "—"}</p></Celula><Celula>{tarefa.ativos_manutencao?.nome ?? "—"}</Celula><Celula>{dataPt(tarefa.data_planeada)}</Celula><Celula>{tarefa.fornecedores?.nome ?? "—"}</Celula><Celula>{badge(tarefa.estado)}</Celula><Celula><div className="flex flex-wrap gap-2">{tarefa.estado === "planeada" && <button disabled={pending} onClick={() => onEstado(tarefa.id, "agendada")} className="text-xs text-sky-700 hover:underline">Agendar</button>}{["planeada", "agendada"].includes(tarefa.estado) && <button disabled={pending} onClick={() => onEstado(tarefa.id, "em_curso")} className="text-xs text-violet-700 hover:underline">Iniciar</button>}{!["concluida", "cancelada"].includes(tarefa.estado) && <button disabled={pending} onClick={() => onConcluir(tarefa.id)} className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline"><CheckCircle2 className="h-3 w-3" />Concluir</button>}</div></Celula></tr>)}</tbody></table></div>; }
function TabelaPlanos({ planos }: { planos: PlanoComRelacoes[] }) { if (!planos.length) return <Vazio texto="Ainda não existem planos preventivos." />; return <div className="overflow-x-auto border border-warmBeige/30"><table className="w-full"><thead className="bg-warmBeige/10"><tr><Cabecalho>Plano</Cabecalho><Cabecalho>Ativo</Cabecalho><Cabecalho>Periodicidade</Cabecalho><Cabecalho>Próxima execução</Cabecalho><Cabecalho>Fornecedor</Cabecalho><Cabecalho>Estado</Cabecalho></tr></thead><tbody>{planos.map((plano) => <tr key={plano.id} className="border-t border-warmBeige/20"><Celula>{plano.titulo}</Celula><Celula>{plano.ativos_manutencao?.nome ?? "—"}</Celula><Celula>{plano.periodicidade}</Celula><Celula>{dataPt(plano.proxima_execucao)}</Celula><Celula>{plano.fornecedores?.nome ?? "—"}</Celula><Celula>{badge(plano.estado)}</Celula></tr>)}</tbody></table></div>; }
function TabelaAtivos({ ativos }: { ativos: AtivoComRelacoes[] }) { if (!ativos.length) return <Vazio texto="Ainda não existem ativos registados." />; return <div className="overflow-x-auto border border-warmBeige/30"><table className="w-full"><thead className="bg-warmBeige/10"><tr><Cabecalho>Ativo</Cabecalho><Cabecalho>Categoria</Cabecalho><Cabecalho>Localização</Cabecalho><Cabecalho>Fornecedor</Cabecalho><Cabecalho>Contrato</Cabecalho><Cabecalho>Estado</Cabecalho></tr></thead><tbody>{ativos.map((ativo) => <tr key={ativo.id} className="border-t border-warmBeige/20"><Celula>{ativo.nome}</Celula><Celula>{etiquetaCategoria(ativo.categoria)}</Celula><Celula>{ativo.localizacao ?? "—"}</Celula><Celula>{ativo.fornecedores?.nome ?? "—"}</Celula><Celula>{ativo.contratos?.titulo ?? "—"}</Celula><Celula>{badge(ativo.estado)}</Celula></tr>)}</tbody></table></div>; }
