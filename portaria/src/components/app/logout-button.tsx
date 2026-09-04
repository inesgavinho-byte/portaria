"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function sair() {
    setPending(true);
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={sair}
      disabled={pending}
      className="font-body text-sm font-semibold text-doorkeeperTerracotta transition-colors hover:text-doorkeeperBrown disabled:opacity-50"
    >
      {pending ? "A sair…" : "Terminar sessão"}
    </button>
  );
}
