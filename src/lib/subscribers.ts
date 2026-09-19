import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "subscribers.json");

export type SubStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused"
  | "none";

export interface Subscriber {
  customerId: string;
  email?: string;
  subscriptionId?: string;
  status: SubStatus;
  priceId?: string;
  updatedAt: string;
}

function ensureFile(): Record<string, Subscriber> {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "{}", "utf8");
    return {};
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Record<string, Subscriber>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, Subscriber>): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(map, null, 2), "utf8");
}

export function isActiveStatus(status: string | undefined | null): boolean {
  return status === "active" || status === "trialing";
}

export function upsertSubscriber(sub: Subscriber): Subscriber {
  const map = ensureFile();
  const next = { ...sub, updatedAt: new Date().toISOString() };
  map[sub.customerId] = next;
  if (sub.email) {
    // secondary lookup key by lowercased email
    map[`email:${sub.email.toLowerCase()}`] = next;
  }
  writeAll(map);
  return next;
}

export function getByCustomerId(customerId: string): Subscriber | null {
  const map = ensureFile();
  return map[customerId] || null;
}

export function getByEmail(email: string): Subscriber | null {
  const map = ensureFile();
  return map[`email:${email.toLowerCase()}`] || null;
}

export function markCanceled(customerId: string): void {
  const map = ensureFile();
  const existing = map[customerId];
  if (!existing) return;
  const next = {
    ...existing,
    status: "canceled" as SubStatus,
    updatedAt: new Date().toISOString(),
  };
  map[customerId] = next;
  if (existing.email) {
    map[`email:${existing.email.toLowerCase()}`] = next;
  }
  writeAll(map);
}
