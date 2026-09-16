import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { NotFoundError } from "../lib/errors";
import { syncTodosForClient } from "../lib/todoSync";

const dateField = z.coerce.date().optional().nullable();

const driverInput = z.object({
  name: z.string().min(1),
  licenceCheckDueDate: dateField,
  cpcDueDate: dateField,
});

const driverUpdateInput = driverInput.partial();

// Nested under a client: /api/clients/:clientId/drivers
export const nestedDriverRouter = Router({ mergeParams: true });

nestedDriverRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { clientId } = req.params as { clientId: string };
    const drivers = await prisma.driver.findMany({
      where: { clientId },
      orderBy: { name: "asc" },
    });
    res.json(drivers);
  })
);

nestedDriverRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { clientId } = req.params as { clientId: string };
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundError("Client", clientId);

    const data = driverInput.parse(req.body);
    const driver = await prisma.driver.create({ data: { ...data, clientId } });
    await syncTodosForClient(clientId);
    res.status(201).json(driver);
  })
);

// Flat, by id: /api/drivers/:id
export const driverByIdRouter = Router();

driverByIdRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const driver = await prisma.driver.findUnique({ where: { id: req.params.id } });
    if (!driver) throw new NotFoundError("Driver", req.params.id);
    res.json(driver);
  })
);

driverByIdRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = driverUpdateInput.parse(req.body);
    const existing = await prisma.driver.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Driver", req.params.id);
    const driver = await prisma.driver.update({ where: { id: req.params.id }, data });
    await syncTodosForClient(existing.clientId);
    res.json(driver);
  })
);

driverByIdRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.driver.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Driver", req.params.id);
    await prisma.driver.delete({ where: { id: req.params.id } });
    await syncTodosForClient(existing.clientId);
    res.status(204).end();
  })
);
