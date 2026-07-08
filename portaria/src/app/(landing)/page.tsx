import { LandingHero } from "@/components/landing/hero";
import { SectionProblema } from "@/components/landing/section-problema";
import { SectionSolucao } from "@/components/landing/section-solucao";
import { SectionIa } from "@/components/landing/section-ia";
import { SectionConfianca } from "@/components/landing/section-confianca";
import { SectionCta } from "@/components/landing/section-cta";

/**
 * Landing da Portaria — narrativa em scroll:
 * hero (sombra) → problema (luz) → solução (sombra) →
 * IA (luz) → confiança (sombra) → convite final.
 */
export default function LandingPage() {
  return (
    <>
      <LandingHero />
      <SectionProblema />
      <SectionSolucao />
      <SectionIa />
      <SectionConfianca />
      <SectionCta />
    </>
  );
}
