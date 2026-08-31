-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    role TEXT NOT NULL, -- 'customer' or 'worker'
    address TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
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
    budget NUMERIC NOT NULL,
    status TEXT DEFAULT 'open' NOT NULL, -- 'open', 'assigned', 'in_progress', 'completed'
    target_date TIMESTAMP WITH TIME ZONE NOT NULL,
    applicants UUID[] DEFAULT '{}'::UUID[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create ratings_reviews table
CREATE TABLE IF NOT EXISTS public.ratings_reviews (
    id UUID PRIMARY KEY,
    job_id UUID REFERENCES public.job_posts(id) ON DELETE CASCADE UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    worker_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    review_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Disable Row Level Security (RLS) for testing and ease of use with the anon key
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings_reviews DISABLE ROW LEVEL SECURITY;
