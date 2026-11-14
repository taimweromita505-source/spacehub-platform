// Automated test suite for Wave 18:
// 1. Built-in Webhooks & Event Bus Subscription System (/live/:slug/webhooks & HMAC-SHA256 signature)
// 2. Per-Space Magic Link & OTP Passwordless Auth for App Members (/live/:slug/auth/otp)
// 3. Edge Rate-Limiting & Bot Protection Firewall per Space (firewall.json)
// 4. Live App Performance & Core Web Vitals Telemetry (/live/:slug/vitals)
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
  console.log('--- RUNNING WAVE 18 TESTS ---');

  // Register test creator
  const regRes = await handle('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'wave18architect',
      password: 'Wave18Password!',
      displayName: 'Wave 18 Architect'
    })
  });
  assert.equal(regRes.status, 201);
  const { token } = await regRes.json();

  // Create Space with firewall.json
  const firewallJson = JSON.stringify({
    enabled: true,
    blockedIps: ['203.0.113.99'],
    blockedCountries: ['XX'],
    blockedUserAgents: ['EvilScraperBot/1.0'],
    requireApiKey: ''
  });

  const createRes = await handle('/api/spaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Wave 18 Fortress App',
      description: 'Event bus, OTP auth, edge firewall, and Core Web Vitals',
      visibility: 'public',
      templateId: 'kanban',
      files: {
        'index.html': '<!DOCTYPE html><html lang="en"><head><title>Wave 18</title></head><body><h1>Wave 18 Live</h1></body></html>',
        'firewall.json': firewallJson
      }
    })
  }, token);
  assert.equal(createRes.status, 201);
  const { space } = await createRes.json();
  const { ownerUsername, slug } = space;

  // Deploy Space
  const deployRes = await handle(`/api/spaces/${ownerUsername}/${slug}/deploy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'spacehub_edge' })
  }, token);
  assert.equal(deployRes.status, 200);

  // 1. Test Built-in Webhooks & Event Bus Subscription System with HMAC-SHA256
  console.log('1. Testing Built-in Webhooks & Event Bus Subscription System (/live/:slug/webhooks)...');
  const addSubRes = await handle(`/live/${slug}/webhooks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'mock://hooks.zapier.internal/catch/12345',
      events: ['form.submitted', 'order.completed'],
      secret: 'whsec_wave18_super_secret'
    })
  }, token);
  assert.equal(addSubRes.status, 201);
  const addSubData = await addSubRes.json();
  assert.equal(addSubData.count, 1);
  assert.ok(addSubData.subscription.id.startsWith('wh_'));

  // Dispatch custom event via /webhooks/dispatch
  const dispRes = await handle(`/live/${slug}/webhooks/dispatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'order.completed',
      data: { orderId: 'ord_999', amountUsd: 49 }
    })
  });
  assert.equal(dispRes.status, 200);
  const dispData = await dispRes.json();
  assert.equal(dispData.deliveredCount, 1);
  assert.ok(dispData.deliveries[0].signature.startsWith('sha256='));
  assert.ok(dispData.deliveries[0].status.startsWith('delivered_mock:'));

  // Trigger automatic event bus on form submission
  await handle(`/live/${slug}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Eve', email: 'eve@example.com', message: 'Testing Event Bus' })
  });
  const listSubsRes = await handle(`/live/${slug}/webhooks`, {}, token);
  const listSubsData = await listSubsRes.json();
  assert.ok(listSubsData.subscriptions[0].lastDeliveryAt);

  // 2. Test Per-Space Magic Link & OTP Passwordless Auth for App Members
  console.log('2. Testing Per-Space Magic Link & OTP Passwordless Auth (/live/:slug/auth/otp)...');
  // Step A: Request 6-digit OTP
  const reqOtpRes = await handle(`/live/${slug}/auth/otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'member@spacehub.win',
      name: 'Passwordless Member'
    })
  });
  assert.equal(reqOtpRes.status, 200);
  const reqOtpData = await reqOtpRes.json();
  assert.equal(reqOtpData.sent, true);
  assert.equal(reqOtpData.codePreview.length, 6);
  assert.ok(reqOtpData.magicLinkUrl.includes('/auth/otp?token=ml_'));

  // Step B: Verify 6-digit OTP code and receive session token
  const verifyOtpRes = await handle(`/live/${slug}/auth/otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'member@spacehub.win',
      code: reqOtpData.codePreview
    })
  });
  assert.equal(verifyOtpRes.status, 200);
  const verifyOtpData = await verifyOtpRes.json();
  assert.ok(verifyOtpData.token.startsWith('as_'));
  assert.equal(verifyOtpData.user.email, 'member@spacehub.win');

  // Verify session works against /live/:slug/auth/me
  const meRes = await handle(`/live/${slug}/auth/me`, {
    headers: { Authorization: `Bearer ${verifyOtpData.token}` }
  });
  assert.equal(meRes.status, 200);
  const meData = await meRes.json();
  assert.equal(meData.user.email, 'member@spacehub.win');

  // 3. Test Edge Rate-Limiting & Bot Protection Firewall per Space (firewall.json)
  console.log('3. Testing Edge Rate-Limiting & Bot Protection Firewall (firewall.json)...');
  // Normal visitor is allowed
  const okVisitRes = await handle(`/live/${slug}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 Chrome/125.0' }
  });
  assert.equal(okVisitRes.status, 200);

  // Blocked User-Agent is rejected with 403
  const botVisitRes = await handle(`/live/${slug}`, {
    headers: { 'User-Agent': 'EvilScraperBot/1.0 (+http://badbot.example)' }
  });
  assert.equal(botVisitRes.status, 403);
  const botVisitData = await botVisitRes.json();
  assert.equal(botVisitData.reason, 'blocked_user_agent');

  // Blocked IP is rejected with 403
  const ipVisitRes = await handle(`/live/${slug}`, {
    headers: { 'CF-Connecting-IP': '203.0.113.99' }
  });
  assert.equal(ipVisitRes.status, 403);
  const ipVisitData = await ipVisitRes.json();
  assert.equal(ipVisitData.reason, 'blocked_ip');

  // 4. Test Live App Performance & Core Web Vitals Telemetry (/live/:slug/vitals)
  console.log('4. Testing Live App Performance & Core Web Vitals Telemetry (/live/:slug/vitals)...');
  const postVitalsRes = await handle(`/live/${slug}/vitals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      metrics: [
        { metric: 'LCP', value: 1450, path: '/' },
        { metric: 'LCP', value: 1820, path: '/' },
        { metric: 'CLS', value: 0.03, path: '/' },
        { metric: 'INP', value: 96, path: '/' },
        { metric: 'TTFB', value: 110, path: '/' }
      ]
    })
  });
  assert.equal(postVitalsRes.status, 201);
  const postVitalsData = await postVitalsRes.json();
  assert.equal(postVitalsData.recorded, 5);
  assert.equal(postVitalsData.summary.LCP.rating, 'good');
  assert.equal(postVitalsData.summary.CLS.rating, 'good');
  assert.equal(postVitalsData.summary.INP.rating, 'good');

  const getVitalsRes = await handle(`/live/${slug}/vitals`);
  assert.equal(getVitalsRes.status, 200);
  const getVitalsData = await getVitalsRes.json();
  assert.equal(getVitalsData.totalSamples, 5);
  assert.ok(getVitalsData.summary.TTFB.p50 === 110);

  console.log('WAVE 18 TESTS PASSED!');
}

runTests().catch((err) => {
  console.error('Wave 18 Test Failed:', err);
  process.exit(1);
});
