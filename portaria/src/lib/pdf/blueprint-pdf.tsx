import { Document, Page, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import Html from "react-pdf-html";

/**
 * Geração do PDF de um Blueprint a partir do HTML completo do documento
 * (cabeçalho + corpo + assinaturas + rodapé) já composto em
 * documento-blueprint.ts. O logótipo vem embutido como data URI.
 *
 * Usámos @react-pdf/renderer + react-pdf-html (JS puro) em vez de
 * Puppeteer/Chromium: sem binário do browser, fiável em serverless
 * (Netlify) e suficiente para documentos de condomínio. As fontes base
 * (Times-Roman) cobrem a acentuação portuguesa.
 */

const styles = StyleSheet.create({
  page: {
    paddingVertical: 48,
    paddingHorizontal: 52,
    fontFamily: "Times-Roman",
    fontSize: 11,
    color: "#1A1A1A",
  },
});

// Estilos das tags do corpo dentro do PDF. O cabeçalho/rodapé usam
// estilos inline (lidos pelo react-pdf-html).
const htmlStylesheet = {
  h2: { fontSize: 14, marginTop: 4, marginBottom: 8, fontFamily: "Times-Bold" },
  h3: { fontSize: 12, marginTop: 4, marginBottom: 6, fontFamily: "Times-Bold" },
  p: { marginBottom: 7, lineHeight: 1.5, textAlign: "justify" },
  li: { marginBottom: 3, lineHeight: 1.4 },
  strong: { fontFamily: "Times-Bold" },
  a: { color: "#1A1A1A", textDecoration: "none" },
  table: { width: "auto", marginVertical: 8 },
  th: {
    border: "0.75pt solid #8B8670",
    padding: 4,
    backgroundColor: "#EDEAE0",
    fontFamily: "Times-Bold",
    fontSize: 10,
    textAlign: "left",
  },
  td: { border: "0.75pt solid #8B8670", padding: 4, fontSize: 10 },
};

export async function renderBlueprintPdf(html: string): Promise<Buffer> {
  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Html stylesheet={htmlStylesheet} style={{ fontSize: 11 }}>
          {html}
        </Html>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
