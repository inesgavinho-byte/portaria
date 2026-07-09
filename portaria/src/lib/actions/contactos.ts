"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { TIPOS } from "@/lib/contactos";
import type { Contacto } from "@/types/database";

export type ContactoFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"nome" | "email", string>>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function texto(fd: FormData, campo: string, max: number): string | null {
  const v = String(fd.get(campo) ?? "").trim();
  return v ? v.slice(0, max) : null;
}

function ler(fd: FormData) {
  const nome = String(fd.get("nome") ?? "").trim();
  const tipo = String(fd.get("tipo") ?? "fornecedor");
  const email = texto(fd, "email", 200);

  const fieldErrors: ContactoFormState["fieldErrors"] = {};
  if (!nome) fieldErrors.nome = "O nome é obrigatório.";
  else if (nome.length > 200) fieldErrors.nome = "Nome demasiado longo.";
  if (email && !EMAIL_RE.test(email)) fieldErrors.email = "Email inválido.";

  return {
    fieldErrors,
    valores: {
      nome,
      tipo: (TIPOS.includes(tipo as Contacto["tipo"]) ? tipo : "outro") as Contacto["tipo"],
      papel: texto(fd, "papel", 100),
      empresa: texto(fd, "empresa", 200),
      email,
      telefone: texto(fd, "telefone", 30),
      notas: texto(fd, "notas", 1000),
    },
  };
}

export async function criarContacto(
  _prev: ContactoFormState,
  formData: FormData
): Promise<ContactoFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const { fieldErrors, valores } = ler(formData);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase
    .from("contactos")
    .insert({ tenant_id: ctx.tenant.id, ...valores });
  if (error) {
    console.error("Erro insert contacto:", error);
    return { error: "Erro ao criar o contacto." };
  }

  revalidatePath("/configuracao/contactos");
  redirect("/configuracao/contactos");
}

export async function atualizarContacto(
  id: string,
  _prev: ContactoFormState,
  formData: FormData
): Promise<ContactoFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Sem permissões para esta operação." };

  const { fieldErrors, valores } = ler(formData);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase
    .from("contactos")
    .update({ ...valores, atualizado_em: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);
  if (error) {
    console.error("Erro update contacto:", error);
    return { error: "Erro ao atualizar o contacto." };
  }

  revalidatePath("/configuracao/contactos");
  redirect("/configuracao/contactos");
}

export async function apagarContacto(id: string) {
  const ctx = await requireAdmin();
  if (!ctx) throw new Error("Sem permissões");

  const supabase = await createClient();
  const { error } = await supabase
    .from("contactos")
    .delete()
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);
  if (error) throw new Error("Erro ao apagar o contacto.");

  revalidatePath("/configuracao/contactos");
}
