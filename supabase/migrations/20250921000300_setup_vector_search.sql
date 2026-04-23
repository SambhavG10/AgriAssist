-- Enable the pgvector extension and add embedding columns in a single transaction
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Add embedding columns, checking if they exist to prevent errors on re-runs
ALTER TABLE public.knowledge_base_articles ADD COLUMN IF NOT EXISTS embedding extensions.vector(1536);
ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS embedding extensions.vector(1536);
