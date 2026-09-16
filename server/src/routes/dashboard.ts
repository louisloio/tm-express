import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { clientComplianceStatus } from "../lib/compliance";

export const dashboardRouter = Router();

// One call for the all-clients dashboard (spec Phase 1, screen 1): each
// client's onboarding/compliance status, last depot visit, last PMI/brake
// test document received, latest OCRS band, and every driver across the
// book — the raw material for the dashboard's grouped sections.
dashboardRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const clients = await prisma.client.findMany({
      orderBy: { companyName: "asc" },
      include: {
        vehicles: true,
        drivers: true,
        depotVisits: { orderBy: { date: "desc" }, take: 1 },
        documents: { orderBy: { uploadDate: "desc" } },
        ocrsScores: { orderBy: { dateRecorded: "desc" }, take: 1 },
      },
    });

    const dashboardClients = clients.map((c) => {
      const lastPmi = c.documents.find((d) => d.type === "PMI");
      const lastBrakeTest = c.documents.find((d) => d.type === "BRAKE_TEST");
      return {
        id: c.id,
        companyName: c.companyName,
        onboardingStatus: c.onboardingStatus,
        complianceStatus: clientComplianceStatus(c, c.vehicles, c.drivers, c.depotVisits),
        vehicleCount: c.vehicles.length,
        driverCount: c.drivers.length,
        lastVisitDate: c.depotVisits[0]?.date ?? null,
        lastPmiDate: lastPmi?.uploadDate ?? null,
        lastBrakeTestDate: lastBrakeTest?.uploadDate ?? null,
        latestOcrsBand: c.ocrsScores[0]?.band ?? null,
      };
    });

    const drivers = clients.flatMap((c) =>
      c.drivers.map((d) => ({
        id: d.id,
        clientId: c.id,
        clientName: c.companyName,
        name: d.name,
        licenceCheckDueDate: d.licenceCheckDueDate,
        cpcDueDate: d.cpcDueDate,
      }))
    );

    res.json({ clients: dashboardClients, drivers });
  })
);
