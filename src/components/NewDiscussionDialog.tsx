import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useLogger } from "@/context/LoggerContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NewDiscussionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated: () => void;
}

export const NewDiscussionDialog = ({ open, onOpenChange, onPostCreated }: NewDiscussionDialogProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [cropType, setCropType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { logAction } = useLogger();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    logAction(`Creating New Discussion: ${title}`);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("User not logged in");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from("community_posts")
      .insert([{ 
        title, 
        content, 
        crop_type: cropType,
        user_id: user.id 
    }]);

    if (error) {
      console.error("Error creating post:", error);
    } else {
      logAction(`New Discussion Created Successfully: ${title}`);
      onPostCreated();
      onOpenChange(false);
      setTitle("");
      setContent("");
      setCropType("");
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start a New Discussion</DialogTitle>
          <DialogDescription>
            Share your knowledge or ask a question to the community.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
              placeholder="A clear and concise title"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="content" className="text-right">
              Content
            </Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="col-span-3"
              placeholder="Describe your topic in detail."
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cropType" className="text-right">
              Crop Tag
            </Label>
            <Input
              id="cropType"
              value={cropType}
              onChange={(e) => setCropType(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Rice, Banana (optional)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Posting..." : "Post Discussion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
