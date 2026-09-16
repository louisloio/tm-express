import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { NotFoundError } from "../lib/errors";
import { fileDocument, saveUploadedFile, UPLOAD_DIR } from "../lib/documentFiling";

const upload = multer({
  storage: multer.memoryStorage(),
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

    const storedName = saveUploadedFile(req.file.originalname, req.file.buffer);
    const document = await fileDocument({
      clientId,
      vehicleId: meta.vehicleId,
      driverId: meta.driverId,
      type: meta.type,
      fileName: req.file.originalname,
      filePath: storedName,
      validUntil: meta.validUntil,
    });

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
