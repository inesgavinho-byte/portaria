"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";

export function PesquisaInput({ inicial }: { inicial: string }) {
  const router = useRouter();
  const [valor, setValor] = useState(inicial);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(() =>
      router.replace(`/configuracao/pesquisa?q=${encodeURIComponent(valor)}`)
    );
  }

  return (
    <form onSubmit={submit} className="relative mb-10" data-pending={isPending}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-oliveGray" />
      <input
        type="search"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        autoFocus
        placeholder="Procurar em documentos, ocorrências, assembleias, contactos…"
        className="w-full pl-11 pr-4 py-4 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
      />
    </form>
  );
}
