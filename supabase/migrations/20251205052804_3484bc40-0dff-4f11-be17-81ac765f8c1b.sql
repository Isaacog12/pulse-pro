-- ============================================
-- 1️⃣ Conversations Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 2️⃣ Conversation Participants Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- ============================================
-- 3️⃣ Messages Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 4️⃣ Function: Check Conversation Membership
-- ============================================
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
    WHERE conversation_id = _conversation_id AND user_id = _user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_conversation_member(UUID, UUID) TO authenticated, anon;

-- ============================================
-- 5️⃣ Function: Create Private Conversation (auto-add participants)
-- ============================================
CREATE OR REPLACE FUNCTION public.create_private_conversation(_user1 UUID, _user2 UUID)
RETURNS TABLE(conversation_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conv_id UUID;
BEGIN
  INSERT INTO public.conversations (creator_id) VALUES (_user1) RETURNING id INTO conv_id;
  INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES
    (conv_id, _user1),
    (conv_id, _user2);
  RETURN QUERY SELECT conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_private_conversation(UUID, UUID) TO authenticated, anon;

-- ============================================
-- 6️⃣ Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7️⃣ RLS Policies: Conversations
-- ============================================
CREATE POLICY "Users can view conversations they are part of or created"
ON public.conversations FOR SELECT
USING (
  public.is_conversation_member(id, auth.uid()) OR creator_id = auth.uid()
);

CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can update their conversations"
ON public.conversations FOR UPDATE
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

-- ============================================
-- 8️⃣ RLS Policies: Conversation Participants
-- ============================================
CREATE POLICY "Users can view participants of their conversations"
ON public.conversation_participants FOR SELECT
USING (public.is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Users can add themselves as participants"
ON public.conversation_participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own participant row"
ON public.conversation_participants FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- 9️⃣ RLS Policies: Messages
-- ============================================
CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
USING (public.is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Users can send messages to their conversations"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND public.is_conversation_member(conversation_id, auth.uid())
);

CREATE POLICY "Users can update messages they sent"
ON public.messages FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- ============================================
-- 🔟 Realtime
-- ============================================
CREATE PUBLICATION IF NOT EXISTS supabase_realtime;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.messages;

-- ============================================
-- 11️⃣ Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
