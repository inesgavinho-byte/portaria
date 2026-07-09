import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { requireAdmin } from "@/lib/supabase/tenant";
import { pesquisar } from "@/lib/pesquisa";
import { PesquisaInput } from "@/components/admin/pesquisa-input";

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
    <div className="max-w-2xl">
      <h1 className="font-title text-h1 text-ink mb-6">Pesquisa</h1>
      <PesquisaInput inicial={termo} />

      {termo.length < 2 ? (
        <p className="font-body text-sm text-oliveGray">
          Escreva pelo menos duas letras para procurar.
        </p>
      ) : grupos.length === 0 ? (
        <p className="font-body text-oliveGray">
          Nada encontrado para «{termo}».
        </p>
      ) : (
        <div className="space-y-8">
          {grupos.map((g) => (
            <section key={g.tipo}>
              <h2 className="font-body text-xs tracking-widest uppercase text-oliveGray mb-3">
                {g.tipo}
              </h2>
              <ul className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
                {g.itens.map((item, i) => (
                  <li key={i}>
                    <Link href={item.href}
                      className="group flex items-center justify-between gap-4 p-4 hover:bg-softCream/40 transition-colors">
                      <span className="font-body text-ink truncate">
                        {item.titulo}
                        {item.detalhe && (
                          <span className="text-oliveGray"> · {item.detalhe}</span>
                        )}
                      </span>
                      <ArrowRight className="w-4 h-4 text-oliveGray shrink-0 transition-transform group-hover:translate-x-1" />
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
