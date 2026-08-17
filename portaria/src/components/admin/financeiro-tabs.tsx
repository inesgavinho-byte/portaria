"use client";

import {
  useRouter,
} from "next/navigation";
import {
  useTransition,
} from "react";
import {
  BarChart3,
  Receipt,
  CreditCard,
  FileText,
  Settings,
  Clock,
  CheckCircle,
  Ban,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Landmark,
  Repeat2,
  Plus,
  Download,
} from "lucide-react";
import {
  QuotaMensal,
  Pagamento,
  Recibo,
  ConfiguracaoFinanceira,
  Despesa,
  ObrigacaoRecorrente,
} from "@/types/database";
import { CalendarioAdministrativo as CalendarioAdministrativoDados, DashboardFinanceiro, DespesaResumo, OpcaoFinanceira, gerarQuotasMensais, emitirRecibo, anularRecibo } from "@/lib/actions/financeiro";
import { DespesasObrigacoesPainel } from "@/components/admin/despesas-obrigacoes-painel";
import { CalendarioAdministrativo } from "@/components/admin/calendario-administrativo";

function centsToEuro(cents: number) {
  return (cents / 100).toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
  });
}

function formatMesAno(ano: number, mes: number) {
  const nomes = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
  ];
  return `${nomes[mes - 1]} ${ano}`;
}

function estadoBadge(estado: string) {
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    pendente: { label: "Pendente", className: "bg-amber-100 text-amber-800", icon: <Clock className="w-3 h-3" /> },
    pago: { label: "Pago", className: "bg-emerald-100 text-emerald-800", icon: <CheckCircle className="w-3 h-3" /> },
    parcial: { label: "Parcial", className: "bg-sky-100 text-sky-800", icon: <Clock className="w-3 h-3" /> },
    isento: { label: "Isento", className: "bg-gray-100 text-gray-600", icon: <Ban className="w-3 h-3" /> },
    emitido: { label: "Emitido", className: "bg-emerald-100 text-emerald-800", icon: <CheckCircle className="w-3 h-3" /> },
    anulado: { label: "Anulado", className: "bg-red-100 text-red-800", icon: <Ban className="w-3 h-3" /> },
  };
  const cfg = map[estado] ?? { label: estado, className: "bg-gray-100 text-gray-600", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-body ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  { key: "quotas", label: "Quotas", icon: Receipt },
  { key: "pagamentos", label: "Pagamentos", icon: CreditCard },
  { key: "recibos", label: "Recibos", icon: FileText },
  { key: "despesas", label: "Despesas", icon: Landmark },
  { key: "obrigacoes", label: "Obrigações", icon: Repeat2 },
  { key: "calendario", label: "Calendário", icon: Clock },
  { key: "configuracao", label: "Configuração", icon: Settings },
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function FinanceiroTabs({
  tab,
  ano,
  mes,
  dashboard,
  quotas,
  pagamentos,
  recibos,
  configuracao,
  despesas,
  obrigacoes,
  resumoDespesas,
  fornecedores,
  contratos,
  documentosAdministracao,
  calendario,
}: {
  tab: string;
  ano: number;
  mes: number;
  dashboard: DashboardFinanceiro;
  quotas: QuotaMensal[];
  pagamentos: Pagamento[];
  recibos: Recibo[];
  configuracao: ConfiguracaoFinanceira | null;
  despesas: Despesa[];
  obrigacoes: ObrigacaoRecorrente[];
  resumoDespesas: DespesaResumo;
  fornecedores: OpcaoFinanceira[];
  contratos: OpcaoFinanceira[];
  documentosAdministracao: OpcaoFinanceira[];
  calendario: CalendarioAdministrativoDados;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setTab(t: string) {
    startTransition(() => {
      router.push(`/configuracao/financeiro?tab=${t}&ano=${ano}&mes=${mes}`);
    });
  }

  return (
    <div>
      <div className="border-b border-warmBeige/30 mb-6">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 font-body text-sm whitespace-nowrap border-b-2 transition-colors ${
                  active
                    ? "border-ink text-ink"
                    : "border-transparent text-oliveGray hover:text-ink"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {pending && (
        <div className="text-oliveGray font-body text-sm mb-4">A carregar…</div>
      )}

      {tab === "dashboard" && <TabDashboard dashboard={dashboard} ano={ano} mes={mes} />}
      {tab === "quotas" && <TabQuotas quotas={quotas} ano={ano} mes={mes} />}
      {tab === "pagamentos" && <TabPagamentos pagamentos={pagamentos} />}
      {tab === "recibos" && <TabRecibos recibos={recibos} />}
      {tab === "calendario" && (
        <CalendarioAdministrativo eventos={calendario.eventos} alertas={calendario.alertasAbertos} />
      )}
      {(tab === "despesas" || tab === "obrigacoes") && (
        <DespesasObrigacoesPainel
          despesas={despesas}
          obrigacoes={obrigacoes}
          resumo={resumoDespesas}
          fornecedores={fornecedores}
          contratos={contratos}
          documentos={documentosAdministracao}
        />
      )}
      {tab === "configuracao" && <TabConfiguracao configuracao={configuracao} />}
    </div>
  );
}

// ============================================================================
// TAB DASHBOARD
// ============================================================================

function TabDashboard({
  dashboard,
  ano,
  mes,
}: {
  dashboard: DashboardFinanceiro;
  ano: number;
  mes: number;
}) {
  const { resumoMes, topDevedores, configuracao } = dashboard;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          label="Recebido"
          value={centsToEuro(resumoMes?.total_recebido ?? 0)}
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
        />
        <Card
          label="Pendente"
          value={centsToEuro(resumoMes?.total_a_receber ?? 0)}
          icon={<TrendingDown className="w-5 h-5 text-amber-600" />}
        />
        <Card
          label="Quotas Pagas"
          value={`${resumoMes?.pagas ?? 0}`}
          icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
        />
        <Card
          label="Inadimplência"
          value={`${topDevedores.length} frações`}
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
        />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-title text-lg text-ink">{formatMesAno(ano, mes)}</h2>
        <div className="flex gap-2">
          <MesSelector ano={ano} mes={mes} />
        </div>
      </div>

      <div>
        <h3 className="font-title text-sm tracking-widest uppercase text-oliveGray mb-3">
          Top Devedores
        </h3>
        {topDevedores.length === 0 ? (
          <p className="font-body text-sm text-oliveGray">Nenhuma fração em dívida. 🎉</p>
        ) : (
          <div className="border border-warmBeige/30 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-warmBeige/10">
                <tr>
                  <th className="text-left px-3 py-2 font-body text-xs tracking-widest uppercase text-oliveGray">Fração</th>
                  <th className="text-left px-3 py-2 font-body text-xs tracking-widest uppercase text-oliveGray">Proprietário</th>
                  <th className="text-right px-3 py-2 font-body text-xs tracking-widest uppercase text-oliveGray">Dívida</th>
                  <th className="text-right px-3 py-2 font-body text-xs tracking-widest uppercase text-oliveGray">Meses</th>
                </tr>
              </thead>
              <tbody>
                {topDevedores.map((d) => (
                  <tr key={d.fracao_id} className="border-t border-warmBeige/20">
                    <td className="px-3 py-2 font-body text-ink">{d.codigo}</td>
                    <td className="px-3 py-2 font-body text-oliveGray">{d.proprietario_nome ?? "—"}</td>
                    <td className="px-3 py-2 font-body text-ink text-right font-medium">
                      {centsToEuro(d.divida_total)}
                    </td>
                    <td className="px-3 py-2 font-body text-oliveGray text-right">{d.meses_pendentes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {configuracao?.iban && (
        <div className="border-l-4 border-ink bg-ink/5 px-4 py-3">
          <p className="font-body text-xs tracking-widest uppercase text-oliveGray mb-1">
            Dados de pagamento
          </p>
          <p className="font-body text-sm text-ink">
            <span className="font-medium">IBAN:</span> {configuracao.iban}
          </p>
          {configuracao.mbway_telefone && (
            <p className="font-body text-sm text-ink">
              <span className="font-medium">MBway:</span> {configuracao.mbway_telefone}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Card({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="border border-warmBeige/30 bg-paper p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-body text-xs tracking-widest uppercase text-oliveGray">{label}</span>
        {icon}
      </div>
      <p className="font-title text-xl text-ink">{value}</p>
    </div>
  );
}

// ============================================================================
// TAB QUOTAS
// ============================================================================

function TabQuotas({ quotas, ano, mes }: { quotas: QuotaMensal[]; ano: number; mes: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function handleGerarQuotas() {
    startTransition(async () => {
      await gerarQuotasMensais(ano, mes);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-title text-lg text-ink">Quotas de {formatMesAno(ano, mes)}</h2>
          <p className="font-body text-sm text-oliveGray">{quotas.length} quotas registadas</p>
        </div>
        <div className="flex gap-2">
          <MesSelector ano={ano} mes={mes} />
          <button
            onClick={handleGerarQuotas}
            disabled={pending}
            className="inline-flex items-center gap-1 px-4 py-2 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Gerar quotas
          </button>
        </div>
      </div>

      {quotas.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-warmBeige/40">
          <Receipt className="w-8 h-8 text-oliveGray/40 mx-auto mb-3" />
          <p className="font-body text-oliveGray">Nenhuma quota para este período.</p>
          <p className="font-body text-sm text-oliveGray/60 mt-1">
            Clique em &quot;Gerar quotas&quot; para criar quotas para todas as frações.
          </p>
        </div>
      ) : (
        <div className="border border-warmBeige/30 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warmBeige/10">
              <tr>
                <th className="text-left px-3 py-2 font-body text-xs tracking-widest uppercase text-oliveGray">Fração</th>
                <th className="text-left px-3 py-2 font-body text-xs tracking-widest uppercase text-oliveGray">Valor</th>
                <th className="text-left px-3 py-2 font-body text-xs tracking-widest uppercase text-oliveGray">Vencimento</th>
                <th className="text-left px-3 py-2 font-body text-xs tracking-widest uppercase text-oliveGray">Estado</th>
                <th className="text-left px-3 py-2 font-body text-xs tracking-widest uppercase text-oliveGray">Notas</th>
              </tr>
            </thead>
            <tbody>
              {quotas.map((q) => (
                <tr key={q.id} className="border-t border-warmBeige/20">
                  <td className="px-3 py-2 font-body text-ink">{(q as unknown as { fracoes?: { codigo: string } }).fracoes?.codigo ?? q.fracao_id.slice(0, 8)}</td>
                  <td className="px-3 py-2 font-body text-ink">{centsToEuro(q.valor_cents)}</td>
                  <td className="px-3 py-2 font-body text-oliveGray">{q.vencimento ?? "—"}</td>
                  <td className="px-3 py-2">{estadoBadge(q.estado)}</td>
                  <td className="px-3 py-2 font-body text-oliveGray text-xs">{q.notas ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB PAGAMENTOS
// ============================================================================

function TabPagamentos({ pagamentos }: { pagamentos: Pagamento[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-title text-lg text-ink">Pagamentos</h2>
          <p className="font-body text-sm text-oliveGray">{pagamentos.length} pagamentos registados</p>
        </div>
      </div>

      {pagamentos.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-warmBeige/40">
          <CreditCard className="w-8 h-8 text-oliveGray/40 mx-auto mb-3" />
          <p className="font-body text-oliveGray">Nenhum pagamento registado.</p>
        </div>
      ) : (
        <div className="border border-warmBeige/30 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warmBeige/10">
              <tr>
                <th className="text-left px-3 py-2 font-body text-xs tracking-widest uppercase text-oliveGray">Fração</th>
                <th className="text-left px-3 py-2 font-body text-xs tracking-widest uppercase text-oliveGray">Valor</th>
                <th className="text-left px-3 py-2 font-body text-xs tracking-widest uppercase text-oliveGray">Método</th>
                <th className="text-left px-3 py-2 font-body text-xs tracking-widest uppercase text-oliveGray">Data</th>
                <th className="text-left px-3 py-2 font-body text-xs tracking-widest uppercase text-oliveGray">Referência</th>
              </tr>
            </thead>
            <tbody>
              {pagamentos.map((p) => (
                <tr key={p.id} className="border-t border-warmBeige/20">
                  <td className="px-3 py-2 font-body text-ink">
                    {(p as unknown as { fracoes?: { codigo: string; proprietario_nome: string } }).fracoes?.codigo ?? p.fracao_id.slice(0, 8)}
                  </td>
                  <td className="px-3 py-2 font-body text-ink font-medium">{centsToEuro(p.valor_cents)}</td>
                  <td className="px-3 py-2 font-body text-oliveGray capitalize">{p.metodo.replace("_", " ")}</td>
                  <td className="px-3 py-2 font-body text-oliveGray">{p.data_pagamento}</td>
                  <td className="px-3 py-2 font-body text-oliveGray text-xs">{p.referencia ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB RECIBOS
// ============================================================================

function TabRecibos({ recibos }: { recibos: Recibo[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function handleAnular(reciboId: string) {
    const motivo = prompt("Motivo da anulação?");
    if (!motivo) return;
    startTransition(async () => {
      await anularRecibo(reciboId, motivo);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-title text-lg text-ink">Recibos</h2>
          <p className="font-body text-sm text-oliveGray">{recibos.length} recibos emitidos</p>
        </div>
      </div>

      {recibos.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-warmBeige/40">
          <FileText className="w-8 h-8 text-oliveGray/40 mx-auto mb-3" />
          <p className="font-body text-oliveGray">Nenhum recibo emitido.</p>
          <p className="font-body text-sm text-oliveGray/60 mt-1">
            Os recibos são gerados a partir dos pagamentos registados.
          </p>
        </div>
      ) : (
        <div className="border border-warmBeige/30 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-warmBeige/10">
              <tr>
                <th className="text-left px-3 py-2 font-body text-xs tracking-widest uppercase text-oliveGray">Número</th>
                <th className="text-left px-3 py-2 font-body text-xs tracking-widest uppercase text-oliveGray">Fração</th>
                <th className="text-left px-3 py-2 font-body text-xs tracking-widest uppercase text-oliveGray">Valor</th>
                <th className="text-left px-3 py-2 font-body text-xs tracking-widest uppercase text-oliveGray">Período</th>
                <th className="text-left px-3 py-2 font-body text-xs tracking-widest uppercase text-oliveGray">Estado</th>
                <th className="text-right px-3 py-2 font-body text-xs tracking-widest uppercase text-oliveGray">Ações</th>
              </tr>
            </thead>
            <tbody>
              {recibos.map((r) => (
                <tr key={r.id} className="border-t border-warmBeige/20">
                  <td className="px-3 py-2 font-body text-ink font-medium">{r.numero}</td>
                  <td className="px-3 py-2 font-body text-oliveGray">
                    {(r as unknown as { fracoes?: { codigo: string } }).fracoes?.codigo ?? r.fracao_id.slice(0, 8)}
                  </td>
                  <td className="px-3 py-2 font-body text-ink">{centsToEuro(r.valor_cents)}</td>
                  <td className="px-3 py-2 font-body text-oliveGray text-xs">
                    {r.periodo_inicio && r.periodo_fim
                      ? `${r.periodo_inicio.slice(0, 7)} → ${r.periodo_fim.slice(0, 7)}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2">{estadoBadge(r.estado)}</td>
                  <td className="px-3 py-2 text-right">
                    {r.pdf_url && (
                      <a
                        href={r.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-ink hover:text-oliveGray transition-colors mr-3"
                      >
                        <Download className="w-3.5 h-3.5" />
                        PDF
                      </a>
                    )}
                    {r.estado === "emitido" && (
                      <button
                        onClick={() => handleAnular(r.id)}
                        disabled={pending}
                        className="text-sm text-red-600 hover:text-red-800 transition-colors"
                      >
                        Anular
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB CONFIGURAÇÃO
// ============================================================================

function TabConfiguracao({ configuracao }: { configuracao: ConfiguracaoFinanceira | null }) {
  const router = useRouter();

  return (
    <div className="max-w-xl">
      <h2 className="font-title text-lg text-ink mb-4">Configuração Financeira</h2>

      <form
        action={async (formData: FormData) => {
          const { configurarFinanceiro } = await import("@/lib/actions/financeiro");
          await configurarFinanceiro({}, formData);
          router.refresh();
        }}
        className="space-y-5"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2">
              Dia de vencimento
            </label>
            <input
              type="number"
              name="dia_vencimento_padrao"
              defaultValue={configuracao?.dia_vencimento_padrao ?? 8}
              min={1}
              max={28}
              className="w-full px-3 py-2 border border-warmBeige/30 bg-paper font-body text-sm text-ink"
            />
          </div>
          <div>
            <label className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2">
              Método padrão
            </label>
            <select
              name="metodo_pagamento_padrao"
              defaultValue={configuracao?.metodo_pagamento_padrao ?? "transferencia"}
              className="w-full px-3 py-2 border border-warmBeige/30 bg-paper font-body text-sm text-ink"
            >
              <option value="transferencia">Transferência bancária</option>
              <option value="mbway">MBway</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="debito_direto">Débito direto</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2">
            IBAN do condomínio
          </label>
          <input
            name="iban"
            defaultValue={configuracao?.iban ?? ""}
            placeholder="PT50 1234 5678 9012 3456 7890 1"
            className="w-full px-3 py-2 border border-warmBeige/30 bg-paper font-body text-sm text-ink"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2">
              MBway
            </label>
            <input
              name="mbway_telefone"
              defaultValue={configuracao?.mbway_telefone ?? ""}
              placeholder="912345678"
              className="w-full px-3 py-2 border border-warmBeige/30 bg-paper font-body text-sm text-ink"
            />
          </div>
          <div>
            <label className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2">
              Email financeiro
            </label>
            <input
              name="email_financeiro"
              type="email"
              defaultValue={configuracao?.email_financeiro ?? ""}
              placeholder="financeiro@condominio.pt"
              className="w-full px-3 py-2 border border-warmBeige/30 bg-paper font-body text-sm text-ink"
            />
          </div>
        </div>

        <div>
          <label className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2">
            Taxa de juros de mora (%/ano)
          </label>
          <input
            type="number"
            name="taxa_juros_mora"
            defaultValue={configuracao?.taxa_juros_mora ?? 0}
            step="0.01"
            min={0}
            className="w-full px-3 py-2 border border-warmBeige/30 bg-paper font-body text-sm text-ink"
          />
        </div>

        <button
          type="submit"
          className="px-8 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors"
        >
          Guardar configuração
        </button>
      </form>
    </div>
  );
}

// ============================================================================
// SELECTOR DE MÊS/ANO
// ============================================================================

function MesSelector({ ano, mes }: { ano: number; mes: number }) {
  const router = useRouter();
  const meses = [
    "Jan","Fev","Mar","Abr","Mai","Jun",
    "Jul","Ago","Set","Out","Nov","Dez",
  ];

  return (
    <div className="flex items-center gap-2">
      <select
        value={mes}
        onChange={(e) => {
          const novoMes = parseInt(e.target.value);
          router.push(`/configuracao/financeiro?tab=quotas&ano=${ano}&mes=${novoMes}`);
        }}
        className="px-3 py-1.5 border border-warmBeige/30 bg-paper font-body text-sm text-ink"
      >
        {meses.map((m, i) => (
          <option key={i + 1} value={i + 1}>{m}</option>
        ))}
      </select>
      <select
        value={ano}
        onChange={(e) => {
          const novoAno = parseInt(e.target.value);
          router.push(`/configuracao/financeiro?tab=quotas&ano=${novoAno}&mes=${mes}`);
        }}
        className="px-3 py-1.5 border border-warmBeige/30 bg-paper font-body text-sm text-ink"
      >
        {[ano - 1, ano, ano + 1].map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
    </div>
  );
}
