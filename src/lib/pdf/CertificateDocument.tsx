import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import {
  SAVINGS_SCORE_TABLE,
  WARRANTY_SCORE_TABLE,
  EFFICIENCY_SCORE_TABLE,
  MAX_SCORE,
  PASSING_SCORE,
  type ScoreBracket,
} from "@/lib/certification-criteria";
import { COLORS, styles as base, fmt, Header, Footer, CriteriaTable, TrazabilidadTable, type TrazabilidadRow } from "./shared";

const styles = StyleSheet.create({
  ...base,
  chartWrap: { marginTop: 8, marginBottom: 4 },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  barLabel: { width: 90, fontSize: 7.5, color: COLORS.muted },
  barTrack: {
    flex: 1,
    height: 12,
    backgroundColor: COLORS.bg,
    borderRadius: 2,
    flexDirection: "row",
  },
  barFillRef: { height: 12, backgroundColor: COLORS.withoutDark, borderRadius: 2 },
  barFillProduct: { height: 12, backgroundColor: COLORS.primary, borderRadius: 2 },
  barValue: { width: 36, fontSize: 7.5, marginLeft: 4 },

  compTable: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  compRow: { flexDirection: "row" },
  compRowLast: { borderTopWidth: 1, borderTopColor: COLORS.border },
  compThCell: {
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  compThText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 6.3,
    lineHeight: 1.15,
    textAlign: "center",
  },
  compTdCell: {
    justifyContent: "center",
    alignItems: "center",
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  compTdText: { fontSize: 8, textAlign: "center" },
  compNoRightBorder: { borderRightWidth: 0 },
  compHighlightText: { fontFamily: "Helvetica-Bold", color: COLORS.primaryDark },
});

type CompColumn = {
  key: string;
  header: string;
  flex: number;
  group: "neutral" | "with" | "without" | "highlight";
};

const COMPACT_COLUMNS: CompColumn[] = [
  { key: "fecha", header: "Fecha de\nensayo", flex: 1.05, group: "neutral" },
  { key: "presion", header: "Presión\n(Bar)", flex: 0.6, group: "neutral" },
  { key: "volProd", header: "Vol. con\nahorr. (L)", flex: 0.85, group: "with" },
  { key: "consProd", header: "Consumo (%)\ncon ahorr.", flex: 0.9, group: "with" },
  { key: "volSin", header: "Vol. sin\nahorr. (L)", flex: 0.85, group: "without" },
  { key: "consSin", header: "Consumo (%)\nsin ahorr.", flex: 0.9, group: "without" },
  { key: "limite", header: "Límite\nmáx. (%)", flex: 0.75, group: "neutral" },
  { key: "ahorro", header: "% de\nahorro", flex: 0.75, group: "highlight" },
  { key: "conAh", header: "Tiempo con\nahorr. (s)", flex: 0.9, group: "with" },
  { key: "sinAh", header: "Tiempo sin\nahorr. (s)", flex: 0.9, group: "without" },
  { key: "pctTiempo", header: "Efect.\ntiempo (%)", flex: 0.75, group: "neutral" },
  { key: "garantia", header: "Garantía\n(años)", flex: 0.65, group: "neutral" },
];

const GROUP_BG: Record<CompColumn["group"], { backgroundColor: string }> = {
  neutral: { backgroundColor: COLORS.bg },
  with: { backgroundColor: COLORS.withWash },
  without: { backgroundColor: COLORS.withoutWash },
  highlight: { backgroundColor: COLORS.primaryWash },
};

function ComparativeTestTable({
  fecha,
  withVol,
  withoutVol,
  savingsPercent,
  withTime,
  withoutTime,
  timePercentChange,
  warrantyYears,
}: {
  fecha: string;
  withVol: number | null;
  withoutVol: number | null;
  savingsPercent: number | null;
  withTime: number | null;
  withoutTime: number | null;
  timePercentChange: number | null;
  warrantyYears: number | null;
}) {
  const withPercent =
    withoutVol && withVol !== null && withoutVol !== 0 ? (withVol / withoutVol) * 100 : null;

  const dataValues: Record<string, string> = {
    fecha,
    presion: "—",
    volProd: fmt(withVol),
    consProd: fmt(withPercent),
    volSin: fmt(withoutVol),
    consSin: "100.00",
    limite: ">= 30",
    ahorro: fmt(savingsPercent),
    conAh: fmt(withTime),
    sinAh: fmt(withoutTime),
    pctTiempo: fmt(timePercentChange),
    garantia: warrantyYears !== null ? String(warrantyYears) : "—",
  };

  return (
    <View style={styles.compTable}>
      <View style={[styles.compRow, { height: 30 }]}>
        {COMPACT_COLUMNS.map((c, i) => (
          <View
            key={c.key}
            style={[
              styles.compThCell,
              GROUP_BG[c.group],
              { flex: c.flex },
              i === COMPACT_COLUMNS.length - 1 ? styles.compNoRightBorder : undefined,
            ]}
          >
            <Text style={styles.compThText}>{c.header}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.compRow, styles.compRowLast, { height: 26 }]}>
        {COMPACT_COLUMNS.map((c, i) => (
          <View
            key={c.key}
            style={[
              styles.compTdCell,
              c.group === "highlight" ? GROUP_BG.highlight : undefined,
              { flex: c.flex },
              i === COMPACT_COLUMNS.length - 1 ? styles.compNoRightBorder : undefined,
            ]}
          >
            <Text style={[styles.compTdText, c.group === "highlight" ? styles.compHighlightText : undefined]}>
              {dataValues[c.key]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export type CertificatePdfData = {
  certificateNumber: string;
  isDraft: boolean;
  issuedAt: Date;
  client: { businessName: string; address: string };
  product: {
    code: string;
    description: string;
    brand: string | null;
    manufacturer: string | null;
    originCountry: string | null;
    use: string | null;
    warrantyYears: number | null;
  };
  evaluatedAt: Date;
  photoBuffer: Buffer | null;
  sedapalLogo: Buffer | null;
  saverLogo: Buffer | null;
  data: {
    withoutDevice: { avgVolumeL: number | null; avgTiempoS: number | null };
    withDevice: { avgVolumeL: number | null; avgTiempoS: number | null };
    percentOfVolume: number | null;
    savingsPercent: number | null;
    timePercentChange: number | null;
    score: {
      savingsPoints: number;
      warrantyPoints: number;
      efficiencyPoints: number;
      total: number;
    };
  };
  result: "CONFORME" | "NO_CONFORME";
  overrideReason: string | null;
  activeBrackets: {
    savings: ScoreBracket | null;
    warranty: ScoreBracket | null;
    efficiency: ScoreBracket | null;
  };
  validityNote: string;
  trazabilidad: TrazabilidadRow[];
};

export default function CertificateDocument({ d }: { d: CertificatePdfData }) {
  const withoutVol = d.data.withoutDevice.avgVolumeL;
  const withVol = d.data.withDevice.avgVolumeL;
  const withoutPercent = 100;
  const withPercent = d.data.percentOfVolume;

  return (
    <Document>
      {/* Page 1 */}
      <Page size="A4" style={styles.page}>
        <Header isDraft={d.isDraft} sedapalLogo={d.sedapalLogo} saverLogo={d.saverLogo} />

        <View style={styles.metaRow}>
          <Text>
            <Text style={styles.metaLabel}>Informe N°: </Text>
            {d.certificateNumber}
          </Text>
          <Text>
            <Text style={styles.metaLabel}>Fecha de emisión: </Text>
            {d.issuedAt.toLocaleDateString("es-PE", { timeZone: "America/Lima" })}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Datos del cliente / solicitante</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Razón social:</Text>
            <Text style={styles.value}>{d.client.businessName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Dirección:</Text>
            <Text style={styles.value}>{d.client.address}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Datos del producto ahorrador</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Marca:</Text>
            <Text style={styles.value}>{d.product.brand || "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Código:</Text>
            <Text style={styles.value}>{d.product.code}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Descripción:</Text>
            <Text style={styles.value}>{d.product.description}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Fabricante:</Text>
            <Text style={styles.value}>{d.product.manufacturer || "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Procedencia:</Text>
            <Text style={styles.value}>{d.product.originCountry || "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Uso:</Text>
            <Text style={styles.value}>{d.product.use || "—"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Lugar de verificación de productos ahorradores</Text>
          <Text>Dirección: Calle Medidores 121 - El Agustino - Lima</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Documento de referencia</Text>
          <Text>Administración del Sello de Producto Ahorrador de Agua GCPR136</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            5. Ensayo comparativo de producto ahorrador vs producto no ahorrador
          </Text>
          <ComparativeTestTable
            fecha={d.evaluatedAt.toLocaleDateString("es-PE", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              timeZone: "America/Lima",
            })}
            withVol={withVol}
            withoutVol={withoutVol}
            savingsPercent={d.data.savingsPercent}
            withTime={d.data.withDevice.avgTiempoS}
            withoutTime={d.data.withoutDevice.avgTiempoS}
            timePercentChange={d.data.timePercentChange}
            warrantyYears={d.product.warrantyYears}
          />

          <View style={styles.chartWrap}>
            <View style={styles.barRow}>
              <Text style={styles.barLabel}>Sin producto ahorrador</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFillRef, { width: `${withoutPercent}%` }]} />
              </View>
              <Text style={styles.barValue}>{withoutPercent.toFixed(2)}%</Text>
            </View>
            <View style={styles.barRow}>
              <Text style={styles.barLabel}>Producto ahorrador</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFillProduct,
                    { width: `${Math.min(withPercent ?? 0, 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.barValue}>{fmt(withPercent)}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Resultados</Text>
          <View style={styles.table}>
            <View style={styles.tr}>
              <Text style={styles.th}>Porcentaje de ahorro</Text>
              <Text style={styles.th}>Garantía del producto</Text>
              <Text style={styles.th}>Eficiencia en el uso</Text>
              <Text style={styles.th}>Puntaje alcanzado</Text>
              <Text style={[styles.th, styles.tdLast]}>Resultado final</Text>
            </View>
            <View style={styles.tr}>
              <Text style={[styles.td, { borderBottomWidth: 0 }]}>{d.data.score.savingsPoints}</Text>
              <Text style={[styles.td, { borderBottomWidth: 0 }]}>{d.data.score.warrantyPoints}</Text>
              <Text style={[styles.td, { borderBottomWidth: 0 }]}>{d.data.score.efficiencyPoints}</Text>
              <Text style={[styles.td, { borderBottomWidth: 0, fontFamily: "Helvetica-Bold" }]}>
                {d.data.score.total}/{MAX_SCORE}
              </Text>
              <Text
                style={[
                  styles.td,
                  styles.tdLast,
                  {
                    borderBottomWidth: 0,
                    fontFamily: "Helvetica-Bold",
                    color: d.result === "CONFORME" ? COLORS.success : COLORS.danger,
                  },
                ]}
              >
                {d.result === "CONFORME" ? "Conforme" : "No conforme"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Observaciones generales</Text>
          <Text>
            La evaluación técnica se realizó conforme a los criterios de evaluación vigentes
            (Anexo, sección 10).
            {d.overrideReason ? ` Nota del evaluador: ${d.overrideReason}` : ""}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Vigencia del certificado</Text>
          <Text>{d.validityNote}</Text>
        </View>

        <View style={styles.signRow}>
          <View style={styles.signBox}>
            <View style={styles.signLine} />
            <Text>Evaluador responsable</Text>
          </View>
          <View style={styles.signBox}>
            <View style={styles.signLine} />
            <Text>Jefe de laboratorio</Text>
          </View>
        </View>

        <Footer />
      </Page>

      {/* Page 2 — Photo */}
      <Page size="A4" style={styles.page}>
        <Header isDraft={d.isDraft} sedapalLogo={d.sedapalLogo} saverLogo={d.saverLogo} />
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>9. Foto del producto ahorrador</Text>
        <View style={styles.photoBox}>
          {d.photoBuffer ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={d.photoBuffer} style={{ width: 218, height: 218, objectFit: "contain" }} />
          ) : (
            <Text style={{ color: COLORS.muted, fontSize: 8 }}>Sin foto</Text>
          )}
        </View>
        <Footer />
      </Page>

      {/* Page 3 — Anexo */}
      <Page size="A4" style={styles.page}>
        <Header isDraft={d.isDraft} sedapalLogo={d.sedapalLogo} saverLogo={d.saverLogo} />
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>10. Anexo — Criterios de evaluación</Text>
        <Text style={{ marginBottom: 8, fontSize: 8.5 }}>
          Para la evaluación de los productos ahorradores se tiene en cuenta las siguientes
          condiciones:
        </Text>

        <CriteriaTable
          title="Tabla 1 — Porcentaje de ahorro (50 puntos)"
          table={SAVINGS_SCORE_TABLE}
          active={d.activeBrackets.savings}
        />
        <CriteriaTable
          title="Tabla 2 — Garantía del producto (40 puntos)"
          table={WARRANTY_SCORE_TABLE}
          active={d.activeBrackets.warranty}
        />
        <CriteriaTable
          title="Tabla 3 — Eficiencia en el uso (10 puntos)"
          table={EFFICIENCY_SCORE_TABLE}
          active={d.activeBrackets.efficiency}
        />

        <View style={{ marginTop: 6, marginBottom: 12 }}>
          <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", marginBottom: 2 }}>
            Tabla de puntaje máximo y mínimo
          </Text>
          <View style={styles.table}>
            <View style={styles.tr}>
              <Text style={styles.th}>Puntaje máximo</Text>
              <Text style={styles.th}>Mínimo de aprobación</Text>
              <Text style={[styles.th, styles.tdLast]}>Desaprobado</Text>
            </View>
            <View style={styles.tr}>
              <Text style={[styles.td, { borderBottomWidth: 0 }]}>{MAX_SCORE}</Text>
              <Text style={[styles.td, { borderBottomWidth: 0 }]}>{PASSING_SCORE}</Text>
              <Text style={[styles.td, styles.tdLast, { borderBottomWidth: 0 }]}>
                ≤{PASSING_SCORE - 1}
              </Text>
            </View>
          </View>
        </View>

        <TrazabilidadTable rows={d.trazabilidad} />

        <Footer />
      </Page>
    </Document>
  );
}