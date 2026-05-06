import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AvisoForm } from "@/components/admin/aviso-form";

export default function NovoAvisoPage() {
  return (
    <div>
      <Link
        href="/configuracao/avisos"
        className="inline-flex items-center gap-1 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink mb-4 transition-colors"
      >
        <ChevronLeft className="w-3 h-3" />
        Voltar
      </Link>
      <h1 className="font-title text-h1 text-ink mb-2">Novo aviso</h1>
      <p className="font-body text-oliveGray mb-8">
        Publique uma comunicação para todos os condóminos.
      </p>
      <AvisoForm />
    </div>
  );
}
