-- This migration ensures the vector extension is enabled and the embedding columns exist.

-- 1. Enable the vector extension if it's not already enabled.
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 2. Add the 'embedding' column to 'knowledge_base_articles' if it doesn't exist.
-- The vector size (1536) is specific to OpenAI's text-embedding-ada-002 model.
ALTER TABLE public.knowledge_base_articles ADD COLUMN IF NOT EXISTS embedding extensions.vector(1536);

-- 3. Add the 'embedding' column to 'faqs' if it doesn't exist.
ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS embedding extensions.vector(1536);
