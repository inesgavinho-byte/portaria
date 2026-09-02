/**
 * Suite de segurança P0 — auditoria Supabase 2026-08: views financeiras e
 * RPCs SECURITY DEFINER que estavam abertas a anon/PUBLIC.
 *
 * Testa contra o PostgREST direto (anon key + tokens reais), não as server
 * actions. Ver rls-p0.test.ts para o modelo geral.
 *
 * Cobertura:
 *   - vw_inadimplencia / vw_quotas_resumo_mes: anon sem acesso; authenticated
 *     filtrado pelo RLS subjacente (admin vê o seu tenant, cross-tenant nada).
 *   - gerar_quotas_mes / obter_proximo_numero_recibo: anon recusado;
 *     authenticated não-admin recusado; admin do tenant funciona; admin de
 *     outro tenant recusado.
 *   - calcular_divida_fracao: anon recusado; condómino vê a própria fração;
 *     condómino não vê a fração de outro; admin vê qualquer fração do seu
 *     tenant; outro tenant recusado.
 *   - buscar_chunks / estado_conhecimento: anon recusado; cross-tenant devolve
 *     zero linhas.
 *   - notificacoes: INSERT direto (anon/authenticated) recusado.
 *
 * Requer SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY. Sem
 * elas, a suite é ignorada (describe.skip).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ANON_KEY, hasEnv, userClient, anonClient, rpcRaw, restInsert, serviceClient } from "./helpers";
import { seed, vec1024, type Fixtures } from "./fixtures";

const d = hasEnv ? describe : describe.skip;

d("RLS P0 (2026-08) — views financeiras e RPCs SECURITY DEFINER", () => {
  let fx: Fixtures;
  let fracaoCondoA: string;
  let fracaoOutraA: string;

  beforeAll(async () => {
    fx = await seed();
    const svc = serviceClient();

    // Fração própria do condoA (para calcular_divida_fracao "própria fração").
    const { data: fracao } = await svc
      .from("fracoes")
      .insert({ tenant_id: fx.tenantA, codigo: "P0-FIN-TEST", quota_mensal_cents: 5000 })
      .select("id")
      .single();
    fracaoCondoA = (fracao as { id: string }).id;
    await svc
      .from("user_tenants")
      .update({ fracao_id: fracaoCondoA })
      .eq("user_id", fx.users.condoA.id)
      .eq("tenant_id", fx.tenantA);

    // Segunda fração do mesmo tenant, não associada a nenhum membro — para
    // provar que um condómino não consegue consultar a dívida de uma fração
    // que não é a sua.
    const { data: fracaoOutra } = await svc
      .from("fracoes")
      .insert({ tenant_id: fx.tenantA, codigo: "P0-FIN-OUTRA", quota_mensal_cents: 5000 })
      .select("id")
      .single();
    fracaoOutraA = (fracaoOutra as { id: string }).id;

    await svc.from("quotas_mensais").insert({
      tenant_id: fx.tenantA,
      fracao_id: fracaoCondoA,
      ano: 2020,
      mes: 1,
      valor_cents: 5000,
      estado: "pendente",
    });

    await svc.from("configuracao_financeira").upsert(
      { tenant_id: fx.tenantA, dia_vencimento_padrao: 8 },
      { onConflict: "tenant_id" }
    );
    await svc.from("configuracao_financeira").upsert(
      { tenant_id: fx.tenantB, dia_vencimento_padrao: 8 },
      { onConflict: "tenant_id" }
    );
  }, 60_000);

  afterAll(async () => {
    if (fx) await fx.cleanup();
  }, 60_000);

  // ------------------------------------------------------------- VIEWS
  describe("views financeiras (security_invoker)", () => {
    it("NEG: anon não lê vw_inadimplencia", async () => {
      const c = anonClient();
      const { error } = await c.from("vw_inadimplencia").select("*").limit(1);
      expect(error).not.toBeNull();
    });

    it("NEG: anon não lê vw_quotas_resumo_mes", async () => {
      const c = anonClient();
      const { error } = await c.from("vw_quotas_resumo_mes").select("*").limit(1);
      expect(error).not.toBeNull();
    });

    it("POS: admin lê vw_inadimplencia filtrada ao próprio tenant", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data, error } = await c
        .from("vw_inadimplencia")
        .select("tenant_id")
        .eq("tenant_id", fx.tenantA);
      expect(error).toBeNull();
      for (const row of data ?? []) {
        expect((row as { tenant_id: string }).tenant_id).toBe(fx.tenantA);
      }
    });

    it("NEG: condómino não-admin não vê linhas de vw_inadimplencia (fracoes é admin-only)", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data, error } = await c.from("vw_inadimplencia").select("*").eq("tenant_id", fx.tenantA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(0);
    });

    it("NEG: admin de outro tenant não vê linhas do tenant A", async () => {
      const c = userClient(fx.users.adminB.accessToken);
      const { data, error } = await c.from("vw_inadimplencia").select("*").eq("tenant_id", fx.tenantA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(0);
    });
  });

  // ------------------------------------------------------- gerar_quotas_mes
  describe("gerar_quotas_mes", () => {
    it("NEG: anon é recusado", async () => {
      const { status } = await rpcRaw(
        "gerar_quotas_mes",
        { p_tenant_id: fx.tenantA, p_ano: 2098, p_mes: 1, p_valor_base_cents: 5000 },
        { apikey: ANON_KEY }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });

    it("NEG: authenticated não-admin é recusado", async () => {
      const { status } = await rpcRaw(
        "gerar_quotas_mes",
        { p_tenant_id: fx.tenantA, p_ano: 2098, p_mes: 2, p_valor_base_cents: 5000 },
        { apikey: ANON_KEY, token: fx.users.condoA.accessToken }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });

    it("POS: admin do tenant gera quotas", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { error } = await c.rpc("gerar_quotas_mes", {
        p_tenant_id: fx.tenantA,
        p_ano: 2098,
        p_mes: 3,
        p_valor_base_cents: 5000,
      });
      expect(error).toBeNull();
    });

    it("NEG: admin de outro tenant não gera quotas no tenant A", async () => {
      const c = userClient(fx.users.adminB.accessToken);
      const { error } = await c.rpc("gerar_quotas_mes", {
        p_tenant_id: fx.tenantA,
        p_ano: 2098,
        p_mes: 4,
        p_valor_base_cents: 5000,
      });
      expect(error).not.toBeNull();
    });
  });

  // ------------------------------------------------ obter_proximo_numero_recibo
  describe("obter_proximo_numero_recibo", () => {
    it("NEG: anon é recusado", async () => {
      const { status } = await rpcRaw(
        "obter_proximo_numero_recibo",
        { p_tenant_id: fx.tenantA },
        { apikey: ANON_KEY }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });

    it("NEG: authenticated não-admin é recusado", async () => {
      const { status } = await rpcRaw(
        "obter_proximo_numero_recibo",
        { p_tenant_id: fx.tenantA },
        { apikey: ANON_KEY, token: fx.users.condoA.accessToken }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });

    it("POS: admin do tenant obtém número de recibo", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data, error } = await c.rpc("obter_proximo_numero_recibo", { p_tenant_id: fx.tenantA });
      expect(error).toBeNull();
      expect(typeof data).toBe("string");
    });

    it("NEG: admin de outro tenant é recusado no tenant A", async () => {
      const c = userClient(fx.users.adminB.accessToken);
      const { error } = await c.rpc("obter_proximo_numero_recibo", { p_tenant_id: fx.tenantA });
      expect(error).not.toBeNull();
    });
  });

  // ------------------------------------------------------- calcular_divida_fracao
  describe("calcular_divida_fracao", () => {
    it("NEG: anon é recusado", async () => {
      const { status } = await rpcRaw(
        "calcular_divida_fracao",
        { p_fracao_id: fracaoCondoA },
        { apikey: ANON_KEY }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });

    it("POS: condómino consulta a própria fração", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data, error } = await c.rpc("calcular_divida_fracao", { p_fracao_id: fracaoCondoA });
      expect(error).toBeNull();
      expect(typeof data).toBe("number");
    });

    it("NEG: condómino não consulta uma fração alheia do mesmo tenant", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { error } = await c.rpc("calcular_divida_fracao", { p_fracao_id: fracaoOutraA });
      expect(error).not.toBeNull();
    });

    it("POS: admin consulta qualquer fração do seu tenant", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data, error } = await c.rpc("calcular_divida_fracao", { p_fracao_id: fracaoCondoA });
      expect(error).toBeNull();
      expect(typeof data).toBe("number");
    });

    it("NEG: membro de outro tenant é recusado (cross-tenant)", async () => {
      const c = userClient(fx.users.condoB.accessToken);
      const { error } = await c.rpc("calcular_divida_fracao", { p_fracao_id: fracaoCondoA });
      expect(error).not.toBeNull();
    });
  });

  // ------------------------------------------------------- buscar_chunks / estado_conhecimento
  describe("buscar_chunks / estado_conhecimento — isolamento de tenant", () => {
    it("NEG: anon é recusado em buscar_chunks", async () => {
      const { status } = await rpcRaw(
        "buscar_chunks",
        { p_tenant_id: fx.tenantA, p_embedding: vec1024(), p_limite: 5, p_threshold: -1 },
        { apikey: ANON_KEY }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });

    it("NEG: membro de outro tenant não lê chunks do tenant A", async () => {
      const c = userClient(fx.users.condoB.accessToken);
      const { data, error } = await c.rpc("buscar_chunks", {
        p_tenant_id: fx.tenantA,
        p_embedding: vec1024(),
        p_limite: 5,
        p_threshold: -1,
      });
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(0);
    });

    it("NEG: anon é recusado em estado_conhecimento", async () => {
      const { status } = await rpcRaw(
        "estado_conhecimento",
        { p_tenant_id: fx.tenantA },
        { apikey: ANON_KEY }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });
  });

  // ------------------------------------------------------- notificacoes INSERT
  describe("notificacoes — INSERT directo de cliente fechado", () => {
    it("NEG: anon não insere notificação", async () => {
      const { status } = await restInsert(
        "notificacoes",
        { tenant_id: fx.tenantA, user_id: fx.users.adminA.id, tipo: "sistema", titulo: "forjada" },
        { apikey: ANON_KEY }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });

    it("NEG: authenticated não insere notificação (nem para si próprio)", async () => {
      const { status } = await restInsert(
        "notificacoes",
        { tenant_id: fx.tenantA, user_id: fx.users.condoA.id, tipo: "sistema", titulo: "self-forjada" },
        { apikey: ANON_KEY, token: fx.users.condoA.accessToken }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });
  });
});
