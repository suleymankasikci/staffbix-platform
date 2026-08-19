import IORedis from "ioredis";

/**
 * Single ioredis client per process, shared by:
 *   - rate-limit module (sliding-window sorted sets)
 *   - BullMQ producer side in web routes
 *   - app-level cache (Sprint 4+)
 *
 * BullMQ Worker instances use their OWN connection (`createConnection`
 * below) because BullMQ requires `maxRetriesPerRequest: null` on the
 * worker connection, which we don't want globally.
 */

const url = process.env.REDIS_URL;
if (!url && process.env.NODE_ENV !== "test") {
  throw new Error("REDIS_URL is required");
}

declare global {
  var __staffbix_redis__: IORedis | undefined;
}

export const redis: IORedis =
  globalThis.__staffbix_redis__ ??
  new IORedis(url!, {
    // Defaults — fine for the shared client.
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__staffbix_redis__ = redis;
}

/** Fresh connection for BullMQ Worker — required by BullMQ. */
export function createBullConnection(): IORedis {
  return new IORedis(url!, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}
