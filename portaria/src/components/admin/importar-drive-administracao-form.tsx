"use client";

import { FormEvent, useState } from "react";
import { CloudDownload, CheckCircle2, TriangleAlert } from "lucide-react";
import { importarDriveParaAdministracao } from "@/lib/actions/importar-drive-administracao";

export function ImportarDriveAdministracaoForm() {
  const [pending, setPending] = useState(false);
  const [resultado, setResultado] = useState<{ importados?: number; falhas?: string[] }>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const linhas = String(formData.get("links") ?? "").split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
    if (linhas.length === 0 || linhas.length > 20) {
      setResultado({ falhas: ["Indica entre 1 e 20 links, um por linha."] });
      return;
    }
    setPending(true);
    setResultado({});
    const res = await importarDriveParaAdministracao(linhas.map((url) => ({ url })));
    setResultado(res);
    if (res.importados > 0 && res.falhas.length === 0) form.reset();
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl border border-britishGreen/10 bg-britishGreenSoft/70 px-4 py-3 font-body text-sm leading-6 text-ink">
        Os originais são copiados para o arquivo privado do PORTARIA. O link do Drive fica apenas como referência histórica de proveniência.
      </div>

      {typeof resultado.importados === "number" && resultado.importados > 0 && (
        <div className="flex gap-3 rounded-2xl border border-success/15 bg-success/5 px-4 py-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <p className="font-body text-sm text-ink">{resultado.importados} original{resultado.importados === 1 ? "" : "is"} migrado{resultado.importados === 1 ? "" : "s"} para o PORTARIA.</p>
        </div>
      )}

      {resultado.falhas && resultado.falhas.length > 0 && (
        <div className="rounded-2xl border border-alert/15 bg-alert/5 px-4 py-3">
          <div className="flex gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-alert" />
            <div>
              <p className="font-body text-sm font-semibold text-alert">Alguns ficheiros não foram migrados.</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 font-body text-sm text-ink">{resultado.falhas.map((f) => <li key={f}>{f}</li>)}</ul>
            </div>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="links" className="mb-2 block font-body text-xs font-semibold uppercase tracking-[0.14em] text-oliveGray">Links Google Drive</label>
        <textarea
          id="links"
          name="links"
          rows={10}
          required
          placeholder="https://drive.google.com/file/d/.../view\nhttps://drive.google.com/file/d/.../view"
          className="w-full resize-y rounded-2xl border border-white/70 bg-white/75 px-4 py-3 font-body text-sm text-ink shadow-inner outline-none transition focus:border-britishGreen/40 focus:ring-4 focus:ring-britishGreen/10"
        />
        <p className="mt-2 font-body text-xs text-oliveGray">Um link por linha, máximo 20. O ficheiro só precisa de estar acessível durante a migração.</p>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-britishGreen px-5 py-3 font-body text-sm font-semibold text-white shadow-float transition hover:bg-britishGreenDeep disabled:cursor-not-allowed disabled:opacity-50">
          <CloudDownload className="h-4 w-4" />{pending ? "A migrar..." : "Migrar originais"}
        </button>
      </div>
    </form>
  );
}
