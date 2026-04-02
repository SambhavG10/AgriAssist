import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Leaf,
  LogOut,
  Heart,
  MessageCircle,
  Send,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { Post } from "./Community"; // Assuming Post type is exported from Community.tsx
import { User } from "@supabase/supabase-js";
import { useLogger } from "@/context/LoggerContext";

type Reply = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string | null;
  } | null;
};

const PostDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReply, setNewReply] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isLikeProcessing, setIsLikeProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { logAction } = useLogger();

  const fetchPostAndReplies = async () => {
    if (!id) return;

    // 1. Fetch the main post
    const { data: postData, error: postError } = await supabase
      .from("community_posts")
      .select(`*`)
      .eq("id", id)
      .single();

    if (postError) {
      console.error("Error fetching post:", postError);
      setPost(null); // Clear post on error
      return;
    }

    // 2. Fetch the profile for the post author
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, location")
      .eq("user_id", postData.user_id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
    }

    // 3. Combine post and profile
    setPost({ ...postData, profiles: profileData || null } as Post);

    // Check like status
    const { data: { user } } = await supabase.auth.getUser();
    if (user && id) {
        const { data: likeData, error: likeError } = await supabase
            .from('community_likes')
            .select('post_id')
            .eq('post_id', id)
            .eq('user_id', user.id)
            .single();

        if (likeError && likeError.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error("Error checking like status:", likeError);
        } else {
            setIsLiked(!!likeData);
        }
    }


    // 4. Fetch replies for the post
    const { data: repliesData, error: repliesError } = await supabase
      .from("community_replies")
      .select(`*`)
      .eq("post_id", id)
      .order("created_at", { ascending: true });

    if (repliesError) {
      console.error("Error fetching replies:", repliesError);
      setReplies([]);
      return;
    }

    if (repliesData && repliesData.length > 0) {
        // 5. Fetch profiles for all repliers
        const userIds = repliesData.map(reply => reply.user_id);
        const { data: replierProfilesData, error: replierProfilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        if (replierProfilesError) {
          console.error('Error fetching replier profiles:', replierProfilesError);
          // If profiles fail, show replies without author names
          setReplies(repliesData.map(r => ({ ...r, profiles: null })));
          return;
        }

        // 6. Combine replies with their profiles
        const profilesMap = new Map(replierProfilesData.map(p => [p.user_id, p]));
        const combinedReplies = repliesData.map(reply => ({
          ...reply,
          profiles: profilesMap.get(reply.user_id) || null
        }));
        setReplies(combinedReplies as Reply[]);
    } else {
        setReplies([]);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
    }
    fetchUser();
    fetchPostAndReplies();
    if (id) {
      logAction(`Viewing Post Details: ${id}`);
    }

    const channel = supabase
      .channel(`post-details-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_replies',
          filter: `post_id=eq.${id}`,
        },
        (payload) => {
          console.log('New reply received!', payload);
          // Refetch all replies to keep it simple, or append the new one
          fetchPostAndReplies(); 
        }
      )
      .subscribe();

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const toggleLike = async () => {
    if (isLikeProcessing || !post || !currentUser) return;

    setIsLikeProcessing(true);
    logAction(isLiked ? "Unliking Post..." : "Liking Post...");

    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const { data, error } = await supabase.rpc('toggle_like', {
        post_id_param: post.id,
        user_id_param: currentUser.id,
      });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const newLikesCount = data[0].new_likes_count;
        setPost(prev => prev ? { ...prev, likes_count: newLikesCount } : null);
        setIsLiked(!isLiked); // Toggle the liked state locally
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Optionally, show a toast to the user
    } finally {
      setIsLikeProcessing(false);
    }
  };

  const handleSignOut = async () => {
    logAction("Signing Out...");
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleDeleteReply = async (replyId: string) => {
    const confirmation = window.confirm("Are you sure you want to delete this reply?");
    if (!confirmation) {
        return;
    }

    const { error } = await supabase
        .from('community_replies')
        .delete()
        .eq('id', replyId);

    if (error) {
        console.error("Error deleting reply:", error);
        alert("Failed to delete reply.");
    } else {
        // Refetch everything to update counts and lists
        fetchPostAndReplies();
    }
  };

  const handleReplySubmit = async () => {
    if (!newReply.trim() || !id) return;

    setIsSubmitting(true);
    logAction("Posting Reply...");
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("User not logged in");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from("community_replies").insert([
      {
        content: newReply,
        post_id: id,
        user_id: user.id,
      },
    ]);

    if (error) {
      console.error("Error posting reply:", error);
    } else {
      setNewReply("");
      // Refresh replies
      fetchPostAndReplies();
    }
    setIsSubmitting(false);
  };

  if (!post) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading post...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <Leaf className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-foreground">
                AgriAssist
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/community")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Forum
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Post Header */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">{post.title}</CardTitle>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground pt-2">
              <span className="font-medium text-foreground">
                {post.profiles?.full_name || "Anonymous"}
              </span>
              <span>• {post.profiles?.location?.city || "Unknown Location"}</span>
              <span>• {new Date(post.created_at).toLocaleString()}</span>
            </div>
            {post.crop_type && (
              <div className="pt-2">
                <Badge variant="secondary">#{post.crop_type}</Badge>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{post.content}</p>
            <div className="flex items-center space-x-4 mt-4 pt-4 border-t">
              <Button variant="ghost" size="sm" onClick={toggleLike} disabled={isLikeProcessing}>
                <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} /> {post.likes_count} Likes
              </Button>
              <Button variant="ghost" size="sm">
                <MessageCircle className="h-4 w-4 mr-2" /> {post.replies_count}{" "}
                Replies
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Replies Section */}
        <h2 className="text-xl font-semibold mb-4">Replies</h2>
        <div className="space-y-4 mb-8">
          {replies.map((reply) => (
            <Card key={reply.id}>
              <CardContent className="p-4 flex items-start space-x-4">
                <Avatar>
                  <AvatarFallback>
                    {reply.profiles?.full_name?.charAt(0) || "A"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {reply.profiles?.full_name || "Anonymous"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(reply.created_at).toLocaleString()
                      }
                    </span>
                  </div>
                  <p className="text-sm mt-1">{reply.content}</p>
                </div>
                {currentUser && currentUser.id === reply.user_id && (
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteReply(reply.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                )}
              </CardContent>
            </Card>
          ))}
          {replies.length === 0 && (
            <p className="text-muted-foreground text-center">
              No replies yet. Be the first to respond!
            </p>
          )}
        </div>

        {/* Add Reply */}
        <Card>
          <CardHeader>
            <CardTitle>Post a Reply</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid w-full gap-2">
              <Textarea
                placeholder="Type your reply here."
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
              />
              <Button onClick={handleReplySubmit} disabled={isSubmitting}>
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? "Posting..." : "Post Reply"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PostDetails;
