/**
 * Suite de matriz RLS — FINANCEIRO (A2.2).
 *
 * Cobertura tabela a tabela das tabelas financeiras multi-tenant que as
 * suites existentes não cobrem por SELECT directo:
 *   • 0027: quotas_mensais, configuracao_financeira, pagamentos, recibos
 *     (o p0-financeiro cobre as views e as RPCs; aqui cobrem-se as tabelas);
 *   • 2026-08: financeiro_exercicios, financeiro_contas_anuais,
 *     movimentos_bancarios;
 *   • 0035/0037: despesas, despesas_documentos, despesas_historico_estados,
 *     obrigacoes_recorrentes;
 *   • 0044: contribuicoes_extraordinarias, contribuicao_prestacoes,
 *     contribuicao_prestacao_fracoes.
 *
 * Regra matriz: leitura de quotas/pagamentos/recibos limitada à fração própria
 * do membro; todas as restantes tabelas financeiras são admin-only.
 * Padrão idêntico a rls-p0.test.ts: PostgREST directo, skip sem env.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ANON_KEY, hasEnv, userClient, anonClient, restInsert, serviceClient } from "./helpers";
import { seed, type Fixtures } from "./fixtures";

const d = hasEnv ? describe : describe.skip;

/** Sem acesso = erro (grant/RLS com erro) ou zero linhas devolvidas. */
function semAcesso(r: { data: unknown[] | null; error: { message: string } | null }): boolean {
  return r.error !== null || (r.data ?? []).length === 0;
}

d("RLS matriz — financeiro (tabelas 0027, 2026-08, despesas, contribuições)", () => {
  let fx: Fixtures;
  let fracaoCondoA: string;
  let fracaoOutraA: string;
  let exercicioA: string;
  let contaA: string;
  let movimentoA: string;
  let despesaA: string;
  let despesaDocA: string;
  let despesaHistA: string;
  let obrigacaoA: string;
  let contribuicaoA: string;
  let prestacaoA: string;
  let prestacaoFraccaoA: string;
  let quotaCondoA: string;
  let pagamentoA: string;
  let reciboA: string;

  beforeAll(async () => {
    fx = await seed();
    const svc = serviceClient();

    // Frações: a do condoA (ligada à membership) e outra sem dono.
    const { data: f1 } = await svc
      .from("fracoes")
      .insert({ tenant_id: fx.tenantA, codigo: `MATZ-${stamp()}`, quota_mensal_cents: 5000 })
      .select("id")
      .single();
    fracaoCondoA = (f1 as { id: string }).id;
    const { data: f2 } = await svc
      .from("fracoes")
      .insert({ tenant_id: fx.tenantA, codigo: `MATO-${stamp()}`, quota_mensal_cents: 5000 })
      .select("id")
      .single();
    fracaoOutraA = (f2 as { id: string }).id;
    await svc
      .from("user_tenants")
      .update({ fracao_id: fracaoCondoA })
      .eq("user_id", fx.users.condoA.id)
      .eq("tenant_id", fx.tenantA);

    // 0027 — quotas, configuração, pagamento e recibo na fração do condoA.
    quotaCondoA = uid();
    await svc.from("quotas_mensais").insert({
      id: quotaCondoA, tenant_id: fx.tenantA, fracao_id: fracaoCondoA,
      ano: 2088, mes: 5, valor_cents: 5000, estado: "pendente",
    });
    await svc.from("configuracao_financeira").upsert(
      { tenant_id: fx.tenantA, dia_vencimento_padrao: 8 },
      { onConflict: "tenant_id" }
    );
    pagamentoA = uid();
    await svc.from("pagamentos").insert({
      id: pagamentoA, tenant_id: fx.tenantA, fracao_id: fracaoCondoA,
      valor_cents: 5000, metodo: "transferencia", data_pagamento: "2088-05-08",
    });
    reciboA = uid();
    await svc.from("recibos").insert({
      id: reciboA, tenant_id: fx.tenantA, fracao_id: fracaoCondoA,
      numero: `MAT-${stamp()}`, valor_cents: 5000,
    });

    // 2026-08 — exercício, conta anual e movimento bancário.
    exercicioA = uid();
    await svc.from("financeiro_exercicios").insert({
      id: exercicioA, tenant_id: fx.tenantA, ano: 2088, estado: "aberto", titulo: "Exercício matriz",
    });
    contaA = uid();
    await svc.from("financeiro_contas_anuais").insert({
      id: contaA, tenant_id: fx.tenantA, exercicio_id: exercicioA,
      codigo: "1", descricao: "Despesas correntes", grupo: "despesa_corrente",
    });
    movimentoA = uid();
    await svc.from("movimentos_bancarios").insert({
      id: movimentoA, tenant_id: fx.tenantA, data_movimento: "2088-05-01",
      tipo: "debito", valor_cents: 5000, descricao: "Movimento matriz",
    });

    // 0035/0037 — obrigação, despesa, documento de despesa e histórico.
    obrigacaoA = uid();
    await svc.from("obrigacoes_recorrentes").insert({
      id: obrigacaoA, tenant_id: fx.tenantA, titulo: "Elevadores", categoria: "elevadores",
    });
    despesaA = uid();
    await svc.from("despesas").insert({
      id: despesaA, tenant_id: fx.tenantA, descricao: "Factura matriz",
      categoria: "outro", valor_cents: 5000, estado: "pendente",
    });
    // despesas_documentos liga a despesa a um documento do arquivo confidencial.
    const docAdminA = uid();
    await svc.from("documentos_administracao").insert({
      id: docAdminA, tenant_id: fx.tenantA, titulo: "Factura matriz (arquivo)", categoria: "outro",
      ficheiro_path: `admin/${fx.tenantA}/${docAdminA}/fatura.pdf`, upload_por: fx.users.adminA.id,
    });
    despesaDocA = uid();
    await svc.from("despesas_documentos").insert({
      id: despesaDocA, tenant_id: fx.tenantA, despesa_id: despesaA,
      documento_administracao_id: docAdminA, papel: "fatura",
    });
    despesaHistA = uid();
    await svc.from("despesas_historico_estados").insert({
      id: despesaHistA, tenant_id: fx.tenantA, despesa_id: despesaA,
      estado_novo: "pendente", motivo: "matriz",
    });

    // 0044 — contribuição extraordinária, prestação e posição por fração.
    contribuicaoA = uid();
    await svc.from("contribuicoes_extraordinarias").insert({
      id: contribuicaoA, tenant_id: fx.tenantA, titulo: "Obras fachada",
      estado: "ativa", total_cents: 100000, criado_por: fx.users.adminA.id,
    });
    prestacaoA = uid();
    await svc.from("contribuicao_prestacoes").insert({
      id: prestacaoA, tenant_id: fx.tenantA, contribuicao_id: contribuicaoA,
      ordem: 1, designacao: "1.a prestação", vencimento: "2088-06-01", valor_cents: 100000,
    });
    prestacaoFraccaoA = uid();
    await svc.from("contribuicao_prestacao_fracoes").insert({
      id: prestacaoFraccaoA, tenant_id: fx.tenantA, prestacao_id: prestacaoA,
      fracao_id: fracaoCondoA, valor_cents: 100000,
    });
  }, 60_000);

  afterAll(async () => {
    if (fx) await fx.cleanup();
  }, 60_000);

  // ------------------------------------------------------------ 0027
  describe("quotas_mensais — leitura da fração própria", () => {
    it("POS: condómino lê a quota da sua fração", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data, error } = await c.from("quotas_mensais").select("id").eq("id", quotaCondoA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: condómino não lê a quota de fração alheia", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const r = await c.from("quotas_mensais").select("id").eq("fracao_id", fracaoOutraA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: inquilino (sem fração) não lê quotas", async () => {
      const c = userClient(fx.users.inquiA.accessToken);
      const r = await c.from("quotas_mensais").select("id").eq("tenant_id", fx.tenantA);
      expect(semAcesso(r)).toBe(true);
    });

    it("POS: admin lê todas as quotas do tenant", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data, error } = await c.from("quotas_mensais").select("id").eq("tenant_id", fx.tenantA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: membro de outro tenant não lê quotas do tenant A", async () => {
      const c = userClient(fx.users.condoB.accessToken);
      const r = await c.from("quotas_mensais").select("id").eq("tenant_id", fx.tenantA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: anon não lê quotas", async () => {
      const c = anonClient();
      const r = await c.from("quotas_mensais").select("id").limit(1);
      expect(semAcesso(r)).toBe(true);
    });
  });

  describe("configuracao_financeira — leitura de membro", () => {
    it("POS: condómino lê a configuração do tenant", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data, error } = await c.from("configuracao_financeira").select("tenant_id").eq("tenant_id", fx.tenantA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: membro de outro tenant não lê a configuração do tenant A", async () => {
      const c = userClient(fx.users.condoB.accessToken);
      const r = await c.from("configuracao_financeira").select("tenant_id").eq("tenant_id", fx.tenantA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: anon não lê a configuração", async () => {
      const c = anonClient();
      const r = await c.from("configuracao_financeira").select("tenant_id").limit(1);
      expect(semAcesso(r)).toBe(true);
    });
  });

  describe("pagamentos e recibos — leitura da fração própria", () => {
    it("POS: condómino lê o pagamento da sua fração", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data, error } = await c.from("pagamentos").select("id").eq("id", pagamentoA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: condómino não lê pagamentos de fração alheia", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const r = await c.from("pagamentos").select("id").eq("fracao_id", fracaoOutraA);
      expect(semAcesso(r)).toBe(true);
    });

    it("POS: admin lê pagamentos e recibos do tenant", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const rPg = await c.from("pagamentos").select("id").eq("id", pagamentoA);
      const rRc = await c.from("recibos").select("id").eq("id", reciboA);
      expect(rPg.error).toBeNull();
      expect((rPg.data ?? []).length).toBe(1);
      expect(rRc.error).toBeNull();
      expect((rRc.data ?? []).length).toBe(1);
    });

    it("POS: condómino lê o recibo da sua fração", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data, error } = await c.from("recibos").select("id").eq("id", reciboA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: inquilino não lê recibos", async () => {
      const c = userClient(fx.users.inquiA.accessToken);
      const r = await c.from("recibos").select("id").eq("tenant_id", fx.tenantA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: anon não lê pagamentos nem recibos", async () => {
      const c = anonClient();
      const rPg = await c.from("pagamentos").select("id").limit(1);
      const rRc = await c.from("recibos").select("id").limit(1);
      expect(semAcesso(rPg)).toBe(true);
      expect(semAcesso(rRc)).toBe(true);
    });
  });

  // ------------------------------------------------------------ 2026-08
  describe("financeiro_exercicios e financeiro_contas_anuais (admin-only)", () => {
    it("POS: admin lê exercício e contas", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const rEx = await c.from("financeiro_exercicios").select("id").eq("id", exercicioA);
      const rCt = await c.from("financeiro_contas_anuais").select("id").eq("id", contaA);
      expect(rEx.error).toBeNull();
      expect((rEx.data ?? []).length).toBe(1);
      expect(rCt.error).toBeNull();
      expect((rCt.data ?? []).length).toBe(1);
    });

    it("NEG: condómino não lê exercícios nem contas", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const rEx = await c.from("financeiro_exercicios").select("id").eq("tenant_id", fx.tenantA);
      const rCt = await c.from("financeiro_contas_anuais").select("id").eq("tenant_id", fx.tenantA);
      expect(semAcesso(rEx)).toBe(true);
      expect(semAcesso(rCt)).toBe(true);
    });

    it("NEG: admin de outro tenant não lê o exercício do tenant A", async () => {
      const c = userClient(fx.users.adminB.accessToken);
      const r = await c.from("financeiro_exercicios").select("id").eq("id", exercicioA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: anon não lê exercícios", async () => {
      const c = anonClient();
      const r = await c.from("financeiro_exercicios").select("id").limit(1);
      expect(semAcesso(r)).toBe(true);
    });

    it("POS: admin insere exercício no seu tenant", async () => {
      const { status } = await restInsert(
        "financeiro_exercicios",
        { tenant_id: fx.tenantA, ano: 2089, titulo: "Matriz insert" },
        { apikey: ANON_KEY, token: fx.users.adminA.accessToken }
      );
      expect(status).toBeLessThan(400);
    });

    it("NEG: condómino não insere exercício", async () => {
      const { status } = await restInsert(
        "financeiro_exercicios",
        { tenant_id: fx.tenantA, ano: 2090, titulo: "forjado" },
        { apikey: ANON_KEY, token: fx.users.condoA.accessToken }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });

    it("NEG: admin de outro tenant não insere exercício no tenant A", async () => {
      const { status } = await restInsert(
        "financeiro_exercicios",
        { tenant_id: fx.tenantA, ano: 2091, titulo: "cross" },
        { apikey: ANON_KEY, token: fx.users.adminB.accessToken }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("movimentos_bancarios (admin-only)", () => {
    it("POS: admin lê os movimentos do tenant", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data, error } = await c.from("movimentos_bancarios").select("id").eq("id", movimentoA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: condómino não lê movimentos", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const r = await c.from("movimentos_bancarios").select("id").eq("tenant_id", fx.tenantA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: admin de outro tenant não lê movimentos do tenant A", async () => {
      const c = userClient(fx.users.adminB.accessToken);
      const r = await c.from("movimentos_bancarios").select("id").eq("id", movimentoA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: anon não lê movimentos", async () => {
      const c = anonClient();
      const r = await c.from("movimentos_bancarios").select("id").limit(1);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: condómino não insere movimentos", async () => {
      const { status } = await restInsert(
        "movimentos_bancarios",
        { tenant_id: fx.tenantA, data_movimento: "2088-01-01", tipo: "debito", valor_cents: 1, descricao: "forjado" },
        { apikey: ANON_KEY, token: fx.users.condoA.accessToken }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });
  });

  // -------------------------------------------------- despesas (0035/0037)
  describe("despesas, documentos e histórico de estados (admin-only)", () => {
    it("POS: admin lê despesa, documento e histórico", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const rD = await c.from("despesas").select("id").eq("id", despesaA);
      const rDD = await c.from("despesas_documentos").select("id").eq("id", despesaDocA);
      const rH = await c.from("despesas_historico_estados").select("id").eq("id", despesaHistA);
      expect(rD.error).toBeNull();
      expect((rD.data ?? []).length).toBe(1);
      expect(rDD.error).toBeNull();
      expect((rDD.data ?? []).length).toBe(1);
      expect(rH.error).toBeNull();
      expect((rH.data ?? []).length).toBe(1);
    });

    it("NEG: condómino não lê despesas", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const r = await c.from("despesas").select("id").eq("tenant_id", fx.tenantA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: condómino não lê documentos nem histórico de despesas", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const rDD = await c.from("despesas_documentos").select("id").eq("tenant_id", fx.tenantA);
      const rH = await c.from("despesas_historico_estados").select("id").eq("tenant_id", fx.tenantA);
      expect(semAcesso(rDD)).toBe(true);
      expect(semAcesso(rH)).toBe(true);
    });

    it("NEG: admin de outro tenant não lê despesas do tenant A", async () => {
      const c = userClient(fx.users.adminB.accessToken);
      const r = await c.from("despesas").select("id").eq("id", despesaA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: anon não lê despesas", async () => {
      const c = anonClient();
      const r = await c.from("despesas").select("id").limit(1);
      expect(semAcesso(r)).toBe(true);
    });
  });

  describe("obrigacoes_recorrentes (admin-only)", () => {
    it("POS: admin lê as obrigações do tenant", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data, error } = await c.from("obrigacoes_recorrentes").select("id").eq("id", obrigacaoA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: condómino não lê obrigações", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const r = await c.from("obrigacoes_recorrentes").select("id").eq("tenant_id", fx.tenantA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: membro de outro tenant não lê obrigações do tenant A", async () => {
      const c = userClient(fx.users.condoB.accessToken);
      const r = await c.from("obrigacoes_recorrentes").select("id").eq("id", obrigacaoA);
      expect(semAcesso(r)).toBe(true);
    });
  });

  // -------------------------------------------------- contribuições (0044)
  describe("contribuicoes_extraordinarias, prestacoes e fraccoes (admin-only)", () => {
    it("POS: admin lê contribuição, prestação e posição por fração", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const rC = await c.from("contribuicoes_extraordinarias").select("id").eq("id", contribuicaoA);
      const rP = await c.from("contribuicao_prestacoes").select("id").eq("id", prestacaoA);
      const rPF = await c.from("contribuicao_prestacao_fracoes").select("id").eq("id", prestacaoFraccaoA);
      expect(rC.error).toBeNull();
      expect((rC.data ?? []).length).toBe(1);
      expect(rP.error).toBeNull();
      expect((rP.data ?? []).length).toBe(1);
      expect(rPF.error).toBeNull();
      expect((rPF.data ?? []).length).toBe(1);
    });

    it("NEG: condómino não lê contribuições extraordinárias", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const r = await c.from("contribuicoes_extraordinarias").select("id").eq("tenant_id", fx.tenantA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: condómino não lê prestações nem posições por fração", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const rP = await c.from("contribuicao_prestacoes").select("id").eq("tenant_id", fx.tenantA);
      const rPF = await c.from("contribuicao_prestacao_fracoes").select("id").eq("tenant_id", fx.tenantA);
      expect(semAcesso(rP)).toBe(true);
      expect(semAcesso(rPF)).toBe(true);
    });

    it("NEG: admin de outro tenant não lê a contribuição do tenant A", async () => {
      const c = userClient(fx.users.adminB.accessToken);
      const r = await c.from("contribuicoes_extraordinarias").select("id").eq("id", contribuicaoA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: anon não lê contribuições", async () => {
      const c = anonClient();
      const r = await c.from("contribuicoes_extraordinarias").select("id").limit(1);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: condómino não insere contribuição extraordinária", async () => {
      const { status } = await restInsert(
        "contribuicoes_extraordinarias",
        { tenant_id: fx.tenantA, titulo: "forjada", total_cents: 1, criado_por: fx.users.condoA.id },
        { apikey: ANON_KEY, token: fx.users.condoA.accessToken }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });
  });
});

/** UUID aleatório por chamada; carimbo único para códigos/numerações. */
function uid(): string {
  return crypto.randomUUID();
}
function stamp(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
