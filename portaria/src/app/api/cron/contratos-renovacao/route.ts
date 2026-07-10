import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notificarRenovacaoContrato } from "@/lib/notificacoes";

export const dynamic = "force-dynamic";

/**
 * Cron de renovação de contratos.
 *
 * Corre uma vez por dia e avisa a administração dos contratos cujo
 * data_fim é daqui a 30 ou 7 dias. Deve ser chamado por um agendador
 * externo (ver docs) com o cabeçalho de autenticação:
 *
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Percorre todos os prédios (usa service-role, fora do RLS), por isso
 * nunca deve ser exposto sem o segredo.
 */

const AVISOS_DIAS = [30, 7];

function dataDaqui(dias: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) {
    return NextResponse.json(
      { erro: "CRON_SECRET não configurado." },
      { status: 503 }
    );
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { erro: "Service-role não configurado." },
      { status: 503 }
    );
  }

  let avisados = 0;
  const detalhe: { contrato: string; dias: number; enviado: boolean }[] = [];

  for (const dias of AVISOS_DIAS) {
    const alvo = dataDaqui(dias);
    const { data: contratos, error } = await admin
      .from("contratos")
      .select("id, titulo, data_fim, tenant_id, tenants(id, slug, nome)")
      .eq("data_fim", alvo);

    if (error) {
      console.error("[cron] erro a ler contratos:", error);
      continue;
    }

    for (const c of contratos ?? []) {
      // O join devolve `tenants` como objeto (relação para-um).
      const t = (Array.isArray(c.tenants) ? c.tenants[0] : c.tenants) as
        | { id: string; slug: string; nome: string }
        | null;
      if (!t) continue;

      const enviado = await notificarRenovacaoContrato(
        t,
        { id: c.id, titulo: c.titulo, data_fim: c.data_fim },
        dias
      );
      if (enviado) avisados++;
      detalhe.push({ contrato: c.titulo, dias, enviado });
    }
  }

  return NextResponse.json({ ok: true, avisados, detalhe });
}
