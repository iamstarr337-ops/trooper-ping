import { NextResponse } from "next/server";
import {
  appUrl,
  getStripe,
  stripeConfigured,
  stripeMissingKeysError,
} from "@/lib/stripe";
import { getSessionFromCookies } from "@/lib/session";

export async function POST() {
  if (!stripeConfigured()) {
    return NextResponse.json(stripeMissingKeysError(), { status: 503 });
  }

  const { session, subscribed } = getSessionFromCookies();
  if (!session?.customerId) {
    return NextResponse.json(
      { error: "not_authenticated", message: "No billing session. Subscribe first." },
      { status: 401 }
    );
  }

  try {
    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: session.customerId,
      return_url: `${appUrl()}/`,
    });
    return NextResponse.json({
      url: portal.url,
      subscribed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "portal_failed";
    console.error("[billing-portal]", message);
    return NextResponse.json(
      { error: "portal_failed", message },
      { status: 500 }
    );
  }
}
