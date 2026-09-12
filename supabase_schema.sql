-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    role TEXT NOT NULL, -- 'customer' or 'worker'
    address TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT users_email_role_key UNIQUE (email, role)
);

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

-- Migration helper if table already exists in existing database
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 1 NOT NULL;
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

-- Create otps table for email verifications
CREATE TABLE IF NOT EXISTS public.otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    otp_type TEXT NOT NULL, -- 'registration' or 'forgot_password'
    metadata JSONB,
    attempts INTEGER DEFAULT 0 NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Disable Row Level Security (RLS) for testing and ease of use with the anon key
-- Create conversation_deletions table for per-user conversation deletion
CREATE TABLE IF NOT EXISTS public.conversation_deletions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.job_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    other_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT conv_deletions_unique UNIQUE (job_id, user_id, other_user_id)
);

-- Disable Row Level Security (RLS) for testing and ease of use with the anon key
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.otps DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_deletions DISABLE ROW LEVEL SECURITY;

-- Fallback permissive RLS policies in case RLS is enabled on Supabase Dashboard
DROP POLICY IF EXISTS "Allow anon all on users" ON public.users;
CREATE POLICY "Allow anon all on users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on otps" ON public.otps;
CREATE POLICY "Allow anon all on otps" ON public.otps FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on job_posts" ON public.job_posts;
CREATE POLICY "Allow anon all on job_posts" ON public.job_posts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on ratings_reviews" ON public.ratings_reviews;
CREATE POLICY "Allow anon all on ratings_reviews" ON public.ratings_reviews FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on messages" ON public.messages;
CREATE POLICY "Allow anon all on messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on conversation_deletions" ON public.conversation_deletions;
CREATE POLICY "Allow anon all on conversation_deletions" ON public.conversation_deletions FOR ALL USING (true) WITH CHECK (true);

-- Performance Indexes
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

-- Enable Supabase Realtime on messages table
ALTER TABLE public.messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

