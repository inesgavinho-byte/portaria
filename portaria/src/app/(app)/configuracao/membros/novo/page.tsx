import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ConviteForm } from "@/components/admin/convite-form";

export default async function NovoMembroPage({
  searchParams,
}: {
  searchParams: Promise<{ fracao?: string; role?: string }>;
}) {
  const { fracao, role } = await searchParams;
  const roleValidos = ["condomino", "inquilino", "comissao", "admin"];
  const roleInicial = role && roleValidos.includes(role) ? role : "condomino";

  return (
    <div className="max-w-2xl">
      <Link
        href="/configuracao/membros"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-4 transition-colors"
      >
        <ChevronLeft className="w-3 h-3" />
        Voltar
      </Link>
      <h1 className="font-title text-h1 text-ink mb-2">
        {roleInicial === "inquilino" ? "Convidar inquilino" : "Convidar membro"}
      </h1>
      <p className="font-body text-oliveGray mb-8">
        A pessoa recebe um email com um link para criar a sua conta. Se já
        tiver conta na plataforma, fica associada de imediato.
      </p>
      <ConviteForm fracaoInicial={fracao ?? ""} roleInicial={roleInicial} />
    </div>
  );
}
