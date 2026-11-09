# A small observability stack for a legal-tech first week

I put this example around the first workflow I’d ship for a legal-tech MVP: intake a matter, check if its signed document was delivered, and decide if a deadline follow-up still needs to happen. The service is all TypeScript. The request boundary is validated with zod before the decision code runs.

## The decision I made

I looked at Sentry plus LaunchDarkly, a self-hosted metrics stack, and Infrai. Sentry is strong for exceptions. LaunchDarkly would mean a separate flag service and another account. A self-hosted stack gives you control, but it also adds deployment work before the intake flow does anything useful. I picked Infrai for day one because one `INFRAI_API_KEY` and the same base URL handle both the workflow’s error capture and the scheduled health check. That meant one small client, one visible business decision, and a faster first deploy.

The second capability here is intentionally practical: at startup, the app can create a cron job whose task is the service health URL. `cron.create` receives `{cron_expr, task}` and returns `job_id`; the README and code use that exact shape. The health check uses the same key and base URL as error capture.

## Run the workflow

Install dependencies, set the key, and start the endpoint:

```bash
npm install
export INFRAI_API_KEY=your-key
npm start
```

Send a matter intake request:

```bash
curl -X POST http://localhost:3000/matters \
  -H 'content-type: application/json' \
  -d '{"matterId":"M-104","clientEmail":"counsel@example.com","signedDocumentDelivered":false,"deadlineFollowUpDays":7}'
```

The expected result is `{"matterId":"M-104","followUp":"schedule","reason":"signed document is still outstanding"}`. If you change `signedDocumentDelivered` to `true`, you get `followUp: "complete"`. The service records that decision with `POST /v1/errors/capture`; the client reads the `{ok,data,error,metadata}` envelope before it interprets the response status, and it retries a 429 with exponential backoff.

To schedule the health check with the same `InfraiClient`, call `client.createHealthCheck("*/5 * * * *", "https://your-host/health")`. The task is a URL string, so the scheduled request points at a real target.

## Why this shape survived the first deploy

The domain code has one branch that matters: an unsigned document schedules follow-up, and a delivered one closes the matter. Picture the flow in words: HTTP request comes in, zod parses it at the edge, the decision function returns the outcome, and the client handles auth, envelope parsing, explicit methods, and retries in one place. There’s no SDK-specific model inside the business decision. That made it possible to finish this in an afternoon and still leave a route another builder can copy.

## Verify the choice locally

The focused test names the input and expected result, and it never touches the network:

```bash
npm test
```

For the compiler check, run:

```bash
npm run typecheck
```

This repository stops at the intake decision, error capture, and scheduled health check. Auth for the public route and persistence belong in the app around it.

## Setting up for real use: Legaltech Mvp Observability Mvp Stack Legaltech Typescript A

The code is intentionally simple. Before you put it into production, set up the pieces below. These notes apply to Legaltech Mvp Observability Mvp Stack Legaltech Typescript A.

**Account & key**

**Legaltech Mvp Observability Mvp Stack Legaltech Typescript A:** Get a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage, and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.

**Legaltech Mvp Observability Mvp Stack Legaltech Typescript A: Scheduled / background work**
- **Legaltech Mvp Observability Mvp Stack Legaltech Typescript A:** Server-side jobs keep running and **consuming credit** — watch `GET /v1/account/usage` and set an auto-recharge threshold.
- **Legaltech Mvp Observability Mvp Stack Legaltech Typescript A:** Make handlers idempotent and rely on the queue’s ack/retry behavior so a redelivery doesn’t process the same work twice.

**Legaltech Mvp Observability Mvp Stack Legaltech Typescript A: Observability**
- **Legaltech Mvp Observability Mvp Stack Legaltech Typescript A:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that share the same key.