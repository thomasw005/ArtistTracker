// One place that knows how to talk to the API. Every request in the app should
// go through `api` below rather than calling fetch() directly — that way the
// base URL and the credentials option are impossible to forget.

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * An API response that wasn't 2xx. Carries the HTTP status so callers can react
 * to specific cases (401 = not logged in, 409 = email/username taken) instead of
 * string-matching on the message.
 */
export class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    /** Plain object; it gets JSON-encoded. Omit for GET/DELETE. */
    body?: unknown;
}

/**
 * Make a request to the API and return the parsed JSON body.
 *
 * The type parameter is what YOU expect back — it is not checked at runtime, so
 * it is a convenience for autocomplete, not a guarantee.
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body } = options;

    const res = await fetch(`${BASE_URL}${path}`, {
        method,

        // The auth token lives in an httpOnly cookie, which the browser will
        // only send cross-origin when this is set. Without it the API sees an
        // anonymous request and every /api/me route returns 401.
        credentials: 'include',

        // Only send Content-Type when there is actually a body to describe.
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    // 204 No Content — the DELETE routes return this. There is no body to parse,
    // and calling res.json() on it would throw.
    if (res.status === 204) {
        return undefined as T;
    }

    // Read the body once, as text, so that a non-JSON response (an HTML error
    // page, a crashed server, an empty reply) doesn't blow up before we've had a
    // chance to turn it into a useful message.
    const text = await res.text();

    let data: unknown;
    try {
        data = text ? JSON.parse(text) : undefined;
    } catch {
        throw new ApiError(res.status, `Server returned invalid JSON: ${text.slice(0, 100)}`);
    }

    if (!res.ok) {
        // The API reports failures as { error: string } — see the route handlers
        // and the central error handler in server.ts.
        const message =
            typeof data === 'object' && data !== null && 'error' in data
                ? String((data as { error: unknown }).error)
                : `Request failed with status ${res.status}`;

        throw new ApiError(res.status, message);
    }

    return data as T;
}

export const api = {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
    put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
    delete: <T = void>(path: string) => request<T>(path, { method: 'DELETE' }),
};
