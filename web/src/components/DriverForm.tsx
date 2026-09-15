import { FormEvent, useState } from "react";
import { Driver, DriverInput } from "../lib/api";
import { toDateInputValue } from "../lib/dates";
import { FieldHelp } from "./FieldHelp";

interface Props {
  initial?: Driver;
  onSubmit: (data: Partial<DriverInput>) => Promise<void>;
  onCancel: () => void;
}

export function DriverForm({ initial, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    licenceCheckDueDate: toDateInputValue(initial?.licenceCheckDueDate ?? null),
    cpcDueDate: toDateInputValue(initial?.cpcDueDate ?? null),
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
        name: form.name,
        licenceCheckDueDate: form.licenceCheckDueDate || null,
        cpcDueDate: form.cpcDueDate || null,
      } as Partial<DriverInput>);
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
          Name *
          <input required value={form.name} onChange={(e) => set("name", e.target.value)} />
        </label>
        <div className="field">
          <label>
            Licence check due
            <input
              type="date"
              value={form.licenceCheckDueDate}
              onChange={(e) => set("licenceCheckDueDate", e.target.value)}
            />
          </label>
          <FieldHelp text="A data record (e.g. a spreadsheet of licence numbers) isn't enough — DVSA/TC expects the actual scanned document on file." />
        </div>
        <label>
          CPC due
          <input
            type="date"
            value={form.cpcDueDate}
            onChange={(e) => set("cpcDueDate", e.target.value)}
          />
        </label>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save driver"}
        </button>
      </div>
    </form>
  );
}
