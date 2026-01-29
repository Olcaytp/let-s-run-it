-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursive RLS issues)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create commissions table to track platform earnings
CREATE TABLE public.commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    need_id UUID REFERENCES public.needs(id) ON DELETE SET NULL,
    help_offer_id UUID REFERENCES public.help_offers(id) ON DELETE SET NULL,
    helper_user_id UUID NOT NULL,
    requester_user_id UUID NOT NULL,
    original_amount NUMERIC NOT NULL,
    commission_amount NUMERIC NOT NULL,
    commission_rate NUMERIC NOT NULL DEFAULT 0.10,
    currency TEXT NOT NULL DEFAULT 'SEK',
    stripe_payment_intent_id TEXT,
    stripe_transfer_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on commissions
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for commissions
CREATE POLICY "Admins can view all commissions"
ON public.commissions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own commissions"
ON public.commissions
FOR SELECT
USING (auth.uid() = helper_user_id OR auth.uid() = requester_user_id);

-- Trigger to assign default user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();