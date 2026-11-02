"use server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { insertReturningId, isUniqueViolation } from "@/lib/db-helpers";
import { Client } from "@/entities/Client";
import { Site } from "@/entities/Site";
import { createAudit, updateAudit } from "@/entities/_audit";
import { attempt } from "@/lib/result";
import { requireInternal, text, validId, validStatus } from "./_guards";

export async function getClientsWithSites(includeInactive = false) {
  await requireInternal();
  const db = await getDb();
  const where = includeInactive ? {} : { status: 1 };
  const clients = await db.getRepository(Client).find({ where, order: { businessName: "ASC" } });
  const sites = await db.getRepository(Site).find({ where, order: { id: "ASC" } });
  return clients.map((c) => ({ ...c, sites: sites.filter((s) => s.clientId === c.id) }));
}
export type ClientWithSites = Awaited<ReturnType<typeof getClientsWithSites>>[number];

export async function createClient(input: { businessName: string; ruc?: string }) {
  return attempt(async () => {
    const s = await requireInternal();
    const db = await getDb();
    try {
      const id = await insertReturningId(db.manager, Client, {
        businessName: text(input.businessName, "La razón social", 300, true),
        ruc: text(input.ruc, "El RUC", 20),
        ...createAudit(s.audit),
      });
      revalidatePath("/clients");
      return { id };
    } catch (err) {
      if (isUniqueViolation(err)) throw new Error("Ya existe un cliente con ese RUC.");
      throw err;
    }
  });
}

export async function updateClient(id: number, input: { businessName: string; ruc?: string }) {
  return attempt(async () => {
    const s = await requireInternal();
    const db = await getDb();
    try {
      await db.getRepository(Client).update(
        { id: validId(id) },
        {
          businessName: text(input.businessName, "La razón social", 300, true),
          ruc: text(input.ruc, "El RUC", 20),
          ...updateAudit(s.audit),
        },
      );
    } catch (err) {
      if (isUniqueViolation(err)) throw new Error("Ya existe un cliente con ese RUC.");
      throw err;
    }
    revalidatePath("/clients");
  });
}

/** Logical delete: status 2 = inactive, 1 = active. Rows are never deleted. */
export async function setClientStatus(id: number, status: number) {
  return attempt(async () => {
    const s = await requireInternal();
    const db = await getDb();
    await db.getRepository(Client).update({ id: validId(id) }, { status: validStatus(status), ...updateAudit(s.audit) });
    revalidatePath("/clients");
  });
}

type SiteInput = {
  label?: string;
  address: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
};

function siteValues(input: SiteInput) {
  return {
    label: text(input.label, "La etiqueta", 200),
    address: text(input.address, "La dirección", 500, true),
    contactName: text(input.contactName, "El nombre de contacto", 200),
    contactPhone: text(input.contactPhone, "El teléfono de contacto", 30),
    contactEmail: text(input.contactEmail, "El correo de contacto", 200),
  };
}

export async function createSite(clientId: number, input: SiteInput) {
  return attempt(async () => {
    const s = await requireInternal();
    const db = await getDb();
    const client = await db.getRepository(Client).findOne({ where: { id: validId(clientId, "Cliente") } });
    if (!client || client.status !== 1) throw new Error("Cliente no encontrado o inactivo.");
    const id = await insertReturningId(db.manager, Site, { clientId, ...siteValues(input), ...createAudit(s.audit) });
    revalidatePath("/clients");
    return { id };
  });
}

export async function updateSite(id: number, input: SiteInput) {
  return attempt(async () => {
    const s = await requireInternal();
    const db = await getDb();
    await db.getRepository(Site).update({ id: validId(id) }, { ...siteValues(input), ...updateAudit(s.audit) });
    revalidatePath("/clients");
  });
}

export async function setSiteStatus(id: number, status: number) {
  return attempt(async () => {
    const s = await requireInternal();
    const db = await getDb();
    await db.getRepository(Site).update({ id: validId(id) }, { status: validStatus(status), ...updateAudit(s.audit) });
    revalidatePath("/clients");
  });
}
