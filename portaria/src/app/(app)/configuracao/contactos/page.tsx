import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { ContactoActions } from "@/components/admin/contacto-actions";
import { TIPO_LABEL } from "@/lib/contactos";
import type { Contacto } from "@/types/database";

export default async function ContactosPage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("contactos")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .order("nome", { ascending: true });

  const lista: Contacto[] = data ?? [];

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-title text-h1 text-ink mb-2">Contactos</h1>
          <p className="font-body text-oliveGray">
            Fornecedores, empresas e pessoas — cada um registado uma só vez.
          </p>
        </div>
        <Link href="/configuracao/contactos/novo"
          className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors">
          <Plus className="w-4 h-4" /> Novo contacto
        </Link>
      </div>

      {lista.length === 0 ? (
        <div className="bg-paper border border-warmBeige/20 p-12 text-center">
          <p className="font-body text-oliveGray mb-4">Ainda não há contactos.</p>
          <Link href="/configuracao/contactos/novo"
            className="font-body text-sm text-warmBeige hover:text-oliveGray transition-colors tracking-widest uppercase">
            Criar o primeiro
          </Link>
        </div>
      ) : (
        <div className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
          {lista.map((c) => (
            <div key={c.id} className="p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-3">
                  <h2 className="font-title text-lg text-ink truncate">{c.nome}</h2>
                  <span className="font-body text-xs text-oliveGray">{TIPO_LABEL[c.tipo]}</span>
                </div>
                <p className="font-body text-sm text-oliveGray mt-1 truncate">
                  {[c.papel, c.empresa, c.telefone, c.email].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <ContactoActions contactoId={c.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
