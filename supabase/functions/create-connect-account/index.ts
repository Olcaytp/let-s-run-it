import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CONNECT-ACCOUNT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user already has a Stripe Connect account
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_account_id, stripe_onboarding_complete, full_name")
      .eq("user_id", user.id)
      .single();

    if (profile?.stripe_account_id) {
      logStep("User already has Stripe account", { accountId: profile.stripe_account_id });
      
      // If onboarding is not complete, create a new onboarding link
      if (!profile.stripe_onboarding_complete) {
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
          apiVersion: "2025-08-27.basil",
        });

        const accountLink = await stripe.accountLinks.create({
          account: profile.stripe_account_id,
          refresh_url: `${req.headers.get("origin")}/profile?connect=refresh`,
          return_url: `${req.headers.get("origin")}/profile?connect=success`,
          type: "account_onboarding",
        });

        return new Response(JSON.stringify({ 
          url: accountLink.url,
          account_id: profile.stripe_account_id,
          is_new: false
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      return new Response(JSON.stringify({ 
        already_complete: true,
        account_id: profile.stripe_account_id 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Create a Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: "express",
      country: "SE", // Sweden
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      individual: {
        email: user.email,
        first_name: profile?.full_name?.split(' ')[0] || undefined,
        last_name: profile?.full_name?.split(' ').slice(1).join(' ') || undefined,
      },
      metadata: {
        user_id: user.id,
      },
    });
    logStep("Stripe Connect account created", { accountId: account.id });

    // Save the account ID to the user's profile
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ 
        stripe_account_id: account.id,
        stripe_onboarding_complete: false
      })
      .eq("user_id", user.id);

    if (updateError) {
      logStep("Error saving account ID", { error: updateError.message });
      throw new Error("Failed to save Stripe account");
    }

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${req.headers.get("origin")}/profile?connect=refresh`,
      return_url: `${req.headers.get("origin")}/profile?connect=success`,
      type: "account_onboarding",
    });
    logStep("Account link created", { url: accountLink.url });

    return new Response(JSON.stringify({ 
      url: accountLink.url,
      account_id: account.id,
      is_new: true
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
