import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROJECT_REF = 'bvengtkyxolfzgchiexf';
const ACCESS_TOKEN = process.argv[2];

if (!ACCESS_TOKEN) {
  console.error('Usage: node scripts/run_migration.mjs <supabase-access-token>');
  console.error('Get your token at: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});

if (!res.ok) {
  const body = await res.text();
  console.error(`Failed (${res.status}):`, body);
  process.exit(1);
}

const result = await res.json();
console.log('Migration complete:', JSON.stringify(result, null, 2));
