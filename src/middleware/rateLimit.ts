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
