create extension if not exists pgcrypto;

create table if not exists bank_accounts (
  id uuid primary key default gen_random_uuid(),
  bank_name text,
  account_number text not null,
  normalized_account_number text not null,
  account_holder text,
  phone_number text,
  status text not null default 'candidate',
  risk_score int not null default 0,
  source_count int not null default 0,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint bank_accounts_status_check
    check (status in (
      'candidate',
      'pending_review',
      'verified_risky',
      'rejected',
      'duplicate',
      'disputed'
    )),

  constraint bank_accounts_unique_rek
    unique (bank_name, normalized_account_number)
);

create table if not exists osint_evidence (
  id uuid primary key default gen_random_uuid(),
  bank_account_id uuid references bank_accounts(id) on delete cascade,
  source_url text not null,
  source_host text,
  title text,
  snippet text,
  extracted_text text,
  detected_accounts jsonb not null default '[]'::jsonb,
  detected_names jsonb not null default '[]'::jsonb,
  detected_phones jsonb not null default '[]'::jsonb,
  confidence_score int not null default 0,
  scrape_status text not null default 'scraped',
  created_at timestamptz not null default now()
);

create table if not exists community_reports (
  id uuid primary key default gen_random_uuid(),
  bank_account_id uuid references bank_accounts(id) on delete set null,
  reporter_name text,
  reporter_contact text,
  fraud_type text,
  chronology text,
  evidence_url text,
  status text not null default 'pending_review',
  created_at timestamptz not null default now()
);

create table if not exists moderation_logs (
  id uuid primary key default gen_random_uuid(),
  bank_account_id uuid references bank_accounts(id) on delete cascade,
  action text not null,
  note text,
  moderator_name text,
  created_at timestamptz not null default now()
);

create table if not exists evidence_files (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references community_reports(id) on delete cascade,
  file_url text not null,
  file_name text,
  file_size int,
  mime_type text,
  created_at timestamptz not null default now()
);

create index if not exists bank_accounts_status_idx on bank_accounts(status);
create index if not exists bank_accounts_last_seen_idx on bank_accounts(last_seen_at desc);
create index if not exists osint_evidence_bank_account_idx on osint_evidence(bank_account_id);
