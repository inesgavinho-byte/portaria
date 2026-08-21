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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-l-4 border-ink bg-ink/5 px-4 py-3 font-body text-sm text-ink">
        Os originais são copiados para o arquivo privado do PORTARIA. O link Drive fica apenas como referência de proveniência e deixa de ser necessário para consultar o documento.
      </div>

      {typeof resultado.importados === "number" && resultado.importados > 0 && (
        <div className="flex gap-2 border-l-4 border-success bg-success/5 px-4 py-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
          <p className="font-body text-sm text-ink">{resultado.importados} original{resultado.importados === 1 ? "" : "is"} migrado{resultado.importados === 1 ? "" : "s"} para o PORTARIA.</p>
        </div>
      )}

      {resultado.falhas && resultado.falhas.length > 0 && (
        <div className="border-l-4 border-alert bg-alert/5 px-4 py-3">
          <div className="flex gap-2"><TriangleAlert className="mt-0.5 h-5 w-5 text-alert" /><div>
            <p className="font-body text-sm text-alert">Alguns ficheiros não foram migrados.</p>
            <ul className="mt-2 list-disc pl-5 font-body text-sm text-ink">{resultado.falhas.map((f) => <li key={f}>{f}</li>)}</ul>
          </div></div>
        </div>
      )}

      <div>
        <label htmlFor="links" className="mb-2 block font-body text-xs uppercase tracking-widest text-oliveGray">Links Google Drive</label>
        <textarea id="links" name="links" rows={10} required placeholder="https://drive.google.com/file/d/.../view\nhttps://drive.google.com/file/d/.../view" className="w-full resize-y border border-warmBeige/40 bg-paper px-4 py-3 font-body text-sm text-ink focus:border-warmBeige focus:outline-none" />
        <p className="mt-2 font-body text-xs text-oliveGray">Um link por linha, máximo 20. O ficheiro tem de estar acessível por link durante a migração.</p>
      </div>

      <button type="submit" disabled={pending} className="inline-flex items-center gap-2 bg-ink px-8 py-3 font-body text-sm uppercase tracking-widest text-paper hover:bg-oliveGray disabled:opacity-50">
        <CloudDownload className="h-4 w-4" />{pending ? "A migrar..." : "Migrar originais"}
      </button>
    </form>
  );
}
