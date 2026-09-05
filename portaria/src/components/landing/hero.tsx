import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DoorKeeperMonogram } from "@/components/brand/doorkeeper-marks";

export function LandingHero() {
  return (
    <section className="min-h-svh overflow-hidden bg-softCream">
      <div className="container-page grid min-h-svh items-center gap-14 pb-16 pt-32 lg:grid-cols-[1.1fr_0.72fr] lg:gap-20 lg:pb-12 lg:pt-28">
        <div className="max-w-3xl lg:py-16">
          <p className="hero-enter mb-7 font-body text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-doorkeeperTurquoise">
            Gestão operacional de condomínios
          </p>
          <h1 className="hero-enter max-w-[10ch] font-title text-[clamp(3.7rem,7.6vw,7rem)] font-normal leading-[0.86] text-ink [animation-delay:100ms]">
            O edifício, finalmente em ordem.
          </h1>
          <p className="hero-enter mt-9 max-w-xl font-body text-base leading-7 text-ink/65 md:text-lg [animation-delay:220ms]">
            Operação diária, arquivo e comunicação no mesmo lugar — com contexto para quem administra e clareza para quem vive no condomínio.
          </p>

          <div className="hero-enter mt-10 flex flex-wrap items-center gap-6 [animation-delay:340ms]">
            <Link
              href="/contactos"
              className="group inline-flex items-center gap-3 bg-doorkeeperTerracotta px-7 py-4 font-body text-sm font-semibold text-white transition-colors hover:bg-doorkeeperBrown"
            >
              Ver demonstração
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="border-b border-ink/30 pb-1 font-body text-sm font-semibold text-ink transition-colors hover:border-doorkeeperTurquoise hover:text-doorkeeperTurquoise"
            >
              Entrar na área reservada
            </Link>
          </div>

          <dl className="hero-enter mt-16 grid max-w-xl grid-cols-2 border-y border-ink/15 py-5 [animation-delay:460ms]">
            <div className="border-r border-ink/15 pr-5">
              <dt className="font-body text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-ink/45">Um sistema</dt>
              <dd className="mt-1 font-title text-xl text-ink">Toda a operação</dd>
            </div>
            <div className="pl-5">
              <dt className="font-body text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-ink/45">Uma memória</dt>
              <dd className="mt-1 font-title text-xl text-ink">Todo o contexto</dd>
            </div>
          </dl>
        </div>

        <div className="hero-enter relative mx-auto w-full max-w-[30rem] [animation-delay:260ms] lg:ml-auto">
          <div aria-hidden className="absolute -right-4 -top-4 h-full w-full border border-ink/20 md:-right-6 md:-top-6" />
          <div className="relative aspect-[5/4] overflow-hidden bg-doorkeeperGreen p-6 sm:aspect-[4/3] md:p-8 lg:aspect-[4/5]">
            <div className="flex justify-between font-body text-[0.62rem] font-semibold uppercase tracking-[0.17em] text-white/55">
              <span>The DoorKeeper</span>
              <span>01 / Entrada</span>
            </div>
            <DoorKeeperMonogram
              tone="turquoise"
              priority
              className="absolute bottom-[10%] right-[9%] h-[58%] w-[58%]"
            />
            <p className="absolute bottom-7 left-6 max-w-[9rem] border-l border-white/35 pl-3 font-body text-[0.68rem] leading-5 text-white/65 md:bottom-8 md:left-8">
              A porta de entrada para um edifício bem gerido.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
