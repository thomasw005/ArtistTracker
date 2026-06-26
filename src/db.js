import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set, check your .env file');
}

export const sql = neon(process.env.DATABASE_URL);