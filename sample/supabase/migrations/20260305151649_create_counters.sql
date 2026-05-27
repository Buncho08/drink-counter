create table if not exists public.counters (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  name        text not null default 'default',
  value       integer not null default 0,
  updated_at  timestamptz not null default now()
);

alter table public.counters enable row level security;

create policy "own data only" on public.counters
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.handle_new_user_create_counter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.counters (user_id, name, value)
  values (new.id, 'default', 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_counter on auth.users;

create trigger on_auth_user_created_create_counter
after insert on auth.users
for each row execute function public.handle_new_user_create_counter();

create or replace function public.increment_my_counter(delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_value integer;
begin
  update public.counters
     set value = value + delta,
         updated_at = now()
   where user_id = auth.uid()
   returning value into new_value;

  if not found then
    raise exception 'counter row not found for user %', auth.uid();
  end if;

  return new_value;
end;
$$;

grant execute on function public.increment_my_counter(integer) to authenticated;