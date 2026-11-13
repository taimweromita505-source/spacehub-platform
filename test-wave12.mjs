// Automated test suite for Wave 12:
// 1. Space Activity & Audit Log
// 2. Cloudflare for SaaS Custom Hostname API (SSL for SaaS)
// 3. Space Webhook Integrations Hub (Discord, Slack, Telegram)
// 4. App Export as ZIP (.zip)
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
  ADMIN_USERNAMES: 'adminuser'
};

const realFetch = globalThis.fetch;
const outboundDispatches = [];

globalThis.fetch = async (input, init = {}) => {
  const target = String(input);
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

  // Discord Mock
  if (target.includes('discord.com/api/webhooks')) {
    outboundDispatches.push({ type: 'discord', url: target, body: init.body ? JSON.parse(init.body) : null });
    return json({ id: 'discord_msg_1' }, 200);
  }

  // Slack Mock
  if (target.includes('hooks.slack.com')) {
    outboundDispatches.push({ type: 'slack', url: target, body: init.body ? JSON.parse(init.body) : null });
    return new Response('ok', { status: 200 });
  }

  // Telegram Mock
  if (target.includes('api.telegram.org')) {
    outboundDispatches.push({ type: 'telegram', url: target, body: init.body ? JSON.parse(init.body) : null });
    return json({ ok: true, result: { message_id: 123 } }, 200);
  }

  return realFetch(input, init);
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
  console.log('--- RUNNING WAVE 12 TESTS ---');

  // Register test user
  const regRes = await handle('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'wave12auditor',
      password: 'AuditPassword123!',
      displayName: 'Audit & Webhooks Tester'
    })
  });
  assert.equal(regRes.status, 201);
  const { token, user } = await regRes.json();
  assert.ok(token);

  // Create test space
  const createRes = await handle('/api/spaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Wave 12 Enterprise App',
      visibility: 'private',
      templateId: 'kanban'
    })
  }, token);
  assert.equal(createRes.status, 201);
  const { space } = await createRes.json();
  const { ownerUsername, slug } = space;

  // 1. Space Activity & Audit Log Tests
  console.log('1. Testing Space Activity & Audit Log...');
  const actRes1 = await handle(`/api/spaces/${ownerUsername}/${slug}/activity`, {}, token);
  assert.equal(actRes1.status, 200);
  const actData1 = await actRes1.json();
  assert.ok(Array.isArray(actData1.logs));
  assert.ok(actData1.logs.length >= 1);
  assert.equal(actData1.logs[0].action, 'space_created');
  assert.equal(actData1.logs[0].username, 'wave12auditor');

  // Trigger deploy and check audit log
  const deployRes = await handle(`/api/spaces/${ownerUsername}/${slug}/deploy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'spacehub_edge' })
  }, token);
  assert.equal(deployRes.status, 200);

  const actRes2 = await handle(`/api/spaces/${ownerUsername}/${slug}/activity`, {}, token);
  const actData2 = await actRes2.json();
  assert.ok(actData2.logs.some(l => l.action === 'deploy'));

  // 2. Cloudflare for SaaS Custom Hostname API Tests
  console.log('2. Testing Cloudflare for SaaS Custom Hostname API...');
  const chRes = await handle(`/api/spaces/${ownerUsername}/${slug}/custom-hostname`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostname: 'enterprise.clientapp.com' })
  }, token);
  assert.equal(chRes.status, 200);
  const chData = await chRes.json();
  assert.ok(chData.ok);
  assert.ok(chData.customHostname.id.startsWith('cf_chn_'));
  assert.equal(chData.customHostname.hostname, 'enterprise.clientapp.com');
  assert.equal(chData.customHostname.status, 'active');
  assert.ok(chData.customHostname.verificationRecord);
  assert.equal(chData.customHostname.verificationRecord.name, '_cf-custom-hostname.enterprise.clientapp.com');

  // Check GET custom-hostname
  const chGetRes = await handle(`/api/spaces/${ownerUsername}/${slug}/custom-hostname`, {}, token);
  assert.equal(chGetRes.status, 200);
  const chGetData = await chGetRes.json();
  assert.equal(chGetData.customHostname.hostname, 'enterprise.clientapp.com');

  // Check audit log for hostname
  const actRes3 = await handle(`/api/spaces/${ownerUsername}/${slug}/activity`, {}, token);
  const actData3 = await actRes3.json();
  assert.ok(actData3.logs.some(l => l.action === 'custom_hostname_provisioned'));

  // 3. Space Webhook Integrations Hub Tests
  console.log('3. Testing Space Webhook Integrations Hub (Discord, Slack, Telegram)...');
  const putIntRes = await handle(`/api/spaces/${ownerUsername}/${slug}/integrations`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      discordWebhookUrl: 'https://discord.com/api/webhooks/123456789/fake-token',
      slackWebhookUrl: 'https://hooks.slack.com/services/T00/B00/fake-slack',
      telegramBotToken: '123456:FAKE-BOT-TOKEN',
      telegramChatId: '-100987654321'
    })
  }, token);
  assert.equal(putIntRes.status, 200);
  const putIntData = await putIntRes.json();
  assert.equal(putIntData.integrations.discordWebhookUrl, 'https://discord.com/api/webhooks/123456789/fake-token');
  assert.equal(putIntData.integrations.slackWebhookUrl, 'https://hooks.slack.com/services/T00/B00/fake-slack');

  // Test integration dispatch
  const testIntRes = await handle(`/api/spaces/${ownerUsername}/${slug}/test-integrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  }, token);
  assert.equal(testIntRes.status, 200);
  const testIntData = await testIntRes.json();
  assert.ok(testIntData.ok);
  assert.equal(testIntData.dispatched.discord, true);
  assert.equal(testIntData.dispatched.slack, true);
  assert.equal(testIntData.dispatched.telegram, true);
  assert.ok(outboundDispatches.some(d => d.type === 'discord'));
  assert.ok(outboundDispatches.some(d => d.type === 'slack'));
  assert.ok(outboundDispatches.some(d => d.type === 'telegram'));

  // Form submission integration trigger
  const subRes = await handle(`/live/${slug}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Integration Tester',
      email: 'lead@enterprise.com',
      message: 'Excited about SpaceHub integrations!'
    })
  });
  assert.equal(subRes.status, 201);
  const formDispatches = outboundDispatches.filter(d => JSON.stringify(d).includes('lead@enterprise.com') || JSON.stringify(d).includes('Integration Tester'));
  assert.ok(formDispatches.length > 0);

  // 4. App Export as ZIP Tests
  console.log('4. Testing App Export as ZIP (.zip)...');
  const zipRes = await handle(`/api/spaces/${ownerUsername}/${slug}/export-zip`, {}, token);
  assert.equal(zipRes.status, 200);
  assert.equal(zipRes.headers.get('content-type'), 'application/zip');
  assert.ok(zipRes.headers.get('content-disposition')?.includes(`${slug}.zip`));

  const zipBuf = new Uint8Array(await zipRes.arrayBuffer());
  assert.ok(zipBuf.length > 100);
  // Check PKZIP magic number: 0x50, 0x4B, 0x03, 0x04 (PK\x03\x04)
  assert.equal(zipBuf[0], 0x50);
  assert.equal(zipBuf[1], 0x4B);
  assert.equal(zipBuf[2], 0x03);
  assert.equal(zipBuf[3], 0x04);

  // Verify file names inside ZIP
  const zipStr = new TextDecoder().decode(zipBuf);
  assert.ok(zipStr.includes('index.html'));
  assert.ok(zipStr.includes('style.css'));
  assert.ok(zipStr.includes('script.js'));
  assert.ok(zipStr.includes('manifest.webmanifest'));
  assert.ok(zipStr.includes('vercel.json'));

  console.log('WAVE 12 TESTS PASSED!');
}

runTests().catch((err) => {
  console.error('Wave 12 Test Failed:', err);
  process.exit(1);
});
