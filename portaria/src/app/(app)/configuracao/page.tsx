import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Bell, FileText, AlertCircle, Users, ArrowRight, DoorOpen } from "lucide-react";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";

const SECCOES = [
  {
    href: "/configuracao/perfil",
    icon: Building2,
    titulo: "Perfil",
    descricao: "Dados do condomínio, seguradora e administrador.",
  },
  {
    href: "/configuracao/fracoes",
    icon: DoorOpen,
    titulo: "Frações",
    descricao: "Frações, proprietários, inquilinos e permilagens.",
  },
  {
    href: "/configuracao/avisos",
    icon: Bell,
    titulo: "Avisos",
    descricao: "Publicar e gerir comunicações aos condóminos.",
  },
  {
    href: "/configuracao/documentos",
    icon: FileText,
    titulo: "Documentos",
    descricao: "Atas, contas, contratos e documentação.",
  },
  {
    href: "/configuracao/ocorrencias",
    icon: AlertCircle,
    titulo: "Ocorrências",
    descricao: "Acompanhar e resolver ocorrências reportadas.",
  },
  {
    href: "/configuracao/membros",
    icon: Users,
    titulo: "Membros",
    descricao: "Convidar e gerir quem tem acesso.",
  },
];

export default async function ConfiguracaoPage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-title text-h1 text-ink mb-2">Configuração</h1>
        <p className="font-body text-oliveGray">
          Administração do {ctx.tenant.nome}.
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
