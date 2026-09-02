import { Cloud, Eye, Lock, Scale } from "lucide-react";
import { Reveal } from "./reveal";
import { SectionIntro } from "./section-intro";

// Auditoria beta-europa §6.3: afirmações públicas só com o demonstrável.
// Nada aqui pode prometer o que não está verificado no repositório:
//   • Infraestrutura: só o alojamento Supabase eu-west-1 — NÃO afirmar que
//     todo o pipeline (IA, email) está na UE, nem inventar backups.
//   • Privacidade: o isolamento RLS entre condomínios é testado em CI
//     (.github/workflows/ci.yml, tests/security).
//   • Conformidade: os textos legais são estáticos (src/lib/ai/legislacao.ts)
//     — citam a fonte; NÃO afirmar "sempre atualizada".
const PONTOS = [
  {
    icon: Lock,
    titulo: "Segurança",
    texto: "Dados protegidos e acessos por perfil.",
  },
  {
    icon: Cloud,
    titulo: "Infraestrutura",
    texto: "Dados alojados na Europa (Supabase, região eu-west-1).",
  },
  {
    icon: Eye,
    titulo: "Privacidade",
    texto: "Isolamento entre condomínios por RLS, testado em CI.",
  },
  {
    icon: Scale,
    titulo: "Conformidade",
    texto: "Legislação portuguesa com as fontes citadas.",
  },
];

/**
 * Secção 04 — Segura. Privada. Confiável.
 * Fundo escuro; quatro pontos com texto mínimo.
 */
export function SectionConfianca() {
  return (
    <section id="confianca" className="bg-night">
      <div className="container-page py-24 md:py-36 grid lg:grid-cols-[1fr_1.6fr] gap-16 items-start">
        <SectionIntro
          numero="04"
          escuro
          titulo={
            <>
              Segura.
              <br />
              Privada.
              <br />
              Confiável.
            </>
          }
        />

        <div className="grid sm:grid-cols-2 gap-px bg-white/10 border border-white/10">
          {PONTOS.map((ponto, i) => (
            <Reveal key={ponto.titulo} delay={i * 100} className="h-full">
              <div className="bg-night h-full p-8 hover:bg-nightSoft transition-colors">
                <ponto.icon className="w-4 h-4 text-warmBeige mb-6" />
                <p className="font-body text-sm tracking-widest uppercase text-paper mb-2">
                  {ponto.titulo}
                </p>
                <p className="font-body text-sm text-paper/50">{ponto.texto}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
