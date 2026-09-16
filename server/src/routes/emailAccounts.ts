import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { NotFoundError } from "../lib/errors";
import { encrypt, decrypt } from "../lib/crypto";
import { getAttachment, getMessage, listMessages, testConnection } from "../lib/imapClient";

export const emailAccountRouter = Router();

const connectionInput = z.object({
  label: z.string().min(1),
  imapHost: z.string().min(1),
  imapPort: z.coerce.number().int().min(1).max(65535),
  imapUsername: z.string().min(1),
  imapPassword: z.string().min(1),
  imapSecure: z.boolean().optional(),
  smtpHost: z.string().min(1),
  smtpPort: z.coerce.number().int().min(1).max(65535),
  smtpUsername: z.string().min(1),
  smtpPassword: z.string().min(1),
  smtpSecure: z.boolean().optional(),
});

function toImapConfig(data: z.infer<typeof connectionInput>) {
  return {
    host: data.imapHost,
    port: data.imapPort,
    secure: data.imapSecure ?? true,
    username: data.imapUsername,
    password: data.imapPassword,
  };
}

const publicSelect = {
  id: true,
  label: true,
  imapHost: true,
  imapPort: true,
  imapUsername: true,
  imapSecure: true,
  smtpHost: true,
  smtpPort: true,
  smtpUsername: true,
  smtpSecure: true,
  connectionStatus: true,
  connectionError: true,
  lastSyncedAt: true,
  createdAt: true,
} as const;

emailAccountRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const accounts = await prisma.emailAccount.findMany({
      orderBy: { label: "asc" },
      select: publicSelect,
    });
    res.json(accounts);
  })
);

// Ad-hoc test — doesn't persist anything, per spec: "Test-connection
// validates before storing, so a bad password isn't saved blind."
emailAccountRouter.post(
  "/test",
  asyncHandler(async (req, res) => {
    const data = connectionInput.parse(req.body);
    const result = await testConnection(toImapConfig(data));
    res.json(result);
  })
);

emailAccountRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = connectionInput.parse(req.body);
    const result = await testConnection(toImapConfig(data));

    const account = await prisma.emailAccount.create({
      data: {
        label: data.label,
        imapHost: data.imapHost,
        imapPort: data.imapPort,
        imapUsername: data.imapUsername,
        imapPasswordEncrypted: encrypt(data.imapPassword),
        imapSecure: data.imapSecure ?? true,
        smtpHost: data.smtpHost,
        smtpPort: data.smtpPort,
        smtpUsername: data.smtpUsername,
        smtpPasswordEncrypted: encrypt(data.smtpPassword),
        smtpSecure: data.smtpSecure ?? true,
        connectionStatus: result.ok ? "CONNECTED" : "ERROR",
        connectionError: result.ok ? null : result.error,
        lastSyncedAt: result.ok ? new Date() : null,
      },
      select: publicSelect,
    });
    res.status(201).json(account);
  })
);

emailAccountRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.emailAccount.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("EmailAccount", req.params.id);
    await prisma.emailAccount.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

async function loadImapConfig(id: string) {
  const account = await prisma.emailAccount.findUnique({ where: { id } });
  if (!account) throw new NotFoundError("EmailAccount", id);
  return {
    account,
    config: {
      host: account.imapHost,
      port: account.imapPort,
      secure: account.imapSecure,
      username: account.imapUsername,
      password: decrypt(account.imapPasswordEncrypted),
    },
  };
}

// Read-only inbox browser (spec Phase 4 screens 3-4) — fetched live on
// demand, not a background sync, per the stage's own scope.
emailAccountRouter.get(
  "/:id/messages",
  asyncHandler(async (req, res) => {
    const { account, config } = await loadImapConfig(req.params.id);
    try {
      const messages = await listMessages(config);
      await prisma.emailAccount.update({
        where: { id: account.id },
        data: { connectionStatus: "CONNECTED", connectionError: null, lastSyncedAt: new Date() },
      });
      res.json(messages);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      await prisma.emailAccount.update({
        where: { id: account.id },
        data: { connectionStatus: "ERROR", connectionError: message },
      });
      res.status(502).json({ error: message });
    }
  })
);

emailAccountRouter.get(
  "/:id/messages/:uid",
  asyncHandler(async (req, res) => {
    const { config } = await loadImapConfig(req.params.id);
    const message = await getMessage(config, Number(req.params.uid));
    res.json(message);
  })
);

emailAccountRouter.get(
  "/:id/messages/:uid/attachments/:index",
  asyncHandler(async (req, res) => {
    const { config } = await loadImapConfig(req.params.id);
    const attachment = await getAttachment(
      config,
      Number(req.params.uid),
      Number(req.params.index)
    );
    res.setHeader("Content-Type", attachment.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${attachment.filename}"`);
    res.send(attachment.content);
  })
);
