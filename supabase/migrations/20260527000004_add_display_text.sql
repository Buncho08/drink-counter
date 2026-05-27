-- display_mode の CHECK 制約に 'text' を追加
-- PostgreSQL はインラインの無名 CHECK 制約を counter_data_display_mode_check という名前で生成する
ALTER TABLE public.counter_data
    DROP CONSTRAINT IF EXISTS counter_data_display_mode_check;

ALTER TABLE public.counter_data
    ADD CONSTRAINT counter_data_display_mode_check
        CHECK (display_mode IN ('count', 'image1', 'image2', 'image3', 'text'));

-- モニターに表示するフリーテキストを保持するカラムを追加
ALTER TABLE public.counter_data
    ADD COLUMN IF NOT EXISTS display_text TEXT NOT NULL DEFAULT '';
