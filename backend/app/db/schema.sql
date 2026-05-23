create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  display_name text,
  created_at timestamptz default now()
);

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

create table if not exists workspace_members (
  workspace_id uuid references workspaces(id),
  user_id uuid references users(id),
  role text,
  created_at timestamptz default now(),
  primary key (workspace_id, user_id)
);

create table if not exists oauth_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  workspace_id uuid nullable references workspaces(id),
  provider text not null,
  provider_account_id text,
  provider_tenant_id text nullable,
  provider_email text,
  display_name text,
  scopes text[],
  access_token_encrypted text,
  refresh_token_encrypted text,
  expires_at timestamptz,
  status text default 'connected',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  workspace_id uuid nullable references workspaces(id),
  agent_name text,
  input jsonb,
  output jsonb,
  status text,
  created_at timestamptz default now()
);

create table if not exists approval_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  workspace_id uuid nullable references workspaces(id),
  action_type text,
  tool_name text,
  payload jsonb,
  preview jsonb,
  status text default 'pending',
  created_at timestamptz default now(),
  approved_at timestamptz nullable,
  rejected_at timestamptz nullable,
  executed_at timestamptz nullable
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid nullable references users(id),
  workspace_id uuid nullable references workspaces(id),
  event_type text,
  metadata jsonb,
  created_at timestamptz default now()
);
