"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search } from "lucide-react";
import { CATEGORIA_LABEL, CATEGORIAS } from "@/lib/documentos";

/**
 * Filtro de documentos: pesquisa por texto + categoria.
 * O estado vive no URL (partilhável, coerente com a Design Language);
 * a filtragem acontece no servidor.
 */
export function DocumentosFiltro() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function aplicar(patch: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    startTransition(() => router.replace(`${pathname}?${next.toString()}`));
  }

  const catAtual = params.get("cat") ?? "";

  return (
    <div className="mb-10 space-y-4" data-pending={isPending}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-oliveGray" />
        <input
          type="search"
          defaultValue={params.get("q") ?? ""}
          onChange={(e) => aplicar({ q: e.target.value })}
          placeholder="Procurar documento…"
          className="w-full pl-11 pr-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip ativo={!catAtual} onClick={() => aplicar({ cat: "" })}>
          Todas
        </Chip>
        {CATEGORIAS.map((c) => (
          <Chip key={c} ativo={catAtual === c} onClick={() => aplicar({ cat: c })}>
            {CATEGORIA_LABEL[c]}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 border font-body text-xs tracking-widest uppercase transition-colors ${
        ativo
          ? "bg-ink text-paper border-ink"
          : "border-warmBeige/40 text-oliveGray hover:text-ink hover:border-warmBeige"
      }`}
    >
      {children}
    </button>
  );
}
