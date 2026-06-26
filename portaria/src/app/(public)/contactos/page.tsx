import { getCurrentTenant } from "@/lib/supabase/tenant";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contactos",
};

export default async function ContactosPage() {
  const tenant = await getCurrentTenant();

  if (!tenant) {
    notFound();
  }

  return (
    <>
      <section className="border-b border-warmBeige/20">
        <div className="container-prose py-20 md:py-28">
          <p className="font-body text-sm tracking-widest uppercase text-oliveGray mb-6">
            Fale connosco
          </p>
          <h1 className="font-title text-display text-ink mb-6">Contactos</h1>
        </div>
      </section>

      <section>
        <div className="container-prose py-16">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="font-title text-h3 text-warmBeige mb-4">
                Administração
              </h2>
              <p className="font-body text-ink mb-1">{tenant.nome}</p>
              {tenant.morada && (
                <p className="font-body text-sm text-oliveGray">
                  {tenant.morada}
                </p>
              )}
            </div>

            <div>
              <h2 className="font-title text-h3 text-warmBeige mb-4">
                Condóminos
              </h2>
              <p className="font-body text-oliveGray">
                Para assuntos do condomínio, aceda à{" "}
                <a
                  href="/login"
                  className="text-warmBeige hover:text-oliveGray transition-colors underline"
                >
                  área reservada
                </a>{" "}
                com as suas credenciais.
              </p>
            </div>
          </div>

          <p className="font-body text-sm text-oliveGray italic mt-12">
            Os contactos diretos da administração podem ser personalizados nesta
            página.
          </p>
        </div>
      </section>
    </>
  );
}
