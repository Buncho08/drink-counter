-- Performance tweak: disable counter history writes for faster increment/decrement.
-- Re-enable later by recreating `on_counter_updated` trigger if history becomes necessary.
DROP TRIGGER IF EXISTS on_counter_updated ON public.counter_data;
