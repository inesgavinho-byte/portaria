import { createClient } from "@/lib/supabase/server";

/**
 * A ponte entre o arquivo de ficheiros e a camada analítica do dossiê.
 *
 * Um ficheiro carregado vive em `documentos`. Uma afirmação do histórico cita
 * uma fonte em `ia_documental_fontes`. São camadas distintas de propósito: a
 * primeira guarda o original, a segunda guarda a leitura — o que o documento
 * diz, onde o diz e que papel desempenha na afirmação.
 *
 * `garantirFonte` cria a fonte a partir do documento quando ela ainda não
 * existe — na ingestão de um documento de fornecedor, e sob demanda quando se
 * cita pela primeira vez. Nunca se duplica: um documento tem no máximo uma
 * fonte, garantido por índice único em (tenant_id, documento_id).
 *
 * Módulo de servidor puro — sem `"use server"`, para não expor uma operação
 * genérica como acção de formulário. Só server actions o importam.
 */

type SupabaseServidor = Awaited<ReturnType<typeof createClient>>;

export async function garantirFonte(
  supabase: SupabaseServidor,
  tenantId: string,
  userId: string,
  documentoId: string,
): Promise<{ fonteId?: string; error?: string }> {
  const { data: existente, error: erroExistente } = await supabase
    .from("ia_documental_fontes")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("documento_id", documentoId)
    .maybeSingle();

  if (erroExistente) return { error: "Não foi possível verificar a fonte documental." };
  if (existente) return { fonteId: existente.id };

  const { data: documento, error: erroDocumento } = await supabase
    .from("documentos")
    .select("id, titulo, categoria, data_documento, contraparte, n_mensagens, checksum, fornecedor_id")
    .eq("tenant_id", tenantId)
    .eq("id", documentoId)
    .maybeSingle();

  if (erroDocumento || !documento) return { error: "Documento não encontrado no arquivo." };

  const referencia = [
    documento.contraparte,
    documento.data_documento ? `de ${documento.data_documento}` : null,
    documento.n_mensagens ? `${documento.n_mensagens} mensagens` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const { data: criada, error: erroCriar } = await supabase
    .from("ia_documental_fontes")
    .insert({
      tenant_id: tenantId,
      titulo: documento.titulo,
      referencia: referencia || documento.categoria,
      jurisdicao: "PT",
      ativa: true,
      documento_id: documento.id,
      fornecedor_id: documento.fornecedor_id,
      data_documento: documento.data_documento,
      checksum: documento.checksum,
      criado_por: userId,
    })
    .select("id")
    .single();

  if (erroCriar || !criada) return { error: "Não foi possível criar a fonte documental." };
  return { fonteId: criada.id };
}

/**
 * Traz a fonte de um documento ao dia depois de os metadados do documento
 * mudarem. A fonte é a leitura do documento: quando o documento muda de
 * título ou de data, a leitura que dele existe não pode ficar velha — senão
 * o dossiê cita um documento pelo nome que já não tem.
 *
 * Não faz nada quando o documento ainda não tem fonte: nesse caso a ponte
 * cria-se sob demanda, já com os dados actuais.
 */
export async function sincronizarFonte(
  supabase: SupabaseServidor,
  tenantId: string,
  documentoId: string,
  mudancas: { titulo: string; data_documento: string | null; contraparte: string | null; n_mensagens: number | null },
): Promise<void> {
  const { data: existente, error: erroExistente } = await supabase
    .from("ia_documental_fontes")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("documento_id", documentoId)
    .maybeSingle();

  if (erroExistente || !existente) return;

  const referencia = [
    mudancas.contraparte,
    mudancas.data_documento ? `de ${mudancas.data_documento}` : null,
    mudancas.n_mensagens ? `${mudancas.n_mensagens} mensagens` : null,
  ]
    .filter(Boolean)
    .join(", ");

  await supabase
    .from("ia_documental_fontes")
    .update({
      titulo: mudancas.titulo,
      referencia: referencia || null,
      data_documento: mudancas.data_documento,
    })
    .eq("id", existente.id);
}
