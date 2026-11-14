import { query } from '../../src/lib/db';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  const schemaPath = path.resolve(process.cwd(), 'docs/06_platform_vision/schema_v0.6.0.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  try {
    await query(sql);
    console.log('Migration successful');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}

runMigration();
