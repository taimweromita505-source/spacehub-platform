// Offline tests for Wave 10 (hosting expiry/renewal, PayPal webhooks, admin dashboard,
// account security, notifications) against worker.js with PayPal + Resend mocked.
import assert from 'node:assert';
import worker from './worker.js';

const KV_KEY = 'spacehub_prod_state_v2';
const kvStore = new Map();
const emails = [];
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
  PAYPAL_CLIENT_ID: 'id',
  PAYPAL_CLIENT_SECRET: 'secret',
  PAYPAL_MODE: 'sandbox',
  PAYPAL_WEBHOOK_ID: 'WH-TEST',
  RESEND_API_KEY: 'resend-test-key',
  ADMIN_USERNAMES: 'boss,sam'
};

let nextOrderId = 'ORDER-1';
let captureCount = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const target = String(input);
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
  if (target.startsWith('https://api.resend.com/emails')) {
    emails.push(JSON.parse(init.body));
    return json({ id: 'email_1' });
  }
  if (target.startsWith('https://oauth2.googleapis.com/tokeninfo')) {
    const url = new URL(target);
    const token = url.searchParams.get('id_token');
    if (token === 'bad-token') return json({ error: 'invalid_token' }, 401);
    if (token === 'wrong-aud') return json({ aud: 'wrong-client-id', iss: 'accounts.google.com', email: 'alice@gmail.com', email_verified: true });
    if (token === 'unverified-email') return json({ aud: env.GOOGLE_CLIENT_ID, iss: 'accounts.google.com', email: 'unverified@gmail.com', email_verified: false });
    if (token === 'valid-sam-token') {
      return json({
        aud: env.GOOGLE_CLIENT_ID,
        iss: 'accounts.google.com',
        email: 'sam@example.com',
        email_verified: true,
        name: 'Sam'
      });
    }
    if (token === 'valid-google-token') {
      return json({
        aud: env.GOOGLE_CLIENT_ID,
        iss: 'accounts.google.com',
        email: 'alice@gmail.com',
        email_verified: true,
        name: 'Alice Verified'
      });
    }
  }
  if (!target.startsWith('https://api-m.sandbox.paypal.com')) return realFetch(input, init);
  if (target.endsWith('/v1/oauth2/token')) return json({ access_token: 'mock-token' });
  if (target.endsWith('/v2/checkout/orders')) {
    return json({
      id: nextOrderId,
      links: [{ rel: 'payer-action', href: `https://paypal.test/approve/${nextOrderId}` }]
    });
  }
  if (target.includes('/capture')) {
    captureCount++;
    return json({
      status: 'COMPLETED',
      purchase_units: [
        {
          payments: {
            captures: [
              { id: `CAP-${captureCount}`, status: 'COMPLETED', amount: { currency_code: 'USD', value: '1.00' } }
            ]
          }
        }
      ]
    });
  }
  if (target.endsWith('/v1/notifications/verify-webhook-signature')) {
    const sent = JSON.parse(init.body);
    return json({ verification_status: sent.transmission_id === 'bad' ? 'FAILURE' : 'SUCCESS' });
  }
  return json({}, 404);
};

let ipCounter = 1;
async function call(method, path, body = null, token = null, extraHeaders = {}, ip = null) {
  const headers = {
    'Content-Type': 'application/json',
    'cf-connecting-ip': ip || `10.1.0.${ipCounter++}`,
    ...extraHeaders
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
  } catch (_e) {
    // not JSON
  }
  return { status: res.status, body: parsed, text, headers: res.headers };
}

function readDb() {
  return JSON.parse(kvStore.get(KV_KEY));
}
function editDb(fn) {
  const db = readDb();
  fn(db);
  kvStore.set(KV_KEY, JSON.stringify(db));
}
const daysFromNow = (iso) => (Date.parse(iso) - Date.now()) / 86400000;

async function payAndCapture(token, orderId, body) {
  nextOrderId = orderId;
  const created = await call('POST', '/api/paypal/create-order', body, token);
  assert.strictEqual(created.status, 200, created.text);
  return call('POST', '/api/paypal/capture-order', { orderId }, token);
}

function webhookEvent(event, transmissionId = 'ok') {
  return call('POST', '/api/paypal/webhook', event, null, {
    'paypal-transmission-id': transmissionId,
    'paypal-transmission-sig': 'sig',
    'paypal-transmission-time': new Date().toISOString(),
    'paypal-cert-url': 'https://api.paypal.com/cert',
    'paypal-auth-algo': 'SHA256withRSA'
  });
}

try {
  // ---------- Accounts ----------
  const boss = (await call('POST', '/api/auth/register', { username: 'boss', password: 'bosspass123' })).body.token;
  const payerReg = await call('POST', '/api/auth/register', { username: 'payer', password: 'payerpass1' });
  const payer = payerReg.body.token;
  const samReg = await call('POST', '/api/auth/social', { provider: 'google', email: 'sam@example.com' });
  assert.strictEqual(samReg.status, 200, samReg.text);
  const sam = samReg.body.token;
  const samUsername = samReg.body.user.username;
  assert.strictEqual(samUsername, 'sam');

  // ---------- 1. Expiry + renewal ----------
  const bought = await payAndCapture(payer, 'ORDER-1', { planId: 'plan_monthly_1', spaceSlug: 'live-app' });
  assert.strictEqual(bought.status, 201, bought.text);
  const slot = bought.body.connection;
  assert.strictEqual(slot.planId, 'plan_monthly_1');
  assert.ok(daysFromNow(slot.expiresAt) > 29.9 && daysFromNow(slot.expiresAt) < 30.1);

  const listed = await call('GET', '/api/hosting-connections', null, payer);
  assert.strictEqual(listed.body.connections[0].hostingState, 'active');
  assert.strictEqual(listed.body.connections[0].canRenew, true);
  assert.ok(listed.body.connections[0].daysLeft >= 29);

  const created = await call('POST', '/api/spaces', { title: 'Live App', slug: 'live-app' }, payer);
  assert.strictEqual(created.status, 201, created.text);
  const publish = await call(
    'POST',
    '/api/spaces/payer/live-app/deploy-external',
    { connectionId: slot.id, visibility: 'public' },
    payer
  );
  assert.strictEqual(publish.status, 200, publish.text);
  assert.strictEqual((await call('GET', '/live/live-app')).status, 200);

  // Expired beyond the 3-day grace period => Space goes offline and publishing is refused.
  editDb((db) => {
    db.hostingConnections.find((c) => c.id === slot.id).expiresAt = new Date(Date.now() - 10 * 86400000).toISOString();
  });
  const offline = await call('GET', '/live/live-app');
  assert.strictEqual(offline.status, 402);
  assert.ok(offline.text.includes('Hosting Expired'));
  const expiredList = await call('GET', '/api/hosting-connections', null, payer);
  assert.strictEqual(expiredList.body.connections[0].hostingState, 'expired');
  const republishExpired = await call(
    'POST',
    '/api/spaces/payer/live-app/deploy-external',
    { connectionId: slot.id },
    payer
  );
  assert.strictEqual(republishExpired.status, 402);

  // Inside the grace period the Space stays online.
  editDb((db) => {
    db.hostingConnections.find((c) => c.id === slot.id).expiresAt = new Date(Date.now() - 86400000).toISOString();
  });
  assert.strictEqual((await call('GET', '/live/live-app')).status, 200);
  assert.strictEqual((await call('GET', '/api/hosting-connections', null, payer)).body.connections[0].hostingState, 'grace');

  // Another account cannot renew my slot; I can, and it extends from "now" without a new slot.
  nextOrderId = 'ORDER-X';
  assert.strictEqual(
    (await call('POST', '/api/paypal/create-order', { renewConnectionId: slot.id }, boss)).status,
    404
  );
  editDb((db) => {
    db.hostingConnections.find((c) => c.id === slot.id).expiresAt = new Date(Date.now() - 10 * 86400000).toISOString();
  });
  const renewed = await payAndCapture(payer, 'ORDER-2', { renewConnectionId: slot.id });
  assert.strictEqual(renewed.status, 201, renewed.text);
  assert.strictEqual(renewed.body.connection.id, slot.id);
  assert.ok(daysFromNow(renewed.body.connection.expiresAt) > 29.9);
  assert.strictEqual((await call('GET', '/live/live-app')).status, 200);
  assert.strictEqual((await call('GET', '/api/hosting-connections', null, payer)).body.connections.length, 1);

  // ---------- 5. Receipts / notices ----------
  const notices = await call('GET', '/api/notices', null, payer);
  assert.strictEqual(notices.body.notices.filter((n) => n.type === 'receipt').length, 2);
  assert.strictEqual(notices.body.unread, 2);
  await call('POST', '/api/notices/read', {}, payer);
  assert.strictEqual((await call('GET', '/api/notices', null, payer)).body.unread, 0);

  // ---------- 2. PayPal webhook: refunds & disputes ----------
  assert.strictEqual((await webhookEvent({ id: 'EV-BAD', event_type: 'PAYMENT.CAPTURE.REFUNDED' }, 'bad')).status, 400);

  const beforeRefundExp = readDb().hostingConnections.find((c) => c.id === slot.id).expiresAt;
  const refund = await webhookEvent({
    id: 'EV-1',
    event_type: 'PAYMENT.CAPTURE.REFUNDED',
    resource: {
      id: 'REFUND-9',
      amount: { value: '1.00' },
      links: [{ rel: 'up', href: 'https://api.sandbox.paypal.com/v2/payments/captures/CAP-2' }]
    }
  });
  assert.strictEqual(refund.status, 200);
  assert.strictEqual(refund.body.outcome, 'extension_removed');
  const afterRefundExp = readDb().hostingConnections.find((c) => c.id === slot.id).expiresAt;
  assert.ok(Math.abs((Date.parse(beforeRefundExp) - Date.parse(afterRefundExp)) / 86400000 - 30) < 0.01);
  assert.strictEqual((await webhookEvent({ id: 'EV-1', event_type: 'PAYMENT.CAPTURE.REFUNDED' })).body.duplicate, true);

  const partial = await webhookEvent({
    id: 'EV-2',
    event_type: 'PAYMENT.CAPTURE.REFUNDED',
    resource: {
      id: 'REFUND-10',
      amount: { value: '0.25' },
      links: [{ rel: 'up', href: 'https://api.sandbox.paypal.com/v2/payments/captures/CAP-1' }]
    }
  });
  assert.strictEqual(partial.body.outcome, 'partial_refund_recorded');
  assert.strictEqual((await call('GET', '/live/live-app')).status, 200);

  const dispute = await webhookEvent({
    id: 'EV-3',
    event_type: 'CUSTOMER.DISPUTE.CREATED',
    resource: { disputed_transactions: [{ seller_transaction_id: 'CAP-1' }] }
  });
  assert.strictEqual(dispute.body.outcome, 'suspended');
  const suspendedPage = await call('GET', '/live/live-app');
  assert.strictEqual(suspendedPage.status, 402);
  assert.ok(suspendedPage.text.includes('Hosting Suspended'));
  assert.strictEqual(
    (await call('POST', '/api/paypal/create-order', { renewConnectionId: slot.id }, payer)).status,
    403
  );

  const lostDispute = await webhookEvent({
    id: 'EV-4',
    event_type: 'CUSTOMER.DISPUTE.RESOLVED',
    resource: {
      dispute_outcome: { outcome_code: 'RESOLVED_BUYER_FAVOUR' },
      disputed_transactions: [{ seller_transaction_id: 'CAP-1' }]
    }
  });
  assert.strictEqual(lostDispute.body.outcome, 'dispute_not_in_seller_favour');
  assert.strictEqual((await call('GET', '/live/live-app')).status, 402);

  const wonDispute = await webhookEvent({
    id: 'EV-5',
    event_type: 'CUSTOMER.DISPUTE.RESOLVED',
    resource: {
      dispute_outcome: { outcome_code: 'RESOLVED_SELLER_FAVOUR' },
      disputed_transactions: [{ seller_transaction_id: 'CAP-1' }]
    }
  });
  assert.strictEqual(wonDispute.body.outcome, 'reinstated');
  assert.strictEqual((await call('GET', '/live/live-app')).status, 200);

  // ---------- 3. Admin dashboard ----------
  assert.strictEqual((await call('GET', '/api/admin/overview')).status, 401);
  assert.strictEqual((await call('GET', '/api/admin/overview', null, payer)).status, 403);
  // "sam" is listed as admin but signed in with an unverified typed email => still refused.
  assert.strictEqual((await call('GET', '/api/admin/overview', null, sam)).status, 403);

  const overview = await call('GET', '/api/admin/overview', null, boss);
  assert.strictEqual(overview.status, 200);
  assert.strictEqual(overview.body.totals.users, 3);
  assert.strictEqual(overview.body.revenue.allTimeUsd, 1);
  assert.strictEqual(overview.body.revenue.refundedUsd, 1);
  assert.strictEqual(overview.body.recentPayments.length, 2);
  assert.ok(overview.body.recentPayments.some((p) => p.reverted && p.revertReason === 'refunded'));
  assert.ok(!JSON.stringify(overview.body).includes('passwordHash'));

  assert.strictEqual(
    (await call('POST', '/api/admin/grant', { username: 'sam', planId: 'plan_yearly_12' }, payer)).status,
    403
  );
  const grant = await call('POST', '/api/admin/grant', { username: 'sam', planId: 'plan_yearly_12' }, boss);
  assert.strictEqual(grant.status, 201);
  assert.ok(daysFromNow(grant.body.connection.expiresAt) > 364);
  assert.ok(emails.some((e) => e.to[0] === 'sam@example.com' && e.subject === 'Hosting slot granted'));

  const grantId = grant.body.connection.id;
  assert.strictEqual((await call('POST', '/api/admin/revoke', { connectionId: grantId }, boss)).body.connection.suspended, true);
  assert.strictEqual((await call('GET', '/api/hosting-connections', null, sam)).body.connections[0].hostingState, 'suspended');
  assert.strictEqual((await call('POST', '/api/admin/reinstate', { connectionId: grantId }, boss)).body.connection.suspended, false);

  // ---------- 5. Cron reminders ----------
  const runCron = () => worker.scheduled({}, env);
  const reminderCount = () =>
    readDb().users.find((u) => u.username === 'sam').notices.filter((n) => /expire/i.test(n.title)).length;
  const setSamExpiry = (ms) =>
    editDb((db) => {
      db.hostingConnections.find((c) => c.id === grantId).expiresAt = new Date(Date.now() + ms).toISOString();
    });

  await runCron();
  assert.strictEqual(reminderCount(), 0);
  setSamExpiry(5 * 86400000);
  await runCron();
  assert.strictEqual(reminderCount(), 1);
  assert.ok(emails.some((e) => e.to[0] === 'sam@example.com' && /7 days/.test(e.subject)));
  await runCron();
  assert.strictEqual(reminderCount(), 1, 'reminder must not repeat');
  setSamExpiry(12 * 3600000);
  await runCron();
  assert.strictEqual(reminderCount(), 2);
  setSamExpiry(-3600000);
  await runCron();
  assert.strictEqual(reminderCount(), 3);
  await runCron();
  assert.strictEqual(reminderCount(), 3);

  // ---------- 4. Account security ----------
  await call('POST', '/api/auth/register', { username: 'victim', password: 'goodpass1' }, null, {}, '10.9.0.1');
  for (let i = 1; i <= 8; i++) {
    const bad = await call('POST', '/api/auth/login', { username: 'victim', password: 'wrong' + i }, null, {}, '10.9.0.2');
    assert.strictEqual(bad.status, 401, `attempt ${i}`);
  }
  const locked = await call('POST', '/api/auth/login', { username: 'victim', password: 'goodpass1' }, null, {}, '10.9.0.3');
  assert.strictEqual(locked.status, 429);
  assert.ok(locked.headers.get('retry-after'));
  editDb((db) => {
    db.loginFailures.victim.until = Date.now() - 1000;
    db.loginFailures.victim.firstAt = Date.now() - 20 * 60000;
  });
  const unlocked = await call('POST', '/api/auth/login', { username: 'victim', password: 'goodpass1' }, null, {}, '10.9.0.4');
  assert.strictEqual(unlocked.status, 200);
  assert.strictEqual(readDb().loginFailures.victim, undefined);

  let lastStatus = 0;
  for (let i = 1; i <= 31; i++) {
    lastStatus = (await call('POST', '/api/auth/login', { username: 'nobody' + i, password: 'x' }, null, {}, '10.8.8.8')).status;
  }
  assert.strictEqual(lastStatus, 429, 'per-IP auth limiter');

  // change password: validates input, keeps this session, signs out the others.
  const payer2 = (await call('POST', '/api/auth/login', { username: 'payer', password: 'payerpass1' })).body.token;
  assert.strictEqual((await call('POST', '/api/auth/change-password', { currentPassword: 'nope', newPassword: 'newpayerpass1' }, payer)).status, 403);
  assert.strictEqual((await call('POST', '/api/auth/change-password', { currentPassword: 'payerpass1', newPassword: 'short' }, payer)).status, 400);
  assert.strictEqual((await call('POST', '/api/auth/change-password', { currentPassword: 'payerpass1', newPassword: 'newpayerpass1' }, payer)).status, 200);
  assert.strictEqual((await call('GET', '/api/auth/me', null, payer2)).body.user, null);
  assert.strictEqual((await call('GET', '/api/auth/me', null, payer)).body.user.username, 'payer');
  assert.strictEqual((await call('POST', '/api/auth/login', { username: 'payer', password: 'payerpass1' })).status, 401);
  assert.strictEqual((await call('POST', '/api/auth/login', { username: 'payer', password: 'newpayerpass1' })).status, 200);

  // sign out everywhere
  const payer3 = (await call('POST', '/api/auth/login', { username: 'payer', password: 'newpayerpass1' })).body.token;
  assert.strictEqual((await call('POST', '/api/auth/logout-all', null, payer3)).status, 200);
  assert.strictEqual((await call('GET', '/api/auth/me', null, payer)).body.user, null);
  assert.strictEqual((await call('GET', '/api/auth/me', null, payer3)).body.user, null);

  // forgot / reset password (email-based; never reveals whether an account exists)
  const emailsBefore = emails.length;
  const forgotUnknown = await call('POST', '/api/auth/forgot', { identifier: 'ghost@example.com' });
  assert.strictEqual(forgotUnknown.status, 200);
  assert.strictEqual(emails.length, emailsBefore);
  const forgot = await call('POST', '/api/auth/forgot', { identifier: 'sam@example.com' });
  assert.strictEqual(forgot.status, 200);
  assert.strictEqual(forgot.body.message, forgotUnknown.body.message);
  const resetMail = emails[emails.length - 1];
  assert.strictEqual(resetMail.to[0], 'sam@example.com');
  const resetToken = /\?reset=([a-f0-9]+)/.exec(resetMail.text)[1];
  assert.ok(!JSON.stringify(readDb().passwordResets).includes(resetToken), 'only a hash of the token is stored');

  assert.strictEqual((await call('POST', '/api/auth/reset', { token: resetToken, newPassword: 'short' })).status, 400);
  assert.strictEqual((await call('POST', '/api/auth/reset', { token: 'deadbeef', newPassword: 'brandnewpass' })).status, 400);
  assert.strictEqual((await call('POST', '/api/auth/reset', { token: resetToken, newPassword: 'brandnewpass' })).status, 200);
  assert.strictEqual((await call('POST', '/api/auth/reset', { token: resetToken, newPassword: 'anotherpass1' })).status, 400);
  assert.strictEqual((await call('GET', '/api/auth/me', null, sam)).body.user, null, 'reset signs out old sessions');
  assert.strictEqual((await call('POST', '/api/auth/login', { username: 'sam', password: 'brandnewpass' })).status, 200);

  // Google OAuth / Identity Services verification & /api/auth/config
  const authConfigBefore = await call('GET', '/api/auth/config');
  assert.strictEqual(authConfigBefore.status, 200);
  assert.strictEqual(authConfigBefore.body.googleClientId, null);

  // Now enable Google OAuth Client ID on environment
  env.GOOGLE_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com';
  const authConfig = await call('GET', '/api/auth/config');
  assert.strictEqual(authConfig.status, 200);
  assert.strictEqual(authConfig.body.googleClientId, env.GOOGLE_CLIENT_ID);

  // Strict social security: typed emails without real crypto verification are rejected
  const typedGoogle = await call('POST', '/api/auth/social', { provider: 'google', email: 'alice@gmail.com' });
  assert.strictEqual(typedGoogle.status, 400);
  assert.ok(typedGoogle.body.error.includes('Google Sign-In button'));

  const typedApple = await call('POST', '/api/auth/social', { provider: 'apple', email: 'alice@icloud.com' });
  assert.strictEqual(typedApple.status, 400);

  const typedGithub = await call('POST', '/api/auth/social', { provider: 'github', email: 'alice@github.com' });
  assert.strictEqual(typedGithub.status, 400);

  // ID Token cryptographic checks
  assert.strictEqual((await call('POST', '/api/auth/social', { provider: 'google', idToken: 'bad-token' })).status, 401);
  assert.strictEqual((await call('POST', '/api/auth/social', { provider: 'google', idToken: 'wrong-aud' })).status, 401);
  assert.strictEqual((await call('POST', '/api/auth/social', { provider: 'google', idToken: 'unverified-email' })).status, 401);

  // Valid Google token logs in and marks socialVerified: true
  const validGoogle = await call('POST', '/api/auth/social', { provider: 'google', idToken: 'valid-google-token' });
  assert.strictEqual(validGoogle.status, 200);
  assert.ok(validGoogle.body.token);
  assert.strictEqual(validGoogle.body.user.email, 'alice@gmail.com');
  assert.strictEqual(validGoogle.body.user.socialVerified, true);
  assert.strictEqual(validGoogle.body.user.displayName, 'Alice Verified');

  console.log('WAVE 10 TESTS PASSED!');
} finally {
  globalThis.fetch = realFetch;
}
