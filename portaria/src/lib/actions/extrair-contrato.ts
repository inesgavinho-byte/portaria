"use server";

import { requireAdmin } from "@/lib/supabase/tenant";

/**
 * Extracção automática de dados de um contrato em PDF, via OpenAI (gpt-4o).
 *
 * É um auxiliar de preenchimento: nunca é bloqueante. Se a chave não
 * estiver configurada, o PDF não for legível ou a API falhar, devolve um
 * estado que deixa o formulário como está — o admin preenche à mão.
 *
 * Requer a variável de ambiente OPENAI_API_KEY (definida na Netlify).
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

const PROMPT =
  "Analisa este contrato e extrai as seguintes informações em JSON: " +
  "titulo, fornecedor, referencia, data_inicio, data_fim, " +
  "renovacao_automatica (boolean), valor, notas. " +
  "Se não encontrares um campo, devolve null. " +
  "As datas devem estar no formato AAAA-MM-DD. " +
  "O valor deve ser um número (sem símbolo de moeda nem separador de milhares).";

const JSON_SCHEMA = {
  name: "dados_contrato",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      titulo: { type: ["string", "null"] },
      fornecedor: { type: ["string", "null"] },
      referencia: { type: ["string", "null"] },
      data_inicio: { type: ["string", "null"] },
      data_fim: { type: ["string", "null"] },
      renovacao_automatica: { type: ["boolean", "null"] },
      valor: { type: ["number", "null"] },
      notas: { type: ["string", "null"] },
    },
    required: [
      "titulo",
      "fornecedor",
      "referencia",
      "data_inicio",
      "data_fim",
      "renovacao_automatica",
      "valor",
      "notas",
    ],
  },
};

function normalizarData(v: unknown): string | null {
  return typeof v === "string" && DATA_RE.test(v) ? v : null;
}

function texto(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t.slice(0, 2000) : null;
}

export async function extrairDadosContrato(
  formData: FormData
): Promise<ExtraccaoState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { indisponivel: true };

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

  let conteudo: string;
  try {
    const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "És um assistente que extrai dados de contratos de condomínio para uma plataforma de gestão. Responde apenas com o JSON pedido.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              {
                type: "file",
                file: {
                  filename: "contrato.pdf",
                  file_data: `data:application/pdf;base64,${b64}`,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_schema", json_schema: JSON_SCHEMA },
      }),
    });

    if (!res.ok) {
      const corpo = await res.text().catch(() => "");
      console.error("OpenAI extracção falhou:", res.status, corpo.slice(0, 500));
      return { error: "Não foi possível analisar o contrato. Preencha à mão." };
    }

    const json = await res.json();
    conteudo = json?.choices?.[0]?.message?.content ?? "";
  } catch (err) {
    console.error("Erro a contactar a OpenAI:", err);
    return { error: "Não foi possível analisar o contrato. Preencha à mão." };
  }

  let bruto: Record<string, unknown>;
  try {
    bruto = JSON.parse(conteudo);
  } catch {
    console.error("Resposta da OpenAI não é JSON:", conteudo.slice(0, 300));
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
