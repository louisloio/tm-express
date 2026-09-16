import { FormEvent, useState } from "react";
import { api, Driver, DocumentType, Vehicle } from "../lib/api";
import { FieldHelp } from "./FieldHelp";

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  PMI: "PMI",
  BRAKE_TEST: "Brake test",
  MOT: "MOT",
  VED: "VED",
  INSURANCE: "Insurance",
  LICENCE_CHECK: "Licence check",
  CPC: "CPC",
  INFRINGEMENT_REPORT: "Infringement report",
  DEPOT_VISIT_NOTE: "Depot visit note",
  OTHER: "Other",
};

interface Props {
  clientId: string;
  vehicles: Vehicle[];
  drivers: Driver[];
  initial?: { type: DocumentType; vehicleId?: string | null; driverId?: string | null };
  onDone: () => Promise<void>;
  onCancel: () => void;
}

export function DocumentForm({ clientId, vehicles, drivers, initial, onDone, onCancel }: Props) {
  const [type, setType] = useState<DocumentType>(initial?.type ?? "OTHER");
  const [linkKind, setLinkKind] = useState<"none" | "vehicle" | "driver">(
    initial?.vehicleId ? "vehicle" : initial?.driverId ? "driver" : "none"
  );
  const [vehicleId, setVehicleId] = useState(initial?.vehicleId ?? "");
  const [driverId, setDriverId] = useState(initial?.driverId ?? "");
  const [validUntil, setValidUntil] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a file to upload");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.uploadDocument(clientId, {
        type,
        vehicleId: linkKind === "vehicle" ? vehicleId || null : null,
        driverId: linkKind === "driver" ? driverId || null : null,
        validUntil: validUntil || null,
        file,
      });
      await onDone();
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
          Document type *
          <select value={type} onChange={(e) => setType(e.target.value as DocumentType)}>
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          File *
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <label>
          Linked to
          <select
            value={linkKind}
            onChange={(e) => setLinkKind(e.target.value as typeof linkKind)}
          >
            <option value="none">Client only</option>
            <option value="vehicle">A vehicle</option>
            <option value="driver">A driver</option>
          </select>
        </label>
        {linkKind === "vehicle" && (
          <label>
            Vehicle
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              <option value="">Select a vehicle…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registration}
                </option>
              ))}
            </select>
          </label>
        )}
        {linkKind === "driver" && (
          <label>
            Driver
            <select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
              <option value="">Select a driver…</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="field">
          <label>
            Valid until
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </label>
          <FieldHelp text="Enter the date this document is valid until, based on the certificate or record you received. Setting this updates the linked vehicle/driver's due date." />
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Uploading…" : "Upload document"}
        </button>
      </div>
    </form>
  );
}
