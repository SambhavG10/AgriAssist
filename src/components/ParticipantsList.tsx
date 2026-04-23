import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { User } from "lucide-react";

interface Participant {
  profiles: {
    user_id: string;
    full_name: string | null;
  } | null;
}

interface ParticipantsListProps {
  roomId: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const ParticipantsList = ({
  roomId,
  isOpen,
  onOpenChange,
}: ParticipantsListProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchParticipants = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from("chat_room_participants")
          .select(`
            user_id,
            profiles:user_id (
              user_id,
              full_name
            )
          `)
          .eq("room_id", roomId);

        if (error) {
          console.error("Error fetching participants:", error);
          setParticipants([]);
        } else {
          setParticipants(data || []);
        }
        setLoading(false);
      };

      fetchParticipants();
    }
  }, [isOpen, roomId]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Room Participants</SheetTitle>
          <SheetDescription>
            Users currently in this chat room.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 space-y-4">
          {loading ? (
            <p>Loading...</p>
          ) : (
            participants.map((p, index) => (
              <div key={p.profiles?.user_id || index} className="flex items-center space-x-3">
                <Avatar>
                  <AvatarFallback>
                    {p.profiles?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span>{p.profiles?.full_name || 'Anonymous User'}</span>
              </div>
            ))
          )}
           {!loading && participants.length === 0 && (
            <div className="text-center text-muted-foreground pt-8">
                <User className="mx-auto h-12 w-12" />
                <p className="mt-4">No participants found.</p>
            </div>
           )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
