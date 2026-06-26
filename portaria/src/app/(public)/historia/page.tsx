import { getCurrentTenant } from "@/lib/supabase/tenant";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "História",
};

export default async function HistoriaPage() {
  const tenant = await getCurrentTenant();

  if (!tenant) {
    notFound();
  }

  return (
    <>
      <section className="border-b border-warmBeige/20">
        <div className="container-prose py-20 md:py-28">
          <p className="font-body text-sm tracking-widest uppercase text-oliveGray mb-6">
            Sobre o edifício
          </p>
          <h1 className="font-title text-display text-ink mb-6">História</h1>
          {tenant.morada && (
            <p className="font-body text-lg text-oliveGray">{tenant.morada}</p>
          )}
        </div>
      </section>

      <section>
        <div className="container-prose py-16">
          <div className="prose prose-lg max-w-none font-body text-ink prose-headings:font-title">
            <p>
              O <strong>{tenant.nome}</strong>
              {tenant.ano_construcao
                ? `, construído em ${tenant.ano_construcao},`
                : ""}{" "}
              {tenant.num_fracoes
                ? `reúne ${tenant.num_fracoes} fracções`
                : "reúne os seus condóminos"}{" "}
              numa comunidade que partilha espaços, responsabilidades e um
              compromisso com a boa conservação do património comum.
            </p>
            <p className="font-body text-sm text-oliveGray italic">
              Esta página é um ponto de partida. O texto sobre a história do
              edifício pode ser personalizado pela administração.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
