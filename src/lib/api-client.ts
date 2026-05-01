/**
 * KL HRMS — API Client
 *
 * Thin fetch wrapper for calling the FastAPI backend (localhost:8000).
 *
 * Auth contract:
 *   - Backend reads:  Authorization: Bearer <better-auth-session-token>
 *   - Backend reads:  x-organization-id: <org-uuid>  (observability only —
 *     the authoritative org comes from the verified session, but we send it
 *     so audit logs and request traces are enriched)
 *
 * Two entry points:
 *   - apiClient(token, orgId)  — client components (token from authClient.getSession)
 *   - createServerApiClient(token, orgId) — server components / server actions
 *
 * Usage (client component):
 *   const session = await authClient.getSession();
 *   const client = apiClient(session.data?.session?.token, orgId);
 *   const employees = await client.get<Employee[]>("/employees");
 *
 * Usage (server component / server action):
 *   const session = await auth.api.getSession({ headers: await headers() });
 *   const client = createServerApiClient(session?.session?.token, orgId);
 *   const employees = await client.get<Employee[]>("/employees");
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_PREFIX = "/api/v1";

// ── Error class ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        public readonly detail: string,
        public readonly url: string,
    ) {
        super(`API ${status}: ${detail} (${url})`);
        this.name = "ApiError";
    }
}

// ── Request options ───────────────────────────────────────────────────────────

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
    /** JSON body — serialized automatically. */
    body?: unknown;
    /** Query params appended to the URL. */
    params?: Record<string, string | number | boolean | undefined | null>;
}

// ── Internal fetch ────────────────────────────────────────────────────────────

async function apiFetch<T>(
    path: string,
    token: string | undefined | null,
    organizationId: string | undefined | null,
    { body, params, headers: extraHeaders, ...rest }: ApiRequestOptions = {},
): Promise<T> {
    // Build URL
    let url = `${BASE_URL}${API_PREFIX}${path}`;
    if (params) {
        const qs = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
            if (v !== undefined && v !== null) {
                qs.set(k, String(v));
            }
        }
        const queryString = qs.toString();
        if (queryString) url += `?${queryString}`;
    }

    // Build headers
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(extraHeaders as Record<string, string>),
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    if (organizationId) {
        // x-organization-id enriches audit logs on the backend.
        // The backend does NOT trust this for auth — it uses the verified session.
        headers["x-organization-id"] = organizationId;
    }

    const response = await fetch(url, {
        ...rest,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        let detail = response.statusText;
        try {
            const json = (await response.json()) as { detail?: string };
            if (json.detail) detail = json.detail;
        } catch {
            // response body wasn't JSON — keep statusText
        }
        throw new ApiError(response.status, detail, url);
    }

    // 204 No Content — return undefined cast to T
    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}

// ── Client factory ────────────────────────────────────────────────────────────

export interface ApiClientInstance {
    get<T>(path: string, options?: ApiRequestOptions): Promise<T>;
    post<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T>;
    patch<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T>;
    put<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T>;
    del<T>(path: string, options?: ApiRequestOptions): Promise<T>;
}

function createClient(
    token: string | undefined | null,
    organizationId: string | undefined | null,
): ApiClientInstance {
    return {
        get: <T>(path: string, options?: ApiRequestOptions) =>
            apiFetch<T>(path, token, organizationId, { method: "GET", ...options }),

        post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
            apiFetch<T>(path, token, organizationId, { method: "POST", body, ...options }),

        patch: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
            apiFetch<T>(path, token, organizationId, { method: "PATCH", body, ...options }),

        put: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
            apiFetch<T>(path, token, organizationId, { method: "PUT", body, ...options }),

        del: <T>(path: string, options?: ApiRequestOptions) =>
            apiFetch<T>(path, token, organizationId, { method: "DELETE", ...options }),
    };
}

/**
 * Client-side API client.
 *
 * Call inside a client component after getting the session:
 *   const { data: session } = authClient.useSession();
 *   const client = apiClient(session?.session?.token, orgId);
 */
export function apiClient(
    token: string | undefined | null,
    organizationId: string | undefined | null,
): ApiClientInstance {
    return createClient(token, organizationId);
}

/**
 * Server-side API client.
 *
 * Call inside a Server Component or Server Action:
 *   const session = await auth.api.getSession({ headers: await headers() });
 *   const client = createServerApiClient(session?.session?.token, orgId);
 */
export function createServerApiClient(
    token: string | undefined | null,
    organizationId: string | undefined | null,
): ApiClientInstance {
    return createClient(token, organizationId);
}
