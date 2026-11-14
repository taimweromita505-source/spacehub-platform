import assert from 'node:assert/strict';
import worker from './worker.js';

function createMockEnv() {
  const store = new Map();
  return {
    SPACEHUB_KV: {
      async get(key, type) {
        const val = store.get(key);
        if (val === undefined) return null;
        return type === 'json' ? JSON.parse(val) : val;
      },
      async put(key, val) {
        store.set(key, typeof val === 'string' ? val : JSON.stringify(val));
      }
    }
  };
}

async function callWorker(env, path, options = {}) {
  const url = path.startsWith('http') ? path : `https://spacehub.win${path}`;
  const req = new Request(url, {
    method: options.method || 'GET',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {})
    },
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined
  });
  return worker.fetch(req, env);
}

async function runTests() {
  console.log('Running Wave 22 Verification Suite (Core Web Vitals Auto-Optimizer, Booking Engine, Promo Coupons, Changelog RSS)...');
  const env = createMockEnv();

  // 0. Register a user and create a test Space with unoptimized HTML/CSS
  const regRes = await callWorker(env, '/api/auth/register', {
    method: 'POST',
    body: {
      username: 'wave22builder',
      email: 'wave22@spacehub.win',
      password: 'Password123!'
    }
  });
  assert.equal(regRes.status, 201, 'Registration should succeed');
  const regData = await regRes.json();
  const token = regData.token;

  const createRes = await callWorker(env, '/api/spaces', {
    method: 'POST',
    token,
    body: {
      title: 'Wave 22 Studio App',
      slug: 'wave22-app',
      description: 'Testing Vitals Auto-Optimizer, Bookings, Coupons, and Changelog RSS',
      visibility: 'public'
    }
  });
  assert.equal(createRes.status, 201, 'Space creation should succeed');

  // Seed unoptimized HTML & CSS to test Core Web Vitals Optimizer
  const saveUnoptimizedRes = await callWorker(env, '/api/spaces/wave22builder/wave22-app/files', {
    method: 'PUT',
    token,
    body: {
      files: {
        'index.html': '<!DOCTYPE html><html><head><script src="https://cdn.example.com/analytics.js"></script></head><body><img src="/hero.jpg" alt="Hero"><section class="features"><img src="/feat.png" alt="Feature"></section><footer>Footer</footer></body></html>',
        'style.css': 'body { margin: 0; font-family: sans-serif; }'
      },
      publish: true
    }
  });
  assert.equal(saveUnoptimizedRes.status, 200);

  // 1. Test 1-Click Core Web Vitals & LCP Auto-Optimizer (/api/spaces/:owner/:slug/vitals-optimize)
  console.log('1. Testing 1-Click Core Web Vitals & LCP Auto-Optimizer...');
  const auditBeforeRes = await callWorker(env, '/api/spaces/wave22builder/wave22-app/vitals-optimize', {
    method: 'GET',
    token
  });
  assert.equal(auditBeforeRes.status, 200);
  const auditBefore = await auditBeforeRes.json();
  assert.equal(auditBefore.ok, true);
  assert.equal(auditBefore.optimized, false, 'Unoptimized Space should report issues');
  assert.ok(auditBefore.issues.length >= 3, 'Should detect LCP fetchpriority, CLS image dimensions, INP blocking script, and CSS content-visibility issues');

  const optimizeRes = await callWorker(env, '/api/spaces/wave22builder/wave22-app/vitals-optimize', {
    method: 'POST',
    token
  });
  assert.equal(optimizeRes.status, 200);
  const optimizeData = await optimizeRes.json();
  assert.equal(optimizeData.ok, true);
  assert.equal(optimizeData.optimized, true);
  assert.equal(optimizeData.score, 100, 'Score should reach 100/100 after 1-click auto-optimization');
  assert.equal(optimizeData.grade, 'A');
  assert.ok(optimizeData.fixesApplied.length >= 3);
  assert.ok(optimizeData.files['index.html'].includes('fetchpriority="high"'), 'Hero image should have fetchpriority="high"');
  assert.ok(optimizeData.files['index.html'].includes('width="800" height="450"'), 'Images should have explicit width/height');
  assert.ok(optimizeData.files['index.html'].includes('<script defer'), 'External script should have defer attribute');
  assert.ok(optimizeData.files['style.css'].includes('content-visibility: auto'), 'CSS should include content-visibility: auto');
  console.log('   ✓ 1-Click Core Web Vitals & LCP Auto-Optimizer verified');

  // 2. Test Built-in Booking, Appointment & Calendar Engine (/live/:slug/bookings)
  console.log('2. Testing Built-in Booking, Appointment & Calendar Engine...');
  const slotsBeforeRes = await callWorker(env, '/live/wave22-app/bookings/slots?date=2026-12-20');
  assert.equal(slotsBeforeRes.status, 200);
  const slotsBefore = await slotsBeforeRes.json();
  assert.ok(slotsBefore.availableSlots.includes('10:30'), '10:30 slot should initially be available');

  const bookRes = await callWorker(env, '/live/wave22-app/bookings', {
    method: 'POST',
    body: {
      date: '2026-12-20',
      time: '10:30',
      durationMins: 45,
      customerName: 'Jordan Lee',
      customerEmail: 'jordan@example.com',
      service: 'Architecture Review',
      notes: 'Reviewing edge worker latency'
    }
  });
  assert.equal(bookRes.status, 201);
  const bookData = await bookRes.json();
  assert.equal(bookData.ok, true);
  assert.ok(bookData.booking.id.startsWith('bk_'));
  assert.ok(bookData.booking.confirmationCode.startsWith('CONF-'));

  // Verify double-booking conflict protection (409 Conflict)
  const conflictRes = await callWorker(env, '/live/wave22-app/bookings', {
    method: 'POST',
    body: {
      date: '2026-12-20',
      time: '10:30',
      customerName: 'Second Caller',
      customerEmail: 'second@example.com'
    }
  });
  assert.equal(conflictRes.status, 409, 'Double-booking the same date+time must return 409 Conflict');

  // Verify slot is removed from availableSlots
  const slotsAfterRes = await callWorker(env, '/live/wave22-app/bookings/slots?date=2026-12-20');
  const slotsAfter = await slotsAfterRes.json();
  assert.ok(!slotsAfter.availableSlots.includes('10:30'), 'Booked 10:30 slot must no longer be listed in availableSlots');
  assert.ok(slotsAfter.bookedSlots.includes('10:30'), 'Booked 10:30 slot must appear in bookedSlots');

  // Verify RFC 5545 .ics calendar invite download
  const icsRes = await callWorker(env, `/live/wave22-app/bookings/${bookData.booking.id}/invite.ics`);
  assert.equal(icsRes.status, 200);
  assert.ok((icsRes.headers.get('content-type') || '').includes('text/calendar'));
  const icsBody = await icsRes.text();
  assert.ok(icsBody.includes('BEGIN:VCALENDAR') && icsBody.includes('BEGIN:VEVENT'));
  assert.ok(icsBody.includes('DTSTART:20261220T103000Z'));
  assert.ok(icsBody.includes('DTEND:20261220T111500Z'));

  // Cancel booking and verify slot is freed
  const cancelRes = await callWorker(env, `/live/wave22-app/bookings/${bookData.booking.id}`, {
    method: 'DELETE'
  });
  assert.equal(cancelRes.status, 200);
  const slotsFreedRes = await callWorker(env, '/live/wave22-app/bookings/slots?date=2026-12-20');
  const slotsFreed = await slotsFreedRes.json();
  assert.ok(slotsFreed.availableSlots.includes('10:30'), 'Cancelled booking should free the 10:30 slot');
  console.log('   ✓ Built-in Booking, Appointment & Calendar Engine (.ics + conflict protection) verified');

  // 3. Test Built-in Promo Codes, Discounts & Coupon Engine (/live/:slug/coupons + /live/:slug/orders)
  console.log('3. Testing Built-in Promo Codes, Discounts & Coupon Engine...');
  const createCouponRes = await callWorker(env, '/live/wave22-app/coupons', {
    method: 'POST',
    token,
    body: {
      code: 'LAUNCH25',
      discountType: 'percent',
      discountValue: 25,
      minOrderUsd: 20,
      maxUses: 1
    }
  });
  assert.equal(createCouponRes.status, 201);
  const couponData = await createCouponRes.json();
  assert.equal(couponData.coupon.code, 'LAUNCH25');

  // Validate coupon preview
  const validateCouponRes = await callWorker(env, '/live/wave22-app/coupons/validate', {
    method: 'POST',
    body: {
      code: 'launch25',
      amountUsd: 80
    }
  });
  assert.equal(validateCouponRes.status, 200);
  const validateData = await validateCouponRes.json();
  assert.equal(validateData.valid, true);
  assert.equal(validateData.discountUsd, 20);
  assert.equal(validateData.finalAmountUsd, 60);

  // Create order applying LAUNCH25 coupon
  const discountedOrderRes = await callWorker(env, '/live/wave22-app/orders', {
    method: 'POST',
    body: {
      items: [{ name: 'Annual License', priceUsd: 80, qty: 1 }],
      buyerEmail: 'buyer@example.com',
      couponCode: 'LAUNCH25'
    }
  });
  assert.equal(discountedOrderRes.status, 201);
  const discountedOrder = await discountedOrderRes.json();
  assert.equal(discountedOrder.order.subtotalUsd, 80);
  assert.equal(discountedOrder.order.discountUsd, 20);
  assert.equal(discountedOrder.order.amountUsd, 60);
  assert.equal(discountedOrder.order.couponCode, 'LAUNCH25');

  // Verify maxUses=1 prevents a second redemption
  const exhaustedOrderRes = await callWorker(env, '/live/wave22-app/orders', {
    method: 'POST',
    body: {
      items: [{ name: 'Annual License', priceUsd: 80, qty: 1 }],
      buyerEmail: 'secondbuyer@example.com',
      couponCode: 'LAUNCH25'
    }
  });
  assert.equal(exhaustedOrderRes.status, 400, 'Redeeming an exhausted coupon must return 400');
  console.log('   ✓ Promo Codes, Discounts & Coupon Engine integrated with Orders verified');

  // 4. Test Per-Space Changelog & "What's New" Release Feed (/live/:slug/changelog & /live/:slug/changelog.rss)
  console.log('4. Testing Per-Space Changelog & Release Feed...');
  const pubChangelogRes = await callWorker(env, '/live/wave22-app/changelog', {
    method: 'POST',
    token,
    body: {
      version: 'v2.4.0',
      title: 'Instant LCP Optimization & Booking Calendar',
      summary: 'Added 1-click Core Web Vitals tuning and RFC 5545 calendar invites.',
      category: 'performance',
      changes: [
        'Added fetchpriority="high" auto-injection',
        'Added /bookings/slots and .ics export'
      ]
    }
  });
  assert.equal(pubChangelogRes.status, 201);

  const listChangelogRes = await callWorker(env, '/live/wave22-app/changelog?category=performance');
  assert.equal(listChangelogRes.status, 200);
  const changelogData = await listChangelogRes.json();
  assert.equal(changelogData.count, 1);
  assert.equal(changelogData.entries[0].version, 'v2.4.0');

  const rssChangelogRes = await callWorker(env, '/live/wave22-app/changelog.rss');
  assert.equal(rssChangelogRes.status, 200);
  assert.ok((rssChangelogRes.headers.get('content-type') || '').includes('application/rss+xml'));
  const rssXml = await rssChangelogRes.text();
  assert.ok(rssXml.includes('<title>[v2.4.0] Instant LCP Optimization &amp; Booking Calendar</title>'));
  console.log('   ✓ Per-Space Changelog & RSS 2.0 Release Feed verified');

  console.log('\n🎉 All Wave 22 tests passed 100%!');
}

runTests().catch((err) => {
  console.error('Wave 22 test failed:', err);
  process.exit(1);
});
