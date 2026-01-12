-- Fix PUBLIC_DATA_EXPOSURE: Restrict profiles to authenticated users only
-- Currently allows anyone (including unauthenticated users) to view all profiles

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a new policy that requires authentication to view profiles
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);