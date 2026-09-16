import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { NotFoundError } from "../lib/errors";
import { syncTodosForClient } from "../lib/todoSync";

const depotVisitInput = z.object({
  date: z.coerce.date(),
  findings: z.string().trim().min(1).optional().nullable(),
  actionsAgreed: z.string().trim().min(1).optional().nullable(),
  owner: z.string().trim().min(1).optional().nullable(),
  followUpStatus: z.enum(["NONE", "OPEN", "RESOLVED"]).optional(),
});

const depotVisitUpdateInput = depotVisitInput.partial();

export const nestedDepotVisitRouter = Router({ mergeParams: true });

nestedDepotVisitRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { clientId } = req.params as { clientId: string };
    const visits = await prisma.depotVisit.findMany({
      where: { clientId },
      orderBy: { date: "desc" },
    });
    res.json(visits);
  })
);

nestedDepotVisitRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { clientId } = req.params as { clientId: string };
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundError("Client", clientId);

    const data = depotVisitInput.parse(req.body);
    const visit = await prisma.depotVisit.create({ data: { ...data, clientId } });
    await syncTodosForClient(clientId);
    res.status(201).json(visit);
  })
);

export const depotVisitByIdRouter = Router();

depotVisitByIdRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = depotVisitUpdateInput.parse(req.body);
    const existing = await prisma.depotVisit.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("DepotVisit", req.params.id);
    const visit = await prisma.depotVisit.update({ where: { id: req.params.id }, data });
    await syncTodosForClient(existing.clientId);
    res.json(visit);
  })
);

depotVisitByIdRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.depotVisit.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("DepotVisit", req.params.id);
    await prisma.depotVisit.delete({ where: { id: req.params.id } });
    await syncTodosForClient(existing.clientId);
    res.status(204).end();
  })
);
