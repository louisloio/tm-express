import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import { api, EmailAccount, EmailIngestLog, MessageDetail, MessageSummary } from "../lib/api";
import { formatDate } from "../lib/dates";

const INGEST_STATUS_LABEL: Record<EmailIngestLog["status"], string> = {
  FILED: "Filed",
  SKIPPED_NO_CLIENT: "No client matched",
  SKIPPED_NOT_DOCUMENT: "Not a document",
  ERROR: "Error",
};

const INGEST_STATUS_BADGE: Record<EmailIngestLog["status"], string> = {
  FILED: "badge-green",
  SKIPPED_NO_CLIENT: "badge-grey",
  SKIPPED_NOT_DOCUMENT: "badge-grey",
  ERROR: "badge-red",
};

export function EmailInboxPage() {
  const { id } = useParams<{ id: string }>();
  const [account, setAccount] = useState<EmailAccount | null>(null);
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [selected, setSelected] = useState<MessageDetail | null>(null);
  const [ingestLog, setIngestLog] = useState<EmailIngestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [accounts, msgs, log] = await Promise.all([
        api.listEmailAccounts(),
        api.listEmailMessages(id),
        api.listEmailIngestLog(id),
      ]);
      setAccount(accounts.find((a) => a.id === id) ?? null);
      setMessages(msgs);
      setIngestLog(log);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load messages");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function openMessage(uid: number) {
    if (!id) return;
    setLoadingMessage(true);
    try {
      setSelected(await api.getEmailMessage(id, uid));
    } finally {
      setLoadingMessage(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/email-connections" className="back-link">
            ← Email connections
          </Link>
          <h1>{account?.label ?? "Inbox"}</h1>
        </div>
        <button className="btn btn-secondary" onClick={load}>
          Refresh
        </button>
      </div>

      {error && (
        <section className="card">
          <p className="form-error">Couldn't fetch messages: {error}</p>
        </section>
      )}

      <div className="dashboard-grid">
        <section className="card">
          <h2>Messages ({messages.length})</h2>
          {loading ? (
            <p>Loading…</p>
          ) : messages.length === 0 ? (
            <p className="empty-state">No messages in this inbox.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>From</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <tr key={m.uid}>
                    <td>{m.subject}</td>
                    <td>{m.from}</td>
                    <td>{formatDate(m.date)}</td>
                    <td className="row-actions">
                      <button className="link-btn" onClick={() => openMessage(m.uid)}>
                        {m.hasAttachments ? "Open (has attachments)" : "Open"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <h2>Message</h2>
          {loadingMessage ? (
            <p>Loading…</p>
          ) : !selected ? (
            <p className="empty-state">Select a message to read it.</p>
          ) : (
            <div>
              <h3 style={{ marginTop: 0 }}>{selected.subject}</h3>
              <p className="field-help">
                From {selected.from} to {selected.to} · {formatDate(selected.date)}
              </p>
              {selected.attachments.length > 0 && (
                <div style={{ margin: "12px 0" }}>
                  <strong style={{ fontSize: 13 }}>Attachments</strong>
                  <ul>
                    {selected.attachments.map((att) => (
                      <li key={att.index}>
                        <a
                          href={api.emailAttachmentUrl(id!, selected.uid, att.index)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {att.filename}
                        </a>{" "}
                        <span className="field-help" style={{ display: "inline" }}>
                          ({Math.round(att.size / 1024)} KB)
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selected.html ? (
                // Email HTML is untrusted content — sanitize before rendering,
                // and forbid iframe/object/embed on top of DOMPurify's defaults.
                <div
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(selected.html, {
                      FORBID_TAGS: ["iframe", "object", "embed", "style"],
                    }),
                  }}
                />
              ) : (
                <pre style={{ whiteSpace: "pre-wrap", font: "inherit" }}>{selected.text}</pre>
              )}
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <h2>Auto-fill activity ({ingestLog.length})</h2>
        <p className="field-help" style={{ marginBottom: 12 }}>
          Every message this account has scanned, and what happened to it — filing is
          automatic, not a review queue, so this is the audit trail rather than an approval
          step.
        </p>
        {ingestLog.length === 0 ? (
          <p className="empty-state">Nothing scanned yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Subject</th>
                <th>From</th>
                <th>Status</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {ingestLog.map((log) => (
                <tr key={log.id}>
                  <td>{formatDate(log.createdAt)}</td>
                  <td>{log.subject}</td>
                  <td>{log.fromAddress}</td>
                  <td>
                    <span className={`badge ${INGEST_STATUS_BADGE[log.status]}`}>
                      {INGEST_STATUS_LABEL[log.status]}
                    </span>
                  </td>
                  <td>{log.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
