-- テキストモードの文字サイズと文字色を保持するカラムを追加
ALTER TABLE public.counter_data
    ADD COLUMN IF NOT EXISTS display_text_size INTEGER NOT NULL DEFAULT 120;

ALTER TABLE public.counter_data
    ADD COLUMN IF NOT EXISTS display_text_color TEXT NOT NULL DEFAULT '#EAB308';
