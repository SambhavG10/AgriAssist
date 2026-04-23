import { useState } from "react";
import { useLogger } from "@/context/LoggerContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";

interface CreateChatRoomDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onRoomCreated: () => void;
}

export const CreateChatRoomDialog = ({
  isOpen,
  onOpenChange,
  onRoomCreated,
}: CreateChatRoomDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { logAction } = useLogger();

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert("Room name is required.");
      return;
    }

    setIsSubmitting(true);
    logAction(`Creating Chat Room: ${name}`);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in to create a room.");
      setIsSubmitting(false);
      return;
    }

    // 1. Create the new chat room
    const { data: roomData, error: roomError } = await supabase
      .from("chat_rooms")
      .insert({
        name,
        description,
        category,
        created_by: user.id,
      })
      .select()
      .single();

    if (roomError || !roomData) {
      console.error("Error creating room:", roomError);
      alert("Failed to create room. Please try again.");
      setIsSubmitting(false);
      return;
    }

    // 2. Add the creator as a participant
    const { error: participantError } = await supabase
      .from("chat_room_participants")
      .insert({
        room_id: roomData.id,
        user_id: user.id,
      });

    if (participantError) {
        // If this fails, we should ideally roll back the room creation,
        // but for now, we'll just log the error.
        console.error("Error adding creator to participants:", participantError);
    }


    setIsSubmitting(false);
    onOpenChange(false);
    onRoomCreated(); // This will trigger a refresh on the main page
    logAction(`Chat Room Created Successfully: ${name}`);
    
    // Reset form
    setName("");
    setDescription("");
    setCategory("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a New Chat Room</DialogTitle>
          <DialogDescription>
            Start a new conversation by creating a room. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Room Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Organic Farming Tips"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              placeholder="A brief description of the room's topic"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Category
            </Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Crops, Technology"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <Plus className="mr-2 h-4 w-4" />
            {isSubmitting ? "Creating..." : "Create Room"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
