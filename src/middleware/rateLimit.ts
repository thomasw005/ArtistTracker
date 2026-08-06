import rateLimit from 'express-rate-limit';

// Caps how many new catalog entries a single user can create per hour,
// shared across all resource types, to blunt spam/bot flooding of the
// public catalog. Mounted AFTER requireAuth, so req.userId is set and we
// key the limit per user rather than per IP.
export const catalogCreateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,                  // 20 new catalog entries per user per hour
    keyGenerator: (req) => String(req.userId),
    message: { error: 'Too many new entries created. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Blunts brute-forcing of the auth endpoints. These run BEFORE auth, so there's
// no user to key on — it falls back to the default per-IP key. Behind a proxy
// you must set `app.set('trust proxy', ...)` for req.ip to be accurate.
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                  // 10 attempts per IP per window
    message: { error: 'Too many attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
