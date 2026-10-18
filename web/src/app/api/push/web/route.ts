import { NextResponse } from "next/server";
import webpush from "web-push";

/**
 * Өгөгдлийн сангийн trigger (pg_net) мэдэгдэл бүрийг энд илгээнэ -> вэб push (iPhone, Android Chrome, компьютер).
 * Хүсэлт өөрөө хүлээн авагчийн захиалгыг (subscription) агуулдаг тул зөвхөн тэр хүмүүст л очно.
 */
type Msg = {
  sub: { endpoint: string; keys: { p256dh: string; auth: string } };
  title: string;
  body?: string;
  url?: string;
  tag?: string;
};

export const maxDuration = 30;

/** Supabase RPC (нийтийн түлхүүрээр). Эрхийг функц өөрөө push secret-ээр шалгана. */
async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T | null> {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

/**
 * Зөвхөн өгөгдлийн сан (notify_push) дуудна: x-push-secret-ийг DB өөрөө шалгана.
 * Secret нь зөвхөн Vault-д байдаг тул сайтад ямар ч нууц түлхүүр тохируулах шаардлагагүй.
 */
async function authorized(secret: string) {
  return secret.length >= 32 && (await rpc<boolean>("push_secret_ok", { p: secret })) === true;
}

type Keys = { public: string; private: string };

/** VAPID түлхүүр: DB-д байхгүй бол нэг удаа үүсгээд хадгална (анхны хүсэлт = webpush_bootstrap) */
async function vapidKeys(secret: string): Promise<Keys | null> {
  const have = await rpc<Keys | null>("webpush_keys", { p_secret: secret });
  if (have?.public && have.private) return have;
  const gen = webpush.generateVAPIDKeys();
  return rpc<Keys>("webpush_keys_init", { p_secret: secret, p_public: gen.publicKey, p_private: gen.privateKey });
}

/** Зөвхөн сайтын доторх зам ("/ads/..."); гадны холбоос руу чиглүүлэхгүй */
const safeUrl = (u: unknown) =>
  typeof u === "string" && u.startsWith("/") && !u.startsWith("//") && !u.startsWith("/\\")
    ? u.slice(0, 300)
    : "/notifications";

export async function POST(request: Request) {
  const secret = request.headers.get("x-push-secret") ?? "";
  if (!(await authorized(secret))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const keys = await vapidKeys(secret);
  if (!keys) return NextResponse.json({ error: "VAPID түлхүүр алга" }, { status: 503 });
  webpush.setVapidDetails("https://auto-car-web-kappa.vercel.app", keys.public, keys.private);

  let messages: Msg[] = [];
  try {
    const j = await request.json();
    messages = Array.isArray(j?.messages) ? j.messages.slice(0, 500) : [];
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const gone: string[] = [];
  let sent = 0;
  await Promise.all(
    messages
      .filter(
        (m) =>
          typeof m?.sub?.endpoint === "string" &&
          m.sub.endpoint.startsWith("https://") &&
          m.sub.keys?.p256dh &&
          m.sub.keys?.auth,
      )
      .map(async (m) => {
        try {
          await webpush.sendNotification(
            m.sub,
            JSON.stringify({
              title: String(m.title ?? "Auto car").slice(0, 120),
              body: String(m.body ?? "").slice(0, 300),
              url: safeUrl(m.url),
              tag: typeof m.tag === "string" ? m.tag.slice(0, 80) : undefined,
            }),
            { TTL: 60 * 60 * 24, urgency: "high" },
          );
          sent++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) gone.push(m.sub.endpoint);
        }
      }),
  );

  // Хүчингүй болсон захиалгуудыг цэвэрлэнэ
  if (gone.length) await rpc("prune_web_push", { p_endpoints: gone, p_secret: secret }).catch(() => null);
  return NextResponse.json({ sent, gone: gone.length });
}
