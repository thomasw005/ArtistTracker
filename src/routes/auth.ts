import { Router } from 'express';
import { sql } from '../db.js';
import { hashPassword } from '../auth/password.js';
import { verifyPassword } from '../auth/password.js';
import { signToken } from '../auth/jwt.js';
import { requireAuth } from '../auth/requireAuth.js';
import { TOKEN_COOKIE, tokenCookieOptions, TOKEN_MAX_AGE } from '../auth/cookies.js';
import type { User } from '../types.js';

const router = Router();

// POST /api/auth/register - create a new user account
router.post('/register', async (req, res) => {
    const { email, username, password } = (req.body ?? {}) as Partial<User> & { password?: string };

    if (!email || !username || !password) {
        res.status(400).json({ error: 'email, username, and password are required' });
        return;
    }

    const password_hash = await hashPassword(password);

    const rows = (await sql`
        INSERT INTO users (email, username, password_hash)
        VALUES (${email.toLowerCase()}, ${username}, ${password_hash})
        RETURNING id, email, username, is_admin, created_at
    `) as Omit<User, 'password_hash'>[];

    res.status(201).json(rows[0]);
});

// POST /api/auth/login - verify credentials and issue a session cookie
router.post('/login', async (req, res) => {
    const { email, password } = (req.body ?? {}) as { email?: string; password?: string };

    if (!email || !password) {
        res.status(400).json({ error: 'email and password are required' });
        return;
    }

    const rows = (await sql`
        SELECT id, password_hash FROM users WHERE email = ${email.toLowerCase()}
    `) as Pick<User, 'id' | 'password_hash'>[];

    const user = rows[0];
    const validPassword = user ? await verifyPassword(password, user.password_hash) : false;

    if (!user || !validPassword) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
    }

    const token = signToken({ userId: user.id });

    res.cookie(TOKEN_COOKIE, token, { ...tokenCookieOptions, maxAge: TOKEN_MAX_AGE });

    res.json({ message: 'Logged in' });
});

// GET /api/auth/me - return the currently logged-in user
router.get('/me', requireAuth, async (req, res) => {
    const rows = (await sql`
        SELECT id, email, username, is_admin, created_at FROM users WHERE id = ${req.userId}
    `) as Omit<User, 'password_hash'>[];

    // requireAuth already confirmed this user exists, so rows[0] is present.
    res.json(rows[0]);
});

// POST /api/auth/logout - clear the session cookie
router.post('/logout', (req, res) => {
    res.clearCookie(TOKEN_COOKIE, tokenCookieOptions);

    res.json({ message: 'Logged out' });
});


export default router;