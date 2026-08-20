import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';

const SALT_ROUNDS = 12;

/**
 * A real hash of a passphrase nobody will ever hold: 32 random bytes, generated
 * once per process and immediately forgotten. Comparing against it always fails,
 * but it fails after doing exactly the work a genuine wrong password does, which
 * is the entire point - see the login route in src/routes/auth.ts.
 *
 * Derived from SALT_ROUNDS rather than pasted in as a literal, because a hash
 * hard-coded at one cost factor would keep its old cost after SALT_ROUNDS moved
 * and quietly reopen the timing gap it exists to close. hashSync is deliberate:
 * this runs once at import, before the server accepts connections, and the
 * ~200ms it costs at boot buys the guarantee that the cost factors match.
 */
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
    randomBytes(32).toString('hex'),
    SALT_ROUNDS,
);

export async function hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hash);
}
