import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import {
  markCanceled,
  SubStatus,
  upsertSubscriber,
} from "@/lib/subscribers";

export const runtime = "nodejs";

// Stripe needs the raw body for signature verification
export async function POST(req: NextRequest) {
  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "stripe_not_configured" },
      { status: 503 }
    );
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      {
        error: "webhook_secret_missing",
        message: "Set STRIPE_WEBHOOK_SECRET (stripe listen --forward-to …)",
      },
      { status: 503 }
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid_signature";
    console.error("[webhook] signature", message);
    return NextResponse.json({ error: "invalid_signature", message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;
        if (cs.mode !== "subscription") break;
        const customerId =
          typeof cs.customer === "string" ? cs.customer : cs.customer?.id;
        if (!customerId) break;

        let status: SubStatus = "active";
        let subscriptionId: string | undefined;
        let priceIdVal: string | undefined;

        if (typeof cs.subscription === "string") {
          subscriptionId = cs.subscription;
          try {
            const sub = await getStripe().subscriptions.retrieve(cs.subscription);
            status = sub.status as SubStatus;
            priceIdVal = sub.items?.data?.[0]?.price?.id;
          } catch {
            /* keep active default after successful checkout */
          }
        }

        upsertSubscriber({
          customerId,
          email: cs.customer_details?.email || cs.customer_email || undefined,
          subscriptionId,
          status,
          priceId: priceIdVal,
          updatedAt: new Date().toISOString(),
        });
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        if (!customerId) break;
        upsertSubscriber({
          customerId,
          subscriptionId: sub.id,
          status: sub.status as SubStatus,
          priceId: sub.items?.data?.[0]?.price?.id,
          updatedAt: new Date().toISOString(),
        });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        if (!customerId) break;
        markCanceled(customerId);
        upsertSubscriber({
          customerId,
          subscriptionId: sub.id,
          status: "canceled",
          priceId: sub.items?.data?.[0]?.price?.id,
          updatedAt: new Date().toISOString(),
        });
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[webhook] handler", err);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
