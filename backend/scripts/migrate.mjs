import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const migrationsDir = path.resolve(process.cwd(), 'backend/migrations');
const files = fs.readdirSync(migrationsDir).filter(f => /^\d+_.+\.sql$/.test(f)).sort();
const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 10000, application_name: 'commerce-pickup-migrator' });
await client.connect();
try {
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['commerce-pickup-platform:migrations']);
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  const applied = new Set((await client.query('SELECT version FROM schema_migrations')).rows.map(r => r.version));
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Applying ${file}`);
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [file]);
  }
  await client.query('COMMIT');
  console.log(`Migration complete: ${files.length} migration file(s) checked.`);
} catch (err) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('Migration failed:', err?.message || err);
  process.exitCode = 1;
} finally { await client.end(); }
