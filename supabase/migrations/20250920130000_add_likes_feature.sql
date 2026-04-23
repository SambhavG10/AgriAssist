-- Create the table to store likes
CREATE TABLE IF NOT EXISTS community_post_likes (
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

-- Create a function to increment the likes_count on the community_posts table
CREATE OR REPLACE FUNCTION increment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.community_posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to decrement the likes_count on the community_posts table
CREATE OR REPLACE FUNCTION decrement_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.community_posts
    SET likes_count = likes_count - 1
    WHERE id = OLD.post_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the increment function when a new like is inserted
DROP TRIGGER IF EXISTS on_like_insert ON community_post_likes;
CREATE TRIGGER on_like_insert
AFTER INSERT ON public.community_post_likes
FOR EACH ROW
EXECUTE FUNCTION increment_likes_count();

-- Create a trigger to call the decrement function when a like is deleted
DROP TRIGGER IF EXISTS on_like_delete ON community_post_likes;
CREATE TRIGGER on_like_delete
AFTER DELETE ON public.community_post_likes
FOR EACH ROW
EXECUTE FUNCTION decrement_likes_count();

-- Enable RLS for the new table
ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;

-- Policies for community_post_likes
DROP POLICY IF EXISTS "Users can view all likes" ON public.community_post_likes;
CREATE POLICY "Users can view all likes"
ON public.community_post_likes
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can insert their own likes" ON public.community_post_likes;
CREATE POLICY "Users can insert their own likes"
ON public.community_post_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own likes" ON public.community_post_likes;
CREATE POLICY "Users can delete their own likes"
ON public.community_post_likes
FOR DELETE
USING (auth.uid() = user_id);
