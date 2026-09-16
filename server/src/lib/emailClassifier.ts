import Anthropic from "@anthropic-ai/sdk";
import { DocumentType } from "@prisma/client";
import { z } from "zod";

const MODEL = "claude-sonnet-5";
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

const DOCUMENT_TYPES: DocumentType[] = [
  "PMI",
  "BRAKE_TEST",
  "MOT",
  "VED",
  "INSURANCE",
  "LICENCE_CHECK",
  "CPC",
  "INFRINGEMENT_REPORT",
  "DEPOT_VISIT_NOTE",
  "OTHER",
];

const classificationSchema = z.object({
  isComplianceDocument: z.boolean(),
  documentType: z.enum(DOCUMENT_TYPES as [DocumentType, ...DocumentType[]]).nullable(),
  vehicleRegistration: z.string().nullable(),
  validUntilDate: z.string().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  reasoning: z.string(),
});

export type Classification = z.infer<typeof classificationSchema>;

export interface ClassifyInput {
  emailSubject: string;
  emailBodyText: string;
  attachmentFilename: string;
  attachmentContentType: string;
  attachmentContent: Buffer;
  vehicleRegistrations: string[];
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set — add it to server/.env to enable email auto-filing"
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

function contentBlockFor(input: ClassifyInput): Anthropic.Messages.ContentBlockParam | null {
  const { attachmentContentType, attachmentContent } = input;
  if (attachmentContent.length > MAX_ATTACHMENT_BYTES) return null;

  if (attachmentContentType === "application/pdf") {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: attachmentContent.toString("base64") },
    };
  }
  if (attachmentContentType.startsWith("image/")) {
    const mediaType = attachmentContentType as
      | "image/jpeg"
      | "image/png"
      | "image/gif"
      | "image/webp";
    return {
      type: "image",
      source: { type: "base64", media_type: mediaType, data: attachmentContent.toString("base64") },
    };
  }
  return null;
}

// Classifies one email attachment against TM Express's document taxonomy:
// is it a compliance document, which type, which of this client's vehicles
// it's for, and its valid-until date if stated. Filing happens immediately
// on a positive result (fully automatic, per the user's explicit choice) —
// this function only classifies, the caller decides what to do with it.
export async function classifyAttachment(input: ClassifyInput): Promise<Classification> {
  const attachmentBlock = contentBlockFor(input);

  const contextNote = attachmentBlock
    ? ""
    : `\n\nNote: the attachment "${input.attachmentFilename}" (${input.attachmentContentType}) could not be read directly — classify based on filename and email context only, and reflect that limitation in your confidence.`;

  const promptText = `You are filing compliance documents for a UK HGV operator's Transport Manager. An email arrived with an attachment. Decide whether the attachment is one of these document types: ${DOCUMENT_TYPES.join(", ")} (OTHER if it's a real document but doesn't fit; say it is not a compliance document at all if it's unrelated, e.g. an invoice or general correspondence with no attached record).

Email subject: ${input.emailSubject}
Email body:
${input.emailBodyText.slice(0, 3000)}

Attachment filename: ${input.attachmentFilename}

This client's vehicles: ${input.vehicleRegistrations.length > 0 ? input.vehicleRegistrations.join(", ") : "(none on file)"}

If the document is for one of these vehicles, return its exact registration as listed. If it states a certificate/test/expiry valid-until date, return it as an ISO 8601 date (YYYY-MM-DD). If no such date is stated, return null — do not guess one.${contextNote}`;

  const content: Anthropic.Messages.ContentBlockParam[] = [{ type: "text", text: promptText }];
  if (attachmentBlock) content.push(attachmentBlock);

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    tools: [
      {
        name: "classify_document",
        description: "Report the classification of this email attachment.",
        input_schema: {
          type: "object",
          properties: {
            isComplianceDocument: { type: "boolean" },
            documentType: {
              type: ["string", "null"],
              enum: [...DOCUMENT_TYPES, null],
              description: "One of the listed document types, or null if not a compliance document",
            },
            vehicleRegistration: {
              type: ["string", "null"],
              description: "Exact registration from the provided list, or null",
            },
            validUntilDate: {
              type: ["string", "null"],
              description: "ISO 8601 date (YYYY-MM-DD), or null if not stated",
            },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
            reasoning: { type: "string", description: "One or two sentences explaining the decision" },
          },
          required: [
            "isComplianceDocument",
            "documentType",
            "vehicleRegistration",
            "validUntilDate",
            "confidence",
            "reasoning",
          ],
        },
      },
    ],
    tool_choice: { type: "tool", name: "classify_document" },
    messages: [{ role: "user", content }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.Messages.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) throw new Error("Claude did not return a classification");

  return classificationSchema.parse(toolUse.input);
}
