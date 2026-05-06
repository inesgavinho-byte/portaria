import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-softCream/40 px-6">
      <div className="text-center max-w-md">
        <p className="font-title text-display text-warmBeige mb-4">404</p>
        <h1 className="font-title text-h2 text-ink mb-4">Página não encontrada</h1>
        <p className="font-body text-oliveGray mb-8">
          A página que procura não existe ou foi movida.
        </p>
        <Link
          href="/"
          className="inline-block px-8 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors"
        >
          Voltar à página inicial
        </Link>
      </div>
    </div>
  );
}
