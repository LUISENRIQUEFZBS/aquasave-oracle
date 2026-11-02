import { User } from "./User";
import { ClientUser } from "./ClientUser";
import { Client } from "./Client";
import { Site } from "./Site";
import { ProductType } from "./ProductType";
import { ReferenceVariant } from "./ReferenceVariant";
import { Brand } from "./Brand";
import { Manufacturer } from "./Manufacturer";
import { OriginCountry } from "./OriginCountry";
import { Dossier } from "./Dossier";
import { DossierDocument } from "./DossierDocument";
import { GeneratedDocument } from "./GeneratedDocument";
import { Product } from "./Product";
import { ProductVariant } from "./ProductVariant";
import { Reception } from "./Reception";
import { Instrument } from "./Instrument";
import { Calibration } from "./Calibration";
import { Evaluation } from "./Evaluation";
import { Certificate } from "./Certificate";
import { Dispatch } from "./Dispatch";
import { ProductTracking } from "./ProductTracking";
import { ClientSubmission } from "./ClientSubmission";
import { ClientSubmissionProduct } from "./ClientSubmissionProduct";
import { ClientSubmissionDocument } from "./ClientSubmissionDocument";
import { SubmissionReview } from "./SubmissionReview";
import { SubmissionObservation } from "./SubmissionObservation";

/** Every entity registered in the DataSource (src/lib/db.ts). */
export const allEntities = [
  User,
  ClientUser,
  Client,
  Site,
  ProductType,
  ReferenceVariant,
  Brand,
  Manufacturer,
  OriginCountry,
  Dossier,
  DossierDocument,
  GeneratedDocument,
  Product,
  ProductVariant,
  Reception,
  Instrument,
  Calibration,
  Evaluation,
  Certificate,
  Dispatch,
  ProductTracking,
  ClientSubmission,
  ClientSubmissionProduct,
  ClientSubmissionDocument,
  SubmissionReview,
  SubmissionObservation,
];
