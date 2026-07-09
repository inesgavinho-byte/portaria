import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { DownloadButton } from "@/components/app/download-button";
import { DocumentosFiltro } from "@/components/app/documentos-filtro";
import { CATEGORIA_LABEL, CATEGORIAS } from "@/lib/documentos";
import type { Documento } from "@/types/database";

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>;
}) {
  const { q, cat } = await searchParams;
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  const catValida = CATEGORIAS.includes(cat as (typeof CATEGORIAS)[number])
    ? (cat as Documento["categoria"])
    : null;
  const termo = (q ?? "").trim();

  const supabase = await createClient();
  let query = supabase
    .from("documentos")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .order("ano", { ascending: false, nullsFirst: false })
    .order("upload_em", { ascending: false });
  if (catValida) query = query.eq("categoria", catValida);
  if (termo) query = query.or(`titulo.ilike.%${termo}%,descricao.ilike.%${termo}%`);

  const { data: documentos } = await query;
  const docs: Documento[] = documentos ?? [];
  const filtrando = !!termo || !!catValida;

  // Sem filtro: agrupar por categoria. Com filtro: lista plana (resultados).
  const porCategoria = docs.reduce<Record<string, Documento[]>>((acc, doc) => {
    (acc[doc.categoria] ||= []).push(doc);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-title text-h1 text-ink mb-2">Documentos</h1>
        <p className="font-body text-oliveGray">
          Atas, contas, contratos e demais documentação do condomínio.
        </p>
      </div>

      <DocumentosFiltro />

      {docs.length === 0 ? (
        <div className="bg-paper border border-warmBeige/20 p-12 text-center">
          <p className="font-body text-oliveGray">
            {filtrando
              ? "Nenhum documento corresponde à pesquisa."
              : "Não existem documentos disponíveis de momento."}
          </p>
        </div>
      ) : filtrando ? (
        <ul className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
          {docs.map((doc) => (
            <DocumentoLinha key={doc.id} doc={doc} comCategoria />
          ))}
        </ul>
      ) : (
        <div className="space-y-12">
          {CATEGORIAS.map((categoria) => {
            const lista = porCategoria[categoria];
            if (!lista?.length) return null;
            return (
              <section key={categoria}>
                <h2 className="font-title text-h3 text-warmBeige mb-4">
                  {CATEGORIA_LABEL[categoria]}
                </h2>
                <ul className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
                  {lista.map((doc) => (
                    <DocumentoLinha key={doc.id} doc={doc} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DocumentoLinha({
  doc,
  comCategoria = false,
}: {
  doc: Documento;
  comCategoria?: boolean;
}) {
  return (
    <li className="flex items-center justify-between p-4 hover:bg-softCream/40 transition-colors">
      <div>
        <p className="font-body text-ink">{doc.titulo}</p>
        {comCategoria && (
          <p className="font-body text-xs text-oliveGray mt-1">
            {CATEGORIA_LABEL[doc.categoria]}
          </p>
        )}
        {doc.descricao && (
          <p className="font-body text-sm text-oliveGray mt-1">{doc.descricao}</p>
        )}
      </div>
      <div className="flex items-center gap-6 text-xs font-body text-oliveGray shrink-0">
        {doc.ano && <span>{doc.ano}</span>}
        <DownloadButton documentoId={doc.id} />
      </div>
    </li>
  );
}
