// Automated test suite for Wave 16:
// 1. Built-in Edge Key-Value TTL Cache API (/live/:slug/cache & /live/:slug/cache/:key)
// 2. Space Embed Widget & Iframe SDK (/live/:slug/embed.js)
// 3. Automated Lighthouse / SEO & Accessibility Audit & 1-Click Auto-Fix (/api/spaces/:owner/:slug/seo-audit)
// 4. Custom Shortlinks & Vector QR Code Generator per Space (/live/:slug/qr.svg)
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
  console.log('--- RUNNING WAVE 16 TESTS ---');

  // Register test creator
  const regRes = await handle('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'wave16creator',
      password: 'Wave16Password!',
      displayName: 'Wave 16 Pioneer'
    })
  });
  assert.equal(regRes.status, 201);
  const { token } = await regRes.json();

  // Create Space with bare HTML missing SEO/A11y tags (for audit + auto-fix test)
  const createRes = await handle('/api/spaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Wave 16 Super App',
      description: 'Next-gen cloud workspace app on SpaceHub',
      visibility: 'public',
      templateId: 'kanban',
      files: {
        'index.html': '<html><head></head><body><h1>Wave 16 App</h1><img src="hero.png"></body></html>'
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

  // 1. Test Built-in Edge Key-Value TTL Cache API
  console.log('1. Testing Built-in Edge Key-Value TTL Cache API (/live/:slug/cache)...');
  // Miss before storing
  const missRes = await handle(`/live/${slug}/cache/weather_sydney`);
  assert.equal(missRes.status, 200);
  assert.equal(missRes.headers.get('x-cache-status'), 'MISS');
  const missData = await missRes.json();
  assert.equal(missData.hit, false);

  // Store cached value with TTL
  const storeRes = await handle(`/live/${slug}/cache/weather_sydney?ttl=120`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      value: { tempC: 24, condition: 'Sunny' }
    })
  });
  assert.equal(storeRes.status, 200);
  assert.equal(storeRes.headers.get('x-cache-status'), 'STORED');
  const storeData = await storeRes.json();
  assert.equal(storeData.ttl, 120);

  // Hit after storing
  const hitRes = await handle(`/live/${slug}/cache/weather_sydney`);
  assert.equal(hitRes.status, 200);
  assert.equal(hitRes.headers.get('x-cache-status'), 'HIT');
  const hitData = await hitRes.json();
  assert.equal(hitData.hit, true);
  assert.equal(hitData.value.tempC, 24);
  assert.ok(hitData.ttlRemaining > 0 && hitData.ttlRemaining <= 120);

  // List cache keys
  const listCacheRes = await handle(`/live/${slug}/cache`);
  assert.equal(listCacheRes.status, 200);
  const listCacheData = await listCacheRes.json();
  assert.equal(listCacheData.count, 1);

  // Delete cache key
  const delCacheRes = await handle(`/live/${slug}/cache/weather_sydney`, {
    method: 'DELETE'
  });
  assert.equal(delCacheRes.status, 200);
  const delCacheData = await delCacheRes.json();
  assert.equal(delCacheData.count, 0);

  // 2. Test Space Embed Widget & Iframe SDK (/live/:slug/embed.js)
  console.log('2. Testing Space Embed Widget & Iframe SDK (/live/:slug/embed.js)...');
  const embedRes = await handle(`/live/${slug}/embed.js`);
  assert.equal(embedRes.status, 200);
  assert.ok(embedRes.headers.get('content-type')?.includes('application/javascript'));
  assert.equal(embedRes.headers.get('access-control-allow-origin'), '*');
  const embedJs = await embedRes.text();
  assert.ok(embedJs.includes(`https://spacehub.win/live/${slug}?embed=1`));
  assert.ok(embedJs.includes('spacehub:resize'));

  // 3. Test Automated Lighthouse / SEO & Accessibility Audit & 1-Click Auto-Fix
  console.log('3. Testing Automated Lighthouse / SEO & Accessibility Audit & 1-Click Auto-Fix...');
  const auditBeforeRes = await handle(`/api/spaces/${ownerUsername}/${slug}/seo-audit`, {}, token);
  assert.equal(auditBeforeRes.status, 200);
  const auditBefore = await auditBeforeRes.json();
  assert.ok(auditBefore.score < 50, 'Initial bare HTML should score under 50');
  assert.ok(auditBefore.issues.length >= 5);

  // Run 1-Click Auto-Fix
  const autoFixRes = await handle(`/api/spaces/${ownerUsername}/${slug}/seo-audit`, {
    method: 'POST'
  }, token);
  assert.equal(autoFixRes.status, 200);
  const autoFixData = await autoFixRes.json();
  assert.equal(autoFixData.fixed, true);
  assert.equal(autoFixData.score, 100);
  assert.equal(autoFixData.grade, 'A');
  assert.equal(autoFixData.issues.length, 0);

  // 4. Test Custom Shortlinks & Vector QR Code Generator per Space (/live/:slug/qr.svg)
  console.log('4. Testing Vector QR Code Generator (/live/:slug/qr.svg)...');
  const qrRes = await handle(`/live/${slug}/qr.svg?fg=%23818cf8`);
  assert.equal(qrRes.status, 200);
  assert.ok(qrRes.headers.get('content-type')?.includes('image/svg+xml'));
  const qrSvg = await qrRes.text();
  assert.ok(qrSvg.includes('<svg'));
  assert.ok(qrSvg.includes(`data-url="https://spacehub.win/live/${slug}"`));
  assert.ok(qrSvg.includes('#818cf8'));

  console.log('WAVE 16 TESTS PASSED!');
}

runTests().catch((err) => {
  console.error('Wave 16 Test Failed:', err);
  process.exit(1);
});
