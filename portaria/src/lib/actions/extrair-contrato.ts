"use server";

import { requireAdmin } from "@/lib/supabase/tenant";
import { extrairTextoPdfLocal } from "@/lib/ai/pdf-texto";
import { chatLocal, mlxChatConfigurado } from "@/lib/ai/local";

/**
 * Extracção automática de dados de um contrato em PDF — processamento
 * LOCAL (decisão L-44, docs/legal/decisao-ia-l44.md): o texto é extraído
 * do PDF com unpdf (sem LLM) e enviado ao chat MLX da infraestrutura
 * própria (Qwen3-8B-4bit). Nenhum dado sai da máquina — o contrato nunca
 * mais é enviado a provedores externos (era o único caminho gpt-4o com
 * PDF integral).
 *
 * É um auxiliar de preenchimento: nunca é bloqueante. Se o chat local não
 * estiver configurado/indisponível, o PDF não for legível ou a resposta
 * não for JSON válido, devolve um estado que deixa o formulário como
 * está — o admin preenche à mão.
 *
 * Requer a variável de ambiente MLX_CHAT_URL (ver scripts/mlx-local/).
 */

export type DadosContratoExtraidos = {
  titulo: string | null;
  fornecedor: string | null;
  referencia: string | null;
  data_inicio: string | null; // AAAA-MM-DD
  data_fim: string | null; // AAAA-MM-DD
  renovacao_automatica: boolean | null;
  valor: number | null;
  notas: string | null;
};

export type ExtraccaoState = {
  dados?: DadosContratoExtraidos;
  error?: string;
  indisponivel?: boolean;
};

const TAMANHO_MAX_MB = 15;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Teto de contrato enviado ao modelo: contratos de condomínio cabem com
 * folga; evita ultrapassar a janela de contexto do Qwen3-8B.
 */
const CONTRATO_MAX_CARACTERES = 48_000;

const PROMPT =
  "Analisa este contrato e extrai as seguintes informações em JSON: " +
  "titulo, fornecedor, referencia, data_inicio, data_fim, " +
  "renovacao_automatica (boolean), valor, notas. " +
  "Se não encontrares um campo, devolve null. " +
  "As datas devem estar no formato AAAA-MM-DD. " +
  "O valor deve ser um número (sem símbolo de moeda nem separador de milhares). " +
  "Responde APENAS com o JSON, sem markdown nem explicações.";

function normalizarData(v: unknown): string | null {
  return typeof v === "string" && DATA_RE.test(v) ? v : null;
}

function texto(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t.slice(0, 2000) : null;
}

/** Aceita JSON puro ou cercado de markdown (```json … ```) do modelo. */
function extrairJson(conteudo: string): Record<string, unknown> | null {
  let t = conteudo.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const inicio = t.indexOf("{");
  const fim = t.lastIndexOf("}");
  if (inicio === -1 || fim <= inicio) return null;
  try {
    const parsed = JSON.parse(t.slice(inicio, fim + 1));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export async function extrairDadosContrato(
  formData: FormData
): Promise<ExtraccaoState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  if (!mlxChatConfigurado()) return { indisponivel: true };

  const file = formData.get("ficheiro");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um PDF do contrato." };
  }
  if (file.type !== "application/pdf") {
    return { error: "A extracção automática só lê PDFs." };
  }
  if (file.size > TAMANHO_MAX_MB * 1024 * 1024) {
    return { error: `PDF demasiado grande (máx. ${TAMANHO_MAX_MB} MB).` };
  }

  // 1) Texto do PDF, extraído localmente (unpdf). Estados explícitos,
  //    nunca lançar.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const extracao = await extrairTextoPdfLocal(bytes);
  if (extracao.estado === "falha") {
    return { error: "Não foi possível ler o PDF do contrato. Preencha à mão." };
  }
  if (extracao.estado === "sem_texto") {
    return {
      error:
        "O PDF do contrato não tem texto extraível (digitalizado?). Preencha à mão.",
    };
  }

  // 2) Enviar o TEXTO ao chat local.
  const res = await chatLocal(
    [
      {
        role: "system",
        content:
          "És um assistente que extrai dados de contratos de condomínio para uma plataforma de gestão. Responde apenas com o JSON pedido.",
      },
      {
        role: "user",
        content: `${PROMPT}\n\nCONTRATO:\n${extracao.texto.slice(0, CONTRATO_MAX_CARACTERES)}`,
      },
    ],
    { temperature: 0 }
  );

  if (!res?.content) {
    console.error("[extrair-contrato] chat local indisponível.");
    return { indisponivel: true };
  }

  const bruto = extrairJson(res.content);
  if (!bruto) {
    console.error(
      "[extrair-contrato] resposta do modelo não é JSON:",
      res.content.slice(0, 300)
    );
    return { error: "Resposta inesperada da análise. Preencha à mão." };
  }

  const valorNum =
    typeof bruto.valor === "number" && isFinite(bruto.valor) && bruto.valor >= 0
      ? bruto.valor
      : null;

  const dados: DadosContratoExtraidos = {
    titulo: texto(bruto.titulo),
    fornecedor: texto(bruto.fornecedor),
    referencia: texto(bruto.referencia),
    data_inicio: normalizarData(bruto.data_inicio),
    data_fim: normalizarData(bruto.data_fim),
    renovacao_automatica:
      typeof bruto.renovacao_automatica === "boolean"
        ? bruto.renovacao_automatica
        : null,
    valor: valorNum,
    notas: texto(bruto.notas),
  };

  return { dados };
}
