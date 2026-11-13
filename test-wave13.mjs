// Automated test suite for Wave 13:
// 1. Dynamic OpenGraph & Social Preview Card Generator (/live/:slug/og.svg)
// 2. Space Secrets Encryption at Rest (AES-GCM)
// 3. PWA Offline Mode & Background Sync (sw.js v2)
// 4. Custom 404 & Maintenance Page Builder (404.html, maintenance.html)
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
  console.log('--- RUNNING WAVE 13 TESTS ---');

  // Register test user
  const regRes = await handle('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'wave13master',
      password: 'Wave13Password!',
      displayName: 'Wave 13 Master Tester'
    })
  });
  assert.equal(regRes.status, 201);
  const { token, user } = await regRes.json();
  assert.ok(token);

  // 1. Create Space with Custom 404 and Maintenance Pages
  const custom404Html = '<!DOCTYPE html><html><body><h1>Custom 404 Nowhere Found</h1></body></html>';
  const customMaintHtml = '<!DOCTYPE html><html><body><h1>Custom Maintenance Down For Upgrade</h1></body></html>';

  const createRes = await handle('/api/spaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Wave 13 Flagship App',
      visibility: 'public',
      templateId: 'kanban',
      files: {
        'index.html': '<!DOCTYPE html><html><head><title>Wave 13 Live</title></head><body><h1>Welcome</h1></body></html>',
        'style.css': 'body { background: #000; color: #fff; }',
        'script.js': 'console.log("ready");',
        '404.html': custom404Html,
        'maintenance.html': customMaintHtml
      }
    })
  }, token);
  assert.equal(createRes.status, 201);
  const { space } = await createRes.json();
  const { ownerUsername, slug } = space;

  // Deploy space to publish files
  const depRes = await handle(`/api/spaces/${ownerUsername}/${slug}/deploy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'spacehub_edge' })
  }, token);
  assert.equal(depRes.status, 200);

  // 1. Dynamic OpenGraph Social Preview Card Tests
  console.log('1. Testing Dynamic OpenGraph & Social Preview Card Generator...');
  const ogRes = await handle(`/live/${slug}/og.svg`);
  assert.equal(ogRes.status, 200);
  assert.ok(ogRes.headers.get('content-type')?.includes('image/svg+xml'));
  const ogSvg = await ogRes.text();
  assert.ok(ogSvg.includes('<svg'));
  assert.ok(ogSvg.includes('Wave 13 Flagship App'));
  assert.ok(ogSvg.includes('@wave13master'));
  assert.ok(ogSvg.includes('SPACEHUB LIVE'));

  // Verify og:image injection in live page HTML
  const pageRes = await handle(`/live/${slug}`);
  assert.equal(pageRes.status, 200);
  const pageHtml = await pageRes.text();
  assert.ok(pageHtml.includes(`content="https://spacehub.win/live/${slug}/og.svg"`));
  assert.ok(pageHtml.includes('content="summary_large_image"'));

  // 2. Space Secrets Encryption at Rest Tests
  console.log('2. Testing Space Secrets Encryption at Rest (AES-GCM)...');
  const putSecRes = await handle(`/api/spaces/${ownerUsername}/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secrets: 'STRIPE_API_KEY=sk_live_verysecret123\nINTERNAL_TOKEN=tok_supersecret456'
    })
  }, token);
  assert.equal(putSecRes.status, 200);

  // Read raw database state from KV to prove encryption at rest!
  const rawState = await env.SPACEHUB_KV.get(KV_KEY, 'json');
  const dbSpace = (rawState.spaces || []).find((s) => s.slug === slug);
  assert.ok(dbSpace);
  assert.ok(dbSpace.secrets);
  assert.ok(dbSpace.secrets.STRIPE_API_KEY.startsWith('enc:v1:'), 'Secret must be encrypted with enc:v1:');
  assert.ok(dbSpace.secrets.INTERNAL_TOKEN.startsWith('enc:v1:'), 'Secret must be encrypted with enc:v1:');
  assert.ok(!dbSpace.secrets.STRIPE_API_KEY.includes('sk_live_verysecret123'), 'Plaintext secret must NOT exist in raw state');

  // Verify proxy decrypts and replaces secret placeholder with mock target
  const proxyRes = await handle(`/live/${slug}/proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'mock://api.service.internal/v1?token={{SECRET:INTERNAL_TOKEN}}',
      method: 'GET'
    })
  });
  assert.equal(proxyRes.status, 200);
  const proxyData = await proxyRes.json();
  assert.ok(proxyData.ok);
  assert.equal(proxyData.data.resolvedUrl, 'mock://api.service.internal/v1?token=tok_supersecret456');

  // 3. PWA Offline Mode & Background Sync Service Worker Tests
  console.log('3. Testing PWA Offline Mode & Background Sync Service Worker...');
  const swRes = await handle(`/live/${slug}/sw.js`);
  assert.equal(swRes.status, 200);
  assert.ok(swRes.headers.get('content-type')?.includes('application/javascript'));
  const swCode = await swRes.text();
  assert.ok(swCode.includes('spacehub-app-'));
  assert.ok(swCode.includes('OFFLINE_FALLBACK'));
  assert.ok(swCode.includes('_offline_queue'));
  assert.ok(swCode.includes('/submit'));

  // 4. Custom 404 & Maintenance Page Builder Tests
  console.log('4. Testing Custom 404 & Maintenance Page Builder...');
  // Request non-existent file in space
  const notFoundRes = await handle(`/live/${slug}/missing-file-test.html`);
  assert.equal(notFoundRes.status, 404);
  const notFoundHtml = await notFoundRes.text();
  assert.ok(notFoundHtml.includes('Custom 404 Nowhere Found'));

  // Turn on Maintenance Mode
  const maintOnRes = await handle(`/api/spaces/${ownerUsername}/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ maintenanceMode: true })
  }, token);
  assert.equal(maintOnRes.status, 200);

  // Fetch as anonymous user (should see custom 503 maintenance page)
  const maintRes = await handle(`/live/${slug}`);
  assert.equal(maintRes.status, 503);
  const maintHtml = await maintRes.text();
  assert.ok(maintHtml.includes('Custom Maintenance Down For Upgrade'));

  console.log('WAVE 13 TESTS PASSED!');
}

runTests().catch((err) => {
  console.error('Wave 13 Test Failed:', err);
  process.exit(1);
});
