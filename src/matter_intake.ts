import { createServer } from "node:http";
import { z } from "zod";
import { InfraiClient, InfraiError } from "./infrai_client.ts";

const matterBody = z.object({
  matterId: z.string().min(1),
  clientEmail: z.string().email(),
  signedDocumentDelivered: z.boolean(),
  deadlineFollowUpDays: z.number().int().min(1).max(365)
});

export type MatterDecision = { matterId: string; followUp: "schedule" | "complete"; reason: string };

export function decideMatter(input: z.infer<typeof matterBody>): MatterDecision {
  if (!input.signedDocumentDelivered) return { matterId: input.matterId, followUp: "schedule", reason: "signed document is still outstanding" };
  return { matterId: input.matterId, followUp: "complete", reason: "signed document delivered" };
}

export async function handleMatter(raw: unknown, client: InfraiClient): Promise<MatterDecision> {
  const input = matterBody.parse(raw);
  const decision = decideMatter(input);
  await client.capture({ name: "matter_intake", message: decision.reason }, { matterId: input.matterId, followUp: decision.followUp });
  return decision;
}

export function startMatterIntake(client = new InfraiClient(), port = Number(process.env.PORT ?? 3000)) {
  const server = createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/matters") { response.writeHead(404).end(); return; }
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const result = await handleMatter(JSON.parse(Buffer.concat(chunks).toString("utf8")), client);
      response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(result));
    } catch (error) {
      const status = error instanceof z.ZodError ? 400 : error instanceof InfraiError && error.status < 500 ? error.status : 500;
      response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify({ error: error instanceof Error ? error.message : "request failed" }));
    }
  });
  server.listen(port);
  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) startMatterIntake();
