import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DocumentoForm } from "@/components/admin/documento-form";

export default function NovoDocumentoPage() {
  return (
    <div>
      <Link
        href="/configuracao/documentos"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-4 transition-colors"
      >
        <ChevronLeft className="w-3 h-3" />
        Voltar
      </Link>
      <h1 className="font-title text-h1 text-ink mb-2">Carregar documento</h1>
      <p className="font-body text-oliveGray mb-8">
        Adicione um novo documento ao repositório do condomínio.
      </p>
      <DocumentoForm />
    </div>
  );
}
