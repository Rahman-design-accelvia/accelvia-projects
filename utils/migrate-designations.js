// utils/migrate-designations.js
// Migration to support user display name updates and designation approval workflows

const { Client } = require('pg');
const cs = 'postgres://postgres.vldeebwyoezoluptmnoh:sIxdlJ7WCdp8i4qs@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';

async function run() {
  const client = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('Connected to Supabase Postgres');

  // Add designation and requested_designation columns to app_users if they do not exist
  await client.query(`
    ALTER TABLE app_users 
    ADD COLUMN IF NOT EXISTS designation TEXT DEFAULT 'Team Member',
    ADD COLUMN IF NOT EXISTS requested_designation TEXT;
  `);
  console.log('Added designation and requested_designation columns to app_users');

  // Create app_designation_requests table for structured request logging & audit
  await client.query(`
    CREATE TABLE IF NOT EXISTS app_designation_requests (
      id TEXT PRIMARY KEY,
      applicant_id TEXT NOT NULL,
      applicant_name TEXT NOT NULL,
      applicant_email TEXT NOT NULL,
      applicant_role TEXT NOT NULL,
      current_designation TEXT,
      requested_designation TEXT NOT NULL,
      requested_role TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
      reviewed_by_id TEXT,
      reviewed_by_name TEXT,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE app_designation_requests ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public select app_designation_requests" ON app_designation_requests;
    CREATE POLICY "Public select app_designation_requests" ON app_designation_requests FOR SELECT TO anon, authenticated USING (true);

    DROP POLICY IF EXISTS "Public insert app_designation_requests" ON app_designation_requests;
    CREATE POLICY "Public insert app_designation_requests" ON app_designation_requests FOR INSERT TO anon, authenticated WITH CHECK (true);

    DROP POLICY IF EXISTS "Public update app_designation_requests" ON app_designation_requests;
    CREATE POLICY "Public update app_designation_requests" ON app_designation_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public delete app_designation_requests" ON app_designation_requests;
    CREATE POLICY "Public delete app_designation_requests" ON app_designation_requests FOR DELETE TO anon, authenticated USING (true);
  `);
  console.log('Configured app_designation_requests table and policies');

  try {
    await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE app_designation_requests;`);
    console.log('Realtime publication enabled for app_designation_requests');
  } catch (e) {
    console.log('Realtime note:', e.message);
  }

  await client.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
