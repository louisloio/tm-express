import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import { api, EmailAccount, MessageDetail, MessageSummary } from "../lib/api";
import { formatDate } from "../lib/dates";

export function EmailInboxPage() {
  const { id } = useParams<{ id: string }>();
  const [account, setAccount] = useState<EmailAccount | null>(null);
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [selected, setSelected] = useState<MessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [accounts, msgs] = await Promise.all([api.listEmailAccounts(), api.listEmailMessages(id)]);
      setAccount(accounts.find((a) => a.id === id) ?? null);
      setMessages(msgs);
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
    </div>
  );
}
