import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Pencil, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { DownloadButton } from "@/components/app/download-button";
import { ContratoMemoria } from "@/components/admin/contrato-memoria";
import { DocumentoUploadInline } from "@/components/admin/documento-upload-inline";
import type { Contrato, ContratoMemoriaEvento, Documento } from "@/types/database";

function euros(v: number | null): string | null {
  if (v == null) return null;
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);
}

export default async function ContratoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");

  const supabase = await createClient();
  const { data: contrato } = await supabase
    .from("contratos").select("*").eq("id", id).eq("tenant_id", ctx.tenant.id).single();
  if (!contrato) notFound();
  const c = contrato as Contrato;

  const [{ data: fornecedor }, { data: documentos }, { data: memoria }] = await Promise.all([
    c.fornecedor_id
      ? supabase.from("fornecedores").select("id, nome").eq("id", c.fornecedor_id).single()
      : Promise.resolve({ data: null }),
    supabase.from("documentos").select("*").eq("tenant_id", ctx.tenant.id).eq("contrato_id", id).order("upload_em", { ascending: false }),
    supabase
      .from("contrato_memoria_eventos")
      .select("id,data_evento,tipo,titulo,resumo,natureza,criado_em,contrato_memoria_evidencias(id,localizador,citacao,papel,ia_documental_fontes(id,titulo,referencia,url))")
      .eq("tenant_id", ctx.tenant.id)
      .eq("contrato_id", id)
      .order("data_evento", { ascending: true })
      .order("criado_em", { ascending: true }),
  ]);
  const docs = (documentos ?? []) as Documento[];
  const eventos = (memoria ?? []) as ContratoMemoriaEvento[];

  const linhas = [
    ["Referência", c.referencia],
    ["Fornecedor", fornecedor?.nome ?? null],
    ["Início", c.data_inicio ? new Date(c.data_inicio).toLocaleDateString("pt-PT") : null],
    ["Fim / renovação", c.data_fim ? new Date(c.data_fim).toLocaleDateString("pt-PT") : null],
    ["Valor", euros(c.valor)],
    ["Valor anual", euros(c.valor_anual)],
    ["Renovação automática", c.renovacao_automatica ? "Sim" : null],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <div className="max-w-3xl">
      <Link href="/contratos"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-6 transition-colors">
        <ChevronLeft className="w-3 h-3" /> Contratos
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="font-title text-h1 text-ink">{c.titulo}</h1>
        <Link href={`/contratos/${id}/editar`}
          className="inline-flex items-center gap-2 px-5 py-2 border border-warmBeige/40 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink hover:border-warmBeige transition-colors shrink-0">
          <Pencil className="w-3.5 h-3.5" /> Editar
        </Link>
      </div>

      {linhas.length > 0 && (
        <dl className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10 mb-6">
          {linhas.map(([k, v]) => (
            <div key={k} className="flex gap-4 p-4">
              <dt className="w-40 shrink-0 font-body text-xs tracking-widest uppercase text-oliveGray">{k}</dt>
              <dd className="font-body text-ink">
                {k === "Fornecedor" && fornecedor ? (
                  <Link href={`/fornecedores/${fornecedor.id}`} className="text-warmBeige hover:text-oliveGray">{v}</Link>
                ) : v}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {c.descricao && (
        <p className="font-body text-ink whitespace-pre-line mb-6">{c.descricao}</p>
      )}
      {c.notas_internas && (
        <div className="border-l-4 border-warmBeige/40 bg-softCream/40 px-4 py-3 mb-10">
          <p className="font-body text-xs tracking-widest uppercase text-oliveGray mb-1">Notas internas</p>
          <p className="font-body text-sm text-ink whitespace-pre-line">{c.notas_internas}</p>
        </div>
      )}

      <ContratoMemoria eventos={eventos} />

      <section className="mt-10">
        <h2 className="font-title text-h3 text-warmBeige mb-4">Documentos</h2>
        {docs.length > 0 && (
          <ul className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10 mb-6">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-4 p-4">
                <span className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-warmBeige shrink-0" />
                  <span className="font-body text-ink truncate">{d.titulo}</span>
                </span>
                <DownloadButton documentoId={d.id} />
              </li>
            ))}
          </ul>
        )}
        <div className="border border-warmBeige/20 bg-softCream/30 p-5">
          <p className="font-body text-xs tracking-widest uppercase text-oliveGray mb-3">
            Anexar o PDF do contrato
          </p>
          <DocumentoUploadInline
            contratoId={id}
            redirectTo={`/contratos/${id}`}
            categoriaDefault="contrato"
          />
          <p className="mt-3 font-body text-xs text-oliveGray">
            O documento aparece também na biblioteca de Documentos.
          </p>
        </div>
      </section>
    </div>
  );
}
