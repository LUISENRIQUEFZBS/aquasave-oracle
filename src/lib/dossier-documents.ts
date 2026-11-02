// Plain module (no "use server"): constants shared by the server actions and the screen.
// The numeric codes are PROPOSED (the old app used text enums); confirm with ETIC if they ever need to match another system.

export const DOC_TYPE = {
  REQUEST_LETTER: 1,
  POWER_OF_ATTORNEY_CERTIFICATE: 2,
  MUNICIPAL_LICENSE: 3,
  FORM_GCFO0182: 4,
  SWORN_DECLARATION: 5,
  DELIVERY_LETTER: 6,
  DELIVERY_NOTIFICATION: 7,
} as const;

/** Manual checklist, in display order. Certificates and technical sheets are NOT here: they are computed. */
export const DOC_TYPES: { type: number; label: string; hint?: string }[] = [
  { type: DOC_TYPE.REQUEST_LETTER, label: "Carta de solicitud de pruebas" },
  { type: DOC_TYPE.POWER_OF_ATTORNEY_CERTIFICATE, label: "Certificado de vigencia de poder" },
  { type: DOC_TYPE.MUNICIPAL_LICENSE, label: "Licencia municipal" },
  { type: DOC_TYPE.FORM_GCFO0182, label: "Formulario GCFO0182" },
  { type: DOC_TYPE.SWORN_DECLARATION, label: "Declaración jurada" },
  { type: DOC_TYPE.DELIVERY_LETTER, label: "Carta de entrega de resultados" },
  { type: DOC_TYPE.DELIVERY_NOTIFICATION, label: "Notificación de entrega de resultados", hint: "Opcional: evidencia del envío por correo (por ejemplo, capturas del hilo de correos)." },
];

/** AQUA_EXPEDIENTE_DOCUMENTO.NESTADO (proposed, pending ETIC): 1 pending, 2 received, 3 not applicable, 4 void. */
export const DOC_STATUS = { PENDING: 1, RECEIVED: 2, NOT_APPLICABLE: 3 } as const;
export const DOC_STATUS_LABELS: Record<number, string> = { 1: "Pendiente", 2: "Recibido", 3: "No aplica" };

/** AQUA_DOCUMENTO_GENERADO.NTIPO */
export const GENERATED_TYPE = { RESPONSE_LETTER: 1, SWORN_DECLARATION: 2 } as const;
export const GENERATED_META: Record<number, { label: string; titleLines: string[]; signatureLabel: string; body: string[] }> = {
  1: {
    label: "Carta de respuesta",
    titleLines: ["CARTA DE RESPUESTA", "ENTREGA DE RESULTADOS"],
    signatureLabel: "Jefe de laboratorio",
    body: [
      "[PLACEHOLDER] Por medio de la presente, comunicamos a su representada los resultados de la evaluación técnica realizada a los productos ahorradores presentados bajo el expediente de la referencia.",
      "[PLACEHOLDER] Los resultados detallados de cada producto evaluado se encuentran disponibles en los certificados correspondientes, los cuales forman parte de la presente comunicación.",
      "[PLACEHOLDER] Quedamos atentos a cualquier consulta adicional que pudiera surgir respecto al proceso de evaluación realizado.",
    ],
  },
  2: {
    label: "Declaración jurada",
    titleLines: ["DECLARACIÓN JURADA"],
    signatureLabel: "Representante legal",
    body: [
      "[PLACEHOLDER] El que suscribe declara bajo juramento que la información y documentación presentada en el expediente de la referencia es veraz y se ajusta a la realidad de los hechos.",
      "[PLACEHOLDER] Asimismo, declara conocer que la presente declaración está sujeta a las responsabilidades administrativas, civiles y/o penales que correspondan en caso de falsedad de lo declarado.",
    ],
  },
};
