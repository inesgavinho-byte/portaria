import { CloudDownload } from "lucide-react";
import { ImportarDriveAdministracaoForm } from "@/components/admin/importar-drive-administracao-form";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";

export default async function ImportarDrivePage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) return null;

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-ink">
          <CloudDownload className="h-5 w-5" />
          <span className="font-body text-xs uppercase tracking-widest">Migração de arquivo</span>
        </div>
        <h1 className="mb-2 font-title text-h1 text-ink">Importar originais do Google Drive</h1>
        <p className="font-body text-oliveGray">Copia documentos históricos para o arquivo privado do condomínio, preservando o link original apenas como proveniência.</p>
      </div>
      <ImportarDriveAdministracaoForm />
    </div>
  );
}
