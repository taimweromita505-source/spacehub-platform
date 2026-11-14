// Automated test suite for Wave 15:
// 1. Built-in SQL/Query Explorer & CSV Data Importer/Exporter (/live/:slug/db/:table/csv & submissions CSV)
// 2. Automated Scheduled Space Backups & Point-in-Time Snapshot Diff (/api/spaces/:owner/:slug/snapshots-diff & scheduled())
// 3. Edge CORS, Security Headers & CSP Policy Customizer (headers.json)
// 4. Live Visitor Presence & Real-Time Cursor/Session Counter (/live/:slug/presence & /live/:slug/presence.svg)
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
  console.log('--- RUNNING WAVE 15 TESTS ---');

  // Register test creator
  const regRes = await handle('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'wave15creator',
      password: 'Wave15Password!',
      displayName: 'Wave 15 Architect'
    })
  });
  assert.equal(regRes.status, 201);
  const { token } = await regRes.json();

  // Create Space with custom headers.json
  const customHeadersJson = JSON.stringify({
    '/*': {
      'X-Frame-Options': 'SAMEORIGIN',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' https:",
      'X-Custom-Edge': 'SpaceHubWave15'
    }
  });

  const createRes = await handle('/api/spaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Wave 15 Enterprise Suite',
      visibility: 'public',
      templateId: 'kanban',
      files: {
        'index.html': '<!DOCTYPE html><html><body><h1>Wave 15 v1</h1></body></html>',
        'style.css': 'body { color: #fff; }',
        'headers.json': customHeadersJson
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

  // 1. Test CSV Data Importer/Exporter & Query Explorer
  console.log('1. Testing Built-in Query Explorer & CSV Data Importer/Exporter...');
  const sampleCsv = [
    'name,role,score,active',
    '"Alice Smith",engineer,98,true',
    '"Bob Jones",designer,84,true',
    '"Charlie Brown",manager,91,false'
  ].join('\n');

  const csvImportRes = await handle(`/live/${slug}/db/members/csv`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/csv' },
    body: sampleCsv
  });
  assert.equal(csvImportRes.status, 201);
  const csvImportData = await csvImportRes.json();
  assert.equal(csvImportData.importedCount, 3);
  assert.equal(csvImportData.count, 3);

  // Query Explorer with search q, sort, and limit
  const queryRes = await handle(`/live/${slug}/db/members?q=alice&limit=1`);
  assert.equal(queryRes.status, 200);
  const queryData = await queryRes.json();
  assert.equal(queryData.count, 1);
  assert.equal(queryData.rows[0].name, 'Alice Smith');
  assert.equal(queryData.rows[0].score, 98);
  assert.equal(queryData.rows[0].active, true);

  // Export table as CSV
  const csvExportRes = await handle(`/live/${slug}/db/members/csv?sort=score:desc`);
  assert.equal(csvExportRes.status, 200);
  assert.ok(csvExportRes.headers.get('content-type')?.includes('text/csv'));
  const exportedCsv = await csvExportRes.text();
  assert.ok(exportedCsv.includes('Alice Smith'));
  assert.ok(exportedCsv.includes('Charlie Brown'));

  // Submit form and export submissions as CSV
  await handle(`/live/${slug}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Lead One', email: 'lead1@example.com', message: 'Interested in Enterprise' })
  });
  const subCsvRes = await handle(`/api/spaces/${ownerUsername}/${slug}/submissions?format=csv`, {}, token);
  assert.equal(subCsvRes.status, 200);
  assert.ok(subCsvRes.headers.get('content-type')?.includes('text/csv'));
  const subCsvText = await subCsvRes.text();
  assert.ok(subCsvText.includes('lead1@example.com'));

  // 2. Test Automated Scheduled Space Backups & Point-in-Time Snapshot Diff
  console.log('2. Testing Automated Scheduled Space Backups & Snapshot Diff...');
  // Save an initial manual snapshot
  const snap1Res = await handle(`/api/spaces/${ownerUsername}/${slug}/snapshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label: 'Initial v1' })
  }, token);
  assert.equal(snap1Res.status, 201);
  const snap1Data = await snap1Res.json();
  const firstSnapId = snap1Data.space.snapshots[0].id;

  // Edit draft files so scheduled auto-backup detects changes
  const editRes = await handle(`/api/spaces/${ownerUsername}/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      draftFiles: {
        'index.html': '<!DOCTYPE html><html><body><h1>Wave 15 v2 Updated</h1><p>New feature</p></body></html>',
        'style.css': 'body { color: #fff; background: #111; }',
        'headers.json': customHeadersJson,
        'extra.js': 'console.log("wave15");'
      }
    })
  }, token);
  assert.equal(editRes.status, 200);

  // Trigger Cloudflare Worker scheduled() cron handler
  await worker.scheduled({}, env);

  // Verify auto-backup snapshot was created and compare diffs
  const diffRes = await handle(`/api/spaces/${ownerUsername}/${slug}/snapshots-diff?from=${firstSnapId}&to=current`, {}, token);
  assert.equal(diffRes.status, 200);
  const diffData = await diffRes.json();
  assert.ok(diffData.ok);
  assert.ok(diffData.filesChanged >= 2);
  assert.ok(diffData.diffs.some((d) => d.file === 'extra.js' && d.status === 'added'));
  assert.ok(diffData.diffs.some((d) => d.file === 'index.html' && d.status === 'modified'));

  // 3. Test Edge CORS, Security Headers & CSP Policy Customizer
  console.log('3. Testing Edge CORS, Security Headers & CSP Policy Customizer...');
  const livePageRes = await handle(`/live/${slug}`);
  assert.equal(livePageRes.status, 200);
  assert.equal(livePageRes.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.equal(livePageRes.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(livePageRes.headers.get('x-custom-edge'), 'SpaceHubWave15');
  assert.ok(livePageRes.headers.get('content-security-policy')?.includes("default-src 'self'"));

  // 4. Test Live Visitor Presence & Real-Time Cursor/Session Counter
  console.log('4. Testing Live Visitor Presence & Real-Time Cursor/Session Counter...');
  const p1Res = await handle(`/live/${slug}/presence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'sess_alpha',
      username: 'Alice',
      color: '#ec4899',
      cursor: { x: 120, y: 340 },
      status: 'editing'
    })
  });
  assert.equal(p1Res.status, 200);
  const p1Data = await p1Res.json();
  assert.equal(p1Data.onlineCount, 1);

  const p2Res = await handle(`/live/${slug}/presence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'sess_beta',
      username: 'Bob',
      color: '#3b82f6',
      cursor: { x: 400, y: 210 },
      status: 'viewing'
    })
  });
  assert.equal(p2Res.status, 200);
  const p2Data = await p2Res.json();
  assert.equal(p2Data.onlineCount, 2);
  assert.equal(p2Data.sessions.length, 2);

  // Verify live SVG badge reflects 2 online visitors
  const badgeRes = await handle(`/live/${slug}/presence.svg`);
  assert.equal(badgeRes.status, 200);
  assert.ok(badgeRes.headers.get('content-type')?.includes('image/svg+xml'));
  const badgeSvg = await badgeRes.text();
  assert.ok(badgeSvg.includes('2 online now'));

  // Remove one session
  const delPresRes = await handle(`/live/${slug}/presence?sessionId=sess_alpha`, {
    method: 'DELETE'
  });
  assert.equal(delPresRes.status, 200);
  const delPresData = await delPresRes.json();
  assert.equal(delPresData.onlineCount, 1);

  console.log('WAVE 15 TESTS PASSED!');
}

runTests().catch((err) => {
  console.error('Wave 15 Test Failed:', err);
  process.exit(1);
});
