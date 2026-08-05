/**
 * Suite de segurança P1 — testa contra PostgREST direto os achados P1 que
 * vivem no RLS: S7 (preferência de notificações) e S10 (forja de mensagens
 * do assistente). Um negativo + um positivo por achado.
 *
 * Ver rls-p0.test.ts para o modelo. Skip sem env Supabase.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { hasEnv, userClient, serviceClient } from "./helpers";
import { seed, type Fixtures } from "./fixtures";

const d = hasEnv ? describe : describe.skip;

d("RLS P1 — S7 preferência de notificações, S9 reservas, S10 mensagens de IA", () => {
  let fx: Fixtures;
  let conversaCondoA: string;

  beforeAll(async () => {
    fx = await seed();
    const svc = serviceClient();
    const { data } = await svc
      .from("conversas_ia")
      .insert({ tenant_id: fx.tenantA, user_id: fx.users.condoA.id, titulo: "T" })
      .select("id")
      .single();
    conversaCondoA = (data as { id: string }).id;

    // Reserva do condoA no espaço A (para S9). Datas dentro dos limites do
    // espaço (24/7 nas fixtures) e com antecedência suficiente.
    const inicio = new Date(Date.now() + 3 * 24 * 3600 * 1000);
    inicio.setUTCMinutes(0, 0, 0);
    const fim = new Date(inicio.getTime() + 60 * 60 * 1000);
    await svc.from("reservas").insert({
      tenant_id: fx.tenantA,
      espaco_id: fx.espacoA,
      user_id: fx.users.condoA.id,
      data_inicio: inicio.toISOString(),
      data_fim: fim.toISOString(),
      motivo: "festa privada",
      num_pessoas: 4,
    });
  }, 60_000);

  afterAll(async () => {
    if (fx) await fx.cleanup();
  }, 60_000);

  describe("S7 — só a própria preferência, só a coluna certa", () => {
    it("POS: condómino altera a sua notificacoes_email", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { error, count } = await c
        .from("user_tenants")
        .update({ notificacoes_email: false }, { count: "exact" })
        .eq("user_id", fx.users.condoA.id)
        .eq("tenant_id", fx.tenantA);
      expect(error).toBeNull();
      expect(count).toBe(1);
    });

    it("NEG: condómino não se pode auto-promover a admin", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { error } = await c
        .from("user_tenants")
        .update({ role: "admin" })
        .eq("user_id", fx.users.condoA.id)
        .eq("tenant_id", fx.tenantA);
      expect(error).not.toBeNull(); // trigger bloqueia
    });

    it("NEG: condómino não altera a preferência de outro utilizador", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { count } = await c
        .from("user_tenants")
        .update({ notificacoes_email: false }, { count: "exact" })
        .eq("user_id", fx.users.adminA.id)
        .eq("tenant_id", fx.tenantA);
      expect(count ?? 0).toBe(0); // RLS: nenhuma linha corresponde
    });
  });

  describe("S9 — minimização de dados nas reservas", () => {
    it("NEG: outro membro do tenant não lê a reserva alheia diretamente", async () => {
      // condoA não tem reservas próprias visíveis para o adminA a não ser via
      // a política de admin; usamos um segundo condómino... aqui usamos o
      // próprio adminB (outro tenant) e um condómino do mesmo tenant não
      // existe além do condoA/inquiA. inquiA (mesmo tenant, não dono) não deve
      // ver a linha completa da reserva do condoA.
      const c = userClient(fx.users.inquiA.accessToken);
      const { data } = await c
        .from("reservas")
        .select("id,user_id,motivo")
        .eq("user_id", fx.users.condoA.id);
      expect((data ?? []).length).toBe(0);
    });

    it("POS: disponibilidade_reservas devolve ocupação sem dados pessoais", async () => {
      const c = userClient(fx.users.inquiA.accessToken);
      const { data, error } = await c.rpc("disponibilidade_reservas", {
        p_espaco_id: fx.espacoA,
        p_from: null,
        p_to: null,
      });
      expect(error).toBeNull();
      const rows = (data ?? []) as Record<string, unknown>[];
      expect(rows.length).toBeGreaterThanOrEqual(1);
      // Só campos não pessoais
      for (const r of rows) {
        expect(r).not.toHaveProperty("user_id");
        expect(r).not.toHaveProperty("motivo");
        expect(r).toHaveProperty("data_inicio");
      }
    });

    it("NEG: membro de outro tenant não vê ocupação do tenant A", async () => {
      const c = userClient(fx.users.condoB.accessToken);
      const { data } = await c.rpc("disponibilidade_reservas", {
        p_espaco_id: fx.espacoA,
        p_from: null,
        p_to: null,
      });
      expect((data ?? []).length).toBe(0);
    });
  });

  describe("S10 — cliente só insere role='user'", () => {
    it("POS: condómino insere uma mensagem role='user'", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { error } = await c.from("conversas_ia_mensagens").insert({
        conversa_id: conversaCondoA,
        tenant_id: fx.tenantA,
        role: "user",
        conteudo: "olá",
      });
      expect(error).toBeNull();
    });

    it("NEG: condómino não pode forjar role='assistant'", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { error } = await c.from("conversas_ia_mensagens").insert({
        conversa_id: conversaCondoA,
        tenant_id: fx.tenantA,
        role: "assistant",
        conteudo: "resposta falsa",
      });
      expect(error).not.toBeNull();
    });
  });
});
