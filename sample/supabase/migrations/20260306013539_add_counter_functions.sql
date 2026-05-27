create or replace function increment_counter(uid uuid)
returns void as $$
  update counters
  set value = value + 1, updated_at = now()
  where user_id = uid and name = 'default';
$$ language sql;

create or replace function decrement_counter(uid uuid)
returns void as $$
  update counters
  set value = greatest(value - 1, 0), updated_at = now()
  where user_id = uid and name = 'default';
$$ language sql;