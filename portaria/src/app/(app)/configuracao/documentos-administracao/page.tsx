import Link from "next/link";
import { CloudDownload, LockKeyhole, Plus, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { MigrarQuotasHistorico } from "@/components/admin/migrar-quotas-historico";
import { BibliotecaDocumentosAdministracao } from "@/components/admin/biblioteca-documentos-administracao";
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
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-ink">
            <LockKeyhole className="h-5 w-5" />
            <span className="font-body text-xs uppercase tracking-widest">Acesso exclusivo da administração</span>
          </div>
          <h1 className="mb-2 font-title text-h1 text-ink">Arquivo confidencial</h1>
          <p className="max-w-2xl font-body text-oliveGray">
            Biblioteca administrativa organizada por temas e tipos. Consulte os documentos dentro da plataforma e mantenha a descarga apenas quando for necessária.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
          <Link href="/configuracao/documentos-administracao/importar-drive" className="inline-flex items-center gap-2 border border-ink px-5 py-3 font-body text-sm uppercase tracking-widest text-ink transition-colors hover:bg-ink/5">
            <CloudDownload className="h-4 w-4" />Importar do Drive
          </Link>
          <Link href="/configuracao/documentos-administracao/lote" className="inline-flex items-center gap-2 border border-ink px-5 py-3 font-body text-sm uppercase tracking-widest text-ink transition-colors hover:bg-ink/5">
            <Upload className="h-4 w-4" />Carregar em lote
          </Link>
          <Link href="/configuracao/documentos-administracao/novo" className="inline-flex items-center gap-2 bg-ink px-5 py-3 font-body text-sm uppercase tracking-widest text-paper transition-colors hover:bg-oliveGray">
            <Plus className="h-4 w-4" />Carregar
          </Link>
        </div>
      </div>

      <MigrarQuotasHistorico tenantId={ctx.tenant.id} />
      <BibliotecaDocumentosAdministracao documentos={documentos} />
    </div>
  );
}
