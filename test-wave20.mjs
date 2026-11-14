// Automated test suite for Wave 20:
// 1. Per-Space Vector Embeddings & Semantic Similarity Search (/live/:slug/vectors/upsert & /query)
// 2. Built-in URL Shortener & UTM Campaign Click Tracker (/live/:slug/links & /live/:slug/go/:code)
// 3. Canary Deployments & Weighted Traffic Splitting (/api/spaces/:owner/:slug/canary)
// 4. Per-Space Public Status Page & Uptime Incident Feed (/live/:slug/status, /status.svg, /status/incidents)
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
  console.log('--- RUNNING WAVE 20 TESTS ---');

  // Register test creator
  const regRes = await handle('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'wave20builder',
      password: 'Wave20Password!',
      displayName: 'Wave 20 Builder'
    })
  });
  assert.equal(regRes.status, 201);
  const { token } = await regRes.json();

  // Create & Deploy Space
  const createRes = await handle('/api/spaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Wave 20 Lab',
      description: 'Testing vectors, short links, canary deployments, and status pages',
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

  // 1. Per-Space Vector Embeddings & Semantic Similarity Search
  console.log('1. Testing Vector Embeddings & Semantic Similarity Search (/live/:slug/vectors)...');
  const upsertRes = await handle(`/live/${slug}/vectors/upsert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      namespace: 'kb',
      items: [
        { id: 'doc-billing', text: 'How to update your credit card, billing invoice, and subscription plan', metadata: { topic: 'billing' } },
        { id: 'doc-deploy', text: 'Deploying edge serverless workers and canary traffic routing', metadata: { topic: 'devops' } },
        { id: 'doc-auth', text: 'Configuring OAuth2 social login, password reset, and magic links', metadata: { topic: 'security' } }
      ]
    })
  });
  assert.equal(upsertRes.status, 201);
  const upsertData = await upsertRes.json();
  assert.equal(upsertData.upsertedCount, 3);
  assert.equal(upsertData.totalVectors, 3);

  const queryRes = await handle(`/live/${slug}/vectors/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      namespace: 'kb',
      query: 'credit card billing subscription invoice',
      topK: 2
    })
  });
  assert.equal(queryRes.status, 200);
  const queryData = await queryRes.json();
  assert.equal(queryData.matches.length, 2);
  assert.equal(queryData.matches[0].id, 'doc-billing', 'Top semantic match should be doc-billing');
  assert.ok(queryData.matches[0].score > queryData.matches[1].score, 'Top match should have higher cosine similarity');

  // 2. Built-in URL Shortener & UTM Campaign Click Tracker
  console.log('2. Testing URL Shortener & UTM Click Tracker (/live/:slug/links & /live/:slug/go/:code)...');
  const linkCreateRes = await handle(`/live/${slug}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'launch20',
      url: 'https://spacehub.win/explore',
      title: 'Wave 20 Launch Campaign',
      utmSource: 'newsletter',
      utmMedium: 'email',
      utmCampaign: 'wave20_release'
    })
  });
  assert.equal(linkCreateRes.status, 201);
  const linkCreateData = await linkCreateRes.json();
  assert.equal(linkCreateData.link.code, 'launch20');

  const redirectRes = await handle(`/live/${slug}/go/launch20`, {
    method: 'GET',
    headers: { Referer: 'https://news.ycombinator.com/' }
  });
  assert.equal(redirectRes.status, 302);
  const locationHeader = redirectRes.headers.get('location') || '';
  assert.ok(locationHeader.includes('utm_source=newsletter'), `Redirect location missing utm_source: ${locationHeader}`);
  assert.ok(locationHeader.includes('utm_campaign=wave20_release'), `Redirect location missing utm_campaign: ${locationHeader}`);

  const linkStatsRes = await handle(`/live/${slug}/links`);
  assert.equal(linkStatsRes.status, 200);
  const linkStatsData = await linkStatsRes.json();
  assert.equal(linkStatsData.totalClicks, 1);
  assert.equal(linkStatsData.links[0].clicks, 1);

  // 3. Canary Deployments & Weighted Traffic Splitting
  console.log('3. Testing Canary Deployments & Weighted Traffic Splitting (/api/spaces/:owner/:slug/canary)...');
  const putCanaryRes = await handle(`/api/spaces/${ownerUsername}/${slug}/canary`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      enabled: true,
      weight: 100,
      files: {
        'index.html': '<!DOCTYPE html><html><body><h1>Canary V2 Release</h1></body></html>'
      }
    })
  }, token);
  assert.equal(putCanaryRes.status, 200);
  const putCanaryData = await putCanaryRes.json();
  assert.equal(putCanaryData.canary.enabled, true);
  assert.equal(putCanaryData.canary.weight, 100);

  const canaryHitRes = await handle(`/live/${slug}`);
  assert.equal(canaryHitRes.status, 200);
  assert.equal(canaryHitRes.headers.get('x-spacehub-canary'), 'true');
  const canaryHtml = await canaryHitRes.text();
  assert.ok(canaryHtml.includes('Canary V2 Release'), 'Should serve canary index.html when weight=100');

  const promoteRes = await handle(`/api/spaces/${ownerUsername}/${slug}/canary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'promote' })
  }, token);
  assert.equal(promoteRes.status, 200);
  const promoteData = await promoteRes.json();
  assert.equal(promoteData.canary.enabled, false);

  const prodHitAfterPromoteRes = await handle(`/live/${slug}`);
  assert.equal(prodHitAfterPromoteRes.status, 200);
  assert.equal(prodHitAfterPromoteRes.headers.get('x-spacehub-canary'), 'false');
  const prodHtml = await prodHitAfterPromoteRes.text();
  assert.ok(prodHtml.includes('Canary V2 Release'), 'Promoted canary HTML should now be served as production');

  // 4. Per-Space Public Status Page & Uptime Incident Feed
  console.log('4. Testing Public Status Page, SVG Badge & Incident Feed (/live/:slug/status)...');
  const statusInitialRes = await handle(`/live/${slug}/status`);
  assert.equal(statusInitialRes.status, 200);
  const statusInitialData = await statusInitialRes.json();
  assert.equal(statusInitialData.state, 'operational');

  const badgeSvgRes = await handle(`/live/${slug}/status.svg`);
  assert.equal(badgeSvgRes.status, 200);
  const badgeSvgText = await badgeSvgRes.text();
  assert.ok(badgeSvgText.includes('<svg'), 'Status badge should return valid SVG');
  assert.ok(badgeSvgText.includes('Operational'), 'Initial badge should say Operational');

  const createIncidentRes = await handle(`/live/${slug}/status/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Upstream Database Latency',
      severity: 'major',
      status: 'investigating',
      message: 'We are investigating elevated query latency.'
    })
  }, token);
  assert.equal(createIncidentRes.status, 201);
  const createIncidentData = await createIncidentRes.json();
  assert.equal(createIncidentData.statusSummary.state, 'outage');

  const resolveIncidentRes = await handle(`/live/${slug}/status/incidents`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: createIncidentData.incident.id,
      status: 'resolved',
      message: 'Connection pool scaled and latency returned to normal.'
    })
  }, token);
  assert.equal(resolveIncidentRes.status, 200);
  const resolveIncidentData = await resolveIncidentRes.json();
  assert.equal(resolveIncidentData.statusSummary.state, 'operational');

  console.log('WAVE 20 TESTS PASSED!');
}

runTests().catch((err) => {
  console.error('Wave 20 Test Failed:', err);
  process.exit(1);
});
