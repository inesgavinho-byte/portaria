import Link from "next/link";
import { LockKeyhole, Plus, FileText, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { CATEGORIA_LABEL } from "@/lib/documentos";
import { DocumentoAdministracaoDownload } from "@/components/admin/documento-administracao-download";
import { MigrarQuotasHistorico } from "@/components/admin/migrar-quotas-historico";
import type { DocumentoAdministracao } from "@/types/database";

export default async function DocumentosAdministracaoPage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("documentos_administracao")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .order("upload_em", { ascending: false });
  const documentos = (data ?? []) as DocumentoAdministracao[];

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-ink">
            <LockKeyhole className="h-5 w-5" />
            <span className="font-body text-xs uppercase tracking-widest">Acesso exclusivo da administração</span>
          </div>
          <h1 className="mb-2 font-title text-h1 text-ink">Arquivo confidencial</h1>
          <p className="font-body text-oliveGray">
            Folhas de reconciliação, comprovativos, transição de pastas e outros documentos de trabalho que não são publicados aos condóminos.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <Link href="/configuracao/documentos-administracao/lote"
            className="inline-flex items-center gap-2 border border-ink px-5 py-3 font-body text-sm uppercase tracking-widest text-ink transition-colors hover:bg-ink/5">
            <Upload className="h-4 w-4" />Carregar em lote
          </Link>
          <Link href="/configuracao/documentos-administracao/novo"
            className="inline-flex items-center gap-2 bg-ink px-5 py-3 font-body text-sm uppercase tracking-widest text-paper transition-colors hover:bg-oliveGray">
            <Plus className="h-4 w-4" />Carregar
          </Link>
        </div>
      </div>

      <MigrarQuotasHistorico tenantId={ctx.tenant.id} />

      {documentos.length === 0 ? (
        <div className="border border-warmBeige/20 bg-paper p-12 text-center">
          <LockKeyhole className="mx-auto mb-3 h-7 w-7 text-warmBeige" />
          <p className="font-body text-oliveGray">Ainda não existem documentos confidenciais.</p>
        </div>
      ) : (
        <div className="divide-y divide-warmBeige/10 border border-warmBeige/20 bg-paper">
          {documentos.map((documento) => (
            <div key={documento.id} className="flex items-start gap-4 p-4">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-warmBeige" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-title text-lg text-ink">{documento.titulo}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-3 font-body text-xs text-oliveGray">
                  <span>{CATEGORIA_LABEL[documento.categoria]}</span>
                  {documento.ano && <span>· {documento.ano}</span>}
                  {documento.ficheiro_tamanho && <span>· {(documento.ficheiro_tamanho / 1024 / 1024).toFixed(1)} MB</span>}
                </div>
                {documento.descricao && <p className="mt-2 font-body text-sm text-oliveGray">{documento.descricao}</p>}
              </div>
              <DocumentoAdministracaoDownload documentoId={documento.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
