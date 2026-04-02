-- Add RLS policies to allow read access to knowledge base tables

-- Enable RLS for the tables if not already enabled
ALTER TABLE public.knowledge_base_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, to ensure a clean slate
DROP POLICY IF EXISTS "Allow read access to all users" ON public.knowledge_base_articles;
DROP POLICY IF EXISTS "Allow read access to all users" ON public.faqs;

-- Create new policies to allow authenticated users to read
CREATE POLICY "Allow read access to all users"
ON public.knowledge_base_articles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow read access to all users"
ON public.faqs
FOR SELECT
TO authenticated
USING (true);
