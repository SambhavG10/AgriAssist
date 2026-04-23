import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useLogger } from "@/context/LoggerContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Leaf, LogOut, Send, ArrowLeft, Users } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { ParticipantsList } from "@/components/ParticipantsList";

type Message = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string | null;
  } | null;
};

type ChatRoomDetails = {
    name: string;
    description: string | null;
};

const ChatRoom = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<ChatRoomDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const { logAction } = useLogger();

  const fetchRoomDetailsAndMessages = async () => {
    if (!id) return;

    // Fetch room details
    const { data: roomData, error: roomError } = await (supabase as any)
      .from("chat_rooms")
      .select("name, description")
      .eq("id", id)
      .single();

    if (roomError) {
      console.error("Error fetching room details:", roomError);
      navigate("/chat-rooms");
      return;
    }
    setRoom(roomData);

    // Fetch messages
    const { data: messagesData, error: messagesError } = await supabase
      .from("chat_messages")
      .select(`
        id,
        content,
        created_at,
        user_id,
        profiles (
          full_name
        )
      `)
      .eq("room_id", id)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
    } else {
      setMessages(messagesData as any);
    }
  };

  useEffect(() => {
    if (id) {
      logAction(`Visited Chat Room: ${id}`);
    }
    const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
    }
    fetchUser();
    fetchRoomDetailsAndMessages();

    const channel = supabase
      .channel(`chat-room-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${id}`,
        },
        (payload) => {
          // Simple refetch for now. For better performance, we could append the new message.
          fetchRoomDetailsAndMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !id || !currentUser) return;

    logAction(`Sent Message in Chat Room: ${id}`);
    setIsSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      room_id: id,
      user_id: currentUser.id,
      content: newMessage,
    });

    if (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message.");
    } else {
      setNewMessage("");
    }
    setIsSending(false);
  };

  const handleSignOut = async () => {
    logAction("Signed Out from Chat Room");
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <Button variant="outline" size="icon" onClick={() => navigate('/chat-rooms')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-lg font-bold text-foreground">{room?.name || 'Loading...'}</h1>
                    <p className="text-sm text-muted-foreground">{room?.description}</p>
                </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => setIsParticipantsOpen(true)}>
                <Users className="h-4 w-4 mr-2" />
                Participants
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-end gap-2 ${
                message.user_id === currentUser?.id ? "justify-end" : ""
              }`}
            >
              {message.user_id !== currentUser?.id && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {message.profiles?.full_name?.charAt(0) || 'A'}
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-xs md:max-w-md p-3 rounded-lg ${
                  message.user_id === currentUser?.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.user_id === currentUser?.id
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                }`}>
                  {new Date(message.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Message Input */}
      <footer className="border-t border-border bg-card p-4">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <Button onClick={handleSendMessage} disabled={isSending || !newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </footer>
      {id && (
        <ParticipantsList 
            roomId={id}
            isOpen={isParticipantsOpen}
            onOpenChange={setIsParticipantsOpen}
        />
      )}
    </div>
  );
};

export default ChatRoom;
