import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DocumentType } from "@prisma/client";
import { prisma } from "./prisma";
import { syncTodosForClient } from "./todoSync";

export const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Document types that map onto a due-date field: filing one of these, with
// a valid-until date, pushes that vehicle/driver's due date forward — this
// is what actually resolves the matching todo (spec section 6). Shared by
// the manual upload route and the automatic email-ingest pipeline so both
// paths have identical effects.
const VEHICLE_DATE_FIELD: Partial<Record<DocumentType, string>> = {
  PMI: "pmiDueDate",
  BRAKE_TEST: "brakeTestDueDate",
  MOT: "motDueDate",
  VED: "vedDueDate",
  INSURANCE: "insuranceDueDate",
};
const DRIVER_DATE_FIELD: Partial<Record<DocumentType, string>> = {
  LICENCE_CHECK: "licenceCheckDueDate",
  CPC: "cpcDueDate",
};

export function saveUploadedFile(originalName: string, content: Buffer): string {
  const safeExt = path.extname(originalName).replace(/[^a-zA-Z0-9.]/g, "");
  const storedName = `${crypto.randomUUID()}${safeExt}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, storedName), content);
  return storedName;
}

export interface FileDocumentInput {
  clientId: string;
  vehicleId?: string | null;
  driverId?: string | null;
  type: DocumentType;
  fileName: string;
  filePath: string;
  validUntil?: Date | null;
}

export async function fileDocument(input: FileDocumentInput) {
  const document = await prisma.document.create({
    data: {
      clientId: input.clientId,
      vehicleId: input.vehicleId ?? null,
      driverId: input.driverId ?? null,
      type: input.type,
      fileName: input.fileName,
      filePath: input.filePath,
      validUntil: input.validUntil ?? null,
    },
  });

  if (input.validUntil) {
    const vehicleField = VEHICLE_DATE_FIELD[input.type];
    if (vehicleField && input.vehicleId) {
      await prisma.vehicle.update({
        where: { id: input.vehicleId },
        data: { [vehicleField]: input.validUntil },
      });
    }
    const driverField = DRIVER_DATE_FIELD[input.type];
    if (driverField && input.driverId) {
      await prisma.driver.update({
        where: { id: input.driverId },
        data: { [driverField]: input.validUntil },
      });
    }
  }

  await syncTodosForClient(input.clientId);
  return document;
}
