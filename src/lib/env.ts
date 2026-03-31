/**
 * Validates required environment variables at startup.
 * Import this module early (before any other module that reads env).
 */

const required = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
] as const;

const optional = [
  "REDIS_URL",
  "PORT",
  "TRUSTED_ORIGINS",
  "TRUSTED_PROXY_HEADER",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
] as const;

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[env] Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const secret = process.env.BETTER_AUTH_SECRET!;
if (secret.length < 32) {
  console.error("[env] BETTER_AUTH_SECRET must be at least 32 characters");
  process.exit(1);
}
