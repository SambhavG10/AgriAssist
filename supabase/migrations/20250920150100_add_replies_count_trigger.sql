-- Create a function to increment the replies_count on the community_posts table
CREATE OR REPLACE FUNCTION increment_replies_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.community_posts
    SET replies_count = replies_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to decrement the replies_count on the community_posts table
CREATE OR REPLACE FUNCTION decrement_replies_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.community_posts
    SET replies_count = replies_count - 1
    WHERE id = OLD.post_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the increment function when a new reply is inserted
DROP TRIGGER IF EXISTS on_reply_insert ON community_replies;
CREATE TRIGGER on_reply_insert
AFTER INSERT ON public.community_replies
FOR EACH ROW
EXECUTE FUNCTION increment_replies_count();

-- Create a trigger to call the decrement function when a reply is deleted
DROP TRIGGER IF EXISTS on_reply_delete ON community_replies;
CREATE TRIGGER on_reply_delete
AFTER DELETE ON public.community_replies
FOR EACH ROW
EXECUTE FUNCTION decrement_replies_count();
