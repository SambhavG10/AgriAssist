CREATE TABLE
  support_tickets (
    id UUID DEFAULT gen_random_uuid () PRIMARY KEY,
    user_id UUID REFERENCES auth.users (id),
    query TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own support tickets" ON support_tickets FOR
SELECT
  USING (auth.uid () = user_id);

CREATE POLICY "Users can create support tickets for themselves" ON support_tickets FOR INSERT
WITH
  CHECK (auth.uid () = user_id);
