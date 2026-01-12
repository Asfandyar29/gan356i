-- Fix PUBLIC_DATA_EXPOSURE: Restrict user_stats to authenticated users only
-- Currently allows anyone to view all stats without authentication

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all stats" ON public.user_stats;

-- Create a new policy that requires authentication
CREATE POLICY "Authenticated users can view all stats" ON public.user_stats
  FOR SELECT USING (auth.uid() IS NOT NULL);