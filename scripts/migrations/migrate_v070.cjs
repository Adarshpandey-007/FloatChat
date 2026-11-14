const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigration() {
  const schemaPath = path.resolve(process.cwd(), 'docs/06_platform_vision/schema_v0.7.0.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  try {
    await pool.query(sql);
    console.log('Migration v0.7.0 successful');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
}

runMigration();
