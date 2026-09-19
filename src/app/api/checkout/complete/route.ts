import { NextRequest, NextResponse } from "next/server";
import {
  getStripe,
  stripeConfigured,
  stripeMissingKeysError,
} from "@/lib/stripe";
import { setSessionCookie } from "@/lib/session";
import {
  isActiveStatus,
  SubStatus,
  upsertSubscriber,
} from "@/lib/subscribers";

export async function POST(req: NextRequest) {
  if (!stripeConfigured()) {
    return NextResponse.json(stripeMissingKeysError(), { status: 503 });
  }

  let sessionId: string | undefined;
  try {
    const body = await req.json();
    sessionId = typeof body.session_id === "string" ? body.session_id : undefined;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "missing_session_id" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const cs = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (cs.mode !== "subscription") {
      return NextResponse.json({ error: "invalid_session" }, { status: 400 });
    }

    const customerId =
      typeof cs.customer === "string"
        ? cs.customer
        : cs.customer && "id" in cs.customer
          ? cs.customer.id
          : null;

    if (!customerId) {
      return NextResponse.json({ error: "no_customer" }, { status: 400 });
    }

    let status: SubStatus = "none";
    let subscriptionId: string | undefined;
    let priceIdVal: string | undefined;

    const sub = cs.subscription;
    if (sub && typeof sub !== "string") {
      status = (sub.status as SubStatus) || "none";
      subscriptionId = sub.id;
      priceIdVal = sub.items?.data?.[0]?.price?.id;
    } else if (typeof sub === "string") {
      const fetched = await stripe.subscriptions.retrieve(sub);
      status = fetched.status as SubStatus;
      subscriptionId = fetched.id;
      priceIdVal = fetched.items?.data?.[0]?.price?.id;
    } else if (cs.payment_status === "paid") {
      status = "active";
    }

    const email =
      cs.customer_details?.email ||
      cs.customer_email ||
      undefined;

    upsertSubscriber({
      customerId,
      email,
      subscriptionId,
      status,
      priceId: priceIdVal,
      updatedAt: new Date().toISOString(),
    });

    const subscribed = isActiveStatus(status);
    const res = NextResponse.json({
      subscribed,
      customerId,
      email: email ?? null,
      status,
    });

    if (subscribed) {
      setSessionCookie(res, {
        customerId,
        email,
        status,
      });
    }

    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "complete_failed";
    console.error("[checkout/complete]", message);
    return NextResponse.json(
      { error: "complete_failed", message },
      { status: 500 }
    );
  }
}
