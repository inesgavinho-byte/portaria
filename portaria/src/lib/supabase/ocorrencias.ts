import { createClient } from "@/lib/supabase/server";
import type {
  Ocorrencia,
  OcorrenciaEvento,
  OcorrenciaFotografia,
} from "@/types/database";
import type { FotografiaComUrl } from "@/components/app/ocorrencia-detalhe";

/**
 * Carrega o detalhe completo de uma ocorrência: registo, timeline e
 * fotografias com URLs assinados (1 hora). A RLS garante o âmbito:
 * o criador vê a sua ocorrência (sem notas internas); o admin vê tudo.
 *
 * USAR APENAS EM SERVER COMPONENTS / SERVER ACTIONS.
 */
export async function getOcorrenciaDetalhe(
  id: string,
  tenantId: string
): Promise<{
  ocorrencia: Ocorrencia;
  eventos: OcorrenciaEvento[];
  fotografias: FotografiaComUrl[];
} | null> {
  const supabase = await createClient();

  const { data: ocorrencia } = await supabase
    .from("ocorrencias")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (!ocorrencia) return null;

  const [{ data: eventos }, { data: fotos }] = await Promise.all([
    supabase
      .from("ocorrencia_eventos")
      .select("*")
      .eq("ocorrencia_id", id)
      .order("criado_em", { ascending: true }),
    supabase
      .from("ocorrencia_fotografias")
      .select("*")
      .eq("ocorrencia_id", id)
      .order("criado_em", { ascending: true }),
  ]);

  let fotografias: FotografiaComUrl[] = [];
  const listaFotos = (fotos ?? []) as OcorrenciaFotografia[];
  if (listaFotos.length > 0) {
    const { data: assinados } = await supabase.storage
      .from("ocorrencias")
      .createSignedUrls(
        listaFotos.map((f) => f.ficheiro_path),
        3600
      );

    fotografias = listaFotos.flatMap((foto, i) => {
      const url = assinados?.[i]?.signedUrl;
      return url ? [{ id: foto.id, url }] : [];
    });
  }

  return {
    ocorrencia: ocorrencia as Ocorrencia,
    eventos: (eventos ?? []) as OcorrenciaEvento[],
    fotografias,
  };
}
