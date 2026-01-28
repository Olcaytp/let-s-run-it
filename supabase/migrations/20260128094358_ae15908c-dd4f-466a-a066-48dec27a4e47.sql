
-- Create profiles table for user information
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    apartment_number TEXT,
    building_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create their own profile" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Create need categories enum
CREATE TYPE public.need_category AS ENUM (
    'cleaning', 
    'moving', 
    'pet_care', 
    'childcare', 
    'shopping', 
    'repairs', 
    'gardening',
    'cooking',
    'transportation',
    'tutoring',
    'technology',
    'other'
);

-- Create need status enum
CREATE TYPE public.need_status AS ENUM (
    'open',
    'pending_helper_contact',
    'pending_requester_contact',
    'in_progress',
    'completed',
    'cancelled'
);

-- Create needs table
CREATE TABLE public.needs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category need_category NOT NULL DEFAULT 'other',
    budget_amount DECIMAL(10,2),
    budget_currency TEXT NOT NULL DEFAULT 'SEK',
    location TEXT,
    needed_by DATE,
    status need_status NOT NULL DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on needs
ALTER TABLE public.needs ENABLE ROW LEVEL SECURITY;

-- Needs policies
CREATE POLICY "Anyone authenticated can view needs" ON public.needs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create their own needs" ON public.needs
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own needs" ON public.needs
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own needs" ON public.needs
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create help offers table
CREATE TABLE public.help_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    need_id UUID NOT NULL REFERENCES public.needs(id) ON DELETE CASCADE,
    helper_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT,
    requester_approved BOOLEAN NOT NULL DEFAULT false,
    helper_approved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(need_id, helper_user_id)
);

-- Enable RLS on help_offers
ALTER TABLE public.help_offers ENABLE ROW LEVEL SECURITY;

-- Help offers policies
CREATE POLICY "Users can view offers for their needs or their own offers" ON public.help_offers
    FOR SELECT TO authenticated USING (
        helper_user_id = auth.uid() OR 
        need_id IN (SELECT id FROM public.needs WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create offers for others needs" ON public.help_offers
    FOR INSERT TO authenticated WITH CHECK (
        helper_user_id = auth.uid() AND
        need_id NOT IN (SELECT id FROM public.needs WHERE user_id = auth.uid())
    );

CREATE POLICY "Helpers can update their own offers" ON public.help_offers
    FOR UPDATE TO authenticated USING (helper_user_id = auth.uid());

CREATE POLICY "Requesters can update offers for their needs" ON public.help_offers
    FOR UPDATE TO authenticated USING (
        need_id IN (SELECT id FROM public.needs WHERE user_id = auth.uid())
    );

CREATE POLICY "Helpers can delete their own offers" ON public.help_offers
    FOR DELETE TO authenticated USING (helper_user_id = auth.uid());

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    related_need_id UUID REFERENCES public.needs(id) ON DELETE SET NULL,
    related_offer_id UUID REFERENCES public.help_offers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_needs_updated_at
    BEFORE UPDATE ON public.needs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_help_offers_updated_at
    BEFORE UPDATE ON public.help_offers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto profile creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
