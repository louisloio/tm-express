import { FormEvent, useState } from "react";
import { Vehicle, VehicleInput } from "../lib/api";
import { toDateInputValue } from "../lib/dates";
import { FieldHelp } from "./FieldHelp";

interface Props {
  initial?: Vehicle;
  onSubmit: (data: Partial<VehicleInput>) => Promise<void>;
  onCancel: () => void;
}

export function VehicleForm({ initial, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState({
    registration: initial?.registration ?? "",
    type: initial?.type ?? "",
    pmiDueDate: toDateInputValue(initial?.pmiDueDate ?? null),
    brakeTestDueDate: toDateInputValue(initial?.brakeTestDueDate ?? null),
    ebpmsFlag: initial?.ebpmsFlag ?? false,
    motDueDate: toDateInputValue(initial?.motDueDate ?? null),
    vedDueDate: toDateInputValue(initial?.vedDueDate ?? null),
    insuranceDueDate: toDateInputValue(initial?.insuranceDueDate ?? null),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        registration: form.registration.toUpperCase(),
        type: form.type || null,
        pmiDueDate: form.pmiDueDate || null,
        brakeTestDueDate: form.brakeTestDueDate || null,
        ebpmsFlag: form.ebpmsFlag,
        motDueDate: form.motDueDate || null,
        vedDueDate: form.vedDueDate || null,
        insuranceDueDate: form.insuranceDueDate || null,
      } as Partial<VehicleInput>);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label>
          Registration *
          <input
            required
            value={form.registration}
            onChange={(e) => set("registration", e.target.value)}
          />
        </label>
        <label>
          Type
          <input
            placeholder="e.g. Rigid HGV, Artic tractor"
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
          />
        </label>
        <p className="field-help span-2">
          Enter the date each document is valid until, based on the certificate or record you
          received.
        </p>
        <label>
          MOT due
          <input
            type="date"
            value={form.motDueDate}
            onChange={(e) => set("motDueDate", e.target.value)}
          />
        </label>
        <label>
          VED due
          <input
            type="date"
            value={form.vedDueDate}
            onChange={(e) => set("vedDueDate", e.target.value)}
          />
        </label>
        <label>
          Insurance due
          <input
            type="date"
            value={form.insuranceDueDate}
            onChange={(e) => set("insuranceDueDate", e.target.value)}
          />
        </label>
        <label>
          PMI due
          <input
            type="date"
            value={form.pmiDueDate}
            onChange={(e) => set("pmiDueDate", e.target.value)}
          />
        </label>
        <label>
          Brake test due
          <input
            type="date"
            value={form.brakeTestDueDate}
            disabled={form.ebpmsFlag}
            onChange={(e) => set("brakeTestDueDate", e.target.value)}
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.ebpmsFlag}
            onChange={(e) => set("ebpmsFlag", e.target.checked)}
          />
          Monitored via EBPMS instead of fixed brake test dates
        </label>
        <div className="span-2">
          <FieldHelp text="DVSA requires four laden brake tests per year at 65%+ of design axle weight, unless the vehicle uses an approved EBPMS system." />
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save vehicle"}
        </button>
      </div>
    </form>
  );
}
