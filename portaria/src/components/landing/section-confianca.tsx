import { Reveal } from "./reveal";
import { SectionIntro } from "./section-intro";

// Afirmações públicas limitadas ao que é verificável no repositório.
const PONTOS = [
  {
    titulo: "Acessos",
    texto: "Cada pessoa vê e faz apenas o que o seu perfil permite.",
  },
  {
    titulo: "Infraestrutura",
    texto: "Dados alojados na Europa, na região eu-west-1 do Supabase.",
  },
  {
    titulo: "Privacidade",
    texto: "Isolamento entre condomínios por RLS, testado continuamente.",
  },
  {
    titulo: "Fontes",
    texto: "Legislação portuguesa apresentada com as respetivas referências.",
  },
];

export function SectionConfianca() {
  return (
    <section id="confianca" className="bg-softCream">
      <div className="container-page py-24 md:py-36">
        <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-24">
          <SectionIntro
            numero="04"
            titulo={
              <>
                Confiança,
                <br />sem letras pequenas.
              </>
            }
            linhas={["Segurança explicada com factos concretos."]}
          />
          <p className="max-w-xl self-end font-body text-lg leading-8 text-ink/60">
            A tecnologia deve tornar a gestão mais transparente, sem criar novas zonas cinzentas.
          </p>
        </div>

        <div className="mt-16 grid border-y border-ink/20 sm:grid-cols-2 lg:grid-cols-4">
          {PONTOS.map((ponto, i) => (
            <Reveal
              key={ponto.titulo}
              delay={i * 80}
              className="h-full border-b border-ink/15 sm:odd:border-r lg:border-b-0 lg:border-r lg:first:border-l-0 lg:last:border-r-0"
            >
              <div className="h-full py-7 sm:px-6">
                <p className="font-body text-[0.65rem] font-semibold tracking-[0.16em] text-doorkeeperTerracotta">0{i + 1}</p>
                <h3 className="mt-8 font-title text-2xl text-ink">{ponto.titulo}</h3>
                <p className="mt-3 font-body text-sm leading-6 text-ink/55">{ponto.texto}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
