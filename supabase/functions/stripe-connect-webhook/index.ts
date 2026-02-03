import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CONNECT-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Webhook received");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    // For now, we'll process without signature verification
    // In production, you should set up STRIPE_WEBHOOK_SECRET and verify
    const event = JSON.parse(body) as Stripe.Event;
    logStep("Event parsed", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { 
          sessionId: session.id,
          paymentStatus: session.payment_status
        });

        if (session.payment_status === "paid" && session.metadata) {
          const { need_id, help_offer_id, helper_amount, helper_user_id } = session.metadata;
          
          if (!helper_user_id || !helper_amount) {
            logStep("Missing metadata for transfer", { metadata: session.metadata });
            break;
          }

          // Get helper's Stripe Connect account
          const { data: helperProfile } = await supabaseAdmin
            .from("profiles")
            .select("stripe_account_id, stripe_onboarding_complete")
            .eq("user_id", helper_user_id)
            .single();

          if (!helperProfile?.stripe_account_id || !helperProfile.stripe_onboarding_complete) {
            logStep("Helper doesn't have complete Stripe Connect account", { 
              helper_user_id,
              hasAccount: !!helperProfile?.stripe_account_id,
              onboardingComplete: helperProfile?.stripe_onboarding_complete
            });
            
            // Update commission status to indicate transfer pending
            await supabaseAdmin
              .from("commissions")
              .update({ status: "transfer_pending" })
              .eq("help_offer_id", help_offer_id);
            break;
          }

          // Create transfer to helper
          const amountInCents = Math.round(parseFloat(helper_amount) * 100);
          const transfer = await stripe.transfers.create({
            amount: amountInCents,
            currency: "sek",
            destination: helperProfile.stripe_account_id,
            metadata: {
              need_id,
              help_offer_id,
              helper_user_id,
            },
          });
          logStep("Transfer created", { transferId: transfer.id, amount: amountInCents });

          // Update commission record
          await supabaseAdmin
            .from("commissions")
            .update({ 
              status: "completed",
              stripe_transfer_id: transfer.id,
              completed_at: new Date().toISOString()
            })
            .eq("help_offer_id", help_offer_id);

          // Update need status
          await supabaseAdmin
            .from("needs")
            .update({ status: "completed" })
            .eq("id", need_id);

          logStep("Commission and need updated to completed");
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        logStep("Account updated", { 
          accountId: account.id,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted
        });

        if (account.metadata?.user_id) {
          const isComplete = account.details_submitted && account.payouts_enabled;
          await supabaseAdmin
            .from("profiles")
            .update({ stripe_onboarding_complete: isComplete })
            .eq("user_id", account.metadata.user_id);
          logStep("Profile updated", { userId: account.metadata.user_id, isComplete });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
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
