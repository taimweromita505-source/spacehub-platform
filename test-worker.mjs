import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import legacyWorker, { LEGACY_STATE_KEY } from './worker.js';

const statePath = await mkdtemp(join(tmpdir(), 'spacehub-worker-'));
let runtime;

try {
  const kvId = 'spacehub-local-migration-fixture';
  runtime = new Miniflare(convertV4MiniflareOptions({
    scriptPath: '.wrangler/build/worker-state.js',
    modules: true,
    compatibilityDate: '2026-11-10',
    durableObjects: { SPACEHUB_STATE: { className: 'SpaceHubState', useSQLite: true } },
    kvNamespaces: { SPACEHUB_KV: kvId },
    kvPersist: statePath,
    durableObjectsPersist: statePath
  }));
  const request = (path, options) => runtime.dispatchFetch(new URL(path, 'http://localhost'), options);
  const json = async (path, options, expected = 200) => {
    const response = await request(path, options);
    assert.equal(response.status, expected, path);
    return response.json();
  };
  const post = (body, token) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: JSON.stringify(body)
  });

  // Create the account and draft using the legacy Worker and its original KV format.
  const kv = await runtime.getKVNamespace('SPACEHUB_KV');
  const legacyRequest = async (path, options) => {
    const response = await legacyWorker.fetch(new Request(new URL(path, 'http://localhost'), options), {
      SPACEHUB_KV: kv
    });
    assert.equal(response.status, 201, path);
    return response.json();
  };
  const account = await legacyRequest('/api/auth/register', post({
    username: 'migration-test', password: 'test-password-24', displayName: 'Migration Test'
  }));
  const privateSpace = await legacyRequest('/api/spaces', post({
    title: 'Legacy draft', visibility: 'private', templateId: 'landing'
  }, account.token));
  const original = await kv.get(LEGACY_STATE_KEY);
  assert.equal((await json('/api/spaces?filter=mine', {
    headers: { Authorization: 'Bearer ' + account.token }
  })).spaces[0].slug, privateSpace.space.slug);
  assert.equal((await json('/api/spaces?filter=public')).spaces.length, 0);

  await Promise.all(['Concurrent draft A', 'Concurrent draft B'].map((title) =>
    json('/api/spaces', post({ title, visibility: 'private' }, account.token), 201)
  ));
  const ownSpaces = await json('/api/spaces?filter=mine', {
    headers: { Authorization: 'Bearer ' + account.token }
  });
  assert.deepEqual(ownSpaces.spaces.map(({ title }) => title).sort(),
    ['Concurrent draft A', 'Concurrent draft B', 'Legacy draft']);
  assert.equal(await kv.get(LEGACY_STATE_KEY), original);
  console.log('Worker migration, concurrent draft writes, and privacy checks passed.');
} finally {
  try {
    await runtime?.dispose();
  } finally {
    await rm(statePath, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

