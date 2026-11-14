// Automated test suite for Wave 17:
// 1. Built-in Feature Flag & Remote Experimentation Engine (/live/:slug/flags)
// 2. Per-Space Error Tracking & Client Crash Telemetry (/live/:slug/errors & /api/spaces/:owner/:slug/errors)
// 3. Multi-Language i18n & Auto-Translation Endpoint (/live/:slug/i18n & /live/:slug/i18n/:lang)
// 4. OpenAPI 3.0 / Swagger Interactive Spec Generator per Space (/live/:slug/openapi.json)
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
  console.log('--- RUNNING WAVE 17 TESTS ---');

  // Register test creator
  const regRes = await handle('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'wave17founder',
      password: 'Wave17Password!',
      displayName: 'Wave 17 Founder'
    })
  });
  assert.equal(regRes.status, 201);
  const { token } = await regRes.json();

  // Create Space with i18n dictionary
  const i18nBundle = JSON.stringify({
    en: { greeting: 'Hello World', cta: 'Launch Now' },
    es: { greeting: 'Hola Mundo', cta: 'Lanzar Ahora' },
    fr: { greeting: 'Bonjour le Monde', cta: 'Lancer' }
  });

  const createRes = await handle('/api/spaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Wave 17 Global Platform',
      description: 'Global SaaS with feature flags, i18n, error telemetry, and OpenAPI',
      visibility: 'public',
      templateId: 'kanban',
      files: {
        'index.html': '<!DOCTYPE html><html lang="en"><head><title>Wave 17</title></head><body><h1>Wave 17</h1></body></html>',
        'i18n.json': i18nBundle
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

  // 1. Test Built-in Feature Flag & Remote Experimentation Engine
  console.log('1. Testing Built-in Feature Flag & Remote Experimentation Engine (/live/:slug/flags)...');
  const setFlagsRes = await handle(`/live/${slug}/flags`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      flags: {
        darkModeV2: true,
        legacyBanner: false,
        aiBeta: { enabled: true, rollout: 0, segments: ['vip', 'beta'] },
        gradualCheckout: { enabled: true, rollout: 50, segments: [] }
      }
    })
  }, token);
  assert.equal(setFlagsRes.status, 200);

  // Evaluate for standard user vs VIP segment user
  const stdFlagRes = await handle(`/live/${slug}/flags?userKey=user_101&segment=free`);
  assert.equal(stdFlagRes.status, 200);
  const stdFlagData = await stdFlagRes.json();
  assert.equal(stdFlagData.flags.darkModeV2, true);
  assert.equal(stdFlagData.flags.legacyBanner, false);
  assert.equal(stdFlagData.flags.aiBeta, false);

  const vipFlagRes = await handle(`/live/${slug}/flags?userKey=user_101&segment=vip`);
  assert.equal(vipFlagRes.status, 200);
  const vipFlagData = await vipFlagRes.json();
  assert.equal(vipFlagData.flags.aiBeta, true);

  // 2. Test Per-Space Error Tracking & Client Crash Telemetry
  console.log('2. Testing Per-Space Error Tracking & Client Crash Telemetry (/live/:slug/errors)...');
  const reportErrRes = await handle(`/live/${slug}/errors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'TypeError: Cannot read properties of null (reading "addEventListener")',
      source: 'script.js',
      line: 42,
      col: 15,
      stack: 'TypeError: Cannot read properties of null\n    at initApp (script.js:42:15)'
    })
  });
  assert.equal(reportErrRes.status, 201);
  const reportErrData = await reportErrRes.json();
  assert.ok(reportErrData.errorId);
  assert.equal(reportErrData.count, 1);

  // Creator fetches Error Inbox via Studio API
  const listErrRes = await handle(`/api/spaces/${ownerUsername}/${slug}/errors`, {}, token);
  assert.equal(listErrRes.status, 200);
  const listErrData = await listErrRes.json();
  assert.equal(listErrData.count, 1);
  assert.ok(listErrData.errors[0].message.includes('TypeError'));

  // Clear Error Inbox
  const clearErrRes = await handle(`/api/spaces/${ownerUsername}/${slug}/errors`, {
    method: 'DELETE'
  }, token);
  assert.equal(clearErrRes.status, 200);
  const clearErrData = await clearErrRes.json();
  assert.equal(clearErrData.count, 0);

  // 3. Test Multi-Language i18n & Auto-Translation Endpoint
  console.log('3. Testing Multi-Language i18n & Auto-Translation Endpoint (/live/:slug/i18n)...');
  // Explicit path /i18n/es
  const esRes = await handle(`/live/${slug}/i18n/es`);
  assert.equal(esRes.status, 200);
  const esData = await esRes.json();
  assert.equal(esData.lang, 'es');
  assert.equal(esData.translations.greeting, 'Hola Mundo');

  // Accept-Language header negotiation (fr-FR)
  const frRes = await handle(`/live/${slug}/i18n`, {
    headers: { 'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8' }
  });
  assert.equal(frRes.status, 200);
  const frData = await frRes.json();
  assert.equal(frData.lang, 'fr');
  assert.equal(frData.translations.greeting, 'Bonjour le Monde');

  // Fallback to 'en' for unsupported locale (de)
  const deRes = await handle(`/live/${slug}/i18n/de`);
  assert.equal(deRes.status, 200);
  const deData = await deRes.json();
  assert.equal(deData.lang, 'en');
  assert.equal(deData.translations.greeting, 'Hello World');

  // 4. Test OpenAPI 3.0 Spec Generator per Space (/live/:slug/openapi.json)
  console.log('4. Testing OpenAPI 3.0 Spec Generator per Space (/live/:slug/openapi.json)...');
  // Insert a row into a custom table first so it appears in OpenAPI paths
  await handle(`/live/${slug}/db/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Acme Corp' })
  });

  const openApiRes = await handle(`/live/${slug}/openapi.json`);
  assert.equal(openApiRes.status, 200);
  const spec = await openApiRes.json();
  assert.equal(spec.openapi, '3.0.3');
  assert.ok(spec.info.title.includes('Wave 17 Global Platform'));
  assert.ok(spec.paths[`/live/${slug}/storage`]);
  assert.ok(spec.paths[`/live/${slug}/flags`]);
  assert.ok(spec.paths[`/live/${slug}/errors`]);
  assert.ok(spec.paths[`/live/${slug}/i18n`]);
  assert.ok(spec.paths[`/live/${slug}/db/customers`]);

  console.log('WAVE 17 TESTS PASSED!');
}

runTests().catch((err) => {
  console.error('Wave 17 Test Failed:', err);
  process.exit(1);
});
