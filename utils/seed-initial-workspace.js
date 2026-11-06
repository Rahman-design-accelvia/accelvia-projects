// utils/seed-initial-workspace.js
// Pre-seeds Musfiqur's created workspace data to Supabase app_workspace_data table

const { createClient } = require('@supabase/supabase-js');
const client = createClient('https://vldeebwyoezoluptmnoh.supabase.co', 'sb_publishable_XkFrqe5gtrOvcoBjh3z8YA_OKs-giVO');

async function seed() {
  const clients = [
    {
      id: 'client-tango',
      organization_id: 'org-1',
      name: 'Tango',
      status: 'active',
      default_timezone: 'America/New_York',
      contacts: [
        {
          id: 'contact-tango-1',
          client_id: 'client-tango',
          name: 'Micheal',
          email: '',
          job_title: 'Primary Contact',
          is_primary: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'client-pace',
      organization_id: 'org-1',
      name: 'Pace',
      status: 'active',
      default_timezone: 'America/New_York',
      contacts: [
        {
          id: 'contact-pace-1',
          client_id: 'client-pace',
          name: 'Robert Vance',
          email: '',
          job_title: 'Primary Contact',
          is_primary: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const projects = [
    {
      id: 'proj-tango-1',
      organization_id: 'org-1',
      client_id: 'client-tango',
      name: 'Wp test 1',
      status: 'active',
      timezone: 'America/New_York',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'proj-tango-2',
      organization_id: 'org-1',
      client_id: 'client-tango',
      name: 'wp test 2',
      status: 'active',
      timezone: 'America/New_York',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'proj-pace-1',
      organization_id: 'org-1',
      client_id: 'client-pace',
      name: 'wp test 1',
      status: 'active',
      timezone: 'America/New_York',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'proj-pace-2',
      organization_id: 'org-1',
      client_id: 'client-pace',
      name: 'wp test 2',
      status: 'active',
      timezone: 'America/New_York',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const packages = [
    {
      id: 'pkg-pace-2-1',
      project_id: 'proj-pace-2',
      title: 'wp test 4',
      package_kind: 'additional',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const versions = [
    {
      id: 'ver-pace-2-1',
      scope_package_id: 'pkg-pace-2-1',
      version_number: 1,
      status: 'pending',
      total_hours_snapshot: 28.0,
      total_usd_snapshot: null,
      total_bdt_snapshot: null,
      items: [
        { title: 'wp1', hours: 12.0 },
        { title: 'wp1', hours: 13.0 },
        { title: 'wp1', hours: 1.0 },
        { title: 'wp1', hours: 2.0 },
      ],
      created_at: new Date().toISOString(),
      sent_at: new Date().toISOString(),
    },
  ];

  const messages = [
    {
      id: 'msg-pace-2-1',
      conversation_id: 'conv-proj-pace-2',
      project_id: 'proj-pace-2',
      author_id: 'user-musfiqur-s',
      author_name: 'Musfiqur Rahman (QA)',
      author_is_management: false,
      content_json: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: '📋 Estimate Scope v1.0 (28.00 hrs) has been sent to client. Management can review and approve directly from this thread.',
              },
            ],
          },
        ],
      },
      event_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_edited: false,
      is_deleted: false,
      attachments: [],
      estimate_version_id: 'ver-pace-2-1',
      estimate_card: {
        version_id: 'ver-pace-2-1',
        package_title: 'wp test 4',
        version_number: 1,
        total_hours: 28.0,
        status: 'pending',
        items: [
          { title: 'wp1', hours: 12.0 },
          { title: 'wp1', hours: 13.0 },
          { title: 'wp1', hours: 1.0 },
          { title: 'wp1', hours: 2.0 },
        ],
      },
    },
  ];

  const financials = {
    'proj-pace-2': {
      project_id: 'proj-pace-2',
      internal_budget_hours: null,
      internal_budget_amount_usd: null,
      internal_budget_amount_bdt: null,
      internal_cost_rate_usd_per_hour: null,
      internal_cost_rate_bdt_per_hour: null,
      client_rate_usd_per_hour: null,
      client_rate_bdt_per_hour: null,
      currency_rate_mode: 'independent_rates',
      updated_at: new Date().toISOString(),
    },
  };

  const records = [
    { key: 'clients', value: clients },
    { key: 'projects', value: projects },
    { key: 'packages', value: packages },
    { key: 'versions', value: versions },
    { key: 'messages', value: messages },
    { key: 'financials', value: financials },
    { key: 'work_orders', value: [] },
  ];

  for (const r of records) {
    const { error } = await client.from('app_workspace_data').upsert(r);
    if (error) {
      console.error('Failed to seed ' + r.key + ':', error.message);
    } else {
      console.log('Successfully seeded ' + r.key);
    }
  }
}

seed().catch(console.error);
