-- counter_data に display_mode カラムを追加
-- 値: 'count' | 'image1' | 'image2' | 'image3'
ALTER TABLE public.counter_data
    ADD COLUMN IF NOT EXISTS display_mode TEXT NOT NULL DEFAULT 'count'
        CHECK (display_mode IN ('count', 'image1', 'image2', 'image3'));

-- backgrounds ストレージバケットを作成（公開）
INSERT INTO storage.buckets (id, name, public)
VALUES ('backgrounds', 'backgrounds', true)
ON CONFLICT (id) DO UPDATE SET public = true;


