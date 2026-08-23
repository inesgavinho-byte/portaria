"use client";

import { Printer } from "lucide-react";

export function RelatorioFornecedorImprimir() {
  return <button type="button" onClick={() => window.print()} className="no-print inline-flex items-center gap-2 border border-britishGreen/25 bg-paper px-4 py-2.5 font-body text-xs font-semibold text-britishGreen hover:bg-britishGreenSoft"><Printer className="h-3.5 w-3.5" /> Exportar PDF</button>;
}
