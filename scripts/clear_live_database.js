// scripts/clear_live_database.js
// Completely clears test data on live Supabase PostgreSQL database:
// 1. Truncates all business relational tables with CASCADE
// 2. Truncates app_designation_requests
// 3. Resets app_workspace_data to clean empty collections (wipes cache across all PWA & browser clients)
// 4. Cleans app_users of all non-Super Admin test accounts, keeping master Super Admin (gravityahmed11@gmail.com)
// 5. Removes test probe user from auth.users
// 6. Verifies all table counts post-clear

const { Client } = require('pg');

const client = new Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.vldeebwyoezoluptmnoh',
  password: 'sIxdlJ7WCdp8i4qs',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function clearLiveDatabase() {
  console.log('Connecting to Supabase Live Database...');
  await client.connect();
  console.log('Connected successfully to eu-west-1 live database.');

  await client.query('BEGIN;');

  try {
    // 1. Truncate all relational tables with CASCADE
    console.log('\n1. Truncating relational business tables...');
    await client.query(`
      TRUNCATE TABLE 
        audit_events,
        notifications,
        work_order_events,
        work_order_items,
        work_orders,
        client_review_tokens,
        scope_version_notes,
        scope_decisions,
        scope_items,
        scope_versions,
        scope_packages,
        message_attachments,
        message_revisions,
        messages,
        conversations,
        project_financial_settings,
        project_members,
        projects,
        client_contacts,
        clients,
        user_roles,
        user_profiles,
        organizations
      CASCADE;
    `);
    console.log('✓ Relational tables truncated.');

    // 2. Truncate app_designation_requests
    console.log('\n2. Truncating app_designation_requests...');
    await client.query('TRUNCATE TABLE app_designation_requests CASCADE;');
    console.log('✓ app_designation_requests truncated.');

    // 3. Reset app_workspace_data to pristine empty collections
    // This triggers Realtime broadcasts so any active mobile PWA or web browser immediately flushes local cache
    console.log('\n3. Resetting app_workspace_data to clean empty state...');
    const emptyCollections = [
      { key: 'clients', value: [] },
      { key: 'projects', value: [] },
      { key: 'packages', value: [] },
      { key: 'versions', value: [] },
      { key: 'work_orders', value: [] },
      { key: 'messages', value: [] },
      { key: 'financials', value: {} },
      { key: 'audit_events', value: [] }
    ];

    for (const item of emptyCollections) {
      await client.query(`
        INSERT INTO app_workspace_data (key, value, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value, updated_at = NOW();
      `, [item.key, JSON.stringify(item.value)]);
    }
    console.log('✓ app_workspace_data reset to clean empty collections.');

    // 4. Clean app_users: Delete test accounts, retain master Super Admin
    console.log('\n4. Cleaning app_users (removing test accounts, preserving Super Admin)...');
    const deleteTestUsersRes = await client.query(`
      DELETE FROM app_users 
      WHERE role != 'super_admin' OR email NOT IN ('gravityahmed11@gmail.com', 'superadmin@accelvia.internal');
    `);
    console.log(`✓ Removed ${deleteTestUsersRes.rowCount} test user account(s) from app_users.`);

    // 5. Clean test accounts from auth.users if any
    console.log('\n5. Cleaning test users from auth.users...');
    const deleteAuthRes = await client.query(`
      DELETE FROM auth.users 
      WHERE email = 'test_probe_accelvia@gmail.com';
    `);
    console.log(`✓ Removed ${deleteAuthRes.rowCount} test account(s) from auth.users.`);

    await client.query('COMMIT;');
    console.log('\n✓ TRANSACTION COMMITTED SUCCESSFULLY.');

    // 6. Post-clear verification
    console.log('\n=== Post-Clear Live Database Verification ===');
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    for (const row of tablesRes.rows) {
      const countRes = await client.query(`SELECT count(*) FROM "${row.table_name}"`);
      console.log(`  ${row.table_name.padEnd(30)}: ${countRes.rows[0].count} row(s)`);
    }

    // Inspect app_workspace_data content
    console.log('\n=== app_workspace_data status ===');
    const wsCheck = await client.query('SELECT key, value::text, updated_at FROM app_workspace_data ORDER BY key;');
    for (const r of wsCheck.rows) {
      console.log(`  ${r.key.padEnd(16)}: ${r.value} (updated: ${r.updated_at.toISOString()})`);
    }

    // Inspect remaining app_users
    console.log('\n=== app_users status ===');
    const usersCheck = await client.query('SELECT id, display_name, email, role, status FROM app_users;');
    console.log(usersCheck.rows);

  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('Error occurred, transaction rolled back:', err);
    throw err;
  } finally {
    await client.end();
  }
}

clearLiveDatabase()
  .then(() => {
    console.log('\n[SUCCESS] Live database successfully cleared!');
    process.exit(0);
  })
  .catch((e) => {
    console.error('\n[FAILED] Could not clear live database:', e);
    process.exit(1);
  });
