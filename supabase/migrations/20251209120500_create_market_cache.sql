CREATE TABLE IF NOT EXISTS public.market_prices_cache (
    id INTEGER PRIMARY KEY DEFAULT 1,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE public.market_prices_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.market_prices_cache
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated update" ON public.market_prices_cache
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert" ON public.market_prices_cache
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Insert initial row if not exists
INSERT INTO public.market_prices_cache (id, data, updated_at)
VALUES (1, '[]'::jsonb, '2000-01-01 00:00:00+00')
ON CONFLICT (id) DO NOTHING;
