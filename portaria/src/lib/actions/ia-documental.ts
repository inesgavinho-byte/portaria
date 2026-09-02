"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { chatTexto, chatConfigurado } from "@/lib/ai/openai";
import { sanitizarHtml } from "@/lib/sanitize";
import { renderBlueprintPdf } from "@/lib/pdf/blueprint-pdf";
import { montarDocumentoHtml, carregarLogoDataUri } from "@/lib/pdf/documento-blueprint";
import type {
  Blueprint,
  IAConfiguracaoDocumental,
  IADocumentalFonte,
  IADocumentalMensagem,
  IADocumentalSessao,
  TenantPerfil,
} from "@/types/database";

const INSTRUCOES_BASE = `És a Assistente Documental da PORTARIA, um apoio de trabalho para administradores de condomínios em Portugal. Trabalhas por conversa: recolhes factos, distingues factos confirmados de informação em falta e preparas um rascunho editável para revisão humana. Escreves em português europeu, com tom sóbrio, objetivo e profissional.`;

const GUARDRAILS_BASE = `Usa apenas os factos fornecidos na conversa, dados confirmados do condomínio e fontes disponíveis no contexto. Não inventes nomes, datas, montantes, deliberações, quóruns, artigos, prazos ou resultados de votação. Quando faltar informação material, pergunta ou inclui um aviso explícito. Nunca afirmes que um documento está legalmente conforme, válido, executável ou pronto para assinatura. Nunca envies, publiques, assines, aproves pagamentos ou alteres registos financeiros. Cita, quando aplicável, as fontes usadas no campo fontes.`;

export type FonteCitada = { titulo: string; referencia?: string | null; url?: string | null };
export type RespostaAssistenteDocumental = {
  resposta?: string;
  sessao?: IADocumentalSessao;
  mensagens?: IADocumentalMensagem[];
  error?: string;
  indisponivel?: boolean;
};

function configPadrao(tenantId: string): IAConfiguracaoDocumental {
  return {
    tenant_id: tenantId,
    instrucoes: INSTRUCOES_BASE,
    guardrails: GUARDRAILS_BASE,
    exige_revisao_humana: true,
    modelo: "gpt-4o",
    atualizado_em: new Date().toISOString(),
    atualizado_por: null,
  };
}

function textoLimpo(input: unknown, limite: number): string {
  return String(input ?? "").trim().slice(0, limite);
}

function parseResposta(texto: string): {
  resposta: string;
  perguntas_pendentes: string[];
  dados_recolhidos: Record<string, string>;
  rascunho_html: string | null;
  avisos: string[];
  fontes: FonteCitada[];
} | null {
  const inicio = texto.indexOf("{");
  const fim = texto.lastIndexOf("}");
  if (inicio < 0 || fim <= inicio) return null;
  try {
    const valor = JSON.parse(texto.slice(inicio, fim + 1)) as Record<string, unknown>;
    const lista = (v: unknown, max: number) => Array.isArray(v)
      ? v.map((item) => textoLimpo(item, max)).filter(Boolean)
      : [];
    const fontes = Array.isArray(valor.fontes)
      ? valor.fontes.map((item) => {
          const fonte = item as Record<string, unknown>;
          return {
            titulo: textoLimpo(fonte.titulo, 240),
            referencia: textoLimpo(fonte.referencia, 240) || null,
            url: textoLimpo(fonte.url, 500) || null,
          };
        }).filter((fonte) => fonte.titulo)
      : [];
    const dados = valor.dados_recolhidos && typeof valor.dados_recolhidos === "object"
      ? Object.fromEntries(Object.entries(valor.dados_recolhidos as Record<string, unknown>)
          .map(([chave, item]) => [textoLimpo(chave, 80), textoLimpo(item, 1000)])
          .filter(([chave, item]) => chave && item))
      : {};
    return {
      resposta: textoLimpo(valor.resposta, 4000) || "Registei a informação. Indique os próximos pontos a incluir.",
      perguntas_pendentes: lista(valor.perguntas_pendentes, 500).slice(0, 8),
      dados_recolhidos: dados,
      rascunho_html: textoLimpo(valor.rascunho_html, 25000) || null,
      avisos: lista(valor.avisos, 700).slice(0, 8),
      fontes,
    };
  } catch {
    return null;
  }
}

async function obterConfigEFonte() {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões." as const };
  const supabase = await createClient();
  const [{ data: config }, { data: fontes }, { data: perfil }] = await Promise.all([
    supabase.from("ia_documental_configuracoes").select("*").eq("tenant_id", ctx.tenant.id).maybeSingle(),
    supabase.from("ia_documental_fontes").select("*").eq("tenant_id", ctx.tenant.id).eq("ativa", true).order("titulo"),
    supabase.from("tenant_perfil").select("regulamento_texto").eq("tenant_id", ctx.tenant.id).maybeSingle(),
  ]);
  return {
    ctx,
    supabase,
    config: (config as IAConfiguracaoDocumental | null) ?? configPadrao(ctx.tenant.id),
    fontes: (fontes ?? []) as IADocumentalFonte[],
    regulamento: (perfil as Pick<TenantPerfil, "regulamento_texto"> | null)?.regulamento_texto ?? null,
  };
}

export async function obterConfiguracaoDocumental() {
  const base = await obterConfigEFonte();
  if ("error" in base) return base;
  return { config: base.config, fontes: base.fontes };
}

export async function guardarConfiguracaoDocumental(input: {
  instrucoes: string;
  guardrails: string;
  exigeRevisaoHumana: boolean;
  modelo?: string;
}): Promise<{ error?: string }> {
  const base = await obterConfigEFonte();
  if ("error" in base) return base;
  const instrucoes = textoLimpo(input.instrucoes, 8000);
  const guardrails = textoLimpo(input.guardrails, 8000);
  if (!instrucoes || !guardrails) return { error: "As instruções e os guardrails são obrigatórios." };

  const { error } = await base.supabase.from("ia_documental_configuracoes").upsert({
    tenant_id: base.ctx.tenant.id,
    instrucoes,
    guardrails,
    exige_revisao_humana: Boolean(input.exigeRevisaoHumana),
    modelo: textoLimpo(input.modelo, 120) || "gpt-4o",
    atualizado_em: new Date().toISOString(),
    atualizado_por: base.ctx.user.id,
  });
  if (error) return { error: "Não foi possível guardar a configuração da IA." };
  revalidatePath("/ia/configuracao/documentos");
  return {};
}

function dividirMarkdown(texto: string, maximo = 1800): string[] {
  const secoes = texto.replace(/\r/g, "").split(/\n(?=#{1,6}\s)|\n{2,}/).map((item) => item.trim()).filter(Boolean);
  const blocos: string[] = [];
  let atual = "";
  for (const secao of secoes) {
    if ((atual + "\n\n" + secao).length > maximo) {
      if (atual) blocos.push(atual);
      atual = secao.length > maximo ? secao.slice(0, maximo) : secao;
    } else atual = atual ? `${atual}\n\n${secao}` : secao;
  }
  if (atual) blocos.push(atual);
  return blocos.slice(0, 120);
}

export async function guardarFonteDocumentalIA(input: {
  id?: string;
  titulo: string;
  referencia?: string;
  url?: string;
  conteudoResumo?: string;
  markdown?: string;
  ativa: boolean;
}): Promise<{ error?: string }> {
  const base = await obterConfigEFonte();
  if ("error" in base) return base;
  const titulo = textoLimpo(input.titulo, 240);
  if (!titulo) return { error: "O título da fonte é obrigatório." };
  const markdown = textoLimpo(input.markdown, 180000) || null;
  const payload = {
    tenant_id: base.ctx.tenant.id,
    titulo,
    referencia: textoLimpo(input.referencia, 240) || null,
    url: textoLimpo(input.url, 500) || null,
    conteudo_resumo: textoLimpo(input.conteudoResumo, 3000) || (markdown ? markdown.slice(0, 1200) : null),
    conteudo_markdown: markdown,
    tamanho_bytes: markdown ? Buffer.byteLength(markdown, "utf8") : null,
    ativa: Boolean(input.ativa),
    atualizado_em: new Date().toISOString(),
    criado_por: base.ctx.user.id,
  };
  const query = input.id
    ? base.supabase.from("ia_documental_fontes").update(payload).eq("id", input.id).eq("tenant_id", base.ctx.tenant.id).select("id").single()
    : base.supabase.from("ia_documental_fontes").insert(payload).select("id").single();
  const { data: fonte, error } = await query;
  if (error || !fonte) return { error: "Não foi possível guardar a fonte." };
  if (markdown) {
    await base.supabase.from("ia_documental_fonte_blocos").delete().eq("fonte_id", fonte.id).eq("tenant_id", base.ctx.tenant.id);
    const blocos = dividirMarkdown(markdown).map((conteudo, ordem) => ({
      tenant_id: base.ctx.tenant.id,
      fonte_id: fonte.id,
      ordem,
      conteudo,
    }));
    if (blocos.length) {
      const { error: erroBlocos } = await base.supabase.from("ia_documental_fonte_blocos").insert(blocos);
      if (erroBlocos) return { error: "A fonte foi guardada, mas os seus blocos não puderam ser preparados." };
    }
  }
  revalidatePath("/ia/configuracao/documentos");
  return {};
}

export async function criarSessaoDocumental(blueprintId: string): Promise<{ id?: string; error?: string }> {
  const base = await obterConfigEFonte();
  if ("error" in base) return base;
  const { data: blueprint } = await base.supabase.from("blueprints").select("*")
    .eq("id", blueprintId).eq("tenant_id", base.ctx.tenant.id).maybeSingle();
  if (!blueprint) return { error: "Modelo não encontrado." };
  const bp = blueprint as Blueprint;
  const { data: sessao, error } = await base.supabase.from("ia_documental_sessoes").insert({
    tenant_id: base.ctx.tenant.id,
    blueprint_id: bp.id,
    titulo: `${bp.nome} — rascunho assistido`,
    criado_por: base.ctx.user.id,
    dados_recolhidos: {},
    avisos: ["Rascunho gerado por IA. A revisão e aprovação humana são obrigatórias antes de exportar."],
    fontes_utilizadas: [],
  }).select("id").single();
  if (error || !sessao) return { error: "Não foi possível criar a sessão documental." };

  await base.supabase.from("ia_documental_mensagens").insert({
    tenant_id: base.ctx.tenant.id,
    sessao_id: sessao.id,
    papel: "sistema",
    conteudo: `Sessão criada a partir do modelo “${bp.nome}”. Descreva os pontos a incluir; a IA pedirá os elementos em falta.`,
    citacoes: [],
    criado_por: base.ctx.user.id,
  });
  return { id: sessao.id };
}

export async function carregarSessaoDocumental(sessaoId: string): Promise<{
  sessao?: IADocumentalSessao;
  mensagens?: IADocumentalMensagem[];
  blueprint?: Blueprint;
  error?: string;
}> {
  const base = await obterConfigEFonte();
  if ("error" in base) return base;
  const { data: sessao } = await base.supabase.from("ia_documental_sessoes").select("*")
    .eq("id", sessaoId).eq("tenant_id", base.ctx.tenant.id).maybeSingle();
  if (!sessao) return { error: "Sessão documental não encontrada." };
  const s = sessao as IADocumentalSessao;
  const [{ data: mensagens }, { data: blueprint }] = await Promise.all([
    base.supabase.from("ia_documental_mensagens").select("*").eq("sessao_id", s.id)
      .eq("tenant_id", base.ctx.tenant.id).order("criado_em"),
    s.blueprint_id ? base.supabase.from("blueprints").select("*").eq("id", s.blueprint_id)
      .eq("tenant_id", base.ctx.tenant.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return {
    sessao: s,
    mensagens: (mensagens ?? []) as IADocumentalMensagem[],
    blueprint: (blueprint as Blueprint | null) ?? undefined,
  };
}

export async function enviarMensagemDocumental(sessaoId: string, conteudo: string): Promise<RespostaAssistenteDocumental> {
  const base = await obterConfigEFonte();
  if ("error" in base) return base;
  if (!chatConfigurado()) return { indisponivel: true }; // MLX local (L-44) ou OpenAI
  const pergunta = textoLimpo(conteudo, 12000);
  if (!pergunta) return { error: "Escreva um ponto, instrução ou pergunta para a assistente." };

  const sessaoCarregada = await carregarSessaoDocumental(sessaoId);
  if (!sessaoCarregada.sessao || !sessaoCarregada.blueprint) return { error: sessaoCarregada.error ?? "Modelo da sessão não encontrado." };
  const sessao = sessaoCarregada.sessao;
  if (sessao.estado === "aprovado" || sessao.estado === "arquivado") return { error: "Esta sessão já não aceita alterações." };

  await base.supabase.from("ia_documental_mensagens").insert({
    tenant_id: base.ctx.tenant.id,
    sessao_id: sessao.id,
    papel: "administrador",
    conteudo: pergunta,
    citacoes: [],
    criado_por: base.ctx.user.id,
  });

  const { data: mensagensRecentes } = await base.supabase.from("ia_documental_mensagens")
    .select("papel, conteudo").eq("sessao_id", sessao.id).eq("tenant_id", base.ctx.tenant.id)
    .order("criado_em", { ascending: false }).limit(14);
  const historico = (mensagensRecentes ?? []).reverse().map((m) => `${m.papel.toUpperCase()}: ${m.conteudo}`).join("\n\n");
  const consulta = `${sessaoCarregada.blueprint.tipo} ${pergunta}`.replace(/[^\p{L}\p{N}\s]/gu, " ").trim().slice(0, 700);
  const { data: blocos } = consulta
    ? await base.supabase.from("ia_documental_fonte_blocos")
      .select("conteudo, fonte:ia_documental_fontes(titulo, referencia, url)")
      .eq("tenant_id", base.ctx.tenant.id)
      .textSearch("busca", consulta, { type: "websearch", config: "portuguese" })
      .limit(6)
    : { data: [] };
  const fontesConfiguradas = base.fontes.map((fonte) => ({ titulo: fonte.titulo, referencia: fonte.referencia, url: fonte.url }));
  const excertos = (blocos ?? []).map((bloco) => ({
    fonte: bloco.fonte,
    conteudo: bloco.conteudo,
  }));

  const sistema = `${INSTRUCOES_BASE}\n\nINSTRUÇÕES DA ADMINISTRAÇÃO:\n${base.config.instrucoes}\n\nGUARDRAILS:\n${GUARDRAILS_BASE}\n${base.config.guardrails}\n\nUsa apenas os EXCERTOS RELEVANTES fornecidos. Se não houver excerto aplicável, não faças afirmações legais: indica a lacuna e sugere validação.\n\nDevolve apenas JSON válido, sem markdown, com este formato exato:\n{\"resposta\":\"texto\", \"perguntas_pendentes\":[\"texto\"], \"dados_recolhidos\":{\"campo\":\"valor\"}, \"rascunho_html\":\"HTML ou null\", \"avisos\":[\"texto\"], \"fontes\":[{\"titulo\":\"texto\",\"referencia\":\"texto ou null\",\"url\":\"texto ou null\"}]}\n\nO rascunho HTML deve ser profissional e editável; só o atualiza quando tiver informação suficiente. Mantém lacunas como texto claro entre parênteses retos, por exemplo [data da reunião a confirmar]. Não inventes fontes nem factos.`;
  const pedido = `MODELO: ${sessaoCarregada.blueprint.nome}\nTIPO: ${sessaoCarregada.blueprint.tipo}\nTEMPLATE DE BASE:\n${sessaoCarregada.blueprint.conteudo_template}\n\nDADOS JÁ RECOLHIDOS:\n${JSON.stringify(sessao.dados_recolhidos)}\n\nCATÁLOGO DE FONTES CONFIGURADAS:\n${JSON.stringify(fontesConfiguradas)}\n\nEXCERTOS RELEVANTES (apenas estes podem sustentar afirmações de fonte):\n${JSON.stringify(excertos)}\n\nCONVERSA:\n${historico}`;
  const texto = await chatTexto(sistema, pedido, base.config.modelo);
  if (!texto) return { error: "A assistente não conseguiu responder agora. Tente de novo." };
  const resposta = parseResposta(texto);
  if (!resposta) return { error: "A resposta da assistente não pôde ser validada. Tente reformular o pedido." };

  const dados = { ...sessao.dados_recolhidos, ...resposta.dados_recolhidos };
  const rascunho = resposta.rascunho_html ? sanitizarHtml(resposta.rascunho_html) : sessao.rascunho_html;
  const estado = rascunho ? "rascunho" : "recolha";
  const avisos = [...new Set([...(sessao.avisos ?? []), ...resposta.avisos, ...resposta.perguntas_pendentes.map((p) => `Pendente: ${p}`)])].slice(-16);
  await base.supabase.from("ia_documental_sessoes").update({
    dados_recolhidos: dados,
    rascunho_html: rascunho,
    avisos,
    fontes_utilizadas: resposta.fontes,
    estado,
    atualizado_em: new Date().toISOString(),
  }).eq("id", sessao.id).eq("tenant_id", base.ctx.tenant.id);
  await base.supabase.from("ia_documental_mensagens").insert({
    tenant_id: base.ctx.tenant.id,
    sessao_id: sessao.id,
    papel: "assistente",
    conteudo: resposta.resposta,
    citacoes: resposta.fontes,
    criado_por: null,
  });

  const atualizada = await carregarSessaoDocumental(sessao.id);
  revalidatePath(`/blueprints/${sessaoCarregada.blueprint.id}/assistente`);
  return { resposta: resposta.resposta, sessao: atualizada.sessao, mensagens: atualizada.mensagens };
}

export async function guardarRascunhoDocumental(sessaoId: string, html: string): Promise<{ error?: string }> {
  const base = await obterConfigEFonte();
  if ("error" in base) return base;
  const limpo = sanitizarHtml(textoLimpo(html, 30000));
  if (!limpo) return { error: "O rascunho não pode ficar vazio." };
  const { error } = await base.supabase.from("ia_documental_sessoes").update({
    rascunho_html: limpo,
    estado: "em_revisao",
    atualizado_em: new Date().toISOString(),
  }).eq("id", sessaoId).eq("tenant_id", base.ctx.tenant.id);
  if (error) return { error: "Não foi possível guardar o rascunho." };
  return {};
}

function slugDocumento(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

export async function aprovarRascunhoDocumental(sessaoId: string): Promise<{ error?: string }> {
  const base = await obterConfigEFonte();
  if ("error" in base) return base;
  const { data: sessao } = await base.supabase.from("ia_documental_sessoes").select("rascunho_html")
    .eq("id", sessaoId).eq("tenant_id", base.ctx.tenant.id).maybeSingle();
  if (!sessao?.rascunho_html) return { error: "Não existe um rascunho para aprovar." };
  const { error } = await base.supabase.from("ia_documental_sessoes").update({
    estado: "aprovado",
    aprovado_por: base.ctx.user.id,
    aprovado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  }).eq("id", sessaoId).eq("tenant_id", base.ctx.tenant.id);
  if (error) return { error: "Não foi possível registar a aprovação." };
  return {};
}

export async function exportarRascunhoDocumental(sessaoId: string): Promise<{ documentoId?: string; error?: string }> {
  const base = await obterConfigEFonte();
  if ("error" in base) return base;
  const carregada = await carregarSessaoDocumental(sessaoId);
  if (!carregada.sessao || !carregada.blueprint) return { error: "Sessão documental não encontrada." };
  if (carregada.sessao.estado !== "aprovado" || !carregada.sessao.rascunho_html) {
    return { error: "O rascunho tem de ser aprovado por um administrador antes de exportar." };
  }

  const { data: perfil } = await base.supabase.from("tenant_perfil").select("*")
    .eq("tenant_id", base.ctx.tenant.id).maybeSingle();
  const agora = new Date();
  const logo = await carregarLogoDataUri(base.ctx.tenant.logo_url);
  const html = montarDocumentoHtml({
    tenant: base.ctx.tenant,
    perfil: (perfil as TenantPerfil | null) ?? null,
    bodyTemplate: carregada.sessao.rascunho_html,
    hoje: agora.toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" }),
    ano: agora.getFullYear(),
    numero: null,
    assunto: carregada.sessao.titulo,
    logoDataUri: logo,
  });
  let pdf: Buffer;
  try { pdf = await renderBlueprintPdf(html); }
  catch { return { error: "Não foi possível gerar o PDF do rascunho aprovado." }; }

  const { data: documento, error: erroDocumento } = await base.supabase.from("documentos").insert({
    tenant_id: base.ctx.tenant.id,
    titulo: carregada.sessao.titulo,
    categoria: carregada.blueprint.tipo === "ata" ? "ata" : "circular",
    ano: agora.getFullYear(),
    ficheiro_path: "pending",
    ficheiro_tamanho: pdf.length,
    ficheiro_tipo: "application/pdf",
    upload_por: base.ctx.user.id,
    blueprint_id: carregada.blueprint.id,
  }).select("id").single();
  if (erroDocumento || !documento) return { error: "Não foi possível registar o documento aprovado." };

  const path = `${base.ctx.tenant.id}/${documento.id}/${slugDocumento(carregada.sessao.titulo) || "documento"}.pdf`;
  const { error: erroUpload } = await base.supabase.storage.from("documentos")
    .upload(path, pdf, { contentType: "application/pdf", upsert: false });
  if (erroUpload) {
    await base.supabase.from("documentos").delete().eq("id", documento.id);
    return { error: "Não foi possível guardar o PDF aprovado." };
  }
  const { error: erroPath } = await base.supabase.from("documentos").update({ ficheiro_path: path })
    .eq("id", documento.id).eq("tenant_id", base.ctx.tenant.id);
  if (erroPath) return { error: "O PDF foi guardado, mas não pôde ser finalizado." };
  revalidatePath("/documentos");
  return { documentoId: documento.id };
}
