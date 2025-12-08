-- ============================================
-- 1️⃣ Tables Setup
-- ============================================

-- A. Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, 
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- B. Participants Table (Links Users to Conversations)
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id) -- Prevents user being added twice to same chat
);

-- C. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 2️⃣ Row Level Security (RLS) - The Logic Fixes
-- ============================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- --> POLICIES: Conversations
CREATE POLICY "Users can view their conversations"
ON public.conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() = creator_id);

-- --> POLICIES: Participants (Fixed to prevent recursion)
CREATE POLICY "Users can view participants in their chats"
ON public.conversation_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants myself
    WHERE myself.conversation_id = conversation_id
    AND myself.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add participants"
ON public.conversation_participants FOR INSERT
WITH CHECK (
  -- I can add myself OR I can add others if I created the conversation
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = conversation_id 
    AND creator_id = auth.uid()
  )
);

-- --> POLICIES: Messages
CREATE POLICY "Users can view messages in their chats"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_id
    AND cp.user_id = auth.uid()
  )
);

-- ============================================
-- 3️⃣ Performance Indexes (Crucial for Speed)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_conv ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- ============================================
-- 4️⃣ Realtime Setup (Listen for new messages)
-- ============================================
-- Determine if publication exists, if not create it, then add table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============================================
-- 5️⃣ Helper Function: Start Chat (Prevents Duplicates)
-- ============================================
CREATE OR REPLACE FUNCTION public.create_private_conversation(_user2 UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_conv_id UUID;
  new_conv_id UUID;
BEGIN
  -- Check if a conversation already exists between auth.uid() and _user2
  SELECT c.id INTO existing_conv_id
  FROM public.conversations c
  JOIN public.conversation_participants cp1 ON c.id = cp1.conversation_id
  JOIN public.conversation_participants cp2 ON c.id = cp2.conversation_id
  WHERE cp1.user_id = auth.uid() 
  AND cp2.user_id = _user2
  LIMIT 1;

  -- If it exists, return that ID
  IF existing_conv_id IS NOT NULL THEN
    RETURN existing_conv_id;
  END IF;

  -- Otherwise, create a new one
  INSERT INTO public.conversations (creator_id) 
  VALUES (auth.uid()) 
  RETURNING id INTO new_conv_id;

  -- Add both users as participants
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES 
    (new_conv_id, auth.uid()), 
    (new_conv_id, _user2);

  RETURN new_conv_id;
END;
$$;