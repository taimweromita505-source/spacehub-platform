// Offline test of the PayPal REST checkout flow in worker.js (PayPal API is mocked).
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
  PAYPAL_CLIENT_ID: 'test-client-id',
  PAYPAL_CLIENT_SECRET: 'test-client-secret',
  PAYPAL_MODE: 'sandbox'
};

const calls = { token: 0, create: 0, capture: 0 };
let nextOrderId = 'ORDER-1';
let captureValue = '1.00';
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const target = String(input);
  if (!target.startsWith('https://api-m.sandbox.paypal.com')) return realFetch(input, init);
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
  if (target.endsWith('/v1/oauth2/token')) {
    calls.token++;
    assert.ok(String(init.headers.Authorization).startsWith('Basic '));
    return json({ access_token: 'mock-token' });
  }
  if (target.endsWith('/v2/checkout/orders')) {
    calls.create++;
    const sent = JSON.parse(init.body);
    assert.strictEqual(sent.intent, 'CAPTURE');
    assert.strictEqual(sent.purchase_units[0].amount.currency_code, 'USD');
    return json({
      id: nextOrderId,
      links: [{ rel: 'payer-action', href: `https://paypal.test/approve/${nextOrderId}` }]
    });
  }
  if (target.includes('/capture')) {
    calls.capture++;
    return json({
      status: 'COMPLETED',
      purchase_units: [
        {
          payments: {
            captures: [
              { id: 'CAP-' + calls.capture, status: 'COMPLETED', amount: { currency_code: 'USD', value: captureValue } }
            ]
          }
        }
      ]
    });
  }
  return json({}, 404);
};

async function call(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await worker.fetch(
    new Request(`https://spacehub.win${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined }),
    env
  );
  const text = await res.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch (_e) {
    // not JSON
  }
  return { status: res.status, body: parsed };
}

try {
  const cfg = await call('GET', '/api/paypal/config');
  assert.strictEqual(cfg.body.configured, true);
  assert.strictEqual(cfg.body.mode, 'sandbox');

  const reg = await call('POST', '/api/auth/register', { username: 'payer_one', password: 'secret123' });
  assert.strictEqual(reg.status, 201);
  const token = reg.body.token;
  const reg2 = await call('POST', '/api/auth/register', { username: 'payer_two', password: 'secret123' });
  const token2 = reg2.body.token;

  // Unverified direct purchase must be refused once PayPal is configured.
  const direct = await call('POST', '/api/hosting-plans/purchase', { planId: 'plan_monthly_1' }, token);
  assert.strictEqual(direct.status, 402);

  assert.strictEqual((await call('POST', '/api/paypal/create-order', { planId: 'plan_monthly_1' })).status, 401);

  const created = await call('POST', '/api/paypal/create-order', { planId: 'plan_monthly_1', spaceSlug: 'my-app' }, token);
  assert.strictEqual(created.status, 200);
  assert.strictEqual(created.body.orderId, 'ORDER-1');
  assert.strictEqual(created.body.approveUrl, 'https://paypal.test/approve/ORDER-1');

  // Another account cannot capture someone else's order.
  const stolen = await call('POST', '/api/paypal/capture-order', { orderId: 'ORDER-1' }, token2);
  assert.strictEqual(stolen.status, 404);
  assert.strictEqual(calls.capture, 0);

  const captured = await call('POST', '/api/paypal/capture-order', { orderId: 'ORDER-1' }, token);
  assert.strictEqual(captured.status, 201);
  assert.strictEqual(captured.body.connection.isSingleSpaceSlot, true);
  assert.strictEqual(captured.body.connection.assignedSpaceSlug, 'my-app');
  assert.strictEqual(captured.body.connection.paymentMethod, 'paypal_api');
  assert.strictEqual(captured.body.connection.paymentRef, 'CAP-1');

  // Capturing again is idempotent and does not create a second slot or call PayPal again.
  const again = await call('POST', '/api/paypal/capture-order', { orderId: 'ORDER-1' }, token);
  assert.strictEqual(again.status, 200);
  assert.strictEqual(again.body.alreadyCaptured, true);
  assert.strictEqual(again.body.connection.id, captured.body.connection.id);
  assert.strictEqual(calls.capture, 1);

  // An amount mismatch must not activate anything.
  nextOrderId = 'ORDER-2';
  captureValue = '0.50';
  const created2 = await call('POST', '/api/paypal/create-order', { planId: 'plan_monthly_1' }, token);
  assert.strictEqual(created2.body.orderId, 'ORDER-2');
  const underpaid = await call('POST', '/api/paypal/capture-order', { orderId: 'ORDER-2' }, token);
  assert.strictEqual(underpaid.status, 402);
  const conns = await call('GET', '/api/hosting-connections', null, token);
  assert.strictEqual(conns.body.connections.length, 1);

  console.log('PAYPAL CHECKOUT TESTS PASSED!');
} finally {
  globalThis.fetch = realFetch;
}
