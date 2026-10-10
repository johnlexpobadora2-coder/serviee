-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    role TEXT NOT NULL, -- 'customer' or 'worker'
    address TEXT NOT NULL,
    bio TEXT DEFAULT '',
    skills TEXT[] DEFAULT '{}'::TEXT[],
    availability_status TEXT DEFAULT 'available',
    avatar TEXT DEFAULT NULL,
    mask_phone BOOLEAN DEFAULT false,
    token_version INTEGER DEFAULT 1 NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT users_email_role_key UNIQUE (email, role)
);

-- Migration helper for existing users table:
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT NULL;

-- Create job_posts table
CREATE TABLE IF NOT EXISTS public.job_posts (
    id UUID PRIMARY KEY,
    customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    worker_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    budget NUMERIC NOT NULL,
    status TEXT DEFAULT 'open' NOT NULL, -- 'open', 'assigned', 'in_progress', 'completed'
    target_date TIMESTAMP WITH TIME ZONE NOT NULL,
    applicants UUID[] DEFAULT '{}'::UUID[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migration helpers for existing databases
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'available';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mask_phone BOOLEAN DEFAULT false;
ALTER TABLE public.job_posts ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.job_posts ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Create ratings_reviews table
CREATE TABLE IF NOT EXISTS public.ratings_reviews (
    id UUID PRIMARY KEY,
    job_id UUID REFERENCES public.job_posts(id) ON DELETE CASCADE UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    worker_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= -5 AND rating <= 5) NOT NULL,
    review_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY,
    job_id UUID REFERENCES public.job_posts(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create conversation_deletions table for per-user conversation deletion
CREATE TABLE IF NOT EXISTS public.conversation_deletions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.job_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    other_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT conv_deletions_unique UNIQUE (job_id, user_id, other_user_id)
);

-- Create saved_jobs table for bookmarking job listings
CREATE TABLE IF NOT EXISTS public.saved_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    job_id UUID REFERENCES public.job_posts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT saved_jobs_user_job_unique UNIQUE (user_id, job_id)
);

-- Create audit_logs table for security and admin event tracking
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_id TEXT,
    target_type TEXT DEFAULT 'general',
    details TEXT,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user_sessions table for multi-device active session tracking
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    session_id TEXT NOT NULL UNIQUE,
    device_type TEXT DEFAULT 'desktop', -- 'desktop', 'mobile', 'tablet'
    os TEXT DEFAULT 'Unknown OS',
    browser TEXT DEFAULT 'Web Browser',
    ip_address TEXT DEFAULT '',
    user_agent TEXT DEFAULT '',
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create support_tickets table for admin chat & customer service
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    user_name TEXT NOT NULL,
    user_email TEXT,
    user_role TEXT DEFAULT 'customer', -- 'customer' or 'worker'
    category TEXT DEFAULT 'general', -- 'general', 'account', 'job', 'billing', 'technical'
    subject TEXT NOT NULL,
    status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    unread_admin BOOLEAN DEFAULT true,
    unread_user BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create support_messages table for conversation history
CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
    sender_type TEXT NOT NULL, -- 'user' or 'admin'
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Disable Row Level Security (RLS) for testing and ease of use with the anon key
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_deletions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages DISABLE ROW LEVEL SECURITY;

-- Fallback permissive RLS policies in case RLS is enabled on Supabase Dashboard
DROP POLICY IF EXISTS "Allow anon all on users" ON public.users;
CREATE POLICY "Allow anon all on users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on job_posts" ON public.job_posts;
CREATE POLICY "Allow anon all on job_posts" ON public.job_posts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on ratings_reviews" ON public.ratings_reviews;
CREATE POLICY "Allow anon all on ratings_reviews" ON public.ratings_reviews FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on messages" ON public.messages;
CREATE POLICY "Allow anon all on messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on conversation_deletions" ON public.conversation_deletions;
CREATE POLICY "Allow anon all on conversation_deletions" ON public.conversation_deletions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on saved_jobs" ON public.saved_jobs;
CREATE POLICY "Allow anon all on saved_jobs" ON public.saved_jobs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on audit_logs" ON public.audit_logs;
CREATE POLICY "Allow anon all on audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on user_sessions" ON public.user_sessions;
CREATE POLICY "Allow anon all on user_sessions" ON public.user_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on support_tickets" ON public.support_tickets;
CREATE POLICY "Allow anon all on support_tickets" ON public.support_tickets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on support_messages" ON public.support_messages;
CREATE POLICY "Allow anon all on support_messages" ON public.support_messages FOR ALL USING (true) WITH CHECK (true);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

CREATE INDEX IF NOT EXISTS idx_job_posts_customer_id ON public.job_posts(customer_id);
CREATE INDEX IF NOT EXISTS idx_job_posts_worker_id ON public.job_posts(worker_id);
CREATE INDEX IF NOT EXISTS idx_job_posts_status ON public.job_posts(status);
CREATE INDEX IF NOT EXISTS idx_job_posts_created_at ON public.job_posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_job_id ON public.messages(job_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conv_del_user ON public.conversation_deletions(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_del_job ON public.conversation_deletions(job_id);

CREATE INDEX IF NOT EXISTS idx_ratings_reviews_worker_id ON public.ratings_reviews(worker_id);
CREATE INDEX IF NOT EXISTS idx_ratings_reviews_customer_id ON public.ratings_reviews(customer_id);

CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON public.saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_job_id ON public.saved_jobs(job_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.audit_logs(admin_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON public.user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_active ON public.user_sessions(last_active_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_updated_at ON public.support_tickets(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON public.support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON public.support_messages(created_at ASC);

-- Enable Supabase Realtime on messages & support tables
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
  END IF;
END $$;


