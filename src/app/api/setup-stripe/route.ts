import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENV_PATH = "/workspace/trooper-ping/.env.local";
const SECRET_KEY = "STRIPE_SECRET_KEY";
const PUBLISHABLE_KEY = "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY";

function parseEnv(source: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

function isPlaceholder(value: string | undefined): boolean {
  if (!value?.trim()) return true;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.includes("...") ||
    normalized.includes("your_") ||
    normalized.includes("replace") ||
    normalized.includes("changeme") ||
    normalized.startsWith("<")
  );
}

function matchesSecret(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && crypto.timingSafeEqual(leftBytes, rightBytes);
}

function suppliedSetupToken(request: NextRequest): string {
  const headerToken =
    request.headers.get("x-setup-token") ||
    request.headers.get("setup-token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (headerToken) return headerToken.trim();

  const params = request.nextUrl.searchParams;
  return (
    params.get("SETUP_TOKEN") ||
    params.get("setup_token") ||
    params.get("token") ||
    ""
  ).trim();
}

function quoteEnvValue(value: string): string {
  return JSON.stringify(value);
}

function updateEnvFile(source: string, updates: Record<string, string>): string {
  const lines = source ? source.split(/\r?\n/) : [];
  const written = new Set<string>();
  const updated = lines.map((line) => {
    const match = line.match(/^(\s*)(export\s+)?([A-Za-z_][A-Za-z0-9_]*)(\s*=).*$/);
    if (!match || !(match[3] in updates)) return line;
    const key = match[3];
    written.add(key);
    return `${match[1]}${match[2] || ""}${key}${match[4]}${quoteEnvValue(updates[key])}`;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (!written.has(key)) updated.push(`${key}=${quoteEnvValue(value)}`);
  }

  return `${updated.join("\n").replace(/\n+$/, "")}\n`;
}

async function readEnvFile(): Promise<{ source: string; values: Record<string, string> }> {
  try {
    const source = await fs.readFile(ENV_PATH, "utf8");
    return { source, values: parseEnv(source) };
  } catch {
    return { source: "", values: {} };
  }
}

async function createMonthlyPrice(secretKey: string): Promise<string | null> {
  try {
    const stripe = new Stripe(secretKey);
    const existing = await stripe.products
      .search({ query: "name:'TrooperPing Pro' AND active:'true'", limit: 5 })
      .catch(async () => {
        const listed = await stripe.products.list({ active: true, limit: 100 });
        return { data: listed.data.filter((product) => product.name === "TrooperPing Pro") };
      });

    const product =
      existing.data[0] ||
      (await stripe.products.create({
        name: "TrooperPing Pro",
        description:
          "Full live nationwide trooper/LEO map, create reports, and flag inaccurate pings.",
      }));
    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 20 });
    const price =
      prices.data.find(
        (candidate) =>
          candidate.unit_amount === 599 &&
          candidate.currency === "usd" &&
          candidate.recurring?.interval === "month"
      ) ||
      (await stripe.prices.create({
        product: product.id,
        unit_amount: 599,
        currency: "usd",
        recurring: { interval: "month" },
        nickname: "TrooperPing Pro monthly",
      }));

    return price.id;
  } catch {
    // Keys are already saved; price creation is best effort and never logs secret data.
    return null;
  }
}

export async function POST(request: NextRequest) {
  const env = await readEnvFile();
  const configuredSecret = env.values[SECRET_KEY];
  const setupToken = process.env.SETUP_TOKEN || env.values.SETUP_TOKEN || "";
  const tokenAuthorized =
    Boolean(setupToken) && matchesSecret(setupToken, suppliedSetupToken(request));

  if (!isPlaceholder(configuredSecret) && !tokenAuthorized) {
    return NextResponse.json(
      { ok: false, message: "Stripe setup is already configured." },
      { status: 403, headers: { "cache-control": "no-store" } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Send both Stripe test keys as JSON." },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { ok: false, message: "Send both Stripe test keys as JSON." },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  const submitted = body as Record<string, unknown>;
  const secretKey =
    typeof submitted[SECRET_KEY] === "string" ? submitted[SECRET_KEY].trim() : "";
  const publishableKey =
    typeof submitted[PUBLISHABLE_KEY] === "string" ? submitted[PUBLISHABLE_KEY].trim() : "";

  if (!/^sk_test_[A-Za-z0-9]+$/.test(secretKey) || !/^pk_test_[A-Za-z0-9]+$/.test(publishableKey)) {
    return NextResponse.json(
      { ok: false, message: "Use valid Stripe Test mode keys (sk_test_ and pk_test_)." },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  const updates: Record<string, string> = {
    [SECRET_KEY]: secretKey,
    [PUBLISHABLE_KEY]: publishableKey,
  };

  try {
    const nextEnv = updateEnvFile(env.source, updates);
    await fs.writeFile(ENV_PATH, nextEnv, { encoding: "utf8", mode: 0o600 });
    await fs.chmod(path.resolve(ENV_PATH), 0o600);
  } catch {
    return NextResponse.json(
      { ok: false, message: "Keys could not be saved on the server." },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }

  let priceId: string | undefined = env.values.STRIPE_PRICE_ID;
  if (!priceId || isPlaceholder(priceId)) {
    priceId = (await createMonthlyPrice(secretKey)) || undefined;
    if (priceId) {
      try {
        const saved = await fs.readFile(ENV_PATH, "utf8");
        await fs.writeFile(
          ENV_PATH,
          updateEnvFile(saved, { STRIPE_PRICE_ID: priceId }),
          { encoding: "utf8", mode: 0o600 }
        );
      } catch {
        priceId = undefined;
      }
    }
  }

  return NextResponse.json(
    {
      ok: true,
      message: "Stripe test keys saved. Restart npm run start to load the new environment.",
      priceConfigured: Boolean(priceId),
    },
    { headers: { "cache-control": "no-store" } }
  );
}
