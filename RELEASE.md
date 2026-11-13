# SpaceHub release checks

Run npm ci and npm test. Build the Worker with
npx wrangler deploy --dry-run --outdir .wrangler/build, then run
npm run test:worker. The Worker test seeds a temporary KV namespace with
a legacy account and draft, verifies the same session can read the
migrated private draft, and checks that simultaneous writes both persist.

## Preview

Run npx wrangler preview --name <review-name> to create or update a
public Cloudflare preview. The preview configuration uses an isolated
Durable Object and omits the production KV binding and PayPal secrets.
Use disposable accounts and data. Check signed-out navigation, the
workspace demo at desktop and mobile widths, template selection after
sign-in, private draft creation, and publishing in the preview.

## Production storage cutover

Use a single cutover with writes quiesced, including scheduled jobs and
webhooks, before the first production request can import the KV snapshot.
Confirm the snapshot is fresh and take a protected backup. Reconcile
existing Worker environment variables, secrets, custom domains and
triggers with Wrangler configuration before applying it.

The Durable Object imports legacy state once and writes subsequent
changes to SQLite. After cutover, check an existing account and Space,
draft saves, the published site and hosting state before reopening
writes. Preserve the KV snapshot for recovery. Once SQLite has accepted
writes, an older KV-backed Worker would serve stale data. Recover using
the SQLite-backed release or reconcile state before switching back.
