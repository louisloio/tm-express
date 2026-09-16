import { EmailAccount } from "@prisma/client";
import { prisma } from "./prisma";
import { decrypt } from "./crypto";
import { NotFoundError } from "./errors";
import { ImapConfig } from "./imapClient";

export async function loadImapConfig(
  id: string
): Promise<{ account: EmailAccount; config: ImapConfig }> {
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
