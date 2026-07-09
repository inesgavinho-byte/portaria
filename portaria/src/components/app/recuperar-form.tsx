"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function RecuperarForm() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/recuperar/confirmar`,
    });

    // Resposta idêntica exista ou não a conta — não se revela quem tem acesso
    setEnviado(true);
    setLoading(false);
  }

  if (enviado) {
    return (
      <div className="bg-paper border border-warmBeige/20 p-8 text-center">
        <p className="font-body text-ink mb-2">Verifique o seu email.</p>
        <p className="font-body text-sm text-oliveGray">
          Se existir uma conta com este endereço, enviámos instruções para
          definir uma nova palavra-passe.
        </p>
      </div>
    );
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

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50"
      >
        {loading ? "A enviar..." : "Enviar instruções"}
      </button>
    </form>
  );
}
