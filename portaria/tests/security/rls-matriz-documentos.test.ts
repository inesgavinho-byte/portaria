/**
 * Suite de matriz RLS — DOCUMENTOS (A2.2).
 *
 * Cobertura matriz para `documentos` (perspetivas que faltavam: anon,
 * comissão, cross-tenant, INSERT), `documentos_administracao` (arquivo
 * confidencial, 0032) e `conhecimento_embeddings` acedidos por SELECT directo
 * à tabela (as suites P0 testam a via RPC `buscar_chunks`; esta prova que a
 * tabela própria aplica as mesmas regras — C2/S3).
 *
 * Padrão idêntico a rls-p0.test.ts: PostgREST directo, skip sem env.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ANON_KEY, hasEnv, userClient, anonClient, restInsert, serviceClient } from "./helpers";
import { seed, vec1024, type Fixtures } from "./fixtures";

const d = hasEnv ? describe : describe.skip;

/** Sem acesso = erro (grant/RLS com erro) ou zero linhas devolvidas. */
function semAcesso(r: { data: unknown[] | null; error: { message: string } | null }): boolean {
  return r.error !== null || (r.data ?? []).length === 0;
}

d("RLS matriz — documentos e conhecimento", () => {
  let fx: Fixtures;
  let docAtaA: string;
  let docAdminA: string;

  beforeAll(async () => {
    fx = await seed();
    const svc = serviceClient();

    // Documento de categoria 'ata' (sensível para o inquilino, além de 'conta').
    docAtaA = uid();
    await svc.from("documentos").insert({
      id: docAtaA, tenant_id: fx.tenantA, titulo: "Ata 2025", categoria: "ata",
      ficheiro_path: `${fx.tenantA}/${docAtaA}/ata.pdf`, upload_por: fx.users.adminA.id,
    });

    // Arquivo confidencial de administração (0032) — admin-only.
    docAdminA = uid();
    await svc.from("documentos_administracao").insert({
      id: docAdminA, tenant_id: fx.tenantA, titulo: "Contrato confidencial", categoria: "contrato",
      ficheiro_path: `admin/${fx.tenantA}/${docAdminA}/contrato.pdf`, upload_por: fx.users.adminA.id,
    });
  }, 60_000);

  afterAll(async () => {
    if (fx) await fx.cleanup();
  }, 60_000);

  // ------------------------------------------------------------ documentos
  describe("documentos", () => {
    it("POS: condómino lê documentos de qualquer categoria", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data, error } = await c.from("documentos").select("id").in("id", [fx.docContaA, fx.docManualA, docAtaA]);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(3);
    });

    it("POS: comissão lê como condómino (status quo da matriz)", async () => {
      const c = userClient(fx.users.comissaoA.accessToken);
      const { data, error } = await c.from("documentos").select("id").eq("id", fx.docContaA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: inquilino não lê ata nem conta (S6); lê manual", async () => {
      const c = userClient(fx.users.inquiA.accessToken);
      const rAta = await c.from("documentos").select("id").eq("id", docAtaA);
      expect(semAcesso(rAta)).toBe(true);
      const rConta = await c.from("documentos").select("id").eq("id", fx.docContaA);
      expect(semAcesso(rConta)).toBe(true);
      const rManual = await c.from("documentos").select("id").eq("id", fx.docManualA);
      expect(rManual.error).toBeNull();
      expect((rManual.data ?? []).length).toBe(1);
    });

    it("NEG: anon não lê documentos", async () => {
      const c = anonClient();
      const r = await c.from("documentos").select("id").eq("id", fx.docManualA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: membro de outro tenant não lê documentos do tenant A", async () => {
      const c = userClient(fx.users.condoB.accessToken);
      const r = await c.from("documentos").select("id").eq("id", fx.docManualA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: condómino não insere documentos", async () => {
      const { status } = await restInsert(
        "documentos",
        {
          tenant_id: fx.tenantA, titulo: "forjado", categoria: "conta",
          ficheiro_path: `${fx.tenantA}/${uid()}/forjado.pdf`, upload_por: fx.users.condoA.id,
        },
        { apikey: ANON_KEY, token: fx.users.condoA.accessToken }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });

    it("POS: admin insere documento", async () => {
      const id = uid();
      const { status } = await restInsert(
        "documentos",
        {
          id, tenant_id: fx.tenantA, titulo: "Matriz insert", categoria: "outro",
          ficheiro_path: `${fx.tenantA}/${id}/matriz.pdf`, upload_por: fx.users.adminA.id,
        },
        { apikey: ANON_KEY, token: fx.users.adminA.accessToken }
      );
      expect(status).toBeLessThan(400);
    });
  });

  // ---------------------------------------------- documentos_administracao
  describe("documentos_administracao (confidencial, 0032)", () => {
    it("POS: admin lê o arquivo confidencial do seu tenant", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data, error } = await c.from("documentos_administracao").select("id").eq("id", docAdminA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: condómino não lê o arquivo confidencial", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const r = await c.from("documentos_administracao").select("id").eq("id", docAdminA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: inquilino não lê o arquivo confidencial", async () => {
      const c = userClient(fx.users.inquiA.accessToken);
      const r = await c.from("documentos_administracao").select("id").eq("id", docAdminA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: anon não lê o arquivo confidencial", async () => {
      const c = anonClient();
      const r = await c.from("documentos_administracao").select("id").limit(1);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: admin de outro tenant não lê o arquivo do tenant A", async () => {
      const c = userClient(fx.users.adminB.accessToken);
      const r = await c.from("documentos_administracao").select("id").eq("id", docAdminA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: condómino não insere no arquivo confidencial", async () => {
      const { status } = await restInsert(
        "documentos_administracao",
        {
          tenant_id: fx.tenantA, titulo: "intruso", categoria: "outro",
          ficheiro_path: `admin/${fx.tenantA}/${uid()}/intruso.pdf`, upload_por: fx.users.condoA.id,
        },
        { apikey: ANON_KEY, token: fx.users.condoA.accessToken }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });

    it("POS: admin insere no arquivo confidencial", async () => {
      const id = uid();
      const { status } = await restInsert(
        "documentos_administracao",
        {
          id, tenant_id: fx.tenantA, titulo: "Matriz confidencial", categoria: "outro",
          ficheiro_path: `admin/${fx.tenantA}/${id}/matriz.pdf`, upload_por: fx.users.adminA.id,
        },
        { apikey: ANON_KEY, token: fx.users.adminA.accessToken }
      );
      expect(status).toBeLessThan(400);
    });
  });

  // ---------------------------------------------- conhecimento_embeddings
  describe("conhecimento_embeddings (SELECT directo à tabela)", () => {
    it("POS: condómino lê chunks de regulamento", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data, error } = await c
        .from("conhecimento_embeddings")
        .select("id,origem")
        .eq("tenant_id", fx.tenantA)
        .eq("origem", "regulamento");
      expect(error).toBeNull();
      expect((data ?? []).length).toBeGreaterThanOrEqual(1);
    });

    it("NEG(C2): condómino não lê chunks de ocorrência resolvida (tabela direta)", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const r = await c
        .from("conhecimento_embeddings")
        .select("id")
        .eq("tenant_id", fx.tenantA)
        .eq("origem", "ocorrencia_resolvida");
      expect(semAcesso(r)).toBe(true);
    });

    it("POS(C2): admin lê todos os chunks, incl. ocorrência resolvida", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data, error } = await c.from("conhecimento_embeddings").select("id").eq("tenant_id", fx.tenantA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(2);
    });

    it("NEG: inquilino só lê regulamento/legislação (S3, tabela direta)", async () => {
      const c = userClient(fx.users.inquiA.accessToken);
      const rReg = await c
        .from("conhecimento_embeddings")
        .select("id")
        .eq("tenant_id", fx.tenantA)
        .eq("origem", "regulamento");
      expect(rReg.error).toBeNull();
      expect((rReg.data ?? []).length).toBe(1);

      const rOcorr = await c
        .from("conhecimento_embeddings")
        .select("id")
        .eq("tenant_id", fx.tenantA)
        .eq("origem", "ocorrencia_resolvida");
      expect(semAcesso(rOcorr)).toBe(true);
    });

    it("NEG: membro de outro tenant não lê chunks do tenant A", async () => {
      const c = userClient(fx.users.condoB.accessToken);
      const r = await c.from("conhecimento_embeddings").select("id").eq("tenant_id", fx.tenantA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: anon não lê embeddings", async () => {
      const c = anonClient();
      const r = await c.from("conhecimento_embeddings").select("id").limit(1);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: membro não insere embeddings por via directa", async () => {
      const { status } = await restInsert(
        "conhecimento_embeddings",
        { tenant_id: fx.tenantA, origem: "regulamento", origem_id: "forjado", conteudo: "x", embedding: vec1024() },
        { apikey: ANON_KEY, token: fx.users.condoA.accessToken }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });
  });
});

/** UUID aleatório por chamada (paralelismo entre ficheiros de teste). */
function uid(): string {
  return crypto.randomUUID();
}
