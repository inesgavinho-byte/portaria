/**
 * Suite de matriz RLS — OPERAÇÕES (A2.2).
 *
 * Tabelas de suporte operacional multi-tenant sem cobertura prévia:
 *   • email_caixas / email_mensagens / email_anexos (0031, admin-only);
 *   • ativos_manutencao / planos_manutencao / tarefas_manutencao
 *     (0038, admin-only);
 *   • alertas_operacionais (0037, admin-only);
 *   • funcionarios_ausencias (0020 — membros leem, admins gerem);
 *   • blueprints (0016, admin-only).
 *
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

d("RLS matriz — operações (e-mail, manutenção, alertas, ausências, blueprints)", () => {
  let fx: Fixtures;
  let caixaA: string;
  let mensagemA: string;
  let anexoA: string;
  let ativoA: string;
  let alertaA: string;
  let ausenciaA: string;
  let blueprintA: string;

  beforeAll(async () => {
    fx = await seed();
    const svc = serviceClient();

    // E-mail do condomínio (0031).
    caixaA = uid();
    await svc.from("email_caixas").insert({
      id: caixaA, tenant_id: fx.tenantA, endereco: `matriz-${stamp()}@test.local`,
    });
    mensagemA = uid();
    await svc.from("email_mensagens").insert({
      id: mensagemA, tenant_id: fx.tenantA, caixa_id: caixaA,
      fornecedor_uid: Date.now() % 1_000_000_000, assunto: "Mensagem matriz",
    });
    anexoA = uid();
    await svc.from("email_anexos").insert({
      id: anexoA, tenant_id: fx.tenantA, mensagem_id: mensagemA,
      fornecedor_anexo_id: `anx-${stamp()}`, nome: "anexo.pdf",
    });

    // Manutenção preventiva (0038).
    // NOTA: o INSERT em planos_manutencao está PARTIDO na cadeia de migrações —
    // o trigger validar_tenant_manutencao (0038) referencia NEW.plano_id, que só
    // existe em tarefas_manutencao; todo o INSERT em planos falha com
    // 'record "new" has no field "plano_id"' (42703). Sem plano não há tarefas.
    // Ver lacunas em tests/security/README.md e o achado no relatório da tarefa.
    ativoA = uid();
    await svc.from("ativos_manutencao").insert({
      id: ativoA, tenant_id: fx.tenantA, nome: `Elevador ${stamp()}`, categoria: "elevadores",
    });

    // Alertas operacionais (0037).
    alertaA = uid();
    await svc.from("alertas_operacionais").insert({
      id: alertaA, tenant_id: fx.tenantA, tipo: "sistema", titulo: "Alerta matriz",
      entidade_tipo: "sistema", chave_idempotencia: `matriz-${stamp()}`,
    });

    // Ausências de funcionários (0020) — visíveis a todos os membros.
    ausenciaA = uid();
    await svc.from("funcionarios_ausencias").insert({
      id: ausenciaA, tenant_id: fx.tenantA, nome: "Zelador", data_inicio: "2088-01-01",
    });

    // Blueprints (0016) — admin-only.
    blueprintA = uid();
    await svc.from("blueprints").insert({
      id: blueprintA, tenant_id: fx.tenantA, nome: "Blueprint matriz",
      tipo: `matriz-${stamp()}`, conteudo_template: "Olá {{nome}}",
    });
  }, 60_000);

  afterAll(async () => {
    if (fx) await fx.cleanup();
  }, 60_000);

  // ------------------------------------------------------------ e-mail (0031)
  describe("email_caixas / mensagens / anexos (admin-only)", () => {
    it("POS: admin lê caixas, mensagens e anexos do tenant", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const rCx = await c.from("email_caixas").select("id").eq("id", caixaA);
      const rMs = await c.from("email_mensagens").select("id").eq("id", mensagemA);
      const rAx = await c.from("email_anexos").select("id").eq("id", anexoA);
      expect(rCx.error).toBeNull();
      expect((rCx.data ?? []).length).toBe(1);
      expect(rMs.error).toBeNull();
      expect((rMs.data ?? []).length).toBe(1);
      expect(rAx.error).toBeNull();
      expect((rAx.data ?? []).length).toBe(1);
    });

    it("NEG: condómino não lê caixas nem mensagens", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const rCx = await c.from("email_caixas").select("id").eq("tenant_id", fx.tenantA);
      const rMs = await c.from("email_mensagens").select("id").eq("tenant_id", fx.tenantA);
      const rAx = await c.from("email_anexos").select("id").eq("tenant_id", fx.tenantA);
      expect(semAcesso(rCx)).toBe(true);
      expect(semAcesso(rMs)).toBe(true);
      expect(semAcesso(rAx)).toBe(true);
    });

    it("NEG: admin de outro tenant não lê caixas do tenant A", async () => {
      const c = userClient(fx.users.adminB.accessToken);
      const r = await c.from("email_caixas").select("id").eq("id", caixaA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: anon não lê caixas", async () => {
      const c = anonClient();
      const r = await c.from("email_caixas").select("id").limit(1);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: condómino não insere caixas", async () => {
      const { status } = await restInsert(
        "email_caixas",
        { tenant_id: fx.tenantA, endereco: `forjada-${stamp()}@test.local` },
        { apikey: ANON_KEY, token: fx.users.condoA.accessToken }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });
  });

  // ------------------------------------------------- manutenção (0038)
  describe("ativos, planos e tarefas de manutenção (admin-only)", () => {
    it("POS: admin lê ativos do tenant", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const rAt = await c.from("ativos_manutencao").select("id").eq("id", ativoA);
      expect(rAt.error).toBeNull();
      expect((rAt.data ?? []).length).toBe(1);
    });

    it.skip("POS: admin lê planos e tarefas — BLOQUEADO por bug 0038: o trigger validar_tenant_manutencao referencia NEW.plano_id em planos_manutencao e todo INSERT falha (42703); sem plano não há tarefas a semear", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const rPl = await c.from("planos_manutencao").select("id").eq("tenant_id", fx.tenantA);
      const rTa = await c.from("tarefas_manutencao").select("id").eq("tenant_id", fx.tenantA);
      expect(rPl.error).toBeNull();
      expect((rPl.data ?? []).length).toBe(1);
      expect(rTa.error).toBeNull();
      expect((rTa.data ?? []).length).toBe(1);
    });

    it("NEG: condómino não lê ativos", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const rAt = await c.from("ativos_manutencao").select("id").eq("tenant_id", fx.tenantA);
      const rPl = await c.from("planos_manutencao").select("id").eq("tenant_id", fx.tenantA);
      const rTa = await c.from("tarefas_manutencao").select("id").eq("tenant_id", fx.tenantA);
      expect(semAcesso(rAt)).toBe(true);
      expect(semAcesso(rPl)).toBe(true);
      expect(semAcesso(rTa)).toBe(true);
    });

    it("NEG: membro de outro tenant não lê ativos do tenant A", async () => {
      const c = userClient(fx.users.condoB.accessToken);
      const r = await c.from("ativos_manutencao").select("id").eq("id", ativoA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: anon não lê ativos", async () => {
      const c = anonClient();
      const r = await c.from("ativos_manutencao").select("id").limit(1);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: condómino não insere ativos", async () => {
      const { status } = await restInsert(
        "ativos_manutencao",
        { tenant_id: fx.tenantA, nome: `forjado-${stamp()}`, categoria: "outro" },
        { apikey: ANON_KEY, token: fx.users.condoA.accessToken }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });
  });

  // ------------------------------------------------- alertas (0037)
  describe("alertas_operacionais (admin-only)", () => {
    it("POS: admin lê os alertas do tenant", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data, error } = await c.from("alertas_operacionais").select("id").eq("id", alertaA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: condómino não lê alertas", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const r = await c.from("alertas_operacionais").select("id").eq("tenant_id", fx.tenantA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: admin de outro tenant não lê alertas do tenant A", async () => {
      const c = userClient(fx.users.adminB.accessToken);
      const r = await c.from("alertas_operacionais").select("id").eq("id", alertaA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: anon não lê alertas", async () => {
      const c = anonClient();
      const r = await c.from("alertas_operacionais").select("id").limit(1);
      expect(semAcesso(r)).toBe(true);
    });
  });

  // ------------------------------------------------- ausências (0020)
  describe("funcionarios_ausencias (membros leem, admins gerem)", () => {
    it("POS: condómino lê as ausências do tenant", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data, error } = await c.from("funcionarios_ausencias").select("id").eq("id", ausenciaA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("POS: inquilino também lê as ausências (mural)", async () => {
      const c = userClient(fx.users.inquiA.accessToken);
      const { data, error } = await c.from("funcionarios_ausencias").select("id").eq("id", ausenciaA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: membro de outro tenant não lê ausências do tenant A", async () => {
      const c = userClient(fx.users.condoB.accessToken);
      const r = await c.from("funcionarios_ausencias").select("id").eq("id", ausenciaA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: anon não lê ausências", async () => {
      const c = anonClient();
      const r = await c.from("funcionarios_ausencias").select("id").limit(1);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: condómino não insere ausências (admins gerem)", async () => {
      const { status } = await restInsert(
        "funcionarios_ausencias",
        { tenant_id: fx.tenantA, nome: "forjado", data_inicio: "2088-01-01" },
        { apikey: ANON_KEY, token: fx.users.condoA.accessToken }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });

    it("POS: admin insere ausência", async () => {
      const { status } = await restInsert(
        "funcionarios_ausencias",
        { tenant_id: fx.tenantA, nome: "Matriz", data_inicio: "2088-02-01" },
        { apikey: ANON_KEY, token: fx.users.adminA.accessToken }
      );
      expect(status).toBeLessThan(400);
    });
  });

  // ------------------------------------------------- blueprints (0016)
  describe("blueprints (admin-only)", () => {
    it("POS: admin lê os blueprints do tenant", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data, error } = await c.from("blueprints").select("id").eq("id", blueprintA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: condómino não lê blueprints", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const r = await c.from("blueprints").select("id").eq("tenant_id", fx.tenantA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: admin de outro tenant não lê blueprints do tenant A", async () => {
      const c = userClient(fx.users.adminB.accessToken);
      const r = await c.from("blueprints").select("id").eq("id", blueprintA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: anon não lê blueprints", async () => {
      const c = anonClient();
      const r = await c.from("blueprints").select("id").limit(1);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: condómino não insere blueprints", async () => {
      const { status } = await restInsert(
        "blueprints",
        { tenant_id: fx.tenantA, nome: "forjado", tipo: `forjado-${stamp()}`, conteudo_template: "x" },
        { apikey: ANON_KEY, token: fx.users.condoA.accessToken }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });
  });
});

/** UUID aleatório por chamada; carimbo único para valores únicos. */
function uid(): string {
  return crypto.randomUUID();
}
function stamp(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
