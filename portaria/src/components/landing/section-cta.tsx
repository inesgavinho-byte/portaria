import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./reveal";

export function SectionCta() {
  return (
    <section className="bg-doorkeeperTerracotta">
      <div className="container-page py-24 md:py-32">
        <Reveal className="grid items-end gap-10 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="mb-6 font-body text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/60">Próximo passo</p>
            <h2 className="max-w-4xl font-title text-[clamp(3rem,6.5vw,6rem)] leading-[0.9] text-white">
              Vamos pôr o seu condomínio em ordem?
            </h2>
          </div>
          <Link
            href="/contactos"
            className="group inline-flex w-fit items-center gap-3 bg-night px-7 py-4 font-body text-sm font-semibold text-white transition-colors hover:bg-doorkeeperGreen"
          >
            Ver demonstração
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
