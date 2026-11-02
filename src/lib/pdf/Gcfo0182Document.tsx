import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { COLORS, styles as base } from "./shared";
import { GCFO0182_TERMS_SECTIONS } from "@/lib/gcfo0182-terms";
import type { Gcfo0182PdfData, Gcfo0182ProductData } from "./prepare-gcfo0182-data";
// Fixed document-control metadata — these come from the real GCFO0182
// template itself (verified against the source Excel's header cells:
// Código/Revisión/Aprobado/Fecha), not from submission data. Update
// here if SEDAPAL ever issues a new revision of the actual form.
const DOC_CODIGO = "GCFO0182";
const DOC_REVISION = "03";
const DOC_APROBADO = "J-EGCM";
const DOC_FECHA = "2026.01.09";
const DOC_TITLE = "Requisitos para Fabricantes, Distribuidores o Importadores de productos ahorradores";
const styles = StyleSheet.create({
  ...base,
  productCard: {
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  productPhotoBox: {
    width: 72,
    height: 72,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 3,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  productPhotoImg: { width: 72, height: 72, objectFit: "cover", borderRadius: 3 },
  productPhotoPlaceholder: { fontSize: 6.5, color: COLORS.muted, textAlign: "center" },
  productCode: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primaryDark,
    marginBottom: 1,
  },
  productDescription: { fontSize: 9, marginBottom: 3 },
  productFieldsGrid: { flexDirection: "row", flexWrap: "wrap" },
  productField: { width: "50%", marginBottom: 2, fontSize: 8 },
  productFieldLabel: { color: COLORS.muted, fontFamily: "Helvetica-Bold" },
  datasheetOk: { fontSize: 7.5, color: COLORS.success, marginTop: 2 },
  datasheetMissing: { fontSize: 7.5, color: COLORS.danger, marginTop: 2 },
  termsSectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primaryDark,
    marginBottom: 4,
    marginTop: 8,
  },
  termsParagraph: { fontSize: 7.5, lineHeight: 1.4, textAlign: "justify", marginBottom: 6 },
  acceptedBadge: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.success,
  },
  notAcceptedBadge: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.danger,
  },
  // --- Document-control header (matches the real GCFO0182 template's
  // own header structure: logo left, "FORMULARIO" + title center,
  // Código/Revisión/Aprobado/Fecha/Página table right) ---
  // --- Document-control header: a real bordered grid, matching the
  // actual GCFO0182 template exactly — outer border, vertical dividers
  // between the 3 columns (logo / title / metadata), a horizontal
  // divider splitting "FORMULARIO" from the title (both centered), and
  // a horizontal divider between each metadata row.
  docHeader: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  docHeaderLogoCol: {
    width: 125,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  docHeaderLogoImg: { maxWidth: 76, maxHeight: 40, objectFit: "contain" },
  docHeaderTitleCol: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    justifyContent: "center",
  },
  docHeaderEyebrowRow: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  docHeaderEyebrow: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    textAlign: "center",
  },
  docHeaderTitleRow: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  docHeaderTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    textAlign: "center",
    lineHeight: 1.3,
  },
  // Same width as docHeaderLogoCol — symmetric outer columns, title
  // column takes whatever's left in the middle. No internal borders
  // between rows here (dropped per feedback) — just a tight, closely
  // packed label:value list instead of a busy inner grid.
  docHeaderMetaCol: {
    width: 125,
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  docHeaderMetaRow: {
    flexDirection: "row",
    paddingVertical: 0.75,
  },
  docHeaderMetaLabel: { width: 42, fontSize: 7, color: COLORS.text },
  docHeaderMetaColon: { width: 6, fontSize: 7, color: COLORS.text },
  docHeaderMetaValue: { flex: 1, fontSize: 7, fontFamily: "Helvetica-Bold", color: COLORS.text },
  docFooter: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 7,
    color: COLORS.muted,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 4,
  },
});
function DocumentHeader({ sedapalLogo }: { sedapalLogo: Buffer | null }) {
  return (
    <View style={styles.docHeader} fixed>
      <View style={styles.docHeaderLogoCol}>
        {sedapalLogo && (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={sedapalLogo} style={styles.docHeaderLogoImg} />
        )}
      </View>
      <View style={styles.docHeaderTitleCol}>
        <View style={styles.docHeaderEyebrowRow}>
          <Text style={styles.docHeaderEyebrow}>FORMULARIO</Text>
        </View>
        <View style={styles.docHeaderTitleRow}>
          <Text style={styles.docHeaderTitle}>{DOC_TITLE}</Text>
        </View>
      </View>
      <View style={styles.docHeaderMetaCol}>
        <DocMetaRow label="Código" value={DOC_CODIGO} />
        <DocMetaRow label="Revisión" value={DOC_REVISION} />
        <DocMetaRow label="Aprobado" value={DOC_APROBADO} />
        <DocMetaRow label="Fecha" value={DOC_FECHA} />
        <View style={styles.docHeaderMetaRow}>
          <Text style={styles.docHeaderMetaLabel}>Página</Text>
          <Text style={styles.docHeaderMetaColon}>:</Text>
          <Text
            style={styles.docHeaderMetaValue}
            render={({ pageNumber, totalPages }) => `${pageNumber} de ${totalPages}`}
          />
        </View>
      </View>
    </View>
  );
}
function DocumentFooter() {
  return (
    <View style={styles.docFooter} fixed>
      <Text>GCPR136</Text>
    </View>
  );
}
function DocMetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.docHeaderMetaRow}>
      <Text style={styles.docHeaderMetaLabel}>{label}</Text>
      <Text style={styles.docHeaderMetaColon}>:</Text>
      <Text style={styles.docHeaderMetaValue}>{value}</Text>
    </View>
  );
}
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || "—"}</Text>
    </View>
  );
}
function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Lima",
  });
}
export default function Gcfo0182Document({ d }: { d: Gcfo0182PdfData }) {
  return (
    <Document>
      {/* ---- Page 1: Datos generales ---- */}
      <Page size="A4" style={styles.page}>
        <DocumentHeader sedapalLogo={d.sedapalLogo} />
        <View style={styles.metaRow}>
          <Text>
            <Text style={styles.metaLabel}>Solicitud: </Text>
            {d.submissionCode}
          </Text>
          <Text>
            <Text style={styles.metaLabel}>Generado: </Text>
            {fmtDate(d.generatedAt)}
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del cliente o solicitante</Text>
          <InfoRow label="Razón social" value={d.client.businessName} />
          <InfoRow label="RUC" value={d.client.taxId ?? "—"} />
          <InfoRow label="N° Ficha Registral" value={d.generalInfo?.registryFileNumber ?? ""} />
          <InfoRow label="Dirección" value={d.generalInfo?.address ?? ""} />
          <InfoRow label="Distrito" value={d.generalInfo?.district ?? ""} />
          <InfoRow label="Provincia" value={d.generalInfo?.province ?? ""} />
          <InfoRow label="Departamento" value={d.generalInfo?.department ?? ""} />
          <InfoRow label="Representante legal" value={d.generalInfo?.legalRepresentativeName ?? ""} />
          <InfoRow label="Teléfono" value={d.generalInfo?.companyPhone ?? ""} />
          <InfoRow label="Correo" value={d.generalInfo?.companyEmail ?? ""} />
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sede</Text>
          <InfoRow label="Sede" value={d.location.label || d.location.address} />
          <InfoRow label="Dirección" value={d.location.address} />
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos de la Persona de contacto</Text>
          <InfoRow label="Nombres" value={d.generalInfo?.contactName ?? ""} />
          <InfoRow label="Teléfono" value={d.generalInfo?.contactPhone ?? ""} />
          <InfoRow label="Correo" value={d.generalInfo?.contactEmail ?? ""} />
        </View>
        {d.generalInfo?.observations && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observaciones</Text>
            <Text style={{ fontSize: 9 }}>{d.generalInfo.observations}</Text>
          </View>
        )}
        {d.showTermsAcceptance && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Condiciones generales del servicio</Text>
            {d.generalInfo?.termsAcceptedAt ? (
              <Text style={styles.acceptedBadge}>
                Aceptadas el {fmtDate(d.generalInfo.termsAcceptedAt)}
              </Text>
            ) : (
              <Text style={styles.notAcceptedBadge}>No aceptadas</Text>
            )}
          </View>
        )}
        <DocumentFooter />
      </Page>
      {/* ---- Middle: one Page element, auto-paginates across as many
          physical pages as the product count needs ---- */}
      <Page size="A4" style={styles.page}>
        <DocumentHeader sedapalLogo={d.sedapalLogo} />
        <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>
          Especificaciones de los productos
        </Text>
        {d.products.map((p, i) => (
          <ProductCard key={i} product={p} />
        ))}
        <DocumentFooter />
      </Page>
      {/* ---- Last: Condiciones generales — same auto-pagination
          approach, this text is long enough to span 2-3 physical pages
          on its own ---- */}
      <Page size="A4" style={styles.page}>
        <DocumentHeader sedapalLogo={d.sedapalLogo} />
        <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>
          Condiciones generales del servicio
        </Text>
        {GCFO0182_TERMS_SECTIONS.map((section) => (
          <View key={section.title}>
            <Text style={styles.termsSectionTitle}>{section.title}</Text>
            {section.body.split("\n\n").map((para, i) => (
              <Text key={i} style={styles.termsParagraph}>
                {para}
              </Text>
            ))}
          </View>
        ))}
        <DocumentFooter />
      </Page>
    </Document>
  );
}
function ProductCard({ product }: { product: Gcfo0182ProductData }) {
  return (
    <View style={styles.productCard} wrap={false}>
      <View style={styles.productPhotoBox}>
        {product.photoBuffer ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={product.photoBuffer} style={styles.productPhotoImg} />
        ) : product.photoSkippedDueToLimit ? (
          <Text style={styles.productPhotoPlaceholder}>Ver foto en{"\n"}el certificado</Text>
        ) : (
          <Text style={styles.productPhotoPlaceholder}>Sin foto</Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.productCode}>{product.submittedCode || "— sin código —"}</Text>
        <Text style={styles.productDescription}>{product.description}</Text>
        <View style={styles.productFieldsGrid}>
          <Field label="Tipo" value={product.productTypeName} />
          <Field label="Modelo" value={product.model} />
          <Field label="Marca" value={product.brandNameSubmitted} />
          <Field label="Fabricante" value={product.manufacturerNameSubmitted} />
          <Field label="Procedencia" value={product.originCountryNameSubmitted} />
          <Field label="Uso" value={product.use} />
          <Field
            label="Garantía"
            value={product.warrantyYears != null ? `${product.warrantyYears} años` : null}
          />
        </View>
        {product.hasDatasheet ? (
          <Text style={styles.datasheetOk}>Ficha técnica adjunta</Text>
        ) : (
          <Text style={styles.datasheetMissing}>Sin ficha técnica</Text>
        )}
      </View>
    </View>
  );
}
function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <Text style={styles.productField}>
      <Text style={styles.productFieldLabel}>{label}: </Text>
      {value || "—"}
    </Text>
  );
}