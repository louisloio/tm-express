import { FormEvent, useState } from "react";
import { Client, ClientInput } from "../lib/api";

interface Props {
  initial?: Client;
  onSubmit: (data: Partial<ClientInput>) => Promise<void>;
  onCancel: () => void;
}

export function ClientForm({ initial, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState({
    companyName: initial?.companyName ?? "",
    companyNumber: initial?.companyNumber ?? "",
    vatNumber: initial?.vatNumber ?? "",
    olNumber: initial?.olNumber ?? "",
    address: initial?.address ?? "",
    operatingCentreAddress: initial?.operatingCentreAddress ?? "",
    phone: initial?.phone ?? "",
    website: initial?.website ?? "",
    contactName: initial?.contactName ?? "",
    contactEmail: initial?.contactEmail ?? "",
    onboardingStatus: initial?.onboardingStatus ?? "PENDING_DVLA",
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
      const payload: Partial<ClientInput> = {
        ...form,
        companyNumber: form.companyNumber || null,
        vatNumber: form.vatNumber || null,
        olNumber: form.olNumber || null,
        address: form.address || null,
        operatingCentreAddress: form.operatingCentreAddress || null,
        phone: form.phone || null,
        website: form.website || null,
        contactName: form.contactName || null,
        contactEmail: form.contactEmail || null,
        onboardingStatus: form.onboardingStatus as ClientInput["onboardingStatus"],
      };
      await onSubmit(payload);
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
          Company name *
          <input
            required
            value={form.companyName}
            onChange={(e) => set("companyName", e.target.value)}
          />
        </label>
        <label>
          OL number
          <input value={form.olNumber} onChange={(e) => set("olNumber", e.target.value)} />
        </label>
        <label>
          Onboarding status
          <select
            value={form.onboardingStatus}
            onChange={(e) =>
              set("onboardingStatus", e.target.value as typeof form.onboardingStatus)
            }
          >
            <option value="PENDING_DVLA">Pending DVLA</option>
            <option value="APPROVED">Approved</option>
          </select>
        </label>
        <label>
          Company number
          <input
            value={form.companyNumber}
            onChange={(e) => set("companyNumber", e.target.value)}
          />
        </label>
        <label>
          VAT number
          <input value={form.vatNumber} onChange={(e) => set("vatNumber", e.target.value)} />
        </label>
        <label>
          Phone
          <input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </label>
        <label>
          Website
          <input value={form.website} onChange={(e) => set("website", e.target.value)} />
        </label>
        <label>
          Contact name
          <input
            value={form.contactName}
            onChange={(e) => set("contactName", e.target.value)}
          />
        </label>
        <label>
          Contact email
          <input
            type="email"
            value={form.contactEmail}
            onChange={(e) => set("contactEmail", e.target.value)}
          />
        </label>
        <label className="span-2">
          Registered address
          <input value={form.address} onChange={(e) => set("address", e.target.value)} />
        </label>
        <label className="span-2">
          Operating centre address
          <input
            value={form.operatingCentreAddress}
            onChange={(e) => set("operatingCentreAddress", e.target.value)}
          />
        </label>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save client"}
        </button>
      </div>
    </form>
  );
}
