// Automated test suite for Wave 19:
// 1. Built-in Cron & Background Job Queue API per Space (/live/:slug/jobs & /live/:slug/jobs/run)
// 2. Per-Space Full-Text Search Index & Faceted Search Engine (/live/:slug/search/index & /live/:slug/search)
// 3. Live API Request Inspector & Replay Debugger (/api/spaces/:owner/:slug/inspector & /replay)
// 4. Space Monetization License Key Generator & Verification API (/live/:slug/licenses & /verify)
import assert from 'node:assert';
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
  console.log('--- RUNNING WAVE 19 TESTS ---');

  // Register test creator
  const regRes = await handle('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'wave19builder',
      password: 'Wave19Password!',
      displayName: 'Wave 19 Builder'
    })
  });
  assert.equal(regRes.status, 201);
  const { token } = await regRes.json();

  // Create & Deploy Space
  const createRes = await handle('/api/spaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Wave 19 Cloud Suite',
      description: 'Background jobs, faceted search index, request inspector, and license keys',
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

  // 1. Test Built-in Cron & Background Job Queue API (/live/:slug/jobs)
  console.log('1. Testing Built-in Cron & Background Job Queue API (/live/:slug/jobs)...');
  const enqueueRes = await handle(`/live/${slug}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'generate_monthly_invoice_pdf',
      payload: { customerId: 'cust_88', plan: 'enterprise' },
      webhookUrl: 'mock://worker.internal/invoice-pdf',
      delaySeconds: 0,
      maxRetries: 2
    })
  });
  assert.equal(enqueueRes.status, 201);
  const enqueueData = await enqueueRes.json();
  assert.ok(enqueueData.job.id.startsWith('job_'));
  assert.equal(enqueueData.job.status, 'queued');

  // Execute queued background jobs
  const runJobsRes = await handle(`/live/${slug}/jobs/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(runJobsRes.status, 200);
  const runJobsData = await runJobsRes.json();
  assert.equal(runJobsData.processedCount, 1);
  assert.equal(runJobsData.processed[0].status, 'completed');
  assert.equal(runJobsData.processed[0].attempts, 1);

  // Verify job status lookup
  const checkJobRes = await handle(`/live/${slug}/jobs?id=${enqueueData.job.id}`);
  assert.equal(checkJobRes.status, 200);
  const checkJobData = await checkJobRes.json();
  assert.equal(checkJobData.job.status, 'completed');

  // 2. Test Per-Space Full-Text Search Index & Faceted Search Engine (/live/:slug/search/index)
  console.log('2. Testing Per-Space Full-Text Search Index & Faceted Search (/live/:slug/search/index)...');
  const indexRes = await handle(`/live/${slug}/search/index`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documents: [
        {
          id: 'doc_api_auth',
          title: 'Zero-Trust Edge Authentication Guide',
          body: 'Learn how to configure passwordless OTP magic links and JWT verification on SpaceHub.',
          tags: ['security', 'auth', 'guide'],
          url: `/live/${slug}/docs/auth`
        },
        {
          id: 'doc_billing',
          title: 'Subscription & License Key Monetization',
          body: 'Issue cryptographic license keys and accept PayPal or Stripe checkouts in minutes.',
          tags: ['billing', 'monetization', 'guide'],
          url: `/live/${slug}/docs/billing`
        }
      ]
    })
  });
  assert.equal(indexRes.status, 201);
  const indexData = await indexRes.json();
  assert.equal(indexData.indexedCount, 2);
  assert.equal(indexData.facets.tags.guide, 2);
  assert.equal(indexData.facets.tags.security, 1);

  // Query weighted full-text search with tag facet filter
  const searchRes = await handle(`/live/${slug}/search?q=passwordless+OTP&tag=security`);
  assert.equal(searchRes.status, 200);
  const searchData = await searchRes.json();
  assert.ok(searchData.count >= 1);
  assert.equal(searchData.results[0].id, 'doc_api_auth');
  assert.ok(searchData.results[0].score >= 5);

  // 3. Test Space Monetization License Key Generator & Verification API (/live/:slug/licenses)
  console.log('3. Testing Space Monetization License Key Generator & Verification API (/live/:slug/licenses)...');
  const createLicRes = await handle(`/live/${slug}/licenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerEmail: 'buyer@enterprise.io',
      customerName: 'Acme Corp',
      tier: 'lifetime_pro',
      maxActivations: 2,
      metadata: { seats: 10 }
    })
  }, token);
  assert.equal(createLicRes.status, 201);
  const createLicData = await createLicRes.json();
  const licenseKey = createLicData.license.key;
  assert.ok(licenseKey.startsWith('sh_lic_'));

  // Activate on Device 1 -> Valid
  const verify1Res = await handle(`/live/${slug}/licenses/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: licenseKey, deviceId: 'macbook-pro-m3' })
  });
  assert.equal(verify1Res.status, 200);
  const verify1Data = await verify1Res.json();
  assert.equal(verify1Data.valid, true);
  assert.equal(verify1Data.license.activations, 1);

  // Activate on Device 2 -> Valid
  const verify2Res = await handle(`/live/${slug}/licenses/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: licenseKey, deviceId: 'iphone-16-pro' })
  });
  assert.equal(verify2Res.status, 200);
  const verify2Data = await verify2Res.json();
  assert.equal(verify2Data.license.activations, 2);

  // Activate on Device 3 -> Exceeds maxActivations (2) -> 403
  const verify3Res = await handle(`/live/${slug}/licenses/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: licenseKey, deviceId: 'unauthorized-third-device' })
  });
  assert.equal(verify3Res.status, 403);
  const verify3Data = await verify3Res.json();
  assert.equal(verify3Data.valid, false);
  assert.equal(verify3Data.reason, 'max_activations_reached');

  // 4. Test Live API Request Inspector & Replay Debugger (/api/spaces/:owner/:slug/inspector)
  console.log('4. Testing Live API Request Inspector & Replay Debugger (/api/spaces/:owner/:slug/inspector)...');
  // Submit a form so it's logged in the Request Inspector
  const subRes = await handle(`/live/${slug}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ name: 'Inspector Tester', email: 'inspector@spacehub.win', message: 'First submission' })
  });
  assert.equal(subRes.status, 201);

  // Fetch recorded inspector logs
  const inspRes = await handle(`/api/spaces/${ownerUsername}/${slug}/inspector`, {}, token);
  assert.equal(inspRes.status, 200);
  const inspData = await inspRes.json();
  assert.ok(inspData.count >= 3);
  const submitLog = inspData.logs.find((l) => l.path.endsWith('/submit'));
  assert.ok(submitLog, 'Expected /submit request to be captured in inspector logs');

  // Replay the captured /submit request via 1-Click Replay
  const replayRes = await handle(`/api/spaces/${ownerUsername}/${slug}/inspector/replay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ logId: submitLog.id })
  }, token);
  assert.equal(replayRes.status, 200);
  const replayData = await replayRes.json();
  assert.equal(replayData.replayed, true);
  assert.equal(replayData.status, 201);
  assert.equal(replayData.originalLogId, submitLog.id);

  console.log('WAVE 19 TESTS PASSED!');
}

runTests().catch((err) => {
  console.error('Wave 19 Test Failed:', err);
  process.exit(1);
});
