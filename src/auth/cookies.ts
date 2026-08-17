import type { CookieOptions } from 'express';

// The cookie that carries the auth JWT. Defined once so that login (which sets
// it) and logout (which clears it) use IDENTICAL attributes — a browser only
// clears a cookie when the attributes match how it was originally set.
export const TOKEN_COOKIE = 'token';

// SameSite=Lax is this app's ONLY CSRF defense: the browser won't attach the
// cookie to a cross-site POST/PUT/DELETE, so a request forged by another site
// arrives with no token and requireAuth rejects it. Two things to respect:
//
//   1. It only covers mutations that aren't GETs. Lax cookies ARE sent on
//      cross-site top-level GET navigations, so never put a mutation behind a
//      GET.
//   2. Turning it off has no backstop. Nothing on the server checks the request
//      Origin, so with SameSite=None a forged cross-site write reaches the
//      handler with a valid cookie. Add an Origin check (and ideally a CSRF
//      token) before shipping that config.
//
// So set CROSS_SITE_COOKIE=true ONLY when the frontend and API sit on different
// REGISTRABLE DOMAINS (eTLD+1) — e.g. myapp.vercel.app calling myapi.fly.dev.
// SameSite is judged per site, not per origin, so these are already same-site
// and must leave it false:
//   - different subdomains: app.example.com -> api.example.com
//   - different ports:      localhost:5173  -> localhost:3000
// (SameSite=None also REQUIRES Secure, which is why `secure` follows it below.)
const crossSite = process.env.CROSS_SITE_COOKIE === 'true';

export const tokenCookieOptions: CookieOptions = {
    httpOnly: true,
    sameSite: crossSite ? 'none' : 'lax',
    secure: crossSite || process.env.NODE_ENV === 'production',
    path: '/',
};

export const TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days, matches the JWT expiry
