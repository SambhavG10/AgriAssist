-- Grant read access to anon role for knowledge base tables

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow read access to all users" ON public.knowledge_base_articles;
DROP POLICY IF EXISTS "Allow read access to all users" ON public.faqs;

-- Create new policies to allow both authenticated and anonymous users to read
CREATE POLICY "Allow read access to all users"
ON public.knowledge_base_articles
FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Allow read access to all users"
ON public.faqs
FOR SELECT
TO authenticated, anon
USING (true);
