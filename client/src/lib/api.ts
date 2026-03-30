import type { ApiRoutes } from "@server/index";
import { hc } from "hono/client";

const client = hc<ApiRoutes>("/");

/**
 * Type-safe Hono RPC client instance.
 * Use api.*.$get/$post directly from hooks and components.
 */
export const api = client.api;
