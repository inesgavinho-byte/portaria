"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export function PesquisaGlobal() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const termoAtual = pathname === "/pesquisa" ? (searchParams.get("q") ?? "") : "";
  const [valor, setValor] = useState(termoAtual);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (pathname === "/pesquisa") setValor(searchParams.get("q") ?? "");
  }, [pathname, searchParams]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const termo = valor.trim();
    if (termo.length < 2) return;
    startTransition(() => router.push(`/pesquisa?q=${encodeURIComponent(termo)}`));
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm" role="search">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-oliveGray" />
        <input
          type="search"
          value={valor}
          onChange={(event) => setValor(event.target.value)}
          placeholder="Pesquisar ou perguntar"
          aria-label="Pesquisar ou perguntar"
          className="h-11 w-full rounded-xl border border-black/[0.07] bg-white/80 pl-11 pr-4 font-body text-sm text-ink shadow-glass outline-none backdrop-blur-xl transition-all placeholder:text-oliveGray/70 focus:border-doorkeeperTurquoise/35 focus:bg-white focus:ring-4 focus:ring-doorkeeperTurquoise/5"
        />
        {isPending && <span className="absolute right-4 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-doorkeeperTurquoise" />}
      </div>
    </form>
  );
}
