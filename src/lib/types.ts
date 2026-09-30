export type CampaignStatus =
  | "draft"
  | "generating"
  | "reviewing"
  | "running"
  | "paused"
  | "completed"
  | "cancelled";

export type ContactStatus = "active" | "unsubscribed" | "bounced" | "invalid";

export type DraftStatus =
  | "generating"
  | "generated"
  | "edited"
  | "approved"
  | "rejected"
  | "sent";

export type CampaignContactStatus =
  | "pending"
  | "researching"
  | "generating"
  | "reviewing"
  | "approved"
  | "sending"
  | "sent"
  | "bounced"
  | "replied"
  | "converted"
  | "unsubscribed";

export type ReplyCategory =
  | "positive"
  | "negative"
  | "neutral"
  | "out_of_office"
  | "meeting";

export type ZohoService = "mail" | "sheets" | "crm" | "bookings" | "cliq";

export type Tone =
  | "consultative"
  | "professional"
  | "friendly"
  | "direct"
  | "formal";

export type SequenceStep = {
  delayDays: number;
  label: string;
  angle: string;
};

export type PainPoint = {
  hypothesis: string;
  evidence: string;
  severity: "low" | "medium" | "high";
  category: string;
};

export type Profile = {
  userId: string;
  displayName: string | null;
  companyName: string;
  companyWebsite: string;
  roleTitle: string;
  timezone: string;
  brandVoice: string | null;
  valueProp: string | null;
  forbiddenWords: string[];
  tone: Tone;
  physicalAddress: string;
  bookingUrl: string;
  onboardingComplete: boolean;
};

export type ZohoConnection = {
  id: string;
  service: ZohoService;
  status: "connected" | "disconnected" | "error";
  email: string | null;
  displayName: string | null;
  orgName: string | null;
  dailySendLimit: number;
  dailySendCount: number;
  warmupStatus: string;
  connectedAt: string | null;
};

export type Contact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  emailScore: number;
  companyName: string | null;
  jobTitle: string | null;
  websiteUrl: string | null;
  industry: string | null;
  location: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  tags: string[];
  status: ContactStatus;
  source: string;
  notes: string | null;
  createdAt: string;
};

export type ContactList = {
  id: string;
  name: string;
  description: string | null;
  source: string;
  contactCount: number;
  createdAt: string;
};

export type Campaign = {
  id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  goal: string;
  listId: string | null;
  sequenceId: string | null;
  zohoMailId: string | null;
  tone: Tone;
  researchDepth: string;
  approvalRequired: boolean;
  autoApproveThreshold: number | null;
  startDate: string | null;
  createdAt: string;
  contactCount: number;
  sentCount: number;
  replyCount: number;
  reviewCount: number;
};

export type DraftRow = {
  id: string;
  campaignContactId: string;
  campaignId: string;
  campaignName: string;
  step: number;
  subject: string;
  bodyHtml: string;
  personalization: string[];
  qualityScore: number;
  spamScore: number;
  grammarScore: number;
  status: DraftStatus;
  rejectionReason: string | null;
  createdAt: string;
  contact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    companyName: string | null;
    jobTitle: string | null;
    websiteUrl: string | null;
    industry: string | null;
    location: string | null;
  };
  company: {
    description: string | null;
    painPoints: PainPoint[];
    services: string[];
    recentSignals: string[];
  } | null;
};

export type SentEmail = {
  id: string;
  campaignId: string;
  contactId: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  sentAt: string;
  openedAt: string | null;
  openCount: number;
  clickedAt: string | null;
  clickCount: number;
  repliedAt: string | null;
};

export type Reply = {
  id: string;
  campaignId: string | null;
  contactId: string;
  fromEmail: string;
  subject: string | null;
  body: string;
  category: ReplyCategory;
  receivedAt: string;
  isRead: boolean;
  contactName: string;
  companyName: string | null;
};

export type Sequence = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  steps: SequenceStep[];
};

export type ZohoSheet = {
  id: string;
  workbookName: string;
  sheetName: string;
  rowCount: number;
  lastSyncedAt: string | null;
};

export type DashboardStats = {
  sent: number;
  delivered: number;
  opens: number;
  uniqueOpens: number;
  clicks: number;
  replies: number;
  positiveReplies: number;
  meetings: number;
  bounces: number;
  inReview: number;
  runningCampaigns: number;
  activeContacts: number;
  openRate: number;
  replyRate: number;
  meetingRate: number;
  bounceRate: number;
};

export type DailyPoint = {
  date: string;
  sent: number;
  opens: number;
  replies: number;
};

export type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  href: string | null;
  isRead: boolean;
  createdAt: string;
};
