import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { mapCsvRow, parseCsv, type MappedContact } from "@/lib/csv";
import { qualityScore, spamScore, validateEmail } from "@/lib/email-quality";
import { researchCompany, writeEmail, writeFollowUp } from "@/lib/server/ai";
import { asJson, domainFrom, iso, nid, sql } from "@/lib/server/helpers";
import {
  mapCampaign,
  mapContact,
  mapDraft,
  mapList,
  mapProfile,
  mapReply,
  mapSequence,
  mapSheet,
  mapZoho,
} from "@/lib/server/mappers";
import { ensureWorkspace } from "@/lib/server/seed";
import { ZOHO_SHEET_ROWS } from "@/lib/server/seed-data";
import type { DashboardStats, DailyPoint, Notification, ReplyCategory, Tone, ZohoService } from "@/lib/types";

async function boot(userId: string) {
  await ensureWorkspace(userId);
}

export const getBootstrap = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await boot(context.userId);
    const db = await sql();
    const [profile] = await db`select * from profiles where user_id = ${context.userId} limit 1`;
    const connections = await db`select * from zoho_connections where user_id = ${context.userId}`;
    const notes = await db`
      select * from notifications where user_id = ${context.userId}
      order by created_at desc limit 12
    `;
    return {
      profile: mapProfile(profile as Record<string, unknown>),
      zoho: connections.map((r) => mapZoho(r as Record<string, unknown>)),
      notifications: notes.map((n) => ({
        id: String(n.id),
        title: String(n.title),
        message: String(n.message),
        type: String(n.type),
        href: (n.href as string) ?? null,
        isRead: Boolean(n.is_read),
        createdAt: String(n.created_at),
      })) as Notification[],
    };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: Partial<{
    displayName: string;
    companyName: string;
    companyWebsite: string;
    roleTitle: string;
    brandVoice: string;
    valueProp: string;
    forbiddenWords: string[];
    tone: Tone;
    physicalAddress: string;
    bookingUrl: string;
  }>) => d)
  .handler(async ({ context, data }) => {
    const db = await sql();
    const [cur] = await db`select * from profiles where user_id = ${context.userId} limit 1`;
    await db`
      update profiles set
        display_name = ${data.displayName ?? (cur?.display_name as string) ?? null},
        company_name = ${data.companyName ?? String(cur?.company_name ?? "")},
        company_website = ${data.companyWebsite ?? String(cur?.company_website ?? "")},
        role_title = ${data.roleTitle ?? String(cur?.role_title ?? "")},
        brand_voice = ${data.brandVoice ?? (cur?.brand_voice as string) ?? null},
        value_prop = ${data.valueProp ?? (cur?.value_prop as string) ?? null},
        forbidden_words = ${JSON.stringify(data.forbiddenWords ?? cur?.forbidden_words ?? [])},
        tone = ${data.tone ?? String(cur?.tone ?? "consultative")},
        physical_address = ${data.physicalAddress ?? String(cur?.physical_address ?? "")},
        booking_url = ${data.bookingUrl ?? String(cur?.booking_url ?? "")},
        updated_at = now()
      where user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = await sql();
    await db`update notifications set is_read = true where user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await boot(context.userId);
    const db = await sql();
    const sent = await db<{ n: number; opens: number; clicks: number; replies: number; bounces: number }>`
      select
        count(*)::int as n,
        coalesce(sum(case when opened_at is not null then 1 else 0 end),0)::int as opens,
        coalesce(sum(case when clicked_at is not null then 1 else 0 end),0)::int as clicks,
        coalesce(sum(case when replied_at is not null then 1 else 0 end),0)::int as replies,
        coalesce(sum(case when bounce_type is not null then 1 else 0 end),0)::int as bounces
      from sent_emails where user_id = ${context.userId}
    `;
    const s = sent[0] ?? { n: 0, opens: 0, clicks: 0, replies: 0, bounces: 0 };
    const extra = await db<{ meetings: number; in_review: number; running: number; contacts: number; positive: number }>`
      select
        (select count(*)::int from campaign_contacts where user_id = ${context.userId} and status = 'converted') as meetings,
        (select count(*)::int from drafts where user_id = ${context.userId} and status in ('generated','edited')) as in_review,
        (select count(*)::int from campaigns where user_id = ${context.userId} and status = 'running') as running,
        (select count(*)::int from contacts where user_id = ${context.userId} and status = 'active') as contacts,
        (select count(*)::int from replies where user_id = ${context.userId} and category in ('positive','meeting')) as positive
    `;
    const e = extra[0] ?? { meetings: 0, in_review: 0, running: 0, contacts: 0, positive: 0 };
    const delivered = Math.max(0, s.n - s.bounces);
    const stats: DashboardStats = {
      sent: s.n,
      delivered,
      opens: s.opens,
      uniqueOpens: s.opens,
      clicks: s.clicks,
      replies: s.replies,
      positiveReplies: e.positive,
      meetings: e.meetings,
      bounces: s.bounces,
      inReview: e.in_review,
      runningCampaigns: e.running,
      activeContacts: e.contacts,
      openRate: delivered ? (s.opens / delivered) * 100 : 0,
      replyRate: delivered ? (s.replies / delivered) * 100 : 0,
      meetingRate: delivered ? (e.meetings / delivered) * 100 : 0,
      bounceRate: s.n ? (s.bounces / s.n) * 100 : 0,
    };
    const dailyRows = await db<{ day: string; sent: number; opens: number; replies: number }>`
      select
        to_char(sent_at::date, 'YYYY-MM-DD') as day,
        count(*)::int as sent,
        coalesce(sum(case when opened_at is not null then 1 else 0 end),0)::int as opens,
        coalesce(sum(case when replied_at is not null then 1 else 0 end),0)::int as replies
      from sent_emails
      where user_id = ${context.userId} and sent_at > now() - interval '14 days'
      group by sent_at::date
      order by day
    `;
    const byDay = new Map(dailyRows.map((r) => [r.day, r]));
    const daily: DailyPoint[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      const row = byDay.get(key);
      daily.push({ date: key, sent: row?.sent ?? 0, opens: row?.opens ?? 0, replies: row?.replies ?? 0 });
    }
    const campaigns = await listCampaignRows(context.userId);
    const replies = await db`
      select r.*, c.first_name, c.last_name, c.company_name
      from replies r
      join contacts c on c.id = r.contact_id
      where r.user_id = ${context.userId}
      order by r.received_at desc
      limit 6
    `;
    const review = await db`
      select d.*, cc.campaign_id, camp.name as campaign_name,
        c.id as contact_id, c.first_name, c.last_name, c.email, c.company_name,
        c.job_title, c.website_url, c.industry, c.location
      from drafts d
      join campaign_contacts cc on cc.id = d.campaign_contact_id
      join campaigns camp on camp.id = cc.campaign_id
      join contacts c on c.id = cc.contact_id
      where d.user_id = ${context.userId} and d.status in ('generated','edited')
      order by d.quality_score desc
      limit 5
    `;
    return {
      stats,
      daily,
      campaigns: campaigns.slice(0, 5),
      replies: replies.map((r) => mapReply(r as Record<string, unknown>)),
      reviewQueue: review.map((r) => mapDraft(r as Record<string, unknown>)),
    };
  });

async function listCampaignRows(userId: string) {
  const db = await sql();
  const rows = await db`
    select camp.*,
      (select count(*)::int from campaign_contacts cc where cc.campaign_id = camp.id) as contact_count,
      (select count(*)::int from sent_emails se where se.campaign_id = camp.id) as sent_count,
      (select count(*)::int from replies r where r.campaign_id = camp.id) as reply_count,
      (select count(*)::int from drafts d join campaign_contacts cc on cc.id = d.campaign_contact_id
        where cc.campaign_id = camp.id and d.status in ('generated','edited')) as review_count
    from campaigns camp
    where camp.user_id = ${userId}
    order by camp.created_at desc
  `;
  return rows.map((r) => mapCampaign(r as Record<string, unknown>));
}

export const listCampaigns = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await boot(context.userId);
    return listCampaignRows(context.userId);
  });

export const getCampaign = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const db = await sql();
    const rows = await db`
      select camp.*,
        (select count(*)::int from campaign_contacts cc where cc.campaign_id = camp.id) as contact_count,
        (select count(*)::int from sent_emails se where se.campaign_id = camp.id) as sent_count,
        (select count(*)::int from replies r where r.campaign_id = camp.id) as reply_count,
        (select count(*)::int from drafts d join campaign_contacts cc on cc.id = d.campaign_contact_id
          where cc.campaign_id = camp.id and d.status in ('generated','edited')) as review_count
      from campaigns camp
      where camp.id = ${id} and camp.user_id = ${context.userId}
      limit 1
    `;
    if (!rows[0]) throw new Error("Campaign not found");
    const drafts = await db`
      select d.*, cc.campaign_id, camp.name as campaign_name,
        c.id as contact_id, c.first_name, c.last_name, c.email, c.company_name,
        c.job_title, c.website_url, c.industry, c.location
      from drafts d
      join campaign_contacts cc on cc.id = d.campaign_contact_id
      join campaigns camp on camp.id = cc.campaign_id
      join contacts c on c.id = cc.contact_id
      where camp.id = ${id} and d.user_id = ${context.userId}
      order by d.created_at desc
    `;
    const companies = await db`select * from companies where user_id = ${context.userId}`;
    const byDomain = new Map(
      companies.map((c) => [String(c.domain), c as Record<string, unknown>]),
    );
    const mapped = drafts.map((r) => {
      const d = mapDraft(r as Record<string, unknown>);
      const domain = domainFrom(d.contact.websiteUrl, d.contact.companyName);
      const co = byDomain.get(domain);
      if (co) {
        d.company = {
          description: (co.description as string) ?? null,
          painPoints: asJson<DraftCompanyPain>(co.pain_points, []),
          services: asJson<string[]>(co.services, []),
          recentSignals: asJson<string[]>(co.recent_signals, []),
        };
      }
      return d;
    });
    const sequence = rows[0].sequence_id
      ? await db`select * from sequences where id = ${rows[0].sequence_id as string} and user_id = ${context.userId} limit 1`
      : [];
    const pending = await db`
      select cc.id, cc.status, c.first_name, c.last_name, c.email, c.company_name
      from campaign_contacts cc
      join contacts c on c.id = cc.contact_id
      where cc.campaign_id = ${id} and cc.user_id = ${context.userId}
        and cc.status in ('pending','researching','generating')
      order by c.company_name
    `;
    const approvedRows = await db<{ n: number }>`
      select count(*)::int as n from drafts d
      join campaign_contacts cc on cc.id = d.campaign_contact_id
      where cc.campaign_id = ${id} and d.user_id = ${context.userId} and d.status = 'approved'
    `;
    return {
      campaign: mapCampaign(rows[0] as Record<string, unknown>),
      drafts: mapped,
      sequence: sequence[0] ? mapSequence(sequence[0] as Record<string, unknown>) : null,
      pending: pending.map((p) => ({
        id: String(p.id),
        status: String(p.status),
        firstName: (p.first_name as string) ?? null,
        lastName: (p.last_name as string) ?? null,
        email: String(p.email ?? ""),
        companyName: (p.company_name as string) ?? null,
      })),
      approvedCount: approvedRows[0]?.n ?? 0,
    };
  });

type DraftCompanyPain = {
  hypothesis: string;
  evidence: string;
  severity: "low" | "medium" | "high";
  category: string;
}[];

export const createCampaign = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: {
    name: string;
    description?: string;
    goal: string;
    listId: string;
    sequenceId?: string;
    tone: Tone;
    researchDepth: string;
    approvalRequired: boolean;
  }) => d)
  .handler(async ({ context, data }) => {
    const db = await sql();
    const id = nid();
    const mail = await db<{ id: string }>`
      select id from zoho_connections
      where user_id = ${context.userId} and service = 'mail' and status = 'connected'
      limit 1
    `;
    await db`
      insert into campaigns (
        id, user_id, name, description, status, goal, list_id, sequence_id,
        zoho_mail_id, tone, research_depth, approval_required
      ) values (
        ${id}, ${context.userId}, ${data.name}, ${data.description ?? null}, ${"draft"},
        ${data.goal}, ${data.listId}, ${data.sequenceId ?? null}, ${mail[0]?.id ?? null},
        ${data.tone}, ${data.researchDepth}, ${data.approvalRequired}
      )
    `;
    const members = await db<{ contact_id: string }>`
      select contact_id from list_memberships where list_id = ${data.listId}
    `;
    for (const m of members) {
      await db`
        insert into campaign_contacts (id, user_id, campaign_id, contact_id, status)
        values (${nid()}, ${context.userId}, ${id}, ${m.contact_id}, ${"pending"})
      `;
    }
    return { id };
  });

export const setCampaignStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; status: string }) => d)
  .handler(async ({ context, data }) => {
    const db = await sql();
    await db`
      update campaigns set status = ${data.status}, updated_at = now()
      where id = ${data.id} and user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

export const listContacts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await boot(context.userId);
    const db = await sql();
    const rows = await db`
      select * from contacts where user_id = ${context.userId}
      order by created_at desc
    `;
    const lists = await db`select * from contact_lists where user_id = ${context.userId} order by created_at desc`;
    return {
      contacts: rows.map((r) => mapContact(r as Record<string, unknown>)),
      lists: lists.map((r) => mapList(r as Record<string, unknown>)),
    };
  });

export const createContact = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: MappedContact & { listId?: string }) => d)
  .handler(async ({ context, data }) => {
    const v = validateEmail(data.email);
    if (!v.ok) return { ok: false as const, error: "Invalid email" };
    const db = await sql();
    const dup = await db`select id from contacts where user_id = ${context.userId} and lower(email) = ${data.email.toLowerCase()} limit 1`;
    if (dup[0]) return { ok: false as const, error: "Duplicate email" };
    const id = nid();
    await db`
      insert into contacts (
        id, user_id, first_name, last_name, email, email_score, company_name,
        job_title, website_url, industry, location, linkedin_url, phone, source, status
      ) values (
        ${id}, ${context.userId}, ${data.firstName || null}, ${data.lastName || null},
        ${data.email.toLowerCase()}, ${v.score}, ${data.companyName || null},
        ${data.jobTitle || null}, ${data.websiteUrl || null}, ${data.industry || null},
        ${data.location || null}, ${data.linkedinUrl || null}, ${data.phone || null},
        ${"manual"}, ${"active"}
      )
    `;
    if (data.listId) {
      await db`insert into list_memberships (list_id, contact_id) values (${data.listId}, ${id}) on conflict do nothing`;
      await db`update contact_lists set contact_count = contact_count + 1 where id = ${data.listId} and user_id = ${context.userId}`;
    }
    return { ok: true as const, id };
  });

async function importMapped(
  userId: string,
  mapped: MappedContact[],
  listName: string,
  source: string,
) {
  const db = await sql();
  const listId = nid();
  await db`
    insert into contact_lists (id, user_id, name, description, source, contact_count)
    values (${listId}, ${userId}, ${listName || "Import"}, ${null}, ${source}, 0)
  `;
  let created = 0;
  let skipped = 0;
  const errors: { row: number; error: string }[] = [];
  for (let i = 0; i < mapped.length; i++) {
    const row = mapped[i]!;
    if (!row.email) {
      skipped++;
      errors.push({ row: i + 2, error: "Missing email" });
      continue;
    }
    const v = validateEmail(row.email);
    if (!v.ok) {
      skipped++;
      errors.push({ row: i + 2, error: "Invalid email" });
      continue;
    }
    const dup = await db`select id from contacts where user_id = ${userId} and lower(email) = ${row.email.toLowerCase()} limit 1`;
    if (dup[0]) {
      await db`insert into list_memberships (list_id, contact_id) values (${listId}, ${dup[0].id as string}) on conflict do nothing`;
      skipped++;
      continue;
    }
    const id = nid();
    await db`
      insert into contacts (
        id, user_id, first_name, last_name, email, email_score, company_name,
        job_title, website_url, industry, location, linkedin_url, phone, source, status
      ) values (
        ${id}, ${userId}, ${row.firstName || null}, ${row.lastName || null},
        ${row.email.toLowerCase()}, ${v.score}, ${row.companyName || null},
        ${row.jobTitle || null}, ${row.websiteUrl || null}, ${row.industry || null},
        ${row.location || null}, ${row.linkedinUrl || null}, ${row.phone || null},
        ${source}, ${"active"}
      )
    `;
    await db`insert into list_memberships (list_id, contact_id) values (${listId}, ${id})`;
    created++;
  }
  await db`update contact_lists set contact_count = ${created} where id = ${listId}`;
  return { ok: true as const, listId, created, skipped, errors: errors.slice(0, 20), total: mapped.length };
}

export const importCsv = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { csv: string; listName: string }) => d)
  .handler(async ({ context, data }) => {
    const parsed = parseCsv(data.csv);
    return importMapped(context.userId, parsed.rows.map(mapCsvRow), data.listName, "csv");
  });

export const importZohoSheet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { sheetId: string; listName?: string }) => d)
  .handler(async ({ context, data }) => {
    const db = await sql();
    const sheet = await db`
      select * from zoho_sheets where id = ${data.sheetId} and user_id = ${context.userId} limit 1
    `;
    if (!sheet[0]) return { ok: false as const, error: "Sheet not found" };
    const rows = (sheet[0].rows as MappedContact[]) ?? ZOHO_SHEET_ROWS;
    return importMapped(
      context.userId,
      rows,
      data.listName || String(sheet[0].workbook_name),
      "zoho_sheets",
    );
  });

export const listZoho = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await boot(context.userId);
    const db = await sql();
    const connections = await db`select * from zoho_connections where user_id = ${context.userId}`;
    const sheets = await db`select * from zoho_sheets where user_id = ${context.userId}`;
    return {
      connections: connections.map((r) => mapZoho(r as Record<string, unknown>)),
      sheets: sheets.map((r) => mapSheet(r as Record<string, unknown>)),
    };
  });

export const toggleZoho = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { service: ZohoService; connect: boolean; email?: string }) => d)
  .handler(async ({ context, data }) => {
    const db = await sql();
    const [profile] = await db`select display_name from profiles where user_id = ${context.userId} limit 1`;
    const status = data.connect ? "connected" : "disconnected";
    const email = data.email ?? "alex@northwind.digital";
    await db`
      update zoho_connections set
        status = ${status},
        email = ${data.connect ? email : null},
        display_name = ${data.connect ? ((profile?.display_name as string) ?? "Alex Rivera") : null},
        org_name = ${data.connect ? "Northwind Digital" : null},
        connected_at = ${data.connect ? new Date().toISOString() : null},
        warmup_status = ${data.service === "mail" && data.connect ? "in_progress" : "none"}
      where user_id = ${context.userId} and service = ${data.service}
    `;
    return { ok: true as const };
  });

export const listSequences = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await boot(context.userId);
    const db = await sql();
    const rows = await db`select * from sequences where user_id = ${context.userId} order by is_default desc`;
    return rows.map((r) => mapSequence(r as Record<string, unknown>));
  });

export const saveSequence = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id?: string; name: string; description?: string; steps: { delayDays: number; label: string; angle: string }[] }) => d)
  .handler(async ({ context, data }) => {
    const db = await sql();
    const id = data.id ?? nid();
    if (data.id) {
      await db`
        update sequences set name = ${data.name}, description = ${data.description ?? null},
          steps = ${JSON.stringify(data.steps)}
        where id = ${id} and user_id = ${context.userId}
      `;
    } else {
      await db`
        insert into sequences (id, user_id, name, description, is_default, steps)
        values (${id}, ${context.userId}, ${data.name}, ${data.description ?? null}, ${false}, ${JSON.stringify(data.steps)})
      `;
    }
    return { id };
  });

export const listInbox = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await boot(context.userId);
    const db = await sql();
    const rows = await db`
      select r.*, c.first_name, c.last_name, c.company_name
      from replies r
      join contacts c on c.id = r.contact_id
      where r.user_id = ${context.userId}
      order by r.received_at desc
    `;
    return rows.map((r) => mapReply(r as Record<string, unknown>));
  });

export const markReplyRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const db = await sql();
    await db`update replies set is_read = true where id = ${id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const updateDraft = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; subject?: string; bodyHtml?: string }) => d)
  .handler(async ({ context, data }) => {
    const db = await sql();
    const [row] = await db`select * from drafts where id = ${data.id} and user_id = ${context.userId} limit 1`;
    if (!row) throw new Error("Draft not found");
    const subject = data.subject ?? String(row.subject);
    const body = data.bodyHtml ?? String(row.body_html);
    const spam = spamScore(subject, body);
    const quality = qualityScore({
      subject,
      body,
      personalization: (row.personalization as string[]) ?? [],
      spam,
    });
    await db`
      update drafts set subject = ${subject}, body_html = ${body}, spam_score = ${spam},
        quality_score = ${quality}, status = 'edited', updated_at = now()
      where id = ${data.id} and user_id = ${context.userId}
    `;
    return { ok: true as const, quality, spam };
  });

async function sendDraftInner(userId: string, draftId: string) {
  const db = await sql();
  const [draft] = await db`
    select d.*, cc.campaign_id, cc.contact_id, cc.id as cc_id, c.email as to_email
    from drafts d
    join campaign_contacts cc on cc.id = d.campaign_contact_id
    join contacts c on c.id = cc.contact_id
    where d.id = ${draftId} and d.user_id = ${userId}
    limit 1
  `;
  if (!draft) throw new Error("Draft not found");
  const mail = await db`
    select * from zoho_connections
    where user_id = ${userId} and service = 'mail' and status = 'connected'
    limit 1
  `;
  if (!mail[0]) return { ok: false as const, error: "Connect Zoho Mail first" };
  const fromEmail = String(mail[0].email ?? "alex@northwind.digital");
  const sentId = nid();
  await db`
    insert into sent_emails (
      id, user_id, draft_id, campaign_id, contact_id, zoho_mail_id,
      from_email, to_email, subject, body_html, sent_at
    ) values (
      ${sentId}, ${userId}, ${draftId}, ${draft.campaign_id as string},
      ${draft.contact_id as string}, ${mail[0].id as string}, ${fromEmail},
      ${draft.to_email as string}, ${draft.subject as string}, ${draft.body_html as string}, now()
    )
  `;
  await db`update drafts set status = 'sent', updated_at = now() where id = ${draftId}`;
  await db`
    update campaign_contacts set status = 'sent', last_email_sent_at = now()
    where id = ${draft.cc_id as string}
  `;
  await db`
    update zoho_connections set daily_send_count = daily_send_count + 1, last_send_date = current_date
    where id = ${mail[0].id as string}
  `;
  await db`
    update campaigns set status = 'running', updated_at = now()
    where id = ${draft.campaign_id as string} and user_id = ${userId} and status in ('draft','reviewing')
  `;
  return { ok: true as const, sentId };
}

export const approveDraft = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; send?: boolean }) => d)
  .handler(async ({ context, data }) => {
    const db = await sql();
    const [draft] = await db`select * from drafts where id = ${data.id} and user_id = ${context.userId} limit 1`;
    if (!draft) throw new Error("Draft not found");
    await db`
      update drafts set status = 'approved', reviewed_at = now()
      where id = ${data.id} and user_id = ${context.userId}
    `;
    await db`
      update campaign_contacts set status = 'approved'
      where id = ${draft.campaign_contact_id as string} and user_id = ${context.userId}
    `;
    if (data.send) {
      const sent = await sendDraftInner(context.userId, data.id);
      if (!sent.ok) return { ok: false as const, error: sent.error, sent: false };
      return { ok: true as const, sent: true };
    }
    return { ok: true as const, sent: false };
  });

export const rejectDraft = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; reason?: string }) => d)
  .handler(async ({ context, data }) => {
    const db = await sql();
    await db`
      update drafts set status = 'rejected', rejection_reason = ${data.reason ?? "Rejected"}, reviewed_at = now()
      where id = ${data.id} and user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

export const approveByScore = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { campaignId: string; minScore: number }) => d)
  .handler(async ({ context, data }) => {
    const db = await sql();
    const rows = await db<{ id: string; campaign_contact_id: string }>`
      select d.id, d.campaign_contact_id from drafts d
      join campaign_contacts cc on cc.id = d.campaign_contact_id
      where d.user_id = ${context.userId} and cc.campaign_id = ${data.campaignId}
        and d.status in ('generated','edited') and d.quality_score >= ${data.minScore}
    `;
    for (const r of rows) {
      await db`update drafts set status = 'approved', reviewed_at = now() where id = ${r.id} and user_id = ${context.userId}`;
      await db`update campaign_contacts set status = 'approved' where id = ${r.campaign_contact_id} and user_id = ${context.userId}`;
    }
    return { ok: true as const, count: rows.length };
  });

export const sendApproved = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { draftId: string }) => d)
  .handler(async ({ context, data }) => sendDraftInner(context.userId, data.draftId));

export const sendAllApproved = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { campaignId: string }) => d)
  .handler(async ({ context, data }) => {
    const db = await sql();
    const rows = await db<{ id: string }>`
      select d.id from drafts d
      join campaign_contacts cc on cc.id = d.campaign_contact_id
      where d.user_id = ${context.userId} and cc.campaign_id = ${data.campaignId} and d.status = 'approved'
    `;
    let sent = 0;
    for (const r of rows) {
      const res = await sendDraftInner(context.userId, r.id);
      if (res.ok) sent++;
    }
    return { ok: true as const, sent };
  });

export const generateForCampaign = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { campaignId: string; limit?: number }) => d)
  .handler(async ({ context, data }) => {
    const db = await sql();
    const [campaign] = await db`
      select * from campaigns where id = ${data.campaignId} and user_id = ${context.userId} limit 1
    `;
    if (!campaign) throw new Error("Campaign not found");
    const [profile] = await db`select * from profiles where user_id = ${context.userId} limit 1`;
    const pending = await db`
      select cc.id as cc_id, c.*
      from campaign_contacts cc
      join contacts c on c.id = cc.contact_id
      where cc.campaign_id = ${data.campaignId} and cc.user_id = ${context.userId}
        and cc.status in ('pending','generating')
      limit ${Math.min(data.limit ?? 4, 4)}
    `;
    await db`update campaigns set status = 'generating', updated_at = now() where id = ${data.campaignId}`;
    let generated = 0;
    for (const row of pending) {
      const ccId = String(row.cc_id);
      await db`update campaign_contacts set status = 'researching' where id = ${ccId}`;
      const domain = domainFrom(row.website_url as string, row.company_name as string);
      let company = await db`
        select * from companies where user_id = ${context.userId} and domain = ${domain} limit 1
      `;
      if (!company[0]) {
        const research = await researchCompany({
          companyName: String(row.company_name ?? domain),
          website: row.website_url as string,
          industry: row.industry as string,
        });
        await db`
          insert into companies (
            id, user_id, domain, name, industry, description, size_band,
            services, pain_points, tech_stack, recent_signals, confidence, researched_at
          ) values (
            ${nid()}, ${context.userId}, ${domain}, ${row.company_name as string},
            ${research.industry}, ${research.description}, ${"11-50"},
            ${JSON.stringify(research.services)}, ${JSON.stringify(research.painPoints)},
            ${JSON.stringify(research.tech)}, ${JSON.stringify(research.signals)},
            ${0.75}, now()
          )
        `;
        company = await db`select * from companies where user_id = ${context.userId} and domain = ${domain} limit 1`;
      }
      const co = company[0]!;
      const research = {
        description: String(co.description ?? ""),
        industry: String(co.industry ?? ""),
        services: (co.services as string[]) ?? [],
        painPoints: (co.pain_points as DraftCompanyPain) ?? [],
        signals: (co.recent_signals as string[]) ?? [],
        tech: (co.tech_stack as string[]) ?? [],
      };
      await db`update campaign_contacts set status = 'generating' where id = ${ccId}`;
      const email = await writeEmail({
        senderName: String(profile?.display_name ?? "Alex"),
        senderCompany: String(profile?.company_name ?? "Northwind Digital"),
        valueProp: String(profile?.value_prop ?? "We rebuild B2B websites so the first conversation is already qualified."),
        tone: String(campaign.tone ?? "consultative"),
        forbidden: (profile?.forbidden_words as string[]) ?? [],
        bookingUrl: String(profile?.booking_url ?? ""),
        prospectFirst: String(row.first_name ?? "there"),
        prospectCompany: String(row.company_name ?? domain),
        prospectTitle: String(row.job_title ?? ""),
        research,
        goal: String(campaign.goal ?? "meeting"),
      });
      await db`
        insert into drafts (
          id, user_id, campaign_contact_id, step, subject, body_html,
          personalization, quality_score, spam_score, grammar_score, status
        ) values (
          ${nid()}, ${context.userId}, ${ccId}, ${0}, ${email.subject}, ${email.bodyHtml},
          ${JSON.stringify(email.personalization)}, ${email.qualityScore}, ${email.spamScore},
          ${9}, ${"generated"}
        )
      `;
      await db`update campaign_contacts set status = 'reviewing' where id = ${ccId}`;
      generated++;
    }
    await db`update campaigns set status = 'reviewing', updated_at = now() where id = ${data.campaignId}`;
    return { ok: true as const, generated };
  });

export const regenerateDraft = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const db = await sql();
    const [draft] = await db`
      select d.*, c.first_name, c.company_name, c.job_title,
        c.website_url, c.industry, camp.tone, camp.goal
      from drafts d
      join campaign_contacts cc on cc.id = d.campaign_contact_id
      join contacts c on c.id = cc.contact_id
      join campaigns camp on camp.id = cc.campaign_id
      where d.id = ${id} and d.user_id = ${context.userId}
      limit 1
    `;
    if (!draft) throw new Error("Draft not found");
    const [profile] = await db`select * from profiles where user_id = ${context.userId} limit 1`;
    const domain = domainFrom(draft.website_url as string, draft.company_name as string);
    const [co] = await db`select * from companies where user_id = ${context.userId} and domain = ${domain} limit 1`;
    const research = {
      description: String(co?.description ?? ""),
      industry: String(co?.industry ?? draft.industry ?? ""),
      services: (co?.services as string[]) ?? [],
      painPoints: (co?.pain_points as DraftCompanyPain) ?? [],
      signals: (co?.recent_signals as string[]) ?? [],
      tech: (co?.tech_stack as string[]) ?? [],
    };
    const email = await writeEmail({
      senderName: String(profile?.display_name ?? "Alex"),
      senderCompany: String(profile?.company_name ?? "Northwind Digital"),
      valueProp: String(profile?.value_prop ?? ""),
      tone: String(draft.tone ?? "consultative"),
      forbidden: (profile?.forbidden_words as string[]) ?? [],
      bookingUrl: String(profile?.booking_url ?? ""),
      prospectFirst: String(draft.first_name ?? "there"),
      prospectCompany: String(draft.company_name ?? ""),
      prospectTitle: String(draft.job_title ?? ""),
      research,
      goal: String(draft.goal ?? "meeting"),
    });
    await db`
      update drafts set subject = ${email.subject}, body_html = ${email.bodyHtml},
        personalization = ${JSON.stringify(email.personalization)},
        quality_score = ${email.qualityScore}, spam_score = ${email.spamScore},
        status = 'generated', updated_at = now()
      where id = ${id} and user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

export const generateFollowUp = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { campaignContactId: string; angle: string }) => d)
  .handler(async ({ context, data }) => {
    const db = await sql();
    const [prev] = await db`
      select d.*, c.first_name from drafts d
      join campaign_contacts cc on cc.id = d.campaign_contact_id
      join contacts c on c.id = cc.contact_id
      where d.campaign_contact_id = ${data.campaignContactId} and d.user_id = ${context.userId}
      order by d.step desc limit 1
    `;
    if (!prev) throw new Error("No previous email");
    const email = await writeFollowUp({
      previousSubject: String(prev.subject),
      previousBody: String(prev.body_html),
      angle: data.angle,
      prospectFirst: String(prev.first_name ?? "there"),
    });
    const step = Number(prev.step ?? 0) + 1;
    const id = nid();
    await db`
      insert into drafts (
        id, user_id, campaign_contact_id, step, subject, body_html,
        personalization, quality_score, spam_score, grammar_score, status
      ) values (
        ${id}, ${context.userId}, ${data.campaignContactId}, ${step}, ${email.subject},
        ${email.bodyHtml}, ${JSON.stringify(email.personalization)}, ${email.qualityScore},
        ${email.spamScore}, ${9}, ${"generated"}
      )
    `;
    return { id };
  });

export const categorizeReply = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; category: ReplyCategory }) => d)
  .handler(async ({ context, data }) => {
    const db = await sql();
    const [row] = await db`
      select * from replies where id = ${data.id} and user_id = ${context.userId} limit 1
    `;
    if (!row) throw new Error("Reply not found");
    await db`
      update replies set category = ${data.category}
      where id = ${data.id} and user_id = ${context.userId}
    `;
    if (data.category === "meeting" && row.campaign_id) {
      await db`
        update campaign_contacts set status = 'converted', converted_at = now()
        where campaign_id = ${row.campaign_id as string}
          and contact_id = ${row.contact_id as string}
          and user_id = ${context.userId}
      `;
    }
    if (data.category === "positive" && row.campaign_id) {
      await db`
        update campaign_contacts set status = 'replied', last_reply_at = now()
        where campaign_id = ${row.campaign_id as string}
          and contact_id = ${row.contact_id as string}
          and user_id = ${context.userId}
          and status not in ('converted','unsubscribed')
      `;
    }
    return { ok: true as const };
  });

export const getContactDetail = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    await boot(context.userId);
    const db = await sql();
    const [row] = await db`
      select * from contacts where id = ${id} and user_id = ${context.userId} limit 1
    `;
    if (!row) throw new Error("Contact not found");
    const contact = mapContact(row as Record<string, unknown>);
    const domain = domainFrom(contact.websiteUrl, contact.companyName);
    const [co] = await db`
      select * from companies where user_id = ${context.userId} and domain = ${domain} limit 1
    `;
    const sent = await db`
      select id, subject, sent_at, opened_at, replied_at from sent_emails
      where user_id = ${context.userId} and contact_id = ${id}
      order by sent_at desc limit 6
    `;
    return {
      contact,
      company: co
        ? {
            description: (co.description as string) ?? null,
            industry: (co.industry as string) ?? null,
            painPoints: asJson<DraftCompanyPain>(co.pain_points, []),
            services: asJson<string[]>(co.services, []),
            recentSignals: asJson<string[]>(co.recent_signals, []),
            tech: asJson<string[]>(co.tech_stack, []),
          }
        : null,
      sent: sent.map((s) => ({
        id: String(s.id),
        subject: String(s.subject),
        sentAt: iso(s.sent_at as string) ?? String(s.sent_at),
        opened: Boolean(s.opened_at),
        replied: Boolean(s.replied_at),
      })),
    };
  });
