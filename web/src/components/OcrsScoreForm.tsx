import { FormEvent, useState } from "react";
import { OcrsScore, OcrsScoreInput } from "../lib/api";
import { toDateInputValue } from "../lib/dates";
import { FieldHelp } from "./FieldHelp";

interface Props {
  initial?: OcrsScore;
  onSubmit: (data: Partial<OcrsScoreInput>) => Promise<void>;
  onCancel: () => void;
}

export function OcrsScoreForm({ initial, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState({
    dateRecorded: toDateInputValue(initial?.dateRecorded ?? null) || toDateInputValue(new Date().toISOString()),
    roadworthinessScore: initial?.roadworthinessScore?.toString() ?? "",
    trafficScore: initial?.trafficScore?.toString() ?? "",
    band: initial?.band ?? "GREEN",
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
        dateRecorded: form.dateRecorded,
        roadworthinessScore: Number(form.roadworthinessScore),
        trafficScore: Number(form.trafficScore),
        band: form.band as OcrsScoreInput["band"],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <FieldHelp
        text="Recalculated weekly by DVSA. Check monthly and enter what you see here — TM Express tracks the trend and flags any band movement for you."
        href="https://vehicle-operator-licensing.service.gov.uk/auth/login"
        linkLabel="Open VOL → Your DVSA Operator Reports →"
      />
      <div className="form-grid" style={{ marginTop: 12 }}>
        <label>
          Date recorded *
          <input
            required
            type="date"
            value={form.dateRecorded}
            onChange={(e) => set("dateRecorded", e.target.value)}
          />
        </label>
        <label>
          Band *
          <select
            value={form.band}
            onChange={(e) => set("band", e.target.value as typeof form.band)}
          >
            <option value="GREEN">Green</option>
            <option value="AMBER">Amber</option>
            <option value="RED">Red</option>
            <option value="GREY">Grey (not yet scored)</option>
            <option value="BLUE">Blue (exempt)</option>
          </select>
        </label>
        <label>
          Roadworthiness score *
          <input
            required
            type="number"
            step="1"
            value={form.roadworthinessScore}
            onChange={(e) => set("roadworthinessScore", e.target.value)}
          />
        </label>
        <label>
          Traffic score *
          <input
            required
            type="number"
            step="1"
            value={form.trafficScore}
            onChange={(e) => set("trafficScore", e.target.value)}
          />
        </label>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save entry"}
        </button>
      </div>
    </form>
  );
}
