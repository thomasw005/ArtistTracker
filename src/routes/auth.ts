import { Router } from 'express';
import { sql } from '../db.js';
import { hashPassword } from '../auth/password.js';
import { verifyPassword, DUMMY_PASSWORD_HASH } from '../auth/password.js';
import { signToken, verifyToken } from '../auth/jwt.js';
import { requireAuth } from '../auth/requireAuth.js';
import { TOKEN_COOKIE, tokenCookieOptions, TOKEN_MAX_AGE } from '../auth/cookies.js';
import type { User } from '../types.js';

const router = Router();

// Request bodies arrive as unknown JSON: the `as` casts below are claims about
// their shape, not checks on it. Credential fields have to be checked here,
// before they reach code that assumes a string - .toLowerCase() on a number, or
// bcrypt hashing an object, throws and turns a bad request into a generic 500.
//
// Normalising happens in the same pass: anything that isn't a string, or is only
// whitespace, collapses to '' and fails the guards below. Register and login
// MUST normalise identically - if one trims and the other doesn't, an account
// created with a padded value can never be logged into.
const asTrimmedString = (value: unknown): string =>
    typeof value === 'string' ? value.trim() : '';

// Both routes read these, so the rules can't drift apart. The two length caps
// are mirrored by CHECK constraints in sql/schema.sql - change them in both
// places or a value the API accepts starts failing at the database.
const MAX_EMAIL_LENGTH = 254; // RFC 5321's limit on a forward-path address
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 32;
const MIN_PASSWORD_LENGTH = 8;

// bcrypt hashes the first 72 bytes of a password and silently ignores the rest,
// so a longer one would be accepted while only its opening 72 bytes ever
// mattered - and any two passwords sharing that prefix would be interchangeable.
// Rejecting is the honest read of that limit. Lifting it means pre-hashing
// (SHA-256 -> base64) before bcrypt, which changes the format of every stored
// hash and is a bigger decision than a validation rule.
const MAX_PASSWORD_BYTES = 72;

// Deliberately loose: one @ with no whitespace either side, and a dot in the
// domain. Tighter patterns reject addresses that genuinely deliver, and the
// only real proof an address works is sending mail to it.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A handle, in the sense every social site means it. Tested after the value has
// been case-folded, so someone typing 'Bob' still gets in - they just get 'bob'.
// Keeping @ out matters most: without it a username can be shaped like an email
// address, and anything that later looks accounts up by either field inherits
// the ambiguity.
const USERNAME_PATTERN = /^[a-z0-9_-]+$/;

// POST /api/auth/register - create a new user account and start a session
router.post('/register', async (req, res) => {
    const { email, username, password } = (req.body ?? {}) as Partial<User> & { password?: string };

    // Trailing whitespace is almost always an artefact of how the value was
    // typed or pasted, not part of the credential. Only the edges go: interior
    // spaces are left alone, so passphrases still work.
    //
    // email and username are both case-folded so that the UNIQUE indexes on
    // them are effectively case-insensitive - without this, 'Bob' and 'bob' are
    // two different strings and both get an account. The password is NOT folded:
    // case is real entropy there.
    const accountEmail = asTrimmedString(email).toLowerCase();
    const accountUsername = asTrimmedString(username).toLowerCase();
    const accountPassword = asTrimmedString(password);

    if (!accountEmail || !accountUsername || !accountPassword) {
        res.status(400).json({ error: 'email, username, and password must be non-empty strings' });
        return;
    }

    if (accountEmail.length > MAX_EMAIL_LENGTH) {
        res.status(400).json({
            error: `email must be at most ${MAX_EMAIL_LENGTH} characters`,
        });
        return;
    }

    if (!EMAIL_PATTERN.test(accountEmail)) {
        res.status(400).json({ error: 'email must be a valid email address' });
        return;
    }

    if (
        accountUsername.length < MIN_USERNAME_LENGTH ||
        accountUsername.length > MAX_USERNAME_LENGTH
    ) {
        res.status(400).json({
            error: `username must be ${MIN_USERNAME_LENGTH} to ${MAX_USERNAME_LENGTH} characters`,
        });
        return;
    }

    if (!USERNAME_PATTERN.test(accountUsername)) {
        res.status(400).json({
            error: 'username may only contain letters, numbers, underscores, and hyphens',
        });
        return;
    }

    if (accountPassword.length < MIN_PASSWORD_LENGTH) {
        res.status(400).json({
            error: `password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        });
        return;
    }

    // Bytes, not characters: an accented letter costs two and an emoji four, so
    // a 30-character password can still cross the line bcrypt stops reading at.
    if (Buffer.byteLength(accountPassword, 'utf8') > MAX_PASSWORD_BYTES) {
        res.status(400).json({
            error: `password must be at most ${MAX_PASSWORD_BYTES} bytes`,
        });
        return;
    }

    const password_hash = await hashPassword(accountPassword);

    let user: Omit<User, 'password_hash'>;
    try {
        const rows = (await sql`
            INSERT INTO users (email, username, password_hash)
            VALUES (${accountEmail}, ${accountUsername}, ${password_hash})
            RETURNING id, email, username, created_at, is_admin
        `) as Omit<User, 'password_hash'>[];
        user = rows[0];
    } catch (err) {
        // 23505 = unique_violation. email and username each have a UNIQUE index,
        // so say which one collided rather than letting the generic handler in
        // server.ts echo Postgres' `detail` (which quotes the value back).
    
        const pg = err as { code?: string; constraint?: string; detail?: string };
        if (pg.code === '23505') {
            const field =
                pg.constraint?.includes('username') || pg.detail?.includes('(username)')
                    ? 'username'
                    : 'email';
            res.status(409).json({ error: `That ${field} is already taken` });
            return;
        }
        throw err;
    }

    // Log the new account straight in, so signing up is a single request.
    const token = signToken(user.id);
    res.cookie(TOKEN_COOKIE, token, { ...tokenCookieOptions, maxAge: TOKEN_MAX_AGE });

    res.status(201).json(user);
});

// POST /api/auth/login - verify credentials and issue a session cookie
router.post('/login', async (req, res) => {
    const { email, password } = (req.body ?? {}) as { email?: string; password?: string };

    const accountEmail = asTrimmedString(email).toLowerCase();
    const accountPassword = asTrimmedString(password);

    if (!accountEmail || !accountPassword) {
        res.status(400).json({ error: 'email and password must be non-empty strings' });
        return;
    }

    // Login deliberately does NOT re-run the registration policy: those rules
    // are free to tighten later, and accounts created under the old ones still
    // have to be able to log in. It only enforces the caps, because a value
    // past them cannot match any account register would have created. Same 401
    // as a wrong password - the length policy isn't worth announcing here.
    if (
        accountEmail.length > MAX_EMAIL_LENGTH ||
        Buffer.byteLength(accountPassword, 'utf8') > MAX_PASSWORD_BYTES
    ) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
    }

    const rows = (await sql`
        SELECT id, email, username, password_hash, created_at, is_admin
        FROM users WHERE email = ${accountEmail}
    `) as User[];

    const user = rows[0];

    // An unmatched email still gets a bcrypt comparison, against a hash that
    // cannot match. Skipping it - the obvious version of this code - answers
    // "no such account" in about 2ms and "wrong password" in about 200ms,
    // because bcrypt is expensive by design. That 100x gap is readable through
    // network noise, and it turns this route into an oracle for which addresses
    // hold accounts. Both outcomes now take the same path and the same work.
    const validPassword = await verifyPassword(
        accountPassword,
        user?.password_hash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !validPassword) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
    }

    const token = signToken(user.id);

    res.cookie(TOKEN_COOKIE, token, { ...tokenCookieOptions, maxAge: TOKEN_MAX_AGE });

    // Same shape as GET /me, so the client can populate auth state from the
    // login response instead of making a follow-up request. Built field by
    // field to keep password_hash out of the response.
    res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        created_at: user.created_at,
        // The client needs this to decide whether to render the catalog-editing
        // UI at all. It is a hint for the interface only — every write is
        // re-checked server-side by requireAdmin.
        is_admin: user.is_admin,
    });
});

// GET /api/auth/me - return the currently logged-in user
router.get('/me', requireAuth, async (req, res) => {
    const rows = (await sql`
        SELECT id, email, username, created_at, is_admin FROM users WHERE id = ${req.userId}
    `) as Omit<User, 'password_hash'>[];

    // requireAuth already confirmed this user exists, so rows[0] is present.
    res.json(rows[0]);
});

// POST /api/auth/logout - revoke the token and clear the session cookie.
// Deliberately NOT behind requireAuth: logging out should always succeed and
// clear the cookie, even if the token is already expired or garbage.
router.post('/logout', async (req, res) => {
    const token = req.cookies?.[TOKEN_COOKIE];

    if (token) {
        try {
            const { jti, exp } = verifyToken(token);

            // Remember this token as dead until the moment it would have expired
            // anyway. ON CONFLICT makes a double logout a no-op rather than a 500.
            await sql`
                INSERT INTO revoked_tokens (jti, expires_at)
                VALUES (${jti}, to_timestamp(${exp}))
                ON CONFLICT (jti) DO NOTHING
            `;

            // Past their expiry, revoked rows are redundant - the JWT's own exp
            // check already rejects those tokens. Sweeping here keeps the table
            // bounded by "logouts in the last 7 days" with no cron job.
            await sql`DELETE FROM revoked_tokens WHERE expires_at < now()`;
        } catch {
            // Expired or tampered-with token: nothing worth revoking. Fall
            // through and clear the cookie anyway.
        }
    }

    res.clearCookie(TOKEN_COOKIE, tokenCookieOptions);

    res.json({ message: 'Logged out' });
});


export default router;