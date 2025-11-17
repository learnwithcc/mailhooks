import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigrations() {
  const migrationsDir = path.dirname(new URL(import.meta.url).pathname);
  const files = fs
    .readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    try {
      console.log(`Running migration: ${file}`);
      await pool.query(sql);
      console.log(`✓ Completed: ${file}`);
    } catch (error) {
      console.error(`✗ Failed migration ${file}:`, error.message);
      process.exit(1);
    }
  }

  await pool.end();
  console.log('\n✓ All migrations completed successfully');
}

runMigrations().catch(error => {
  console.error('Migration error:', error);
  process.exit(1);
});
