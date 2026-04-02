-- Create a table to store AI chat messages
CREATE TABLE
  ai_chat_messages (
    id UUID DEFAULT gen_random_uuid () PRIMARY KEY,
    user_id UUID REFERENCES auth.users (id),
    query TEXT NOT NULL,
    response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

-- Create a table to store feedback on AI responses
CREATE TABLE
  ai_feedback (
    id UUID DEFAULT gen_random_uuid () PRIMARY KEY,
    message_id UUID REFERENCES ai_chat_messages (id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users (id),
    rating TEXT NOT NULL, -- e.g., 'good', 'bad'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

-- Enable RLS
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- Policies for ai_chat_messages
CREATE POLICY "Users can view their own chat messages" ON ai_chat_messages FOR
SELECT
  USING (auth.uid () = user_id);

CREATE POLICY "Users can create chat messages" ON ai_chat_messages FOR INSERT
WITH
  CHECK (auth.uid () = user_id);

-- Policies for ai_feedback
CREATE POLICY "Users can view their own feedback" ON ai_feedback FOR
SELECT
  USING (auth.uid () = user_id);

CREATE POLICY "Users can submit feedback" ON ai_feedback FOR INSERT
WITH
  CHECK (auth.uid () = user_id);
