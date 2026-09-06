import Link from "next/link";
import { ArrowRight } from "lucide-react";

const PRINCIPIOS = [
  ["01", "Operação", "O dia-a-dia num só lugar"],
  ["02", "Memória", "Decisões com contexto"],
  ["03", "Clareza", "Informação para todos"],
] as const;

export function LandingHero() {
  return (
    <section className="relative min-h-svh overflow-hidden bg-graphite text-white">
      <div aria-hidden className="absolute inset-y-0 right-0 w-1.5 bg-doorkeeperTurquoise md:w-2" />

      <div className="container-page flex min-h-svh flex-col pb-8 pt-32 md:pb-10 md:pt-36">
        <div className="flex flex-1 items-center py-12 md:py-16">
          <div className="w-full">
            <p className="hero-enter mb-7 flex items-center gap-4 font-body text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-doorkeeperTurquoise">
              Gestão operacional de condomínios
              <span className="h-px w-14 bg-doorkeeperTurquoise/50" />
            </p>

            <h1 className="hero-enter max-w-[10ch] font-title text-[clamp(4.15rem,9.4vw,8.75rem)] font-normal leading-[0.82] text-white [animation-delay:100ms]">
              O edifício,
              <br />finalmente
              <br />em ordem.
            </h1>

            <div className="mt-10 grid gap-9 border-t border-white/15 pt-7 md:mt-12 md:grid-cols-[minmax(0,31rem)_auto] md:items-end md:justify-between md:gap-14 md:pt-8">
              <p className="hero-enter font-body text-base leading-7 text-white/58 md:text-lg [animation-delay:220ms]">
                Operação diária, arquivo e comunicação no mesmo lugar — com contexto para quem administra e clareza para quem vive no condomínio.
              </p>

              <div className="hero-enter flex flex-wrap items-center gap-6 [animation-delay:340ms]">
                <Link
                  href="/contactos"
                  className="group inline-flex items-center gap-3 bg-doorkeeperTerracotta px-7 py-4 font-body text-sm font-semibold text-white transition-colors hover:bg-white hover:text-graphite"
                >
                  Ver demonstração
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/login"
                  className="border-b border-white/30 pb-1 font-body text-sm font-semibold text-white/75 transition-colors hover:border-doorkeeperTurquoise hover:text-doorkeeperTurquoise"
                >
                  Área reservada
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-enter grid border-y border-white/15 [animation-delay:460ms] sm:grid-cols-3">
          {PRINCIPIOS.map(([numero, titulo, texto]) => (
            <div
              key={numero}
              className="grid grid-cols-[2rem_1fr] gap-3 border-b border-white/15 py-4 last:border-b-0 sm:block sm:border-b-0 sm:border-r sm:px-5 sm:py-5 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0"
            >
              <span className="font-body text-[0.62rem] font-semibold tracking-[0.16em] text-doorkeeperTurquoise">{numero}</span>
              <div className="sm:mt-4">
                <p className="font-title text-lg text-white">{titulo}</p>
                <p className="mt-1 font-body text-xs text-white/42">{texto}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
