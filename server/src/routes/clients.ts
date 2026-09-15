import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { NotFoundError } from "../lib/errors";

const router = Router();

const clientInput = z.object({
  companyName: z.string().min(1),
  companyNumber: z.string().trim().min(1).optional().nullable(),
  vatNumber: z.string().trim().min(1).optional().nullable(),
  olNumber: z.string().trim().min(1).optional().nullable(),
  address: z.string().trim().min(1).optional().nullable(),
  operatingCentreAddress: z.string().trim().min(1).optional().nullable(),
  phone: z.string().trim().min(1).optional().nullable(),
  website: z.string().trim().min(1).optional().nullable(),
  contactName: z.string().trim().min(1).optional().nullable(),
  contactEmail: z.string().trim().email().optional().nullable(),
  onboardingStatus: z.enum(["PENDING_DVLA", "APPROVED"]).optional(),
});

const clientUpdateInput = clientInput.partial();

// GET /api/clients — all-clients list
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const clients = await prisma.client.findMany({
      orderBy: { companyName: "asc" },
      include: {
        _count: { select: { vehicles: true, drivers: true } },
      },
    });
    res.json(clients);
  })
);

// GET /api/clients/:id — client detail, scoped vehicles + drivers
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        vehicles: { orderBy: { registration: "asc" } },
        drivers: { orderBy: { name: "asc" } },
      },
    });
    if (!client) throw new NotFoundError("Client", req.params.id);
    res.json(client);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = clientInput.parse(req.body);
    const client = await prisma.client.create({ data });
    res.status(201).json(client);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = clientUpdateInput.parse(req.body);
    const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Client", req.params.id);
    const client = await prisma.client.update({ where: { id: req.params.id }, data });
    res.json(client);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Client", req.params.id);
    await prisma.client.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

export default router;
