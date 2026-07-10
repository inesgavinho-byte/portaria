import {
  Document,
  Page,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import Html from "react-pdf-html";

/**
 * Geração de PDF de um Blueprint já preenchido, a partir do HTML do
 * template (o mesmo que se vê na pré-visualização).
 *
 * Usámos @react-pdf/renderer + react-pdf-html (JS puro) em vez de
 * Puppeteer/Chromium: não precisa de binário do browser, corre em
 * serverless (Netlify) sem os limites de tamanho/cold-start do
 * @sparticuz/chromium, e é suficiente para documentos de condomínio
 * (texto, formatação e tabelas simples). As fontes base do PDF
 * (Times-Roman) já cobrem a acentuação portuguesa.
 */

export type LogoPdf = { data: Buffer; format: "png" | "jpg" };

const styles = StyleSheet.create({
  page: {
    paddingVertical: 56,
    paddingHorizontal: 56,
    fontFamily: "Times-Roman",
    fontSize: 11.5,
    color: "#1A1A1A",
  },
  logo: {
    height: 46,
    marginBottom: 24,
    objectFit: "contain",
    alignSelf: "flex-start",
  },
});

// Estilos aplicados às tags do HTML dentro do PDF.
const htmlStylesheet = {
  h2: { fontSize: 15, marginTop: 6, marginBottom: 10, fontFamily: "Times-Bold" },
  h3: { fontSize: 13, marginTop: 6, marginBottom: 8, fontFamily: "Times-Bold" },
  p: { marginBottom: 7, lineHeight: 1.5 },
  li: { marginBottom: 3, lineHeight: 1.4 },
  strong: { fontFamily: "Times-Bold" },
  a: { color: "#1A1A1A", textDecoration: "none" },
  table: { width: "auto", marginVertical: 10 },
  td: {
    borderStyle: "solid",
    borderColor: "#8B8670",
    borderWidth: 0.75,
    padding: 5,
  },
  th: {
    borderStyle: "solid",
    borderColor: "#8B8670",
    borderWidth: 0.75,
    padding: 5,
    fontFamily: "Times-Bold",
    textAlign: "left",
  },
};

export async function renderBlueprintPdf({
  html,
  logo,
}: {
  html: string;
  logo: LogoPdf | null;
}): Promise<Buffer> {
  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        {logo ? (
          <Image
            style={styles.logo}
            src={{ data: logo.data, format: logo.format }}
          />
        ) : null}
        <Html stylesheet={htmlStylesheet} style={{ fontSize: 11.5 }}>
          {html}
        </Html>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
