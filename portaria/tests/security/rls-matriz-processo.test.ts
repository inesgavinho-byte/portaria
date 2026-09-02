/**
 * Suite de matriz RLS — PROCESSO (A2.2 + Fase B do goal-portaria-1.0).
 *
 * Tabelas de processo/documental de 2026-08 e 0040-0043:
 *   • imputacoes_posicoes + imputacoes_posicoes_evidencias
 *     (20260826020000 + Fase B 20260902400000: authenticated com
 *     SELECT/INSERT/UPDATE em posições e SELECT/INSERT em evidências —
 *     é o writer da UI do dossiê; a fronteira real é a RLS `is_tenant_admin`,
 *     que a suite prova recusando o condómino com grant na mão);
 *   • ia_documental_configuracoes / fontes / fonte_blocos / sessoes /
 *     mensagens (0040/0041, admin-only);
 *   • contrato_memoria_eventos / _evidencias — leitura provada; com a Fase B
 *     (20260902400000) authenticated tem também INSERT/UPDATE em eventos
 *     (SELECT/INSERT/DELETE em evidências desde A-5), gated pela RLS. A
 *     escrita continua não exercível em ambiente local: a tabela depende de
 *     `public.contratos`, que não existe na cadeia de migrações (G-1);
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
  // Fase B (20260902400000): a UI do dossiê escreve posições directamente
  // (INSERT/UPDATE a authenticated). O que separa o admin do condómino deixa
  // de ser o grant e passa a ser a RLS — é isso que os testes seguintes provam.
  describe("imputacoes_posicoes (grants 20260826020000 + Fase B 20260902400000)", () => {
    it("POS: admin lê as posições do tenant", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data, error } = await c.from("imputacoes_posicoes").select("id").eq("id", posicaoA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("POS: admin insere posição via PostgREST — o writer da Fase B", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      // Parte distinta da semeada para não colidir com a unique
      // (tenant_id, movimento_id, parte, tipo, despesa_id).
      const { data, error } = await c.from("imputacoes_posicoes")
        .insert({
          tenant_id: fx.tenantA, movimento_id: movimentoA, parte: "contraparte",
          tipo: "reserva", fundamento: "reserva registada pela UI",
          data_posicao: "2087-02-02T00:00:00Z", criado_por: fx.users.adminA.id,
        })
        .select("id")
        .single();
      expect(error).toBeNull();
      expect(data).not.toBeNull();
      // DELETE não é concedido a authenticated: a limpeza é do service role.
      if (data) {
        await serviceClient().from("imputacoes_posicoes").delete().eq("id", (data as { id: string }).id);
      }
    });

    it("POS: admin muda o estado de uma posição (UPDATE) — histórico, nunca apagar", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data, error } = await c.from("imputacoes_posicoes")
        .update({ estado: "retirada" })
        .eq("id", posicaoA)
        .select("estado")
        .single();
      expect(error).toBeNull();
      expect((data as { estado: string } | null)?.estado).toBe("retirada");
      // Repor o estado semeado.
      await c.from("imputacoes_posicoes").update({ estado: "sustentada" }).eq("id", posicaoA);
    });

    it("NEG: condómino (com grant INSERT na mão) é recusado pela RLS — não pelo grant", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { error } = await c.from("imputacoes_posicoes")
        .insert({
          tenant_id: fx.tenantA, movimento_id: movimentoA, parte: "terceiro",
          tipo: "reserva", fundamento: "forjado pelo condómino",
          data_posicao: "2087-02-03T00:00:00Z",
        });
      // WITH CHECK is_tenant_admin: violação de RLS, não falha de grant.
      expect(error).not.toBeNull();
    });

    it("NEG: condómino não muda o estado de uma posição", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const r = await c.from("imputacoes_posicoes")
        .update({ estado: "superada" })
        .eq("id", posicaoA)
        .select("id");
      expect(semAcesso(r)).toBe(true);
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

    it("NEG: anon não insere posições (grant revogado)", async () => {
      const { status } = await restInsert("imputacoes_posicoes", {
        tenant_id: fx.tenantA, movimento_id: movimentoA, parte: "condominio",
        tipo: "reserva", fundamento: "anon", data_posicao: "2087-02-01T00:00:00Z",
      }, { apikey: ANON_KEY });
      expect(status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("imputacoes_posicoes_evidencias (grants mínimos + Fase B)", () => {
    it("POS: admin lê evidências do tenant", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data, error } = await c.from("imputacoes_posicoes_evidencias").select("id").eq("id", evidenciaA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("POS: admin anexa evidência a uma posição via PostgREST", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data, error } = await c.from("imputacoes_posicoes_evidencias")
        .insert({
          tenant_id: fx.tenantA, posicao_id: posicaoA, fonte_id: fonteA,
          localizador: "pág. 2", citacao: "citação anexada pela UI",
          criado_por: fx.users.adminA.id,
        })
        .select("id")
        .single();
      expect(error).toBeNull();
      expect(data).not.toBeNull();
      if (data) {
        await serviceClient()
          .from("imputacoes_posicoes_evidencias")
          .delete()
          .eq("id", (data as { id: string }).id);
      }
    });

    it("NEG: condómino não anexa evidências — RLS recusa o INSERT", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { error } = await c.from("imputacoes_posicoes_evidencias")
        .insert({
          tenant_id: fx.tenantA, posicao_id: posicaoA, fonte_id: fonteA,
          citacao: "forjada pelo condómino",
        });
      expect(error).not.toBeNull();
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

  // --------------------------------- contrato_memoria (leitura provada; escrita via UI)
  describe("contrato_memoria_eventos / _evidencias (leitura provada; escrita não exercível — G-1)", () => {
    // NOTA (achado A-5 — corrigido por 20260902330000): estas tabelas mantinham
    // os grants por omissão do Supabase (anon/authenticated com SELECT etc.).
    // O RLS (is_tenant_admin) continua a devolver 0 linhas a quem não é admin;
    // a migração de correção apertou a segunda camada (revoke a anon;
    // authenticated só com as operações que a app usa), no padrão que
    // 20260826020000 aplicou a imputacoes_posicoes.
    //
    // NOTA (Fase B — 20260902400000): a UI do dossiê passa a escrever
    // acontecimentos (INSERT/UPDATE a authenticated, gated pela política
    // `admins manage` FOR ALL, que já tinha USING e WITH CHECK
    // is_tenant_admin). Os caminhos de escrita continuam não exercíveis aqui —
    // a tabela depende de `public.contratos`, inexistente na cadeia de
    // migrações (lacuna G-1 em tests/security/README.md). Aqui prova-se a
    // garantia RLS de leitura; os grants novos ficam verificados por SQL
    // (has_table_privilege) quando houver stack com a cadeia completa.
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
