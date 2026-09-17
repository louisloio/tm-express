import { Client, Driver, OcrsScore, Vehicle } from "./api";
import { compareToPrevious } from "./ocrs";

// Static-demo version of the todo queue (spec section 8): computed live
// from whatever's in the mock store, not persisted. A todo simply stops
// appearing once the underlying vehicle/driver field it flagged is no
// longer missing/overdue — same effect as the real app's auto-resolve,
// with no separate state to keep in sync.

export type TodoType = "MISSING_DOCUMENT" | "OVERDUE_DOCUMENT" | "OCRS_MOVEMENT";

export interface TodoItem {
  id: string;
  type: TodoType;
  description: string;
  clientId: string;
}

export const todoTypeLabel: Record<TodoType, string> = {
  MISSING_DOCUMENT: "Missing document",
  OVERDUE_DOCUMENT: "Overdue document",
  OCRS_MOVEMENT: "OCRS movement",
};

function isRed(iso: string | null): boolean {
  if (!iso) return true;
  return new Date(iso).getTime() < Date.now();
}

function vehicleFields(v: Vehicle): { label: string; date: string | null }[] {
  const fields = [
    { label: "MOT", date: v.motDueDate },
    { label: "VED", date: v.vedDueDate },
    { label: "Insurance", date: v.insuranceDueDate },
    { label: "PMI", date: v.pmiDueDate },
  ];
  // EBPMS-monitored vehicles have no fixed brake test due date to check.
  if (!v.ebpmsFlag) fields.push({ label: "Brake test", date: v.brakeTestDueDate });
  return fields;
}

function driverFields(d: Driver): { label: string; date: string | null }[] {
  return [
    { label: "Licence check", date: d.licenceCheckDueDate },
    { label: "CPC", date: d.cpcDueDate },
  ];
}

// Only Red (missing/overdue) items become a todo — a date "coming up soon"
// is visible on the vehicle/driver row but isn't an actionable anomaly yet,
// matching the real app's compliance engine.
export function computeClientTodos(
  client: Client,
  vehicles: Vehicle[],
  drivers: Driver[],
  ocrsScores: OcrsScore[]
): TodoItem[] {
  const todos: TodoItem[] = [];
  if (client.onboardingStatus !== "APPROVED") return todos;

  for (const v of vehicles) {
    for (const f of vehicleFields(v)) {
      if (!isRed(f.date)) continue;
      const missing = !f.date;
      todos.push({
        id: `${v.id}:${f.label}`,
        type: missing ? "MISSING_DOCUMENT" : "OVERDUE_DOCUMENT",
        description: `${v.registration}: ${f.label} ${missing ? "missing" : "overdue"}`,
        clientId: client.id,
      });
    }
  }

  for (const d of drivers) {
    for (const f of driverFields(d)) {
      if (!isRed(f.date)) continue;
      const missing = !f.date;
      todos.push({
        id: `${d.id}:${f.label}`,
        type: missing ? "MISSING_DOCUMENT" : "OVERDUE_DOCUMENT",
        description: `${d.name}: ${f.label} ${missing ? "missing" : "overdue"}`,
        clientId: client.id,
      });
    }
  }

  const sorted = [...ocrsScores].sort((a, b) => a.dateRecorded.localeCompare(b.dateRecorded));
  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2] ?? null;
  if (latest) {
    const movement = compareToPrevious(latest, previous);
    if (movement.worsened) {
      todos.push({
        id: `${client.id}:ocrs:${latest.id}`,
        type: "OCRS_MOVEMENT",
        description: `OCRS worsened (${movement.reasons.join("; ")})`,
        clientId: client.id,
      });
    }
  }

  return todos;
}
