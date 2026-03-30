import Redis from "ioredis";

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      enableOfflineQueue: true,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) return null; // stop retrying, connection will error
        return Math.min(times * 200, 2000);
      },
    });

    client.on("error", (err) => {
      console.error("[redis] connection error:", err.message);
    });
  }
  return client;
}
