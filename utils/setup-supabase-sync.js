// utils/setup-supabase-sync.js
// Configures app_workspace_data table in Supabase for cross-device & cross-admin synchronization

const { Client } = require('pg');
const cs = 'postgres://postgres.vldeebwyoezoluptmnoh:sIxdlJ7WCdp8i4qs@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';

async function run() {
  const client = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('Connected to Supabase Postgres');

  await client.query(`
    CREATE TABLE IF NOT EXISTS app_workspace_data (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('Table app_workspace_data created/verified');

  await client.query(`
    ALTER TABLE app_workspace_data ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow public read app_workspace_data" ON app_workspace_data;
    CREATE POLICY "Allow public read app_workspace_data" ON app_workspace_data FOR SELECT TO anon, authenticated USING (true);

    DROP POLICY IF EXISTS "Allow public insert app_workspace_data" ON app_workspace_data;
    CREATE POLICY "Allow public insert app_workspace_data" ON app_workspace_data FOR INSERT TO anon, authenticated WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow public update app_workspace_data" ON app_workspace_data;
    CREATE POLICY "Allow public update app_workspace_data" ON app_workspace_data FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow public delete app_workspace_data" ON app_workspace_data;
    CREATE POLICY "Allow public delete app_workspace_data" ON app_workspace_data FOR DELETE TO anon, authenticated USING (true);
  `);
  console.log('RLS policies configured for anon + authenticated');

  try {
    await client.query(`
      ALTER PUBLICATION supabase_realtime ADD TABLE app_workspace_data;
    `);
    console.log('Realtime publication enabled for app_workspace_data');
  } catch (e) {
    console.log('Realtime publication note:', e.message);
  }

  // Pre-seed Musfiqur's created data if table is currently empty
  const existing = await client.query('SELECT key FROM app_workspace_data;');
  console.log('Existing keys in app_workspace_data:', existing.rows.map(r => r.key));

  await client.end();
}

run().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
