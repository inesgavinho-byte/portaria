import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Users, Bell, Sparkles, ArrowRight } from "lucide-react";
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
    titulo: "Conselheira",
    descricao: "Legislação incorporada e regulamento do condomínio.",
  },
];

export default async function ConfiguracaoPage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-title text-h1 text-ink mb-2">Configuração</h1>
        <p className="font-body text-oliveGray">
          Definições do {ctx.tenant.nome}. As áreas de trabalho estão no menu
          lateral.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {SECCOES.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex items-start gap-4 border border-warmBeige/30 p-6 hover:border-warmBeige hover:bg-softCream/40 transition-colors"
          >
            <s.icon className="w-5 h-5 text-warmBeige shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h2 className="font-title text-lg text-ink mb-1 flex items-center gap-2">
                {s.titulo}
                <ArrowRight className="w-3.5 h-3.5 text-oliveGray transition-transform group-hover:translate-x-1" />
              </h2>
              <p className="font-body text-sm text-oliveGray">{s.descricao}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
