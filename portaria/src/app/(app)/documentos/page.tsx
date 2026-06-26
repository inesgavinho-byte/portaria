import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/supabase/tenant";
import { DownloadButton } from "@/components/app/download-button";
import type { Documento } from "@/types/database";

const CATEGORIA_LABEL: Record<Documento["categoria"], string> = {
  ata: "Atas",
  conta: "Contas e Orçamentos",
  contrato: "Contratos",
  regulamento: "Regulamento",
  obra: "Obras",
  seguro: "Seguros",
  apolice: "Apólices",
  manual: "Manuais",
  outro: "Outros",
};

export default async function DocumentosPage() {
  const supabase = await createClient();
  const tenant = await getCurrentTenant();

  const { data: documentos } = await supabase
    .from("documentos")
    .select("*")
    .eq("tenant_id", tenant!.id)
    .order("ano", { ascending: false, nullsFirst: false })
    .order("upload_em", { ascending: false });

  // Agrupar por categoria
  const docs: Documento[] = documentos ?? [];
  const porCategoria = docs.reduce<Record<string, Documento[]>>((acc, doc) => {
    (acc[doc.categoria] ||= []).push(doc);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-12">
        <h1 className="font-title text-h1 text-ink mb-2">Documentos</h1>
        <p className="font-body text-oliveGray">
          Atas, contas, contratos e demais documentação do condomínio.
        </p>
      </div>

      {Object.keys(porCategoria).length === 0 ? (
        <div className="bg-paper border border-warmBeige/20 p-12 text-center">
          <p className="font-body text-oliveGray">
            Não existem documentos disponíveis de momento.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {(Object.keys(CATEGORIA_LABEL) as Documento["categoria"][]).map(
            (categoria) => {
              const docs = porCategoria[categoria];
              if (!docs?.length) return null;
              return (
                <section key={categoria}>
                  <h2 className="font-title text-h3 text-warmBeige mb-4">
                    {CATEGORIA_LABEL[categoria]}
                  </h2>
                  <ul className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
                    {docs.map((doc) => (
                      <DocumentoLinha key={doc.id} doc={doc} />
                    ))}
                  </ul>
                </section>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

function DocumentoLinha({ doc }: { doc: Documento }) {
  return (
    <li className="flex items-center justify-between p-4 hover:bg-softCream/40 transition-colors">
      <div>
        <p className="font-body text-ink">{doc.titulo}</p>
        {doc.descricao && (
          <p className="font-body text-sm text-oliveGray mt-1">{doc.descricao}</p>
        )}
      </div>
      <div className="flex items-center gap-6 text-xs font-body text-oliveGray">
        {doc.ano && <span>{doc.ano}</span>}
        <DownloadButton documentoId={doc.id} />
      </div>
    </li>
  );
}
