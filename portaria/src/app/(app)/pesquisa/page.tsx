import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { requireAdmin } from "@/lib/supabase/tenant";
import { pesquisar } from "@/lib/pesquisa";

export default async function PesquisaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");

  const termo = (q ?? "").trim();
  const grupos = termo.length >= 2 ? await pesquisar(ctx.tenant.id, termo) : [];

  return (
    <div className="max-w-3xl">
      <div className="mb-7">
        <p className="mb-1 font-body text-xs font-semibold uppercase tracking-[0.14em] text-britishGreen">Pesquisa global</p>
        <h1 className="font-title text-h1 text-ink">{termo ? `Resultados para “${termo}”` : "Resultados"}</h1>
      </div>

      {termo.length < 2 ? (
        <div className="portaria-panel p-5 font-body text-sm text-oliveGray">Escreva pelo menos duas letras na barra de pesquisa no topo.</div>
      ) : grupos.length === 0 ? (
        <div className="portaria-panel p-5 font-body text-sm text-oliveGray">Não foram encontrados resultados para “{termo}”.</div>
      ) : (
        <div className="space-y-6">
          {grupos.map((grupo) => (
            <section key={grupo.tipo} className="portaria-panel overflow-hidden">
              <div className="border-b border-britishGreen/10 px-5 py-3">
                <h2 className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-oliveGray">{grupo.tipo}</h2>
              </div>
              <ul className="divide-y divide-britishGreen/10">
                {grupo.itens.map((item, indice) => (
                  <li key={indice}>
                    <Link href={item.href} className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-white/70">
                      <span className="min-w-0 truncate font-body text-sm font-medium text-ink">
                        {item.titulo}
                        {item.detalhe && <span className="font-normal text-oliveGray"> · {item.detalhe}</span>}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-oliveGray transition-transform group-hover:translate-x-1 group-hover:text-britishGreen" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
