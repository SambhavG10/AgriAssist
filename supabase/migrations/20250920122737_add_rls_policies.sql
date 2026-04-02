-- This migration adds Row Level Security (RLS) policies to protect your data.
-- Users should only be able to access and manage their own data.

-- 1. RLS Policy for profiles
-- Users can see their own profile.
-- Users can update their own profile.
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- 2. RLS Policy for conversations
-- Users can see their own conversations.
-- Users can create new conversations for themselves.
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
CREATE POLICY "Users can view their own conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own conversations" ON public.conversations;
CREATE POLICY "Users can create their own conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. RLS Policy for messages
-- Users can see messages in conversations they are part of.
-- Users can create messages in conversations they are part of.
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.messages;
CREATE POLICY "Users can create messages in their conversations" ON public.messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE user_id = auth.uid()
    )
  );

-- 4. RLS Policy for escalations
-- Users can see their own escalations.
-- Experts can see escalations assigned to them or all pending escalations.
-- Admins can see all escalations.
DROP POLICY IF EXISTS "Users can view their own escalations" ON public.escalations;
CREATE POLICY "Users can view their own escalations" ON public.escalations
  FOR SELECT USING (
    (
      SELECT role FROM public.profiles WHERE user_id = auth.uid()
    ) = 'user' AND
    message_id IN (
      SELECT m.id FROM public.messages m JOIN public.conversations c ON m.conversation_id = c.id WHERE c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Experts and Admins can manage escalations" ON public.escalations;
CREATE POLICY "Experts and Admins can manage escalations" ON public.escalations
  FOR ALL USING (
    (
      SELECT role FROM public.profiles WHERE user_id = auth.uid()
    ) IN ('expert', 'admin')
  );


-- 5. RLS Policy for community_posts
-- All authenticated users can see all community posts.
-- Users can create posts for themselves.
-- Users can update their own posts.
-- Users can delete their own posts.
DROP POLICY IF EXISTS "Authenticated users can view community posts" ON public.community_posts;
CREATE POLICY "Authenticated users can view community posts" ON public.community_posts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can create their own community posts" ON public.community_posts;
CREATE POLICY "Users can create their own community posts" ON public.community_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own community posts" ON public.community_posts;
CREATE POLICY "Users can update their own community posts" ON public.community_posts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own community posts" ON public.community_posts;
CREATE POLICY "Users can delete their own community posts" ON public.community_posts
  FOR DELETE USING (auth.uid() = user_id);

-- 6. RLS Policy for community_replies
-- All authenticated users can see all replies.
-- Users can create replies for themselves.
-- Users can update their own replies.
-- Users can delete their own replies.
DROP POLICY IF EXISTS "Authenticated users can view community replies" ON public.community_replies;
CREATE POLICY "Authenticated users can view community replies" ON public.community_replies
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can create their own community replies" ON public.community_replies;
CREATE POLICY "Users can create their own community replies" ON public.community_replies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own community replies" ON public.community_replies;
CREATE POLICY "Users can update their own community replies" ON public.community_replies
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own community replies" ON public.community_replies;
CREATE POLICY "Users can delete their own community replies" ON public.community_replies
  FOR DELETE USING (auth.uid() = user_id);
