"use client";

import { useTransition } from "react";
import { definirFracaoMembro } from "@/lib/actions/membros";
import type { Fracao } from "@/types/database";

/**
 * Seletor de fração de um membro. Guarda ao mudar (sem botão),
 * porque é uma associação simples e reversível.
 */
export function MembroFracaoSelect({
  membershipId,
  fracaoId,
  fracoes,
}: {
  membershipId: string;
  fracaoId: string | null;
  fracoes: Pick<Fracao, "id" | "codigo">[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const valor = e.target.value || null;
    startTransition(async () => {
      await definirFracaoMembro(membershipId, valor);
    });
  }

  return (
    <select
      defaultValue={fracaoId ?? ""}
      onChange={handleChange}
      disabled={isPending}
      aria-label="Fração do membro"
      className="px-3 py-1.5 border border-warmBeige/40 bg-paper font-body text-sm text-ink focus:outline-none focus:border-warmBeige disabled:opacity-50"
    >
      <option value="">Sem fração</option>
      {fracoes.map((f) => (
        <option key={f.id} value={f.id}>
          {f.codigo}
        </option>
      ))}
    </select>
  );
}
