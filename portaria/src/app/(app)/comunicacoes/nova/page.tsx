import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { ComunicacaoForm } from "@/components/admin/comunicacao-form";

export default async function NovaComunicacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ fracao?: string }>;
}) {
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");
  const { fracao: fracaoParam } = await searchParams;

  // A ficha do condómino chega aqui com ?fracao=id1,id2 — pré-seleciona
  // essas frações em vez de partir com todas marcadas.
  const preSelecionadas = fracaoParam
    ? fracaoParam.split(",").map((fid) => fid.trim()).filter(Boolean)
    : undefined;

  const supabase = await createClient();
  const [{ data: fracoes }, { data: documentos }, { data: confidenciais }] = await Promise.all([
    supabase.from("fracoes")
      .select("id, codigo, proprietario_nome, inquilino_nome")
      .eq("tenant_id", ctx.tenant.id)
      .order("codigo"),
    supabase.from("documentos")
      .select("id, titulo")
      .eq("tenant_id", ctx.tenant.id)
      .order("upload_em", { ascending: false }),
    supabase.from("documentos_administracao")
      .select("id, titulo")
      .eq("tenant_id", ctx.tenant.id)
      .order("upload_em", { ascending: false }),
  ]);

  const opcoesDocumento = [
    ...(documentos ?? []).map((documento) => ({ ...documento, origem: "publicado" as const })),
    ...(confidenciais ?? []).map((documento) => ({ ...documento, origem: "confidencial" as const })),
  ].sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-PT"));

  return (
    <div>
      <div className="mb-8">
        <p className="font-body text-xs tracking-[0.18em] uppercase text-warmBeige mb-2">Comunicações</p>
        <h1 className="font-title text-h1 text-ink mb-2">Nova comunicação</h1>
        <p className="font-body text-oliveGray max-w-2xl">
          Registe o envio, selecione as frações e associe o documento correspondente. O sistema não envia mensagens automaticamente nesta fase.
        </p>
      </div>
      <ComunicacaoForm fracoes={fracoes ?? []} documentos={opcoesDocumento} preSelecionadas={preSelecionadas} />
    </div>
  );
}
