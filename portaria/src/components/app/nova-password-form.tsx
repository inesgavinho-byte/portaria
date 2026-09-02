"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * S11: os convites já não são aceites aqui automaticamente. Havendo
 * convites pendentes, o utilizador segue para /convite/pendentes, onde
 * aceita ou recusa cada convite explicitamente.
 */
export function NovaPasswordForm() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("A palavra-passe deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmar) {
      setError("As palavras-passe não coincidem.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError("Não foi possível guardar. Tente novamente.");
      setLoading(false);
      return;
    }

    // S11: com convites pendentes, a decisão é explícita e separada, no
    // passo seguinte. Sem convites (ex.: recuperação de password), entra
    // como antes. Se a verificação falhar, entra normalmente.
    let destino = "/avisos";
    try {
      const { data: pendentes } = await supabase.rpc("convites_pendentes");
      if ((pendentes ?? []).length > 0) destino = "/convite/pendentes";
    } catch {
      // verificação meramente orientativa; nunca bloqueia a entrada
    }

    router.push(destino);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="password"
          className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
        >
          Nova palavra-passe
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
        />
        <p className="mt-2 text-xs text-oliveGray font-body">
          Pelo menos 8 caracteres.
        </p>
      </div>

      <div>
        <label
          htmlFor="confirmar"
          className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
        >
          Confirmar palavra-passe
        </label>
        <input
          id="confirmar"
          type="password"
          required
          minLength={8}
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
        />
      </div>

      {error && <p className="font-body text-sm text-alert">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50"
      >
        {loading ? "A guardar..." : "Guardar e entrar"}
      </button>
    </form>
  );
}
