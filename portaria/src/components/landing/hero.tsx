import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DoorKeeperWordmark } from "@/components/brand/doorkeeper-marks";

/**
 * Hero editorial, construído a partir da identidade The DoorKeeper.
 */
export function LandingHero() {
  return (
    <section className="relative flex min-h-svh items-center overflow-hidden bg-night">
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-y-0 right-0 hidden w-[43%] bg-doorkeeperGreen lg:block" />
        <div className="absolute bottom-0 right-[43%] hidden h-44 w-44 translate-x-1/2 translate-y-1/2 rounded-full bg-doorkeeperTurquoise lg:block" />
      </div>

      <div
        className="hero-enter absolute right-[5%] top-1/2 hidden w-[34%] -translate-y-1/2 lg:block [animation-delay:600ms]"
      >
        <DoorKeeperWordmark tone="green" priority className="h-auto w-full object-contain" />
      </div>

      <div className="container-page relative z-10 w-full pt-28 pb-24">
        <div className="max-w-3xl lg:max-w-[52%]">
          <p className="hero-enter mb-8 font-body text-xs font-semibold uppercase tracking-[0.28em] text-doorkeeperTurquoise">
            Gestão operacional de condomínios
          </p>
          <h1 className="hero-enter font-title text-[clamp(3.6rem,8vw,7.5rem)] font-normal leading-[0.88] text-paper [animation-delay:120ms]">
            O edifício,
            <br /> finalmente
            <br /> em ordem.
          </h1>
          <p className="hero-enter mt-10 max-w-md font-body text-base leading-relaxed text-paper/62 md:text-lg [animation-delay:280ms]">
            Operação diária, arquivo e comunicação num único lugar — para quem administra e para quem vive no condomínio.
          </p>
          <div className="hero-enter mt-12 [animation-delay:420ms]">
            <Link
              href="/contactos"
              className="group inline-flex items-center gap-3 rounded-full bg-doorkeeperTerracotta px-8 py-4 font-body text-sm font-semibold text-white transition-colors hover:bg-paper hover:text-night"
            >
              Ver demonstração
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>

      <div
        aria-hidden
        className="absolute bottom-8 left-6 md:left-[max(1.5rem,calc((100vw-72rem)/2))] flex items-center gap-4"
      >
        <span className="block w-px h-12 bg-paper/20 relative overflow-hidden">
          <span className="scroll-hint absolute inset-0 bg-paper/70" />
        </span>
        <span className="font-body text-[0.65rem] tracking-[0.35em] uppercase text-paper/40">
          Scroll
        </span>
      </div>
    </section>
  );
}
