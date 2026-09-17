import { ImapFlow } from "imapflow";
import type { ImapFlowError } from "imapflow";
import { simpleParser, ParsedMail } from "mailparser";

// imapflow's own err.message is often a generic "Command failed" — the
// actually useful text (auth rejection reason, server response) lives in
// these extra properties. Prefer them when present.
export function describeImapError(err: unknown): string {
  if (err instanceof Error) {
    const e = err as ImapFlowError;
    if (e.authenticationFailed) {
      return `Authentication failed${e.responseText ? `: ${e.responseText}` : " — check the username and password"}`;
    }
    if (e.responseText) return e.responseText;
    if (e.code === "ETIMEDOUT" || e.code === "ETIMEOUT") {
      return `Timed out connecting to the server (${e.code})`;
    }
    return err.message;
  }
  return "Connection failed";
}

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

function client(config: ImapConfig, loginMethod?: "LOGIN"): ImapFlow {
  return new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.username, pass: config.password, loginMethod },
    logger: false,
    // Local dev servers / some custom-domain hosts use self-signed certs;
    // this is read-only credential testing against a host the TM chose,
    // not a security boundary we're trying to enforce here.
    tls: { rejectUnauthorized: false },
  });
}

function isAuthenticateMechanismFailure(err: unknown): boolean {
  const e = err as ImapFlowError;
  return Boolean(e?.authenticationFailed && e.executedCommand?.includes("AUTHENTICATE"));
}

// Some IMAP servers advertise AUTH=PLAIN but actually reject it, only
// accepting the classic LOGIN command with the same credentials. imapflow
// prefers AUTHENTICATE by default, so retry with LOGIN forced before
// concluding the credentials themselves are wrong.
async function connectWithFallback(config: ImapConfig): Promise<ImapFlow> {
  const c = client(config);
  try {
    await c.connect();
    return c;
  } catch (err) {
    if (!isAuthenticateMechanismFailure(err)) throw err;
    const fallback = client(config, "LOGIN");
    await fallback.connect();
    return fallback;
  }
}

async function withMailbox<T>(config: ImapConfig, fn: (c: ImapFlow) => Promise<T>): Promise<T> {
  const c = await connectWithFallback(config);
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
    console.error("[imap] test connection failed:", err);
    return { ok: false, error: describeImapError(err) };
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

export interface IngestMessage {
  uid: number;
  subject: string;
  from: string;
  parsed: ParsedMail;
}

// On the very first sync for an account (sinceUid is null), bounded by date
// rather than the whole mailbox history — connecting an account backfills
// the last year, not everything that's ever arrived.
const FIRST_SYNC_LOOKBACK_DAYS = 360;

// Some mail servers drop a connection that stays open too long fetching many
// full messages in one FETCH stream (seen in practice: "Connection not
// available" partway through 100 messages). Fetching UIDs in small batches,
// each its own connect/logout, keeps any single connection short-lived —
// and since the caller persists progress after every batch, a mid-scan
// drop only costs that one batch, not the whole run.
const FETCH_BATCH_SIZE = 15;

async function getMailboxTotal(config: ImapConfig): Promise<number> {
  return withMailbox(config, async (c) => (c.mailbox && "exists" in c.mailbox ? c.mailbox.exists : 0));
}

// Cheap pass: just the UIDs matching a range/search, no message bodies.
async function resolveUids(config: ImapConfig, range: Parameters<ImapFlow["fetch"]>[0]): Promise<number[]> {
  return withMailbox(config, async (c) => {
    const uids: number[] = [];
    for await (const msg of c.fetch(range, { uid: true }, { uid: true })) {
      uids.push(msg.uid);
    }
    return uids.sort((a, b) => a - b);
  });
}

async function fetchUidBatch(config: ImapConfig, uids: number[]): Promise<IngestMessage[]> {
  return withMailbox(config, async (c) => {
    const messages: IngestMessage[] = [];
    for await (const msg of c.fetch(uids, { source: true, envelope: true, uid: true }, { uid: true })) {
      if (!msg.source) continue;
      const parsed = await simpleParser(msg.source);
      messages.push({
        uid: msg.uid,
        subject: msg.envelope?.subject ?? "(no subject)",
        from: envelopeFrom(msg.envelope ?? {}),
        parsed,
      });
    }
    return messages.sort((a, b) => a.uid - b.uid);
  });
}

// Resolves which UIDs match, then fetches them in small batches, calling
// `onBatch` after each one completes — the caller (emailIngest.ts) uses
// that to classify/file and persist a cursor as it goes, rather than
// waiting for the whole set before anything is durable.
async function fetchInBatches(
  config: ImapConfig,
  uids: number[],
  onBatch: (messages: IngestMessage[]) => Promise<void>
): Promise<void> {
  for (let i = 0; i < uids.length; i += FETCH_BATCH_SIZE) {
    const batchUids = uids.slice(i, i + FETCH_BATCH_SIZE);
    console.log(
      `[imap] fetching batch ${Math.floor(i / FETCH_BATCH_SIZE) + 1}/${Math.ceil(uids.length / FETCH_BATCH_SIZE)} (${batchUids.length} message(s))`
    );
    const messages = await fetchUidBatch(config, batchUids);
    await onBatch(messages);
  }
}

// Messages newer than `sinceUid` (exclusive) on later syncs, or everything
// within the lookback window on the first one. Fetched in short-lived
// batches — see FETCH_BATCH_SIZE.
export async function fetchNewMessages(
  config: ImapConfig,
  sinceUid: number | null,
  onBatch: (messages: IngestMessage[]) => Promise<void>
): Promise<void> {
  const total = await getMailboxTotal(config);
  console.log(`[imap] mailbox has ${total} message(s) total; lastProcessedUid=${sinceUid}`);
  if (total === 0) return;

  const isFirstSync = sinceUid === null;
  const range = isFirstSync
    ? { since: new Date(Date.now() - FIRST_SYNC_LOOKBACK_DAYS * 24 * 60 * 60 * 1000) }
    : `${sinceUid + 1}:*`;

  const uids = await resolveUids(config, range);
  console.log(`[imap] ${uids.length} message(s) match the sync criteria`);
  await fetchInBatches(config, uids, onBatch);
}

// Always the most recent `limit` messages, ignoring lastProcessedUid — for
// the user-triggered "rescan" action, independent of the incremental sync.
export async function fetchRecentMessages(
  config: ImapConfig,
  limit: number,
  onBatch: (messages: IngestMessage[]) => Promise<void>
): Promise<void> {
  const total = await getMailboxTotal(config);
  console.log(`[imap] mailbox has ${total} message(s) total; rescanning last ${limit}`);
  if (total === 0) return;

  const range = `${Math.max(1, total - limit + 1)}:${total}`;
  const uids = await resolveUids(config, range);
  await fetchInBatches(config, uids, onBatch);
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
