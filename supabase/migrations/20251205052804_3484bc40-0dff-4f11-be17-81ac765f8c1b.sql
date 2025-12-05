-- =========================================
-- 1️⃣ Conversations Table
-- =========================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =========================================
-- 2️⃣ Conversation Participants Table
-- =========================================
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- =========================================
-- 3️⃣ Messages Table
-- =========================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =========================================
-- 4️⃣ Enable Row Level Security
-- =========================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 5️⃣ Function to check membership
-- =========================================
CREATE OR REPLACE FUNCTION public.is_conversation_member(_conversation_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  );
$$;

-- Allow auth roles to use it
GRANT EXECUTE ON FUNCTION public.is_conversation_member(UUID, UUID) TO authenticated, anon;

-- =========================================
-- 6️⃣ RLS Policies
-- =========================================

-- Conversations
CREATE POLICY IF NOT EXISTS "Users can view conversations"
ON public.conversations FOR SELECT
USING (public.is_conversation_member(id, auth.uid()));

CREATE POLICY IF NOT EXISTS "Users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (creator_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Creators can update conversations"
ON public.conversations FOR UPDATE
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

-- Conversation Participants
CREATE POLICY IF NOT EXISTS "Users can view participants"
ON public.conversation_participants FOR SELECT
USING (public.is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY IF NOT EXISTS "Users can add themselves as participants"
ON public.conversation_participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can leave conversation"
ON public.conversation_participants FOR DELETE
USING (auth.uid() = user_id);

-- Messages
CREATE POLICY IF NOT EXISTS "Users can view messages"
ON public.messages FOR SELECT
USING (public.is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY IF NOT EXISTS "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_conversation_member(conversation_id, auth.uid())
);

CREATE POLICY IF NOT EXISTS "Users can update messages"
ON public.messages FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY IF NOT EXISTS "Users can delete messages"
ON public.messages FOR DELETE
USING (auth.uid() = sender_id);

-- =========================================
-- 7️⃣ Realtime Publication
-- =========================================
CREATE PUBLICATION IF NOT EXISTS supabase_realtime;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.messages;

-- =========================================
-- 8️⃣ Indexes for performance
-- =========================================
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
