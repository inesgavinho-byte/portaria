import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BellRing,
  Building2,
  CalendarDays,
  CircleCheck,
  FileClock,
  Landmark,
  MessageSquareText,
  ReceiptText,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";

function euro(cents: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function dataHoje() {
  const parts = new Intl.DateTimeFormat("pt-PT", {
    timeZone: "Europe/Lisbon",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.weekday.charAt(0).toUpperCase()}${map.weekday.slice(1)}, ${map.day} de ${map.month} de ${map.year}`;
}

function isoHoje() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function primeiroDiaMes() {
  const hoje = isoHoje();
  return `${hoje.slice(0, 7)}-01`;
}

type Atencao = {
  titulo: string;
  subtitulo: string;
  valor?: string;
  detalhe: string;
  href: string;
  acao: string;
  tom: "dark" | "soft" | "light";
  icon: React.ReactNode;
};

type Evento = {
  data: string;
  titulo: string;
  detalhe: string;
  href?: string;
};

export default async function HojePage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");
  if (ctx.membership.role !== "admin") redirect("/avisos");

  const supabase = await createClient();
  const tenantId = ctx.tenant.id;
  const hoje = isoHoje();
  const inicioMes = primeiroDiaMes();
  const agora = new Date();
  const fim7 = new Date(agora.getTime() + 7 * 86400000).toISOString();
  const fim30 = new Date(agora.getTime() + 30 * 86400000).toISOString().slice(0, 10);

  const [
    { data: despesas },
    { data: movimentos },
    { data: pagamentos },
    { data: ocorrencias },
    { data: obrigacoes },
    { data: contratos },
    { data: assembleias },
    { data: reservas },
    { data: comunicacoes },
    { data: documentosRecentes },
  ] = await Promise.all([
    supabase
      .from("despesas")
      .select("id,descricao,valor_cents,estado,data_documento,data_vencimento,data_pagamento,fornecedor_id,fornecedores(nome),criado_em,atualizado_em")
      .eq("tenant_id", tenantId)
      .order("criado_em", { ascending: false }),
    supabase
      .from("movimentos_bancarios")
      .select("id,despesa_id,tipo,valor_cents,data_movimento,descricao,confirmado,criado_em")
      .eq("tenant_id", tenantId)
      .eq("confirmado", true)
      .order("data_movimento", { ascending: false }),
    supabase
      .from("pagamentos")
      .select("id,valor_cents,data_pagamento,referencia,criado_em")
      .eq("tenant_id", tenantId)
      .order("data_pagamento", { ascending: false }),
    supabase
      .from("ocorrencias")
      .select("id,titulo,fracao,estado,criado_em,atualizado_em")
      .eq("tenant_id", tenantId)
      .in("estado", ["novo", "em_curso", "aguarda_fornecedor"])
      .order("atualizado_em", { ascending: false }),
    supabase
      .from("obrigacoes_recorrentes")
      .select("id,titulo,categoria,periodicidade,valor_estimado_cents,proximo_vencimento,estado,fornecedores(nome),criado_em,atualizado_em")
      .eq("tenant_id", tenantId)
      .eq("estado", "ativa")
      .order("proximo_vencimento", { ascending: true, nullsFirst: false }),
    supabase
      .from("contratos")
      .select("id,titulo,data_fim,fornecedores(nome),atualizado_em")
      .eq("tenant_id", tenantId)
      .not("data_fim", "is", null)
      .gte("data_fim", hoje)
      .lte("data_fim", fim30)
      .order("data_fim", { ascending: true }),
    supabase
      .from("assembleias")
      .select("id,titulo,data_hora,local,estado")
      .eq("tenant_id", tenantId)
      .gte("data_hora", agora.toISOString())
      .lt("data_hora", fim7)
      .order("data_hora", { ascending: true }),
    supabase
      .from("reservas")
      .select("id,data_inicio,data_fim,estado,motivo")
      .eq("tenant_id", tenantId)
      .gte("data_inicio", agora.toISOString())
      .lt("data_inicio", fim7)
      .not("estado", "in", "(cancelada,rejeitada)")
      .order("data_inicio", { ascending: true }),
    supabase
      .from("comunicacoes")
      .select("id,assunto,descricao,estado,data_limite,criado_em,atualizado_em")
      .eq("tenant_id", tenantId)
      .order("atualizado_em", { ascending: false }),
    supabase
      .from("documentos")
      .select("id,titulo,upload_em")
      .eq("tenant_id", tenantId)
      .order("upload_em", { ascending: false })
      .limit(8),
  ]);

  const movs = movimentos ?? [];
  const ds = despesas ?? [];
  const pagamentosList = pagamentos ?? [];
  const ocorrenciasList = ocorrencias ?? [];
  const obrigacoesList = obrigacoes ?? [];
  const comunicacoesList = comunicacoes ?? [];
  const despesaComBanco = new Set(
    movs.filter((m) => m.tipo === "debito" && m.despesa_id).map((m) => m.despesa_id as string),
  );
  const porReconciliar = ds.filter(
    (d) => ["a_reconciliar", "pendente", "vencido"].includes(d.estado) && !despesaComBanco.has(d.id),
  );
  const valorPorReconciliar = porReconciliar.reduce((acc, d) => acc + Number(d.valor_cents ?? 0), 0);
  const recebidoMes = pagamentosList
    .filter((p) => p.data_pagamento >= inicioMes && p.data_pagamento <= hoje)
    .reduce((acc, p) => acc + Number(p.valor_cents ?? 0), 0);
  const recebidoAno = pagamentosList
    .filter((p) => String(p.data_pagamento).startsWith(hoje.slice(0, 4)))
    .reduce((acc, p) => acc + Number(p.valor_cents ?? 0), 0);
  const pagoBancoMes = movs
    .filter((m) => m.tipo === "debito" && m.data_movimento >= inicioMes && m.data_movimento <= hoje)
    .reduce((acc, m) => acc + Number(m.valor_cents ?? 0), 0);

  const prioridadeDespesa = porReconciliar[0];
  const prioridadeOcorrencia = ocorrenciasList[0];
  const contratoPrazo = (contratos ?? [])[0];
  const obrigacao = obrigacoesList[0];
  const comunicacoesAbertas = comunicacoesList.filter(
    (c) => !["concluida", "arquivada", "fechada"].includes(c.estado),
  );

  const atencao: Atencao[] = [];
  if (prioridadeDespesa) {
    const fornecedor = Array.isArray(prioridadeDespesa.fornecedores)
      ? prioridadeDespesa.fornecedores[0]?.nome
      : prioridadeDespesa.fornecedores?.nome;
    atencao.push({
      titulo: "Pagamento por reconciliar",
      subtitulo: fornecedor ?? prioridadeDespesa.descricao,
      valor: euro(Number(prioridadeDespesa.valor_cents)),
      detalhe: prioridadeDespesa.data_vencimento
        ? `Vencimento ${new Intl.DateTimeFormat("pt-PT").format(new Date(prioridadeDespesa.data_vencimento))}`
        : "Sem saída bancária confirmada",
      href: "/configuracao/financeiro",
      acao: "Ver detalhe",
      tom: "dark",
      icon: <ReceiptText className="h-5 w-5" />,
    });
  }
  if (prioridadeOcorrencia) {
    atencao.push({
      titulo: prioridadeOcorrencia.titulo,
      subtitulo: prioridadeOcorrencia.fracao ? `Fração ${prioridadeOcorrencia.fracao}` : "Ocorrência em aberto",
      detalhe: String(prioridadeOcorrencia.estado).replaceAll("_", " "),
      href: "/configuracao/ocorrencias",
      acao: "Ver ocorrência",
      tom: "soft",
      icon: <Wrench className="h-5 w-5" />,
    });
  }
  if (contratoPrazo) {
    const fornecedor = Array.isArray(contratoPrazo.fornecedores)
      ? contratoPrazo.fornecedores[0]?.nome
      : contratoPrazo.fornecedores?.nome;
    atencao.push({
      titulo: contratoPrazo.titulo,
      subtitulo: fornecedor ?? "Contrato",
      detalhe: `Termina em ${new Intl.DateTimeFormat("pt-PT").format(new Date(contratoPrazo.data_fim))}`,
      href: `/contratos/${contratoPrazo.id}`,
      acao: "Ver contrato",
      tom: "soft",
      icon: <ShieldCheck className="h-5 w-5" />,
    });
  } else if (obrigacao) {
    const fornecedor = Array.isArray(obrigacao.fornecedores)
      ? obrigacao.fornecedores[0]?.nome
      : obrigacao.fornecedores?.nome;
    atencao.push({
      titulo: obrigacao.titulo,
      subtitulo: fornecedor ?? "Obrigação recorrente",
      detalhe: obrigacao.proximo_vencimento
        ? `Próximo vencimento ${new Intl.DateTimeFormat("pt-PT").format(new Date(obrigacao.proximo_vencimento))}`
        : `${obrigacao.periodicidade} · activa`,
      href: "/configuracao/financeiro",
      acao: "Ver obrigação",
      tom: "soft",
      icon: <CalendarDays className="h-5 w-5" />,
    });
  }
  if (comunicacoesAbertas.length > 0) {
    atencao.push({
      titulo: "Comunicações",
      subtitulo: `${comunicacoesAbertas.length} por tratar`,
      detalhe: comunicacoesAbertas[0]?.assunto ?? "Caixa de comunicações",
      href: "/comunicacoes",
      acao: "Ver comunicações",
      tom: "light",
      icon: <MessageSquareText className="h-5 w-5" />,
    });
  }

  const proximos: Evento[] = [
    ...(assembleias ?? []).map((a) => ({
      data: a.data_hora,
      titulo: a.titulo,
      detalhe: a.local ?? "Assembleia",
      href: "/configuracao/assembleias",
    })),
    ...(reservas ?? []).map((r) => ({
      data: r.data_inicio,
      titulo: r.motivo ?? "Reserva",
      detalhe: `Reserva · ${r.estado}`,
      href: "/configuracao/reservas",
    })),
    ...obrigacoesList
      .filter((o) => o.proximo_vencimento && new Date(o.proximo_vencimento) <= new Date(fim7))
      .map((o) => ({
        data: o.proximo_vencimento as string,
        titulo: o.titulo,
        detalhe: o.periodicidade,
        href: "/configuracao/financeiro",
      })),
  ]
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
    .slice(0, 4);

  const atividade = [
    ...ds.map((d) => ({
      data: d.atualizado_em ?? d.criado_em,
      titulo: "Despesa actualizada",
      detalhe: d.descricao,
      href: "/configuracao/financeiro",
    })),
    ...movs.map((m) => ({
      data: m.criado_em ?? `${m.data_movimento}T12:00:00Z`,
      titulo: "Movimento bancário confirmado",
      detalhe: `${euro(Number(m.valor_cents))} · ${m.descricao}`,
      href: "/configuracao/financeiro/mapa",
    })),
    ...pagamentosList.map((p) => ({
      data: p.criado_em,
      titulo: "Pagamento de condomínio registado",
      detalhe: `${euro(Number(p.valor_cents))}${p.referencia ? ` · ${p.referencia}` : ""}`,
      href: "/configuracao/financeiro",
    })),
    ...ocorrenciasList.map((o) => ({
      data: o.atualizado_em,
      titulo: "Ocorrência actualizada",
      detalhe: o.titulo,
      href: "/configuracao/ocorrencias",
    })),
    ...(documentosRecentes ?? []).map((d) => ({
      data: d.upload_em,
      titulo: "Documento associado",
      detalhe: d.titulo,
      href: "/configuracao/documentos-administracao",
    })),
  ]
    .filter((a) => a.data)
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-4 pb-8">
      <header className="mb-1">
        <h1 className="font-title text-h1 text-ink">Hoje</h1>
        <p className="mt-1 font-body text-sm text-oliveGray">{dataHoje()}</p>
      </header>

      {atencao.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {atencao.slice(0, 4).map((item, index) => (
            <Link
              key={`${item.titulo}-${index}`}
              href={item.href}
              className={`group flex min-h-[180px] flex-col rounded-2xl border p-5 shadow-glass transition-all hover:-translate-y-0.5 hover:shadow-float ${
                item.tom === "dark"
                  ? "border-britishGreen bg-britishGreen text-white"
                  : item.tom === "soft"
                    ? "border-britishGreen/10 bg-britishGreenSoft/80 text-ink"
                    : "border-white/80 bg-white/80 text-ink"
              }`}
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-full border ${
                    item.tom === "dark"
                      ? "border-white/40 bg-white text-britishGreen"
                      : "border-britishGreen/10 bg-white/70 text-britishGreen"
                  }`}
                >
                  {item.icon}
                </span>
                <ArrowRight className={`h-4 w-4 transition-transform group-hover:translate-x-1 ${item.tom === "dark" ? "text-white/70" : "text-britishGreen"}`} />
              </div>
              <p className={`font-body text-sm font-semibold ${item.tom === "dark" ? "text-white" : "text-ink"}`}>{item.titulo}</p>
              <p className={`mt-1 font-body text-xs ${item.tom === "dark" ? "text-white/70" : "text-oliveGray"}`}>{item.subtitulo}</p>
              {item.valor && <p className={`mt-3 font-body text-2xl font-semibold tracking-[-0.03em] ${item.tom === "dark" ? "text-white" : "text-ink"}`}>{item.valor}</p>}
              <p className={`mt-auto pt-4 font-body text-xs ${item.tom === "dark" ? "text-white/75" : "text-britishGreen"}`}>{item.detalhe}</p>
            </Link>
          ))}
        </section>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-britishGreen/10 bg-britishGreenSoft/80 p-5">
          <CircleCheck className="h-5 w-5 text-britishGreen" />
          <p className="font-body text-sm text-ink">Não há assuntos prioritários neste momento.</p>
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        <Painel titulo="Hoje no condomínio" href="/timeline" link="Ver histórico">
          {atividade.length === 0 ? (
            <Vazio texto="Ainda não há actividade registada." />
          ) : (
            <div className="divide-y divide-britishGreen/10">
              {atividade.slice(0, 4).map((a, index) => (
                <Link key={`${a.titulo}-${index}`} href={a.href} className="grid grid-cols-[54px_1fr] gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="font-body text-xs font-semibold text-britishGreen">
                    {new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" }).format(new Date(a.data))}
                  </span>
                  <span>
                    <span className="block font-body text-sm font-medium text-ink">{a.titulo}</span>
                    <span className="mt-0.5 block font-body text-xs text-oliveGray">{a.detalhe}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Painel>

        <Painel titulo={`Financeiro ${hoje.slice(0, 4)}`} href="/configuracao/financeiro/mapa" link="Ver mapa de contas">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metrica label="Recebido este mês" valor={euro(recebidoMes)} />
            <Metrica label="Pago no banco este mês" valor={euro(pagoBancoMes)} />
            <Metrica label="Por reconciliar" valor={euro(valorPorReconciliar)} alerta={valorPorReconciliar > 0} />
            <Metrica label="Recebido no ano" valor={euro(recebidoAno)} />
          </div>
          {valorPorReconciliar > 0 && (
            <Link href="/configuracao/financeiro" className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-britishGreenSoft/80 px-4 py-3 text-britishGreen">
              <span className="flex items-center gap-2 font-body text-xs font-medium">
                <BellRing className="h-4 w-4" />
                {porReconciliar.length} despesas ainda precisam de reconciliação.
              </span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          )}
        </Painel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Painel titulo="Próximos 7 dias" href="/calendario" link="Ver calendário">
          {proximos.length === 0 ? (
            <Vazio texto="Sem eventos ou vencimentos nos próximos 7 dias." />
          ) : (
            <div className="divide-y divide-britishGreen/10">
              {proximos.map((evento, index) => (
                <Link key={`${evento.titulo}-${index}`} href={evento.href ?? "/calendario"} className="grid grid-cols-[58px_1fr] gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="rounded-lg bg-britishGreenSoft px-2 py-2 text-center font-body text-xs font-semibold text-britishGreen">
                    {new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", timeZone: "Europe/Lisbon" }).format(new Date(evento.data))}
                  </span>
                  <span>
                    <span className="block font-body text-sm font-medium text-ink">{evento.titulo}</span>
                    <span className="mt-0.5 block font-body text-xs text-oliveGray">{evento.detalhe}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Painel>

        <Painel titulo="Em aberto">
          <div className="divide-y divide-britishGreen/10">
            <LinhaAberto icon={<Wrench className="h-4 w-4" />} label="Ocorrências" valor={ocorrenciasList.length} href="/configuracao/ocorrencias" />
            <LinhaAberto icon={<ReceiptText className="h-4 w-4" />} label="Despesas por reconciliar" valor={porReconciliar.length} href="/configuracao/financeiro" />
            <LinhaAberto icon={<FileClock className="h-4 w-4" />} label="Obrigações activas" valor={obrigacoesList.length} href="/configuracao/financeiro" />
            <LinhaAberto icon={<MessageSquareText className="h-4 w-4" />} label="Comunicações por tratar" valor={comunicacoesAbertas.length} href="/comunicacoes" />
          </div>
        </Painel>
      </section>

      <Painel titulo="Últimas alterações" href="/timeline" link="Ver histórico completo">
        {atividade.length === 0 ? (
          <Vazio texto="Ainda não existem alterações recentes." />
        ) : (
          <div className="divide-y divide-britishGreen/10">
            {atividade.map((a, index) => (
              <Link key={`${a.titulo}-footer-${index}`} href={a.href} className="grid gap-2 py-3 first:pt-0 last:pb-0 md:grid-cols-[110px_190px_1fr_auto] md:items-center">
                <span className="font-body text-xs text-oliveGray">
                  {new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" }).format(new Date(a.data))}
                </span>
                <span className="font-body text-xs font-semibold text-britishGreen">{a.titulo}</span>
                <span className="truncate font-body text-sm text-ink">{a.detalhe}</span>
                <ArrowRight className="hidden h-4 w-4 text-britishGreen md:block" />
              </Link>
            ))}
          </div>
        )}
      </Painel>
    </div>
  );
}

function Painel({
  titulo,
  href,
  link,
  children,
}: {
  titulo: string;
  href?: string;
  link?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/80 bg-white/80 p-5 shadow-glass backdrop-blur-glass">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-title text-lg font-semibold text-ink">{titulo}</h2>
        {href && link && (
          <Link href={href} className="inline-flex items-center gap-1 font-body text-xs font-medium text-britishGreen hover:text-britishGreenDeep">
            {link} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Metrica({ label, valor, alerta = false }: { label: string; valor: string; alerta?: boolean }) {
  return (
    <div className="rounded-xl border border-britishGreen/10 bg-white/70 p-4">
      <p className="font-body text-xs text-oliveGray">{label}</p>
      <p className={`mt-2 font-body text-xl font-semibold tracking-[-0.03em] ${alerta ? "text-alert" : "text-ink"}`}>{valor}</p>
    </div>
  );
}

function LinhaAberto({ icon, label, valor, href }: { icon: React.ReactNode; label: string; valor: number; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <span className="flex items-center gap-3 font-body text-sm text-ink">
        <span className="text-britishGreen">{icon}</span>
        {label}
      </span>
      <span className="flex items-center gap-3">
        <span className="min-w-7 rounded-full bg-britishGreenSoft px-2 py-1 text-center font-body text-xs font-semibold text-britishGreen">{valor}</span>
        <ArrowRight className="h-4 w-4 text-oliveGray" />
      </span>
    </Link>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-britishGreenSoft/70 px-4 py-4">
      <CircleCheck className="h-4 w-4 text-britishGreen" />
      <p className="font-body text-sm text-oliveGray">{texto}</p>
    </div>
  );
}
