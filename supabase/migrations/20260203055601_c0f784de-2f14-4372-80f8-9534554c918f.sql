-- Add Stripe Connect account ID to profiles for helpers to receive payments
ALTER TABLE public.profiles 
ADD COLUMN stripe_account_id TEXT,
ADD COLUMN stripe_onboarding_complete BOOLEAN DEFAULT false;

-- Add index for faster lookups
CREATE INDEX idx_profiles_stripe_account_id ON public.profiles(stripe_account_id) WHERE stripe_account_id IS NOT NULL;