/**
 * Suite de segurança P0 — testa o isolamento multi-tenant DIRETAMENTE contra
 * o PostgREST (anon key + tokens reais de utilizadores de teste), não pelas
 * server actions. Cada bloqueador da auditoria tem um teste negativo (o ataque
 * é bloqueado) e um positivo (o fluxo legítimo funciona).
 *
 * Estado esperado:
 *   • ANTES da migração 0028 → vários destes testes FALHAM (o ataque passa).
 *   • DEPOIS da 0028 → todos passam.
 *
 * Requer SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY.
 * Sem elas, a suite é ignorada (describe.skip).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  ANON_KEY, hasEnv, userClient, anonClient, rpcRaw, restInsert,
} from "./helpers";
import { seed, vec1024, type Fixtures } from "./fixtures";

const d = hasEnv ? describe : describe.skip;

d("RLS P0 — isolamento multi-tenant", () => {
  let fx: Fixtures;

  beforeAll(async () => {
    fx = await seed();
  }, 60_000);

  afterAll(async () => {
    if (fx) await fx.cleanup();
  }, 60_000);

  // ------------------------------------------------------------------ S1
  describe("S1 — injeção de notificações", () => {
    it("NEG: anon não pode inserir notificação", async () => {
      const { status } = await restInsert(
        "notificacoes",
        { tenant_id: fx.tenantA, user_id: fx.users.condoA.id, tipo: "sistema", titulo: "falso" },
        { apikey: ANON_KEY } // sem token → papel anon
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });

    it("NEG: um membro não pode inserir notificação para outro utilizador", async () => {
      const { status } = await restInsert(
        "notificacoes",
        { tenant_id: fx.tenantA, user_id: fx.users.adminA.id, tipo: "sistema", titulo: "forjada" },
        { apikey: ANON_KEY, token: fx.users.condoA.accessToken }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });

    it("POS: um utilizador lê apenas as suas notificações", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { error } = await c.from("notificacoes").select("id").limit(1);
      expect(error).toBeNull();
    });
  });

  // ------------------------------------------------------------------ S2
  describe("S2 — funções SECURITY DEFINER fechadas a anon", () => {
    it("NEG: anon não pode chamar notificar_todos", async () => {
      const { status } = await rpcRaw(
        "notificar_todos",
        { p_tenant_id: fx.tenantA, p_tipo: "sistema", p_titulo: "spam" },
        { apikey: ANON_KEY }
      );
      expect(status).toBeGreaterThanOrEqual(400); // 401/403/404
    });

    it("NEG: anon não pode chamar buscar_chunks", async () => {
      const { status } = await rpcRaw(
        "buscar_chunks",
        { p_tenant_id: fx.tenantA, p_embedding: vec1024(), p_limite: 5, p_threshold: -1 },
        { apikey: ANON_KEY }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });

    it("POS: um membro autenticado pode chamar buscar_chunks no seu tenant", async () => {
      const { status } = await rpcRaw(
        "buscar_chunks",
        { p_tenant_id: fx.tenantA, p_embedding: vec1024(), p_limite: 5, p_threshold: -1 },
        { apikey: ANON_KEY, token: fx.users.condoA.accessToken }
      );
      expect(status).toBe(200);
    });
  });

  // ------------------------------------------------------------------ S3 / C2
  describe("S3 — RAG valida membership; C2 — ocorrências resolvidas admin-only", () => {
    it("POS: condómino do tenant vê o regulamento no RAG", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data } = await c.rpc("buscar_chunks", {
        p_tenant_id: fx.tenantA, p_embedding: vec1024(), p_limite: 10, p_threshold: -1,
      });
      const origens = (data ?? []).map((r: { origem: string }) => r.origem);
      expect(origens).toContain("regulamento");
    });

    it("NEG(C2): condómino NÃO vê chunks de ocorrência resolvida", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data } = await c.rpc("buscar_chunks", {
        p_tenant_id: fx.tenantA, p_embedding: vec1024(), p_limite: 10, p_threshold: -1,
      });
      const origens = (data ?? []).map((r: { origem: string }) => r.origem);
      expect(origens).not.toContain("ocorrencia_resolvida");
    });

    it("POS(C2): admin do tenant vê chunks de ocorrência resolvida", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data } = await c.rpc("buscar_chunks", {
        p_tenant_id: fx.tenantA, p_embedding: vec1024(), p_limite: 10, p_threshold: -1,
      });
      const origens = (data ?? []).map((r: { origem: string }) => r.origem);
      expect(origens).toContain("ocorrencia_resolvida");
    });

    it("NEG(S3): membro de OUTRO tenant não obtém dados via buscar_chunks", async () => {
      const c = userClient(fx.users.condoB.accessToken);
      const { data } = await c.rpc("buscar_chunks", {
        p_tenant_id: fx.tenantA, p_embedding: vec1024(), p_limite: 10, p_threshold: -1,
      });
      expect((data ?? []).length).toBe(0);
    });
  });

  // ------------------------------------------------------------------ S4
  describe("S4 — integridade das votações", () => {
    it("POS: participante vota uma vez via registar_voto", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data, error } = await c.rpc("registar_voto", {
        p_votacao_id: fx.votacaoAberta, p_opcao_id: fx.opcaoAberta,
      });
      expect(error).toBeNull();
      expect(typeof data).toBe("string"); // hash de comprovativo
    });

    it("NEG: segundo voto do mesmo participante é rejeitado", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { error } = await c.rpc("registar_voto", {
        p_votacao_id: fx.votacaoAberta, p_opcao_id: fx.opcaoAberta,
      });
      expect(error).not.toBeNull();
    });

    it("NEG: voto numa votação fechada é rejeitado", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { error } = await c.rpc("registar_voto", {
        p_votacao_id: fx.votacaoFechada, p_opcao_id: fx.opcaoFechada,
      });
      expect(error).not.toBeNull();
    });

    it("NEG: INSERT direto em votos é bloqueado pelo RLS", async () => {
      const { status } = await restInsert(
        "votos",
        { votacao_id: fx.votacaoAberta, tenant_id: fx.tenantA, opcao_id: fx.opcaoAberta, voto_hash: "x" },
        { apikey: ANON_KEY, token: fx.users.condoA.accessToken }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });
  });

  // ------------------------------------------------------------------ S5
  describe("S5 — reservas cruzadas", () => {
    const slot = () => {
      const start = new Date(Date.now() + 3 * 24 * 3600 * 1000);
      start.setUTCMinutes(0, 0, 0);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      return { data_inicio: start.toISOString(), data_fim: end.toISOString() };
    };

    it("POS: membro reserva um espaço do seu tenant", async () => {
      const { status } = await restInsert(
        "reservas",
        { tenant_id: fx.tenantA, espaco_id: fx.espacoA, user_id: fx.users.condoA.id, ...slot() },
        { apikey: ANON_KEY, token: fx.users.condoA.accessToken }
      );
      expect(status).toBeLessThan(400);
    });

    it("NEG: membro do tenant A não reserva espaço do tenant B", async () => {
      const { status } = await restInsert(
        "reservas",
        { tenant_id: fx.tenantB, espaco_id: fx.espacoB, user_id: fx.users.condoA.id, ...slot() },
        { apikey: ANON_KEY, token: fx.users.condoA.accessToken }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });
  });

  // ------------------------------------------------------------------ S6
  describe("S6 — papéis reais (inquilino sem docs sensíveis/assembleias/votações)", () => {
    it("NEG: inquilino não lê documentos de categoria 'conta'", async () => {
      const c = userClient(fx.users.inquiA.accessToken);
      const { data } = await c.from("documentos").select("id,categoria").eq("categoria", "conta");
      expect((data ?? []).length).toBe(0);
    });

    it("POS: inquilino lê documentos de categoria 'manual'", async () => {
      const c = userClient(fx.users.inquiA.accessToken);
      const { data } = await c.from("documentos").select("id").eq("id", fx.docManualA);
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: inquilino não vê votações", async () => {
      const c = userClient(fx.users.inquiA.accessToken);
      const { data } = await c.from("votacoes").select("id");
      expect((data ?? []).length).toBe(0);
    });

    it("POS: condómino vê documentos e votações", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const docs = await c.from("documentos").select("id").eq("id", fx.docContaA);
      const vots = await c.from("votacoes").select("id").eq("id", fx.votacaoAberta);
      expect((docs.data ?? []).length).toBe(1);
      expect((vots.data ?? []).length).toBe(1);
    });
  });

  // ------------------------------------------------------------------ S8
  describe("S8 — user_permilagem restrita", () => {
    it("POS: um utilizador lê a sua própria permilagem", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { error } = await c.rpc("user_permilagem", {
        p_user_id: fx.users.condoA.id, p_tenant_id: fx.tenantA,
      });
      expect(error).toBeNull();
    });

    it("NEG: um membro de outro tenant não lê a permilagem alheia", async () => {
      const c = userClient(fx.users.condoB.accessToken);
      const { data } = await c.rpc("user_permilagem", {
        p_user_id: fx.users.condoA.id, p_tenant_id: fx.tenantA,
      });
      expect(data ?? null).toBeNull();
    });
  });
});
