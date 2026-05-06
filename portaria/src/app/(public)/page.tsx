import { getCurrentTenant } from "@/lib/supabase/tenant";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function HomePage() {
  const tenant = await getCurrentTenant();

  if (!tenant) {
    notFound();
  }

  return (
    <>
      {/* Hero */}
      <section className="border-b border-warmBeige/20">
        <div className="container-page py-24 md:py-32">
          <p className="font-body text-sm tracking-widest uppercase text-oliveGray mb-6">
            Plataforma do
          </p>
          <h1 className="font-title text-display text-ink mb-6">
            {tenant.nome}
          </h1>
          {tenant.morada && (
            <p className="font-body text-lg text-oliveGray max-w-2xl">
              {tenant.morada}
            </p>
          )}
        </div>
      </section>

      {/* Caracterização */}
      <section className="bg-softCream/40">
        <div className="container-page py-20">
          <div className="grid md:grid-cols-3 gap-12">
            {tenant.num_fracoes && (
              <div>
                <p className="font-title text-h1 text-warmBeige mb-2">
                  {tenant.num_fracoes}
                </p>
                <p className="font-body text-sm tracking-widest uppercase text-oliveGray">
                  Fracções
                </p>
              </div>
            )}
            {tenant.ano_construcao && (
              <div>
                <p className="font-title text-h1 text-warmBeige mb-2">
                  {tenant.ano_construcao}
                </p>
                <p className="font-body text-sm tracking-widest uppercase text-oliveGray">
                  Ano de construção
                </p>
              </div>
            )}
            <div>
              <p className="font-title text-h1 text-warmBeige mb-2">
                Miraflores
              </p>
              <p className="font-body text-sm tracking-widest uppercase text-oliveGray">
                Localização
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA condóminos */}
      <section>
        <div className="container-prose py-24 text-center">
          <h2 className="font-title text-h2 text-ink mb-6">
            Área reservada a condóminos
          </h2>
          <p className="font-body text-oliveGray mb-10 max-w-xl mx-auto">
            Aceda ao mural de avisos, repositório de documentos, atas das
            assembleias e demais informação reservada do condomínio.
          </p>
          <Link
            href="/login"
            className="inline-block px-8 py-3 bg-warmBeige text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors"
          >
            Entrar
          </Link>
        </div>
      </section>
    </>
  );
}
