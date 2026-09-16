import { Client, DepotVisit, Driver, DocumentType, Vehicle } from "@prisma/client";

export type Status = "GREEN" | "AMBER" | "RED";
export type ClientStatus = Status | "ONBOARDING";

// A due date within this many days counts as "coming up" (Amber) rather than
// comfortably clear (Green). DVSA doesn't publish a single number for this —
// it's the chase-window concept from spec section 3, simplified here since
// Phase 1/2 has no chase cycle yet (that's Phase 3).
const AMBER_WINDOW_DAYS = 14;

const RANK: Record<Status, number> = { GREEN: 0, AMBER: 1, RED: 2 };

export function worstOf(statuses: Status[]): Status {
  return statuses.reduce((worst, s) => (RANK[s] > RANK[worst] ? s : worst), "GREEN" as Status);
}

export function dateStatus(dueDate: Date | null, now: Date = new Date()): Status {
  if (!dueDate) return "RED";
  const daysUntil = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntil < 0) return "RED";
  if (daysUntil <= AMBER_WINDOW_DAYS) return "AMBER";
  return "GREEN";
}

interface VehicleDateField {
  documentType: DocumentType;
  dueDate: Date | null;
}

export function vehicleDateFields(vehicle: Vehicle): VehicleDateField[] {
  const fields: VehicleDateField[] = [
    { documentType: "MOT", dueDate: vehicle.motDueDate },
    { documentType: "VED", dueDate: vehicle.vedDueDate },
    { documentType: "INSURANCE", dueDate: vehicle.insuranceDueDate },
    { documentType: "PMI", dueDate: vehicle.pmiDueDate },
  ];
  // EBPMS-monitored vehicles don't have a fixed brake test due date — the
  // system itself is the ongoing check, so there's nothing to date-check.
  if (!vehicle.ebpmsFlag) {
    fields.push({ documentType: "BRAKE_TEST", dueDate: vehicle.brakeTestDueDate });
  }
  return fields;
}

export function vehicleStatus(vehicle: Vehicle, now: Date = new Date()): Status {
  return worstOf(vehicleDateFields(vehicle).map((f) => dateStatus(f.dueDate, now)));
}

interface DriverDateField {
  documentType: DocumentType;
  dueDate: Date | null;
}

export function driverDateFields(driver: Driver): DriverDateField[] {
  return [
    { documentType: "LICENCE_CHECK", dueDate: driver.licenceCheckDueDate },
    { documentType: "CPC", dueDate: driver.cpcDueDate },
  ];
}

export function driverStatus(driver: Driver, now: Date = new Date()): Status {
  return worstOf(driverDateFields(driver).map((f) => dateStatus(f.dueDate, now)));
}

const DEPOT_VISIT_INTERVAL_DAYS = 30;

export function depotVisitStatus(visits: DepotVisit[], now: Date = new Date()): Status {
  if (visits.length === 0) return "RED";
  const mostRecent = visits.reduce((latest, v) => (v.date > latest ? v.date : latest), visits[0].date);
  const nextDue = new Date(mostRecent.getTime() + DEPOT_VISIT_INTERVAL_DAYS * 24 * 60 * 60 * 1000);
  return dateStatus(nextDue, now);
}

export function clientComplianceStatus(
  client: Pick<Client, "onboardingStatus">,
  vehicles: Vehicle[],
  drivers: Driver[],
  depotVisits: DepotVisit[],
  now: Date = new Date()
): ClientStatus {
  if (client.onboardingStatus === "PENDING_DVLA") return "ONBOARDING";
  return worstOf([
    ...vehicles.map((v) => vehicleStatus(v, now)),
    ...drivers.map((d) => driverStatus(d, now)),
    depotVisitStatus(depotVisits, now),
  ]);
}

export interface Anomaly {
  type: "MISSING_DOCUMENT" | "OVERDUE_DOCUMENT" | "VISIT_OVERDUE";
  documentType?: DocumentType;
  vehicleId?: string;
  driverId?: string;
  description: string;
}

// The set of anomalies that should currently have an open todo for this
// client. Only Red (missing/overdue) items generate a todo — Amber ("coming
// up soon") is visible on the vehicle/driver row but isn't an actionable
// anomaly yet.
export function computeAnomalies(
  vehicles: Vehicle[],
  drivers: Driver[],
  depotVisits: DepotVisit[],
  now: Date = new Date()
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  for (const vehicle of vehicles) {
    for (const field of vehicleDateFields(vehicle)) {
      if (dateStatus(field.dueDate, now) !== "RED") continue;
      const missing = !field.dueDate;
      anomalies.push({
        type: missing ? "MISSING_DOCUMENT" : "OVERDUE_DOCUMENT",
        documentType: field.documentType,
        vehicleId: vehicle.id,
        description: `${vehicle.registration}: ${field.documentType.replace("_", " ")} ${
          missing ? "missing" : "overdue"
        }`,
      });
    }
  }

  for (const driver of drivers) {
    for (const field of driverDateFields(driver)) {
      if (dateStatus(field.dueDate, now) !== "RED") continue;
      const missing = !field.dueDate;
      anomalies.push({
        type: missing ? "MISSING_DOCUMENT" : "OVERDUE_DOCUMENT",
        documentType: field.documentType,
        driverId: driver.id,
        description: `${driver.name}: ${field.documentType.replace("_", " ")} ${
          missing ? "missing" : "overdue"
        }`,
      });
    }
  }

  if (depotVisitStatus(depotVisits, now) === "RED") {
    anomalies.push({
      type: "VISIT_OVERDUE",
      description:
        depotVisits.length === 0
          ? "No depot visit logged yet"
          : "Depot visit overdue (30+ days since last visit)",
    });
  }

  return anomalies;
}
