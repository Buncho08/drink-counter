CREATE OR REPLACE FUNCTION reset_counter(uid uuid)
RETURNS void AS $$
  UPDATE counters
  SET value = 0, updated_at = now()
  WHERE user_id = uid AND name = 'default';
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION set_counter(uid uuid, new_value integer)
RETURNS void AS $$
  UPDATE counters
  SET value = GREATEST(new_value, 0), updated_at = now()
  WHERE user_id = uid AND name = 'default';
$$ LANGUAGE sql;
