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
    assert.strictEqual(plansRes.body.plans.length, 2, 'Should offer $1/month and $12/year hosting plans');
    assert.strictEqual(plansRes.body.plans[0].priceLabel, '$1 / month');
    assert.strictEqual(plansRes.body.plans[1].priceLabel, '$12 / year');

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
