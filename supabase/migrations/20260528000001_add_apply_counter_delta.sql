-- Batch delta update for counter clicks.
-- Applies positive/negative delta atomically and keeps count >= 0.
CREATE OR REPLACE FUNCTION public.apply_counter_delta(target_id UUID, target_delta INTEGER)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.counter_data
    SET count = GREATEST(count + target_delta, 0)
    WHERE id = target_id
    RETURNING count INTO new_count;

  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
