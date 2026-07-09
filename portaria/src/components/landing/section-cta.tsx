import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./reveal";

/**
 * Fecho da landing — convite silencioso, sem densidade.
 */
export function SectionCta() {
  return (
    <section className="relative bg-night overflow-hidden">
      <div
        aria-hidden
        className="absolute -bottom-1/2 left-1/2 -translate-x-1/2 w-[90vmin] h-[90vmin] rounded-full bg-[radial-gradient(circle,rgba(173,170,150,0.14),transparent_65%)]"
      />
      <div className="container-page relative py-28 md:py-40 text-center">
        <Reveal>
          <h2 className="font-title text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.15] text-paper mb-10">
            O seu condomínio,
            <br />
            finalmente em ordem.
          </h2>
          <Link
            href="/contactos"
            className="group inline-flex items-center gap-3 rounded-full bg-paper text-night px-8 py-4 font-body text-sm tracking-wide hover:bg-warmBeige transition-colors"
          >
            Ver demonstração
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
