import { CloudDownload } from "lucide-react";
import { ImportarDriveAdministracaoForm } from "@/components/admin/importar-drive-administracao-form";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";

export default async function ImportarDrivePage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return null;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-7 flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-britishGreen text-white shadow-float">
          <CloudDownload className="h-5 w-5" />
        </div>
        <div>
          <p className="mb-1 font-body text-xs font-semibold uppercase tracking-[0.14em] text-britishGreen">Migração de arquivo</p>
          <h1 className="mb-2 font-title text-h1 text-ink">Importar originais do Google Drive</h1>
          <p className="max-w-2xl font-body text-sm leading-6 text-oliveGray">Transfere documentos históricos para o arquivo privado do condomínio. O Google Drive fica apenas registado como proveniência e deixa de ser necessário para a consulta diária.</p>
        </div>
      </div>
      <div className="portaria-panel p-5 md:p-7">
        <ImportarDriveAdministracaoForm />
      </div>
    </div>
  );
}
