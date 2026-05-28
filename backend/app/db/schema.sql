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
  workspace_id uuid references workspaces(id),
  provider text not null,
  provider_account_id text,
  provider_tenant_id text,
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
  workspace_id uuid references workspaces(id),
  agent_name text,
  input jsonb,
  output jsonb,
  status text,
  created_at timestamptz default now()
);

create table if not exists approval_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  workspace_id uuid references workspaces(id),
  action_type text,
  tool_name text,
  payload jsonb,
  preview jsonb,
  status text default 'pending',
  created_at timestamptz default now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  executed_at timestamptz
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  workspace_id uuid references workspaces(id),
  event_type text,
  metadata jsonb,
  created_at timestamptz default now()
);

create table if not exists knowledge_nodes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id),
  user_id uuid references users(id),

  external_id text,
  type text not null,
  label text not null,
  source text not null,

  title text,
  subtitle text,
  priority text,
  status text,

  metadata jsonb default '{}'::jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists knowledge_edges (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id),
  user_id uuid references users(id),

  source_node_id uuid not null,
  target_node_id uuid not null,

  type text not null,
  label text,
  weight float default 1.0,
  source_system text not null,

  metadata jsonb default '{}'::jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists knowledge_entity_aliases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id),

  canonical_node_id uuid not null,
  alias text not null,
  alias_type text,

  created_at timestamptz default now()
);
