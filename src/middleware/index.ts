/* ============================================================================
   Middleware Configuration — rate limiters, CORS, security headers
   
   Extracted from index.ts for cleaner app composition.
   Each middleware is a standalone function that can be tested independently.
   ============================================================================ */

import { secureHeaders } from "hono/secure-headers";
import { cors } from "hono/cors";
import { rateLimiter } from "hono-rate-limiter";
import type { Context } from "hono";

/* ============================================================================
   Helpers
   ============================================================================ */

function clientIp(c: Context): string {
  return (
    c.req.header("x-forwarded-for") ||
    c.req.header("cf-connecting-ip") ||
    "unknown"
  );
}

/* ============================================================================
   Security Headers
   ============================================================================ */

export const securityHeaders = secureHeaders({
  xFrameOptions: "DENY",
  xContentTypeOptions: "nosniff",
  referrerPolicy: "strict-origin-when-cross-origin",
  crossOriginEmbedderPolicy: false,
});

/* ============================================================================
   CORS
   ============================================================================ */

export const authCors = cors({
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://0.0.0.0:3000",
    process.env.BETTER_AUTH_URL!,
  ],
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["POST", "GET", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
  credentials: true,
});

/* ============================================================================
   Rate Limiters
   ============================================================================ */

/** General API rate limit: 100 requests/minute */
export const apiLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: "draft-6",
  keyGenerator: clientIp,
});

/** Auth endpoints: 20 requests/minute */
export const authLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-6",
  keyGenerator: clientIp,
});

/** Roulette spin: 30 spins/minute */
export const spinLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-6",
  keyGenerator: clientIp,
});

/** Blackjack actions: 60 actions/minute */
export const blackjackLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-6",
  keyGenerator: clientIp,
});
