import { FormEvent, useState } from "react";
import { api, EmailAccountInput, MessagePreview } from "../lib/api";
import { FieldHelp } from "./FieldHelp";
import { formatDate } from "../lib/dates";

interface Props {
  onDone: () => Promise<void>;
  onCancel: () => void;
}

const initialForm: EmailAccountInput = {
  label: "",
  imapHost: "",
  imapPort: 993,
  imapUsername: "",
  imapPassword: "",
  imapSecure: true,
  smtpHost: "",
  smtpPort: 465,
  smtpUsername: "",
  smtpPassword: "",
  smtpSecure: true,
};

export function EmailAccountForm({ onDone, onCancel }: Props) {
  const [form, setForm] = useState<EmailAccountInput>(initialForm);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    { ok: true; preview: MessagePreview[] } | { ok: false; error: string } | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof EmailAccountInput>(key: K, value: EmailAccountInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setTestResult(null);
  }

  async function handleTest() {
    setTesting(true);
    setError(null);
    try {
      const result = await api.testEmailAccount(form);
      setTestResult(result);
    } catch (err) {
      setTestResult({ ok: false, error: err instanceof Error ? err.message : "Test failed" });
    } finally {
      setTesting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.createEmailAccount(form);
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const canSave = testResult?.ok === true;

  return (
    <form className="form" onSubmit={handleSubmit}>
      <FieldHelp text="Credentials are entered here only — never shared elsewhere — and are encrypted at rest. Use a dedicated app-specific password, not your everyday one." />

      <div className="form-grid" style={{ marginTop: 12 }}>
        <label className="span-2">
          Label *
          <input
            required
            placeholder='e.g. "Main inbox"'
            value={form.label}
            onChange={(e) => set("label", e.target.value)}
          />
        </label>
      </div>

      <h3 className="form-section-title">IMAP (inbound)</h3>
      <div className="form-grid">
        <label>
          Host *
          <input
            required
            placeholder="mail.transport-managers.com"
            value={form.imapHost}
            onChange={(e) => set("imapHost", e.target.value)}
          />
        </label>
        <label>
          Port *
          <input
            required
            type="number"
            value={form.imapPort}
            onChange={(e) => set("imapPort", Number(e.target.value))}
          />
        </label>
        <label>
          Username *
          <input
            required
            value={form.imapUsername}
            onChange={(e) => set("imapUsername", e.target.value)}
          />
        </label>
        <label>
          Password *
          <input
            required
            type="password"
            value={form.imapPassword}
            onChange={(e) => set("imapPassword", e.target.value)}
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.imapSecure}
            onChange={(e) => set("imapSecure", e.target.checked)}
          />
          Use SSL (port 993 standard)
        </label>
      </div>

      <h3 className="form-section-title">SMTP (outbound)</h3>
      <p className="field-help">
        Captured now for later — sending isn't built in this stage.
      </p>
      <div className="form-grid">
        <label>
          Host *
          <input
            required
            placeholder="mail.transport-managers.com"
            value={form.smtpHost}
            onChange={(e) => set("smtpHost", e.target.value)}
          />
        </label>
        <label>
          Port *
          <input
            required
            type="number"
            value={form.smtpPort}
            onChange={(e) => set("smtpPort", Number(e.target.value))}
          />
        </label>
        <label>
          Username *
          <input
            required
            value={form.smtpUsername}
            onChange={(e) => set("smtpUsername", e.target.value)}
          />
        </label>
        <label>
          Password *
          <input
            required
            type="password"
            value={form.smtpPassword}
            onChange={(e) => set("smtpPassword", e.target.value)}
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.smtpSecure}
            onChange={(e) => set("smtpSecure", e.target.checked)}
          />
          Use SSL (port 465 standard)
        </label>
      </div>

      <div className="form-actions" style={{ justifyContent: "space-between" }}>
        <button type="button" className="btn btn-secondary" onClick={handleTest} disabled={testing}>
          {testing ? "Testing…" : "Test connection"}
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!canSave || saving}
            title={canSave ? undefined : "Run a successful test connection first"}
          >
            {saving ? "Saving…" : "Save account"}
          </button>
        </div>
      </div>

      {testResult && (
        <div className={`test-result ${testResult.ok ? "test-result-ok" : "test-result-error"}`}>
          {testResult.ok ? (
            testResult.preview.length === 0 ? (
              <p>Connected — inbox is empty.</p>
            ) : (
              <>
                <p>Connected. Most recent messages:</p>
                <ul>
                  {testResult.preview.map((m) => (
                    <li key={m.uid}>
                      <strong>{m.subject}</strong> — {m.from} ({formatDate(m.date)})
                    </li>
                  ))}
                </ul>
              </>
            )
          ) : (
            <p>Connection failed: {testResult.error}</p>
          )}
        </div>
      )}

      {error && <p className="form-error">{error}</p>}
    </form>
  );
}
