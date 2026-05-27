-- Realtime（postgres_changes）で UPDATE イベントの新旧値を正しく配信するために
-- replica identity を full に設定する
alter table public.counters replica identity full;

-- Supabase Realtime の publication にテーブルを追加する
-- （supabase_realtime publication が存在しない場合は作成）
do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime for table public.counters;
  else
    -- 既に追加済みならエラーを無視
    begin
      alter publication supabase_realtime add table public.counters;
    exception when duplicate_object then
      null;
    end;
  end if;
end;
$$;
