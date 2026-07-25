import type { CookieOptions } from 'express';

// The cookie that carries the auth JWT. Defined once so that login (which sets
// it) and logout (which clears it) use IDENTICAL attributes — a browser only
// clears a cookie when the attributes match how it was originally set.
export const TOKEN_COOKIE = 'token';

// Set CROSS_SITE_COOKIE=true when the frontend and API are served from
// different sites (e.g. app.example.com vs api.example.com). Cross-site cookies
// require SameSite=None, which in turn REQUIRES Secure (https). For same-site
// setups (including localhost on different ports) 'lax' is correct.
const crossSite = process.env.CROSS_SITE_COOKIE === 'true';

export const tokenCookieOptions: CookieOptions = {
    httpOnly: true,
    sameSite: crossSite ? 'none' : 'lax',
    secure: crossSite || process.env.NODE_ENV === 'production',
    path: '/',
};

export const TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days, matches the JWT expiry
