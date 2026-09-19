import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!_stripe) {
    // Use package default API version
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export function appUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return url.replace(/\/$/, "");
}

export function priceId(): string | undefined {
  return process.env.STRIPE_PRICE_ID || undefined;
}

/** Missing-keys error body for checkout / portal routes */
export function stripeMissingKeysError() {
  return {
    error: "stripe_not_configured",
    message:
      "Stripe is not configured. Set STRIPE_SECRET_KEY, STRIPE_PRICE_ID, and NEXT_PUBLIC_APP_URL (see .env.example).",
  };
}
