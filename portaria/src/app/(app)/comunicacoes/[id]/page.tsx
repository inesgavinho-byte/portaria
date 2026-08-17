import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, FileText, Users, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import { atualizarEstadoComunicacao, atualizarEstadoDestinatario } from "@/lib/actions/comunicacoes";
import { ComunicacaoDocumentoForm } from "@/components/admin/comunicacao-documento-form";
import type { Comunicacao, ComunicacaoDestinatario, ComunicacaoDestinatarioEstado } from "@/types/database";

const ESTADO_LABEL: Record<Comunicacao["estado"], string> = {
  rascunho: "Rascunho", preparada: "Preparada", em_envio: "Em envio",
  concluida: "Concluída", arquivada: "Arquivada", cancelada: "Cancelada",
};
const TIPO_LABEL: Record<Comunicacao["tipo"], string> = {
  circular: "Circular", convocatoria: "Convocatória", ata: "Ata", quotas: "Quotas",
  obras_manutencao: "Obras / manutenção", cobranca: "Cobrança", entrega_documental: "Entrega documental",
  aviso: "Aviso", geral: "Geral", outro: "Outro",
};
const CANAL_LABEL: Record<string, string> = {
  email: "E-mail", correio_simples: "Correio simples", correio_registado: "Correio registado",
  entrega_em_mao: "Entrega em mão", portal: "Portal", outro: "Outro",
};
const ENTREGA_LABEL: Record<ComunicacaoDestinatarioEstado, string> = {
  pendente: "Pendente", enviado: "Enviado", entregue: "Entregue", devolvido: "Devolvido",
  sem_contacto: "Sem contacto", dispensado: "Dispensado",
};

type DestinatarioComFracao = ComunicacaoDestinatario & { fracao: { codigo: string } | null };
type LigacaoDocumento = {
  id: string;
  documento_id: string | null;
  documento_administracao_id: string | null;
  nota: string | null;
};

export default async function ComunicacaoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");

  const supabase = await createClient();
  const [{ data: comunicacao }, { data: destinatarios }, { data: ligacoes }, { data: documentos }, { data: confidenciais }] = await Promise.all([
    supabase.from("comunicacoes").select("*").eq("id", id).eq("tenant_id", ctx.tenant.id).maybeSingle(),
    supabase.from("comunicacao_destinatarios").select("*, fracao:fracoes(codigo)").eq("comunicacao_id", id).eq("tenant_id", ctx.tenant.id).order("criado_em"),
    supabase.from("comunicacao_documentos").select("*").eq("comunicacao_id", id).eq("tenant_id", ctx.tenant.id).order("criado_em"),
    supabase.from("documentos").select("id, titulo").eq("tenant_id", ctx.tenant.id).order("upload_em", { ascending: false }),
    supabase.from("documentos_administracao").select("id, titulo").eq("tenant_id", ctx.tenant.id).order("upload_em", { ascending: false }),
  ]);
  if (!comunicacao) notFound();

  const comunicacaoTipada = comunicacao as Comunicacao;
  const listaDestinatarios = (destinatarios ?? []) as DestinatarioComFracao[];
  const listaLigacoes = (ligacoes ?? []) as LigacaoDocumento[];
  const idsPublicados = listaLigacoes.flatMap((item) => item.documento_id ? [item.documento_id] : []);
  const idsConfidenciais = listaLigacoes.flatMap((item) => item.documento_administracao_id ? [item.documento_administracao_id] : []);
  const { data: publicadosLigados } = idsPublicados.length
    ? await supabase.from("documentos").select("id, titulo").eq("tenant_id", ctx.tenant.id).in("id", idsPublicados)
    : { data: [] as { id: string; titulo: string }[] };
  const { data: confidenciaisLigados } = idsConfidenciais.length
    ? await supabase.from("documentos_administracao").select("id, titulo").eq("tenant_id", ctx.tenant.id).in("id", idsConfidenciais)
    : { data: [] as { id: string; titulo: string }[] };
  const nomesDocumentos = new Map<string, { titulo: string; origem: string }>();
  for (const doc of (publicadosLigados ?? []) as { id: string; titulo: string }[]) {
    nomesDocumentos.set(doc.id, { titulo: doc.titulo, origem: "Publicado" });
  }
  for (const doc of (confidenciaisLigados ?? []) as { id: string; titulo: string }[]) {
    nomesDocumentos.set(doc.id, { titulo: doc.titulo, origem: "Confidencial" });
  }
  const opcoesDocumento = [
    ...(documentos ?? []).map((doc) => ({ ...doc, origem: "publicado" as const })),
    ...(confidenciais ?? []).map((doc) => ({ ...doc, origem: "confidencial" as const })),
  ].sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-PT"));
  const resumo = {
    total: listaDestinatarios.length,
    pendente: listaDestinatarios.filter((item) => item.estado === "pendente").length,
    entregue: listaDestinatarios.filter((item) => item.estado === "entregue").length,
  };

  return (
    <div>
      <Link href="/comunicacoes" className="inline-flex items-center gap-1.5 mb-6 font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink">
        <ChevronLeft className="w-3.5 h-3.5" /> Comunicações
      </Link>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between mb-8">
        <div className="min-w-0">
          <p className="font-body text-xs tracking-[0.18em] uppercase text-warmBeige mb-2">{TIPO_LABEL[comunicacaoTipada.tipo]}</p>
          <h1 className="font-title text-h1 text-ink mb-2">{comunicacaoTipada.assunto}</h1>
          <p className="font-body text-oliveGray">
            {new Date(`${comunicacaoTipada.data_comunicacao}T00:00:00`).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })}
            {comunicacaoTipada.data_limite && ` · limite: ${new Date(`${comunicacaoTipada.data_limite}T00:00:00`).toLocaleDateString("pt-PT")}`}
          </p>
        </div>
        <form action={atualizarEstadoComunicacao} className="flex items-center gap-2 shrink-0">
          <input type="hidden" name="comunicacao_id" value={comunicacaoTipada.id} />
          <label className="sr-only" htmlFor="estado">Estado da comunicação</label>
          <select id="estado" name="estado" defaultValue={comunicacaoTipada.estado} className="px-3 py-2.5 border border-warmBeige/40 bg-paper font-body text-sm text-ink">
            {Object.entries(ESTADO_LABEL).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
          </select>
          <button type="submit" className="px-4 py-2.5 bg-ink text-paper font-body text-xs tracking-widest uppercase hover:bg-oliveGray">Guardar</button>
        </form>
      </div>

      {comunicacaoTipada.descricao && (
        <div className="bg-paper border border-warmBeige/20 p-5 mb-6">
          <p className="font-body text-sm whitespace-pre-wrap text-ink">{comunicacaoTipada.descricao}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-paper border border-warmBeige/20 p-4"><p className="font-body text-xs uppercase tracking-widest text-oliveGray">Frações</p><p className="font-title text-3xl text-ink mt-2">{resumo.total}</p></div>
        <div className="bg-paper border border-warmBeige/20 p-4"><p className="font-body text-xs uppercase tracking-widest text-oliveGray">Pendentes</p><p className="font-title text-3xl text-alert mt-2">{resumo.pendente}</p></div>
        <div className="bg-paper border border-warmBeige/20 p-4"><p className="font-body text-xs uppercase tracking-widest text-oliveGray">Entregues</p><p className="font-title text-3xl text-success mt-2">{resumo.entregue}</p></div>
      </div>

      <section className="bg-paper border border-warmBeige/20 p-5 md:p-6 mb-8">
        <div className="flex items-center gap-2 mb-4"><FileText className="w-4 h-4 text-warmBeige" /><h2 className="font-title text-xl text-ink">Documentos associados</h2></div>
        {listaLigacoes.length === 0 ? (
          <p className="font-body text-sm text-oliveGray">Ainda não há ficheiros associados a esta comunicação.</p>
        ) : (
          <div className="divide-y divide-warmBeige/10">
            {listaLigacoes.map((ligacao) => {
              const documento = nomesDocumentos.get(ligacao.documento_id ?? ligacao.documento_administracao_id ?? "");
              const href = ligacao.documento_administracao_id ? "/configuracao/documentos-administracao" : "/configuracao/documentos";
              return (
                <div key={ligacao.id} className="py-3 flex items-center justify-between gap-4">
                  <div><p className="font-body text-sm text-ink">{documento?.titulo ?? "Documento indisponível"}</p><p className="font-body text-xs text-oliveGray mt-1">{documento?.origem ?? "Arquivo"}{ligacao.nota ? ` · ${ligacao.nota}` : ""}</p></div>
                  <Link href={href} className="font-body text-xs tracking-widest uppercase text-oliveGray hover:text-ink">Abrir arquivo</Link>
                </div>
              );
            })}
          </div>
        )}
        <ComunicacaoDocumentoForm comunicacaoId={comunicacaoTipada.id} documentos={opcoesDocumento} />
      </section>

      <section className="bg-paper border border-warmBeige/20">
        <div className="p-5 md:p-6 border-b border-warmBeige/15"><div className="flex items-center gap-2"><Users className="w-4 h-4 text-warmBeige" /><h2 className="font-title text-xl text-ink">Entregas por fração</h2></div><p className="font-body text-sm text-oliveGray mt-2">Registe aqui o resultado real de cada entrega. Esta ação não envia e-mails.</p></div>
        <div className="divide-y divide-warmBeige/10">
          {listaDestinatarios.map((destinatario) => (
            <form key={destinatario.id} action={atualizarEstadoDestinatario} className="p-5 grid gap-3 lg:grid-cols-[minmax(150px,1.2fr)_minmax(160px,1fr)_minmax(145px,0.8fr)_minmax(160px,1fr)_auto] lg:items-end">
              <input type="hidden" name="destinatario_id" value={destinatario.id} />
              <input type="hidden" name="comunicacao_id" value={comunicacaoTipada.id} />
              <div><p className="font-title text-lg text-ink">{destinatario.fracao?.codigo ?? "Fração"}</p><p className="font-body text-xs text-oliveGray mt-1">{destinatario.destinatario_nome ?? "Sem destinatário registado"} · {CANAL_LABEL[destinatario.canal]}</p></div>
              <label><span className="block font-body text-[10px] uppercase tracking-widest text-oliveGray mb-1">Estado</span><select name="estado" defaultValue={destinatario.estado} className="w-full px-3 py-2 border border-warmBeige/40 bg-paper font-body text-sm text-ink">{Object.entries(ENTREGA_LABEL).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}</select></label>
              <label><span className="block font-body text-[10px] uppercase tracking-widest text-oliveGray mb-1">Referência</span><input name="referencia_envio" defaultValue={destinatario.referencia_envio ?? ""} maxLength={240} className="w-full px-3 py-2 border border-warmBeige/40 bg-paper font-body text-sm text-ink" /></label>
              <label><span className="block font-body text-[10px] uppercase tracking-widest text-oliveGray mb-1">Observação</span><input name="observacoes" defaultValue={destinatario.observacoes ?? ""} maxLength={2000} className="w-full px-3 py-2 border border-warmBeige/40 bg-paper font-body text-sm text-ink" /></label>
              <button type="submit" className="px-4 py-2 bg-ink text-paper font-body text-xs tracking-widest uppercase hover:bg-oliveGray">Atualizar</button>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}
