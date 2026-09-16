import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, EmailAccount } from "../lib/api";
import { EmailAccountForm } from "../components/EmailAccountForm";
import { Modal } from "../components/Modal";
import { formatDate } from "../lib/dates";

const statusLabel: Record<EmailAccount["connectionStatus"], string> = {
  UNTESTED: "Untested",
  CONNECTED: "Connected",
  ERROR: "Error",
};

const statusBadgeClass: Record<EmailAccount["connectionStatus"], string> = {
  UNTESTED: "badge-grey",
  CONNECTED: "badge-green",
  ERROR: "badge-red",
};

export function EmailConnectionsPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    setLoading(true);
    setAccounts(await api.listEmailAccounts());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(account: EmailAccount) {
    if (!confirm(`Disconnect "${account.label}"? This removes it — no longer just hiding it.`))
      return;
    await api.deleteEmailAccount(account.id);
    await load();
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/" className="back-link">
            ← Dashboard
          </Link>
          <h1>Email connections</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          + Add account
        </button>
      </div>

      <section className="card">
        {loading ? (
          <p>Loading…</p>
        ) : accounts.length === 0 ? (
          <p className="empty-state">
            No mailboxes linked yet. Add one to browse its inbox read-only — no sending or
            auto-filing yet, that's a later stage.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Label</th>
                <th>IMAP host</th>
                <th>Status</th>
                <th>Last synced</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link to={`/email-connections/${a.id}`}>{a.label}</Link>
                  </td>
                  <td>
                    {a.imapHost}:{a.imapPort}
                  </td>
                  <td>
                    <span className={`badge ${statusBadgeClass[a.connectionStatus]}`}>
                      {statusLabel[a.connectionStatus]}
                    </span>
                    {a.connectionStatus === "ERROR" && a.connectionError && (
                      <div className="account-status">{a.connectionError}</div>
                    )}
                  </td>
                  <td>{a.lastSyncedAt ? formatDate(a.lastSyncedAt) : "Never"}</td>
                  <td className="row-actions">
                    <button className="link-btn danger" onClick={() => handleDelete(a)}>
                      Disconnect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {showAdd && (
        <Modal title="Add email account" onClose={() => setShowAdd(false)}>
          <EmailAccountForm
            onDone={async () => {
              setShowAdd(false);
              await load();
            }}
            onCancel={() => setShowAdd(false)}
          />
        </Modal>
      )}
    </div>
  );
}
