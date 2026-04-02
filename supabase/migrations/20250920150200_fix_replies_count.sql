-- Use GREATEST to prevent the count from ever going below zero
CREATE OR REPLACE FUNCTION decrement_replies_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.community_posts
    SET replies_count = GREATEST(0, replies_count - 1)
    WHERE id = OLD.post_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Recalculate the replies_count for all existing posts to correct any discrepancies
UPDATE public.community_posts p
SET replies_count = (
    SELECT COUNT(*)
    FROM public.community_replies r
    WHERE r.post_id = p.id
);
