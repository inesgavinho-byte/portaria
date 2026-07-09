import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { ContratoActions } from "@/components/admin/contrato-actions";
import type { Contrato } from "@/types/database";

function estadoContrato(c: Contrato): { label: string; classe: string } {
  if (!c.data_fim) return { label: "Sem termo", classe: "text-oliveGray" };
  const hoje = new Date();
  const fim = new Date(c.data_fim);
  const dias = Math.ceil((fim.getTime() - hoje.getTime()) / 86400000);
  if (dias < 0) return { label: "Terminado", classe: "text-alert" };
  if (dias <= 30) return { label: `Termina em ${dias} dias`, classe: "text-alert" };
  return { label: "Ativo", classe: "text-success" };
}

export default async function ContratosPage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const [{ data: contratos }, { data: contactos }] = await Promise.all([
    supabase.from("contratos").select("*").eq("tenant_id", ctx.tenant.id)
      .order("data_fim", { ascending: true, nullsFirst: false }),
    supabase.from("contactos").select("id, nome").eq("tenant_id", ctx.tenant.id),
  ]);

  const lista: Contrato[] = contratos ?? [];
  const nomeContacto = new Map((contactos ?? []).map((c) => [c.id, c.nome]));

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-title text-h1 text-ink mb-2">Contratos</h1>
          <p className="font-body text-oliveGray">
            Contratos ativos do condomínio, datas e renovações.
          </p>
        </div>
        <Link href="/configuracao/contratos/novo"
          className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors">
          <Plus className="w-4 h-4" /> Novo contrato
        </Link>
      </div>

      {lista.length === 0 ? (
        <div className="bg-paper border border-warmBeige/20 p-12 text-center">
          <p className="font-body text-oliveGray mb-4">Ainda não há contratos.</p>
          <Link href="/configuracao/contratos/novo"
            className="font-body text-sm text-warmBeige hover:text-oliveGray transition-colors tracking-widest uppercase">
            Criar o primeiro
          </Link>
        </div>
      ) : (
        <div className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
          {lista.map((c) => {
            const estado = estadoContrato(c);
            return (
              <div key={c.id} className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="font-title text-lg text-ink truncate">{c.titulo}</h2>
                  <p className="font-body text-xs text-oliveGray mt-1">
                    {c.contacto_id && nomeContacto.get(c.contacto_id)}
                    {c.data_fim && ` · até ${new Date(c.data_fim).toLocaleDateString("pt-PT")}`}
                    {c.renovacao_automatica && " · renovação automática"}
                  </p>
                </div>
                <span className={`font-body text-xs tracking-widest uppercase ${estado.classe}`}>
                  {estado.label}
                </span>
                <ContratoActions contratoId={c.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
