/**
 * Suite de segurança S11 — aceitação explícita de convites.
 *
 * Testa contra PostgREST direto as funções da migração
 * 20260902090000_s11_aceitacao_convites.sql:
 *   • convite dirigido a outro email é recusado pela função
 *     (nem aceitar nem recusar, nem ver na lista pendente);
 *   • convite do próprio email é aceite: membership criado com a fração
 *     e o papel do convite, aceite_em registado, re-aceitação bloqueada;
 *   • recusa fica registada (recusado_em) e não cria membership;
 *   • anon não consegue executar aceitar_convite (revoke/grant 0006/20260826030000).
 *
 * Ver rls-p0.test.ts / rls-p1.test.ts para o modelo. Skip sem env Supabase.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { hasEnv, userClient, serviceClient, rpcRaw, ANON_KEY } from "./helpers";
import { createConfirmedUser, deleteUsers, type TestUser } from "./helpers";

const d = hasEnv ? describe : describe.skip;

d("RLS S11 — aceitação explícita de convites", () => {
  let svc: ReturnType<typeof serviceClient>;
  let admin: TestUser; // dono dos convites (criado_por)
  let convidado: TestUser; // email convidado
  let intruso: TestUser; // email diferente, tentativa alheia
  let tenantA: string; // tenant do convite a aceitar
  let tenantB: string; // tenant do convite a recusar
  let conviteAceitavel: string;
  let conviteRecusavel: string;

  beforeAll(async () => {
    svc = serviceClient();
    const stamp = Date.now();

    [admin, convidado, intruso] = await Promise.all([
      createConfirmedUser(`sec+s11-admin-${stamp}@test.local`),
      createConfirmedUser(`sec+s11-convidado-${stamp}@test.local`),
      createConfirmedUser(`sec+s11-intruso-${stamp}@test.local`),
    ]);

    tenantA = `00000000-0000-4000-8000-${(900000000001).toString().padStart(12, "0")}`;
    tenantB = `00000000-0000-4000-8000-${(900000000002).toString().padStart(12, "0")}`;
    await svc.from("tenants").insert([
      { id: tenantA, slug: `s11a-${stamp}`, nome: "S11 Tenant A" },
      { id: tenantB, slug: `s11b-${stamp}`, nome: "S11 Tenant B" },
    ]);

    const { data: criados, error } = await svc
      .from("convites")
      .insert([
        {
          tenant_id: tenantA,
          email: convidado.email,
          fracao: "12-A",
          role: "condomino",
          criado_por: admin.id,
        },
        {
          tenant_id: tenantB,
          email: convidado.email,
          fracao: null,
          role: "condomino",
          criado_por: admin.id,
        },
      ])
      .select("id, tenant_id")
      .order("tenant_id");
    if (error || !criados || criados.length !== 2) {
      throw error ?? new Error("Convites de teste não criados");
    }
    const porTenant = new Map(criados.map((c) => [c.tenant_id, c.id]));
    conviteAceitavel = porTenant.get(tenantA)!;
    conviteRecusavel = porTenant.get(tenantB)!;
  }, 60_000);

  afterAll(async () => {
    if (!hasEnv || !tenantA) return;
    // Apagar tenants faz cascade aos convites (e memberships).
    await svc.from("tenants").delete().in("id", [tenantA, tenantB]);
    await deleteUsers([admin.id, convidado.id, intruso.id]);
  }, 60_000);

  describe("convites_pendentes — a lista só mostra o próprio email", () => {
    it("POS: o convidado vê os seus 2 convites pendentes", async () => {
      const c = userClient(convidado.accessToken);
      const { data, error } = await c.rpc("convites_pendentes");
      expect(error).toBeNull();
      const rows = (data ?? []) as Record<string, unknown>[];
      expect(rows.length).toBe(2);
      for (const r of rows) {
        expect(r).toHaveProperty("tenant_nome");
      }
    });

    it("NEG: outro utilizador não vê os convites alheios", async () => {
      const c = userClient(intruso.accessToken);
      const { data } = await c.rpc("convites_pendentes");
      expect((data ?? []).length).toBe(0);
    });
  });

  describe("aceitar_convite — exige o email do próprio convite", () => {
    it("NEG: convite de outro email é recusado pela função", async () => {
      const c = userClient(intruso.accessToken);
      const { error } = await c.rpc("aceitar_convite", {
        p_convite_id: conviteAceitavel,
      });
      expect(error).not.toBeNull();

      // O convite continua pendente e nenhum membership foi criado.
      const { data: convite } = await svc
        .from("convites")
        .select("aceite_em, recusado_em")
        .eq("id", conviteAceitavel)
        .single();
      expect(convite?.aceite_em).toBeNull();

      const { data: memberships } = await svc
        .from("user_tenants")
        .select("id")
        .eq("user_id", intruso.id)
        .eq("tenant_id", tenantA);
      expect((memberships ?? []).length).toBe(0);
    });

    it("NEG: convite de outro email não pode ser recusado por terceiro", async () => {
      const c = userClient(intruso.accessToken);
      const { error } = await c.rpc("recusar_convite", {
        p_convite_id: conviteAceitavel,
      });
      expect(error).not.toBeNull();

      const { data: convite } = await svc
        .from("convites")
        .select("recusado_em")
        .eq("id", conviteAceitavel)
        .single();
      expect(convite?.recusado_em).toBeNull();
    });

    it("POS: convite do próprio email é aceite — membership com fração e papel", async () => {
      const c = userClient(convidado.accessToken);
      const { data, error } = await c.rpc("aceitar_convite", {
        p_convite_id: conviteAceitavel,
      });
      expect(error).toBeNull();
      expect(data).toBe(true);

      const { data: membership } = await svc
        .from("user_tenants")
        .select("fracao, role")
        .eq("user_id", convidado.id)
        .eq("tenant_id", tenantA)
        .single();
      expect(membership).not.toBeNull();
      expect(membership?.fracao).toBe("12-A");
      expect(membership?.role).toBe("condomino");

      const { data: convite } = await svc
        .from("convites")
        .select("aceite_em")
        .eq("id", conviteAceitavel)
        .single();
      expect(convite?.aceite_em).not.toBeNull();
    });

    it("NEG: convite aceite não pode ser aceite (nem recusado) outra vez", async () => {
      const c = userClient(convidado.accessToken);
      const { error: errAceitar } = await c.rpc("aceitar_convite", {
        p_convite_id: conviteAceitavel,
      });
      expect(errAceitar).not.toBeNull();

      const { error: errRecusar } = await c.rpc("recusar_convite", {
        p_convite_id: conviteAceitavel,
      });
      expect(errRecusar).not.toBeNull();
    });
  });

  describe("recusar_convite — a recusa fica registada", () => {
    it("POS: o próprio email recusa; recusado_em registado, sem membership", async () => {
      const c = userClient(convidado.accessToken);
      const { data, error } = await c.rpc("recusar_convite", {
        p_convite_id: conviteRecusavel,
      });
      expect(error).toBeNull();
      expect(data).toBe(true);

      const { data: convite } = await svc
        .from("convites")
        .select("recusado_em, aceite_em")
        .eq("id", conviteRecusavel)
        .single();
      expect(convite?.recusado_em).not.toBeNull();
      expect(convite?.aceite_em).toBeNull();

      const { data: memberships } = await svc
        .from("user_tenants")
        .select("id")
        .eq("user_id", convidado.id)
        .eq("tenant_id", tenantB);
      expect((memberships ?? []).length).toBe(0);
    });

    it("NEG: recusa não pode ser desfeita nem o convite aceite a seguir", async () => {
      const c = userClient(convidado.accessToken);
      const { error } = await c.rpc("aceitar_convite", {
        p_convite_id: conviteRecusavel,
      });
      expect(error).not.toBeNull();
    });
  });

  describe("superfície anon — revoke de PUBLIC/anon (padrão 0006)", () => {
    it("NEG: anon não executa aceitar_convite nem convites_pendentes", async () => {
      const aceitar = await rpcRaw(
        "aceitar_convite",
        { p_convite_id: conviteAceitavel },
        { apikey: ANON_KEY }
      );
      expect(aceitar.status).toBeGreaterThanOrEqual(400); // 401/404

      const pendentes = await rpcRaw("convites_pendentes", {}, { apikey: ANON_KEY });
      expect(pendentes.status).toBeGreaterThanOrEqual(400);
    });
  });
});
