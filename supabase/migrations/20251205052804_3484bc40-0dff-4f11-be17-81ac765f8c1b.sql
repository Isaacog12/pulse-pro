-- Create conversations table (creator_id required)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversation participants table
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check conversation membership
CREATE OR REPLACE FUNCTION public.is_conversation_member(_conversation_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = _conversation_id AND user_id = _user_id
  );
$$;

-- Allow authenticated/anon roles to execute the function (needed for RLS)
GRANT EXECUTE ON FUNCTION public.is_conversation_member(UUID, UUID) TO authenticated, anon;

-- RLS policies for conversations
-- Creator or members can SELECT
CREATE POLICY "Users can view conversations they are part of or created"
ON public.conversations FOR SELECT
USING (
  public.is_conversation_member(id, auth.uid())
  OR creator_id = auth.uid()
);

-- Only authenticated users can INSERT conversations and must set creator_id = auth.uid()
CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (creator_id = auth.uid());

-- Optionally allow the creator to UPDATE (e.g., updated_at) if they are creator
CREATE POLICY "Creators can update their conversations"
ON public.conversations FOR UPDATE
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

-- RLS policies for conversation_participants
-- Members can SELECT participants
CREATE POLICY "Users can view participants of their conversations"
ON public.conversation_participants FOR SELECT
USING (public.is_conversation_member(conversation_id, auth.uid()));

-- Users can insert participants only for themselves (so you can add yourself to a conversation)
CREATE POLICY "Users can add themselves as participants"
ON public.conversation_participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own participant row (leave conversation)
CREATE POLICY "Users can delete their own participant row"
ON public.conversation_participants FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for messages
-- Members can SELECT messages in the conversation
CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
USING (public.is_conversation_member(conversation_id, auth.uid()));

-- Users can INSERT messages only when they are the sender and a member of the conversation
CREATE POLICY "Users can send messages to their conversations"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_conversation_member(conversation_id, auth.uid())
);

-- Users can UPDATE messages only if they are the sender (e.g., edit content)
CREATE POLICY "Users can update messages they sent"
ON public.messages FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- Ensure realtime publication exists, then add messages table
CREATE PUBLICATION IF NOT EXISTS supabase_realtime;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.messages;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
