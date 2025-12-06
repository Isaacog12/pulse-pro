-- Add last_seen column to profiles for online/offline status
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_seen timestamp with time zone DEFAULT now();

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles(last_seen);