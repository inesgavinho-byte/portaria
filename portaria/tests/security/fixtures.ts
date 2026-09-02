/**
 * Fixtures para a suite de segurança P0.
 *
 * Semeia, via service role (ignora RLS), dois tenants completos com
 * utilizadores de cada papel, uma votação aberta e uma fechada, espaços,
 * documentos de várias categorias, uma ocorrência privada e chunks RAG
 * (incluindo um de ocorrência resolvida). Devolve todos os ids e tokens.
 */
import { createConfirmedUser, deleteUsers, serviceClient, type TestUser } from "./helpers";

/** Vetor 1536-dim em formato pgvector ('[1,0,0,...]'). Norma não-nula. */
export function vec1536(): string {
  const arr = new Array(1536).fill(0);
  arr[0] = 1;
  return `[${arr.join(",")}]`;
}

export type Fixtures = {
  tenantA: string;
  tenantB: string;
  users: {
    adminA: TestUser;
    condoA: TestUser;
    inquiA: TestUser;
    comissaoA: TestUser;
    adminB: TestUser;
    condoB: TestUser;
  };
  espacoA: string;
  espacoB: string;
  votacaoAberta: string;
  votacaoFechada: string;
  opcaoAberta: string;
  opcaoFechada: string;
  docContaA: string; // categoria sensível (conta)
  docManualA: string; // categoria não sensível (manual)
  ocorrenciaPrivadaA: string;
  cleanup: () => Promise<void>;
};

/**
 * UUID aleatório por chamada: o vitest corre ficheiros de teste em paralelo e
 * duas fixtures com ids fixos colidem (unique violation no tenants.id).
 */
const uid = () => crypto.randomUUID();

export async function seed(): Promise<Fixtures> {
  const svc = serviceClient();
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const mail = (r: string) => `sec+${r}-${stamp}@test.local`;

  const [adminA, condoA, inquiA, comissaoA, adminB, condoB] = await Promise.all([
    createConfirmedUser(mail("adminA")),
    createConfirmedUser(mail("condoA")),
    createConfirmedUser(mail("inquiA")),
    createConfirmedUser(mail("comissaoA")),
    createConfirmedUser(mail("adminB")),
    createConfirmedUser(mail("condoB")),
  ]);

  const tenantA = uid();
  const tenantB = uid();

  await svc.from("tenants").insert([
    { id: tenantA, slug: `ta-${stamp}`, nome: "Tenant A" },
    { id: tenantB, slug: `tb-${stamp}`, nome: "Tenant B" },
  ]);

  await svc.from("user_tenants").insert([
    { user_id: adminA.id, tenant_id: tenantA, role: "admin" },
    { user_id: condoA.id, tenant_id: tenantA, role: "condomino" },
    { user_id: inquiA.id, tenant_id: tenantA, role: "inquilino" },
    { user_id: comissaoA.id, tenant_id: tenantA, role: "comissao" },
    { user_id: adminB.id, tenant_id: tenantB, role: "admin" },
    { user_id: condoB.id, tenant_id: tenantB, role: "condomino" },
  ]);

  // Espaços (um por tenant), 24/7 para as reservas passarem o trigger.
  const espacoA = uid();
  const espacoB = uid();
  const horario = {
    abertura_seg: "00:00", fecho_seg: "23:59", abertura_ter: "00:00", fecho_ter: "23:59",
    abertura_qua: "00:00", fecho_qua: "23:59", abertura_qui: "00:00", fecho_qui: "23:59",
    abertura_sex: "00:00", fecho_sex: "23:59", abertura_sab: "00:00", fecho_sab: "23:59",
    abertura_dom: "00:00", fecho_dom: "23:59",
  };
  await svc.from("espacos_comuns").insert([
    { id: espacoA, tenant_id: tenantA, nome: "Sala A", ...horario },
    { id: espacoB, tenant_id: tenantB, nome: "Sala B", ...horario },
  ]);

  // Votações (A): uma aberta com condoA como participante, uma fechada.
  const votacaoAberta = uid();
  const votacaoFechada = uid();
  const opcaoAberta = uid();
  const opcaoFechada = uid();
  await svc.from("votacoes").insert([
    { id: votacaoAberta, tenant_id: tenantA, titulo: "Aberta", estado: "aberta", criado_por: adminA.id },
    { id: votacaoFechada, tenant_id: tenantA, titulo: "Fechada", estado: "encerrada", criado_por: adminA.id },
  ]);
  await svc.from("votacao_opcoes").insert([
    { id: opcaoAberta, votacao_id: votacaoAberta, tenant_id: tenantA, texto: "Sim" },
    { id: opcaoFechada, votacao_id: votacaoFechada, tenant_id: tenantA, texto: "X" },
  ]);
  await svc.from("votacao_participantes").insert([
    { votacao_id: votacaoAberta, tenant_id: tenantA, user_id: condoA.id },
    { votacao_id: votacaoFechada, tenant_id: tenantA, user_id: condoA.id },
  ]);

  // Documentos (A): uma conta (sensível) e um manual (não sensível).
  const docContaA = uid();
  const docManualA = uid();
  await svc.from("documentos").insert([
    { id: docContaA, tenant_id: tenantA, titulo: "Contas 2025", categoria: "conta", ficheiro_path: `${tenantA}/${docContaA}/contas.pdf`, upload_por: adminA.id },
    { id: docManualA, tenant_id: tenantA, titulo: "Manual", categoria: "manual", ficheiro_path: `${tenantA}/${docManualA}/manual.pdf`, upload_por: adminA.id },
  ]);

  // Ocorrência privada (A) criada pelo condoA.
  const ocorrenciaPrivadaA = uid();
  await svc.from("ocorrencias").insert([
    { id: ocorrenciaPrivadaA, tenant_id: tenantA, titulo: "Barulho do vizinho", descricao: "Detalhe privado sensível", categoria: "outro", criado_por: condoA.id },
  ]);

  // Embeddings (A): regulamento (todos) + ocorrencia_resolvida (só admin, C2).
  const emb = vec1536();
  await svc.from("conhecimento_embeddings").insert([
    { tenant_id: tenantA, origem: "regulamento", origem_id: "reg1", conteudo: "Artigo do regulamento", embedding: emb },
    { tenant_id: tenantA, origem: "ocorrencia_resolvida", origem_id: ocorrenciaPrivadaA, conteudo: "Queixa privada indexada", embedding: emb },
  ]);

  const cleanup = async () => {
    // Apagar tenants faz cascade a tudo o que lhes está ligado.
    await svc.from("tenants").delete().in("id", [tenantA, tenantB]);
    await deleteUsers([adminA.id, condoA.id, inquiA.id, comissaoA.id, adminB.id, condoB.id]);
  };

  return {
    tenantA, tenantB,
    users: { adminA, condoA, inquiA, comissaoA, adminB, condoB },
    espacoA, espacoB,
    votacaoAberta, votacaoFechada, opcaoAberta, opcaoFechada,
    docContaA, docManualA, ocorrenciaPrivadaA,
    cleanup,
  };
}
