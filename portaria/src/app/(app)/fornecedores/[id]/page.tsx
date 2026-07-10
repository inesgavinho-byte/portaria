import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Pencil, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { DownloadButton } from "@/components/app/download-button";
import { DocumentoUploadInline } from "@/components/admin/documento-upload-inline";
import { FornecedorArquivar } from "@/components/admin/fornecedor-arquivar";
import type { Contrato, Documento, Fornecedor } from "@/types/database";

export default async function FornecedorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");

  const supabase = await createClient();
  const [{ data: fornecedor }, { data: documentos }, { data: contratos }] =
    await Promise.all([
      supabase.from("fornecedores").select("*").eq("id", id).eq("tenant_id", ctx.tenant.id).single(),
      supabase.from("documentos").select("*").eq("tenant_id", ctx.tenant.id).eq("fornecedor_id", id).order("upload_em", { ascending: false }),
      supabase.from("contratos").select("*").eq("tenant_id", ctx.tenant.id).eq("fornecedor_id", id).order("criado_em", { ascending: false }),
    ]);

  if (!fornecedor) notFound();
  const f = fornecedor as Fornecedor;
  const docs = (documentos ?? []) as Documento[];
  const cts = (contratos ?? []) as Contrato[];

  const linhas = [
    ["Categoria", f.categoria],
    ["Responsável", f.contacto_nome],
    ["Telefone", f.telefone],
    ["Email", f.email],
    ["NIF", f.nif],
    ["Morada", f.morada],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <div className="max-w-3xl">
      <Link href="/fornecedores"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-6 transition-colors">
        <ChevronLeft className="w-3 h-3" /> Fornecedores
      </Link>

      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="font-title text-h1 text-ink">{f.nome}</h1>
        {!f.ativo && (
          <span className="font-body text-xs tracking-widest uppercase text-alert">Arquivado</span>
        )}
      </div>

      <div className="flex items-center gap-3 mb-8">
        <Link href={`/fornecedores/${id}/editar`}
          className="inline-flex items-center gap-2 px-5 py-2 border border-warmBeige/40 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink hover:border-warmBeige transition-colors">
          <Pencil className="w-3.5 h-3.5" /> Editar
        </Link>
        <FornecedorArquivar fornecedorId={id} ativo={f.ativo} />
      </div>

      {linhas.length > 0 && (
        <dl className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10 mb-6">
          {linhas.map(([k, v]) => (
            <div key={k} className="flex gap-4 p-4">
              <dt className="w-32 shrink-0 font-body text-xs tracking-widest uppercase text-oliveGray">{k}</dt>
              <dd className="font-body text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {f.notas && (
        <p className="font-body text-sm text-oliveGray whitespace-pre-line mb-10">{f.notas}</p>
      )}

      {/* Contratos associados */}
      <section className="mb-10">
        <h2 className="font-title text-h3 text-warmBeige mb-4">Contratos</h2>
        {cts.length === 0 ? (
          <p className="font-body text-sm text-oliveGray">Sem contratos associados.</p>
        ) : (
          <div className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
            {cts.map((c) => (
              <Link key={c.id} href={`/contratos/${c.id}`}
                className="block p-4 hover:bg-softCream/40 transition-colors">
                <p className="font-body text-ink">{c.titulo}</p>
                {c.data_fim && (
                  <p className="font-body text-xs text-oliveGray mt-1">
                    até {new Date(c.data_fim).toLocaleDateString("pt-PT")}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Documentos anexos */}
      <section>
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
            Anexar documento (alvará, certidão, seguro…)
          </p>
          <DocumentoUploadInline
            fornecedorId={id}
            redirectTo={`/fornecedores/${id}`}
            categoriaDefault="regulamento"
          />
        </div>
      </section>
    </div>
  );
}
