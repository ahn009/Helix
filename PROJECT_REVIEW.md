# Helix project review

Reviewed 2026-09-29. This is a source-code assessment, not a production certification or browser verification.

## Product and intended workflow

Helix is an AI-assisted B2B outreach application. The attached specification describes: import contacts → validate and deduplicate → create a campaign → research companies → generate personalized drafts → review and approve → schedule and send → collect engagement and replies → stop or continue follow-ups → report outcomes.

## Actual architecture

- React 19, TanStack Start/Router, TypeScript, Tailwind, Radix UI and React Query.
- Screens in `src/routes/app/` cover dashboard, contacts, campaigns and draft review, sequences, inbox, analytics, integrations, brand voice and settings.
- `src/lib/server/fns.ts` contains application server functions. These use authentication middleware and parameterized SQL.
- `src/lib/server/ai.ts` calls xAI chat completions for research, first emails and follow-ups.
- `src/lib/db.ts` uses PostgreSQL when DATABASE_URL is configured; otherwise its PGlite database is in memory and resets when the process restarts.
- `migrations/0002_helix.sql` defines 14 application tables, including profiles, contacts/lists, companies, campaigns/memberships, drafts, sent emails, replies, integrations, suppressions and notifications.
- `src/lib/server/seed.ts` automatically creates an extensive sample workspace when a user has no profile.

The specification's Next.js/Fastify/Prisma/BullMQ architecture is not the implemented architecture. A rewrite is not inherently required; the missing business behavior is the primary issue.

## Feature assessment

| Area | Implemented in source | Missing or misleading behavior |
| --- | --- | --- |
| Contacts | CSV delimiter detection, common-header mapping, manual entry, basic validation, email deduplication | Excel, DNS/MX verification, robust import limits and full row feedback; list counts omit existing contacts added during import |
| Campaigns | Create from lists, status changes, goals, tone and research-depth fields | Ownership checks for supplied list/sequence IDs; validated lifecycle transitions; real scheduling |
| Research | Company cache and an LLM prompt using name, URL and industry | No website fetching or cited evidence; fallback invents observations about homepage copy; confidence and company size are fixed during generation |
| Drafts | Generate, edit, approve/reject, regenerate, batch approval by score, manual follow-up generation | AI output schema validation, HTML sanitization, fact checking, reliable failure recovery and duplicate prevention |
| AI settings | Stores value proposition, tone, brand voice, forbidden words and booking URL | Full brand voice is not supplied to email generation; booking URL is accepted by the helper but omitted from its user prompt; research depth is not used |
| Integrations | Zoho service records and connect/disconnect buttons | Buttons only change database fields; no provider OAuth or API integration; sample services start connected |
| Sending | Inserts sent-email records and updates counters/statuses | No email provider call; no approval-state enforcement, idempotency, suppression check, schedule/cap enforcement or delivery confirmation |
| Sequences | Editable step descriptions and delays | No scheduler, durable queue, automatic execution or inbound-reply cancellation |
| Inbox | Lists stored replies, marks read and manually categorizes | No mailbox synchronization or incoming reply webhook |
| Analytics | Aggregates database records and displays charts | No open/click tracking endpoints, bounce ingestion or genuine delivery telemetry; initial metrics include seeded examples |

## Priority defects

1. `sendDraftInner` (`src/lib/server/fns.ts:587`) reports success without delivering anything. Never treat these records as real provider delivery.
2. `toggleZoho` (`src/lib/server/fns.ts:488`) marks services connected without provider authorization.
3. AI failures or missing credentials silently produce fallback research/email content (`src/lib/server/ai.ts`). Distinguish unavailable generation from explicitly selected demo content.
4. Draft HTML is rendered with `dangerouslySetInnerHTML` (`src/routes/app/campaigns.$campaignId.tsx:408`), while AI output and draft edits have no sanitization boundary.
5. Server validators generally return their input unchanged. TypeScript annotations do not validate network input.
6. `createCampaign` reads memberships by a caller-supplied list ID without establishing ownership; `createContact` can attach a contact to an unchecked list ID. Enforce ownership across related records.
7. Sending does not check suppression records, approval, prior send status or campaign pause state. These checks must precede connecting real delivery.
8. Generation changes a contact to `researching`, but its next selection only includes `pending` and `generating`; a failure during research can strand that contact. Concurrent requests can also create duplicate work.
9. Automatic workspace seeding is not restricted to an explicit demo mode. Sample identities, connections, messages and results can contaminate a real workspace.

## Completion order and acceptance gates

1. **Establish a reproducible baseline:** restore dependencies, reconcile template tests with the authenticated application, verify auth/database configuration, and verify dev and production rendering.
2. **Make the existing workflow trustworthy:** separate demo data, validate server inputs, enforce ownership, sanitize HTML, fix import counts, and guard campaign/draft transitions. Add focused tests for cross-user access and invalid transitions.
3. **Complete one real provider:** implement authorization, encrypted token storage/refresh, disconnect and connection health. Sending must persist the provider result and handle ambiguous failures without blind retries. The current code targets Zoho; the original specification instead includes Google/Microsoft/SMTP. Resolve this product scope before provider implementation.
4. **Ground AI in evidence:** bounded website research, stored sources/timestamps, schema-validated results, explicit failures, wired brand settings, and reviewable factual claims.
5. **Add durable automation:** background jobs, retry/recovery, per-mailbox limits, time windows, pause/resume, sequence scheduling and suppression/reply cancellation.
6. **Close the feedback loop:** authenticated provider events or mailbox sync, deduplicated replies/bounces, unsubscribe handling, accurate metrics and exports.
7. **Release verification:** desktop/mobile review plus end-to-end import → research → draft → approve → authorized test delivery → reply → stop follow-up. No live outreach was sent during this review.

## Verification performed and limits

- `npm run typecheck` could not execute because dependencies are absent (`tsc: not found`).
- Ran three dependency-free script suites with Node's test isolation disabled: 23 passed, 7 failed. Several failures assert untouched-template assumptions (auth disabled and no application migrations); subprocess-output failures need separate diagnosis. These are not 7 confirmed business-logic defects.
- Auth invariant inspection could not observe a running development server.
- Build, browser rendering, provider delivery and live AI generation remain unverified.
- Existing startup script assumes `/workspace`; this checkout has a different root. Adapt the restart contract to the actual execution environment when bringing it up.
