import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import type { Documento } from "@/types/database";
import { DocumentoActions } from "@/components/admin/documento-actions";

const CATEGORIA_LABEL: Record<Documento["categoria"], string> = {
  ata: "Ata",
  conta: "Contas",
  contrato: "Contrato",
  regulamento: "Regulamento",
  manual: "Manual",
  apolice: "Apólice",
  outro: "Outro",
};

export default async function ConfigDocumentosPage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: documentos } = await supabase
    .from("documentos")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .order("upload_em", { ascending: false });

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-title text-h1 text-ink mb-2">Gestão de documentos</h1>
          <p className="font-body text-oliveGray">
            Atas, contas, contratos e demais documentação do condomínio.
          </p>
        </div>
        <Link
          href="/configuracao/documentos/novo"
          className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors"
        >
          <Plus className="w-4 h-4" />
          Carregar documento
        </Link>
      </div>

      {(!documentos || documentos.length === 0) ? (
        <div className="bg-paper border border-warmBeige/20 p-12 text-center">
          <p className="font-body text-oliveGray mb-4">
            Ainda não existem documentos carregados.
          </p>
          <Link
            href="/configuracao/documentos/novo"
            className="font-body text-sm text-warmBeige hover:text-oliveGray transition-colors tracking-widest uppercase"
          >
            Carregar o primeiro
          </Link>
        </div>
      ) : (
        <div className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
          {documentos.map((doc: Documento) => (
            <div key={doc.id} className="p-4 flex items-start gap-4">
              <FileText className="w-5 h-5 text-warmBeige shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h2 className="font-title text-lg text-ink truncate">
                  {doc.titulo}
                </h2>
                <div className="flex items-center gap-3 font-body text-xs text-oliveGray mt-1">
                  <span>{CATEGORIA_LABEL[doc.categoria]}</span>
                  {doc.ano && <span>· {doc.ano}</span>}
                  {doc.ficheiro_tamanho && (
                    <span>· {(doc.ficheiro_tamanho / 1024 / 1024).toFixed(1)} MB</span>
                  )}
                </div>
                {doc.descricao && (
                  <p className="font-body text-sm text-oliveGray mt-2">
                    {doc.descricao}
                  </p>
                )}
              </div>
              <DocumentoActions documentoId={doc.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
