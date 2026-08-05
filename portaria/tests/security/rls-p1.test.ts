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

d("RLS P1 — S7 preferência de notificações, S10 mensagens de IA", () => {
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
