import { Client, Vehicle } from "@prisma/client";
import { prisma } from "./prisma";
import { fetchNewMessages, fetchRecentMessages, IngestMessage } from "./imapClient";
import { classifyAttachment } from "./emailClassifier";
import { fileDocument, saveUploadedFile } from "./documentFiling";
import { loadImapConfig } from "./emailAccountConfig";

function domainOf(email: string): string | null {
  const match = email.trim().toLowerCase().match(/@([^@]+)$/);
  return match ? match[1] : null;
}

// Simplified version of spec section 5's "Client email matching model" —
// domain matching only, derived from the client's own contactEmail. The
// generic-provider (Gmail/Hotmail) manual-address list and oversight view
// aren't built yet, so a sender on one of those domains won't match here.
export async function matchClientByDomain(fromAddress: string): Promise<Client | null> {
  const senderDomain = domainOf(fromAddress);
  if (!senderDomain) return null;

  const clients = await prisma.client.findMany({ where: { contactEmail: { not: null } } });
  return (
    clients.find((c) => c.contactEmail && domainOf(c.contactEmail) === senderDomain) ?? null
  );
}

function normalizeReg(reg: string): string {
  return reg.replace(/\s+/g, "").toUpperCase();
}

function matchVehicle(vehicles: Vehicle[], registration: string | null): Vehicle | null {
  if (!registration) return null;
  const target = normalizeReg(registration);
  return vehicles.find((v) => normalizeReg(v.registration) === target) ?? null;
}

export async function processMessage(
  accountId: string,
  message: IngestMessage,
  client: Client,
  vehicles: Vehicle[]
): Promise<{ status: "FILED" | "SKIPPED_NOT_DOCUMENT" | "ERROR"; summary: string }> {
  const attachments = message.parsed.attachments ?? [];
  if (attachments.length === 0) {
    return { status: "SKIPPED_NOT_DOCUMENT", summary: "No attachments to classify." };
  }

  const filedDescriptions: string[] = [];
  const skippedDescriptions: string[] = [];

  for (const attachment of attachments) {
    const classification = await classifyAttachment({
      emailSubject: message.subject,
      emailBodyText: message.parsed.text ?? "",
      attachmentFilename: attachment.filename ?? "attachment",
      attachmentContentType: attachment.contentType,
      attachmentContent: attachment.content,
      vehicleRegistrations: vehicles.map((v) => v.registration),
    });

    if (!classification.isComplianceDocument || !classification.documentType) {
      skippedDescriptions.push(
        `${attachment.filename ?? "attachment"}: ${classification.reasoning}`
      );
      continue;
    }

    const vehicle = matchVehicle(vehicles, classification.vehicleRegistration);
    const storedName = saveUploadedFile(attachment.filename ?? "attachment", attachment.content);
    const validUntil = classification.validUntilDate ? new Date(classification.validUntilDate) : null;

    await fileDocument({
      clientId: client.id,
      vehicleId: vehicle?.id ?? null,
      type: classification.documentType,
      fileName: attachment.filename ?? "attachment",
      filePath: storedName,
      validUntil,
    });

    filedDescriptions.push(
      `${classification.documentType}${vehicle ? ` for ${vehicle.registration}` : ""}${
        validUntil ? ` (valid until ${validUntil.toISOString().slice(0, 10)})` : ""
      } — ${classification.confidence} confidence`
    );
  }

  if (filedDescriptions.length > 0) {
    return {
      status: "FILED",
      summary: [
        `Filed: ${filedDescriptions.join("; ")}`,
        skippedDescriptions.length > 0 ? `Skipped: ${skippedDescriptions.join("; ")}` : null,
      ]
        .filter(Boolean)
        .join(". "),
    };
  }
  return {
    status: "SKIPPED_NOT_DOCUMENT",
    summary: skippedDescriptions.join("; ") || "No compliance document identified.",
  };
}

export interface IngestSummary {
  scanned: number;
  filed: number;
  skippedNoClient: number;
  skippedNotDocument: number;
  alreadyFiled: number;
  errors: number;
}

function emptySummary(): IngestSummary {
  return { scanned: 0, filed: 0, skippedNoClient: 0, skippedNotDocument: 0, alreadyFiled: 0, errors: 0 };
}

function mergeSummary(into: IngestSummary, from: IngestSummary): void {
  into.scanned += from.scanned;
  into.filed += from.filed;
  into.skippedNoClient += from.skippedNoClient;
  into.skippedNotDocument += from.skippedNotDocument;
  into.alreadyFiled += from.alreadyFiled;
  into.errors += from.errors;
}

// The incremental poll and a user-triggered rescan can legitimately overlap
// the same messages (rescan explicitly ignores lastProcessedUid). Without
// this, both classify and file the same attachment again — real duplicate
// Document rows, not just wasted Claude calls.
async function alreadyFiled(accountId: string, messageUid: number): Promise<boolean> {
  const existing = await prisma.emailIngestLog.findFirst({
    where: { emailAccountId: accountId, messageUid, status: "FILED" },
    select: { id: true },
  });
  return existing !== null;
}

// Processes a fixed batch of already-fetched messages: match → classify →
// file, one EmailIngestLog row per message regardless of outcome. Shared by
// the incremental poll and the user-triggered rescan — they differ only in
// which messages they hand in and whether the cursor advances afterward.
async function ingestMessages(accountId: string, messages: IngestMessage[]): Promise<IngestSummary> {
  const summary = emptySummary();

  for (const message of messages) {
    summary.scanned++;
    const fromAddress = message.parsed.from?.value?.[0]?.address ?? message.from;
    try {
      if (await alreadyFiled(accountId, message.uid)) {
        summary.alreadyFiled++;
        continue;
      }
      const client = await matchClientByDomain(fromAddress);
      if (!client) {
        summary.skippedNoClient++;
        await prisma.emailIngestLog.create({
          data: {
            emailAccountId: accountId,
            messageUid: message.uid,
            subject: message.subject,
            fromAddress,
            status: "SKIPPED_NO_CLIENT",
            summary: `No client's contact domain matches "${fromAddress}".`,
          },
        });
        continue;
      }

      const vehicles = await prisma.vehicle.findMany({ where: { clientId: client.id } });
      const result = await processMessage(accountId, message, client, vehicles);
      if (result.status === "FILED") summary.filed++;
      else summary.skippedNotDocument++;
      await prisma.emailIngestLog.create({
        data: {
          emailAccountId: accountId,
          messageUid: message.uid,
          subject: message.subject,
          fromAddress,
          clientId: client.id,
          status: result.status,
          summary: result.summary,
        },
      });
    } catch (err) {
      summary.errors++;
      console.error(`[email-ingest] message ${message.uid} failed:`, err);
      await prisma.emailIngestLog.create({
        data: {
          emailAccountId: accountId,
          messageUid: message.uid,
          subject: message.subject,
          fromAddress,
          status: "ERROR",
          summary: err instanceof Error ? err.message : "Unknown error",
        },
      });
    }
  }

  return summary;
}

// The periodic poll and a user-triggered rescan can otherwise fire for the
// same account at once — two IMAP sessions racing on one mailbox, which is
// what produced a hard "Connection not available" failure in practice, on
// top of the duplicate-filing risk alreadyFiled() only half-covers (it
// can't see an in-flight, not-yet-logged classification from the other run).
const accountsInProgress = new Set<string>();

async function withAccountLock<T>(accountId: string, fn: () => Promise<T>): Promise<T | undefined> {
  if (accountsInProgress.has(accountId)) {
    console.log(`[email-ingest] skipping — account ${accountId} already has a sync in progress`);
    return undefined;
  }
  accountsInProgress.add(accountId);
  try {
    return await fn();
  } finally {
    accountsInProgress.delete(accountId);
  }
}

// Scans one connected mailbox for messages arrived since the last sync,
// matches each to a client by sender domain, classifies any attachments
// with Claude, and files whatever looks like a real compliance document —
// immediately, with no review step, per the user's explicit choice.
export async function syncAccount(accountId: string): Promise<IngestSummary | void> {
  return withAccountLock(accountId, () => doSyncAccount(accountId));
}

// Persists progress after every batch (not just at the end) so a mid-scan
// connection drop only loses the batch in flight — a later sync/rescan
// resumes from lastProcessedUid rather than starting over or losing what
// already got filed.
async function makeBatchHandler(
  accountId: string,
  summary: IngestSummary,
  getCursor: () => number
): Promise<(messages: IngestMessage[]) => Promise<void>> {
  let cursor = getCursor();
  return async (messages: IngestMessage[]) => {
    const batchSummary = await ingestMessages(accountId, messages);
    mergeSummary(summary, batchSummary);
    if (messages.length > 0) {
      cursor = Math.max(cursor, ...messages.map((m) => m.uid));
      await prisma.emailAccount.update({ where: { id: accountId }, data: { lastProcessedUid: cursor } });
    }
  };
}

async function doSyncAccount(accountId: string): Promise<IngestSummary | void> {
  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } });
  if (!account) return;

  const { config } = await loadImapConfig(accountId);
  const summary = emptySummary();

  try {
    const onBatch = await makeBatchHandler(accountId, summary, () => account.lastProcessedUid ?? 0);
    await fetchNewMessages(config, account.lastProcessedUid, onBatch);
    await prisma.emailAccount.update({
      where: { id: accountId },
      data: { connectionStatus: "CONNECTED", connectionError: null, lastSyncedAt: new Date() },
    });
  } catch (err) {
    console.error(`[email-ingest] sync failed for account ${accountId}:`, err);
    await prisma.emailAccount.update({
      where: { id: accountId },
      data: {
        connectionStatus: "ERROR",
        connectionError: err instanceof Error ? err.message : "Fetch failed",
      },
    });
  }

  return summary;
}

// User-triggered: re-scans the most recent `limit` messages regardless of
// what's already been processed, for when something should have been
// filed and wasn't. Advances lastProcessedUid forward if this reaches
// further than the incremental sync had (never backward, so a later poll
// can't re-trigger on messages the rescan already covered).
export async function rescanAccount(accountId: string, limit = 100): Promise<IngestSummary> {
  const result = await withAccountLock(accountId, () => doRescanAccount(accountId, limit));
  if (!result) {
    throw new Error("A sync for this account is already in progress — try again shortly.");
  }
  return result;
}

async function doRescanAccount(accountId: string, limit: number): Promise<IngestSummary> {
  const account = await prisma.emailAccount.findUniqueOrThrow({ where: { id: accountId } });
  const { config } = await loadImapConfig(accountId);
  const summary = emptySummary();

  try {
    const onBatch = await makeBatchHandler(accountId, summary, () => account.lastProcessedUid ?? 0);
    await fetchRecentMessages(config, limit, onBatch);
    await prisma.emailAccount.update({
      where: { id: accountId },
      data: { connectionStatus: "CONNECTED", connectionError: null, lastSyncedAt: new Date() },
    });
  } catch (err) {
    console.error(`[email-ingest] rescan failed for account ${accountId}:`, err);
    await prisma.emailAccount.update({
      where: { id: accountId },
      data: { connectionStatus: "ERROR", connectionError: err instanceof Error ? err.message : "Fetch failed" },
    });
    throw err;
  }

  return summary;
}
