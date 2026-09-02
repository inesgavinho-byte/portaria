import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Mail, Phone, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import type { FracaoPessoa, Pessoa } from "@/types/database";

const EURO = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

type Ligacao = FracaoPessoa & {
  pessoa: Pessoa | null;
  fracao: { id: string; codigo: string; tipologia: string | null } | null;
};

const PAPEL_LABEL: Record<string, string> = {
  proprietario: "Proprietário",
  inquilino: "Inquilino",
  representante: "Representante",
};

export default async function CondominosPage() {
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");

  const supabase = await createClient();
  // Uma única passagem por fracao_pessoas traz pessoas, frações e papéis;
  // as quotas em dívida vêm à parte e agregam-se por fração.
  const [{ data: ligacoes }, { data: quotas }] = await Promise.all([
    supabase
      .from("fracao_pessoas")
      .select("*, pessoa:pessoas(*), fracao:fracoes(id, codigo, tipologia)")
      .eq("tenant_id", ctx.tenant.id)
      .is("ate", null)
      .order("criado_em", { ascending: true }),
    supabase
      .from("quotas_mensais")
      .select("fracao_id, valor_cents")
      .eq("tenant_id", ctx.tenant.id)
      .in("estado", ["pendente", "parcial"]),
  ]);

  const dividaPorFracao = new Map<string, number>();
  for (const quota of quotas ?? []) {
    dividaPorFracao.set(
      quota.fracao_id,
      (dividaPorFracao.get(quota.fracao_id) ?? 0) + quota.valor_cents,
    );
  }

  type Linha = {
    pessoa: Pessoa;
    papeis: string[];
    fracoes: { id: string; codigo: string; tipologia: string | null }[];
    dividaCents: number;
  };

  const linhas = new Map<string, Linha>();
  for (const ligacao of (ligacoes ?? []) as Ligacao[]) {
    if (!ligacao.pessoa || !ligacao.fracao) continue;
    let linha = linhas.get(ligacao.pessoa.id);
    if (!linha) {
      linha = { pessoa: ligacao.pessoa, papeis: [], fracoes: [], dividaCents: 0 };
      linhas.set(ligacao.pessoa.id, linha);
    }
    if (!linha.papeis.includes(ligacao.papel)) linha.papeis.push(ligacao.papel);
    if (!linha.fracoes.some((f) => f.id === ligacao.fracao!.id)) {
      linha.fracoes.push(ligacao.fracao);
    }
    linha.dividaCents += dividaPorFracao.get(ligacao.fracao.id) ?? 0;
  }

  const lista = [...linhas.values()].sort(
    (a, b) => b.dividaCents - a.dividaCents || a.pessoa.nome.localeCompare(b.pessoa.nome, "pt-PT"),
  );

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-title text-h1 text-ink mb-2">Condóminos</h1>
          <p className="font-body text-oliveGray max-w-2xl">
            Uma ficha por pessoa, com todas as frações, a posição financeira
            consolidada, recibos e comunicações — mesmo que tenha mais do que
            uma fração.
          </p>
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="bg-paper border border-warmBeige/20 p-12 text-center">
          <Users className="w-8 h-8 text-oliveGray mx-auto mb-4" />
          <p className="font-body text-oliveGray mb-2">
            Ainda não há condóminos nesta vista.
          </p>
          <p className="font-body text-sm text-oliveGray max-w-md mx-auto">
            Os condóminos criam-se a partir dos proprietários e inquilinos
            das frações. Edita uma fração em <Link href="/fracoes" className="text-ink underline hover:text-oliveGray">Frações</Link> para
            preencher os contactos e a ficha aparece aqui.
          </p>
        </div>
      ) : (
        <div className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
          {lista.map((linha) => (
            <Link
              key={linha.pessoa.id}
              href={`/condominos/${linha.pessoa.id}`}
              className="p-4 flex items-center gap-4 hover:bg-softCream/40 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <h2 className="font-title text-lg text-ink">{linha.pessoa.nome}</h2>
                  {linha.papeis.map((papel) => (
                    <span key={papel} className="font-body text-[11px] tracking-widest uppercase text-oliveGray border border-warmBeige/40 px-2 py-0.5">
                      {PAPEL_LABEL[papel] ?? papel}
                    </span>
                  ))}
                </div>
                <p className="font-body text-sm text-oliveGray mt-1 truncate">
                  {linha.fracoes.map((f) => f.codigo).join(" · ")}
                  {linha.pessoa.email ? ` · ${linha.pessoa.email}` : ""}
                </p>
                {(linha.pessoa.email || linha.pessoa.telefone) && (
                  <p className="font-body text-xs text-oliveGray mt-0.5 flex items-center gap-4">
                    {linha.pessoa.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{linha.pessoa.email}</span>}
                    {linha.pessoa.telefone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{linha.pessoa.telefone}</span>}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className={`font-title text-xl ${linha.dividaCents > 0 ? "text-alert" : "text-success"}`}>
                  {EURO.format(linha.dividaCents / 100)}
                </p>
                <p className="font-body text-xs text-oliveGray">em dívida</p>
              </div>
              <ChevronRight className="w-4 h-4 text-oliveGray shrink-0" />
            </Link>
          ))}

          <div className="p-4 font-body text-xs text-oliveGray">
            {lista.length} {lista.length === 1 ? "condómino" : "condóminos"} ·
            dívida somada por fração; quotas parciais contam pelo valor integral
            até haver alocação por quota.
          </div>
        </div>
      )}
    </div>
  );
}
