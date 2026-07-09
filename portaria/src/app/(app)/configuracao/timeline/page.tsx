import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserInTenant } from "@/lib/supabase/tenant";
import { reunirTimeline, tipoLabel } from "@/lib/timeline";

export default async function TimelinePage() {
  const ctx = await getCurrentUserInTenant();
  if (!ctx) redirect("/login");

  const eventos = await reunirTimeline(ctx.tenant.id);

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="font-title text-h1 text-ink mb-2">Timeline</h1>
        <p className="font-body text-oliveGray">
          A história do {ctx.tenant.nome}, do mais recente ao mais antigo.
        </p>
      </div>

      {eventos.length === 0 ? (
        <div className="bg-paper border border-warmBeige/20 p-12 text-center">
          <p className="font-body text-oliveGray">
            Ainda não há atividade registada.
          </p>
        </div>
      ) : (
        <ol className="relative border-l border-warmBeige/30 space-y-6 pl-6">
          {eventos.map((e, i) => (
            <li key={`${e.tipo}-${i}`} className="relative">
              <span className="absolute -left-[1.85rem] top-1.5 w-2.5 h-2.5 rounded-full bg-warmBeige" />
              <Link href={e.href} className="group block">
                <p className="font-body text-xs tracking-widest uppercase text-oliveGray">
                  {tipoLabel(e.tipo)}
                </p>
                <p className="font-body text-ink group-hover:text-oliveGray transition-colors">
                  {e.titulo}
                </p>
                <p className="font-body text-xs text-oliveGray mt-0.5">
                  {new Date(e.data).toLocaleDateString("pt-PT", {
                    year: "numeric", month: "long", day: "numeric",
                  })}
                </p>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
