/**
 * Suite de matriz RLS — PROCESSO (A2.2).
 *
 * Tabelas de processo/documental de 2026-08 e 0040-0043:
 *   • imputacoes_posicoes + imputacoes_posicoes_evidencias
 *     (grants mínimos de 20260826020000: authenticated só SELECT; RLS admin);
 *   • ia_documental_configuracoes / fontes / fonte_blocos / sessoes /
 *     mensagens (0040/0041, admin-only);
 *   • contrato_memoria_eventos / _evidencias — APENAS leitura: a tabela
 *     depende de `public.contratos`, que não existe na cadeia de migrações
 *     (ver tests/security/README.md); escrever em ambiente local é
 *     impossível, pelo que só se provam as negações de leitura;
 *   • comunicacoes + comunicacao_destinatarios + comunicacao_documentos
 *     (0042/0043, admin-only).
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

d("RLS matriz — processo (imputações, IA documental, contrato-memória, comunicações)", () => {
  let fx: Fixtures;
  let fonteA: string;
  let blocoA: string;
  let sessaoA: string;
  let mensagemA: string;
  let movimentoA: string;
  let posicaoA: string;
  let evidenciaA: string;
  let fracaoA: string;
  let comunicacaoA: string;
  let destinatarioA: string;
  let comunicacaoDocA: string;

  beforeAll(async () => {
    fx = await seed();
    const svc = serviceClient();

    // IA documental: fonte, bloco, sessão e mensagem (0040/0041).
    fonteA = uid();
    await svc.from("ia_documental_fontes").insert({
      id: fonteA, tenant_id: fx.tenantA, titulo: "Documento de processo",
    });
    blocoA = uid();
    await svc.from("ia_documental_fonte_blocos").insert({
      id: blocoA, tenant_id: fx.tenantA, fonte_id: fonteA, ordem: 0, conteudo: "Bloco de prova matriz",
    });
    sessaoA = uid();
    await svc.from("ia_documental_sessoes").insert({
      id: sessaoA, tenant_id: fx.tenantA, titulo: "Sessão matriz", criado_por: fx.users.adminA.id,
    });
    mensagemA = uid();
    await svc.from("ia_documental_mensagens").insert({
      id: mensagemA, tenant_id: fx.tenantA, sessao_id: sessaoA,
      papel: "administrador", conteudo: "mensagem matriz", criado_por: fx.users.adminA.id,
    });
    await svc.from("ia_documental_configuracoes").upsert(
      { tenant_id: fx.tenantA, instrucoes: "matriz" },
      { onConflict: "tenant_id" }
    );

    // Posição de imputação sobre um movimento (20260826000000).
    movimentoA = uid();
    await svc.from("movimentos_bancarios").insert({
      id: movimentoA, tenant_id: fx.tenantA, data_movimento: "2087-01-01",
      tipo: "debito", valor_cents: 1000, descricao: "Movimento do processo",
    });
    posicaoA = uid();
    await svc.from("imputacoes_posicoes").insert({
      id: posicaoA, tenant_id: fx.tenantA, movimento_id: movimentoA,
      parte: "condominio", tipo: "reserva", fundamento: "sem imputação demonstrada",
      data_posicao: "2087-01-02T00:00:00Z", criado_por: fx.users.adminA.id,
    });
    evidenciaA = uid();
    await svc.from("imputacoes_posicoes_evidencias").insert({
      id: evidenciaA, tenant_id: fx.tenantA, posicao_id: posicaoA, fonte_id: fonteA,
      citacao: "trecho de prova", criado_por: fx.users.adminA.id,
    });

    // Comunicação formal (0042/0043) com destinatário e documento.
    const { data: fr } = await svc
      .from("fracoes")
      .insert({ tenant_id: fx.tenantA, codigo: `MATP-${stamp()}`, quota_mensal_cents: 5000 })
      .select("id")
      .single();
    fracaoA = (fr as { id: string }).id;
    comunicacaoA = uid();
    await svc.from("comunicacoes").insert({
      id: comunicacaoA, tenant_id: fx.tenantA, assunto: "Comunicação matriz",
      estado: "rascunho", criado_por: fx.users.adminA.id,
    });
    destinatarioA = uid();
    await svc.from("comunicacao_destinatarios").insert({
      id: destinatarioA, tenant_id: fx.tenantA, comunicacao_id: comunicacaoA, fracao_id: fracaoA,
    });
    const docAdminA = uid();
    await svc.from("documentos_administracao").insert({
      id: docAdminA, tenant_id: fx.tenantA, titulo: "Doc comunicado", categoria: "outro",
      ficheiro_path: `admin/${fx.tenantA}/${docAdminA}/doc.pdf`, upload_por: fx.users.adminA.id,
    });
    comunicacaoDocA = uid();
    await svc.from("comunicacao_documentos").insert({
      id: comunicacaoDocA, tenant_id: fx.tenantA, comunicacao_id: comunicacaoA,
      documento_administracao_id: docAdminA,
    });
  }, 60_000);

  afterAll(async () => {
    if (fx) await fx.cleanup();
  }, 60_000);

  // ---------------------------------------------- imputacoes_posicoes
  describe("imputacoes_posicoes (grants mínimos 20260826020000)", () => {
    it("POS: admin lê as posições do tenant", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data, error } = await c.from("imputacoes_posicoes").select("id").eq("id", posicaoA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: condómino (com grant SELECT) não vê linhas — RLS admin-only", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const r = await c.from("imputacoes_posicoes").select("id").eq("tenant_id", fx.tenantA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: anon é recusado ao nível do grant (sem SELECT)", async () => {
      const c = anonClient();
      const r = await c.from("imputacoes_posicoes").select("id").limit(1);
      expect(r.error).not.toBeNull();
    });

    it("NEG: admin de outro tenant não lê posições do tenant A", async () => {
      const c = userClient(fx.users.adminB.accessToken);
      const r = await c.from("imputacoes_posicoes").select("id").eq("id", posicaoA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: nem o admin insere via API — authenticated não tem grant INSERT", async () => {
      const { status } = await restInsert("imputacoes_posicoes", {
        tenant_id: fx.tenantA, movimento_id: movimentoA, parte: "condominio",
        tipo: "reserva", fundamento: "forjado", data_posicao: "2087-02-01T00:00:00Z",
      }, { apikey: ANON_KEY, token: fx.users.adminA.accessToken });
      expect(status).toBeGreaterThanOrEqual(400);
    });

    it("NEG: anon não insere posições (grant revogado)", async () => {
      const { status } = await restInsert("imputacoes_posicoes", {
        tenant_id: fx.tenantA, movimento_id: movimentoA, parte: "condominio",
        tipo: "reserva", fundamento: "anon", data_posicao: "2087-02-01T00:00:00Z",
      }, { apikey: ANON_KEY });
      expect(status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("imputacoes_posicoes_evidencias (grants mínimos)", () => {
    it("POS: admin lê evidências do tenant", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data, error } = await c.from("imputacoes_posicoes_evidencias").select("id").eq("id", evidenciaA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: condómino não vê evidências", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const r = await c.from("imputacoes_posicoes_evidencias").select("id").eq("tenant_id", fx.tenantA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: anon é recusado ao nível do grant", async () => {
      const c = anonClient();
      const r = await c.from("imputacoes_posicoes_evidencias").select("id").limit(1);
      expect(r.error).not.toBeNull();
    });

    it("NEG: admin de outro tenant não lê evidências do tenant A", async () => {
      const c = userClient(fx.users.adminB.accessToken);
      const r = await c.from("imputacoes_posicoes_evidencias").select("id").eq("id", evidenciaA);
      expect(semAcesso(r)).toBe(true);
    });
  });

  // ---------------------------------------------- IA documental (0040/0041)
  describe("ia_documental_* (admin-only)", () => {
    it("POS: admin lê fontes, blocos, sessões, mensagens e configurações", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const rF = await c.from("ia_documental_fontes").select("id").eq("id", fonteA);
      const rB = await c.from("ia_documental_fonte_blocos").select("id").eq("id", blocoA);
      const rS = await c.from("ia_documental_sessoes").select("id").eq("id", sessaoA);
      const rM = await c.from("ia_documental_mensagens").select("id").eq("id", mensagemA);
      const rC = await c.from("ia_documental_configuracoes").select("tenant_id").eq("tenant_id", fx.tenantA);
      expect(rF.error).toBeNull();
      expect((rF.data ?? []).length).toBe(1);
      expect(rB.error).toBeNull();
      expect((rB.data ?? []).length).toBe(1);
      expect(rS.error).toBeNull();
      expect((rS.data ?? []).length).toBe(1);
      expect(rM.error).toBeNull();
      expect((rM.data ?? []).length).toBe(1);
      expect(rC.error).toBeNull();
      expect((rC.data ?? []).length).toBe(1);
    });

    it("NEG: condómino não lê nenhuma tabela ia_documental", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const rF = await c.from("ia_documental_fontes").select("id").eq("tenant_id", fx.tenantA);
      const rB = await c.from("ia_documental_fonte_blocos").select("id").eq("tenant_id", fx.tenantA);
      const rS = await c.from("ia_documental_sessoes").select("id").eq("tenant_id", fx.tenantA);
      const rM = await c.from("ia_documental_mensagens").select("id").eq("tenant_id", fx.tenantA);
      const rC = await c.from("ia_documental_configuracoes").select("tenant_id").eq("tenant_id", fx.tenantA);
      expect(semAcesso(rF)).toBe(true);
      expect(semAcesso(rB)).toBe(true);
      expect(semAcesso(rS)).toBe(true);
      expect(semAcesso(rM)).toBe(true);
      expect(semAcesso(rC)).toBe(true);
    });

    it("NEG: anon não lê fontes", async () => {
      const c = anonClient();
      const r = await c.from("ia_documental_fontes").select("id").limit(1);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: admin de outro tenant não lê fontes do tenant A", async () => {
      const c = userClient(fx.users.adminB.accessToken);
      const r = await c.from("ia_documental_fontes").select("id").eq("id", fonteA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: condómino não insere fontes", async () => {
      const { status } = await restInsert(
        "ia_documental_fontes",
        { tenant_id: fx.tenantA, titulo: "forjada" },
        { apikey: ANON_KEY, token: fx.users.condoA.accessToken }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });
  });

  // --------------------------------- contrato_memoria (SÓ LEITURA — ver topo)
  describe("contrato_memoria_eventos / _evidencias (só leitura; contratos fora das migrações)", () => {
    // NOTA (achado): estas tabelas mantêm os grants por omissão do Supabase
    // (anon/authenticated com SELECT etc.) — 20260823175458 só fez GRANT a
    // authenticated, sem revogar anon. O RLS (is_tenant_admin) continua a
    // devolver 0 linhas a quem não é admin, pelo que não há exposição de
    // dados; a lacuna é de defesa em profundidade (o mesmo padrão que
    // 20260826020000 corrigiu só para imputacoes_posicoes). Aqui prova-se a
    // garantia RLS; a camada de grants está registada como achado.
    it("NEG: anon não vê eventos (RLS: 0 linhas)", async () => {
      const c = anonClient();
      const r = await c.from("contrato_memoria_eventos").select("id").limit(1);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: condómino não lê eventos", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const r = await c.from("contrato_memoria_eventos").select("id").eq("tenant_id", fx.tenantA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: admin de outro tenant não lê eventos do tenant A", async () => {
      const c = userClient(fx.users.adminB.accessToken);
      const r = await c.from("contrato_memoria_eventos").select("id").limit(1);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: anon não lê evidências (RLS: 0 linhas)", async () => {
      const c = anonClient();
      const r = await c.from("contrato_memoria_evidencias").select("id").limit(1);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: condómino não lê evidências", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const r = await c.from("contrato_memoria_evidencias").select("id").limit(1);
      expect(semAcesso(r)).toBe(true);
    });
    // Nota: os caminhos de ESCRITA não são exercidos aqui — a tabela depende de
    // public.contratos, inexistente na cadeia de migrações. Cobertura
    // registada como lacuna em tests/security/README.md.
  });

  // -------------------------------------------------- comunicações (0042/0043)
  describe("comunicacoes, destinatarios e documentos (admin-only)", () => {
    it("POS: admin lê comunicação, destinatário e documento", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const rC = await c.from("comunicacoes").select("id").eq("id", comunicacaoA);
      const rD = await c.from("comunicacao_destinatarios").select("id").eq("id", destinatarioA);
      const rDoc = await c.from("comunicacao_documentos").select("id").eq("id", comunicacaoDocA);
      expect(rC.error).toBeNull();
      expect((rC.data ?? []).length).toBe(1);
      expect(rD.error).toBeNull();
      expect((rD.data ?? []).length).toBe(1);
      expect(rDoc.error).toBeNull();
      expect((rDoc.data ?? []).length).toBe(1);
    });

    it("NEG: condómino não lê comunicações", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const rC = await c.from("comunicacoes").select("id").eq("tenant_id", fx.tenantA);
      const rD = await c.from("comunicacao_destinatarios").select("id").eq("tenant_id", fx.tenantA);
      const rDoc = await c.from("comunicacao_documentos").select("id").eq("tenant_id", fx.tenantA);
      expect(semAcesso(rC)).toBe(true);
      expect(semAcesso(rD)).toBe(true);
      expect(semAcesso(rDoc)).toBe(true);
    });

    it("NEG: anon não lê comunicações", async () => {
      const c = anonClient();
      const r = await c.from("comunicacoes").select("id").limit(1);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: admin de outro tenant não lê comunicações do tenant A", async () => {
      const c = userClient(fx.users.adminB.accessToken);
      const r = await c.from("comunicacoes").select("id").eq("id", comunicacaoA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: condómino não insere comunicação", async () => {
      const { status } = await restInsert(
        "comunicacoes",
        { tenant_id: fx.tenantA, assunto: "forjada", criado_por: fx.users.condoA.id },
        { apikey: ANON_KEY, token: fx.users.condoA.accessToken }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });
  });
});

// ---------------------------------------------------------------- utils locais

/** UUID aleatório por chamada; carimbo único para códigos. */
function uid(): string {
  return crypto.randomUUID();
}
function stamp(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
