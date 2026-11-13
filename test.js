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
          resolve({ status: res.statusCode, body: json, raw, headers: res.headers });
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

    console.log('10. Testing Sign In with Gmail / Social Account (POST /api/auth/social)...');
    const gmailAuth = await request(server, 'POST', '/api/auth/social', {
      provider: 'google',
      email: `creator_${Date.now()}@gmail.com`,
      displayName: 'Gmail Creator'
    });
    assert.strictEqual(gmailAuth.status, 200);
    assert.ok(gmailAuth.body.token, 'Should return session token for Gmail sign-in');
    assert.strictEqual(gmailAuth.body.user.socialProvider, 'google');

    console.log('11. Testing Advanced Space Cloud JSON Storage API (/live/:slug/storage)...');
    const storePost = await request(server, 'POST', `/live/${space.slug}/storage`, {
      todos: [{ id: 1, title: 'Ship v2 app' }],
      counter: 42
    });
    assert.strictEqual(storePost.status, 200);
    assert.strictEqual(storePost.body.data.counter, 42);

    const storeGet = await request(server, 'GET', `/live/${space.slug}/storage?key=counter`);
    assert.strictEqual(storeGet.status, 200);
    assert.strictEqual(storeGet.body.data, 42);

    console.log('12. Testing Server-Side API Proxy & Secrets Vault (POST /live/:slug/proxy)...');
    const secretSave = await request(
      server,
      'PUT',
      `/api/spaces/${uniqueUser}/${space.slug}`,
      { secrets: 'API_KEY=sk_secret_vault_999\nWEBHOOK_TOKEN=wh_tok_123' },
      token
    );
    assert.strictEqual(secretSave.status, 200);
    assert.deepStrictEqual(secretSave.body.space.secretKeys, ['API_KEY', 'WEBHOOK_TOKEN']);

    const proxyCall = await request(server, 'POST', `/live/${space.slug}/proxy`, {
      url: 'mock://api.example.com/v1/data?token={{WEBHOOK_TOKEN}}',
      method: 'POST',
      headers: { Authorization: 'Bearer {{API_KEY}}' },
      body: { prompt: 'Test with {{API_KEY}}' }
    });
    assert.strictEqual(proxyCall.status, 200);
    assert.strictEqual(proxyCall.body.ok, true);
    assert.strictEqual(
      proxyCall.body.data.resolvedUrl,
      'mock://api.example.com/v1/data?token=wh_tok_123'
    );
    assert.strictEqual(
      proxyCall.body.data.headers.Authorization,
      'Bearer sk_secret_vault_999'
    );
    assert.strictEqual(
      proxyCall.body.data.body.prompt,
      'Test with sk_secret_vault_999'
    );

    console.log('13. Testing Wave 4: Space Member Auth, Named Checkpoints, Custom Domain & Submission Webhooks...');
    const memberReg = await request(server, 'POST', `/live/${space.slug}/auth`, {
      email: 'member1@example.com',
      password: 'Password123!',
      name: 'Member One'
    });
    assert.strictEqual(memberReg.status, 200);
    assert.ok(memberReg.body.token, 'Should issue Space member auth token');

    const memberMe = await request(
      server,
      'GET',
      `/live/${space.slug}/auth/me`,
      null,
      memberReg.body.token
    );
    assert.strictEqual(memberMe.status, 200);
    assert.strictEqual(memberMe.body.user.email, 'member1@example.com');

    const snapSave = await request(
      server,
      'POST',
      `/api/spaces/${uniqueUser}/${space.slug}/snapshot`,
      { label: 'v1 Checkpoint Ready' },
      token
    );
    assert.strictEqual(snapSave.status, 201);
    assert.strictEqual(snapSave.body.space.snapshots[0].label, 'v1 Checkpoint Ready');

    await request(
      server,
      'PUT',
      `/api/spaces/${uniqueUser}/${space.slug}`,
      {
        customDomain: 'app.mybrand.com',
        submissionWebhookUrl: 'mock://discord.com/api/webhooks/123'
      },
      token
    );

    const hookSubmit = await request(server, 'POST', `/live/${space.slug}/submit`, {
      name: 'Webhook Lead',
      email: 'lead@mybrand.com',
      message: 'Testing Discord webhook alert'
    });
    assert.strictEqual(hookSubmit.status, 201);

    const updatedSpace = await request(
      server,
      'GET',
      `/api/spaces/${uniqueUser}/${space.slug}`,
      null,
      token
    );
    assert.strictEqual(updatedSpace.body.space.customDomain, 'app.mybrand.com');
    assert.strictEqual(
      updatedSpace.body.space.lastWebhookStatus,
      'delivered_mock:mock://discord.com/api/webhooks/123'
    );

    console.log('14. Testing Wave 5: Built-in AI (/ai), Multiplayer Room (/room), Collaborators & SPA Fallback...');
    const aiRes = await request(server, 'POST', `/live/${space.slug}/ai`, {
      prompt: 'Summarize today metrics'
    });
    assert.strictEqual(aiRes.status, 200);
    assert.strictEqual(aiRes.body.ok, true);
    assert.ok(aiRes.body.reply.includes('Summarize today metrics'));

    const roomPost = await request(server, 'POST', `/live/${space.slug}/room`, {
      sender: 'PlayerOne',
      text: 'Hello live room!',
      payload: { x: 120, y: 240 }
    });
    assert.strictEqual(roomPost.status, 201);
    assert.strictEqual(roomPost.body.events.length, 1);

    const roomGet = await request(server, 'GET', `/live/${space.slug}/room`);
    assert.strictEqual(roomGet.status, 200);
    assert.strictEqual(roomGet.body.events[0].sender, 'PlayerOne');

    const collabUsername = gmailAuth.body.user.username;
    const collabToken = gmailAuth.body.token;
    const addCollab = await request(
      server,
      'PUT',
      `/api/spaces/${uniqueUser}/${space.slug}`,
      { collaborators: `@${collabUsername}` },
      token
    );
    assert.strictEqual(addCollab.status, 200);
    assert.deepStrictEqual(addCollab.body.space.collaborators, [collabUsername]);

    const collabEdit = await request(
      server,
      'PUT',
      `/api/spaces/${uniqueUser}/${space.slug}`,
      { description: 'Updated by team collaborator' },
      collabToken
    );
    assert.strictEqual(collabEdit.status, 200);
    assert.strictEqual(collabEdit.body.space.description, 'Updated by team collaborator');

    const spaFallback = await request(server, 'GET', `/live/${space.slug}/dashboard-subroute`);
    assert.strictEqual(spaFallback.status, 200);
    assert.ok(String(spaFallback.raw).includes('<!DOCTYPE html>'));

    console.log('15. Testing Wave 6: Media Assets (/assets), Full-Text Search (/search), Cron Tasks (/cron) & SEO Sitemap/Health...');
    const uploadAsset = await request(server, 'POST', `/live/${space.slug}/assets`, {
      name: 'badge.svg',
      content: '<svg xmlns="http://www.w3.org/2000/svg"><text>SpaceAsset</text></svg>',
      mimeType: 'image/svg+xml; charset=utf-8'
    });
    assert.strictEqual(uploadAsset.status, 201);
    assert.strictEqual(uploadAsset.body.asset.name, 'badge.svg');

    const getAsset = await request(server, 'GET', `/live/${space.slug}/assets/badge.svg`);
    assert.strictEqual(getAsset.status, 200);
    assert.ok(String(getAsset.raw).includes('SpaceAsset'));

    const listAssets = await request(server, 'GET', `/live/${space.slug}/assets`);
    assert.strictEqual(listAssets.status, 200);
    assert.strictEqual(listAssets.body.assets.length, 1);

    await request(server, 'POST', `/live/${space.slug}/storage`, {
      searchable_note: 'Quantum Launch Checklist 2026'
    });
    const searchRes = await request(server, 'GET', `/live/${space.slug}/search?q=Quantum`);
    assert.strictEqual(searchRes.status, 200);
    assert.ok(searchRes.body.count >= 1);
    assert.strictEqual(searchRes.body.results[0].type, 'storage');

    const cronRun = await request(
      server,
      'POST',
      `/api/spaces/${uniqueUser}/${space.slug}/cron`,
      { webhookUrl: 'mock://daily-sync' },
      token
    );
    assert.strictEqual(cronRun.status, 200);
    assert.strictEqual(cronRun.body.cronLastStatus, 'ok_mock:mock://daily-sync');

    const sitemapRes = await request(server, 'GET', `/live/${space.slug}/sitemap.xml`);
    assert.strictEqual(sitemapRes.status, 200);
    assert.ok(String(sitemapRes.raw).includes('<urlset'));

    const robotsRes = await request(server, 'GET', `/live/${space.slug}/robots.txt`);
    assert.strictEqual(robotsRes.status, 200);
    assert.ok(String(robotsRes.raw).includes('Sitemap:'));

    const healthRes = await request(server, 'GET', `/live/${space.slug}/health`);
    assert.strictEqual(healthRes.status, 200);
    assert.strictEqual(healthRes.body.ok, true);
    assert.strictEqual(healthRes.body.assetCount, 1);

    console.log('16. Testing Wave 7: Serverless Edge Functions (/fn), Custom Analytics (/events), Transactional Notify (/notify) & Runtime Config (/config.json)...');
    const fnCall = await request(server, 'POST', `/live/${space.slug}/fn?action=custom_ping`, {
      action: 'custom_ping',
      setStorage: { fn_executed: true }
    });
    assert.strictEqual(fnCall.status, 200);
    assert.strictEqual(fnCall.body.ok, true);
    assert.strictEqual(fnCall.body.action, 'custom_ping');
    assert.strictEqual(fnCall.body.storage.fn_executed, true);

    const trackEv = await request(server, 'POST', `/live/${space.slug}/events`, {
      event: 'checkout_clicked',
      props: { plan: 'annual' }
    });
    assert.strictEqual(trackEv.status, 201);
    assert.strictEqual(trackEv.body.count, 1);

    const getEv = await request(server, 'GET', `/live/${space.slug}/events`);
    assert.strictEqual(getEv.status, 200);
    assert.strictEqual(getEv.body.counts.checkout_clicked, 1);

    const notifyCall = await request(server, 'POST', `/live/${space.slug}/notify`, {
      to: 'founder@spacehub.win',
      subject: 'New VIP Signup',
      message: 'A new user upgraded on your Space!'
    });
    assert.strictEqual(notifyCall.status, 201);
    assert.strictEqual(notifyCall.body.notification.status, 'queued_outbox');

    const cfgUpdate = await request(server, 'POST', `/live/${space.slug}/config.json`, {
      flags: { betaBanner: true }
    });
    assert.strictEqual(cfgUpdate.status, 200);
    assert.strictEqual(cfgUpdate.body.config.flags.betaBanner, true);

    console.log('17. Testing Wave 8: Structured Table DB (/db/:table), Full Space Backup/Restore, Maintenance Mode & RSS/JSON Feeds...');
    const rowInsert = await request(server, 'POST', `/live/${space.slug}/db/posts`, {
      title: 'SpaceHub Wave 8 Launch',
      summary: 'Structured tables and feeds are live!',
      status: 'active'
    });
    assert.strictEqual(rowInsert.status, 201);
    const insertedId = rowInsert.body.row.id;

    const rowQuery = await request(server, 'GET', `/live/${space.slug}/db/posts?where=status:active`);
    assert.strictEqual(rowQuery.status, 200);
    assert.strictEqual(rowQuery.body.count, 1);

    const rowPatch = await request(server, 'PATCH', `/live/${space.slug}/db/posts?id=${insertedId}`, {
      title: 'SpaceHub Wave 8 Updated'
    });
    assert.strictEqual(rowPatch.status, 200);
    assert.strictEqual(rowPatch.body.row.title, 'SpaceHub Wave 8 Updated');

    const jsonFeed = await request(server, 'GET', `/live/${space.slug}/feed.json`);
    assert.strictEqual(jsonFeed.status, 200);
    assert.strictEqual(jsonFeed.body.items[0].title, 'SpaceHub Wave 8 Updated');

    const rssFeed = await request(server, 'GET', `/live/${space.slug}/rss.xml`);
    assert.strictEqual(rssFeed.status, 200);
    assert.ok(String(rssFeed.raw).includes('<rss version="2.0">'));

    const backupRes = await request(
      server,
      'GET',
      `/api/spaces/${uniqueUser}/${space.slug}/backup`,
      null,
      token
    );
    assert.strictEqual(backupRes.status, 200);
    assert.strictEqual(backupRes.body.ok, true);
    assert.strictEqual(backupRes.body.space.dbTables.posts.length, 1);

    const restoreRes = await request(
      server,
      'POST',
      `/api/spaces/${uniqueUser}/${space.slug}/restore`,
      { backup: backupRes.body },
      token
    );
    assert.strictEqual(restoreRes.status, 200);
    assert.strictEqual(restoreRes.body.ok, true);

    await request(
      server,
      'PUT',
      `/api/spaces/${uniqueUser}/${space.slug}`,
      { maintenanceMode: true },
      token
    );
    const maintAnon = await request(server, 'GET', `/live/${space.slug}`);
    assert.strictEqual(maintAnon.status, 503);
    const maintOwner = await request(server, 'GET', `/live/${space.slug}`, null, token);
    assert.strictEqual(maintOwner.status, 200);

    console.log('18. Testing Wave 9: Orders API (/orders), A/B Split Testing, redirects.json & Rate-Limit Headers...');
    const wave9Setup = await request(
      server,
      'PUT',
      `/api/spaces/${uniqueUser}/${space.slug}`,
      {
        maintenanceMode: false,
        secrets: 'PAYPAL_EMAIL=seller@example.com',
        draftFiles: {
          'index.b.html': '<!DOCTYPE html><html><head><title>B</title></head><body><h1>VARIANT_B_MARK</h1></body></html>',
          'redirects.json': JSON.stringify({
            '/twitter': 'https://x.com/spacehub',
            '/pricing': '/index.html#pricing'
          })
        }
      },
      token
    );
    assert.strictEqual(wave9Setup.status, 200);
    const wave9Publish = await request(
      server,
      'POST',
      `/api/spaces/${uniqueUser}/${space.slug}/deploy-external`,
      { connectionId: purchasedConnId },
      token
    );
    assert.strictEqual(wave9Publish.status, 200);

    const orderCreate = await request(server, 'POST', `/live/${space.slug}/orders`, {
      items: [
        { name: 'Pro Plan', priceUsd: 10, qty: 2 },
        { name: 'Sticker', priceUsd: 5.5, qty: 1 }
      ],
      buyerEmail: 'buyer@example.com'
    });
    assert.strictEqual(orderCreate.status, 201);
    assert.strictEqual(orderCreate.body.order.amountUsd, 25.5);
    assert.ok(orderCreate.body.order.checkoutUrl.includes('paypal.com'));
    assert.ok(orderCreate.body.order.checkoutUrl.includes('seller%40example.com'));
    assert.ok(orderCreate.headers['x-ratelimit-limit']);
    assert.ok(orderCreate.headers['x-ratelimit-remaining']);
    const orderId = orderCreate.body.order.id;

    const orderEmpty = await request(server, 'POST', `/live/${space.slug}/orders`, { items: [] });
    assert.strictEqual(orderEmpty.status, 400);

    const orderPublic = await request(server, 'GET', `/live/${space.slug}/orders?id=${orderId}`);
    assert.strictEqual(orderPublic.status, 200);
    assert.strictEqual(orderPublic.body.order.status, 'pending');
    assert.strictEqual(orderPublic.body.order.buyerEmail, undefined);

    const orderListAnon = await request(server, 'GET', `/live/${space.slug}/orders`);
    assert.strictEqual(orderListAnon.status, 403);
    const orderListOwner = await request(server, 'GET', `/live/${space.slug}/orders`, null, token);
    assert.strictEqual(orderListOwner.status, 200);
    assert.strictEqual(orderListOwner.body.orders.length, 1);

    const orderPatchAnon = await request(server, 'PATCH', `/live/${space.slug}/orders?id=${orderId}`, {
      status: 'paid'
    });
    assert.strictEqual(orderPatchAnon.status, 403);
    const orderPatchOwner = await request(
      server,
      'PATCH',
      `/live/${space.slug}/orders?id=${orderId}`,
      { status: 'paid' },
      token
    );
    assert.strictEqual(orderPatchOwner.status, 200);
    assert.strictEqual(orderPatchOwner.body.order.status, 'paid');

    const abB = await request(server, 'GET', `/live/${space.slug}?variant=b`);
    assert.strictEqual(abB.status, 200);
    assert.ok(String(abB.raw).includes('VARIANT_B_MARK'));
    assert.ok(String(abB.headers['set-cookie'] || '').includes(`sh_ab_${space.slug}=b`));
    const abA = await request(server, 'GET', `/live/${space.slug}?variant=a`);
    assert.strictEqual(abA.status, 200);
    assert.ok(!String(abA.raw).includes('VARIANT_B_MARK'));

    const redirExternal = await request(server, 'GET', `/live/${space.slug}/twitter`);
    assert.strictEqual(redirExternal.status, 302);
    assert.strictEqual(redirExternal.headers.location, 'https://x.com/spacehub');
    const redirInternal = await request(server, 'GET', `/live/${space.slug}/pricing`);
    assert.strictEqual(redirInternal.status, 302);
    assert.strictEqual(redirInternal.headers.location, `/live/${space.slug}#pricing`);

    console.log('ALL TESTS PASSED!');
  } finally {
    server.close();
  }
})();
