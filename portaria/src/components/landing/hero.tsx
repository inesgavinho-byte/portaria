import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Hero full-viewport: fundo escuro arquitectónico construído em CSS
 * (arco de luz quente, parede e chão em gradiente), texto à esquerda,
 * marca iluminada à direita, indicação de scroll.
 */
export function LandingHero() {
  return (
    <section className="relative min-h-svh overflow-hidden bg-night flex items-center">
      {/* --- Cenário arquitectónico --- */}
      <div aria-hidden className="absolute inset-0">
        {/* Penumbra de base — parede */}
        <div className="absolute inset-0 bg-gradient-to-b from-night via-[#101014] to-[#16161a]" />

        {/* Arco de luz quente — o elemento central, com deriva lenta */}
        <div className="glow-drift absolute top-[8%] right-[-10%] w-[70vmin] h-[70vmin] md:right-[8%]">
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_50%,rgba(173,170,150,0.45),rgba(173,170,150,0.12)_45%,transparent_72%)] blur-2xl" />
          <div className="absolute inset-[6%] rounded-full border border-warmBeige/40 [mask-image:linear-gradient(115deg,transparent_40%,black_70%)]" />
        </div>

        {/* Feixe de luz que corta a parede na diagonal */}
        <div className="absolute inset-y-0 right-[18%] w-[38%] bg-gradient-to-b from-warmBeige/[0.12] via-transparent to-transparent [transform:skewX(-12deg)]" />

        {/* Chão — reflexo suave em baixo */}
        <div className="absolute bottom-0 inset-x-0 h-[28%] bg-gradient-to-t from-[#1b1b20] to-transparent" />
        <div className="absolute bottom-0 right-[10%] w-[50vmin] h-px bg-gradient-to-r from-transparent via-warmBeige/30 to-transparent" />
      </div>

      {/* --- Marca iluminada na parede, à direita --- */}
      <div
        aria-hidden
        className="hero-enter absolute right-[10%] top-[34%] hidden lg:flex flex-col items-center gap-4 [animation-delay:600ms]"
      >
        <span className="block w-10 h-12 border border-warmBeige/70 rounded-t-full" />
        <span className="font-body text-xs tracking-[0.5em] uppercase text-warmBeige/90">
          Portaria
        </span>
      </div>

      {/* --- Conteúdo --- */}
      <div className="container-page relative z-10 w-full pt-28 pb-24">
        <div className="max-w-2xl">
          <p className="hero-enter font-body text-xs tracking-[0.35em] uppercase text-paper/50 mb-8">
            Gestão inteligente de condomínios
          </p>
          <h1 className="hero-enter font-title text-[clamp(3rem,9vw,5.5rem)] leading-[1.05] text-paper [animation-delay:120ms]">
            Clareza.
            <br />
            Memória.
            <br />
            Tranquilidade.
          </h1>
          <p className="hero-enter font-body text-base md:text-lg text-paper/60 max-w-md mt-10 [animation-delay:280ms]">
            A Portaria organiza o presente, guarda o passado e prepara o
            futuro do seu condomínio.
          </p>
          <div className="hero-enter mt-12 [animation-delay:420ms]">
            <Link
              href="/contactos"
              className="group inline-flex items-center gap-3 rounded-full bg-paper text-night px-8 py-4 font-body text-sm tracking-wide hover:bg-warmBeige hover:text-night transition-colors"
            >
              Ver demonstração
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* --- Indicação de scroll --- */}
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
