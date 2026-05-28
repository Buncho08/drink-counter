-- テキストモードの文字フチ（stroke）設定を追加
ALTER TABLE public.counter_data
    ADD COLUMN IF NOT EXISTS display_text_stroke_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.counter_data
    ADD COLUMN IF NOT EXISTS display_text_stroke_color TEXT NOT NULL DEFAULT '#000000';
