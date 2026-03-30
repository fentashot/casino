import type { ApiRoutes } from "@server/index";
import { hc } from "hono/client";

const client = hc<ApiRoutes>("/");

/**
 * Type-safe Hono RPC client instance.
 * Use api.*.$get/$post directly from hooks and components.
 */
export const api = client.api;

//Api response parsing
export interface ApiErrorResponse {
	error: string;
	message?: string;
	details?: Record<string, unknown>;
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
	return isObject(value) && typeof value.error === "string";
}

export function getApiErrorMessage(
	value: unknown,
	fallback = "Request failed",
): string {
	if (!isApiErrorResponse(value)) {
		return fallback;
	}
	return value.message ?? value.error ?? fallback;
}

export function getApiErrorNumberDetail(
	value: unknown,
	key: string,
): number | undefined {
	if (!isApiErrorResponse(value)) {
		return undefined;
	}
	const detail = value.details?.[key];
	return typeof detail === "number" ? detail : undefined;
}

export async function readApiData<T>(
	res: Response,
	fallback = "Request failed",
): Promise<T> {
	const data = await res.json();

	if (!res.ok || isApiErrorResponse(data)) {
		throw new Error(getApiErrorMessage(data, fallback));
	}

	return data as T;
}

export async function apiRequest<T>(
	request: Promise<Response>,
	fallback = "Request failed",
): Promise<T> {
	const res = await request;
	return readApiData<T>(res, fallback);
}
