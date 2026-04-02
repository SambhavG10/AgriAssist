-- Create chat_rooms table
CREATE TABLE IF NOT EXISTS public.chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create chat_room_participants table
CREATE TABLE IF NOT EXISTS public.chat_room_participants (
    room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for the new tables
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for chat_rooms
CREATE POLICY "Users can view all chat rooms"
ON public.chat_rooms
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create chat rooms"
ON public.chat_rooms
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Policies for chat_room_participants
CREATE POLICY "Users can view all participants"
ON public.chat_room_participants
FOR SELECT
USING (true);

CREATE POLICY "Users can join and leave chat rooms"
ON public.chat_room_participants
FOR ALL
USING (auth.uid() = user_id);

-- Policies for chat_messages
CREATE POLICY "Users can view messages in rooms they are part of"
ON public.chat_messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.chat_room_participants
        WHERE chat_room_participants.room_id = chat_messages.room_id
        AND chat_room_participants.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert messages in rooms they are part of"
ON public.chat_messages
FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1
        FROM public.chat_room_participants
        WHERE chat_room_participants.room_id = chat_messages.room_id
        AND chat_room_participants.user_id = auth.uid()
    )
);
