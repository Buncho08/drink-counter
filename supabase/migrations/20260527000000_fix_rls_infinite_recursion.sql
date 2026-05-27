-- Fix: event_permissions の RLS ポリシーが自テーブルを再帰参照して infinite recursion を起こす問題を修正
-- 解決策: event_permissions の ALL/SELECT ポリシーを events.owner_id で判定するよう変更

-- event_permissions の再帰参照ポリシーを削除して再作成
DROP POLICY IF EXISTS "Users can view permissions for their events" ON public.event_permissions;
DROP POLICY IF EXISTS "Event owners can manage permissions" ON public.event_permissions;

-- SELECT: 自分のレコードか、events.owner_id が自分のイベントのレコードを閲覧可能
CREATE POLICY "Users can view permissions for their events"
  ON public.event_permissions FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_permissions.event_id
        AND events.owner_id = auth.uid()
    )
  );

-- ALL (INSERT/UPDATE/DELETE): events.owner_id が自分のイベントのみ操作可能
CREATE POLICY "Event owners can manage permissions"
  ON public.event_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_permissions.event_id
        AND events.owner_id = auth.uid()
    )
  );
