-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create events table (イベント)
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Create counter_data table (カウンターデータ - 1イベント1カウンター)
CREATE TABLE IF NOT EXISTS public.counter_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE UNIQUE NOT NULL,
  count INTEGER DEFAULT 0 NOT NULL CHECK (count >= 0),
  background_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create event_permissions table (イベントの権限管理)
CREATE TABLE IF NOT EXISTS public.event_permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(event_id, user_id)
);

-- Create counter_history table (カウント履歴)
CREATE TABLE IF NOT EXISTS public.counter_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  counter_data_id UUID REFERENCES public.counter_data(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  previous_count INTEGER NOT NULL,
  new_count INTEGER NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('increment', 'decrement', 'set')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS events_owner_id_idx ON public.events(owner_id);
CREATE INDEX IF NOT EXISTS events_slug_idx ON public.events(slug);
CREATE INDEX IF NOT EXISTS counter_data_event_id_idx ON public.counter_data(event_id);
CREATE INDEX IF NOT EXISTS event_permissions_event_id_idx ON public.event_permissions(event_id);
CREATE INDEX IF NOT EXISTS event_permissions_user_id_idx ON public.event_permissions(user_id);
CREATE INDEX IF NOT EXISTS counter_history_counter_data_id_idx ON public.counter_history(counter_data_id);
CREATE INDEX IF NOT EXISTS counter_history_created_at_idx ON public.counter_history(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counter_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counter_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for events (誰でも閲覧可能、owner/editorのみ編集可能)
DROP POLICY IF EXISTS "Anyone can view events" ON public.events;
CREATE POLICY "Anyone can view events"
  ON public.events FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
CREATE POLICY "Authenticated users can create events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = owner_id);

DROP POLICY IF EXISTS "Event owners and editors can update events" ON public.events;
CREATE POLICY "Event owners and editors can update events"
  ON public.events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.event_permissions
      WHERE event_permissions.event_id = events.id
        AND event_permissions.user_id = auth.uid()
        AND event_permissions.role IN ('owner', 'editor')
    )
  );

DROP POLICY IF EXISTS "Event owners can delete events" ON public.events;
CREATE POLICY "Event owners can delete events"
  ON public.events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.event_permissions
      WHERE event_permissions.event_id = events.id
        AND event_permissions.user_id = auth.uid()
        AND event_permissions.role = 'owner'
    )
  );

-- RLS Policies for counter_data (誰でも閲覧可能、owner/editorのみ編集可能)
DROP POLICY IF EXISTS "Anyone can view counter data" ON public.counter_data;
CREATE POLICY "Anyone can view counter data"
  ON public.counter_data FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Event owners and editors can update counter data" ON public.counter_data;
CREATE POLICY "Event owners and editors can update counter data"
  ON public.counter_data FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.event_permissions
      WHERE event_permissions.event_id = counter_data.event_id
        AND event_permissions.user_id = auth.uid()
        AND event_permissions.role IN ('owner', 'editor')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create counter data" ON public.counter_data;
CREATE POLICY "Authenticated users can create counter data"
  ON public.counter_data FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.event_permissions
      WHERE event_permissions.event_id = counter_data.event_id
        AND event_permissions.user_id = auth.uid()
        AND event_permissions.role IN ('owner', 'editor')
    )
  );

-- RLS Policies for event_permissions (ownerのみ管理可能)
DROP POLICY IF EXISTS "Users can view permissions for their events" ON public.event_permissions;
CREATE POLICY "Users can view permissions for their events"
  ON public.event_permissions FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.event_permissions ep
      WHERE ep.event_id = event_permissions.event_id
        AND ep.user_id = auth.uid()
        AND ep.role = 'owner'
    )
  );

DROP POLICY IF EXISTS "Event owners can manage permissions" ON public.event_permissions;
CREATE POLICY "Event owners can manage permissions"
  ON public.event_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.event_permissions ep
      WHERE ep.event_id = event_permissions.event_id
        AND ep.user_id = auth.uid()
        AND ep.role = 'owner'
    )
  );

-- RLS Policies for counter_history (誰でも閲覧可能)
DROP POLICY IF EXISTS "Anyone can view counter history" ON public.counter_history;
CREATE POLICY "Anyone can view counter history"
  ON public.counter_history FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "System can insert counter history" ON public.counter_history;
CREATE POLICY "System can insert counter history"
  ON public.counter_history FOR INSERT
  WITH CHECK (true);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to automatically create event permission for event owner
CREATE OR REPLACE FUNCTION public.handle_new_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert owner permission
  INSERT INTO public.event_permissions (event_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  
  -- Create counter_data for the event
  INSERT INTO public.counter_data (event_id, count)
  VALUES (NEW.id, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new event creation
DROP TRIGGER IF EXISTS on_event_created ON public.events;
CREATE TRIGGER on_event_created
  AFTER INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_event();

-- Create function to log counter changes
CREATE OR REPLACE FUNCTION public.log_counter_change()
RETURNS TRIGGER AS $$
DECLARE
  operation_type TEXT;
BEGIN
  -- Determine operation type
  IF NEW.count > OLD.count THEN
    operation_type := 'increment';
  ELSIF NEW.count < OLD.count THEN
    operation_type := 'decrement';
  ELSE
    operation_type := 'set';
  END IF;

  -- Insert history record
  INSERT INTO public.counter_history (
    counter_data_id,
    user_id,
    previous_count,
    new_count,
    operation
  ) VALUES (
    NEW.id,
    auth.uid(),
    OLD.count,
    NEW.count,
    operation_type
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for counter updates
DROP TRIGGER IF EXISTS on_counter_updated ON public.counter_data;
CREATE TRIGGER on_counter_updated
  AFTER UPDATE OF count ON public.counter_data
  FOR EACH ROW
  WHEN (OLD.count IS DISTINCT FROM NEW.count)
  EXECUTE FUNCTION public.log_counter_change();

-- Enable realtime for counter_data (複数端末リアルタイム同期に必要)
ALTER PUBLICATION supabase_realtime ADD TABLE public.counter_data;

-- Atomic increment function (RLS を通じて権限チェック済みの UPDATE を 1 SQL で実行)
CREATE OR REPLACE FUNCTION public.increment_counter(target_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.counter_data
    SET count = count + 1
    WHERE id = target_id
    RETURNING count INTO new_count;
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Atomic decrement function (0 未満にならない)
CREATE OR REPLACE FUNCTION public.decrement_counter(target_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.counter_data
    SET count = GREATEST(count - 1, 0)
    WHERE id = target_id
    RETURNING count INTO new_count;
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
