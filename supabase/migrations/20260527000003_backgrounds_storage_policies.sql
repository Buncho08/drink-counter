-- backgrounds バケットの RLS ポリシー
-- 公開バケットでも storage.objects の RLS は別途必要

-- 誰でも読み取り可能（公開 URL でのアクセス）
CREATE POLICY "Public read backgrounds"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'backgrounds');

-- 認証ユーザーはアップロード可能
CREATE POLICY "Authenticated users can upload backgrounds"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'backgrounds' AND auth.uid() IS NOT NULL);

-- 認証ユーザーは上書き可能（upsert 対応）
CREATE POLICY "Authenticated users can update backgrounds"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'backgrounds' AND auth.uid() IS NOT NULL);

-- 認証ユーザーは削除可能
CREATE POLICY "Authenticated users can delete backgrounds"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'backgrounds' AND auth.uid() IS NOT NULL);
