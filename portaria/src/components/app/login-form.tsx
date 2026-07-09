"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Credenciais inválidas. Verifique e tente novamente.");
      setLoading(false);
      return;
    }

    router.push("/inicio");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="email"
          className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block font-body text-xs tracking-widest uppercase text-oliveGray mb-2"
        >
          Palavra-passe
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige"
        />
      </div>

      {error && (
        <p className="font-body text-sm text-alert">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50"
      >
        {loading ? "A entrar..." : "Entrar"}
      </button>

      <p className="text-center">
        <Link
          href="/recuperar"
          className="font-body text-sm text-oliveGray hover:text-ink transition-colors"
        >
          Esqueceu a palavra-passe?
        </Link>
      </p>
    </form>
  );
}
