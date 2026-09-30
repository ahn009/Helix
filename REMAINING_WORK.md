# Helix — remaining work and production launch plan

Updated: 2026-09-29

## 1. Purpose and current status

This is the working checklist for completing Helix and preparing it for your real client-acquisition outreach. It turns the source review in [PROJECT_REVIEW.md](PROJECT_REVIEW.md) into implementation tasks and acceptance criteria.

**Current status: partially implemented application; not ready for live outreach.** The interface, database schema and many editing workflows exist. Provider connections, actual delivery, evidence-backed research and unattended follow-ups are not complete. Existing example results must not be mistaken for real outreach performance.

This document does not mark any implementation as finished. Check a task only after its behavior has been verified, and record the evidence in section 18. New issues found during testing belong here too.

### Priority definitions

| Priority | Meaning |
| --- | --- |
| P0 | Blocks real use: incorrect behavior, data isolation, unsafe delivery or missing production infrastructure |
| P1 | Required for a dependable first production release for your client hunting |
| P2 | Remaining specification work or expansion; implement after the core release unless selected as essential |

P2 work is still part of the backlog. A first production release is distinct from completing every enterprise feature in the original specification. Any intentional scope reduction must be recorded rather than silently treated as completion.

## 2. Product decisions and business setup

These decisions can be settled while baseline fixes proceed. They block only the features that depend on them.

- [ ] **DEC-01 — First email provider:** choose Zoho Mail, Gmail, Microsoft Outlook or SMTP. The existing interface targets Zoho; the original specification includes Google/Microsoft/SMTP. Do not implement contradictory integrations without resolving this.
- [ ] **DEC-02 — First release audience:** confirm a private tool for your own outreach versus accounts for multiple team members. Keep authenticated ownership in either case; team collaboration additionally requires memberships and roles.
- [ ] **DEC-03 — Sending identity:** identify your business name, website, mailbox, sender name, signature and domain.
- [ ] **DEC-04 — Your offer:** define services, target industries, business sizes, target roles, geographic markets, exclusions and the reason prospects should respond.
- [ ] **DEC-05 — Proof and voice:** provide verified examples, portfolio/case-study links, permitted claims, writing examples and forbidden wording.
- [ ] **DEC-06 — Outreach goal:** choose replies, discovery calls, demos or another measurable conversion; supply the intended booking link where appropriate.
- [ ] **DEC-07 — Operating limits:** set a starting send cap, sending days/timezone, maximum follow-ups, maximum research/generation spend and a response owner.
- [ ] **DEC-08 — Prospect sources:** choose CSV/manual lists for the first release and identify any required live sheet or CRM sources. Store provenance for imported contacts.
- [ ] **DEC-09 — Hosting and accounts:** confirm the deployment account, production domain, database account, AI account and background-job service. The existing project targets Vercel; verify that the selected worker approach fits it.

**Done when:** a short decision record specifies the first production workflow and its providers. Credentials are configured through secure service settings, never pasted into this document.

## 3. Phase 1 — restore a verified baseline [P0]

### Tasks

- [ ] **BASE-01:** restore dependencies using the existing package manifest and lockfile; diagnose unavailable packages or version conflicts without recreating the application.
- [ ] **BASE-02:** run typechecking and production build; fix actual errors and record results.
- [ ] **BASE-03:** run existing tests and separate obsolete template assertions from genuine failures. Update template-specific tests to the authenticated Helix configuration without weakening isolation guarantees.
- [ ] **BASE-04:** verify auth configuration is consistent in development and production. Missing configuration must not accidentally enable a shared production identity.
- [ ] **BASE-05:** adapt the startup/restart contract to the actual execution environment while preserving the project preview requirements. The current script assumes `/workspace`.
- [ ] **BASE-06:** verify database migration order and behavior on an empty database and on an existing database.
- [ ] **BASE-07:** render every app route on desktop and mobile; check console errors, failed requests, hydration, loading states and navigation.
- [ ] **BASE-08:** repeat smoke checks against the production build, including direct navigation to nested campaign routes.
- [ ] **BASE-09:** establish usable version-control history and a recoverable baseline; the inspected checkout did not expose a usable Git repository.

**Acceptance:** build and typecheck pass, relevant tests pass, desktop/mobile rendering works in development and production, and restarting preserves the intended runtime configuration.

**Existing evidence:** typecheck stopped at `tsc: not found`; selected dependency-free tests produced 23 passes and 7 failures. No browser or production verification has been completed.

## 4. Phase 2 — correct demo behavior and protect data [P0]

### Demo separation and truthful status

- [ ] **CORE-01:** replace unconditional sample-workspace creation with clean onboarding for real users. Make demo data explicitly opt-in and isolated.
- [ ] **CORE-02:** remove default sample sender identities, fake connected mailboxes, historical sends, replies and performance figures from real workspaces.
- [ ] **CORE-03:** plan how to identify existing seeded records before migrating any real data; do not bulk-delete records whose provenance is unknown.
- [ ] **CORE-04:** stop reporting delivery when only database records have changed. Keep real sending unavailable until provider delivery is implemented.
- [ ] **CORE-05:** make unavailable AI and disconnected integrations visible. Remove silent template output masquerading as successful AI generation.
- [ ] **CORE-06:** correct interface claims about live sheets, domain warmup, forbidden-word removal, automatic research and delivery until their behavior exists.

### Ownership, validation and rendering

- [ ] **SEC-01:** replace pass-through server validators with runtime schemas for IDs, statuses, emails, URLs, scores, delays, text lengths and import limits.
- [ ] **SEC-02:** verify ownership of every supplied related ID before writes, including contact lists, sequences, campaigns, drafts and contacts.
- [ ] **SEC-03:** scope relationship reads and writes consistently. Specifically fix campaign creation from an unchecked list and manual contacts attached to an unchecked list.
- [ ] **SEC-04:** sanitize email HTML at its trust boundaries; reject scripts, event handlers and unsafe URLs. Preserve a plain-text version.
- [ ] **SEC-05:** validate allowed lifecycle transitions on the server. A caller cannot send a rejected/unapproved draft or revive a completed campaign by supplying arbitrary status text.
- [ ] **SEC-06:** make multi-record operations transactional where atomicity matters; add uniqueness constraints for repeated operations.
- [ ] **SEC-07:** protect expensive generation/import endpoints with per-user limits and bounded input sizes.
- [ ] **SEC-08:** review logging, exports and error messages for exposure of tokens, email bodies or another user's data.
- [ ] **SEC-09:** test signed-out access and cross-user access with two separate accounts, including guessed or copied record IDs.

**Acceptance:** a fresh real workspace contains no fictional activity; invalid and foreign IDs cannot mutate data; hostile HTML cannot execute; user-visible statuses describe actual outcomes.

**Main code:** `src/lib/server/fns.ts`, `src/lib/server/seed.ts`, `src/lib/server/ai.ts`, `src/routes/app/campaigns.$campaignId.tsx`.

## 5. Phase 3 — contacts and usable prospect lists [P1]

- [ ] **LEAD-01:** finish contact editing, archiving/deletion and list membership management with explicit ownership checks.
- [ ] **LEAD-02:** normalize emails consistently and deduplicate within an upload and against stored contacts.
- [ ] **LEAD-03:** fix list totals: an existing contact added to a new list is still a list member, even when no new contact row was created.
- [ ] **LEAD-04:** display distinct counts for created, reused, duplicate, invalid and suppressed rows. Provide downloadable row-level errors instead of only a short toast.
- [ ] **LEAD-05:** validate file size, encoding, supported formats and required columns; handle quoted fields, embedded newlines and malformed rows.
- [ ] **LEAD-06:** add a column-mapping preview so unfamiliar CSV headers do not silently lose data.
- [ ] **LEAD-07:** add DNS/MX checks with bounded timeouts and a clearly named result. Do not present syntax validity or MX presence as proof a mailbox exists.
- [ ] **LEAD-08:** store validation reason/time, source and suppression state; allow correction and revalidation.
- [ ] **LEAD-09:** add pagination/search/filtering appropriate to real list sizes rather than loading all contacts at once.
- [ ] **LEAD-10:** add useful targeting fields or tags for industry, location, role, fit and campaign selection.
- [ ] **LEAD-11 [P2]:** add Excel import and company-domain duplicate review from the specification. Different people at one company must not be silently merged.
- [ ] **LEAD-12 [P2 or selected provider scope]:** implement real sheet import/refresh with permission errors, field mapping and sync provenance.

**Acceptance:** import a mixed list twice; valid contacts and list counts remain correct, invalid rows are explained, and suppressed contacts cannot enter the send queue.

## 6. Phase 4 — real company research [P1]

- [ ] **RES-01:** fetch bounded public website content and store source URLs, retrieval time and supporting excerpts.
- [ ] **RES-02:** protect fetching against internal/private addresses, metadata endpoints, unsafe protocols and redirects to blocked destinations; bound response sizes and request time.
- [ ] **RES-03:** extract useful company facts from relevant pages and distinguish observations from hypotheses.
- [ ] **RES-04:** validate structured research output. Do not invent company size, technology, revenue, clients, launches or website defects.
- [ ] **RES-05:** make basic/standard/deep research settings control actual page/work budgets and explain the difference in the UI.
- [ ] **RES-06:** implement cache freshness and manual refresh; preserve source provenance when reusing research.
- [ ] **RES-07:** show insufficient evidence as a valid outcome requiring review, not fabricated personalization.
- [ ] **RES-08:** isolate external website text from instructions and test prompt-injection examples.
- [ ] **RES-09:** add recoverable job states so failed research cannot leave contacts permanently stuck as `researching`.
- [ ] **RES-10 [P2]:** extend extraction to richer technology signals, recent news, social presence and measured website performance where reliable sources/tools are available.

**Acceptance:** every factual observation used in a sample draft can be traced to stored evidence. An inaccessible website produces an honest error or limited-evidence result.

## 7. Phase 5 — dependable AI drafting and review [P1]

- [ ] **AI-01:** verify the configured provider/model against current provider documentation when implementing; expose a health/configuration check without revealing secrets.
- [ ] **AI-02:** add request timeouts, controlled retry/backoff, error classification and schema validation for generated results.
- [ ] **AI-03:** wire saved brand voice, sender identity, offer, tone, forbidden words, campaign goal and booking URL into the actual prompts.
- [ ] **AI-04:** enforce output rules after generation, including forbidden language, length, supported claims and safe formatting.
- [ ] **AI-05:** separate heuristic quality/spam scores from factual verification. Replace hard-coded grammar/confidence claims with measured results or remove those claims.
- [ ] **AI-06:** flag unsupported claims and require review; an AI self-score alone must not authorize delivery.
- [ ] **AI-07:** add review history and draft versions. Editing/regenerating a previously approved draft must invalidate its approval.
- [ ] **AI-08:** make batch approval conditions explicit and recheck them on the server; keep manual approval as the initial release default.
- [ ] **AI-09:** prevent duplicate generation under double-clicks, retries and concurrent workers using stable job/draft keys.
- [ ] **AI-10:** record generation usage and apply per-operation and daily budget caps.
- [ ] **AI-11:** create follow-ups from actual prior messages and the selected sequence step; preserve thread context and offer new value.
- [ ] **AI-12 [P2]:** add similarity detection, richer automatic approval rules, provider abstraction and A/B draft variants.

**Acceptance:** missing keys and provider errors never yield a fake successful draft; settings materially change output; invalid/unsafe results cannot be approved; interrupted jobs can recover.

## 8. Phase 6 — real provider connections and delivery [P0]

### Connection lifecycle

- [ ] **MAIL-01:** implement the selected provider's supported authorization flow and protect callbacks against forged or mismatched sessions.
- [ ] **MAIL-02:** store credentials/tokens encrypted on the server, support refresh/revocation and show verified mailbox identity.
- [ ] **MAIL-03:** represent pending, connected, expired, revoked and failed states from real provider results.
- [ ] **MAIL-04:** implement disconnect behavior that stops affected jobs and clears or invalidates credentials.
- [ ] **MAIL-05:** obtain the required provider scopes and verify current provider quotas and automation policies during implementation.

### Delivery correctness

- [ ] **SEND-01:** replace database-only sending with an actual provider call and persist the provider message/thread ID.
- [ ] **SEND-02:** distinguish queued, submitting, provider-accepted, delivered where observable, failed and uncertain outcomes. Provider acceptance is not proof of inbox delivery.
- [ ] **SEND-03:** atomically claim a send job and enforce one logical send per approved draft/version/recipient/step.
- [ ] **SEND-04:** handle ambiguous network failures by reconciliation or manual review; do not blindly retry a request that may already have delivered.
- [ ] **SEND-05:** recheck approval, campaign state, contact state, suppression, mailbox health and sending window immediately before dispatch.
- [ ] **SEND-06:** enforce per-mailbox quotas, spacing and daily resets using the configured timezone; handle provider throttling.
- [ ] **SEND-07:** generate consistent HTML/plain-text messages, correct sender headers, signature and unsubscribe mechanism.
- [ ] **SEND-08:** implement a test-recipient mode and production-wide sending pause switch.
- [ ] **SEND-09:** record attempt history and actionable failures; avoid exposing secret provider responses to the client.

**Acceptance:** an explicitly authorized test message reaches a controlled inbox, has a provider ID and correct contents, and repeated job execution does not cause an ordinary duplicate send. Uncertain delivery is visible for reconciliation.

## 9. Phase 7 — durable scheduling and follow-ups [P1]

- [ ] **JOB-01:** choose and implement a durable queue/worker mechanism compatible with the deployment target. Browser timers and request-local background work are insufficient.
- [ ] **JOB-02:** persist job type, owner, campaign/contact, due time, attempts, lease, errors and completion metadata.
- [ ] **JOB-03:** support bounded retries, expired-lease recovery, failed-job review and safe manual retry.
- [ ] **JOB-04:** implement campaign start dates, send windows, timezone/daylight-saving behavior and pause/resume/cancel.
- [ ] **JOB-05:** define whether sequence delays are relative to the prior actual send or campaign start; display this clearly.
- [ ] **JOB-06:** make existing sequences editable, reorderable and removable; validate nonnegative delays and step limits.
- [ ] **JOB-07:** snapshot/version a sequence for enrolled contacts so editing a template does not unpredictably alter active campaigns.
- [ ] **JOB-08:** schedule follow-ups from actual send outcomes and stop on replies, unsubscribe, hard bounce, conversion or manual cancellation.
- [ ] **JOB-09:** handle out-of-office replies with an explicit policy and avoid endless automated conversations.
- [ ] **JOB-10:** recheck cancellation at dispatch to reduce reply-versus-send races; document that a message already accepted by the provider cannot be recalled by queue cancellation.
- [ ] **JOB-11:** finish campaigns only when their relevant contacts/jobs reach terminal states.

**Acceptance:** jobs survive restarts, paused campaigns stop dispatch, due steps run once under normal retries, and a reply cancels pending follow-ups.

## 10. Phase 8 — inbox, suppression and prospect outcomes [P1]

- [ ] **INBOX-01:** implement provider webhooks or supported polling with authenticated event handling and durable sync cursors.
- [ ] **INBOX-02:** match replies using provider message/thread references and handle duplicate/out-of-order events.
- [ ] **INBOX-03:** distinguish human replies, automatic responses, bounces and unsubscribe requests.
- [ ] **INBOX-04:** show full conversation history and synchronization health, not just seeded reply rows.
- [ ] **INBOX-05:** synchronize reply state across contact, campaign, sent message, inbox and queued follow-ups.
- [ ] **INBOX-06:** provide reply-category correction and a manual mark-as-meeting/converted flow with event history.
- [ ] **INBOX-07:** decide whether operators respond inside Helix or in their mailbox. If inside Helix, implement real threaded replies with draft review.
- [ ] **SUP-01:** implement unsubscribe links/tokens and suppression management without exposing contact data.
- [ ] **SUP-02:** suppress hard bounces and explicit opt-outs, prevent reimport from reactivating them, and define suppression scope across your mailboxes.
- [ ] **SUP-03:** support search/export and controlled correction of suppression records; keep an audit trail.
- [ ] **CRM-01:** add simple prospect stages/notes and next-action tracking for your client hunting, or map these to the chosen CRM.

**Acceptance:** a test reply appears in the right conversation and stops pending follow-ups; unsubscribing or importing an already suppressed address never schedules another message.

## 11. Phase 9 — trustworthy analytics and reports [P1/P2]

- [ ] **MET-01 [P1]:** define each metric and its denominator, date range and timezone: sent/accepted, delivered where known, bounced, replied, positive replies and meetings.
- [ ] **MET-02 [P1]:** calculate metrics from real deduplicated events and exclude demo/test traffic from production reporting.
- [ ] **MET-03 [P1]:** add campaign/date filters and reconciliation between inbox, campaign detail and overview totals.
- [ ] **MET-04 [P1]:** distinguish manually recorded meetings from provider-confirmed bookings.
- [ ] **MET-05 [P1]:** export campaign/contact results to CSV with spreadsheet-formula injection protection.
- [ ] **MET-06 [P2]:** implement optional open/click tracking, safe redirect handling and privacy-aware settings. Explain that these signals do not prove human engagement.
- [ ] **MET-07 [P2]:** implement PDF reports, campaign comparisons, A/B evaluation and personalization-performance analysis from the specification.

**Acceptance:** known test events yield predictable totals; reprocessing events does not inflate results; the UI does not fabricate unavailable delivery or engagement data.

## 12. Phase 10 — complete everyday interface behavior [P1]

- [ ] **UX-01:** replace endless skeletons on query failure with errors and retry actions on every screen.
- [ ] **UX-02:** provide onboarding for your actual sender profile, offer, mailbox and first contact list.
- [ ] **UX-03:** label pending work, failed work and actionable next steps; avoid generic success messages for partial failures.
- [ ] **UX-04:** protect against accidental duplicate actions and loss of unsaved draft edits.
- [ ] **UX-05:** make campaign creation, research review, draft editing and mobile navigation usable at phone widths.
- [ ] **UX-06:** verify keyboard navigation, focus handling, field labels, contrast and accessible dialog behavior.
- [ ] **UX-07:** replace sample-company branding and marketing claims with your configured identity and accurate functionality while preserving required platform branding.
- [ ] **UX-08:** validate share assets, error pages, session expiration and empty-account behavior.

**Acceptance:** a new user can complete the selected workflow without hidden setup knowledge, misleading status labels or unresolved UI errors.

## 13. Remaining original-specification expansion [P2]

These features are not prerequisites for a private single-provider pilot, but remain open if full specification coverage is the target.

- [ ] **EXT-01:** additional Gmail, Outlook and SMTP adapters beyond the chosen first provider.
- [ ] **EXT-02:** additional Google Sheets/Zoho Sheet sources and scheduled refresh.
- [ ] **EXT-03:** actual Zoho CRM, Bookings and Cliq behavior, or removal/replacement of those promised integrations by explicit scope decision.
- [ ] **EXT-04:** team invitations, workspace memberships, roles, shared templates and operator performance reporting.
- [ ] **EXT-05:** provider-independent AI configuration, richer personalization analysis and configurable automated approval.
- [ ] **EXT-06:** notifications for replies, failed jobs and bookings through the selected channels.
- [ ] **EXT-07:** measurable deliverability diagnostics and provider-supported reputation handling; do not label a mailbox warmed up from a fabricated status field.
- [ ] **EXT-08:** import/research/send load tests against the specification's throughput goals; replace untested scale claims with measured capacity.
- [ ] **EXT-09:** establish a requirements traceability table for FR-001 through FR-055 and the non-functional requirements: implemented evidence, partial support or explicit deferral.

The specification also lists future multichannel outreach, autonomous agents, attribution and marketplace phases. Track these separately from unfinished core functionality; they are not implicitly part of the first client-hunting release.

## 14. Database changes to design and migrate

These are proposed capabilities, not a mandate to create every table before settling provider and queue choices.

| Capability | Proposed data changes |
| --- | --- |
| Provider connections | Provider/account identifiers, encrypted credential reference, scopes, expiry, health and sync cursor |
| Research evidence | Source URL/text excerpts, fetch time, status, settings/model provenance, refresh time |
| Jobs and sending | Durable jobs, claims/leases, attempts, idempotency keys, due times and uncertain-send state |
| Conversation events | Provider message/thread/event IDs, raw-event retention policy, deduplication constraints |
| Approval history | Draft revisions, approved revision, reviewer and timestamps |
| Imports | Import run status, mappings, provenance and row outcomes |
| Operations | Usage/budget records, minimal audit events, feature/sending controls |
| Teams, if selected | Workspaces, memberships, roles and ownership migrations |

- [ ] **DB-01:** design migrations around current data and tested invariants; back up before production changes.
- [ ] **DB-02:** add missing indexes/constraints based on query patterns, including duplicate send and event protection.
- [ ] **DB-03:** test upgrade paths on a copy of existing data and verify no cross-user links are introduced.
- [ ] **DB-04:** define retention/deletion behavior for contact data, research, messages, tokens and logs.
- [ ] **DB-05:** require durable PostgreSQL for production; do not silently use process-memory PGlite for live data.

## 15. Production configuration and operating setup [P0/P1]

Implement and test the core workflow before configuring live outreach. Verify current provider and hosting documentation when setting these up; this checklist is not a claim about current service limits or legal requirements.

### Infrastructure and credentials

- [ ] **PROD-01:** separate development/staging/production databases, provider credentials, webhook endpoints and AI budgets.
- [ ] **PROD-02:** configure durable PostgreSQL, connection limits, backups and a tested restore procedure.
- [ ] **PROD-03:** configure the production app domain, HTTPS, auth origins/callbacks and provider callback URLs.
- [ ] **PROD-04:** configure server-only database/auth/AI/provider/token-encryption/job secrets in deployment secret settings; never commit them or expose them through `VITE_` variables.
- [ ] **PROD-05:** provision the durable worker/scheduler and authenticate any externally callable job endpoint.
- [ ] **PROD-06:** ensure staging cannot dispatch to real prospect lists accidentally; keep live sends disabled by default until release checks pass.
- [ ] **PROD-07:** verify login, logout, session expiry and account recovery for the chosen sign-in method; restrict registration if the tool is private.

### Sending identity and operating policy

- [ ] **PROD-08:** verify mailbox ownership and the selected provider's required domain authentication, including SPF/DKIM/DMARC configuration and alignment checks where applicable.
- [ ] **PROD-09:** configure truthful sender identity, reply handling, unsubscribe behavior and applicable footer details.
- [ ] **PROD-10:** review the selected provider's outreach policy and requirements applicable to your prospect markets before launch; record any changes required in the product. Do not assume an unsubscribe link alone settles these requirements.
- [ ] **PROD-11:** choose conservative initial quotas within verified provider limits and define escalation/pause thresholds for errors, bounces and complaints.
- [ ] **PROD-12:** document who monitors replies and how qualified responses become meetings or sales opportunities.

### Monitoring and recovery

- [ ] **OPS-01:** record structured errors and correlation IDs across research, generation, sending and inbound events without logging secrets.
- [ ] **OPS-02:** alert on failed jobs, stale mailbox sync, token failures, unexpectedly high spend and delivery problems.
- [ ] **OPS-03:** add application/worker readiness checks and an operator view of stalled/failed/uncertain jobs.
- [ ] **OPS-04:** implement CI checks for build, types, focused tests and migration validation; test deployment and rollback.
- [ ] **OPS-05:** document how to pause all sends, revoke a mailbox, rotate secrets, recover jobs and restore data.
- [ ] **OPS-06:** perform a dependency/security review and resolve findings relevant to deployed behavior.

**Acceptance:** a clean production workspace persists through restart/deployment, its secrets remain server-side, jobs run reliably, and sending can be stopped immediately at the queue boundary.

## 16. Required verification matrix

| Test | Expected result |
| --- | --- |
| Fresh account | Clean workspace, no fake connected mailbox or outreach history |
| Signed-out / second-user requests | Protected data unavailable; foreign records cannot be linked or changed |
| Malformed and oversized requests | Bounded, clear validation failures without partial corruption |
| Repeat CSV import | Correct deduplication, memberships, counts and row feedback |
| Hostile HTML / website text | No browser script execution or instruction takeover |
| AI timeout or malformed result | Explicit recoverable failure, no invented successful draft |
| Failed research midway | Retry recovers work without duplicate drafts or stranded contacts |
| Double send / worker retry | One logical dispatch; uncertain acceptance handled separately |
| Unapproved or edited draft | Cannot send until its current revision is approved |
| Paused campaign / exceeded cap | No new dispatch outside the allowed state/window/quota |
| Reply / unsubscribe / hard bounce | Correct status and cancellation of pending follow-ups |
| Repeated provider event | No duplicate inbox entries or inflated metrics |
| Expired/revoked connection | Actionable connection state and blocked delivery |
| Restart or deploy during a job | Durable state and controlled recovery |
| Known event dataset | Accurate analytics and exports |
| Mobile and desktop | Visible content, working controls, clean console |
| Built production output | Same core behavior as development, including nested routes |
| Backup restoration | Recoverable contacts, campaign state and suppression data |

Use focused unit tests for parsing, validation and state rules; integration tests for ownership, transactions and job recovery; browser tests for real user workflows. Use controlled recipients for delivery verification. Broad live outreach is not part of automated QA.

## 17. Release gates and rollout

### Gate A — development baseline

- [ ] Dependencies, build, types, applicable tests and desktop/mobile smoke checks pass.
- [ ] Authentication and durable production-data configuration are understood.

### Gate B — reliable application

- [ ] No demo behavior is represented as real service behavior.
- [ ] Ownership, validation, HTML handling and draft/send lifecycle tests pass.
- [ ] Contacts, research, generation and approval complete an end-to-end workflow.

### Gate C — controlled delivery pilot

- [ ] Selected mailbox connects through real authorization.
- [ ] An authorized message is received by a controlled recipient.
- [ ] Reply, unsubscribe and failure scenarios update state and stop pending jobs.
- [ ] Retry behavior, budget caps, quota enforcement and the global pause control are verified.

### Gate D — production readiness

- [ ] Production domain, durable database, secrets, workers, backups and monitoring are configured.
- [ ] Sender-domain configuration and applicable provider/market requirements are reviewed.
- [ ] Production build passes smoke and core workflow tests.
- [ ] Rollback/restore and incident instructions are available.
- [ ] Any deferred P2 requirements are listed explicitly with their product impact.

### Gate E — your first client-hunting campaign

- [ ] Enter your real offer, target audience and verified proof points.
- [ ] Import a small, reviewed prospect list with source information.
- [ ] Review research evidence and approve each initial draft.
- [ ] Explicitly launch the reviewed campaign under the agreed limits.
- [ ] Monitor actual replies, failures and booked meetings; pause if configured thresholds are exceeded.
- [ ] Expand volume only after observing reliable delivery and processing, within verified provider limits.

Preparing code and deployment configuration does not itself send outreach. Actual campaign launch remains an explicit operator action.

## 18. Execution tracker and completion evidence

Work sequentially through the dependencies rather than marking interface presence as feature completion.

| Milestone | Depends on | Status | Completion evidence |
| --- | --- | --- | --- |
| Baseline and configuration | None | Open | Pending |
| Truthful behavior and isolation | Baseline | Open | Pending |
| Contacts and imports | Isolation | Open | Pending |
| Grounded research and drafting | Isolation, AI configuration | Open | Pending |
| Provider connection and delivery | Provider decision, isolation | Open | Pending |
| Durable scheduling and follow-ups | Delivery, queue decision | Open | Pending |
| Inbound replies and suppression | Provider integration | Open | Pending |
| Analytics and workflow polish | Real events and workflows | Open | Pending |
| Production setup and controlled pilot | Gates A–C | Open | Pending |
| First real outreach campaign | Gate D and operator launch | Open | Pending |
| Remaining specification expansion | Explicit prioritization | Open | Pending |

For each completed item record:

```text
Task ID:
Change implemented:
Files / migration:
Verification performed and result:
Remaining limitations:
Completion date:
```

**Next implementation step:** Phase 1 baseline restoration, followed by Phase 2 demo separation and data protection. Provider-specific implementation follows DEC-01; independent corrections can proceed before that choice is settled.
