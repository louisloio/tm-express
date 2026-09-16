import { FormEvent, useState } from "react";
import { DepotVisit, DepotVisitInput } from "../lib/api";
import { toDateInputValue } from "../lib/dates";
import { FieldHelp } from "./FieldHelp";

interface Props {
  initial?: DepotVisit;
  onSubmit: (data: Partial<DepotVisitInput>) => Promise<void>;
  onCancel: () => void;
}

export function DepotVisitForm({ initial, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState({
    date: toDateInputValue(initial?.date ?? null) || toDateInputValue(new Date().toISOString()),
    findings: initial?.findings ?? "",
    actionsAgreed: initial?.actionsAgreed ?? "",
    owner: initial?.owner ?? "",
    followUpStatus: initial?.followUpStatus ?? "NONE",
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
        date: form.date,
        findings: form.findings || null,
        actionsAgreed: form.actionsAgreed || null,
        owner: form.owner || null,
        followUpStatus: form.followUpStatus as DepotVisitInput["followUpStatus"],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <FieldHelp text="Log date, findings, and any actions agreed. This is your evidence of continuous and effective management." />
      <div className="form-grid" style={{ marginTop: 12 }}>
        <label>
          Visit date *
          <input required type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </label>
        <label>
          Owner
          <input
            placeholder="Who's following up"
            value={form.owner}
            onChange={(e) => set("owner", e.target.value)}
          />
        </label>
        <label className="span-2">
          Findings
          <input value={form.findings} onChange={(e) => set("findings", e.target.value)} />
        </label>
        <label className="span-2">
          Actions agreed
          <input
            value={form.actionsAgreed}
            onChange={(e) => set("actionsAgreed", e.target.value)}
          />
        </label>
        <label>
          Follow-up status
          <select
            value={form.followUpStatus}
            onChange={(e) => set("followUpStatus", e.target.value as typeof form.followUpStatus)}
          >
            <option value="NONE">None needed</option>
            <option value="OPEN">Open</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </label>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save visit"}
        </button>
      </div>
    </form>
  );
}
