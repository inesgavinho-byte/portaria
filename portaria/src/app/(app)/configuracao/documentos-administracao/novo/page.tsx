import { DocumentoAdministracaoForm } from "@/components/admin/documento-administracao-form";

export default function NovoDocumentoAdministracaoPage() {
  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 font-body text-xs uppercase tracking-widest text-oliveGray">Arquivo confidencial</p>
        <h1 className="mb-2 font-title text-h1 text-ink">Carregar documento administrativo</h1>
        <p className="font-body text-oliveGray">Este ficheiro não será disponibilizado na biblioteca geral do condomínio.</p>
      </div>
      <DocumentoAdministracaoForm />
    </div>
  );
}
