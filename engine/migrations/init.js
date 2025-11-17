/**
 * Database Migration Runner
 *
 * This script executes all SQL migration files in the migrations directory.
 * Migration files are run in alphabetical order, so use numbered prefixes
 * (e.g., 001-create-tables.sql, 002-add-indexes.sql).
 *
 * Usage:
 *   npm run migrate
 *
 * Environment Variables:
 *   DATABASE_URL - PostgreSQL connection string (required)
 *
 * Exit Codes:
 *   0 - All migrations completed successfully
 *   1 - Migration failed or error occurred
 *
 * @module migrations/init
 */

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

/**
 * PostgreSQL connection pool for running migrations.
 * Configured using the DATABASE_URL environment variable.
 *
 * @type {Pool}
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Executes all SQL migration files in the migrations directory.
 *
 * Migrations are:
 * - Discovered by scanning for .sql files
 * - Sorted alphabetically (use numbered prefixes)
 * - Executed sequentially in order
 * - Failed migrations stop the process with exit code 1
 *
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If a migration fails or database connection fails
 */
async function runMigrations() {
  // Get the directory containing this script
  const migrationsDir = path.dirname(new URL(import.meta.url).pathname);

  // Find all .sql files and sort them alphabetically
  const files = fs
    .readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  // Execute each migration file sequentially
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    try {
      console.log(`Running migration: ${file}`);
      await pool.query(sql);
      console.log(`✓ Completed: ${file}`);
    } catch (error) {
      // Log error details and exit with error code
      console.error(`✗ Failed migration ${file}:`, error.message);
      process.exit(1);
    }
  }

  // Close database connection pool
  await pool.end();
  console.log('\n✓ All migrations completed successfully');
}

// Execute migrations and handle any uncaught errors
runMigrations().catch(error => {
  console.error('Migration error:', error);
  process.exit(1);
});
