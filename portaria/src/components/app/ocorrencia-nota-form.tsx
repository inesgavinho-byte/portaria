"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adicionarNotaOcorrencia } from "@/lib/actions/ocorrencias";

export function OcorrenciaNotaForm({ id }: { id: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await adicionarNotaOcorrencia(id, texto);
      if (res.error) {
        setError(res.error);
        return;
      }
      setTexto("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submeter} className="space-y-3">
      <label
        htmlFor="nota"
        className="block font-body text-xs tracking-widest uppercase text-oliveGray"
      >
        Adicionar nota
      </label>
      <textarea
        id="nota"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        maxLength={2000}
        disabled={pending}
        className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige resize-none disabled:opacity-50"
        placeholder="Registe uma atualização ou observação."
      />
      {error && <p className="font-body text-sm text-alert">{error}</p>}
      <button
        type="submit"
        disabled={pending || !texto.trim()}
        className="px-6 py-2 bg-warmBeige text-paper font-body text-xs tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-40"
      >
        {pending ? "A guardar..." : "Adicionar"}
      </button>
    </form>
  );
}
