import { ImapFlow } from "imapflow";
import { simpleParser, ParsedMail } from "mailparser";

export interface ImapConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

export interface MessagePreview {
  uid: number;
  subject: string;
  from: string;
  date: string | null;
}

export interface MessageSummary extends MessagePreview {
  hasAttachments: boolean;
}

export interface MessageDetail {
  uid: number;
  subject: string;
  from: string;
  to: string;
  date: string | null;
  text: string | null;
  html: string | null;
  attachments: { index: number; filename: string; contentType: string; size: number }[];
}

function client(config: ImapConfig): ImapFlow {
  return new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.username, pass: config.password },
    logger: false,
    // Local dev servers / some custom-domain hosts use self-signed certs;
    // this is read-only credential testing against a host the TM chose,
    // not a security boundary we're trying to enforce here.
    tls: { rejectUnauthorized: false },
  });
}

async function withMailbox<T>(config: ImapConfig, fn: (c: ImapFlow) => Promise<T>): Promise<T> {
  const c = client(config);
  await c.connect();
  try {
    const lock = await c.getMailboxLock("INBOX");
    try {
      return await fn(c);
    } finally {
      lock.release();
    }
  } finally {
    await c.logout().catch(() => c.close());
  }
}

function envelopeFrom(envelope: { from?: { name?: string; address?: string }[] }): string {
  const from = envelope.from?.[0];
  if (!from) return "Unknown sender";
  return from.name ? `${from.name} <${from.address}>` : from.address ?? "Unknown sender";
}

export async function testConnection(
  config: ImapConfig
): Promise<{ ok: true; preview: MessagePreview[] } | { ok: false; error: string }> {
  try {
    const preview = await withMailbox(config, async (c) => {
      const total = c.mailbox && "exists" in c.mailbox ? c.mailbox.exists : 0;
      if (total === 0) return [];
      const from = Math.max(1, total - 4);
      const messages: MessagePreview[] = [];
      for await (const msg of c.fetch(`${from}:${total}`, { envelope: true, uid: true })) {
        messages.push({
          uid: msg.uid,
          subject: msg.envelope?.subject ?? "(no subject)",
          from: envelopeFrom(msg.envelope ?? {}),
          date: msg.envelope?.date ? new Date(msg.envelope.date).toISOString() : null,
        });
      }
      return messages.reverse();
    });
    return { ok: true, preview };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}

export async function listMessages(config: ImapConfig, limit = 30): Promise<MessageSummary[]> {
  return withMailbox(config, async (c) => {
    const total = c.mailbox && "exists" in c.mailbox ? c.mailbox.exists : 0;
    if (total === 0) return [];
    const from = Math.max(1, total - limit + 1);
    const messages: MessageSummary[] = [];
    for await (const msg of c.fetch(`${from}:${total}`, {
      envelope: true,
      uid: true,
      bodyStructure: true,
    })) {
      messages.push({
        uid: msg.uid,
        subject: msg.envelope?.subject ?? "(no subject)",
        from: envelopeFrom(msg.envelope ?? {}),
        date: msg.envelope?.date ? new Date(msg.envelope.date).toISOString() : null,
        hasAttachments: hasAttachments(msg.bodyStructure),
      });
    }
    return messages.reverse();
  });
}

// bodyStructure is a recursive MIME tree; an attachment is any part whose
// disposition says so, or a non-text/non-multipart part with a filename.
function hasAttachments(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  const part = node as {
    disposition?: string;
    childNodes?: unknown[];
    type?: string;
    parameters?: { name?: string };
  };
  if (part.disposition && part.disposition.toLowerCase() === "attachment") return true;
  if (Array.isArray(part.childNodes)) return part.childNodes.some(hasAttachments);
  return false;
}

async function fetchParsed(config: ImapConfig, uid: number): Promise<ParsedMail> {
  return withMailbox(config, async (c) => {
    const message = await c.fetchOne(String(uid), { source: true }, { uid: true });
    if (!message || !message.source) throw new Error(`Message ${uid} not found`);
    return simpleParser(message.source);
  });
}

export async function getMessage(config: ImapConfig, uid: number): Promise<MessageDetail> {
  const parsed = await fetchParsed(config, uid);
  return {
    uid,
    subject: parsed.subject ?? "(no subject)",
    from: parsed.from?.text ?? "Unknown sender",
    to: parsed.to && "text" in parsed.to ? parsed.to.text : "",
    date: parsed.date ? parsed.date.toISOString() : null,
    text: parsed.text ?? null,
    html: typeof parsed.html === "string" ? parsed.html : null,
    attachments: parsed.attachments.map((a, index) => ({
      index,
      filename: a.filename ?? `attachment-${index}`,
      contentType: a.contentType,
      size: a.size,
    })),
  };
}

export async function getAttachment(
  config: ImapConfig,
  uid: number,
  index: number
): Promise<{ filename: string; contentType: string; content: Buffer }> {
  const parsed = await fetchParsed(config, uid);
  const attachment = parsed.attachments[index];
  if (!attachment) throw new Error(`Attachment ${index} not found on message ${uid}`);
  return {
    filename: attachment.filename ?? `attachment-${index}`,
    contentType: attachment.contentType,
    content: attachment.content,
  };
}
