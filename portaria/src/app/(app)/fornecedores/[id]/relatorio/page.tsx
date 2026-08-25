import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { RelatorioFornecedorImprimir } from "@/components/admin/relatorio-fornecedor-imprimir";
import { conflitosDocumentais, propostasComValor } from "@/lib/relatorios/valores-fornecedor";
import type { Contrato, ContratoMemoriaEvento, Despesa, Fornecedor } from "@/types/database";

type Movimento = { id: string; fornecedor_id: string | null; despesa_id: string | null; data_movimento: string; tipo: "debito" | "credito"; valor_cents: number; descricao: string; contraparte: string | null; referencia_externa: string | null; confirmado: boolean; estado_reconciliacao: string; };
type Fonte = { id: string; titulo: string; referencia: string | null; url: string | null };

const euro = (cents: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(cents / 100);
/**
 * Formata uma data, tolerando valores inválidos.
 *
 * `Intl.DateTimeFormat.format()` lança `RangeError: Invalid time value` quando
 * recebe uma Data inválida. Num Server Component isso derruba o render inteiro
 * e o utilizador vê apenas um digest. Uma data ilegível deve degradar para um
 * travessão, não para uma página em branco.
 */
const data = (value: string | null) => {
  if (!value) return "—";
  const instante = new Date(value);
  if (Number.isNaN(instante.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" }).format(instante);
};
const anoDe = (value: string | null) => {
  if (!value) return null;
  const ano = new Date(value).getFullYear();
  return Number.isNaN(ano) ? null : String(ano);
};
const natureza = { facto: "Facto", inferencia: "Inferência", conflito: "Conflito", pendente: "Pendente" } as const;
const naturezaClasse = { facto: "bg-britishGreenSoft text-britishGreen", inferencia: "bg-softCream text-oliveGray", conflito: "bg-alert/10 text-alert", pendente: "bg-warmBeige/15 text-ink" } as const;

export default async function RelatorioFornecedorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ano?: string; modo?: string }> }) {
  const [{ id }, filtros] = await Promise.all([params, searchParams]);
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");
  const supabase = await createClient();
  const [{ data: fornecedor }, { data: contratos }] = await Promise.all([
    supabase.from("fornecedores").select("*").eq("id", id).eq("tenant_id", ctx.tenant.id).single(),
    supabase.from("contratos").select("*").eq("tenant_id", ctx.tenant.id).eq("fornecedor_id", id).order("data_inicio", { ascending: true }),
  ]);
  if (!fornecedor) notFound();
  const f = fornecedor as Fornecedor;
  const cts = (contratos ?? []) as Contrato[];
  const contratoIds = cts.map((contrato) => contrato.id);
  const despesaQuery = supabase.from("despesas").select("*").eq("tenant_id", ctx.tenant.id).eq("fornecedor_id", id);
  const memoriaQuery = contratoIds.length ? supabase.from("contrato_memoria_eventos").select("id,contrato_id,data_evento,tipo,titulo,resumo,natureza,valor_cents,despesa_id,movimento_id,efeito,criado_em,contrato_memoria_evidencias(id,localizador,citacao,papel,ia_documental_fontes(id,titulo,referencia,url,documento_id))").eq("tenant_id", ctx.tenant.id).in("contrato_id", contratoIds).order("data_evento", { ascending: true }).order("criado_em", { ascending: true }) : Promise.resolve({ data: [] });
  const [{ data: despesas }, { data: memoria }] = await Promise.all([
    despesaQuery.order("data_documento", { ascending: true }),
    memoriaQuery,
  ]);
  const ds = (despesas ?? []) as Despesa[];
  const despesaIds = ds.map((despesa) => despesa.id);
  // A relação canónica movimento → fornecedor é `fornecedor_id`, não o texto
  // da descrição ou da contraparte. Movimentos ligados apenas a uma despesa
  // deste fornecedor continuam a ser recolhidos para não desaparecerem do
  // relatório, mas ficam identificados como não atribuídos.
  const movimentosSelect = "id,fornecedor_id,despesa_id,data_movimento,tipo,valor_cents,descricao,contraparte,referencia_externa,confirmado,estado_reconciliacao";
  const [{ data: movimentosDoFornecedor }, { data: movimentosPorDespesa }] = await Promise.all([
    supabase.from("movimentos_bancarios").select(movimentosSelect).eq("tenant_id", ctx.tenant.id).eq("fornecedor_id", id).order("data_movimento", { ascending: true }),
    despesaIds.length ? supabase.from("movimentos_bancarios").select(movimentosSelect).eq("tenant_id", ctx.tenant.id).in("despesa_id", despesaIds).order("data_movimento", { ascending: true }) : Promise.resolve({ data: [] }),
  ]);
  const movimentos = [...new Map([...((movimentosDoFornecedor ?? []) as Movimento[]), ...((movimentosPorDespesa ?? []) as Movimento[])].map((m) => [m.id, m])).values()].sort((a, b) => a.data_movimento.localeCompare(b.data_movimento));
  const todosEventos = (memoria ?? []) as ContratoMemoriaEvento[];
  const todosMovimentos = movimentos;
  const anos = Array.from(new Set([...ds.map((d) => anoDe(d.data_documento ?? d.criado_em)), ...todosMovimentos.map((m) => anoDe(m.data_movimento)), ...todosEventos.map((e) => anoDe(e.data_evento))].filter((ano): ano is string => Boolean(ano)))).sort((a, b) => Number(b) - Number(a));
  const ano = filtros.ano && anos.includes(filtros.ano) ? filtros.ano : "";
  const financeiro = filtros.modo === "financeiro";
  const despesasPeriodo = ds.filter((d) => !ano || anoDe(d.data_documento ?? d.criado_em) === ano);
  const movimentosPeriodo = todosMovimentos.filter((m) => !ano || anoDe(m.data_movimento) === ano);
  const eventosPeriodo = todosEventos.filter((e) => !ano || anoDe(e.data_evento) === ano);
  const totalFacturado = despesasPeriodo.reduce((soma, d) => soma + d.valor_cents, 0);
  const confirmadoBanco = movimentosPeriodo.filter((m) => m.fornecedor_id === id && m.tipo === "debito" && m.confirmado).reduce((soma, m) => soma + m.valor_cents, 0);
  const pagoDocumental = despesasPeriodo.filter((d) => d.estado === "pago").reduce((soma, d) => soma + d.valor_cents, 0);
  const saldo = Math.max(0, totalFacturado - confirmadoBanco);
  // Retenção apurada estruturalmente: despesas referenciadas por um evento de
  // memória com efeito de retenção. Sem interpretação de texto livre.
  const despesasRetidas = new Set(eventosPeriodo.filter((e) => e.efeito === "retencao" && e.despesa_id).map((e) => e.despesa_id as string));
  const retido = despesasPeriodo.filter((d) => despesasRetidas.has(d.id)).reduce((soma, d) => soma + d.valor_cents, 0);
  const conflitos = conflitosDocumentais(eventosPeriodo);
  const pendencias = eventosPeriodo.filter((e) => e.natureza === "pendente");
  const fontes = fontesUnicas(eventosPeriodo);
  const propostas = propostasComValor(eventosPeriodo);
  const tituloPeriodo = ano || "Todo o histórico";
  const href = (novos: { ano?: string; modo?: string }) => { const p = new URLSearchParams(); const a = novos.ano ?? ano; const m = novos.modo ?? (financeiro ? "financeiro" : "completo"); if (a) p.set("ano", a); if (m === "financeiro") p.set("modo", m); return `/fornecedores/${id}/relatorio${p.size ? `?${p}` : ""}`; };

  return <article className="mx-auto w-full max-w-[1100px] pb-12 print-report">
    <div data-chrome="app" className="no-print mb-6 flex items-center justify-between gap-3"><Link href={`/fornecedores/${id}`} className="inline-flex items-center gap-1 font-body text-xs font-semibold uppercase tracking-widest text-oliveGray hover:text-britishGreen"><ChevronLeft className="h-3.5 w-3.5" /> Fornecedor</Link><RelatorioFornecedorImprimir /></div>
    <header className="border-y border-britishGreen/20 py-7"><p className="font-body text-xs font-semibold uppercase tracking-[.18em] text-britishGreen">PORTARIA · Relatório do fornecedor</p><h1 className="mt-3 font-title text-h1 text-ink">{f.nome}</h1><p className="mt-2 font-body text-sm text-oliveGray">{f.contacto_nome}{f.contacto_nome && f.nif ? " · " : ""}{f.nif ? `NIF ${f.nif}` : ""}</p><div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 font-body text-xs text-oliveGray"><span>{f.ativo ? "Fornecedor ativo" : "Fornecedor arquivado"}</span><span>{tituloPeriodo}</span><span>Gerado em {data(new Date().toISOString())}</span></div></header>
    <nav data-chrome="app" className="no-print my-6 flex flex-wrap items-center gap-2 border-b border-britishGreen/15 pb-5"><span className="mr-2 font-body text-[11px] font-semibold uppercase tracking-widest text-oliveGray">Período</span><Link href={href({ ano: "" })} className={`px-3 py-2 font-body text-xs ${!ano ? "bg-britishGreen text-white" : "border border-britishGreen/20 text-britishGreen"}`}>Todo o histórico</Link>{anos.map((item) => <Link key={item} href={href({ ano: item })} className={`px-3 py-2 font-body text-xs ${ano === item ? "bg-britishGreen text-white" : "border border-britishGreen/20 text-britishGreen"}`}>{item}</Link>)}<span className="ml-4 mr-1 font-body text-[11px] font-semibold uppercase tracking-widest text-oliveGray">Modo</span><Link href={href({ modo: "completo" })} className={`px-3 py-2 font-body text-xs ${!financeiro ? "bg-britishGreen text-white" : "border border-britishGreen/20 text-britishGreen"}`}>Completo</Link><Link href={href({ modo: "financeiro" })} className={`px-3 py-2 font-body text-xs ${financeiro ? "bg-britishGreen text-white" : "border border-britishGreen/20 text-britishGreen"}`}>Financeiro</Link></nav>
    <Secao titulo="Resumo executivo"><div className="grid grid-cols-2 gap-px border border-britishGreen/15 bg-britishGreen/15 md:grid-cols-4 print:grid-cols-4"><Metrica label="Contratos" valor={String(cts.length)} /><Metrica label="Valor adjudicado conhecido" valor={cts.some((c) => c.valor !== null) ? euro(cts.reduce((s, c) => s + (c.valor ?? 0) * 100, 0)) : "Não estruturado"} /><Metrica label="Total facturado" valor={euro(totalFacturado)} /><Metrica label="Confirmado no banco" valor={euro(confirmadoBanco)} /><Metrica label="Pago documentalmente" valor={euro(pagoDocumental)} /><Metrica label="Saldo documental" valor={euro(saldo)} /><Metrica label="Valor retido" valor={retido ? euro(retido) : "—"} /><Metrica label="Em conflito" valor={conflitos.length ? `${conflitos.length} ponto(s)` : "—"} /></div>{propostas.length > 0 && <div className="mt-4 border-l-2 border-britishGreen bg-britishGreenSoft/45 px-4 py-3"><p className="font-body text-[10px] font-semibold uppercase tracking-widest text-britishGreen">Valores propostos</p><div className="mt-2 space-y-2">{propostas.map((proposta) => <div key={proposta.id} className="flex flex-wrap items-baseline justify-between gap-2"><span className="font-body text-xs text-oliveGray">{data(proposta.data)} · {proposta.titulo}</span><span className="font-body text-lg font-semibold tabular-nums text-ink">{euro(proposta.cents)}</span></div>)}</div><p className="mt-2 font-body text-xs text-oliveGray">Valores declarados nas propostas, cada um no seu âmbito. Propostas de âmbitos diferentes não são somadas nem substituídas umas pelas outras.{conflitos.length > 0 ? " Existem divergências documentais por resolver sobre estes valores — ver secção de divergências." : ""}</p></div>}</Secao>
    <Secao titulo="Reconciliação financeira"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3"><LinhaFinanceira titulo="Facturado" valor={totalFacturado} /><LinhaFinanceira titulo="Confirmado no banco" valor={confirmadoBanco} /><LinhaFinanceira titulo="Saldo documental" valor={saldo} /><LinhaFinanceira titulo="Retido / condicionado" valor={retido} /><LinhaFinanceira titulo="Pago documentalmente" valor={pagoDocumental} /><div className="border-l-2 border-warmBeige/50 bg-softCream/40 px-4 py-3 font-body text-xs leading-5 text-oliveGray">Os movimentos sem `despesa_id` são mantidos como confirmação bancária sem atribuição definitiva a uma factura. Não são distribuídos por documentos com o mesmo valor.</div></div></Secao>
    {!financeiro && <><Secao titulo="Contratos">{cts.length ? <div className="divide-y divide-britishGreen/10 border-y border-britishGreen/15">{cts.map((c) => <div key={c.id} data-print-item className="py-4"><Link href={`/contratos/${c.id}`} className="font-body text-sm font-semibold text-ink hover:text-britishGreen">{c.titulo}</Link><p className="mt-1 font-body text-xs text-oliveGray">{[c.referencia, c.data_inicio ? `Início ${data(c.data_inicio)}` : null, c.data_fim ? `Fim ${data(c.data_fim)}` : null, c.valor !== null ? euro(c.valor * 100) : null].filter(Boolean).join(" · ")}</p>{c.descricao && <p className="mt-2 font-body text-sm text-oliveGray">{c.descricao}</p>}</div>)}</div> : <Vazio>Não existem contratos registados para este fornecedor.</Vazio>}</Secao><Secao titulo="Memória da contratação">{eventosPeriodo.length ? <div className="space-y-5 border-l border-britishGreen/20 pl-6">{eventosPeriodo.map((e) => <div key={e.id} data-print-item className="relative"><span className="absolute -left-[1.8rem] top-1.5 h-3 w-3 rounded-full bg-britishGreen ring-4 ring-paper" /><p className="font-body text-xs uppercase tracking-widest text-oliveGray">{data(e.data_evento)} · {e.tipo}</p><p className="mt-1 font-body text-base font-semibold text-ink">{e.titulo}</p><p className="mt-1 font-body text-sm leading-6 text-oliveGray">{e.resumo}</p><span className={`mt-2 inline-block px-2 py-1 font-body text-[10px] uppercase tracking-widest ${naturezaClasse[e.natureza] ?? naturezaClasse.facto}`}>{natureza[e.natureza] ?? e.natureza}</span>{(e.contrato_memoria_evidencias ?? []).length > 0 && <div className="mt-3 space-y-2 border-l-2 border-britishGreen/15 pl-3">{(e.contrato_memoria_evidencias ?? []).map((ev) => <p key={ev.id} className="font-body text-xs leading-5 text-oliveGray">{(ev.ia_documental_fontes ?? [])[0]?.titulo ?? "Fonte documental"}{ev.localizador ? ` · ${ev.localizador}` : ""}{ev.citacao ? ` — “${ev.citacao}”` : ""}</p>)}</div>}</div>)}</div> : <Vazio>Não existe memória estruturada da contratação.</Vazio>}</Secao></>}
    <Secao titulo="Facturas e despesas">{despesasPeriodo.length ? <Tabela><thead><tr><th>Data</th><th>Documento</th><th>Descrição</th><th>Valor</th><th>Estado documental</th><th>Banco</th></tr></thead><tbody>{despesasPeriodo.map((d) => { const temBanco = movimentosPeriodo.some((m) => m.despesa_id === d.id && m.confirmado); return <tr key={d.id}><td>{data(d.data_documento ?? d.criado_em)}</td><td>{d.numero_documento ?? d.referencia ?? "—"}</td><td>{d.descricao}</td><td>{euro(d.valor_cents)}</td><td>{d.estado.replaceAll("_", " ")}</td><td>{temBanco ? "Associado" : "Não individualizado"}</td></tr>; })}</tbody></Tabela> : <Vazio>Não existem facturas ou despesas registadas no período.</Vazio>}</Secao>
    <Secao titulo="Movimentos financeiros">{movimentosPeriodo.length ? <Tabela><thead><tr><th>Data</th><th>Tipo</th><th>Valor</th><th>Contraparte / descrição</th><th>Confirmação</th><th>Reconciliação</th></tr></thead><tbody>{movimentosPeriodo.map((m) => <tr key={m.id}><td>{data(m.data_movimento)}</td><td>{m.tipo}</td><td>{euro(m.valor_cents)}</td><td>{m.contraparte ?? m.descricao}</td><td>{m.confirmado ? "Confirmado" : "Por confirmar"}</td><td>{m.despesa_id ? m.estado_reconciliacao : m.fornecedor_id === id ? "Fornecedor atribuído — factura exacta por identificar" : "Sem atribuição estrutural"}</td></tr>)}</tbody></Tabela> : <Vazio>Não existem movimentos bancários associados no período.</Vazio>}</Secao>
    {conflitos.length > 0 && <Secao titulo="Divergências e pontos por reconciliar"><div className="space-y-4">{conflitos.map((e) => <div key={e.id} data-print-item className="border-l-2 border-alert/60 bg-alert/5 px-4 py-3"><p className="font-body text-[10px] font-semibold uppercase tracking-widest text-alert">Conflito · {data(e.data_evento)}</p><p className="mt-1 font-body text-sm font-semibold text-ink">{e.titulo}</p><p className="mt-1 font-body text-sm leading-6 text-oliveGray">{e.resumo}</p>{(e.contrato_memoria_evidencias ?? []).length > 0 && <ul className="mt-3 space-y-1.5 border-l-2 border-alert/25 pl-3">{(e.contrato_memoria_evidencias ?? []).map((ev) => <li key={ev.id} className="font-body text-xs leading-5 text-oliveGray"><span className="italic">“{ev.citacao}”</span> — {(ev.ia_documental_fontes ?? [])[0]?.titulo ?? "Fonte documental"}{ev.localizador ? `, ${ev.localizador}` : ""}</li>)}</ul>}</div>)}</div><p className="mt-3 font-body text-xs leading-5 text-oliveGray">Cada valor é atribuído à fonte que o declara. Nenhum é adoptado como verdadeiro, nenhum é somado aos outros e nenhum entra no apuramento do saldo corrente.</p></Secao>}
    <Secao titulo="Pendências">{pendencias.length ? <ListaEventos eventos={pendencias} /> : <Vazio>Não existem pendências estruturadas no período.</Vazio>}</Secao>
    {!financeiro && <Secao titulo="Fontes e evidências">{fontes.length ? <div className="divide-y divide-britishGreen/10 border-y border-britishGreen/15">{fontes.map((fonte) => <div key={fonte.id} data-print-item className="py-3"><p className="font-body text-sm font-medium text-ink">{fonte.titulo}</p>{fonte.referencia && <p className="mt-1 font-body text-xs text-oliveGray">{fonte.referencia}</p>}{fonte.url && <a href={fonte.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-body text-xs text-britishGreen"><ExternalLink className="h-3 w-3" /> Ver fonte</a>}</div>)}</div> : <Vazio>Não existem fontes documentais ligadas aos eventos deste período.</Vazio>}</Secao>}
    <footer className="mt-12 border-t border-britishGreen/20 pt-5 font-body text-xs leading-5 text-oliveGray">{f.nome} · {tituloPeriodo} · gerado em {data(new Date().toISOString())}<br />Documento gerado a partir do registo operacional e documental do PORTARIA.<br />Factos, inferências, conflitos e pendências são apresentados segundo a classificação existente no sistema à data de geração.</footer>
  </article>;
}

function fontesUnicas(eventos: ContratoMemoriaEvento[]) {
  const mapa = new Map<string, Fonte>();
  eventos.forEach((evento) =>
    (evento.contrato_memoria_evidencias ?? []).forEach((evidencia) =>
      (evidencia.ia_documental_fontes ?? []).forEach((fonte) => mapa.set(fonte.id, fonte)),
    ),
  );
  return [...mapa.values()];
}
function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) { return <section className="mt-10 break-inside-avoid"><h2 className="mb-4 font-title text-h3 text-ink">{titulo}</h2>{children}</section>; }
function Metrica({ label, valor }: { label: string; valor: string }) { return <div className="bg-paper px-4 py-4"><p className="font-body text-[10px] uppercase tracking-widest text-oliveGray">{label}</p><p className="mt-2 font-body text-lg font-semibold tabular-nums text-ink">{valor}</p></div>; }
function LinhaFinanceira({ titulo, valor }: { titulo: string; valor: number }) { return <div className="border-l-2 border-britishGreen/30 bg-paper px-4 py-3"><p className="font-body text-[10px] uppercase tracking-widest text-oliveGray">{titulo}</p><p className="mt-1 font-body text-lg font-semibold tabular-nums text-ink">{euro(valor)}</p></div>; }
function Tabela({ children }: { children: React.ReactNode }) { return <div className="overflow-x-auto border-y border-britishGreen/15"><table className="w-full min-w-[720px] text-left font-body text-xs text-oliveGray [&_td]:border-t [&_td]:border-britishGreen/10 [&_td]:px-3 [&_td]:py-3 [&_th]:px-3 [&_th]:py-3 [&_th]:text-[10px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-widest [&_th]:text-ink">{children}</table></div>; }
function Vazio({ children }: { children: React.ReactNode }) { return <p className="border-l-2 border-warmBeige/50 bg-softCream/30 px-4 py-3 font-body text-sm text-oliveGray">{children}</p>; }
function ListaEventos({ eventos }: { eventos: ContratoMemoriaEvento[] }) { return <div className="divide-y divide-britishGreen/10 border-y border-britishGreen/15">{eventos.map((e) => <div key={e.id} data-print-item className="py-4"><p className="font-body text-xs uppercase tracking-widest text-oliveGray">{data(e.data_evento)}</p><p className="mt-1 font-body text-sm font-semibold text-ink">{e.titulo}</p><p className="mt-1 font-body text-sm leading-6 text-oliveGray">{e.resumo}</p></div>)}</div>; }
