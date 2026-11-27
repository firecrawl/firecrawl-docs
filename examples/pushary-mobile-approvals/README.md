# Firecrawl Agent approvals through Pushary

This runnable example connects Firecrawl Agent's existing paid-call approval gate to an enrolled Pushary Partner customer. It uses the public REST APIs and requires Node.js 24 LTS. It is an independent community example, not an official Firecrawl integration or an Alexandria provider listing.

## Setup

Run `npm install` in this directory, copy `.env.example` to `.env`, and set:

- `FIRECRAWL_API_KEY`: a Firecrawl key with Alexandria access and test credits.
- `PUSHARY_API_KEY`: a Partner runtime key, preferably bound to the enrolled customer.
- `PUSHARY_EXTERNAL_ID`: the customer's exact enrollment identity, selected by your backend. An email-shaped string is only an identifier; it does not send email or enroll an existing Agent account.
- `FIRECRAWL_PROVIDER`: a provider ID returned by free `find-tools` discovery.
- `MAX_CREDITS`: the per-turn Agent budget. A continuation is another turn, not part of the initial turn's budget.

Enrollment is a separate backend operation. With a full-access Partner key, call `POST https://pushary.com/api/v1/server/enroll` with `{"externalId":"your-customer-id"}` and show the returned `universalLink` to that person. They must open it on their phone and accept. Then use `GET /api/v1/server/reachability?externalId=...` to confirm the channel. Creating a link does not enroll a device. Keep full-access keys and enrollment links out of prompts and source control.

The sample defaults to Apple App Store lookup. Discovery checked on 16 October 2026 priced `apps-apple-com/apps/app` at 5 credits and reported no additional provider terms. Recheck price/access before a live run. Other sources can require separate explicit terms acceptance; the example never accepts terms automatically.

## Run one approval cycle

Choose a fresh private directory outside your checkout, for example `/tmp/my-firecrawl-review`:

```sh
node --env-file=.env --import tsx run.ts start /tmp/my-firecrawl-review "Use only Alexandria provider apps-apple-com capability apps/app to inspect app_id 6785677563 in country us. Return the app name and current version. Make one paid provider call and do not use web search."
node --env-file=.env --import tsx run.ts check /tmp/my-firecrawl-review
```

`start` records intent before sending the paid request. `check` performs one status read; run it again after the job finishes if it reports `processing`. A completed turn is saved privately to `turn.json`. It can end with a calls approval, a terms request, or a result without an approval. Only a calls approval is accepted by the next command:

```sh
node --env-file=.env --import tsx run.ts request /tmp/my-firecrawl-review
```

The phone question contains the provider, capability, complete inputs and estimated credit cost. Answer it on the enrolled phone, then run:

```sh
node --env-file=.env --import tsx run.ts resume /tmp/my-firecrawl-review
node --env-file=.env --import tsx run.ts check /tmp/my-firecrawl-review
```

An unanswered request returns `waiting`; repeat `resume` later. An explicit yes resumes only the stored call IDs in the original thread. No, expired, cancelled or stopped decisions take Firecrawl's decline branch. Each continuation retains `mode: "chat"`, `requireApproval: true`, the reviewed providers and a per-turn budget. The adapter never sets `always: true`.

This example intentionally handles one approval cycle per directory. If the continuation proposes another paid call, it stays gated. Review its new `turn.json` in a fresh directory with the same workflow-owned recipient; never replace a submitted review. A production worker should persist and schedule each approval cycle automatically.

## Recovery and limits

- The review binds thread, approval, call IDs, inputs, credit estimates, recipient, budget, deadline and displayed question. It checks the returned decision ID, recipient, question and binding before continuing.
- Repeating `request` uses a stable Pushary idempotency key and the saved decision. Concurrent `resume` attempts cannot both claim the same review on one local filesystem.
- A continuation is marked `submitting` before the network call. A lost response becomes `uncertain`; a crash leaves `submitting`. Neither is automatically retried. Reconcile Firecrawl account history before any manual recovery. The Agent endpoint's mutation idempotency is not assumed from the separate scrape endpoint.
- `start-intent.json` without `job.json` similarly requires reconciliation. Do not delete the intent and blindly start again.
- Files are private local state, with atomic writes and an exclusive lock for the review. This is not a distributed queue. After a crash, a leftover `review.lock` requires operator investigation before removal.
- Review validity is 15 minutes. Oversized questions are rejected rather than hiding inputs behind truncation. A production product may need a richer authenticated review screen.
- Provider prices are estimates. Keep Firecrawl budgets and check actual credit usage. No decision guarantees exactly-once execution by an external service.
- Only bounded decision details belong in this example. Do not include credentials or sensitive personal records in call inputs or private run files.

## Verify

```sh
npm test
npm run typecheck
```

Tests exercise real local persistence, duplicate and concurrent submissions, lost responses, recipient/action binding, expiry, refusal, malformed input and HTTP request construction. External responses are test doubles; these tests alone do not prove live Firecrawl execution or phone delivery.

See [Firecrawl's paid-call protocol](https://docs.firecrawl.dev/features/agent#approve-paid-calls-before-they-run) and [Pushary Partner setup](https://pushary.com/docs/agents/embed). Live results and the proposed contribution route are recorded separately from these reproducible instructions.
