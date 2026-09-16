export function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

const DEPOT_VISIT_INTERVAL_DAYS = 30;

// A logged visit date is always in the past — "overdue" means the *next*
// visit (interval after this one) has passed, not the date itself.
export function isVisitOverdue(lastVisitIso: string | null): boolean {
  if (!lastVisitIso) return true;
  const nextDue = new Date(lastVisitIso).getTime() + DEPOT_VISIT_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
  return nextDue < Date.now();
}
