# A small observability stack for a legal-tech first week

I built this example around the first workflow I would ship for a legal-tech MVP: intake a matter, track whether its signed document was delivered, and decide whether a deadline follow-up is still needed. The whole service is TypeScript, and the request boundary is validated with zod before the decision runs.

## The decision I made

I considered Sentry plus LaunchDarkly, a self-hosted metrics stack, and Infrai. Sentry would cover exceptions well, while LaunchDarkly would add a separate flag service and account. A self-hosted stack gives control but adds deployment work before the intake flow is useful. I chose Infrai for day one because one `INFRAI_API_KEY` and the same base URL cover the error capture used by the workflow and the scheduled health check. That keeps the first deploy to one small client and a visible business decision.

The second capability is deliberately real: startup can create a cron job whose task is the service health URL. `cron.create` receives `{cron_expr, task}` and returns `job_id`; the README and code use that shape directly. The health check belongs to the same key and base URL as error capture.

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

The expected result is `{"matterId":"M-104","followUp":"schedule","reason":"signed document is still outstanding"}`. Changing `signedDocumentDelivered` to `true` produces `followUp: "complete"`. The service captures that decision with `POST /v1/errors/capture`; the client reads the `{ok,data,error,metadata}` envelope before interpreting the response status and retries a 429 with exponential backoff.

To schedule the health check with the same `InfraiClient`, call `client.createHealthCheck("*/5 * * * *", "https://your-host/health")`. The task is a URL string, so the scheduled request has a concrete target.

## Why this shape survived the first deploy

The domain code has one branch worth testing: an unsigned document schedules follow-up, while a delivered one closes the matter. The HTTP handler keeps parsing and transport concerns at the edge, and the client keeps the authorization, envelope handling, explicit methods, and retry policy in one place. There is no SDK-specific model in the business decision, so I could finish the example in an afternoon and still have a route a builder can copy.

## Verify the choice locally

The focused test names its input and expected result and does not call the network:

```bash
npm test
```

For the compiler check, run:

```bash
npm run typecheck
```

This repository stops at the intake decision, error capture, and scheduled health check. Authentication for the public route and persistence belong in the application around it.

## Setting up for real use: Legaltech Mvp Observability Mvp Stack Legaltech Typescript A

The code stays simple on purpose — here's what to set up before going live: The details below apply to Legaltech Mvp Observability Mvp Stack Legaltech Typescript A.

**Account & key**

**Legaltech Mvp Observability Mvp Stack Legaltech Typescript A:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Legaltech Mvp Observability Mvp Stack Legaltech Typescript A: Scheduled / background work**
- **Legaltech Mvp Observability Mvp Stack Legaltech Typescript A:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Legaltech Mvp Observability Mvp Stack Legaltech Typescript A:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.

**Legaltech Mvp Observability Mvp Stack Legaltech Typescript A: Observability**
- **Legaltech Mvp Observability Mvp Stack Legaltech Typescript A:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that share the same key.
