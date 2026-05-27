-- Realtime認可用: SELECT ポリシーを明示的に追加
-- (FOR ALL ポリシーだけではSupabase CloudのRealtime認可が通らないことがある)
CREATE POLICY "realtime_select" ON public.counters
  FOR SELECT
  USING (auth.uid() = user_id);

-- Replica Identity が full であることを保証
ALTER TABLE public.counters REPLICA IDENTITY FULL;
