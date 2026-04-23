create table if not exists webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null,
  public_key text not null,
  counter bigint not null default 0,
  transports text[],
  created_at timestamptz default now()
);

create unique index if not exists webauthn_credentials_credential_id_idx
on webauthn_credentials (credential_id);
