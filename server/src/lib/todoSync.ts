import { DocumentType } from "@prisma/client";
import { prisma } from "./prisma";
import { Anomaly, computeAnomalies } from "./compliance";

function anomalyKey(a: Anomaly | SyncableTodo): string {
  return [a.type, a.documentType ?? "", a.vehicleId ?? "", a.driverId ?? ""].join(":");
}

interface SyncableTodo {
  id: string;
  type: "MISSING_DOCUMENT" | "OVERDUE_DOCUMENT" | "VISIT_OVERDUE";
  documentType: DocumentType | null;
  vehicleId: string | null;
  driverId: string | null;
}

// Keeps the Todo table in sync with the client's current anomalies —
// creates a todo for anything newly missing/overdue, resolves any open todo
// whose underlying anomaly no longer exists. Called after every mutation
// that could change a client's compliance picture (vehicle/driver/document/
// depot-visit create, update, delete).
export async function syncTodosForClient(clientId: string): Promise<void> {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return;

  // Compliance isn't evaluated until DVLA approval — see spec section 2.
  if (client.onboardingStatus !== "APPROVED") return;

  const [vehicles, drivers, depotVisits, existingOpenTodos] = await Promise.all([
    prisma.vehicle.findMany({ where: { clientId } }),
    prisma.driver.findMany({ where: { clientId } }),
    prisma.depotVisit.findMany({ where: { clientId } }),
    prisma.todo.findMany({
      where: {
        clientId,
        status: "OPEN",
        type: { in: ["MISSING_DOCUMENT", "OVERDUE_DOCUMENT", "VISIT_OVERDUE"] },
      },
    }),
  ]);

  const anomalies = computeAnomalies(vehicles, drivers, depotVisits);
  const anomalyKeys = new Set(anomalies.map(anomalyKey));
  const existingByKey = new Map(existingOpenTodos.map((t) => [anomalyKey(t as SyncableTodo), t]));

  const toCreate = anomalies.filter((a) => !existingByKey.has(anomalyKey(a)));
  const toResolve = existingOpenTodos.filter((t) => !anomalyKeys.has(anomalyKey(t as SyncableTodo)));

  await prisma.$transaction([
    ...toCreate.map((a) =>
      prisma.todo.create({
        data: {
          type: a.type,
          documentType: a.documentType,
          description: a.description,
          clientId,
          vehicleId: a.vehicleId,
          driverId: a.driverId,
        },
      })
    ),
    ...toResolve.map((t) =>
      prisma.todo.update({ where: { id: t.id }, data: { status: "RESOLVED", resolvedAt: new Date() } })
    ),
  ]);
}
