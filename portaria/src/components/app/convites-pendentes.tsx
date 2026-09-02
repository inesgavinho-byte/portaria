"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  aceitarConvitePendente,
  recusarConvitePendente,
  type ConvitePendente,
} from "@/lib/actions/convites";

const ROLE_LABEL: Record<ConvitePendente["role"], string> = {
  admin: "Administração",
  comissao: "Comissão de condóminos",
  condomino: "Condómino",
  inquilino: "Inquilino",
};

function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * S11 — Lista os convites pendentes do utilizador autenticado e pede
 * uma decisão explícita por convite: aceitar ou recusar. Nada é aceite
 * automaticamente. Depois de cada ação a lista é revalidada no servidor;
 * quando não sobra nenhum convite, mostra-se o estado "tudo tratado".
 */
export function ConvitesPendentes({ convites }: { convites: ConvitePendente[] }) {
  const router = useRouter();
  const [emCurso, setEmCurso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function decidir(conviteId: string, acao: "aceitar" | "recusar") {
    setEmCurso(conviteId);
    setErro(null);

    const resultado =
      acao === "aceitar"
        ? await aceitarConvitePendente(conviteId)
        : await recusarConvitePendente(conviteId);

    setEmCurso(null);

    if (!resultado.ok) {
      setErro(resultado.error ?? "Não foi possível tratar o convite. Tente novamente.");
      return;
    }

    router.refresh();
  }

  if (convites.length === 0) {
    return (
      <div className="text-center space-y-8">
        <p className="font-body text-sm text-oliveGray">
          Já não tem convites pendentes.
        </p>
        <Link
          href="/hoje"
          className="inline-block px-8 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors"
        >
          Ir para a plataforma
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="font-body text-sm text-oliveGray">
        Tem {convites.length === 1 ? "um convite pendente" : `${convites.length} convites pendentes`}.
        Aceite ou recuse cada um — nada é aceite automaticamente.
      </p>

      <ul className="space-y-4">
        {convites.map((convite) => (
          <li key={convite.id} className="border border-warmBeige/40 bg-paper p-6">
            <p className="font-title text-lg text-ink">{convite.tenant_nome}</p>
            <p className="font-body text-sm text-oliveGray mt-1">
              {ROLE_LABEL[convite.role]}
              {convite.fracao ? ` · Fração ${convite.fracao}` : ""}
              {" · "}
              convidado a {dataCurta(convite.criado_em)}
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <button
                type="button"
                disabled={emCurso !== null}
                onClick={() => decidir(convite.id, "aceitar")}
                className="px-6 py-2.5 bg-ink text-paper font-body text-xs tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50"
              >
                {emCurso === convite.id ? "A tratar..." : "Aceitar"}
              </button>
              <button
                type="button"
                disabled={emCurso !== null}
                onClick={() => decidir(convite.id, "recusar")}
                className="px-6 py-2.5 border border-warmBeige/40 text-oliveGray font-body text-xs tracking-widest uppercase hover:text-ink hover:border-warmBeige transition-colors disabled:opacity-50"
              >
                Recusar
              </button>
            </div>
          </li>
        ))}
      </ul>

      {erro && <p className="font-body text-sm text-alert">{erro}</p>}
    </div>
  );
}
