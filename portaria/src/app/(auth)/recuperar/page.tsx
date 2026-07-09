import Link from "next/link";
import { RecuperarForm } from "@/components/app/recuperar-form";

export default function RecuperarPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-softCream/40 px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <p className="font-body text-xs tracking-widest uppercase text-oliveGray mb-3">
            Recuperar acesso
          </p>
          <h1 className="font-title text-h1 text-ink">
            Esqueceu a palavra-passe?
          </h1>
        </div>
        <RecuperarForm />
        <p className="text-center mt-8">
          <Link
            href="/login"
            className="font-body text-sm text-oliveGray hover:text-ink transition-colors"
          >
            Voltar ao início de sessão
          </Link>
        </p>
      </div>
    </div>
  );
}
