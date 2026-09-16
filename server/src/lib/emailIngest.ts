import { Client, Vehicle } from "@prisma/client";
import { prisma } from "./prisma";
import { fetchNewMessages, IngestMessage } from "./imapClient";
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

// Scans one connected mailbox for messages arrived since the last sync,
// matches each to a client by sender domain, classifies any attachments
// with Claude, and files whatever looks like a real compliance document —
// immediately, with no review step, per the user's explicit choice. Every
// message gets one EmailIngestLog row regardless of outcome, so filing is
// never a silent guess even though it isn't gated.
export async function syncAccount(accountId: string): Promise<void> {
  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } });
  if (!account) return;

  const { config } = await loadImapConfig(accountId);

  let messages: IngestMessage[];
  try {
    messages = await fetchNewMessages(config, account.lastProcessedUid);
  } catch (err) {
    console.error(`[email-ingest] fetch failed for account ${accountId}:`, err);
    await prisma.emailAccount.update({
      where: { id: accountId },
      data: {
        connectionStatus: "ERROR",
        connectionError: err instanceof Error ? err.message : "Fetch failed",
      },
    });
    return;
  }

  for (const message of messages) {
    const fromAddress = message.parsed.from?.value?.[0]?.address ?? message.from;
    try {
      const client = await matchClientByDomain(fromAddress);
      if (!client) {
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
      } else {
        const vehicles = await prisma.vehicle.findMany({ where: { clientId: client.id } });
        const result = await processMessage(accountId, message, client, vehicles);
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
      }
    } catch (err) {
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

    // Advance after each message (not just at the end) so a later crash
    // doesn't reprocess messages already handled.
    await prisma.emailAccount.update({
      where: { id: accountId },
      data: { lastProcessedUid: message.uid },
    });
  }

  await prisma.emailAccount.update({
    where: { id: accountId },
    data: { connectionStatus: "CONNECTED", connectionError: null, lastSyncedAt: new Date() },
  });
}
