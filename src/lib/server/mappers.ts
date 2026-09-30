import type {
  Campaign,
  CampaignStatus,
  Contact,
  ContactList,
  DraftRow,
  PainPoint,
  Profile,
  Reply,
  Sequence,
  SequenceStep,
  Tone,
  ZohoConnection,
  ZohoService,
  ZohoSheet,
} from "@/lib/types";
import { asJson, iso } from "@/lib/server/helpers";

export function mapProfile(r: Record<string, unknown>): Profile {
  return {
    userId: String(r.user_id),
    displayName: (r.display_name as string) ?? null,
    companyName: String(r.company_name ?? ""),
    companyWebsite: String(r.company_website ?? ""),
    roleTitle: String(r.role_title ?? ""),
    timezone: String(r.timezone ?? "UTC"),
    brandVoice: (r.brand_voice as string) ?? null,
    valueProp: (r.value_prop as string) ?? null,
    forbiddenWords: asJson<string[]>(r.forbidden_words, []),
    tone: (r.tone as Tone) ?? "consultative",
    physicalAddress: String(r.physical_address ?? ""),
    bookingUrl: String(r.booking_url ?? ""),
    onboardingComplete: Boolean(r.onboarding_complete),
  };
}

export function mapContact(r: Record<string, unknown>): Contact {
  return {
    id: String(r.id),
    firstName: (r.first_name as string) ?? null,
    lastName: (r.last_name as string) ?? null,
    email: String(r.email),
    emailScore: Number(r.email_score ?? 0),
    companyName: (r.company_name as string) ?? null,
    jobTitle: (r.job_title as string) ?? null,
    websiteUrl: (r.website_url as string) ?? null,
    industry: (r.industry as string) ?? null,
    location: (r.location as string) ?? null,
    linkedinUrl: (r.linkedin_url as string) ?? null,
    phone: (r.phone as string) ?? null,
    tags: asJson<string[]>(r.tags, []),
    status: (r.status as Contact["status"]) ?? "active",
    source: String(r.source ?? "manual"),
    notes: (r.notes as string) ?? null,
    createdAt: iso(r.created_at as string) ?? "",
  };
}

export function mapList(r: Record<string, unknown>): ContactList {
  return {
    id: String(r.id),
    name: String(r.name),
    description: (r.description as string) ?? null,
    source: String(r.source ?? "manual"),
    contactCount: Number(r.contact_count ?? 0),
    createdAt: iso(r.created_at as string) ?? "",
  };
}

export function mapCampaign(
  r: Record<string, unknown>,
  extras?: { contactCount?: number; sentCount?: number; replyCount?: number; reviewCount?: number },
): Campaign {
  return {
    id: String(r.id),
    name: String(r.name),
    description: (r.description as string) ?? null,
    status: (r.status as CampaignStatus) ?? "draft",
    goal: String(r.goal ?? "meeting"),
    listId: (r.list_id as string) ?? null,
    sequenceId: (r.sequence_id as string) ?? null,
    zohoMailId: (r.zoho_mail_id as string) ?? null,
    tone: (r.tone as Tone) ?? "consultative",
    researchDepth: String(r.research_depth ?? "standard"),
    approvalRequired: Boolean(r.approval_required),
    autoApproveThreshold: r.auto_approve_threshold == null ? null : Number(r.auto_approve_threshold),
    startDate: iso(r.start_date as string),
    createdAt: iso(r.created_at as string) ?? "",
    contactCount: extras?.contactCount ?? Number(r.contact_count ?? 0),
    sentCount: extras?.sentCount ?? Number(r.sent_count ?? 0),
    replyCount: extras?.replyCount ?? Number(r.reply_count ?? 0),
    reviewCount: extras?.reviewCount ?? Number(r.review_count ?? 0),
  };
}

export function mapDraft(r: Record<string, unknown>): DraftRow {
  return {
    id: String(r.id),
    campaignContactId: String(r.campaign_contact_id),
    campaignId: String(r.campaign_id),
    campaignName: String(r.campaign_name ?? ""),
    step: Number(r.step ?? 0),
    subject: String(r.subject),
    bodyHtml: String(r.body_html),
    personalization: asJson<string[]>(r.personalization, []),
    qualityScore: Number(r.quality_score ?? 0),
    spamScore: Number(r.spam_score ?? 0),
    grammarScore: Number(r.grammar_score ?? 0),
    status: r.status as DraftRow["status"],
    rejectionReason: (r.rejection_reason as string) ?? null,
    createdAt: iso(r.created_at as string) ?? "",
    contact: {
      id: String(r.contact_id),
      firstName: (r.first_name as string) ?? null,
      lastName: (r.last_name as string) ?? null,
      email: String(r.email ?? ""),
      companyName: (r.company_name as string) ?? null,
      jobTitle: (r.job_title as string) ?? null,
      websiteUrl: (r.website_url as string) ?? null,
      industry: (r.industry as string) ?? null,
      location: (r.location as string) ?? null,
    },
    company: r.company_description
      ? {
          description: (r.company_description as string) ?? null,
          painPoints: asJson<PainPoint[]>(r.pain_points, []),
          services: asJson<string[]>(r.services, []),
          recentSignals: asJson<string[]>(r.recent_signals, []),
        }
      : null,
  };
}

export function mapReply(r: Record<string, unknown>): Reply {
  return {
    id: String(r.id),
    campaignId: (r.campaign_id as string) ?? null,
    contactId: String(r.contact_id),
    fromEmail: String(r.from_email),
    subject: (r.subject as string) ?? null,
    body: String(r.body),
    category: r.category as Reply["category"],
    receivedAt: iso(r.received_at as string) ?? "",
    isRead: Boolean(r.is_read),
    contactName: [r.first_name, r.last_name].filter(Boolean).join(" ") || String(r.from_email),
    companyName: (r.company_name as string) ?? null,
  };
}

export function mapZoho(r: Record<string, unknown>): ZohoConnection {
  return {
    id: String(r.id),
    service: r.service as ZohoService,
    status: (r.status as ZohoConnection["status"]) ?? "disconnected",
    email: (r.email as string) ?? null,
    displayName: (r.display_name as string) ?? null,
    orgName: (r.org_name as string) ?? null,
    dailySendLimit: Number(r.daily_send_limit ?? 0),
    dailySendCount: Number(r.daily_send_count ?? 0),
    warmupStatus: String(r.warmup_status ?? "none"),
    connectedAt: iso(r.connected_at as string),
  };
}

export function mapSequence(r: Record<string, unknown>): Sequence {
  return {
    id: String(r.id),
    name: String(r.name),
    description: (r.description as string) ?? null,
    isDefault: Boolean(r.is_default),
    steps: asJson<SequenceStep[]>(r.steps, []),
  };
}

export function mapSheet(r: Record<string, unknown>): ZohoSheet {
  return {
    id: String(r.id),
    workbookName: String(r.workbook_name),
    sheetName: String(r.sheet_name),
    rowCount: Number(r.row_count ?? 0),
    lastSyncedAt: iso(r.last_synced_at as string),
  };
}
