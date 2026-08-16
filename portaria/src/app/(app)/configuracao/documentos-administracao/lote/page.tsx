import { LockKeyhole } from "lucide-react";
import { DocumentoAdministracaoLoteForm } from "@/components/admin/documento-administracao-lote-form";

export default function DocumentosAdministracaoLotePage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-ink">
          <LockKeyhole className="h-5 w-5" />
          <span className="font-body text-xs uppercase tracking-widest">Acesso exclusivo da administração</span>
        </div>
        <h1 className="mb-2 font-title text-h1 text-ink">Carregar arquivo confidencial em lote</h1>
        <p className="font-body text-oliveGray">
          Selecione vários documentos administrativos para os guardar no arquivo privado do condomínio.
        </p>
      </div>

      <DocumentoAdministracaoLoteForm />
    </div>
  );
}
