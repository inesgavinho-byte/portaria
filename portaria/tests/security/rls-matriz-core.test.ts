/**
 * Suite de matriz RLS — NÚCLEO (A2.2).
 *
 * Expande a cobertura da `docs/security/authorization-matrix.md` para as
 * tabelas centrais que as suites P0/P1 não cobrem linha a linha:
 * tenants, user_tenants (SELECT), avisos, tenant_perfil, espacos_comuns,
 * fracoes, convites (SELECT directo), ocorrencias + eventos + fotografias,
 * assembleias + pontos, votacao_opcoes, votacao_participantes (SELECT),
 * conversas_ia e reservas (SELECT por papel).
 *
 * Para cada tabela: acesso legítimo (POS), negação ao papel sem direito (NEG)
 * e isolamento cross-tenant (NEG). Anon entra em todas as tabelas como
 * perspectiva de negação.
 *
 * Reutiliza helpers/fixtures existentes; corre contra o PostgREST directo.
 * Skip limpo sem env Supabase (mesmo padrão de rls-p0.test.ts).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ANON_KEY, hasEnv, userClient, anonClient, restInsert, serviceClient } from "./helpers";
import { seed, type Fixtures } from "./fixtures";

const d = hasEnv ? describe : describe.skip;

/** Sem acesso = erro (grant/RLS com erro) ou zero linhas devolvidas. */
function semAcesso(r: { data: unknown[] | null; error: { message: string } | null }): boolean {
  return r.error !== null || (r.data ?? []).length === 0;
}

d("RLS matriz — núcleo (tenants, avisos, ocorrências, assembleias, convites)", () => {
  let fx: Fixtures;
  let avisoAtivoA: string;
  let avisoInativoA: string;
  let assembleiaPublicadaA: string;
  let assembleiaRascunhoA: string;
  let pontoPublicadaA: string;
  let conviteCondoA: string;
  let eventoCriadaA: string;
  let eventoNotaA: string;
  let fotoA: string;
  let conversaCondoA: string;
  let reservaCondoA: string;

  beforeAll(async () => {
    fx = await seed();
    const svc = serviceClient();

    // Avisos: um ativo (visível a membros) e um inativo (só admins).
    avisoAtivoA = uid();
    avisoInativoA = uid();
    await svc.from("avisos").insert([
      { id: avisoAtivoA, tenant_id: fx.tenantA, titulo: "Ativo", conteudo: "c", publicado_por: fx.users.adminA.id, ativo: true },
      { id: avisoInativoA, tenant_id: fx.tenantA, titulo: "Inativo", conteudo: "c", publicado_por: fx.users.adminA.id, ativo: false },
    ]);

    // Perfil interno do condomínio — admin-only.
    await svc.from("tenant_perfil").insert({ tenant_id: fx.tenantA, administrador_nome: "Admin Teste" });

    // Assembleias: agendada (visível a membros sem inquilino, estado <> rascunho)
    // e rascunho (só admins). NB: assembleia_estado = rascunho|agendada|realizada|cancelada.
    assembleiaPublicadaA = uid();
    assembleiaRascunhoA = uid();
    pontoPublicadaA = uid();
    await svc.from("assembleias").insert([
      { id: assembleiaPublicadaA, tenant_id: fx.tenantA, titulo: "Assembleia agendada", estado: "agendada", criado_por: fx.users.adminA.id },
      { id: assembleiaRascunhoA, tenant_id: fx.tenantA, titulo: "Rascunho", estado: "rascunho", criado_por: fx.users.adminA.id },
    ]);
    await svc.from("assembleia_pontos").insert({
      id: pontoPublicadaA, tenant_id: fx.tenantA, assembleia_id: assembleiaPublicadaA, ordem: 1, titulo: "Ponto um",
    });

    // Fração do tenant A — fracoes é admin-only; a leitura por membros é NEG.
    await svc.from("fracoes").insert({
      tenant_id: fx.tenantA, codigo: `MATC-${Date.now().toString(36)}`, quota_mensal_cents: 5000,
    });

    // Convite dirigido ao email do condoA.
    conviteCondoA = uid();
    await svc.from("convites").insert({
      id: conviteCondoA, tenant_id: fx.tenantA, email: fx.users.condoA.email, fracao: "1-A", role: "condomino", criado_por: fx.users.adminA.id,
    });

    // Timeline da ocorrência do condoA: um evento público e uma nota interna.
    eventoCriadaA = uid();
    eventoNotaA = uid();
    await svc.from("ocorrencia_eventos").insert([
      { id: eventoCriadaA, tenant_id: fx.tenantA, ocorrencia_id: fx.ocorrenciaPrivadaA, tipo: "criada", autor: fx.users.adminA.id },
      { id: eventoNotaA, tenant_id: fx.tenantA, ocorrencia_id: fx.ocorrenciaPrivadaA, tipo: "nota", nota: "nota interna do admin", autor: fx.users.adminA.id },
    ]);
    fotoA = uid();
    await svc.from("ocorrencia_fotografias").insert({
      id: fotoA, tenant_id: fx.tenantA, ocorrencia_id: fx.ocorrenciaPrivadaA, ficheiro_path: `${fx.tenantA}/${fotoA}/foto.jpg`, criado_por: fx.users.condoA.id,
    });

    // Conversa de IA do condoA.
    conversaCondoA = uid();
    await svc.from("conversas_ia").insert({ id: conversaCondoA, tenant_id: fx.tenantA, user_id: fx.users.condoA.id, titulo: "Matriz core" });

    // Reserva do condoA no espaço A.
    const inicio = new Date(Date.now() + 4 * 24 * 3600 * 1000);
    inicio.setUTCMinutes(0, 0, 0);
    reservaCondoA = uid();
    await svc.from("reservas").insert({
      id: reservaCondoA, tenant_id: fx.tenantA, espaco_id: fx.espacoA, user_id: fx.users.condoA.id,
      data_inicio: inicio.toISOString(), data_fim: new Date(inicio.getTime() + 3600_000).toISOString(),
    });

    // Segundo participante (inquilino) na votação fechada, para provar que o
    // condómino só vê a própria linha de votacao_participantes.
    await svc.from("votacao_participantes").insert({
      votacao_id: fx.votacaoFechada, tenant_id: fx.tenantA, user_id: fx.users.inquiA.id,
    });
  }, 60_000);

  afterAll(async () => {
    if (fx) await fx.cleanup();
  }, 60_000);

  // ------------------------------------------------------------ tenants
  describe("tenants", () => {
    it("POS: anon lê tenants (SELECT público por desenho, 0003)", async () => {
      const c = anonClient();
      const { data, error } = await c.from("tenants").select("id");
      expect(error).toBeNull();
      expect((data ?? []).length).toBeGreaterThanOrEqual(1);
    });

    it("POS: admin atualiza o próprio tenant", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { count, error } = await c
        .from("tenants")
        .update({ nome: "Tenant A matriz" }, { count: "exact" })
        .eq("id", fx.tenantA);
      expect(error).toBeNull();
      expect(count).toBe(1);
    });

    it("NEG: condo não atualiza o tenant", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { count } = await c
        .from("tenants")
        .update({ nome: "hijack" }, { count: "exact" })
        .eq("id", fx.tenantA);
      expect(count ?? 0).toBe(0);
    });

    it("NEG: admin de outro tenant não atualiza o tenant A", async () => {
      const c = userClient(fx.users.adminB.accessToken);
      const { count } = await c
        .from("tenants")
        .update({ nome: "cross" }, { count: "exact" })
        .eq("id", fx.tenantA);
      expect(count ?? 0).toBe(0);
    });
  });

  // ------------------------------------------------------------ user_tenants
  describe("user_tenants (SELECT)", () => {
    it("POS: condómino vê a própria membership", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data, error } = await c.from("user_tenants").select("id,user_id").eq("user_id", fx.users.condoA.id);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: condómino não vê a membership de outro membro", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const r = await c.from("user_tenants").select("id").eq("user_id", fx.users.adminA.id);
      expect(semAcesso(r)).toBe(true);
    });

    it("POS: admin vê todas as memberships do seu tenant", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data, error } = await c.from("user_tenants").select("id").eq("tenant_id", fx.tenantA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(4);
    });

    it("NEG: condómino de outro tenant vê 0 memberships do tenant A", async () => {
      const c = userClient(fx.users.condoB.accessToken);
      const r = await c.from("user_tenants").select("id").eq("tenant_id", fx.tenantA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: anon não lê memberships", async () => {
      const c = anonClient();
      const r = await c.from("user_tenants").select("id").limit(1);
      expect(semAcesso(r)).toBe(true);
    });
  });

  // ------------------------------------------------------------ avisos
  describe("avisos", () => {
    it("POS: condómino vê avisos ativos", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data, error } = await c.from("avisos").select("id").eq("id", avisoAtivoA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: condómino não vê avisos inativos", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const r = await c.from("avisos").select("id").eq("id", avisoInativoA);
      expect(semAcesso(r)).toBe(true);
    });

    it("POS: admin vê ativos e inativos", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data, error } = await c.from("avisos").select("id").in("id", [avisoAtivoA, avisoInativoA]);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(2);
    });

    it("NEG: anon não lê avisos", async () => {
      const c = anonClient();
      const r = await c.from("avisos").select("id").eq("id", avisoAtivoA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: condómino não insere avisos", async () => {
      const { status } = await restInsert(
        "avisos",
        { tenant_id: fx.tenantA, titulo: "forjado", conteudo: "x", publicado_por: fx.users.condoA.id },
        { apikey: ANON_KEY, token: fx.users.condoA.accessToken }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });
  });

  // ------------------------------------------------------------ tenant_perfil
  describe("tenant_perfil", () => {
    it("POS: admin lê o perfil do seu tenant", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data, error } = await c.from("tenant_perfil").select("tenant_id").eq("tenant_id", fx.tenantA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: condómino não lê o perfil", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const r = await c.from("tenant_perfil").select("tenant_id").eq("tenant_id", fx.tenantA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: admin de outro tenant não lê o perfil do tenant A", async () => {
      const c = userClient(fx.users.adminB.accessToken);
      const r = await c.from("tenant_perfil").select("tenant_id").eq("tenant_id", fx.tenantA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: anon não lê o perfil", async () => {
      const c = anonClient();
      const r = await c.from("tenant_perfil").select("tenant_id").limit(1);
      expect(semAcesso(r)).toBe(true);
    });
  });

  // ------------------------------------------------------------ espacos_comuns
  describe("espacos_comuns", () => {
    it("POS: condómino lê espaços ativos do seu tenant", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data, error } = await c.from("espacos_comuns").select("id").eq("id", fx.espacoA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: membro de outro tenant não lê espaços do tenant A", async () => {
      const c = userClient(fx.users.condoB.accessToken);
      const r = await c.from("espacos_comuns").select("id").eq("id", fx.espacoA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: anon não lê espaços", async () => {
      const c = anonClient();
      const r = await c.from("espacos_comuns").select("id").eq("id", fx.espacoA);
      expect(semAcesso(r)).toBe(true);
    });
  });

  // ------------------------------------------------------------ fracoes
  describe("fracoes (admin-only)", () => {
    it("POS: admin lê as frações do seu tenant", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data, error } = await c.from("fracoes").select("id").eq("tenant_id", fx.tenantA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBeGreaterThanOrEqual(1);
    });

    it("NEG: condómino não lê frações", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const r = await c.from("fracoes").select("id").eq("tenant_id", fx.tenantA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: admin de outro tenant não lê frações do tenant A", async () => {
      const c = userClient(fx.users.adminB.accessToken);
      const r = await c.from("fracoes").select("id").eq("tenant_id", fx.tenantA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: anon não lê frações", async () => {
      const c = anonClient();
      const r = await c.from("fracoes").select("id").limit(1);
      expect(semAcesso(r)).toBe(true);
    });
  });

  // ------------------------------------------------------------ assembleias
  describe("assembleias e assembleia_pontos", () => {
    it("POS: condómino vê assembleias publicadas", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data, error } = await c.from("assembleias").select("id").eq("id", assembleiaPublicadaA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: condómino não vê rascunhos", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const r = await c.from("assembleias").select("id").eq("id", assembleiaRascunhoA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: inquilino não vê assembleias (S6)", async () => {
      const c = userClient(fx.users.inquiA.accessToken);
      const r = await c.from("assembleias").select("id").eq("id", assembleiaPublicadaA);
      expect(semAcesso(r)).toBe(true);
    });

    it("POS: admin vê publicadas e rascunhos", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data, error } = await c.from("assembleias").select("id").in("id", [assembleiaPublicadaA, assembleiaRascunhoA]);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(2);
    });

    it("NEG: membro de outro tenant não vê assembleias do tenant A", async () => {
      const c = userClient(fx.users.condoB.accessToken);
      const r = await c.from("assembleias").select("id").eq("id", assembleiaPublicadaA);
      expect(semAcesso(r)).toBe(true);
    });

    it("POS: condómino vê pontos de assembleia publicada", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data, error } = await c.from("assembleia_pontos").select("id").eq("id", pontoPublicadaA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: inquilino não vê pontos de assembleia (S6)", async () => {
      const c = userClient(fx.users.inquiA.accessToken);
      const r = await c.from("assembleia_pontos").select("id").eq("id", pontoPublicadaA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: condómino não insere assembleias", async () => {
      const { status } = await restInsert(
        "assembleias",
        { tenant_id: fx.tenantA, titulo: "forjada", criado_por: fx.users.condoA.id },
        { apikey: ANON_KEY, token: fx.users.condoA.accessToken }
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });
  });

  // ------------------------------------------------------------ convites
  describe("convites (SELECT directo)", () => {
    it("POS: o convidado vê o convite dirigido ao seu email", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data, error } = await c.from("convites").select("id").eq("id", conviteCondoA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: membro com outro email não vê o convite alheio", async () => {
      const c = userClient(fx.users.inquiA.accessToken);
      const r = await c.from("convites").select("id").eq("id", conviteCondoA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: admin de outro tenant não vê o convite do tenant A", async () => {
      const c = userClient(fx.users.adminB.accessToken);
      const r = await c.from("convites").select("id").eq("id", conviteCondoA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: anon não lê convites", async () => {
      const c = anonClient();
      const r = await c.from("convites").select("id").limit(1);
      expect(semAcesso(r)).toBe(true);
    });
  });

  // ------------------------------------------------------------ ocorrencias
  describe("ocorrencias, ocorrencia_eventos e fotografias", () => {
    it("POS: o criador vê a sua ocorrência", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data, error } = await c.from("ocorrencias").select("id").eq("id", fx.ocorrenciaPrivadaA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: outro membro do mesmo tenant não vê a ocorrência alheia", async () => {
      const c = userClient(fx.users.inquiA.accessToken);
      const r = await c.from("ocorrencias").select("id").eq("id", fx.ocorrenciaPrivadaA);
      expect(semAcesso(r)).toBe(true);
    });

    it("POS: admin vê as ocorrências do tenant", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data, error } = await c.from("ocorrencias").select("id").eq("id", fx.ocorrenciaPrivadaA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: membro de outro tenant não vê a ocorrência", async () => {
      const c = userClient(fx.users.condoB.accessToken);
      const r = await c.from("ocorrencias").select("id").eq("id", fx.ocorrenciaPrivadaA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: anon não lê ocorrências", async () => {
      const c = anonClient();
      const r = await c.from("ocorrencias").select("id").limit(1);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: o criador não altera a ocorrência depois de criada (só admins)", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { count } = await c
        .from("ocorrencias")
        .update({ titulo: "alterada" }, { count: "exact" })
        .eq("id", fx.ocorrenciaPrivadaA);
      expect(count ?? 0).toBe(0);
    });

    it("POS: admin vê toda a timeline (incl. notas)", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data, error } = await c.from("ocorrencia_eventos").select("id").in("id", [eventoCriadaA, eventoNotaA]);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(2);
    });

    it("POS: criador vê a timeline pública mas não as notas internas", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data } = await c.from("ocorrencia_eventos").select("id").eq("ocorrencia_id", fx.ocorrenciaPrivadaA);
      const ids = (data ?? []).map((r: { id: string }) => r.id);
      expect(ids).toContain(eventoCriadaA);
      expect(ids).not.toContain(eventoNotaA);
    });

    it("NEG: membro de outro tenant não vê eventos", async () => {
      const c = userClient(fx.users.condoB.accessToken);
      const r = await c.from("ocorrencia_eventos").select("id").eq("id", eventoCriadaA);
      expect(semAcesso(r)).toBe(true);
    });

    it("POS: criador vê as fotografias da sua ocorrência; admin também", async () => {
      const cCondo = userClient(fx.users.condoA.accessToken);
      const rCondo = await cCondo.from("ocorrencia_fotografias").select("id").eq("id", fotoA);
      expect(rCondo.error).toBeNull();
      expect((rCondo.data ?? []).length).toBe(1);

      const cAdmin = userClient(fx.users.adminA.accessToken);
      const rAdmin = await cAdmin.from("ocorrencia_fotografias").select("id").eq("id", fotoA);
      expect((rAdmin.data ?? []).length).toBe(1);
    });

    it("NEG: anon não lê fotografias", async () => {
      const c = anonClient();
      const r = await c.from("ocorrencia_fotografias").select("id").eq("id", fotoA);
      expect(semAcesso(r)).toBe(true);
    });
  });

  // ------------------------------------------------------------ votacoes aux
  describe("votacao_opcoes e votacao_participantes (SELECT)", () => {
    it("POS: condómino vê opções de votação visível", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data, error } = await c.from("votacao_opcoes").select("id").eq("id", fx.opcaoAberta);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: inquilino não vê opções de votação (S6)", async () => {
      const c = userClient(fx.users.inquiA.accessToken);
      const r = await c.from("votacao_opcoes").select("id").eq("id", fx.opcaoAberta);
      expect(semAcesso(r)).toBe(true);
    });

    it("POS: participante vê só a própria linha de votacao_participantes", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data, error } = await c
        .from("votacao_participantes")
        .select("id,user_id")
        .eq("votacao_id", fx.votacaoFechada);
      expect(error).toBeNull();
      const linhas = (data ?? []) as { user_id: string }[];
      expect(linhas.length).toBe(1);
      expect(linhas[0].user_id).toBe(fx.users.condoA.id);
    });

    it("POS: admin vê todas as linhas de participação do tenant", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data, error } = await c
        .from("votacao_participantes")
        .select("id")
        .eq("votacao_id", fx.votacaoFechada);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(2);
    });

    it("NEG: membro de outro tenant não vê participações do tenant A", async () => {
      const c = userClient(fx.users.condoB.accessToken);
      const r = await c.from("votacao_participantes").select("id").eq("votacao_id", fx.votacaoAberta);
      expect(semAcesso(r)).toBe(true);
    });
  });

  // ------------------------------------------------------------ conversas_ia
  describe("conversas_ia (SELECT)", () => {
    it("POS: o dono vê a sua conversa", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data, error } = await c.from("conversas_ia").select("id").eq("id", conversaCondoA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: outro membro do tenant não vê a conversa (só próprias)", async () => {
      const c = userClient(fx.users.inquiA.accessToken);
      const r = await c.from("conversas_ia").select("id").eq("id", conversaCondoA);
      expect(semAcesso(r)).toBe(true);
    });

    it("NEG: anon não lê conversas", async () => {
      const c = anonClient();
      const r = await c.from("conversas_ia").select("id").limit(1);
      expect(semAcesso(r)).toBe(true);
    });
  });

  // ------------------------------------------------------------ reservas
  describe("reservas (SELECT por papel)", () => {
    it("POS: o dono vê a própria reserva", async () => {
      const c = userClient(fx.users.condoA.accessToken);
      const { data, error } = await c.from("reservas").select("id").eq("id", reservaCondoA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("POS: admin vê as reservas do tenant", async () => {
      const c = userClient(fx.users.adminA.accessToken);
      const { data, error } = await c.from("reservas").select("id").eq("id", reservaCondoA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("NEG: membro de outro tenant não vê a reserva", async () => {
      const c = userClient(fx.users.condoB.accessToken);
      const r = await c.from("reservas").select("id").eq("id", reservaCondoA);
      expect(semAcesso(r)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------- utils locais

/** UUID aleatório por chamada (paralelismo entre ficheiros de teste). */
function uid(): string {
  return crypto.randomUUID();
}
