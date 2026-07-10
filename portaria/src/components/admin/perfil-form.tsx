"use client";

import { useActionState } from "react";
import {
  atualizarPerfilCondominio,
  type PerfilFormState,
} from "@/lib/actions/perfil";
import type { Tenant, TenantPerfil } from "@/types/database";

interface PerfilFormProps {
  tenant: Tenant;
  perfil: TenantPerfil | null;
}

const inputClass =
  "w-full px-4 py-3 border border-warmBeige/40 bg-paper font-body text-ink focus:outline-none focus:border-warmBeige";
const labelClass =
  "block font-body text-xs tracking-widest uppercase text-oliveGray mb-2";

export function PerfilForm({ tenant, perfil }: PerfilFormProps) {
  const [state, formAction, pending] = useActionState<PerfilFormState, FormData>(
    atualizarPerfilCondominio,
    {}
  );

  return (
    <form action={formAction} className="space-y-12">
      {state.error && (
        <div className="border-l-4 border-alert bg-alert/5 px-4 py-3">
          <p className="font-body text-sm text-alert">{state.error}</p>
        </div>
      )}
      {state.sucesso && (
        <div className="border-l-4 border-success bg-success/5 px-4 py-3">
          <p className="font-body text-sm text-success">Perfil guardado.</p>
        </div>
      )}

      {/* ---- Dados gerais ---- */}
      <section className="space-y-6">
        <h2 className="font-title text-h3 text-warmBeige">Dados gerais</h2>

        <Campo id="nome" label="Nome do condomínio" erro={state.fieldErrors?.nome}>
          <input
            id="nome"
            name="nome"
            type="text"
            required
            maxLength={200}
            defaultValue={tenant.nome}
            className={inputClass}
          />
        </Campo>

        <Campo id="morada" label="Morada" erro={state.fieldErrors?.morada}>
          <input
            id="morada"
            name="morada"
            type="text"
            maxLength={300}
            defaultValue={tenant.morada ?? ""}
            className={inputClass}
          />
        </Campo>

        <div className="grid md:grid-cols-2 gap-6">
          <Campo id="email" label="Email de contacto" erro={state.fieldErrors?.email}>
            <input
              id="email"
              name="email"
              type="email"
              maxLength={200}
              defaultValue={tenant.email ?? ""}
              className={inputClass}
              placeholder="geral@exemplo.pt"
            />
          </Campo>
          <Campo id="telefone" label="Telefone" erro={state.fieldErrors?.telefone}>
            <input
              id="telefone"
              name="telefone"
              type="tel"
              maxLength={30}
              defaultValue={tenant.telefone ?? ""}
              className={inputClass}
            />
          </Campo>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Campo
            id="num_fracoes"
            label="N.º de frações"
            erro={state.fieldErrors?.num_fracoes}
          >
            <input
              id="num_fracoes"
              name="num_fracoes"
              type="number"
              min={0}
              max={10000}
              defaultValue={tenant.num_fracoes ?? ""}
              className={inputClass}
            />
          </Campo>
          <Campo
            id="ano_construcao"
            label="Ano de construção"
            erro={state.fieldErrors?.ano_construcao}
          >
            <input
              id="ano_construcao"
              name="ano_construcao"
              type="number"
              min={1800}
              max={2100}
              defaultValue={tenant.ano_construcao ?? ""}
              className={inputClass}
            />
          </Campo>
        </div>

        <p className="font-body text-xs text-oliveGray">
          Nome, morada e contactos aparecem nas páginas públicas do condomínio.
        </p>
      </section>

      {/* ---- Identidade ---- */}
      <section className="space-y-6 pt-8 border-t border-warmBeige/20">
        <h2 className="font-title text-h3 text-warmBeige">Identidade</h2>

        <Campo id="logo" label="Logótipo" erro={state.fieldErrors?.logo}>
          <div className="flex items-center gap-4">
            {tenant.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.logo_url}
                alt="Logótipo atual"
                className="h-16 w-16 object-contain border border-warmBeige/30 bg-softCream/40 p-1"
              />
            )}
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="font-body text-sm text-ink file:mr-4 file:py-2 file:px-4 file:border file:border-warmBeige/40 file:bg-softCream/60 file:font-body file:text-xs file:tracking-widest file:uppercase file:text-oliveGray hover:file:border-warmBeige"
            />
          </div>
          <p className="mt-2 font-body text-xs text-oliveGray">
            PNG, JPEG, WebP ou SVG, até 2 MB. Aparece nos documentos e páginas
            do condomínio.
          </p>
        </Campo>

        <div className="grid md:grid-cols-2 gap-6">
          <Campo id="nif" label="NIF do condomínio">
            <input
              id="nif"
              name="nif"
              type="text"
              maxLength={20}
              defaultValue={perfil?.nif ?? ""}
              className={inputClass}
              placeholder="500 000 000"
            />
          </Campo>
          <Campo id="iban" label="IBAN do condomínio">
            <input
              id="iban"
              name="iban"
              type="text"
              maxLength={34}
              defaultValue={perfil?.iban ?? ""}
              className={inputClass}
              placeholder="PT50 0000 0000 0000 0000 0000 0"
            />
          </Campo>
        </div>
        <p className="font-body text-xs text-oliveGray">
          O NIF e o IBAN são internos e alimentam os modelos de documento
          (Blueprints).
        </p>
      </section>

      {/* ---- Seguradora ---- */}
      <section className="space-y-6 pt-8 border-t border-warmBeige/20">
        <h2 className="font-title text-h3 text-warmBeige">Seguradora</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Campo id="seguradora_nome" label="Seguradora">
            <input
              id="seguradora_nome"
              name="seguradora_nome"
              type="text"
              maxLength={200}
              defaultValue={perfil?.seguradora_nome ?? ""}
              className={inputClass}
            />
          </Campo>
          <Campo id="seguradora_apolice" label="N.º de apólice">
            <input
              id="seguradora_apolice"
              name="seguradora_apolice"
              type="text"
              maxLength={100}
              defaultValue={perfil?.seguradora_apolice ?? ""}
              className={inputClass}
            />
          </Campo>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Campo id="seguradora_contacto" label="Contacto">
            <input
              id="seguradora_contacto"
              name="seguradora_contacto"
              type="text"
              maxLength={200}
              defaultValue={perfil?.seguradora_contacto ?? ""}
              className={inputClass}
            />
          </Campo>
          <Campo
            id="seguradora_validade"
            label="Validade"
            erro={state.fieldErrors?.seguradora_validade}
          >
            <input
              id="seguradora_validade"
              name="seguradora_validade"
              type="date"
              defaultValue={perfil?.seguradora_validade ?? ""}
              className={inputClass}
            />
          </Campo>
        </div>
      </section>

      {/* ---- Administrador responsável ---- */}
      <section className="space-y-6 pt-8 border-t border-warmBeige/20">
        <h2 className="font-title text-h3 text-warmBeige">
          Administrador responsável
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Campo id="administrador_nome" label="Nome">
            <input
              id="administrador_nome"
              name="administrador_nome"
              type="text"
              maxLength={200}
              defaultValue={perfil?.administrador_nome ?? ""}
              className={inputClass}
            />
          </Campo>
          <Campo id="administrador_empresa" label="Empresa">
            <input
              id="administrador_empresa"
              name="administrador_empresa"
              type="text"
              maxLength={200}
              defaultValue={perfil?.administrador_empresa ?? ""}
              className={inputClass}
            />
          </Campo>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Campo
            id="administrador_email"
            label="Email"
            erro={state.fieldErrors?.administrador_email}
          >
            <input
              id="administrador_email"
              name="administrador_email"
              type="email"
              maxLength={200}
              defaultValue={perfil?.administrador_email ?? ""}
              className={inputClass}
            />
          </Campo>
          <Campo id="administrador_telefone" label="Telefone">
            <input
              id="administrador_telefone"
              name="administrador_telefone"
              type="tel"
              maxLength={30}
              defaultValue={perfil?.administrador_telefone ?? ""}
              className={inputClass}
            />
          </Campo>
        </div>
        <p className="font-body text-xs text-oliveGray">
          Estes dados são internos — visíveis apenas à administração.
        </p>
      </section>

      <div className="pt-4 border-t border-warmBeige/20">
        <button
          type="submit"
          disabled={pending}
          className="px-8 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors disabled:opacity-50"
        >
          {pending ? "A guardar..." : "Guardar alterações"}
        </button>
      </div>
    </form>
  );
}

function Campo({
  id,
  label,
  erro,
  children,
}: {
  id: string;
  label: string;
  erro?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {erro && <p className="mt-2 text-sm text-alert font-body">{erro}</p>}
    </div>
  );
}
