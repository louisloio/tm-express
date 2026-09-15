import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { NotFoundError } from "../lib/errors";

const ocrsScoreInput = z.object({
  dateRecorded: z.coerce.date(),
  roadworthinessScore: z.coerce.number().int(),
  trafficScore: z.coerce.number().int(),
  band: z.enum(["GREEN", "AMBER", "RED", "GREY", "BLUE"]),
});

const ocrsScoreUpdateInput = ocrsScoreInput.partial();

// Nested under a client: /api/clients/:clientId/ocrs-scores
export const nestedOcrsScoreRouter = Router({ mergeParams: true });

nestedOcrsScoreRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { clientId } = req.params as { clientId: string };
    const scores = await prisma.ocrsScore.findMany({
      where: { clientId },
      orderBy: { dateRecorded: "asc" },
    });
    res.json(scores);
  })
);

nestedOcrsScoreRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { clientId } = req.params as { clientId: string };
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundError("Client", clientId);

    const data = ocrsScoreInput.parse(req.body);
    const score = await prisma.ocrsScore.create({ data: { ...data, clientId } });
    res.status(201).json(score);
  })
);

// Flat, by id: /api/ocrs-scores/:id
export const ocrsScoreByIdRouter = Router();

ocrsScoreByIdRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = ocrsScoreUpdateInput.parse(req.body);
    const existing = await prisma.ocrsScore.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("OcrsScore", req.params.id);
    const score = await prisma.ocrsScore.update({ where: { id: req.params.id }, data });
    res.json(score);
  })
);

ocrsScoreByIdRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.ocrsScore.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("OcrsScore", req.params.id);
    await prisma.ocrsScore.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);
