-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create solve_history table
CREATE TABLE public.solve_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  solve_time_ms INTEGER NOT NULL,
  scramble TEXT NOT NULL,
  moves TEXT,
  move_count INTEGER,
  tps DECIMAL(5,2),
  solved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_dnf BOOLEAN DEFAULT false,
  is_plus_two BOOLEAN DEFAULT false,
  notes TEXT
);

-- Enable RLS on solve_history
ALTER TABLE public.solve_history ENABLE ROW LEVEL SECURITY;

-- Solve history policies
CREATE POLICY "Users can view own solves" ON public.solve_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own solves" ON public.solve_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own solves" ON public.solve_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own solves" ON public.solve_history
  FOR DELETE USING (auth.uid() = user_id);

-- Create solve_logs table for detailed move logs
CREATE TABLE public.solve_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solve_id UUID NOT NULL REFERENCES public.solve_history(id) ON DELETE CASCADE,
  move_sequence JSONB NOT NULL,
  timestamps JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on solve_logs
ALTER TABLE public.solve_logs ENABLE ROW LEVEL SECURITY;

-- Solve logs policies
CREATE POLICY "Users can view own logs" ON public.solve_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.solve_history WHERE id = solve_logs.solve_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert own logs" ON public.solve_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.solve_history WHERE id = solve_logs.solve_id AND user_id = auth.uid())
  );

-- Create user_stats table for cached statistics
CREATE TABLE public.user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_solves INTEGER DEFAULT 0,
  best_time_ms INTEGER,
  best_ao5_ms INTEGER,
  best_ao12_ms INTEGER,
  best_ao100_ms INTEGER,
  average_time_ms INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on user_stats
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- User stats policies
CREATE POLICY "Users can view all stats" ON public.user_stats
  FOR SELECT USING (true);

CREATE POLICY "Users can update own stats" ON public.user_stats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats" ON public.user_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON public.user_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster queries
CREATE INDEX idx_solve_history_user_id ON public.solve_history(user_id);
CREATE INDEX idx_solve_history_solved_at ON public.solve_history(solved_at DESC);
CREATE INDEX idx_solve_history_solve_time ON public.solve_history(solve_time_ms);