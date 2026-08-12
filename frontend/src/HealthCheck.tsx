import { useEffect, useState } from 'react';
import { api, ApiError } from './api';

// Shapes returned by the two health endpoints in server.ts.
interface Health {
    status: string;
}

interface DbHealth {
    status: string;
    db_time: string;
}

// A request is always in exactly one of three states, so model it as one value
// rather than three separate booleans that could contradict each other.
type Result =
    | { state: 'loading' }
    | { state: 'ok'; apiStatus: string; dbTime: string }
    | { state: 'error'; message: string };

export function HealthCheck() {
    const [result, setResult] = useState<Result>({ state: 'loading' });

    // The empty dependency array [] means "run this once, after the component
    // first appears" — not on every render. Leaving it out entirely would
    // re-run the fetch after every state update, which would loop forever.
    useEffect(() => {
        // useEffect's callback can't itself be async, so the async work goes in
        // an inner function that we then call.
        async function check() {
            try {
                // Both requests are independent, so start them together rather
                // than waiting for the first to finish before sending the second.
                const [health, dbHealth] = await Promise.all([
                    api.get<Health>('/health'),
                    api.get<DbHealth>('/health/db'),
                ]);

                setResult({
                    state: 'ok',
                    apiStatus: health.status,
                    dbTime: dbHealth.db_time,
                });
            } catch (err) {
                // An ApiError means the server answered but was unhappy. Anything
                // else is usually the request never arriving at all — server down,
                // wrong port, or the browser blocking it for CORS reasons.
                const message =
                    err instanceof ApiError
                        ? `API responded ${err.status}: ${err.message}`
                        : 'Could not reach the API. Is `npm run dev` running on port 3000?';

                setResult({ state: 'error', message });
            }
        }

        check();
    }, []);

    if (result.state === 'loading') {
        return <p>Checking API…</p>;
    }

    if (result.state === 'error') {
        return (
            <div>
                <h2>❌ Not connected</h2>
                <p>{result.message}</p>
            </div>
        );
    }

    return (
        <div>
            <h2>✅ Connected</h2>
            <p>API status: {result.apiStatus}</p>
            <p>Database time: {new Date(result.dbTime).toLocaleString()}</p>
        </div>
    );
}
