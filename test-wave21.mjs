// Automated test suite for Wave 21:
// 1. Instant Per-Space GraphQL API (/live/:slug/graphql)
// 2. Built-in Customer Support Ticket & Helpdesk Engine (/live/:slug/tickets & /live/:slug/tickets/:id/reply)
// 3. Viral Referral & Affiliate Tracking System (/live/:slug/referrals, /live/:slug/referrals/convert, /live/:slug/ref/:code)
// 4. Dynamic OpenGraph Social Card Customizer & Live Telemetry Banner (/live/:slug/og.svg)
import assert from 'node:assert/strict';
import worker from './worker.js';

const kvStore = new Map();
const env = {
  SPACEHUB_KV: {
    async get(key, type) {
      const raw = kvStore.get(key);
      if (raw === undefined) return null;
      return type === 'json' ? JSON.parse(raw) : raw;
    },
    async put(key, value) {
      kvStore.set(key, value);
    }
  },
  ASSETS: { fetch: async () => new Response('asset') },
  PAYPAL_CLIENT_ID: 'paypal-client-id',
  PAYPAL_CLIENT_SECRET: 'paypal-client-secret',
  PAYPAL_MODE: 'sandbox',
  ADMIN_USERNAMES: 'adminuser',
  VAULT_ENCRYPTION_KEY: 'test-vault-secret-encryption-seed'
};

async function handle(path, init = {}, auth = null) {
  const headers = new Headers(init.headers || {});
  if (auth && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${auth}`);
  }
  const req = new Request(`https://spacehub.win${path}`, { ...init, headers });
  return worker.fetch(req, env);
}

async function runTests() {
  console.log('--- RUNNING WAVE 21 TESTS ---');

  // Register test creator
  const regRes = await handle('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'wave21builder',
      password: 'Wave21Password!',
      displayName: 'Wave 21 Builder'
    })
  });
  assert.equal(regRes.status, 201);
  const { token } = await regRes.json();

  // Create & Deploy Space
  const createRes = await handle('/api/spaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Wave 21 Cloud OS',
      description: 'Testing GraphQL, Helpdesk Tickets, Referral Engine, and Dynamic OG Cards',
      visibility: 'public',
      templateId: 'dashboard'
    })
  }, token);
  assert.equal(createRes.status, 201);
  const { space } = await createRes.json();
  const { ownerUsername, slug } = space;

  const deployRes = await handle(`/api/spaces/${ownerUsername}/${slug}/deploy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'spacehub_edge' })
  }, token);
  assert.equal(deployRes.status, 200);

  // 1. Instant Per-Space GraphQL API (/live/:slug/graphql)
  console.log('1. Testing Instant Per-Space GraphQL API (/live/:slug/graphql)...');
  const gqlMutationRes = await handle(`/live/${slug}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        mutation SeedData($record: JSON) {
          insertRow(table: "customers", record: $record)
          setStorage(key: "theme_mode", value: "cyberpunk")
          upsertVector(id: "vec-gql-1", text: "GraphQL query and mutation engine on the edge", namespace: "docs")
        }
      `,
      variables: {
        record: { id: 'cust_101', name: 'Ada Lovelace', plan: 'enterprise' }
      }
    })
  });
  assert.equal(gqlMutationRes.status, 200);
  const gqlMutData = await gqlMutationRes.json();
  assert.equal(gqlMutData.data.insertRow.id, 'cust_101');
  assert.equal(gqlMutData.data.insertRow.name, 'Ada Lovelace');
  assert.equal(gqlMutData.data.setStorage.value, 'cyberpunk');
  assert.equal(gqlMutData.data.upsertVector.id, 'vec-gql-1');

  const gqlQueryRes = await handle(`/live/${slug}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        query FetchEverything {
          __schema
          spaceInfo
          table(name: "customers", limit: 10)
          storage(key: "theme_mode")
          vectors(query: "GraphQL mutation engine", topK: 1, namespace: "docs")
        }
      `
    })
  });
  assert.equal(gqlQueryRes.status, 200);
  const gqlQueryData = await gqlQueryRes.json();
  assert.ok(gqlQueryData.data.__schema);
  assert.equal(gqlQueryData.data.spaceInfo.slug, slug);
  assert.equal(gqlQueryData.data.table.length, 1);
  assert.equal(gqlQueryData.data.table[0].name, 'Ada Lovelace');
  assert.equal(gqlQueryData.data.storage.value, 'cyberpunk');
  assert.equal(gqlQueryData.data.vectors[0].id, 'vec-gql-1');

  // 2. Built-in Customer Support Ticket & Helpdesk Engine (/live/:slug/tickets)
  console.log('2. Testing Customer Support Ticket & Helpdesk Engine (/live/:slug/tickets)...');
  const openTicketRes = await handle(`/live/${slug}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: 'Need SSO SAML Configuration Help',
      name: 'Grace Hopper',
      email: 'grace@navy.mil',
      priority: 'high',
      category: 'enterprise_sso',
      message: 'How do we upload our IdP metadata XML?'
    })
  });
  assert.equal(openTicketRes.status, 201);
  const openTicketData = await openTicketRes.json();
  const ticketId = openTicketData.ticket.id;
  assert.equal(openTicketData.ticket.status, 'open');
  assert.equal(openTicketData.ticket.priority, 'high');

  // Agent (Space Owner) replies to ticket -> calculates firstResponseMs & updates status
  const agentReplyRes = await handle(`/live/${slug}/tickets/${ticketId}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'You can upload your SAML XML under Settings -> Security -> Enterprise SSO.',
      status: 'resolved'
    })
  }, token);
  assert.equal(agentReplyRes.status, 200);
  const agentReplyData = await agentReplyRes.json();
  assert.equal(agentReplyData.reply.role, 'agent');
  assert.equal(agentReplyData.ticket.status, 'resolved');
  assert.ok(typeof agentReplyData.ticket.firstResponseMs === 'number' && agentReplyData.ticket.firstResponseMs >= 1);

  const listTicketsRes = await handle(`/live/${slug}/tickets`);
  assert.equal(listTicketsRes.status, 200);
  const listTicketsData = await listTicketsRes.json();
  assert.equal(listTicketsData.count, 1);
  assert.equal(listTicketsData.resolvedCount, 1);

  // 3. Viral Referral & Affiliate Tracking System (/live/:slug/referrals & /live/:slug/ref/:code)
  console.log('3. Testing Viral Referral & Affiliate Tracking System (/live/:slug/referrals)...');
  const createRefRes = await handle(`/live/${slug}/referrals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'CREATOR25',
      referrerName: 'Tech Creator',
      referrerEmail: 'creator@youtube.com',
      commissionRate: 25
    })
  });
  assert.equal(createRefRes.status, 201);
  const createRefData = await createRefRes.json();
  assert.equal(createRefData.referral.code, 'CREATOR25');
  assert.equal(createRefData.referral.commissionRate, 25);

  const visitRefRes = await handle(`/live/${slug}/ref/CREATOR25`);
  assert.equal(visitRefRes.status, 302);
  assert.ok((visitRefRes.headers.get('location') || '').includes('ref=CREATOR25'));
  assert.ok((visitRefRes.headers.get('set-cookie') || '').includes(`sh_ref_${slug}=CREATOR25`));

  const convertRefRes = await handle(`/live/${slug}/referrals/convert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `sh_ref_${slug}=CREATOR25`
    },
    body: JSON.stringify({
      amountUsd: 200,
      customerEmail: 'newbuyer@startup.io',
      orderId: 'ord_999'
    })
  });
  assert.equal(convertRefRes.status, 200);
  const convertRefData = await convertRefRes.json();
  assert.equal(convertRefData.referral.clicks, 1);
  assert.equal(convertRefData.referral.conversions, 1);
  assert.equal(convertRefData.referral.revenueUsd, 200);
  assert.equal(convertRefData.referral.commissionEarnedUsd, 50); // 25% of $200

  const refLeaderboardRes = await handle(`/live/${slug}/referrals`);
  assert.equal(refLeaderboardRes.status, 200);
  const refLeaderboardData = await refLeaderboardRes.json();
  assert.equal(refLeaderboardData.totalClicks, 1);
  assert.equal(refLeaderboardData.totalConversions, 1);
  assert.equal(refLeaderboardData.totalRevenueUsd, 200);
  assert.equal(refLeaderboardData.totalCommissionUsd, 50);

  // 4. Dynamic OpenGraph Social Card Customizer & Live Telemetry Banner (/live/:slug/og.svg)
  console.log('4. Testing Dynamic OpenGraph Social Card Customizer (/live/:slug/og.svg)...');
  const ogRes = await handle(`/live/${slug}/og.svg?title=Custom+Launch+Card&badge=V2+RELEASE&theme=%2310b981`);
  assert.equal(ogRes.status, 200);
  const ogSvg = await ogRes.text();
  assert.ok(ogSvg.includes('Custom Launch Card'));
  assert.ok(ogSvg.includes('V2 RELEASE'));
  assert.ok(ogSvg.includes('#10b981'));
  assert.ok(ogSvg.includes('Operational (99.98%)'));

  console.log('WAVE 21 TESTS PASSED!');
}

runTests().catch((err) => {
  console.error('Wave 21 Test Failed:', err);
  process.exit(1);
});
