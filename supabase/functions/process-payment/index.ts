import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-PAYMENT] ${step}${detailsStr}`);
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

    const { need_id, help_offer_id } = await req.json();
    if (!need_id || !help_offer_id) throw new Error("need_id and help_offer_id are required");
    logStep("Request data", { need_id, help_offer_id });

    // Get the need details
    const { data: need, error: needError } = await supabaseAdmin
      .from("needs")
      .select("*")
      .eq("id", need_id)
      .single();
    if (needError || !need) throw new Error("Need not found");
    logStep("Need found", { title: need.title, budget: need.budget_amount });

    // Get the help offer
    const { data: offer, error: offerError } = await supabaseAdmin
      .from("help_offers")
      .select("*")
      .eq("id", help_offer_id)
      .single();
    if (offerError || !offer) throw new Error("Help offer not found");
    logStep("Offer found", { helper: offer.helper_user_id });

    // Verify both parties approved
    if (!offer.requester_approved || !offer.helper_approved) {
      throw new Error("Both parties must approve the offer before payment");
    }

    const originalAmount = need.budget_amount || 0;
    const commissionRate = 0.10; // 10%
    const commissionAmount = originalAmount * commissionRate;
    const helperAmount = originalAmount - commissionAmount;

    logStep("Payment calculation", {
      originalAmount,
      commissionAmount,
      helperAmount,
      currency: need.budget_currency
    });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find or create Stripe customer for the requester
    const { data: requesterProfile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("user_id", need.user_id)
      .single();

    const { data: requesterAuth } = await supabaseAdmin.auth.admin.getUserById(need.user_id);
    const requesterEmail = requesterAuth?.user?.email;
    if (!requesterEmail) throw new Error("Requester email not found");

    const customers = await stripe.customers.list({ email: requesterEmail, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }
    logStep("Customer lookup", { customerId, email: requesterEmail });

    // Get origin from header or use default
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, '') || "https://cfa73f3f-3032-4ce1-93d6-d7a266906d5d.lovableproject.com";

    // Create checkout session for payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : requesterEmail,
      line_items: [
        {
          price_data: {
            currency: need.budget_currency.toLowerCase(),
            product_data: {
              name: `Hjälp: ${need.title}`,
              description: `Hjälp från granne (inkl. 10% serviceavgift)`,
            },
            unit_amount: Math.round(originalAmount * 100), // Convert to öre/cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/needs/${need_id}?payment=success`,
      cancel_url: `${origin}/needs/${need_id}?payment=cancelled`,
      metadata: {
        need_id,
        help_offer_id,
        commission_amount: commissionAmount.toString(),
        helper_amount: helperAmount.toString(),
        helper_user_id: offer.helper_user_id,
        requester_user_id: need.user_id,
      },
    });
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Create commission record (pending)
    const { error: commissionError } = await supabaseAdmin
      .from("commissions")
      .insert({
        need_id,
        help_offer_id,
        helper_user_id: offer.helper_user_id,
        requester_user_id: need.user_id,
        original_amount: originalAmount,
        commission_amount: commissionAmount,
        commission_rate: commissionRate,
        currency: need.budget_currency,
        stripe_payment_intent_id: session.id,
        status: "pending",
      });
    if (commissionError) {
      logStep("Commission insert error", { error: commissionError.message });
    }

    return new Response(JSON.stringify({ url: session.url }), {
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
