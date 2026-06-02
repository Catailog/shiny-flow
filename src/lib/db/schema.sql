-- shiny-flow flows table
-- Supabase SQL Editor에서 실행하세요.

create table if not exists flows (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  name        text not null,
  data        jsonb not null,
  share_token text unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists flows_user_id_idx on flows (user_id);
create index if not exists flows_share_token_idx on flows (share_token);

-- updated_at 자동 갱신 트리거
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger flows_updated_at
  before update on flows
  for each row execute function set_updated_at();
