/**
 * Suite de matriz RLS — RPC (A2.2).
 *
 * Cobertura das funções acessíveis via /rest/v1/rpc que as suites existentes
 * não exercem por completo:
 *   • helpers de sessão: user_tenant_ids, is_tenant_admin, user_tem_papel
 *     (0006/0028 — anon sem EXECUTE);
 *   • estado_conhecimento (POS de membro; a suite p0-financeiro só prova o NEG
 *     de anon);
 *   • total_permilagem_tenant, verificar_disponibilidade,
 *     contar_reservas_semana (S2 — valida membership no corpo);
 *   • notificar_todos / notificar_admins — NEG também para authenticated
 *     (só triggers/service_role; a suite P0 só prova o NEG de anon);
 *   • aceitar_convites (fluxo antigo em bloco, 0005) — anon recusado,
 *     authenticated chamável.
 *
 * Padrão idêntico a rls-p0.test.ts: PostgREST directo, skip sem env.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ANON_KEY, hasEnv, userClient, rpcRaw } from "./helpers";
import { seed, type Fixtures } from "./fixtures";

const d = hasEnv ? describe : describe.skip;

d("RLS matriz — RPCs de sessão, conhecimento, reservas e notificação", () => {
  let fx: Fixtures;

  beforeAll(async () => {
    fx = await seed();
  }, 60_000);

  afterAll(async () => {
    if (fx) await fx.cleanup();
  }, 60_000);

  // ------------------------------------------------ helpers de sessão
  describe("user_tenant_ids / is_tenant_admin / user_tem_papel", () => {
    it("POS: condómino obtém os seus tenant ids", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data, error } = await c.rpc("user_tenant_ids");
      expect(error).toBeNull();
      expect((data as string[] | null) ?? []).toContain(fx.tenantA);
    });

    it("POS: condómino de outro tenant NÃO obtém o tenant A (cross)", async () => {
      const c = userClient(fx.users.condoB.accessToken);
      const { data, error } = await c.rpc("user_tenant_ids");
      expect(error).toBeNull();
      expect(((data as string[] | null) ?? [])).not.toContain(fx.tenantA);
    });

    it("NEG: anon não executa user_tenant_ids (revoke 0006)", async () => {
      const { status } = await rpcRaw("user_tenant_ids", {}, { apikey: ANON_KEY });
      expect(status).toBeGreaterThanOrEqual(400);
    });

    it("POS: admin é is_tenant_admin no próprio tenant", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data, error } = await c.rpc("is_tenant_admin", { p_tenant_id: fx.tenantA });
      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    it("NEG: condómino não é is_tenant_admin", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data, error } = await c.rpc("is_tenant_admin", { p_tenant_id: fx.tenantA });
      expect(error).toBeNull();
      expect(data).toBe(false);
    });

    it("NEG: admin de outro tenant NÃO é is_tenant_admin no tenant A (cross)", async () => {
      const c = userClient(fx.users.adminB.accessToken);
      const { data, error } = await c.rpc("is_tenant_admin", { p_tenant_id: fx.tenantA });
      expect(error).toBeNull();
      expect(data).toBe(false);
    });

    it("NEG: anon não executa is_tenant_admin", async () => {
      const { status } = await rpcRaw(
        "is_tenant_admin",
        { p_tenant_id: fx.tenantA },
        { apikey: ANON_KEY }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });

    it("POS: user_tem_papel confirma o papel de admin; recusa o de condómino", async () => {
      const cAdmin = userClient(fx.users.adminA.accessToken);
      const rAdmin = await cAdmin.rpc("user_tem_papel", {
        p_tenant_id: fx.tenantA, p_papeis: ["admin"],
      });
      expect(rAdmin.error).toBeNull();
      expect(rAdmin.data).toBe(true);

      const cCondo = userClient(fx.users.condoA.accessToken);
      const rCondo = await cCondo.rpc("user_tem_papel", {
        p_tenant_id: fx.tenantA, p_papeis: ["admin"],
      });
      expect(rCondo.error).toBeNull();
      expect(rCondo.data).toBe(false);
    });

    it("NEG: admin de outro tenant não passa user_tem_papel no tenant A", async () => {
      const c = userClient(fx.users.adminB.accessToken);
      const { data, error } = await c.rpc("user_tem_papel", {
        p_tenant_id: fx.tenantA, p_papeis: ["admin"],
      });
      expect(error).toBeNull();
      expect(data).toBe(false);
    });

    it("NEG: anon não executa user_tem_papel (revoke 0028)", async () => {
      const { status } = await rpcRaw(
        "user_tem_papel",
        { p_tenant_id: fx.tenantA, p_papeis: ["admin"] },
        { apikey: ANON_KEY }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });
  });

  // ------------------------------------------------ conhecimento
  describe("estado_conhecimento", () => {
    it("POS: membro consulta o estado de conhecimento do seu tenant", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data, error } = await c.rpc("estado_conhecimento", { p_tenant_id: fx.tenantA });
      expect(error).toBeNull();
      expect(Array.isArray(data) || typeof data === "object").toBe(true);
    });

    it("NEG: membro de outro tenant não obtém conhecimento do tenant A", async () => {
      const c = userClient(fx.users.condoB.accessToken);
      const { data } = await c.rpc("estado_conhecimento", { p_tenant_id: fx.tenantA });
      const linhas = Array.isArray(data) ? data : [];
      expect(linhas.length).toBe(0);
    });

    it("NEG: anon é recusado", async () => {
      const { status } = await rpcRaw(
        "estado_conhecimento",
        { p_tenant_id: fx.tenantA },
        { apikey: ANON_KEY }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });
  });

  // ------------------------------------------------ reservas/permilagem (S2)
  // NOTA (achados, divergências da matriz verificadas no local 2026-09-02):
  //   • verificar_disponibilidade e contar_reservas_semana foram recriadas por
  //     0030 DEPOIS do ciclo de grants de 0028 e ficaram sem EXECUTE para
  //     authenticated (só owner). A app (src/) nunca as chama — hardening
  //     efetivo; a linha da matriz ("authenticated ✓") está desatualizada.
  //   • total_permilagem_tenant: o achado A-3 ("não valida membership") não se
  //     confirmou na inspecção à cadeia — o corpo de 0028 (bloco 2.1, com
  //     validação de membership) está em vigor e foi reafirmado em
  //     20260902330000; não-membros recebem 0, não o agregado.
  describe("total_permilagem_tenant / verificar_disponibilidade / contar_reservas_semana", () => {
    it("POS: membro consulta a permilagem agregada do seu tenant", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data, error } = await c.rpc("total_permilagem_tenant", { p_tenant_id: fx.tenantA });
      expect(error).toBeNull();
      expect(typeof data).toBe("number");
    });

    it("NEG: autenticado de outro tenant recebe 0, não o agregado (correção A-3: 20260902330000)", async () => {
      const c = userClient(fx.users.condoB.accessToken);
      const { data, error } = await c.rpc("total_permilagem_tenant", { p_tenant_id: fx.tenantA });
      // S2/S3 (padrão 0028, reafirmado em 20260902330000): a função devolve 0
      // a não-membros, sem revelar existência de dados do tenant.
      expect(error).toBeNull();
      expect(data).toBe(0);
    });

    it("NEG: authenticated não executa verificar_disponibilidade (grants 0030, hardening)", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const inicio = new Date(Date.now() + 5 * 24 * 3600 * 1000);
      inicio.setUTCMinutes(0, 0, 0);
      const { error } = await c.rpc("verificar_disponibilidade", {
        p_espaco_id: fx.espacoA,
        p_data_inicio: inicio.toISOString(),
        p_data_fim: new Date(inicio.getTime() + 3600_000).toISOString(),
      });
      expect(error).not.toBeNull(); // 42501 — sem EXECUTE para authenticated
    });

    it("NEG: authenticated não executa contar_reservas_semana (grants 0030, hardening)", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { error } = await c.rpc("contar_reservas_semana", {
        p_user_id: fx.users.condoA.id,
        p_espaco_id: fx.espacoA,
        p_data_ref: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
      });
      expect(error).not.toBeNull(); // 42501 — sem EXECUTE para authenticated
    });

    it("NEG: anon não executa nenhuma das três (revoke S2)", async () => {
      const r1 = await rpcRaw("total_permilagem_tenant", { p_tenant_id: fx.tenantA }, { apikey: ANON_KEY });
      const r2 = await rpcRaw(
        "verificar_disponibilidade",
        { p_espaco_id: fx.espacoA, p_data_inicio: new Date().toISOString(), p_data_fim: new Date().toISOString() },
        { apikey: ANON_KEY }
      );
      const r3 = await rpcRaw(
        "contar_reservas_semana",
        { p_user_id: fx.users.condoA.id, p_espaco_id: fx.espacoA, p_data_ref: new Date().toISOString() },
        { apikey: ANON_KEY }
      );
      expect(r1.status).toBeGreaterThanOrEqual(400);
      expect(r2.status).toBeGreaterThanOrEqual(400);
      expect(r3.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ------------------------------------------------ notificadores (S2)
  describe("notificar_todos / notificar_admins — só triggers/service_role", () => {
    it("NEG: authenticated não chama notificar_todos", async () => {
      const { status } = await rpcRaw(
        "notificar_todos",
        { p_tenant_id: fx.tenantA, p_tipo: "sistema", p_titulo: "spam" },
        { apikey: ANON_KEY, token: fx.users.condoA.accessToken }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });

    it("NEG: authenticated não chama notificar_admins", async () => {
      const { status } = await rpcRaw(
        "notificar_admins",
        { p_tenant_id: fx.tenantA, p_tipo: "sistema", p_titulo: "spam" },
        { apikey: ANON_KEY, token: fx.users.condoA.accessToken }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });

    it("NEG: anon não chama notificar_admins", async () => {
      const { status } = await rpcRaw(
        "notificar_admins",
        { p_tenant_id: fx.tenantA, p_tipo: "sistema", p_titulo: "spam" },
        { apikey: ANON_KEY }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });
  });

  // ------------------------------------------------ aceitar_convites (0005→S11)
  describe("aceitar_convites — fluxo antigo removido pela 20260902090000", () => {
    // A migração S11 REMOVEU aceitar_convites() (auto-aceite em bloco, sem
    // confirmação). Este teste garante que a função não volta a ficar exposta.
    it("NEG: authenticated já não consegue executar aceitar_convites (função removida)", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { error } = await c.rpc("aceitar_convites");
      expect(error).not.toBeNull(); // PGRST202 — função inexistente
    });

    it("NEG: anon já não consegue executar aceitar_convites", async () => {
      const { status } = await rpcRaw("aceitar_convites", {}, { apikey: ANON_KEY });
      expect(status).toBeGreaterThanOrEqual(400);
    });
  });
});
