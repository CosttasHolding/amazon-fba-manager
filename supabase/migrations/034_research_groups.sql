create table if not exists research_groups (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  niche text,
  amazon_category text,
  search_keyword text,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists research_groups_org_idx on research_groups(org_id, deleted_at);
create index if not exists research_groups_deleted_idx on research_groups(deleted_at);

create or replace function trg_research_groups_updated() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tr_research_groups_updated on research_groups;
create trigger tr_research_groups_updated before update on research_groups
  for each row execute function trg_research_groups_updated();

alter table product_research
  add column if not exists group_id uuid references research_groups(id) on delete cascade,
  add column if not exists deleted_at timestamptz;

create index if not exists product_research_group_idx on product_research(group_id);
create index if not exists product_research_deleted_idx on product_research(deleted_at);

alter table product_research enable row level security;
alter table research_groups enable row level security;

drop policy if exists "org select research_groups" on research_groups;
create policy "org select research_groups" on research_groups
  for select using (org_id = (select current_setting('app.org_id', true)::uuid) or org_id in (select org_id from org_members where user_id = auth.uid()));

drop policy if exists "org insert research_groups" on research_groups;
create policy "org insert research_groups" on research_groups
  for insert with check (org_id = (select current_setting('app.org_id', true)::uuid) or org_id in (select org_id from org_members where user_id = auth.uid()));

drop policy if exists "org update research_groups" on research_groups;
create policy "org update research_groups" on research_groups
  for update using (org_id = (select current_setting('app.org_id', true)::uuid) or org_id in (select org_id from org_members where user_id = auth.uid()))
  with check (org_id = (select current_setting('app.org_id', true)::uuid) or org_id in (select org_id from org_members where user_id = auth.uid()));

drop policy if exists "org delete research_groups" on research_groups;
create policy "org delete research_groups" on research_groups
  for delete using (org_id = (select current_setting('app.org_id', true)::uuid) or org_id in (select org_id from org_members where user_id = auth.uid()));