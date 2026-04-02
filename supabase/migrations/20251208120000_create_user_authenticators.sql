-- Create a table to store WebAuthn authenticators
CREATE TABLE IF NOT EXISTS public.user_authenticators (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    credential_public_key TEXT NOT NULL,
    counter BIGINT NOT NULL DEFAULT 0,
    transports TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_authenticators ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can see their own authenticators
CREATE POLICY "Users can view own authenticators" ON public.user_authenticators
    FOR SELECT USING (auth.uid() = user_id);

-- Users can delete their own authenticators
CREATE POLICY "Users can delete own authenticators" ON public.user_authenticators
    FOR DELETE USING (auth.uid() = user_id);

-- Only the service role (backend) can insert/update (for security, we usually handle this via API, 
-- but for simplicity with Supabase client, we can allow insert if user matches)
CREATE POLICY "Users can insert own authenticators" ON public.user_authenticators
    FOR INSERT WITH CHECK (auth.uid() = user_id);
