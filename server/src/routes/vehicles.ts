import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { NotFoundError } from "../lib/errors";

const dateField = z.coerce.date().optional().nullable();

const vehicleInput = z.object({
  registration: z.string().min(1),
  type: z.string().trim().min(1).optional().nullable(),
  pmiDueDate: dateField,
  brakeTestDueDate: dateField,
  ebpmsFlag: z.boolean().optional(),
  motDueDate: dateField,
  vedDueDate: dateField,
  insuranceDueDate: dateField,
});

const vehicleUpdateInput = vehicleInput.partial();

// Nested under a client: /api/clients/:clientId/vehicles
export const nestedVehicleRouter = Router({ mergeParams: true });

nestedVehicleRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { clientId } = req.params as { clientId: string };
    const vehicles = await prisma.vehicle.findMany({
      where: { clientId },
      orderBy: { registration: "asc" },
    });
    res.json(vehicles);
  })
);

nestedVehicleRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { clientId } = req.params as { clientId: string };
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundError("Client", clientId);

    const data = vehicleInput.parse(req.body);
    const vehicle = await prisma.vehicle.create({ data: { ...data, clientId } });
    res.status(201).json(vehicle);
  })
);

// Flat, by id: /api/vehicles/:id
export const vehicleByIdRouter = Router();

vehicleByIdRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
    if (!vehicle) throw new NotFoundError("Vehicle", req.params.id);
    res.json(vehicle);
  })
);

vehicleByIdRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = vehicleUpdateInput.parse(req.body);
    const existing = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Vehicle", req.params.id);
    const vehicle = await prisma.vehicle.update({ where: { id: req.params.id }, data });
    res.json(vehicle);
  })
);

vehicleByIdRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Vehicle", req.params.id);
    await prisma.vehicle.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);
