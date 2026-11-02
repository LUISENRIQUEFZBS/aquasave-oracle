import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { ScoreBracket } from "@/lib/certification-criteria";

export const COLORS = {
  primary: "#157a8a",
  primaryDark: "#0f5c68",
  primaryWash: "#dcedf0",
  withWash: "#e1f0ec",
  withoutWash: "#f3efe6",
  withoutDark: "#c9ad82",
  text: "#16232a",
  muted: "#5c6b72",
  border: "#d9e1e3",
  bg: "#f6f8f9",
  success: "#2f8b57",
  danger: "#c1443c",
};

export const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: COLORS.text,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 8,
    marginBottom: 4,
  },
  logoSlot: { width: 70, height: 34, justifyContent: "center", alignItems: "center" },
  logoImg: { maxWidth: 70, maxHeight: 34, objectFit: "contain" },
  titleBox: { flex: 1, textAlign: "center" },
  title: { fontSize: 12, fontFamily: "Helvetica-Bold", color: COLORS.text },
  draftBadge: {
    fontSize: 7.5,
    color: "#fff",
    backgroundColor: COLORS.danger,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 3,
    fontFamily: "Helvetica-Bold",
    alignSelf: "center",
    marginTop: 3,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    fontSize: 9,
  },
  metaLabel: { fontFamily: "Helvetica-Bold" },
  section: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primaryDark,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 2,
  },
  row: { flexDirection: "row", marginBottom: 2 },
  label: { width: 90, color: COLORS.muted, fontFamily: "Helvetica-Bold" },
  value: { flex: 1 },
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  tr: { flexDirection: "row" },
  th: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  td: {
    flex: 1,
    padding: 4,
    fontSize: 8,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tdLast: { borderRightWidth: 0 },
  photoBox: {
    width: 220,
    height: 220,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    alignSelf: "center",
    marginTop: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: COLORS.muted,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 4,
  },
  signRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 40 },
  signBox: { alignItems: "center", width: 180 },
  signLine: { borderTopWidth: 1, borderTopColor: COLORS.text, width: "100%", marginBottom: 3 },
});

export function fmt(n: number | null | undefined, decimals = 2) {
  return n === null || n === undefined || isNaN(n) ? "—" : n.toFixed(decimals);
}

export function Header({
  isDraft,
  sedapalLogo,
  saverLogo,
  titleLines = ["CERTIFICADO DE EVALUACIÓN DE SELLO", "DE PRODUCTO AHORRADOR"],
  draftLabel = "VISTA PREVIA",
}: {
  isDraft: boolean;
  sedapalLogo: Buffer | null;
  saverLogo: Buffer | null;
  titleLines?: string[];
  draftLabel?: string;
}) {
  return (
    <View style={styles.headerBar}>
      <View style={styles.logoSlot}>
        {sedapalLogo && (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={sedapalLogo} style={styles.logoImg} />
        )}
      </View>
      <View style={styles.titleBox}>
        {titleLines.map((line) => (
          <Text style={styles.title} key={line}>
            {line}
          </Text>
        ))}
        {isDraft && <Text style={styles.draftBadge}>{draftLabel}</Text>}
      </View>
      <View style={styles.logoSlot}>
        {saverLogo && (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={saverLogo} style={styles.logoImg} />
        )}
      </View>
    </View>
  );
}

export function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text>Aquasave — Certificado generado por sistema</Text>
      <Text render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} de ${totalPages}`} />
    </View>
  );
}

export function CriteriaTable({
  title,
  table,
  active,
}: {
  title: string;
  table: ScoreBracket[];
  active: ScoreBracket | null;
}) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", marginBottom: 2 }}>{title}</Text>
      <View style={styles.table}>
        <View style={styles.tr}>
          <Text style={[styles.th, { flex: 2 }]}>Condición</Text>
          <Text style={styles.th}>Puntos</Text>
          <Text style={[styles.th, styles.tdLast]}>Resultado</Text>
        </View>
        {table.map((b, i) => {
          const isActive = active?.label === b.label;
          const last = i === table.length - 1;
          return (
            <View style={styles.tr} key={b.label}>
              <Text style={[styles.td, { flex: 2 }, last ? { borderBottomWidth: 0 } : undefined]}>
                {b.label}
              </Text>
              <Text style={[styles.td, last ? { borderBottomWidth: 0 } : undefined]}>{b.points}</Text>
              <Text
                style={[
                  styles.td,
                  styles.tdLast,
                  last ? { borderBottomWidth: 0 } : undefined,
                  isActive ? { fontFamily: "Helvetica-Bold", color: COLORS.primaryDark } : undefined,
                ]}
              >
                {isActive ? `${b.points} puntos` : "-"}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export type TrazabilidadRow = {
  label: string; // "Medidor de agua", "Manómetro", "Cronómetro"
  code: string | null; // instrument code — null if none was selected
  verificationDocumentName: string | null;
  calibratedAt: Date | null;
};

export function TrazabilidadTable({ rows }: { rows: TrazabilidadRow[] }) {
  return (
    <View>
      <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", marginBottom: 2 }}>
        Trazabilidad
      </Text>
      <View style={styles.table}>
        <View style={styles.tr}>
          <Text style={styles.th}>Instrumento</Text>
          <Text style={styles.th}>Documento de verificación</Text>
          <Text style={[styles.th, styles.tdLast]}>Fecha de verificación</Text>
        </View>
        {rows.map((row, i) => {
          const last = i === rows.length - 1;
          return (
            <View style={styles.tr} key={row.label}>
              <Text style={[styles.td, last ? { borderBottomWidth: 0 } : undefined]}>
                {row.code ? `${row.label} N° ${row.code}` : row.label}
              </Text>
              <Text style={[styles.td, last ? { borderBottomWidth: 0 } : undefined]}>
                {row.verificationDocumentName || "—"}
              </Text>
              <Text style={[styles.td, styles.tdLast, last ? { borderBottomWidth: 0 } : undefined]}>
                {row.calibratedAt
                  ? row.calibratedAt.toLocaleDateString("es-PE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      timeZone: "America/Lima",
                    })
                  : "—"}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}