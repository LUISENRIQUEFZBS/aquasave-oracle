import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { COLORS, styles as base, Header, Footer } from "./shared";

const styles = StyleSheet.create({
  ...base,
  placeholderBanner: {
    marginBottom: 12,
    padding: 8,
    borderRadius: 3,
    backgroundColor: "#fdf3e3",
    borderWidth: 1,
    borderColor: "#c98a2e",
  },
  placeholderText: {
    fontSize: 8,
    color: "#8a5a00",
    fontFamily: "Helvetica-Bold",
  },
  dateLine: { textAlign: "right", marginBottom: 16, fontSize: 9 },
  refLine: { marginBottom: 16, fontFamily: "Helvetica-Bold", fontSize: 9 },
  recipientBlock: { marginBottom: 16 },
  bodyParagraph: { marginBottom: 10, fontSize: 9.5, lineHeight: 1.5, textAlign: "justify" },
  signatureBlock: { marginTop: 60, alignItems: "center" },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: COLORS.text,
    width: 220,
    marginBottom: 4,
  },
});

export type LetterPdfData = {
  isDraft: boolean;
  sedapalLogo: Buffer | null;
  saverLogo: Buffer | null;
  titleLines: string[];
  generatedAt: Date;
  fileCode: string;
  client: { businessName: string; address: string };
  bodyParagraphs: string[];
  signatureLabel: string;
};

export default function LetterDocument({ d }: { d: LetterPdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Header
          isDraft={d.isDraft}
          sedapalLogo={d.sedapalLogo}
          saverLogo={d.saverLogo}
          titleLines={d.titleLines}
        />

        <View style={styles.placeholderBanner}>
          <Text style={styles.placeholderText}>
            PLANTILLA PROVISIONAL — este texto es un marcador de posición y debe reemplazarse
            por la redacción real antes de enviarse a un cliente.
          </Text>
        </View>

        <Text style={styles.dateLine}>
          Lima,{" "}
          {d.generatedAt.toLocaleDateString("es-PE", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            timeZone: "America/Lima",
          })}
        </Text>

        <Text style={styles.refLine}>Ref.: Expediente {d.fileCode}</Text>

        <View style={styles.recipientBlock}>
          <Text>Señores</Text>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>{d.client.businessName}</Text>
          <Text>{d.client.address}</Text>
        </View>

        {d.bodyParagraphs.map((p, i) => (
          <Text key={i} style={styles.bodyParagraph}>
            {p}
          </Text>
        ))}

        <View style={styles.signatureBlock}>
          <View style={styles.signatureLine} />
          <Text style={{ fontSize: 9 }}>{d.signatureLabel}</Text>
        </View>

        <Footer />
      </Page>
    </Document>
  );
}