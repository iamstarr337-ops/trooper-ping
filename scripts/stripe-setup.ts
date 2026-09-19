/**
 * Creates Stripe Product "TrooperPing Pro" + $5.99/mo Price.
 * Usage: npm run stripe:setup
 * Reads STRIPE_SECRET_KEY from env or .env.local
 */
import fs from "fs";
import path from "path";
import Stripe from "stripe";

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  const lines = fs.readFileSync(p, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

async function main() {
  loadEnvLocal();
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error(
      "Missing STRIPE_SECRET_KEY. Set it in .env.local or export it, then re-run."
    );
    process.exit(1);
  }

  const stripe = new Stripe(key);

  const existing = await stripe.products
    .search({
      query: "name:'TrooperPing Pro' AND active:'true'",
      limit: 5,
    })
    .catch(async () => {
      const listed = await stripe.products.list({ active: true, limit: 100 });
      return {
        data: listed.data.filter((p) => p.name === "TrooperPing Pro"),
      };
    });

  let product = existing.data[0];
  if (!product) {
    product = await stripe.products.create({
      name: "TrooperPing Pro",
      description:
        "Full live nationwide trooper/LEO map, create reports, and flag inaccurate pings.",
    });
    console.log("Created product:", product.id);
  } else {
    console.log("Using existing product:", product.id);
  }

  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 20,
  });
  let price = prices.data.find(
    (p) =>
      p.unit_amount === 599 &&
      p.currency === "usd" &&
      p.recurring?.interval === "month"
  );

  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: 599,
      currency: "usd",
      recurring: { interval: "month" },
      nickname: "TrooperPing Pro monthly",
    });
    console.log("Created price:", price.id);
  } else {
    console.log("Using existing price:", price.id);
  }

  console.log("\nAdd this to your .env.local:\n");
  console.log(`STRIPE_PRICE_ID=${price.id}`);
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
