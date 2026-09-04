import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell,
  Building2,
  CalendarDays,
  FileText,
  Landmark,
  Sparkles,
  Users,
  Wrench,
  ArrowRight,
} from "lucide-react";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";

const SECCOES = [
  {
    href: "/configuracao/perfil",
    icon: Building2,
    titulo: "Perfil do condomínio",
    descricao: "Dados gerais, seguradora e administrador responsável.",
  },
  {
    href: "/configuracao/membros",
    icon: Users,
    titulo: "Membros",
    descricao: "Convidar e gerir quem tem acesso à plataforma.",
  },
  {
    href: "/configuracao/notificacoes",
    icon: Bell,
    titulo: "Notificações",
    descricao: "Escolha se recebe avisos por email deste condomínio.",
  },
  {
    href: "/configuracao/conselheira",
    icon: Sparkles,
    titulo: "Assistente do edifício",
    descricao: "Legislação incorporada e regulamento do condomínio.",
  },
];

const AREAS = [
  {
    href: "/configuracao/ocorrencias",
    icon: Wrench,
    titulo: "Ocorrências e manutenção",
    descricao: "Acompanhar pedidos, intervenções e manutenção preventiva.",
  },
  {
    href: "/configuracao/assembleias",
    icon: CalendarDays,
    titulo: "Assembleias e decisões",
    descricao: "Preparar reuniões, deliberações, atas e seguimento.",
  },
  {
    href: "/configuracao/financeiro",
    icon: Landmark,
    titulo: "Financeiro",
    descricao: "Contas, movimentos, orçamento e reconciliação bancária.",
  },
  {
    href: "/configuracao/documentos-administracao",
    icon: FileText,
    titulo: "Arquivo do edifício",
    descricao: "Documentos operacionais e memória organizada do condomínio.",
  },
];

export default async function ConfiguracaoPage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  return (
    <div className="max-w-5xl pb-10">
      <header className="mb-12 border-b border-black/[0.07] pb-10">
        <p className="doorkeeper-eyebrow mb-5">Edifício</p>
        <h1 className="font-title text-[clamp(3.2rem,7vw,5.5rem)] font-normal leading-[0.95] text-ink">
          {ctx.tenant.nome}
        </h1>
        <p className="mt-5 max-w-xl font-body text-base leading-relaxed text-oliveGray">
          Pessoas, operação e memória do condomínio num único lugar.
        </p>
      </header>

      <section>
        <h2 className="font-title text-2xl font-normal text-ink">Áreas de trabalho</h2>
        <div className="mt-5 divide-y divide-black/[0.07] border-y border-black/[0.07]">
          {AREAS.map((s, index) => (
            <Link
              key={s.href}
              href={s.href}
              className="group grid gap-4 py-6 transition-colors hover:bg-white/50 sm:grid-cols-[3rem_1fr_auto] sm:items-center sm:px-3"
            >
              <span className="font-title text-3xl text-doorkeeperTurquoise">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>
                <span className="flex items-center gap-2 font-title text-xl font-normal text-ink">
                  <s.icon className="h-4 w-4 text-doorkeeperTurquoise" />
                  {s.titulo}
                </span>
                <span className="mt-1 block font-body text-sm text-oliveGray">{s.descricao}</span>
              </span>
              <ArrowRight className="hidden h-4 w-4 text-ink transition-transform group-hover:translate-x-1 sm:block" />
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-title text-2xl font-normal text-ink">Definições</h2>
        <div className="mt-5 grid gap-x-8 sm:grid-cols-2">
          {SECCOES.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group flex items-start gap-4 border-t border-black/[0.07] py-5 transition-colors"
            >
              <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-doorkeeperTurquoise" />
              <div className="min-w-0 flex-1">
                <h3 className="mb-1 flex items-center gap-2 font-body text-sm font-semibold text-ink">
                  {s.titulo}
                  <ArrowRight className="h-3.5 w-3.5 text-oliveGray transition-transform group-hover:translate-x-1" />
                </h3>
                <p className="font-body text-sm text-oliveGray">{s.descricao}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
