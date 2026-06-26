import { readFileSync } from 'node:fs';
import { sql } from '../src/db.js';

const file = process.argv[2] ?? 'sql/schema.sql';
const text = readFileSync(file, 'utf8');

const statements = text
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

console.log(`Running ${statements.length} statements from ${file}...`);
for (const statement of statements) {
  await sql.query(statement);
}
console.log('Done');
