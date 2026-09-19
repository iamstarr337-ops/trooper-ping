import { NextRequest, NextResponse } from "next/server";
import {
  appUrl,
  getStripe,
  priceId,
  stripeConfigured,
  stripeMissingKeysError,
} from "@/lib/stripe";

export async function POST(req: NextRequest) {
  if (!stripeConfigured() || !priceId()) {
    return NextResponse.json(stripeMissingKeysError(), { status: 503 });
  }

  let email: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    if (body && typeof body.email === "string" && body.email.includes("@")) {
      email = body.email.trim().slice(0, 200);
    }
  } catch {
    /* optional body */
  }

  try {
    const stripe = getStripe();
    const base = appUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId()!, quantity: 1 }],
      success_url: `${base}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?checkout=cancel`,
      ...(email ? { customer_email: email } : {}),
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "checkout_failed";
    console.error("[checkout]", message);
    return NextResponse.json(
      { error: "checkout_failed", message },
      { status: 500 }
    );
  }
}
