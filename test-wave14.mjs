// Automated test suite for Wave 14:
// 1. Interactive Form Schema Validation (form.schema.json, 422 Unprocessable Entity)
// 2. Edge Asset Optimization & Responsive Pipeline (w, format, quality, Vary: Accept)
// 3. Granular Team Role-Based Access Control (RBAC: owner, admin, publisher, editor, viewer)
// 4. Creator Alert Rules & Notification Channels (/api/spaces/:owner/:slug/alerts & test-alert)
import assert from 'node:assert';
import worker from './worker.js';

const KV_KEY = 'spacehub_prod_state_v2';
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
  console.log('--- RUNNING WAVE 14 TESTS ---');

  // Register owner and collaborator accounts
  const regOwnerRes = await handle('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'wave14boss',
      password: 'Wave14Password!',
      displayName: 'Wave 14 Space Owner'
    })
  });
  assert.equal(regOwnerRes.status, 201);
  const { token: ownerToken } = await regOwnerRes.json();

  const regViewerRes = await handle('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'wave14viewer',
      password: 'Wave14Password!',
      displayName: 'Wave 14 ReadOnly Viewer'
    })
  });
  assert.equal(regViewerRes.status, 201);
  const { token: viewerToken } = await regViewerRes.json();

  const regPubRes = await handle('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'wave14publisher',
      password: 'Wave14Password!',
      displayName: 'Wave 14 Publisher'
    })
  });
  assert.equal(regPubRes.status, 201);
  const { token: pubToken } = await regPubRes.json();

  // Create Flagship Space with form schema & assets
  const formSchemaContent = JSON.stringify({
    required: ['email', 'name'],
    properties: {
      name: { type: 'string', minLength: 3 },
      email: { type: 'string', format: 'email' },
      plan: { enum: ['basic', 'pro', 'enterprise'] }
    }
  });

  const samplePixelPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const createRes = await handle('/api/spaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Wave 14 Team Portal',
      visibility: 'public',
      templateId: 'kanban',
      files: {
        'index.html': '<!DOCTYPE html><html><body><h1>Wave 14</h1></body></html>',
        'form.schema.json': formSchemaContent
      }
    })
  }, ownerToken);
  assert.equal(createRes.status, 201);
  const { space } = await createRes.json();
  const { ownerUsername, slug } = space;

  // Upload sample image asset
  const uploadRes = await handle(`/live/${slug}/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'banner.png',
      mimeType: 'image/png',
      dataUrl: `data:image/png;base64,${samplePixelPngBase64}`,
      size: 68
    })
  });
  assert.equal(uploadRes.status, 201);

  // 1. Test Form Schema Validation
  console.log('1. Testing Interactive Form Schema Validation...');
  // Missing required name and invalid email format
  const failSubmitRes = await handle(`/live/${slug}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'not-an-email',
      message: 'Hello World'
    })
  });
  assert.equal(failSubmitRes.status, 422);
  const failSubmitData = await failSubmitRes.json();
  assert.ok(failSubmitData.error);
  assert.ok(failSubmitData.details.some((e) => e.includes('Field "name" is required')));
  assert.ok(failSubmitData.details.some((e) => e.includes('must be a valid email address')));

  // Valid submission satisfying schema
  const passSubmitRes = await handle(`/live/${slug}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice Johnson',
      email: 'alice@example.com',
      plan: 'pro'
    })
  });
  assert.equal(passSubmitRes.status, 201);
  const passSubmitData = await passSubmitRes.json();
  assert.ok(passSubmitData.ok);
  assert.ok(passSubmitData.submission?.id);

  // 2. Test Edge Asset Optimization & Responsive Pipeline
  console.log('2. Testing Edge Asset Optimization & Responsive Pipeline...');
  const assetOptRes = await handle(`/live/${slug}/assets/banner.png?w=800&format=webp&q=85`);
  assert.equal(assetOptRes.status, 200);
  assert.equal(assetOptRes.headers.get('content-type'), 'image/webp');
  assert.equal(assetOptRes.headers.get('x-optimized-width'), '800');
  assert.equal(assetOptRes.headers.get('x-optimized-format'), 'webp');
  assert.equal(assetOptRes.headers.get('x-optimized-quality'), '85');
  assert.equal(assetOptRes.headers.get('vary'), 'Accept');

  // 3. Test Granular Team Role-Based Access Control (RBAC)
  console.log('3. Testing Granular Team Role-Based Access Control (RBAC)...');
  // Configure team members with distinct roles
  const setTeamRes = await handle(`/api/spaces/${ownerUsername}/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      collaborators: [
        { username: 'wave14viewer', role: 'viewer' },
        { username: 'wave14publisher', role: 'publisher' }
      ]
    })
  }, ownerToken);
  assert.equal(setTeamRes.status, 200);

  // Viewer cannot edit draft files (403)
  const viewerEditRes = await handle(`/api/spaces/${ownerUsername}/${slug}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      draftFiles: { 'index.html': '<h1>Hacked by Viewer</h1>' }
    })
  }, viewerToken);
  assert.equal(viewerEditRes.status, 403);

  // Viewer can view summary and sees their role
  const viewerSummaryRes = await handle(`/api/spaces/${ownerUsername}/${slug}`, {}, viewerToken);
  assert.equal(viewerSummaryRes.status, 200);
  const { space: vSpace } = await viewerSummaryRes.json();
  assert.equal(vSpace.myRole, 'viewer');

  // Publisher cannot reconfigure team/collaborators (only Owner/Admin can)
  const pubAdminRes = await handle(`/api/spaces/${ownerUsername}/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      collaborators: ['wave14viewer']
    })
  }, pubToken);
  // Collaborators and team members should remain unchanged by non-admin
  const checkCollabsRes = await handle(`/api/spaces/${ownerUsername}/${slug}`, {}, ownerToken);
  const { space: oSpace } = await checkCollabsRes.json();
  assert.equal(oSpace.collaborators.length, 2);
  assert.equal(oSpace.teamMembers.length, 2);
  assert.equal(oSpace.teamMembers[0].role, 'viewer');
  assert.equal(oSpace.teamMembers[1].role, 'publisher');

  // Publisher CAN publish/deploy space to live edge!
  const pubDeployRes = await handle(`/api/spaces/${ownerUsername}/${slug}/deploy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'spacehub_edge' })
  }, pubToken);
  assert.equal(pubDeployRes.status, 200);
  const pubDeployData = await pubDeployRes.json();
  assert.ok(pubDeployData.releaseId);
  assert.equal(pubDeployData.space.status, 'published');

  // 4. Test Creator Alert Rules & Notification Channels
  console.log('4. Testing Creator Alert Rules & Notification Channels...');
  // Configure traffic spike and error alert rules
  const setAlertsRes = await handle(`/api/spaces/${ownerUsername}/${slug}/alerts`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      enabled: true,
      trafficSpikeThreshold: 1000,
      errorAlerts: true,
      notifyWebhookUrl: 'mock://alerts.service.internal/webhook',
      channel: 'webhook'
    })
  }, ownerToken);
  assert.equal(setAlertsRes.status, 200);
  const { alerts } = await setAlertsRes.json();
  assert.equal(alerts.trafficSpikeThreshold, 1000);
  assert.equal(alerts.channel, 'webhook');

  // Dispatch live alert test
  const testAlertRes = await handle(`/api/spaces/${ownerUsername}/${slug}/test-alert`, {
    method: 'POST'
  }, ownerToken);
  assert.equal(testAlertRes.status, 200);
  const testAlertData = await testAlertRes.json();
  assert.ok(testAlertData.ok);
  assert.ok(testAlertData.status.startsWith('delivered_mock:'));

  console.log('WAVE 14 TESTS PASSED!');
}

runTests().catch((err) => {
  console.error('Wave 14 Test Failed:', err);
  process.exit(1);
});
