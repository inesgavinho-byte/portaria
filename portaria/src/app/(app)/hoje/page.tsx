import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CircleCheck,
  FileClock,
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
    const fornecedor = prioridadeDespesa.fornecedores?.[0]?.nome;
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
    const fornecedor = contratoPrazo.fornecedores?.[0]?.nome;
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
    const fornecedor = obrigacao.fornecedores?.[0]?.nome;
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

  const nomePerfil = [
    ctx.user.user_metadata?.nome,
    ctx.user.user_metadata?.full_name,
    ctx.user.email?.split("@")[0]?.replace(/[._-]+/g, " "),
  ].find((valor): valor is string => typeof valor === "string" && valor.trim().length > 0);
  const nome = nomePerfil
    ? nomePerfil.trim().split(/\s+/)[0].replace(/^./, (letra) => letra.toUpperCase())
    : null;

  return (
    <div className="pb-12">
      <header className="mb-12 grid gap-6 border-b border-black/[0.07] pb-10 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="doorkeeper-eyebrow mb-5">{dataHoje()}</p>
          <h1 className="max-w-3xl font-title text-[clamp(3.2rem,6vw,5.8rem)] font-normal leading-[0.95] text-ink">
            Bom dia{nome ? `, ${nome}` : ""}.
          </h1>
          <p className="mt-6 font-body text-base text-oliveGray md:text-lg">
            {atencao.length > 0
              ? `${atencao.length === 1 ? "Há um assunto" : `Há ${atencao.length} assuntos`} que precisa${atencao.length === 1 ? "" : "m"} de ti.`
              : "Não há assuntos prioritários neste momento."}
          </p>
        </div>
        <Link
          href="/configuracao"
          className="doorkeeper-link inline-flex items-center gap-2 lg:pb-1"
        >
          {ctx.tenant.nome}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <div className="grid gap-14 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.65fr)] xl:gap-16">
        <section>
          <p className="doorkeeper-eyebrow mb-4">As tuas prioridades</p>
          {atencao.length > 0 ? (
            <ol className="doorkeeper-list">
              {atencao.slice(0, 4).map((item, index) => (
                <li key={`${item.titulo}-${index}`}>
                  <Link
                    href={item.href}
                    className="group grid min-h-[7.25rem] grid-cols-[3.25rem_1fr_auto] items-center gap-4 py-5 transition-colors hover:bg-white/55 sm:grid-cols-[4.25rem_1fr_auto] sm:px-3"
                  >
                    <span className="font-title text-3xl font-normal text-doorkeeperTurquoise sm:text-4xl">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-title text-xl font-normal text-ink sm:text-2xl">
                        {item.titulo}
                      </span>
                      <span className="mt-1 block font-body text-sm text-oliveGray">
                        {item.subtitulo}
                        {item.valor ? ` · ${item.valor}` : ""}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 pl-2">
                      <span className="hidden font-body text-xs font-medium text-doorkeeperTerracotta sm:block">
                        {item.detalhe}
                      </span>
                      <ArrowRight className="h-4 w-4 text-ink transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <div className="flex min-h-40 items-center gap-4 border-y border-black/[0.07] py-8">
              <CircleCheck className="h-5 w-5 text-doorkeeperTurquoise" />
              <div>
                <p className="font-title text-2xl text-ink">Tudo tratado.</p>
                <p className="mt-1 font-body text-sm text-oliveGray">
                  O edifício não precisa da tua atenção neste momento.
                </p>
              </div>
            </div>
          )}
        </section>

        <aside className="border-black/[0.08] xl:border-l xl:pl-10">
          <section className="border-b border-black/[0.07] pb-8">
            <p className="doorkeeper-eyebrow">Edifício em foco</p>
            <h2 className="mt-4 font-title text-3xl font-normal text-ink">
              {ctx.tenant.nome}
            </h2>
            <p className="mt-2 font-body text-sm text-oliveGray">
              Centro operacional do condomínio
            </p>
            <Link href="/configuracao" className="doorkeeper-link mt-5 inline-flex items-center gap-2">
              Ver detalhes <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>

          <section className="border-b border-black/[0.07] py-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-title text-2xl font-normal text-ink">Próximos 7 dias</h2>
              <Link href="/calendario" className="doorkeeper-link text-xs">Calendário</Link>
            </div>
            {proximos.length === 0 ? (
              <p className="mt-5 font-body text-sm text-oliveGray">Sem eventos próximos.</p>
            ) : (
              <div className="mt-5 divide-y divide-black/[0.07]">
                {proximos.slice(0, 3).map((evento, index) => (
                  <Link key={`${evento.titulo}-${index}`} href={evento.href ?? "/calendario"} className="grid grid-cols-[4rem_1fr] gap-3 py-3">
                    <span className="font-body text-xs font-semibold uppercase text-oliveGray">
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
          </section>

          <section className="pt-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-title text-2xl font-normal text-ink">Resumo financeiro</h2>
              <Link href="/configuracao/financeiro" className="doorkeeper-link text-xs">Abrir</Link>
            </div>
            <dl className="mt-5 space-y-3">
              <LinhaFinanceira label="Recebido este mês" valor={euro(recebidoMes)} />
              <LinhaFinanceira label="Pago este mês" valor={euro(pagoBancoMes)} />
              <LinhaFinanceira label="Por reconciliar" valor={euro(valorPorReconciliar)} alerta={valorPorReconciliar > 0} />
              <LinhaFinanceira label="Recebido no ano" valor={euro(recebidoAno)} destaque />
            </dl>
          </section>
        </aside>
      </div>

      <section className="mt-16 grid gap-12 border-t border-black/[0.07] pt-10 lg:grid-cols-2">
        <Painel titulo="Em aberto">
          <div className="divide-y divide-black/[0.07]">
            <LinhaAberto icon={<Wrench className="h-4 w-4" />} label="Ocorrências" valor={ocorrenciasList.length} href="/configuracao/ocorrencias" />
            <LinhaAberto icon={<ReceiptText className="h-4 w-4" />} label="Despesas por reconciliar" valor={porReconciliar.length} href="/configuracao/financeiro" />
            <LinhaAberto icon={<FileClock className="h-4 w-4" />} label="Obrigações activas" valor={obrigacoesList.length} href="/configuracao/financeiro" />
            <LinhaAberto icon={<MessageSquareText className="h-4 w-4" />} label="Comunicações por tratar" valor={comunicacoesAbertas.length} href="/comunicacoes" />
          </div>
        </Painel>

        <Painel titulo="Últimas alterações" href="/timeline" link="Ver histórico">
          {atividade.length === 0 ? (
            <Vazio texto="Ainda não existem alterações recentes." />
          ) : (
            <div className="divide-y divide-black/[0.07]">
              {atividade.slice(0, 4).map((item, index) => (
                <Link key={`${item.titulo}-footer-${index}`} href={item.href} className="grid grid-cols-[5.5rem_1fr] gap-3 py-3">
                  <span className="font-body text-xs text-oliveGray">
                    {new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" }).format(new Date(item.data))}
                  </span>
                  <span>
                    <span className="block font-body text-sm font-medium text-ink">{item.titulo}</span>
                    <span className="mt-0.5 block truncate font-body text-xs text-oliveGray">{item.detalhe}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Painel>
      </section>
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
    <section>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-title text-2xl font-normal text-ink">{titulo}</h2>
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

function LinhaFinanceira({ label, valor, alerta = false, destaque = false }: { label: string; valor: string; alerta?: boolean; destaque?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 font-body text-sm ${destaque ? "border-t border-black/[0.07] pt-4" : ""}`}>
      <dt className="text-oliveGray">{label}</dt>
      <dd className={`${alerta ? "text-alert" : "text-ink"} ${destaque ? "font-semibold" : "font-medium"}`}>{valor}</dd>
    </div>
  );
}

function LinhaAberto({ icon, label, valor, href }: { icon: React.ReactNode; label: string; valor: number; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <span className="flex items-center gap-3 font-body text-sm text-ink">
        <span className="text-doorkeeperTurquoise">{icon}</span>
        {label}
      </span>
      <span className="flex items-center gap-3">
        <span className="min-w-7 font-body text-xs font-semibold text-doorkeeperTurquoise">{valor}</span>
        <ArrowRight className="h-4 w-4 text-oliveGray" />
      </span>
    </Link>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <div className="flex items-center gap-3 py-4">
      <CircleCheck className="h-4 w-4 text-doorkeeperTurquoise" />
      <p className="font-body text-sm text-oliveGray">{texto}</p>
    </div>
  );
}
