const assert = require('assert');
const http = require('http');
const app = require('./server');

function request(server, method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const payload = body ? JSON.stringify(body) : null;
    const headers = {};
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: addr.port,
        path,
        method,
        headers
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(raw);
          } catch (_e) {
            // HTML response
          }
          resolve({ status: res.statusCode, body: json, raw });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

(async function runTests() {
  const server = app.listen(0);
  try {
    console.log('1. Checking initial public Spaces & Hosting Plans...');
    const pubRes = await request(server, 'GET', '/api/spaces?filter=public');
    assert.strictEqual(pubRes.status, 200);
    assert.ok(Array.isArray(pubRes.body.spaces), 'Should return public spaces array');

    const plansRes = await request(server, 'GET', '/api/hosting-plans');
    assert.strictEqual(plansRes.status, 200);
    assert.strictEqual(plansRes.body.plans.length, 2, 'Should offer $1/month and $12/year per Space hosting plans');
    assert.strictEqual(plansRes.body.plans[0].priceLabel, '$1 / month per Space');
    assert.strictEqual(plansRes.body.plans[1].priceLabel, '$12 / year per Space');

    console.log('2. Registering a new user...');
    const uniqueUser = 'maker_' + Math.floor(Math.random() * 100000);
    const regRes = await request(server, 'POST', '/api/auth/register', {
      username: uniqueUser,
      displayName: 'Maker One',
      password: 'password123'
    });
    assert.strictEqual(regRes.status, 201);
    const token = regRes.body.token;
    assert.ok(token, 'Should return session token');

    console.log('3. Creating a Space in Private Staging mode...');
    const createRes = await request(
      server,
      'POST',
      '/api/spaces',
      {
        title: 'Secret Stealth App',
        description: 'Testing in workspace first',
        templateId: 'landing',
        visibility: 'private'
      },
      token
    );
    assert.strictEqual(createRes.status, 201);
    const space = createRes.body.space;
    assert.strictEqual(space.visibility, 'private');
    assert.strictEqual(space.status, 'draft');

    console.log('4. Verifying privacy enforcement against anonymous/other users...');
    const anonGet = await request(server, 'GET', `/api/spaces/${uniqueUser}/${space.slug}`);
    assert.strictEqual(anonGet.status, 404);

    console.log('5. Running In-Studio Coding Agent Builder in staging...');
    const agentBuildRes = await request(
      server,
      'POST',
      `/api/spaces/${uniqueUser}/${space.slug}/agent-build`,
      {
        prompt: 'Build an interactive Kanban task board',
        provider: 'builtin_agent'
      },
      token
    );
    assert.strictEqual(agentBuildRes.status, 200);
    assert.ok(agentBuildRes.body.space.draftFiles['index.html'].includes('FlowBoard Studio'));

    console.log('6. Buying a Hosting Plan (POST /api/hosting-plans/purchase)...');
    const purchaseRes = await request(
      server,
      'POST',
      '/api/hosting-plans/purchase',
      {
        planId: 'plan_pro_cloud',
        customDomain: 'stealth-maker.spacehub-edge.app'
      },
      token
    );
    assert.strictEqual(purchaseRes.status, 201);
    const purchasedConnId = purchaseRes.body.connection.id;
    assert.ok(purchasedConnId.startsWith('host_'));

    console.log('7. Deploying staged Space to the Purchased Hosting Service...');
    const deployRes = await request(
      server,
      'POST',
      `/api/spaces/${uniqueUser}/${space.slug}/deploy-external`,
      {
        connectionId: purchasedConnId,
        visibility: 'public'
      },
      token
    );
    assert.strictEqual(deployRes.status, 200);
    assert.strictEqual(deployRes.body.space.status, 'published');
    assert.strictEqual(
      deployRes.body.externalHost.liveUrl,
      `https://stealth-maker.spacehub-edge.app/${space.slug}`
    );

    console.log('8. Connecting an existing Hosting Service (BYO Host Webhook) & Exporting Bundle...');
    const connRes = await request(
      server,
      'POST',
      '/api/hosting-connections',
      {
        provider: 'vercel',
        name: 'My Existing Vercel Team',
        targetUrlOrProject: 'custom-vercel-domain.vercel.app'
      },
      token
    );
    assert.strictEqual(connRes.status, 201);

    const bundleRes = await request(
      server,
      'GET',
      `/api/spaces/${uniqueUser}/${space.slug}/export-bundle`,
      null,
      token
    );
    assert.strictEqual(bundleRes.status, 200);
    assert.ok(bundleRes.body.files['vercel.json'], 'Should include vercel.json in export bundle');
    assert.ok(bundleRes.body.files['netlify.toml'], 'Should include netlify.toml in export bundle');
    assert.ok(bundleRes.body.files['manifest.webmanifest'], 'Should include PWA manifest in export bundle');
    assert.ok(bundleRes.body.files['sw.js'], 'Should include PWA service worker in export bundle');

    console.log('8b. Verifying Android & iPhone PWA Manifest & Platform/Orientation choice...');
    const updatePlatRes = await request(
      server,
      'PUT',
      `/api/spaces/${uniqueUser}/${space.slug}`,
      {
        appPlatform: 'both',
        appOrientation: 'portrait'
      },
      token
    );
    assert.strictEqual(updatePlatRes.status, 200);
    assert.strictEqual(updatePlatRes.body.space.appPlatform, 'both');
    assert.strictEqual(updatePlatRes.body.space.appOrientation, 'portrait');

    const manifestRes = await request(server, 'GET', `/live/${space.slug}/manifest.webmanifest`);
    assert.strictEqual(manifestRes.status, 200);
    assert.strictEqual(manifestRes.body.display, 'standalone');
    assert.strictEqual(manifestRes.body.orientation, 'portrait');

    console.log('8c. Verifying Version Snapshot Rollback & Clone/Fork Space...');
    const rollbackRes = await request(
      server,
      'POST',
      `/api/spaces/${uniqueUser}/${space.slug}/rollback`,
      {},
      token
    );
    assert.strictEqual(rollbackRes.status, 200);
    assert.ok(rollbackRes.body.message.includes('Restored previous version'));

    const forkRes = await request(
      server,
      'POST',
      `/api/spaces/${uniqueUser}/${space.slug}/fork`,
      {},
      token
    );
    assert.strictEqual(forkRes.status, 201);
    assert.ok(forkRes.body.space.slug.includes('fork'));

    console.log('8d. Verifying Submissions Inbox, Client Preview Passcode & OpenGraph Tags...');
    const submitRes = await request(
      server,
      'POST',
      `/live/${space.slug}/submit`,
      { name: 'Dana Client', email: 'dana@example.com', message: 'Ready to launch!' }
    );
    assert.strictEqual(submitRes.status, 201);
    assert.strictEqual(submitRes.body.ok, true);

    const listSubsRes = await request(
      server,
      'GET',
      `/api/spaces/${uniqueUser}/${space.slug}/submissions`,
      null,
      token
    );
    assert.strictEqual(listSubsRes.status, 200);
    assert.strictEqual(listSubsRes.body.submissions.length, 1);
    assert.strictEqual(listSubsRes.body.submissions[0].email, 'dana@example.com');

    // Set private + previewPasscode on the forked space and verify client passcode access
    const forkedSlug = forkRes.body.space.slug;
    await request(
      server,
      'PUT',
      `/api/spaces/${uniqueUser}/${forkedSlug}`,
      { visibility: 'private', previewPasscode: 'secret2026' },
      token
    );
    const blockedPreview = await request(server, 'GET', `/live/${forkedSlug}?mode=draft`);
    assert.strictEqual(blockedPreview.status, 404);
    const allowedPreview = await request(
      server,
      'GET',
      `/live/${forkedSlug}?mode=draft&key=secret2026`
    );
    assert.strictEqual(allowedPreview.status, 200);
    assert.ok(
      String(allowedPreview.raw).includes('property="og:title"'),
      'Should inject OpenGraph social share card meta tags'
    );

    console.log('9. Testing External Coding Agent REST API with sh_pat_ token...');
    const patRes = await request(
      server,
      'POST',
      '/api/agent-keys',
      { name: 'Test Autonomous Agent' },
      token
    );
    const agentPat = patRes.body.key.token;

    const extCreate = await request(
      server,
      'POST',
      '/api/agent/v1/spaces',
      {
        title: 'CLI Agent Website',
        visibility: 'private'
      },
      agentPat
    );
    assert.strictEqual(extCreate.status, 201);

    console.log('ALL TESTS PASSED!');
  } finally {
    server.close();
  }
})();
