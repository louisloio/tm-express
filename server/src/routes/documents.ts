import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { NotFoundError } from "../lib/errors";
import { syncTodosForClient } from "../lib/todoSync";

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const safeExt = path.extname(file.originalname).replace(/[^a-zA-Z0-9.]/g, "");
      cb(null, `${crypto.randomUUID()}${safeExt}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const documentMeta = z.object({
  type: z.enum([
    "PMI",
    "BRAKE_TEST",
    "MOT",
    "VED",
    "INSURANCE",
    "LICENCE_CHECK",
    "CPC",
    "INFRINGEMENT_REPORT",
    "DEPOT_VISIT_NOTE",
    "OTHER",
  ]),
  vehicleId: z.string().min(1).optional().nullable(),
  driverId: z.string().min(1).optional().nullable(),
  validUntil: z.coerce.date().optional().nullable(),
});

// Document types that map onto a due-date field: uploading one of these,
// with a valid-until date, pushes that vehicle/driver's due date forward —
// this is what actually resolves the matching todo (spec section 6).
const VEHICLE_DATE_FIELD: Partial<Record<string, string>> = {
  PMI: "pmiDueDate",
  BRAKE_TEST: "brakeTestDueDate",
  MOT: "motDueDate",
  VED: "vedDueDate",
  INSURANCE: "insuranceDueDate",
};
const DRIVER_DATE_FIELD: Partial<Record<string, string>> = {
  LICENCE_CHECK: "licenceCheckDueDate",
  CPC: "cpcDueDate",
};

export const nestedDocumentRouter = Router({ mergeParams: true });

nestedDocumentRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { clientId } = req.params as { clientId: string };
    const documents = await prisma.document.findMany({
      where: { clientId },
      orderBy: { uploadDate: "desc" },
    });
    res.json(documents);
  })
);

nestedDocumentRouter.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const { clientId } = req.params as { clientId: string };
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundError("Client", clientId);
    if (!req.file) {
      res.status(400).json({ error: "A file is required" });
      return;
    }

    const meta = documentMeta.parse({
      type: req.body.type,
      vehicleId: req.body.vehicleId || null,
      driverId: req.body.driverId || null,
      validUntil: req.body.validUntil || null,
    });

    const document = await prisma.document.create({
      data: {
        clientId,
        vehicleId: meta.vehicleId,
        driverId: meta.driverId,
        type: meta.type,
        fileName: req.file.originalname,
        filePath: req.file.filename,
        validUntil: meta.validUntil,
      },
    });

    if (meta.validUntil) {
      const vehicleField = VEHICLE_DATE_FIELD[meta.type];
      if (vehicleField && meta.vehicleId) {
        await prisma.vehicle.update({
          where: { id: meta.vehicleId },
          data: { [vehicleField]: meta.validUntil },
        });
      }
      const driverField = DRIVER_DATE_FIELD[meta.type];
      if (driverField && meta.driverId) {
        await prisma.driver.update({
          where: { id: meta.driverId },
          data: { [driverField]: meta.validUntil },
        });
      }
    }

    await syncTodosForClient(clientId);
    res.status(201).json(document);
  })
);

export const documentByIdRouter = Router();

documentByIdRouter.get(
  "/:id/file",
  asyncHandler(async (req, res) => {
    const document = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!document) throw new NotFoundError("Document", req.params.id);
    res.download(path.join(UPLOAD_DIR, document.filePath), document.fileName);
  })
);

documentByIdRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const document = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!document) throw new NotFoundError("Document", req.params.id);
    await prisma.document.delete({ where: { id: req.params.id } });
    fs.unlink(path.join(UPLOAD_DIR, document.filePath), () => {});
    res.status(204).end();
  })
);
