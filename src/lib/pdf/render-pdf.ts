import { renderToBuffer } from "@react-pdf/renderer";
import type { ReactElement } from "react";

// renderToBuffer()'s TS types expect a literal <Document> element; a
// wrapper component whose prop type is { d: SomeData } doesn't
// structurally match even though it renders one internally. Documented,
// safe cast — matches the existing pattern already used by
// certificates.ts and generatedDocuments.ts (CLAUDE.md gotcha #3).
export async function renderPdf(element: ReactElement): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(element as any);
}