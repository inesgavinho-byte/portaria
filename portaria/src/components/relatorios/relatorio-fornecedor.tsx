/**
 * Composição do relatório do fornecedor.
 *
 * Recebe dados já apurados e devolve UMA árvore de HTML que serve o ecrã e o
 * papel. Não há `CorpoRelatorioScreen` nem `CorpoRelatorioPDF`: a diferença
 * entre os dois está toda em `src/styles/relatorio-print.css`, que reajusta
 * tipografia, larguras e quebras sem esconder nem reordenar conteúdo.
 *
 * Não busca dados e não é assíncrono, por duas razões. A rota fica com uma
 * responsabilidade só — carregar e apurar — e a composição passa a ser
 * renderizável fora da rota autenticada, o que permite verificá-la com dados
 * reais sem uma sessão.
 */

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { RelatorioFornecedorImprimir } from "@/components/admin/relatorio-fornecedor-imprimir";
import { conflitosDocumentais, propostasComValor } from "@/lib/relatorios/valores-fornecedor";
import { agruparPorAno, indexarEvidencias, type IndiceEvidencias } from "@/lib/relatorios/evidencias";
import {
  Celula,
  MarcaNatureza,
  NotaRodape,
  Numero,
  Referencias,
  Secao,
  Tabela,
  Vazio,
  dataCurta,
  dataLonga,
  euro,
  type Coluna,
} from "@/components/relatorios/relatorio-ui";
import type { Contrato, ContratoMemoriaEvento, Despesa, Fornecedor } from "@/types/database";

export type MovimentoRelatorio = {
  id: string;
  fornecedor_id: string | null;
  despesa_id: string | null;
  data_movimento: string;
  tipo: "debito" | "credito";
  valor_cents: number;
  descricao: string;
  contraparte: string | null;
  referencia_externa: string | null;
  confirmado: boolean;
  estado_reconciliacao: string;
};

/** Apuramentos financeiros do período, todos em cêntimos. */
export type TotaisRelatorio = {
  facturado: number;
  pagoConfirmado: number;
  pagoDocumental: number;
  emAberto: number;
  condicionado: number;
  /** Soma dos valores declarados nos contratos, ou null se nenhum o declara. */
  contratado: number | null;
  /** Saídas confirmadas em banco sem factura identificada. */
  confirmadoSemFactura: number;
};

export type DadosRelatorio = {
  fornecedorId: string;
  fornecedor: Fornecedor;
  tenantNome: string;
  contratos: Contrato[];
  despesas: Despesa[];
  movimentos: MovimentoRelatorio[];
  eventos: ContratoMemoriaEvento[];
  /** Anos com actividade, do mais recente para o mais antigo. */
  anos: string[];
  /** Ano seleccionado, ou "" para todo o histórico. */
  ano: string;
  financeiro: boolean;
  totais: TotaisRelatorio;
  geradoEm: string;
  hrefFiltro: (novos: { ano?: string; modo?: string }) => string;
};

export function RelatorioFornecedor({
  fornecedorId: id,
  fornecedor: f,
  tenantNome,
  contratos: cts,
  despesas: despesasPeriodo,
  movimentos: movimentosPeriodo,
  eventos: eventosPeriodo,
  anos,
  ano,
  financeiro,
  totais,
  geradoEm,
  hrefFiltro: href,
}: DadosRelatorio) {
  const {
    facturado,
    pagoConfirmado,
    pagoDocumental,
    emAberto,
    condicionado,
    contratado: valorContratado,
    confirmadoSemFactura,
  } = totais;

  const conflitos = conflitosDocumentais(eventosPeriodo);
  const pendencias = eventosPeriodo.filter((e) => e.natureza === "pendente");
  const propostas = propostasComValor(eventosPeriodo);
  const indice = indexarEvidencias(eventosPeriodo);

  /*
   * O modo financeiro omite a secção de fontes. Uma referência `[E04]` sem a
   * lista onde E04 é identificado não é uma referência, é ruído: nesse modo as
   * citações aparecem por extenso onde estão e os códigos calam-se.
   */
  const comReferencias = !financeiro && indice.fontes.length > 0;
  const refs = (eventoId: string) => (comReferencias ? (indice.codigosPorEvento.get(eventoId) ?? []) : []);

  const tituloPeriodo = ano ? `Ano ${ano}` : "Todo o histórico";
  const botao = (activo: boolean) =>
    `px-3 py-2 font-body text-xs ${activo ? "bg-britishGreen text-white" : "border border-britishGreen/25 text-britishGreen hover:bg-britishGreenSoft"}`;

  return (
    // `data-documento="largo"` faz o invólucro do shell ceder de 1152px para
    // 1400px, para o relatório ter proporção editorial num monitor grande sem
    // que a rota precise do seu próprio layout.
    <article data-documento="largo" className="relatorio w-full pb-16">
      {/* ------------------------------------------------ controlos, só ecrã */}
      <div data-chrome="app" className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/fornecedores/${id}`}
          className="inline-flex items-center gap-1 font-body text-xs font-semibold uppercase tracking-widest text-oliveGray hover:text-britishGreen"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Fornecedor
        </Link>
        <RelatorioFornecedorImprimir />
      </div>

      {/* ------------------------------------------------------- cabeçalho */}
      <header data-bloco className="border-y border-britishGreen/30 py-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <p className="font-body text-[11px] font-semibold uppercase tracking-[0.28em] text-britishGreen">PORTARIA</p>
          <p className="font-body text-[11px] font-semibold uppercase tracking-[0.28em] text-oliveGray">
            Relatório do fornecedor
          </p>
        </div>
        <h1 className="mt-5 max-w-[24ch] font-title text-[2.6rem] leading-[1.05] text-ink">{f.nome}</h1>
        <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 border-t border-britishGreen/15 pt-4 font-body text-xs sm:grid-cols-4">
          <Campo termo="NIF" valor={f.nif ?? "Não registado"} />
          <Campo termo="Categoria" valor={f.categoria ?? "Não classificada"} />
          <Campo termo="Período" valor={tituloPeriodo} />
          <Campo termo="Gerado em" valor={dataLonga(geradoEm)} />
        </dl>
      </header>

      {/* ---------------------------------------------------- filtros, só ecrã */}
      <nav
        data-chrome="app"
        className="no-print my-6 flex flex-wrap items-center gap-2 border-b border-britishGreen/15 pb-5"
      >
        <span className="mr-2 font-body text-[11px] font-semibold uppercase tracking-widest text-oliveGray">Período</span>
        <Link href={href({ ano: "" })} className={botao(!ano)}>
          Todo o histórico
        </Link>
        {anos.map((item) => (
          <Link key={item} href={href({ ano: item })} className={botao(ano === item)}>
            {item}
          </Link>
        ))}
        <span className="ml-4 mr-1 font-body text-[11px] font-semibold uppercase tracking-widest text-oliveGray">
          Modo
        </span>
        <Link href={href({ modo: "completo" })} className={botao(!financeiro)}>
          Completo
        </Link>
        <Link href={href({ modo: "financeiro" })} className={botao(financeiro)}>
          Financeiro
        </Link>
      </nav>

      <main>
        {/* --------------------------------------------- resumo executivo */}
        <Secao titulo="Resumo executivo" nota={tituloPeriodo}>
          <div
            data-bloco="resumo"
            className="grid grid-cols-2 gap-x-8 gap-y-6 divide-britishGreen/15 border-y border-britishGreen/20 py-6 sm:grid-cols-4 sm:divide-x"
          >
            <Numero rotulo="Despesas / facturado" valor={euro(facturado)} destaque nota={`${despesasPeriodo.length} documento(s)`} />
            <div className="sm:pl-8">
              <Numero
                rotulo="Saídas confirmadas"
                valor={euro(pagoConfirmado)}
                destaque
                nota="Confirmadas em extracto bancário"
              />
            </div>
            <div className="sm:pl-8">
              <Numero rotulo="Em aberto" valor={euro(emAberto)} destaque nota="Facturado menos saídas confirmadas" />
            </div>
            <div className="sm:pl-8">
              <Numero
                rotulo="Condicionado / retido"
                valor={condicionado ? euro(condicionado) : "—"}
                destaque
                nota={condicionado ? "Retenção registada em acontecimento" : "Sem retenção registada"}
              />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-5 border-b border-britishGreen/15 pb-5 sm:grid-cols-4">
            <Numero rotulo="Contratos" valor={String(cts.length)} />
            <Numero
              rotulo="Valor contratado"
              valor={valorContratado === null ? "Não estruturado" : euro(valorContratado)}
            />
            <Numero rotulo="Divergências" valor={conflitos.length ? String(conflitos.length) : "—"} />
            <Numero rotulo="Pendências" valor={pendencias.length ? String(pendencias.length) : "—"} />
          </div>
        </Secao>

        {/* ------------------------------------------ reconciliação financeira */}
        <Secao titulo="Reconciliação financeira" nota="Do documentado ao condicionado">
          <div data-bloco="reconciliacao">
            <Tabela colunas={COLUNAS_RECONCILIACAO}>
              <LinhaReconciliacao
                etapa="Contratado / documentado"
                valor={valorContratado === null ? null : valorContratado}
                observacao={
                  valorContratado === null
                    ? "Nenhum contrato declara valor em campo estruturado."
                    : "Soma dos valores declarados nos contratos."
                }
              />
              <LinhaReconciliacao
                etapa="Facturado"
                valor={facturado}
                observacao={`${despesasPeriodo.length} documento(s) de despesa no período.`}
              />
              <LinhaReconciliacao
                etapa="Pago confirmado"
                valor={pagoConfirmado}
                observacao={
                  confirmadoSemFactura > 0
                    ? `${euro(confirmadoSemFactura)} confirmado no banco sem factura identificada.`
                    : "Movimentos a débito confirmados e atribuídos a este fornecedor."
                }
              />
              <LinhaReconciliacao
                etapa="Em aberto"
                valor={emAberto}
                observacao="Facturado menos saídas confirmadas em extracto."
              />
              <LinhaReconciliacao
                etapa="Condicionado"
                valor={condicionado}
                observacao={
                  condicionado
                    ? "Despesa referenciada por acontecimento com efeito de retenção."
                    : "Sem retenção registada no período."
                }
              />
            </Tabela>
          </div>
          {/*
            Só é divergência quando alguma despesa está marcada como paga. Com
            zero despesas pagas não há contradição a relatar — há ausência de
            marcação, que não merece um parágrafo.
          */}
          {pagoDocumental > 0 && pagoDocumental !== pagoConfirmado && (
            <NotaRodape>
              O estado documental das despesas indica {euro(pagoDocumental)} como pago, valor que não coincide com as{" "}
              {euro(pagoConfirmado)} confirmadas em extracto. A sequência acima usa a confirmação bancária; o estado
              documental é declaração, não prova de pagamento.
            </NotaRodape>
          )}
          <NotaRodape>
            Movimentos sem despesa associada são mantidos como confirmação bancária sem atribuição definitiva a uma
            factura. Não são distribuídos por documentos com o mesmo valor.
          </NotaRodape>
          {propostas.length > 0 && (
            <div data-bloco className="mt-6 border-l-2 border-britishGreen bg-britishGreenSoft/40 px-5 py-4">
              <p className="font-body text-[10px] font-semibold uppercase tracking-[0.14em] text-britishGreen">
                Valores propostos, cada um no seu âmbito
              </p>
              <dl className="mt-3 space-y-2">
                {propostas.map((proposta) => (
                  <div key={proposta.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                    <dt className="font-body text-xs text-oliveGray">
                      {dataCurta(proposta.data)} · {proposta.titulo}
                    </dt>
                    <dd className="font-title text-base tabular-nums text-ink">{euro(proposta.cents)}</dd>
                  </div>
                ))}
              </dl>
              <NotaRodape>
                Propostas de âmbitos diferentes não são somadas nem substituídas umas pelas outras, e nenhuma é adoptada
                como valor contratual.
                {conflitos.length > 0 ? " Ver divergências documentais." : ""}
              </NotaRodape>
            </div>
          )}
        </Secao>

        {/* ------------------------------------------------------- contratos */}
        {!financeiro && (
          <Secao titulo="Contratos" nota={`${cts.length} registado(s)`}>
            {cts.length ? (
              <dl className="divide-y divide-britishGreen/12 border-y border-britishGreen/20">
                {cts.map((c) => (
                  <div key={c.id} data-bloco className="grid gap-x-8 gap-y-2 py-4 md:grid-cols-[minmax(0,22rem)_1fr]">
                    <div>
                      <dt className="font-body text-sm font-semibold text-ink">
                        <Link href={`/contratos/${c.id}`} className="hover:text-britishGreen">
                          {c.titulo}
                        </Link>
                      </dt>
                      <dd className="mt-1 font-body text-xs text-oliveGray">
                        {[
                          c.referencia,
                          c.data_inicio ? `Início ${dataCurta(c.data_inicio)}` : null,
                          c.data_fim ? `Fim ${dataCurta(c.data_fim)}` : null,
                          c.valor !== null ? euro(c.valor * 100) : "Valor não estruturado",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </dd>
                    </div>
                    {c.descricao && (
                      <dd className="max-w-[70ch] font-body text-sm leading-6 text-oliveGray">{c.descricao}</dd>
                    )}
                  </div>
                ))}
              </dl>
            ) : (
              <Vazio>Não existem contratos registados para este fornecedor.</Vazio>
            )}
          </Secao>
        )}

        {/* ---------------------------------------------------- divergências */}
        {conflitos.length > 0 && (
          <Secao titulo="Divergências documentais" nota={`${conflitos.length} por reconciliar`}>
            <div className="space-y-4">
              {conflitos.map((e) => (
                <div key={e.id} data-bloco data-realce className="border-l-2 border-alert/60 bg-alert/5 px-5 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                    <p className="font-body text-sm font-semibold text-ink">{e.titulo}</p>
                    <p className="font-body text-[10px] uppercase tracking-[0.14em] text-oliveGray">
                      {dataCurta(e.data_evento)} <MarcaNatureza natureza="conflito" />
                    </p>
                  </div>
                  <p className="mt-1.5 max-w-[80ch] font-body text-sm leading-6 text-oliveGray">{e.resumo}</p>
                  {(e.contrato_memoria_evidencias ?? []).length > 0 && (
                    <ul className="mt-3 space-y-1.5 border-l border-alert/25 pl-4">
                      {(e.contrato_memoria_evidencias ?? []).map((ev) => (
                        <li key={ev.id} className="font-body text-xs leading-5 text-oliveGray">
                          <span className="italic">“{ev.citacao}”</span>{" "}
                          <Referencias codigos={comReferencias ? codigosDaEvidencia(ev, indice) : []} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            <NotaRodape>
              Cada valor é atribuído à fonte que o declara. Nenhum é adoptado como verdadeiro, nenhum é somado aos
              outros e nenhum entra no apuramento da reconciliação acima.
            </NotaRodape>
          </Secao>
        )}

        {/* ------------------------------------------------------ cronologia */}
        {!financeiro && (
          <Secao titulo="Cronologia da contratação" nota={`${eventosPeriodo.length} acontecimento(s)`}>
            {eventosPeriodo.length ? (
              <div className="space-y-8">
                {agruparPorAno(eventosPeriodo).map(({ ano: anoGrupo, eventos }) => (
                  <div key={anoGrupo} data-ano={anoGrupo}>
                    <h3 className="mb-2 font-title text-lg tabular-nums text-britishGreen">{anoGrupo}</h3>
                    <ol className="divide-y divide-britishGreen/12 border-y border-britishGreen/20">
                      {eventos.map((e) => (
                        <li
                          key={e.id}
                          data-bloco
                          className="grid gap-x-6 gap-y-1 py-3 md:grid-cols-[6rem_1fr_7rem] md:items-baseline"
                        >
                          <p className="font-body text-[11px] uppercase tracking-[0.1em] text-oliveGray">
                            {dataCurta(e.data_evento)}
                          </p>
                          <div className="min-w-0">
                            <p className="font-body text-sm font-semibold leading-5 text-ink">
                              {e.titulo}{" "}
                              <span className="font-normal text-oliveGray">
                                <MarcaNatureza natureza={e.natureza} />
                              </span>
                            </p>
                            <p className="mt-0.5 max-w-[85ch] font-body text-xs leading-5 text-oliveGray">
                              {e.resumo}{" "}
                              <Referencias codigos={refs(e.id)} />
                            </p>
                          </div>
                          <p className="font-body text-xs tabular-nums text-ink md:text-right">
                            {e.valor_cents !== null ? euro(e.valor_cents) : ""}
                            <span className="block font-normal text-[10px] uppercase tracking-[0.1em] text-oliveGray">
                              {e.tipo}
                            </span>
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            ) : (
              <Vazio>Não existe memória estruturada da contratação.</Vazio>
            )}
          </Secao>
        )}

        {/* --------------------------------------------------------- facturas */}
        <Secao titulo="Facturas e despesas" nota={`${despesasPeriodo.length} documento(s)`}>
          {despesasPeriodo.length ? (
            <Tabela colunas={COLUNAS_DESPESAS}>
              {despesasPeriodo.map((d) => {
                const temBanco = movimentosPeriodo.some((m) => m.despesa_id === d.id && m.confirmado);
                return (
                  <tr key={d.id} data-bloco>
                    <Celula>{dataCurta(d.data_documento ?? d.criado_em)}</Celula>
                    <Celula>{d.numero_documento ?? d.referencia ?? "—"}</Celula>
                    <Celula>{d.descricao}</Celula>
                    <Celula numerico>{euro(d.valor_cents)}</Celula>
                    <Celula esbatido>{d.estado.replaceAll("_", " ")}</Celula>
                    <Celula esbatido>{temBanco ? "Associado" : "Não individualizado"}</Celula>
                  </tr>
                );
              })}
            </Tabela>
          ) : (
            <Vazio>Não existem facturas ou despesas registadas no período.</Vazio>
          )}
        </Secao>

        {/* ------------------------------------------------------ movimentos */}
        <Secao titulo="Movimentos bancários" nota={`${movimentosPeriodo.length} movimento(s)`}>
          {movimentosPeriodo.length ? (
            <Tabela colunas={COLUNAS_MOVIMENTOS}>
              {movimentosPeriodo.map((m) => (
                <tr key={m.id} data-bloco>
                  <Celula>{dataCurta(m.data_movimento)}</Celula>
                  <Celula esbatido>{m.tipo}</Celula>
                  <Celula numerico>{euro(m.valor_cents)}</Celula>
                  <Celula>{m.contraparte ?? m.descricao}</Celula>
                  <Celula esbatido>{m.confirmado ? "Confirmado" : "Por confirmar"}</Celula>
                  <Celula esbatido>
                    {m.despesa_id
                      ? m.estado_reconciliacao
                      : m.fornecedor_id === id
                        ? "Fornecedor atribuído — factura por identificar"
                        : "Sem atribuição estrutural"}
                  </Celula>
                </tr>
              ))}
            </Tabela>
          ) : (
            <Vazio>Não existem movimentos bancários associados no período.</Vazio>
          )}
        </Secao>

        {/* -------------------------------------------------------- pendências */}
        <Secao titulo="Pendências" nota={`${pendencias.length} em aberto`}>
          {pendencias.length ? (
            <ol className="divide-y divide-britishGreen/12 border-y border-britishGreen/20">
              {pendencias.map((e) => (
                <li key={e.id} data-bloco className="grid gap-x-6 gap-y-1 py-3 md:grid-cols-[6rem_1fr]">
                  <p className="font-body text-[11px] uppercase tracking-[0.1em] text-oliveGray">
                    {dataCurta(e.data_evento)}
                  </p>
                  <div>
                    <p className="font-body text-sm font-semibold text-ink">{e.titulo}</p>
                    <p className="mt-0.5 max-w-[85ch] font-body text-xs leading-5 text-oliveGray">
                      {e.resumo} <Referencias codigos={refs(e.id)} />
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <Vazio>Não existem pendências estruturadas no período.</Vazio>
          )}
        </Secao>

        {/* ---------------------------------------------- fontes e evidências */}
        {!financeiro && (
          <Secao titulo="Fontes e evidências" nota={`${indice.fontes.length} fonte(s)`}>
            {indice.fontes.length ? (
              <>
                <ol className="divide-y divide-britishGreen/12 border-y border-britishGreen/20">
                  {indice.fontes.map((fonte) => (
                    <li key={fonte.id} data-bloco className="grid gap-x-5 gap-y-1 py-3 md:grid-cols-[3.5rem_1fr]">
                      <p className="font-body text-xs font-semibold tracking-[0.08em] text-britishGreen">
                        {fonte.codigo}
                      </p>
                      <div className="min-w-0">
                        <p className="font-body text-sm leading-5 text-ink">
                          {fonte.url ? (
                            <a href={fonte.url} target="_blank" rel="noreferrer" data-url={fonte.url}>
                              {fonte.titulo}
                            </a>
                          ) : (
                            fonte.titulo
                          )}
                        </p>
                        <p className="mt-0.5 font-body text-[11px] leading-4 text-oliveGray">
                          {[
                            fonte.referencia,
                            fonte.localizadores.slice(0, 3).join("; ") || null,
                            fonte.ocorrencias > 1 ? `${fonte.ocorrencias} citações` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {fonte.citacao && (
                          <p className="mt-1 max-w-[90ch] font-body text-[11px] italic leading-4 text-oliveGray">
                            “{fonte.citacao.length > 180 ? `${fonte.citacao.slice(0, 180)}…` : fonte.citacao}”
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
                <NotaRodape>
                  O corpo do relatório refere as fontes pelo código entre parênteses rectos. Os códigos são coordenadas
                  deste documento e dependem do período seleccionado; o identificador estável de cada fonte é o seu
                  registo no arquivo.
                </NotaRodape>
              </>
            ) : (
              <Vazio>Não existem fontes documentais ligadas aos acontecimentos deste período.</Vazio>
            )}
          </Secao>
        )}
      </main>

      {/* ---------------------------------------------------------- rodapé */}
      <footer data-rodape className="mt-14 border-t border-britishGreen/30 pt-5">
        <p className="font-body text-[11px] font-semibold uppercase tracking-[0.2em] text-britishGreen">PORTARIA</p>
        <p className="mt-1 font-body text-sm text-ink">{tenantNome}</p>
        <p className="mt-3 max-w-[85ch] font-body text-xs leading-5 text-oliveGray">
          Documento gerado a partir do registo operacional e documental do PORTARIA. Factos, inferências, conflitos e
          pendências reflectem a classificação existente no sistema à data de geração.
        </p>
        <p className="mt-2 font-body text-xs text-oliveGray">
          {f.nome} · {tituloPeriodo} · gerado em {dataLonga(geradoEm)}
        </p>
      </footer>
    </article>
  );
}

/* -------------------------------------------------------------------- peças */

function Campo({ termo, valor }: { termo: string; valor: string }) {
  return (
    <div>
      <dt className="font-body text-[10px] font-semibold uppercase tracking-[0.14em] text-oliveGray">{termo}</dt>
      <dd className="mt-1 font-body text-sm text-ink">{valor}</dd>
    </div>
  );
}

const COLUNAS_RECONCILIACAO: Coluna[] = [
  { cabecalho: "Etapa", largura: "24%" },
  { cabecalho: "Valor", largura: "18%", numerico: true },
  { cabecalho: "Base do apuramento", largura: "58%" },
];

const COLUNAS_DESPESAS: Coluna[] = [
  { cabecalho: "Data", largura: "11%" },
  { cabecalho: "Documento", largura: "12%" },
  { cabecalho: "Descrição", largura: "40%" },
  { cabecalho: "Valor", largura: "12%", numerico: true },
  { cabecalho: "Estado documental", largura: "13%" },
  { cabecalho: "Banco", largura: "12%" },
];

const COLUNAS_MOVIMENTOS: Coluna[] = [
  { cabecalho: "Data", largura: "11%" },
  { cabecalho: "Tipo", largura: "8%" },
  { cabecalho: "Valor", largura: "12%", numerico: true },
  { cabecalho: "Contraparte / descrição", largura: "37%" },
  { cabecalho: "Confirmação", largura: "12%" },
  { cabecalho: "Reconciliação", largura: "20%" },
];

function LinhaReconciliacao({
  etapa,
  valor,
  observacao,
}: {
  etapa: string;
  valor: number | null;
  observacao: string;
}) {
  return (
    <tr data-bloco>
      <Celula>
        <span className="font-body text-xs font-semibold uppercase tracking-[0.1em] text-ink">{etapa}</span>
      </Celula>
      <Celula numerico>
        <span className="font-title text-base text-ink">{valor === null ? "—" : euro(valor)}</span>
      </Celula>
      <Celula esbatido>{observacao}</Celula>
    </tr>
  );
}

/** Códigos das fontes citadas por uma evidência concreta. */
function codigosDaEvidencia(
  evidencia: { ia_documental_fontes?: { id: string }[] },
  indice: IndiceEvidencias,
): string[] {
  return (evidencia.ia_documental_fontes ?? [])
    .map((fonte) => indice.codigoPorFonte.get(fonte.id))
    .filter((codigo): codigo is string => Boolean(codigo));
}
