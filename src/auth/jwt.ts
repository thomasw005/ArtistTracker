import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

const secretFromEnv = process.env.JWT_SECRET;
if (!secretFromEnv) {
    throw new Error('JWT_SECRET is not set, check your .env file');
}
const JWT_SECRET: string = secretFromEnv;

export interface TokenPayload {
    userId: number;
    /**
     * Unique id for THIS token ("JWT ID"). A JWT can't be un-signed, so logout
     * records this id in `revoked_tokens` and the auth middleware refuses any
     * token whose jti is listed. Without it, a token stays valid for its full
     * 7 days no matter what the user does.
     */
    jti: string;
    /** Expiry, seconds since the epoch. Added automatically by `expiresIn`. */
    exp: number;
}

export function signToken(userId: number): string {
    // `jwtid` puts a fresh uuid in the jti claim, so two logins by the same
    // user produce independently revocable tokens.
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d', jwtid: randomUUID() });
}

export function verifyToken(token: string): TokenPayload {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
