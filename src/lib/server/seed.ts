import { qualityScore, spamScore } from "@/lib/email-quality";
import {
  DEFAULT_SEQUENCE,
  OPS_SEQUENCE,
  SEED_CONTACTS,
  SEED_EMAILS,
  ZOHO_SHEET_ROWS,
  companyFor,
} from "@/lib/server/seed-data";
import { asJson, daysAgo, domainFrom, nid, sql } from "@/lib/server/helpers";

export async function ensureWorkspace(userId: string, displayName?: string | null) {
  const db = await sql();
  const existing = await db<{ user_id: string }>`
    select user_id from profiles where user_id = ${userId} limit 1
  `;
  if (existing.length > 0) return;

  const profileIdWait = displayName ?? "Alex Rivera";
  await db`
    insert into profiles (
      user_id, display_name, company_name, company_website, role_title,
      brand_voice, value_prop, forbidden_words, tone, physical_address,
      booking_url, onboarding_complete
    ) values (
      ${userId},
      ${profileIdWait},
      ${"Northwind Digital"},
      ${"https://northwind.digital"},
      ${"Head of Growth"},
      ${"Calm, specific, no hype. Write like a senior strategist who did the homework. Short paragraphs. One ask."},
      ${"Northwind Digital rebuilds B2B websites and demand programs so the first conversation a buyer has is already qualified."},
      ${JSON.stringify(["synergy", "disrupt", "game-changer", "circle back"])},
      ${"consultative"},
      ${"184 Mercer Street, Suite 4, New York, NY 10012"},
      ${"https://bookings.zoho.com/northwind"},
      ${true}
    )
  `;

  const zohoServices = [
    {
      service: "mail",
      status: "connected",
      email: "alex@northwind.digital",
      display: "Alex Rivera",
      org: "Northwind Digital",
      warmup: "completed",
      limit: 80,
    },
    {
      service: "sheets",
      status: "connected",
      email: "alex@northwind.digital",
      display: "Northwind workspace",
      org: "Northwind Digital",
      warmup: "none",
      limit: 0,
    },
    {
      service: "bookings",
      status: "connected",
      email: "alex@northwind.digital",
      display: "Discovery",
      org: "Northwind Digital",
      warmup: "none",
      limit: 0,
    },
    {
      service: "crm",
      status: "disconnected",
      email: null,
      display: null,
      org: null,
      warmup: "none",
      limit: 0,
    },
    {
      service: "cliq",
      status: "disconnected",
      email: null,
      display: null,
      org: null,
      warmup: "none",
      limit: 0,
    },
  ];

  const mailId = nid();
  for (const z of zohoServices) {
    const id = z.service === "mail" ? mailId : nid();
    await db`
      insert into zoho_connections (
        id, user_id, service, status, email, display_name, org_name,
        daily_send_limit, daily_send_count, warmup_status, connected_at
      ) values (
        ${id}, ${userId}, ${z.service}, ${z.status}, ${z.email}, ${z.display},
        ${z.org}, ${z.limit}, ${z.service === "mail" ? 18 : 0}, ${z.warmup},
        ${z.status === "connected" ? daysAgo(40) : null}
      )
    `;
  }

  await db`
    insert into zoho_sheets (id, user_id, workbook_name, sheet_name, row_count, rows, last_synced_at)
    values (
      ${nid()}, ${userId}, ${"West Coast inbound — Q3"}, ${"Prospects"},
      ${ZOHO_SHEET_ROWS.length}, ${JSON.stringify(ZOHO_SHEET_ROWS)}, ${daysAgo(1)}
    )
  `;

  const seqDefault = nid();
  const seqOps = nid();
  await db`
    insert into sequences (id, user_id, name, description, is_default, steps)
    values (
      ${seqDefault}, ${userId}, ${"Standard 4-step"},
      ${"Observation, proof, insight, break-up."}, ${true},
      ${JSON.stringify(DEFAULT_SEQUENCE)}
    )
  `;
  await db`
    insert into sequences (id, user_id, name, description, is_default, steps)
    values (
      ${seqOps}, ${userId}, ${"Ops leaders"},
      ${"Bottleneck, ROI sketch, teardown offer."}, ${false},
      ${JSON.stringify(OPS_SEQUENCE)}
    )
  `;

  const listAgency = nid();
  const listSaas = nid();
  const listOps = nid();
  await db`
    insert into contact_lists (id, user_id, name, description, source, contact_count)
    values
      (${listAgency}, ${userId}, ${"Agency & brand"}, ${"Creative and brand-led companies"}, ${"zoho_sheets"}, 0),
      (${listSaas}, ${userId}, ${"SaaS founders"}, ${"Product-led B2B software"}, ${"csv"}, 0),
      (${listOps}, ${userId}, ${"Ops leaders"}, ${"Freight, field, clinics"}, ${"csv"}, 0)
  `;

  const contactIds = new Map<string, string>();
  for (const c of SEED_CONTACTS) {
    const id = nid();
    contactIds.set(c.key, id);
    const domain = domainFrom(c.website, c.company);
    await db`
      insert into contacts (
        id, user_id, first_name, last_name, email, email_score, company_name,
        job_title, website_url, industry, location, tags, status, source
      ) values (
        ${id}, ${userId}, ${c.first}, ${c.last}, ${c.email}, ${94},
        ${c.company}, ${c.title}, ${c.website}, ${c.industry}, ${c.location},
        ${JSON.stringify(c.tags)}, ${"active"}, ${"seed"}
      )
    `;
    const company = companyFor(domain);
    const existingCo = await db<{ id: string }>`
      select id from companies where user_id = ${userId} and domain = ${domain} limit 1
    `;
    if (existingCo.length === 0) {
      await db`
        insert into companies (
          id, user_id, domain, name, industry, description, size_band,
          services, pain_points, opportunities, tech_stack, recent_signals,
          confidence, researched_at
        ) values (
          ${nid()}, ${userId}, ${domain}, ${company.name}, ${company.industry},
          ${company.description}, ${company.size}, ${JSON.stringify(company.services)},
          ${JSON.stringify(company.pain)}, ${JSON.stringify(company.signals)},
          ${JSON.stringify(company.tech)}, ${JSON.stringify(company.signals)},
          ${0.86}, ${daysAgo(2)}
        )
      `;
    }
  }

  const agencyKeys = ["maya", "lena", "chris", "nina", "ivy", "sofia", "sage"];
  const saasKeys = ["jonah", "priya", "owen", "theo", "amira", "kai", "freya"];
  const opsKeys = ["erik", "lucas", "hana", "marcus", "diego", "rafael"];

  async function addToList(listId: string, keys: string[]) {
    for (const k of keys) {
      const cid = contactIds.get(k);
      if (!cid) continue;
      await db`insert into list_memberships (list_id, contact_id) values (${listId}, ${cid})`;
    }
    await db`update contact_lists set contact_count = ${keys.length} where id = ${listId}`;
  }
  await addToList(listAgency, agencyKeys);
  await addToList(listSaas, saasKeys);
  await addToList(listOps, opsKeys);

  const campWhite = nid();
  const campSaas = nid();
  const campOps = nid();
  await db`
    insert into campaigns (
      id, user_id, name, description, status, goal, list_id, sequence_id,
      zoho_mail_id, tone, research_depth, approval_required, auto_approve_threshold, start_date
    ) values
      (${campWhite}, ${userId}, ${"Agency white-label, Q3"},
       ${"Position Northwind as the silent product team behind independent shops."},
       ${"running"}, ${"meeting"}, ${listAgency}, ${seqDefault}, ${mailId},
       ${"consultative"}, ${"deep"}, ${true}, ${8.5}, ${daysAgo(8)}),
      (${campSaas}, ${userId}, ${"SaaS founder sprint"},
       ${"Founders who just shipped something public."},
       ${"reviewing"}, ${"meeting"}, ${listSaas}, ${seqDefault}, ${mailId},
       ${"direct"}, ${"deep"}, ${true}, ${null}, ${daysAgo(1)}),
      (${campOps}, ${userId}, ${"Ops leaders, East & Central"},
       ${"Freight, field, clinics — process pain."},
       ${"completed"}, ${"meeting"}, ${listOps}, ${seqOps}, ${mailId},
       ${"professional"}, ${"standard"}, ${false}, ${8}, ${daysAgo(16)})
  `;

  const campaignByKey = { white: campWhite, saas: campSaas, ops: campOps } as const;
  const ccIds = new Map<string, string>();

  for (const email of SEED_EMAILS) {
    const contactId = contactIds.get(email.contact);
    if (!contactId) continue;
    const campaignId = campaignByKey[email.campaign];
    const ccKey = `${email.campaign}:${email.contact}`;
    let ccId = ccIds.get(ccKey);
    if (!ccId) {
      ccId = nid();
      ccIds.set(ccKey, ccId);
      let ccStatus = "reviewing";
      if (email.draftStatus === "sent") ccStatus = email.replied ? "replied" : "sent";
      if (email.draftStatus === "approved") ccStatus = "approved";
      if (email.replied === "meeting") ccStatus = "converted";
      await db`
        insert into campaign_contacts (
          id, user_id, campaign_id, contact_id, status, current_step,
          last_email_sent_at, last_reply_at, converted_at
        ) values (
          ${ccId}, ${userId}, ${campaignId}, ${contactId}, ${ccStatus}, ${email.step},
          ${email.sentDaysAgo != null ? daysAgo(email.sentDaysAgo) : null},
          ${email.replied ? daysAgo((email.sentDaysAgo ?? 2) - 1) : null},
          ${email.replied === "meeting" ? daysAgo((email.sentDaysAgo ?? 2) - 1) : null}
        )
      `;
    }

    const spam = spamScore(email.subject, email.body);
    const quality = qualityScore({
      subject: email.subject,
      body: email.body,
      personalization: email.personalization,
      spam,
    });
    const draftId = nid();
    await db`
      insert into drafts (
        id, user_id, campaign_contact_id, step, subject, body_html,
        personalization, quality_score, spam_score, grammar_score, status, reviewed_at
      ) values (
        ${draftId}, ${userId}, ${ccId}, ${email.step}, ${email.subject}, ${email.body},
        ${JSON.stringify(email.personalization)}, ${quality}, ${spam}, ${9.2},
        ${email.draftStatus},
        ${email.draftStatus === "generated" ? null : daysAgo(email.sentDaysAgo ?? 1)}
      )
    `;

    if (email.draftStatus === "sent" && email.sentDaysAgo != null) {
      const sentId = nid();
      const contact = SEED_CONTACTS.find((c) => c.key === email.contact)!;
      await db`
        insert into sent_emails (
          id, user_id, draft_id, campaign_id, contact_id, zoho_mail_id,
          from_email, to_email, subject, body_html, sent_at, opened_at, open_count,
          clicked_at, click_count, replied_at
        ) values (
          ${sentId}, ${userId}, ${draftId}, ${campaignId}, ${contactId}, ${mailId},
          ${"alex@northwind.digital"}, ${contact.email}, ${email.subject}, ${email.body},
          ${daysAgo(email.sentDaysAgo, 14)},
          ${email.opened ? daysAgo(email.sentDaysAgo, 16) : null},
          ${email.opened ? (email.clicked ? 3 : 1) : 0},
          ${email.clicked ? daysAgo(email.sentDaysAgo, 17) : null},
          ${email.clicked ? 1 : 0},
          ${email.replied ? daysAgo(Math.max(0, email.sentDaysAgo - 1), 11) : null}
        )
      `;
      if (email.replied && email.replyBody) {
        await db`
          insert into replies (
            id, user_id, sent_email_id, campaign_id, contact_id, from_email,
            subject, body, category, received_at, is_read
          ) values (
            ${nid()}, ${userId}, ${sentId}, ${campaignId}, ${contactId}, ${contact.email},
            ${"Re: " + email.subject}, ${email.replyBody}, ${email.replied},
            ${daysAgo(Math.max(0, email.sentDaysAgo - 1), 11)},
            ${email.replied !== "meeting"}
          )
        `;
      }
    }
  }

  // Remaining list members without a seed email still join the campaign as pending.
  async function fillPending(campaignId: string, keys: string[], campaignKey: "white" | "saas" | "ops") {
    for (const k of keys) {
      const ccKey = `${campaignKey}:${k}`;
      if (ccIds.has(ccKey)) continue;
      const contactId = contactIds.get(k);
      if (!contactId) continue;
      await db`
        insert into campaign_contacts (id, user_id, campaign_id, contact_id, status)
        values (${nid()}, ${userId}, ${campaignId}, ${contactId}, ${"pending"})
      `;
    }
  }
  await fillPending(campWhite, agencyKeys, "white");
  await fillPending(campSaas, saasKeys, "saas");
  await fillPending(campOps, opsKeys, "ops");

  await db`
    insert into notifications (id, user_id, title, message, type, href, is_read)
    values
      (${nid()}, ${userId}, ${"Maya Patel booked a meeting"},
       ${"Harborline Analytics — Thursday 11:30 ET via Zoho Bookings."},
       ${"success"}, ${"/app/inbox"}, ${false}),
      (${nid()}, ${userId}, ${"8 drafts waiting in SaaS sprint"},
       ${"Review quality scores before Helix sends via Zoho Mail."},
       ${"info"}, ${"/app/campaigns/" + campSaas}, ${false}),
      (${nid()}, ${userId}, ${"Zoho Mail connected"},
       ${"alex@northwind.digital is warmed and ready. Daily cap 80."},
       ${"success"}, ${"/app/integrations"}, ${true})
  `;

  await db`
    insert into suppressions (id, user_id, email, reason)
    values (${nid()}, ${userId}, ${"noreply@example.com"}, ${"manual"})
  `;
}

export async function loadJsonColumn<T>(row: Record<string, unknown>, key: string, fallback: T): Promise<T> {
  return asJson(row[key], fallback);
}
