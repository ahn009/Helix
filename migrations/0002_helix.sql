-- Helix workspace schema. Per-user rows use TEXT user_id (Better Auth ids).

create table if not exists profiles (
  user_id text primary key,
  display_name text,
  company_name text not null default 'Northwind Digital',
  company_website text not null default 'https://northwind.digital',
  role_title text not null default 'Head of Growth',
  timezone text not null default 'America/New_York',
  brand_voice text,
  value_prop text,
  forbidden_words jsonb not null default '[]'::jsonb,
  tone text not null default 'consultative',
  physical_address text not null default '184 Mercer Street, Suite 4, New York, NY 10012',
  booking_url text not null default 'https://bookings.zoho.com/helix-demo',
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists zoho_connections (
  id text primary key,
  user_id text not null,
  service text not null,
  status text not null default 'disconnected',
  email text,
  display_name text,
  org_name text,
  daily_send_limit integer not null default 80,
  daily_send_count integer not null default 0,
  last_send_date date,
  warmup_status text not null default 'none',
  meta jsonb not null default '{}'::jsonb,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, service)
);
create index if not exists zoho_connections_user_idx on zoho_connections (user_id);

create table if not exists contact_lists (
  id text primary key,
  user_id text not null,
  name text not null,
  description text,
  source text not null default 'manual',
  contact_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists contact_lists_user_idx on contact_lists (user_id);

create table if not exists contacts (
  id text primary key,
  user_id text not null,
  first_name text,
  last_name text,
  email text not null,
  email_score integer not null default 90,
  company_name text,
  job_title text,
  website_url text,
  industry text,
  location text,
  linkedin_url text,
  phone text,
  tags jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  source text not null default 'manual',
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, email)
);
create index if not exists contacts_user_idx on contacts (user_id);
create index if not exists contacts_status_idx on contacts (user_id, status);

create table if not exists list_memberships (
  list_id text not null references contact_lists(id) on delete cascade,
  contact_id text not null references contacts(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (list_id, contact_id)
);

create table if not exists companies (
  id text primary key,
  user_id text not null,
  domain text not null,
  name text,
  industry text,
  description text,
  size_band text,
  services jsonb not null default '[]'::jsonb,
  pain_points jsonb not null default '[]'::jsonb,
  opportunities jsonb not null default '[]'::jsonb,
  tech_stack jsonb not null default '[]'::jsonb,
  recent_signals jsonb not null default '[]'::jsonb,
  confidence real not null default 0.7,
  researched_at timestamptz,
  unique (user_id, domain)
);
create index if not exists companies_user_idx on companies (user_id);

create table if not exists sequences (
  id text primary key,
  user_id text not null,
  name text not null,
  description text,
  is_default boolean not null default false,
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists sequences_user_idx on sequences (user_id);

create table if not exists campaigns (
  id text primary key,
  user_id text not null,
  name text not null,
  description text,
  status text not null default 'draft',
  goal text not null default 'meeting',
  list_id text references contact_lists(id) on delete set null,
  sequence_id text references sequences(id) on delete set null,
  zoho_mail_id text,
  tone text not null default 'consultative',
  research_depth text not null default 'standard',
  approval_required boolean not null default true,
  auto_approve_threshold real,
  start_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists campaigns_user_idx on campaigns (user_id);
create index if not exists campaigns_status_idx on campaigns (user_id, status);

create table if not exists campaign_contacts (
  id text primary key,
  user_id text not null,
  campaign_id text not null references campaigns(id) on delete cascade,
  contact_id text not null references contacts(id) on delete cascade,
  status text not null default 'pending',
  current_step integer not null default 0,
  last_email_sent_at timestamptz,
  last_reply_at timestamptz,
  converted_at timestamptz,
  unique (campaign_id, contact_id)
);
create index if not exists campaign_contacts_campaign_idx on campaign_contacts (campaign_id);
create index if not exists campaign_contacts_user_idx on campaign_contacts (user_id);

create table if not exists drafts (
  id text primary key,
  user_id text not null,
  campaign_contact_id text not null references campaign_contacts(id) on delete cascade,
  step integer not null default 0,
  subject text not null,
  body_html text not null,
  personalization jsonb not null default '[]'::jsonb,
  quality_score real not null default 0,
  spam_score real not null default 0,
  grammar_score real not null default 9,
  status text not null default 'generated',
  rejection_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists drafts_user_idx on drafts (user_id);
create index if not exists drafts_cc_idx on drafts (campaign_contact_id);
create index if not exists drafts_status_idx on drafts (user_id, status);

create table if not exists sent_emails (
  id text primary key,
  user_id text not null,
  draft_id text references drafts(id) on delete set null,
  campaign_id text not null,
  contact_id text not null,
  zoho_mail_id text,
  from_email text not null,
  to_email text not null,
  subject text not null,
  body_html text not null,
  sent_at timestamptz not null default now(),
  opened_at timestamptz,
  open_count integer not null default 0,
  clicked_at timestamptz,
  click_count integer not null default 0,
  replied_at timestamptz,
  bounce_type text,
  unsubscribed_at timestamptz
);
create index if not exists sent_emails_user_idx on sent_emails (user_id);
create index if not exists sent_emails_campaign_idx on sent_emails (campaign_id);
create index if not exists sent_emails_contact_idx on sent_emails (contact_id);

create table if not exists replies (
  id text primary key,
  user_id text not null,
  sent_email_id text references sent_emails(id) on delete set null,
  campaign_id text,
  contact_id text not null,
  from_email text not null,
  subject text,
  body text not null,
  category text not null default 'neutral',
  received_at timestamptz not null default now(),
  is_read boolean not null default false
);
create index if not exists replies_user_idx on replies (user_id);

create table if not exists zoho_sheets (
  id text primary key,
  user_id text not null,
  connection_id text,
  workbook_name text not null,
  sheet_name text not null default 'Sheet1',
  row_count integer not null default 0,
  rows jsonb not null default '[]'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists zoho_sheets_user_idx on zoho_sheets (user_id);

create table if not exists suppressions (
  id text primary key,
  user_id text not null,
  email text not null,
  reason text not null,
  created_at timestamptz not null default now(),
  unique (user_id, email)
);
create index if not exists suppressions_user_idx on suppressions (user_id);

create table if not exists notifications (
  id text primary key,
  user_id text not null,
  title text not null,
  message text not null,
  type text not null default 'info',
  href text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id, is_read);
