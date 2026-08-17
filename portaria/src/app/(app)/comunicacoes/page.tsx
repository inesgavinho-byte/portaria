import Link from "next/link";
import { Plus, Send, FileText, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/tenant";
import type { Comunicacao, ComunicacaoDestinatarioEstado } from "@/types/database";

const ESTADO_LABEL: Record<Comunicacao["estado"], string> = {
  rascunho: "Rascunho",
  preparada: "Preparada",
  em_envio: "Em envio",
  concluida: "Concluída",
  arquivada: "Arquivada",
  cancelada: "Cancelada",
};

const TIPO_LABEL: Record<Comunicacao["tipo"], string> = {
  circular: "Circular",
  convocatoria: "Convocatória",
  ata: "Ata",
  quotas: "Quotas",
  obras_manutencao: "Obras / manutenção",
  cobranca: "Cobrança",
  entrega_documental: "Entrega documental",
  aviso: "Aviso",
  geral: "Geral",
  outro: "Outro",
};

type ComunicacaoComDestinatarios = Comunicacao & {
  comunicacao_destinatarios: { estado: ComunicacaoDestinatarioEstado }[] | null;
};

function resumoDestinatarios(destinatarios: { estado: ComunicacaoDestinatarioEstado }[] | null) {
  const lista = destinatarios ?? [];
  const entregue = lista.filter((item) => item.estado === "entregue").length;
  const enviado = lista.filter((item) => item.estado === "enviado").length;
  const pendente = lista.filter((item) => item.estado === "pendente").length;
  return { total: lista.length, entregue, enviado, pendente };
}

export default async function ComunicacoesPage() {
  const ctx = await requireAdmin();
  if (!ctx) redirect("/avisos");

  const supabase = await createClient();
  const { data } = await supabase
    .from("comunicacoes")
    .select("*, comunicacao_destinatarios(estado)")
    .eq("tenant_id", ctx.tenant.id)
    .order("data_comunicacao", { ascending: false })
    .order("criado_em", { ascending: false });
  const comunicacoes = (data ?? []) as ComunicacaoComDestinatarios[];
  const pendentes = comunicacoes.reduce((soma, comunicacao) => soma + resumoDestinatarios(comunicacao.comunicacao_destinatarios).pendente, 0);

  return (
    <div>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div>
          <p className="font-body text-xs tracking-[0.18em] uppercase text-warmBeige mb-2">Gestão administrativa</p>
          <h1 className="font-title text-h1 text-ink mb-2">Comunicações</h1>
          <p className="font-body text-oliveGray max-w-2xl">
            Registo vivo de circulares, entregas, cobranças e contactos formais. Cada fração mantém o seu próprio estado de entrega.
          </p>
        </div>
        <Link href="/comunicacoes/nova" className="shrink-0 inline-flex justify-center items-center gap-2 px-6 py-3 bg-ink text-paper font-body text-sm tracking-widest uppercase hover:bg-oliveGray transition-colors">
          <Plus className="w-4 h-4" /> Nova comunicação
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <div className="bg-paper border border-warmBeige/20 p-4">
          <p className="font-body text-xs tracking-widest uppercase text-oliveGray">Registos</p>
          <p className="font-title text-3xl text-ink mt-2">{comunicacoes.length}</p>
        </div>
        <div className="bg-paper border border-warmBeige/20 p-4">
          <p className="font-body text-xs tracking-widest uppercase text-oliveGray">Pendentes</p>
          <p className="font-title text-3xl text-alert mt-2">{pendentes}</p>
        </div>
        <div className="bg-paper border border-warmBeige/20 p-4">
          <p className="font-body text-xs tracking-widest uppercase text-oliveGray">Em envio</p>
          <p className="font-title text-3xl text-ink mt-2">{comunicacoes.filter((item) => item.estado === "em_envio").length}</p>
        </div>
        <div className="bg-paper border border-warmBeige/20 p-4">
          <p className="font-body text-xs tracking-widest uppercase text-oliveGray">Concluídas</p>
          <p className="font-title text-3xl text-success mt-2">{comunicacoes.filter((item) => item.estado === "concluida").length}</p>
        </div>
      </div>

      {comunicacoes.length === 0 ? (
        <div className="bg-paper border border-warmBeige/20 p-10 text-center">
          <Send className="w-6 h-6 text-warmBeige mx-auto mb-4" />
          <h2 className="font-title text-xl text-ink mb-2">Ainda não há comunicações formais.</h2>
          <p className="font-body text-sm text-oliveGray max-w-md mx-auto mb-5">
            Crie o primeiro registo para acompanhar destinatários por fração e ligar o ficheiro correspondente ao arquivo.
          </p>
          <Link href="/comunicacoes/nova" className="font-body text-sm tracking-widest uppercase text-ink hover:text-oliveGray">Criar comunicação</Link>
        </div>
      ) : (
        <div className="bg-paper border border-warmBeige/20 divide-y divide-warmBeige/10">
          {comunicacoes.map((comunicacao) => {
            const resumo = resumoDestinatarios(comunicacao.comunicacao_destinatarios);
            return (
              <Link key={comunicacao.id} href={`/comunicacoes/${comunicacao.id}`} className="block p-5 hover:bg-softCream/40 transition-colors">
                <div className="flex gap-4 items-start">
                  <FileText className="w-5 h-5 shrink-0 text-warmBeige mt-1" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h2 className="font-title text-xl text-ink">{comunicacao.assunto}</h2>
                      <span className="font-body text-[10px] uppercase tracking-widest px-2 py-1 bg-softCream text-oliveGray">{ESTADO_LABEL[comunicacao.estado]}</span>
                    </div>
                    <p className="font-body text-sm text-oliveGray mt-1">{TIPO_LABEL[comunicacao.tipo]} · {new Date(`${comunicacao.data_comunicacao}T00:00:00`).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 font-body text-xs text-oliveGray">
                      <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {resumo.total} frações</span>
                      <span className={resumo.pendente ? "text-alert" : "text-oliveGray"}>{resumo.pendente} pendentes</span>
                      <span>{resumo.enviado} enviados</span>
                      <span className="text-success">{resumo.entregue} entregues</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
