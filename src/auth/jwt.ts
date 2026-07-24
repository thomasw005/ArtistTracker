import jwt from 'jsonwebtoken';

const secretFromEnv = process.env.JWT_SECRET;
if (!secretFromEnv) {
    throw new Error('JWT_SECRET is not set, check your .env file');
}
const JWT_SECRET: string = secretFromEnv;

export interface TokenPayload {
    userId: number;
}

export function signToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
}