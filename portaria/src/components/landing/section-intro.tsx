import { Reveal } from "./reveal";

interface SectionIntroProps {
  numero: string;
  titulo: React.ReactNode;
  /** Linhas curtas de apoio, uma por item. */
  linhas?: string[];
  /** true quando a secção tem fundo escuro. */
  escuro?: boolean;
}

/**
 * Cabeçalho de secção da landing: numeração, título grande e
 * linhas curtas. Mantém o ritmo tipográfico entre secções.
 */
export function SectionIntro({
  numero,
  titulo,
  linhas = [],
  escuro = false,
}: SectionIntroProps) {
  const tituloCor = escuro ? "text-paper" : "text-ink";
  const apoioCor = escuro ? "text-paper/50" : "text-oliveGray";

  return (
    <Reveal>
      <p
        className={`font-body text-xs tracking-[0.35em] ${apoioCor} mb-6 flex items-center gap-4`}
      >
        {numero}
        <span
          className={`block w-10 h-px ${escuro ? "bg-paper/20" : "bg-ink/15"}`}
        />
      </p>
      <h2
        className={`font-title text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.1] ${tituloCor}`}
      >
        {titulo}
      </h2>
      {linhas.length > 0 && (
        <div className={`font-body text-sm md:text-base ${apoioCor} mt-8 space-y-1`}>
          {linhas.map((linha) => (
            <p key={linha}>{linha}</p>
          ))}
        </div>
      )}
    </Reveal>
  );
}
