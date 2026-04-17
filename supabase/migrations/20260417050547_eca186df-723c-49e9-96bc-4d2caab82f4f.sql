-- Persistent cache for external API responses
CREATE TABLE IF NOT EXISTS public.api_cache (
  cache_key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_cache_expires_at ON public.api_cache (expires_at);

ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read cache (the data is non-sensitive public football data)
CREATE POLICY "Anyone can read api_cache"
  ON public.api_cache
  FOR SELECT
  USING (true);

-- Only service role writes (edge function uses service role)
-- No INSERT/UPDATE/DELETE policy = blocked for anon/authenticated, allowed for service_role