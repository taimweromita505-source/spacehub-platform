import { DurableObject } from 'cloudflare:workers';
import worker, { LEGACY_STATE_KEY } from './worker.js';

const stateName = 'spacehub-state-v1';
const chunkLength = 128 * 1024;

function stateObject(env) {
  return env.SPACEHUB_STATE.getByName(stateName);
}

export class SpaceHubState extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.pending = Promise.resolve();
    this.sql = ctx.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS state_chunks (part INTEGER PRIMARY KEY, payload TEXT NOT NULL)');
  }

  save(serialized) {
    this.ctx.storage.transactionSync(() => {
      this.sql.exec('DELETE FROM state_chunks');
      // JSON escapes lone surrogates. Split without breaking valid surrogate pairs.
      for (let offset = 0, part = 0; offset < serialized.length; part++) {
        let end = Math.min(offset + chunkLength, serialized.length);
        if (end < serialized.length && /[\uD800-\uDBFF]/.test(serialized[end - 1])) end--;
        this.sql.exec('INSERT INTO state_chunks VALUES (?, ?)', part, serialized.slice(offset, end));
        offset = end;
      }
    });
  }

  async load() {
    const parts = this.sql.exec('SELECT payload FROM state_chunks ORDER BY part').toArray();
    if (parts.length) return JSON.parse(parts.map(({ payload }) => payload).join(''));

    const legacy = await this.env.SPACEHUB_KV?.get(LEGACY_STATE_KEY, 'json') ?? null;
    if (legacy !== null && (typeof legacy !== 'object' || !Array.isArray(legacy.spaces) || !Array.isArray(legacy.users))) {
      throw new Error('Legacy SpaceHub state has an unexpected format');
    }
    this.save(JSON.stringify(legacy));
    return legacy;
  }

  async run(operation) {
    const previous = this.pending;
    let release;
    this.pending = new Promise((resolve) => { release = resolve; });
    await previous;
    try {
      return await operation({
        ...this.env,
        spaceHubStorage: {
          load: () => this.load(),
          save: (db) => this.save(JSON.stringify(db))
        }
      });
    } finally {
      release();
    }
  }

  fetch(request) {
    return this.run((env) => worker.handle(request, env));
  }

  runScheduled() {
    return this.run((env) => worker.scheduled(undefined, env));
  }
}

export default {
  fetch(request, env) {
    return worker.fetch(request, env, (r) => stateObject(env).fetch(r));
  },
  scheduled(_event, env) {
    return stateObject(env).runScheduled();
  }
};
