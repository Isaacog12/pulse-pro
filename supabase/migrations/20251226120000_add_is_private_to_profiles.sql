-- Add is_private column to profiles table for account privacy settings
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;

-- Create index for efficient querying of private accounts
CREATE INDEX IF NOT EXISTS idx_profiles_is_private ON public.profiles(is_private);

-- Add comment to document the column
COMMENT ON COLUMN public.profiles.is_private IS 'Whether the user account is private (only approved followers can see posts)';