import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    const entries = (await redis.lrange("entries", 0, -1)) || [];
    return res.status(200).json({ entries });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.HOST_PIN || req.headers["x-host-pin"] !== process.env.HOST_PIN) {
    return res.status(401).json({ error: "Wrong PIN" });
  }

  const { action, n, p } = req.body || {};
  if (action === "add") {
    if (!/^\d+$/.test(String(n)) || !Number.isFinite(Number(p))) {
      return res.status(400).json({ error: "Bad input" });
    }
    await redis.rpush("entries", { n: String(parseInt(n, 10)), p: Math.trunc(Number(p)), t: Date.now() });
  } else if (action === "undo") {
    await redis.rpop("entries");
  } else if (action === "reset") {
    await redis.del("entries");
  } else {
    return res.status(400).json({ error: "Unknown action" });
  }
  return res.status(200).json({ ok: true });
}
