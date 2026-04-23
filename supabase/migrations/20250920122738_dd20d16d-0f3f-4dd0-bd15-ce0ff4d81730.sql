-- Fix security issues from linter warnings

-- 1. Fix function search path mutable issue by updating functions with proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Fix the vector similarity search function
CREATE OR REPLACE FUNCTION match_knowledge_base(
  query_embedding extensions.vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  source text,
  content text,
  similarity float
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions
AS $$
  SELECT
    knowledge_base.id,
    knowledge_base.source,
    knowledge_base.content,
    1 - (knowledge_base.embedding <=> query_embedding) AS similarity
  FROM knowledge_base
  WHERE 1 - (knowledge_base.embedding <=> query_embedding) > match_threshold
  ORDER BY knowledge_base.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 3. Move vector extension to extensions schema (proper location)
-- First drop from public if it exists there
DROP EXTENSION IF EXISTS vector CASCADE;

-- Create in the extensions schema where it should be
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Recreate the knowledge_base table with proper vector type reference
DROP TABLE IF EXISTS public.knowledge_base CASCADE;

CREATE TABLE public.knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding extensions.vector(1536), -- Reference vector from extensions schema
  metadata JSONB, -- Additional context like crop type, region, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on knowledge_base (readable by all authenticated users)
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- Recreate the RLS policy for knowledge_base
CREATE POLICY "Authenticated users can view knowledge base" 
ON public.knowledge_base 
FOR SELECT 
TO authenticated 
USING (true);

-- Recreate the vector similarity search function with proper vector type reference
CREATE OR REPLACE FUNCTION match_knowledge_base(
  query_embedding extensions.vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  source text,
  content text,
  similarity float
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions
AS $$
  SELECT
    knowledge_base.id,
    knowledge_base.source,
    knowledge_base.content,
    1 - (knowledge_base.embedding <=> query_embedding) AS similarity
  FROM knowledge_base
  WHERE 1 - (knowledge_base.embedding <=> query_embedding) > match_threshold
  ORDER BY knowledge_base.embedding <=> query_embedding
  LIMIT match_count;
$$;