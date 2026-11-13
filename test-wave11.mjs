// Automated test suite for Wave 11:
// 1. In-Studio Gemini AI App Generator
// 2. Dual Payment Gateway (Stripe Checkout alongside PayPal)
// 3. Space Template Marketplace & 1-Click Clone
// 4. Automated Custom Domain DNS & SSL Diagnostics
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
globalThis.fetch = async (input, init = {}) => {
  const target = String(input);
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

  // Gemini API Mock
  if (target.includes('generativelanguage.googleapis.com')) {
    return json({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  summary: 'Gemini generated production Kanban application',
                  files: {
                    'index.html': '<!DOCTYPE html><html><body><h1>Gemini Kanban</h1></body></html>',
                    'style.css': 'body { background: #000; color: #fff; }',
                    'script.js': 'console.log("gemini app ready");'
                  }
                })
              }
            ]
          }
        }
      ]
    });
  }

  // Stripe Checkout API Mock
  if (target.startsWith('https://api.stripe.com/v1/checkout/sessions')) {
    if (init.method === 'POST') {
      return json({
        id: 'cs_test_stripe_session_123',
        url: 'https://checkout.stripe.test/pay/cs_test_stripe_session_123'
      });
    }
    // GET session details
    return json({
      id: 'cs_test_stripe_session_123',
      payment_status: 'paid',
      amount_total: 100,
      metadata: {
        userId: 'usr_test_alice',
        planId: 'plan_monthly_1',
        spaceSlug: 'test-app'
      }
    });
  }

  // Cloudflare DoH Mock
  if (target.includes('cloudflare-dns.com/dns-query')) {
    const url = new URL(target);
    const type = url.searchParams.get('type');
    if (type === 'CNAME') {
      return json({
        Status: 0,
        Answer: [{ name: 'myapp.com', type: 5, data: 'spacehub.win.' }]
      });
    }
    if (type === 'A') {
      return json({
        Status: 0,
        Answer: [{ name: 'myapp.com', type: 1, data: '104.21.45.67' }]
      });
    }
  }

  // HTTPS SSL Handshake Mock for custom domains
  if (target.startsWith('https://myapp.com') || target.startsWith('https://custom.test')) {
    return new Response(null, { status: 200 });
  }

  return realFetch(input, init);
};

let ipCount = 1;
async function call(method, path, body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json',
    'cf-connecting-ip': `10.2.0.${ipCount++}`
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await worker.fetch(
    new Request(`https://spacehub.win${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    }),
    env
  );
  const text = await res.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch (_e) {}
  return { status: res.status, body: parsed, text };
}

try {
  // 1. Setup user & staging space
  const regAlice = await call('POST', '/api/auth/register', { username: 'alice', password: 'alicepass123' });
  assert.strictEqual(regAlice.status, 201);
  const aliceToken = regAlice.body.token;

  const regBob = await call('POST', '/api/auth/register', { username: 'bob', password: 'bobpass123' });
  assert.strictEqual(regBob.status, 201);
  const bobToken = regBob.body.token;

  const createSpace = await call('POST', '/api/spaces', { title: 'Alice Project', visibility: 'private' }, aliceToken);
  assert.strictEqual(createSpace.status, 201);
  const spaceSlug = createSpace.body.space.slug;

  // ==========================================
  // PART 1: In-Studio AI App Generator
  // ==========================================
  console.log('1. Testing AI App Generator (Synthesizer & Gemini)...');
  
  // Unauthenticated
  assert.strictEqual((await call('POST', `/api/spaces/alice/${spaceSlug}/ai-generate`, { prompt: 'kanban' })).status, 401);
  // Non-owner
  assert.strictEqual((await call('POST', `/api/spaces/alice/${spaceSlug}/ai-generate`, { prompt: 'kanban' }, bobToken)).status, 403);
  // Missing prompt
  assert.strictEqual((await call('POST', `/api/spaces/alice/${spaceSlug}/ai-generate`, { prompt: '' }, aliceToken)).status, 400);

  // Built-in Synthesizer (Kanban)
  const synthGen = await call('POST', `/api/spaces/alice/${spaceSlug}/ai-generate`, { prompt: 'Build an agile kanban board with columns' }, aliceToken);
  assert.strictEqual(synthGen.status, 200);
  assert.strictEqual(synthGen.body.ok, true);
  assert.strictEqual(synthGen.body.source, 'synthesizer');
  assert.ok(synthGen.body.files['index.html'].includes('Kanban'));
  assert.ok(synthGen.body.version >= 2);

  // Gemini API integration (when GEMINI_API_KEY is configured)
  env.GEMINI_API_KEY = 'test-gemini-key';
  const geminiGen = await call('POST', `/api/spaces/alice/${spaceSlug}/ai-generate`, { prompt: 'A full CRM dashboard with charts' }, aliceToken);
  assert.strictEqual(geminiGen.status, 200);
  assert.strictEqual(geminiGen.body.source, 'gemini-2.5-flash');
  assert.ok(geminiGen.body.files['index.html'].includes('Gemini Kanban'));
  delete env.GEMINI_API_KEY;

  // ==========================================
  // PART 2: Dual Payment Gateway (Stripe)
  // ==========================================
  console.log('2. Testing Dual Payment Gateway (Stripe alongside PayPal)...');

  // Config check when Stripe unconfigured
  const stripeCfgBefore = await call('GET', '/api/stripe/config');
  assert.strictEqual(stripeCfgBefore.status, 200);
  assert.strictEqual(stripeCfgBefore.body.configured, false);

  // Session create fails gracefully with fallback: true
  const stripeFail = await call('POST', '/api/stripe/create-checkout-session', { planId: 'plan_monthly_1' }, aliceToken);
  assert.strictEqual(stripeFail.status, 503);
  assert.strictEqual(stripeFail.body.fallback, true);

  // Now configure Stripe
  env.STRIPE_SECRET_KEY = 'sk_test_mock_secret';
  env.STRIPE_PUBLISHABLE_KEY = 'pk_test_mock_publishable';

  const stripeCfgAfter = await call('GET', '/api/stripe/config');
  assert.strictEqual(stripeCfgAfter.body.configured, true);
  assert.strictEqual(stripeCfgAfter.body.publishableKey, 'pk_test_mock_publishable');

  // Create Checkout Session
  const sessionRes = await call('POST', '/api/stripe/create-checkout-session', { planId: 'plan_monthly_1', spaceSlug }, aliceToken);
  assert.strictEqual(sessionRes.status, 201);
  assert.strictEqual(sessionRes.body.sessionId, 'cs_test_stripe_session_123');
  assert.ok(sessionRes.body.url.includes('checkout.stripe.test'));

  // Webhook event processing: checkout.session.completed
  const webhookRes = await call('POST', '/api/stripe/webhook', {
    id: 'evt_test_1',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_stripe_session_123',
        client_reference_id: regAlice.body.user.id,
        amount_total: 100,
        metadata: {
          userId: regAlice.body.user.id,
          planId: 'plan_monthly_1',
          spaceSlug
        }
      }
    }
  });
  assert.strictEqual(webhookRes.status, 200);
  assert.strictEqual(webhookRes.body.received, true);

  // Check hosting connection granted to Alice
  const connRes = await call('GET', '/api/hosting-connections', null, aliceToken);
  assert.strictEqual(connRes.status, 200);
  assert.ok(connRes.body.connections.some((c) => c.paymentMethod === 'stripe_card' && c.planId === 'plan_monthly_1'));

  // Session return verification
  const verifyRes = await call('GET', '/api/stripe/verify-session?sessionId=cs_test_stripe_session_123');
  assert.strictEqual(verifyRes.status, 200);
  assert.strictEqual(verifyRes.body.paid, true);

  // ==========================================
  // PART 3: Space Template Marketplace & 1-Click Clone
  // ==========================================
  console.log('3. Testing Space Template Marketplace & 1-Click Clone...');

  // Get templates catalog
  const tplList = await call('GET', '/api/templates');
  assert.strictEqual(tplList.status, 200);
  assert.ok(tplList.body.templates.length >= 4);
  assert.ok(tplList.body.templates.some((t) => t.slug === 'kanban'));
  assert.ok(tplList.body.templates.some((t) => t.slug === 'invoice'));

  // Category filter
  const prodTpls = await call('GET', '/api/templates?category=productivity');
  assert.ok(prodTpls.body.templates.every((t) => t.category === 'productivity'));

  // Publish Alice's space as a marketplace template
  const pubTpl = await call('POST', `/api/spaces/alice/${spaceSlug}/publish-template`, {
    category: 'productivity',
    description: 'Custom Kanban by Alice'
  }, aliceToken);
  assert.strictEqual(pubTpl.status, 200);

  const tplListWithAlice = await call('GET', '/api/templates');
  assert.ok(tplListWithAlice.body.templates.some((t) => t.slug === spaceSlug && t.authorUsername === 'alice'));

  // Bob clones the Kanban template in 1 click
  const cloneRes = await call('POST', '/api/templates/kanban/clone', null, bobToken);
  assert.strictEqual(cloneRes.status, 201);
  assert.ok(cloneRes.body.space.slug.includes('kanban-bob'));
  assert.strictEqual(cloneRes.body.space.ownerUsername, 'bob');

  // Alice unpublishes her template
  const unpub = await call('POST', `/api/spaces/alice/${spaceSlug}/unpublish-template`, null, aliceToken);
  assert.strictEqual(unpub.status, 200);

  // ==========================================
  // PART 4: Automated Custom Domain DNS & SSL Diagnostics
  // ==========================================
  console.log('4. Testing Automated Custom Domain DNS & SSL Diagnostics...');

  // No domain configured yet -> 400
  const noDomDiag = await call('GET', `/api/spaces/alice/${spaceSlug}/domain-diagnostics`, null, aliceToken);
  assert.strictEqual(noDomDiag.status, 400);

  // Configure custom domain
  await call('PUT', `/api/spaces/alice/${spaceSlug}`, { customDomain: 'myapp.com' }, aliceToken);

  // Run diagnostics with Cloudflare DoH & HTTPS probe
  const diagRes = await call('GET', `/api/spaces/alice/${spaceSlug}/domain-diagnostics`, null, aliceToken);
  assert.strictEqual(diagRes.status, 200);
  assert.strictEqual(diagRes.body.domain, 'myapp.com');
  assert.strictEqual(diagRes.body.cnameMatches, true);
  assert.strictEqual(diagRes.body.sslActive, true);
  assert.strictEqual(diagRes.body.status, 'ready');
  assert.ok(diagRes.body.instructions.length > 0);

  console.log('WAVE 11 TESTS PASSED!');
} finally {
  globalThis.fetch = realFetch;
}
