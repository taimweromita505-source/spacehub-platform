// Cloudflare Worker + KV + Static Assets Production Backend for SpaceHub
// Uses env.SPACEHUB_KV for persistent global state and env.ASSETS for static frontend files

function generateReadme(meta) {
  return `---
title: ${meta.title}
emoji: ${meta.emoji || '🚀'}
colorFrom: ${meta.colorFrom || 'indigo'}
colorTo: ${meta.colorTo || 'cyan'}
sdk: static
app_file: index.html
visibility: ${meta.visibility || 'private'}
external_host: ${meta.externalHostProvider || 'none'}
short_description: ${meta.description || 'Web application staged on SpaceHub'}
---

# ${meta.title}

${meta.description || 'Staged and verified on SpaceHub.'}
`;
}

const STARTER_TEMPLATES = {
  landing: {
    name: 'SaaS Landing Page',
    emoji: '✨',
    colorFrom: 'indigo',
    colorTo: 'cyan',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Product Launch</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header class="nav">
    <div class="brand">AcmeStudio</div>
    <button id="ctaBtn" class="btn-secondary">Request Access</button>
  </header>
  <main class="hero">
    <span class="tag">NEW RELEASE</span>
    <h1>Modern web infrastructure for fast-moving teams.</h1>
    <p>Stage your application, verify across viewports, and deploy directly to your preferred cloud host.</p>
    <div class="actions">
      <button id="launchDemoBtn" class="btn-primary">Test Interactive Action</button>
      <span id="counterText" class="status">Ready</span>
    </div>
  </main>
  <script src="script.js"></script>
</body>
</html>`,
      'style.css': `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #fafafa; min-height: 100vh; padding: 2.5rem; }
.nav { display: flex; justify-content: space-between; align-items: center; max-width: 920px; margin: 0 auto 5rem; }
.brand { font-weight: 700; font-size: 1.1rem; letter-spacing: -0.02em; }
.hero { max-width: 680px; margin: 0 auto; }
.tag { display: inline-block; padding: 0.25rem 0.65rem; border-radius: 999px; background: #18181b; border: 1px solid #27272a; color: #a1a1aa; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.04em; margin-bottom: 1.25rem; }
h1 { font-size: clamp(2rem, 4.5vw, 3.25rem); font-weight: 700; letter-spacing: -0.03em; line-height: 1.12; margin-bottom: 1rem; }
p { color: #a1a1aa; font-size: 1.05rem; line-height: 1.6; margin-bottom: 2rem; }
.actions { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
.btn-primary { background: #fafafa; color: #09090b; border: none; padding: 0.75rem 1.35rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; }
.btn-secondary { background: transparent; color: #e4e4e7; border: 1px solid #27272a; padding: 0.5rem 0.95rem; border-radius: 0.5rem; cursor: pointer; }
.status { font-size: 0.88rem; color: #818cf8; font-weight: 500; }`,
      'script.js': `let clicks = 0;
const btn = document.getElementById('launchDemoBtn');
const status = document.getElementById('counterText');
if (btn && status) {
  btn.addEventListener('click', () => {
    clicks++;
    status.textContent = 'Verified (' + clicks + ')';
  });
}`
    }
  },
  dashboard: {
    name: 'Analytics Dashboard',
    emoji: '📊',
    colorFrom: 'emerald',
    colorTo: 'teal',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Metrics Dashboard</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="wrap">
    <header class="top">
      <div>
        <h1>System Telemetry</h1>
        <p>Real-time throughput overview</p>
      </div>
      <button id="simulateBtn">Refresh Metrics</button>
    </header>
    <div id="bars" class="bars"></div>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
      'style.css': `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #09090b; color: #fafafa; padding: 2.5rem; }
.wrap { max-width: 840px; margin: 0 auto; }
.top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
h1 { font-size: 1.5rem; font-weight: 700; }
p { color: #a1a1aa; font-size: 0.9rem; }
button { background: #10b981; color: #052e16; font-weight: 600; border: none; padding: 0.6rem 1.1rem; border-radius: 0.5rem; cursor: pointer; }
.bars { display: flex; align-items: flex-end; gap: 0.6rem; height: 220px; padding: 1.5rem; background: #18181b; border: 1px solid #27272a; border-radius: 0.75rem; }
.bar { flex: 1; background: #10b981; border-radius: 4px 4px 0 0; transition: height 0.2s ease; }`,
      'script.js': `const barsEl = document.getElementById('bars');
function renderBars() {
  barsEl.innerHTML = '';
  for (let i = 0; i < 14; i++) {
    const b = document.createElement('div');
    b.className = 'bar';
    b.style.height = (20 + Math.floor(Math.random() * 80)) + '%';
    barsEl.appendChild(b);
  }
}
document.getElementById('simulateBtn').addEventListener('click', renderBars);
renderBars();`
    }
  },
  canvas: {
    name: 'Minimal Web App',
    emoji: '🎨',
    colorFrom: 'indigo',
    colorTo: 'purple',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Minimal App</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main class="card">
    <h1>Minimal Web App</h1>
    <p>Edit index.html, style.css, and script.js to build your application.</p>
  </main>
  <script src="script.js"></script>
</body>
</html>`,
      'style.css': `body { background: #09090b; color: #fafafa; font-family: system-ui, sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; }
.card { padding: 2rem; border: 1px solid #27272a; border-radius: 0.75rem; background: #18181b; max-width: 460px; }
h1 { font-size: 1.35rem; margin-bottom: 0.5rem; }
p { color: #a1a1aa; font-size: 0.95rem; line-height: 1.5; }`,
      'script.js': `console.log('Workspace ready');`
    }
  },
  mobile_app: {
    name: 'Mobile App Shell (Bottom Tab Bar)',
    emoji: '📱',
    colorFrom: 'indigo',
    colorTo: 'cyan',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>PocketOS Mobile App</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="app-shell">
    <header class="app-bar">
      <span class="pill">MOBILE PWA</span>
      <h1>PocketOS</h1>
    </header>
    <main class="screen" id="screenHome">
      <div class="card">
        <h2>Daily Habit Streak</h2>
        <p>Tap below to log today's check-in on Android or iPhone.</p>
        <div class="metric" id="streakVal">7 Days</div>
        <button id="checkInBtn" class="btn-primary">Check In (+1 Day)</button>
      </div>
    </main>
    <main class="screen" id="screenActivity" hidden>
      <div class="card">
        <h2>Recent Activity</h2>
        <ul id="activityList" class="list">
          <li>Completed morning sprint</li>
          <li>Installed app to home screen</li>
        </ul>
      </div>
    </main>
    <main class="screen" id="screenProfile" hidden>
      <div class="card">
        <h2>App Settings</h2>
        <p>Running in standalone mobile app mode.</p>
      </div>
    </main>
    <nav class="tab-bar">
      <button type="button" class="tab active" data-target="screenHome">Home</button>
      <button type="button" class="tab" data-target="screenActivity">Activity</button>
      <button type="button" class="tab" data-target="screenProfile">Profile</button>
    </nav>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
      'style.css': `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #fafafa; min-height: 100vh; display: flex; justify-content: center; }
.app-shell { width: 100%; max-width: 440px; min-height: 100vh; display: flex; flex-direction: column; border-inline: 1px solid #18181b; padding-bottom: 4.5rem; }
.app-bar { padding: 1.25rem 1.25rem 1rem; border-bottom: 1px solid #27272a; display: flex; align-items: center; justify-content: space-between; }
.app-bar h1 { font-size: 1.15rem; font-weight: 700; }
.pill { font-size: 0.68rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 999px; background: #18181b; border: 1px solid #27272a; color: #818cf8; }
.screen { padding: 1.25rem; flex: 1; }
.card { background: #18181b; border: 1px solid #27272a; border-radius: 0.9rem; padding: 1.35rem; }
.card h2 { font-size: 1.1rem; margin-bottom: 0.4rem; }
.card p { color: #a1a1aa; font-size: 0.9rem; margin-bottom: 1rem; }
.metric { font-size: 2.1rem; font-weight: 800; color: #818cf8; margin-bottom: 1rem; }
.btn-primary { width: 100%; background: #fafafa; color: #09090b; border: none; padding: 0.75rem; border-radius: 0.6rem; font-weight: 700; cursor: pointer; }
.list { list-style: none; display: flex; flex-direction: column; gap: 0.5rem; color: #d4d4d8; font-size: 0.9rem; }
.list li { padding: 0.6rem 0.75rem; background: #09090b; border-radius: 0.5rem; border: 1px solid #27272a; }
.tab-bar { position: fixed; bottom: 0; width: 100%; max-width: 440px; background: rgba(9,9,11,0.94); border-top: 1px solid #27272a; display: grid; grid-template-columns: repeat(3, 1fr); padding: 0.5rem; backdrop-filter: blur(8px); }
.tab { background: transparent; border: none; color: #71717a; padding: 0.55rem; font-weight: 600; font-size: 0.82rem; cursor: pointer; border-radius: 0.5rem; }
.tab.active { color: #fafafa; background: #18181b; }`,
      'script.js': `let streak = 7;
document.getElementById('checkInBtn')?.addEventListener('click', () => {
  streak++;
  document.getElementById('streakVal').textContent = streak + ' Days';
});
document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-target');
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.id !== target; });
  });
});`
    }
  },
  link_bio: {
    name: 'Creator Link-in-Bio & Storefront',
    emoji: '🔗',
    colorFrom: 'pink',
    colorTo: 'orange',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Creator Hub — Links &amp; Store</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main class="bio-wrap">
    <div class="avatar">◆</div>
    <h1>Studio Creator</h1>
    <p class="tagline">Digital products, design systems &amp; weekly dispatches.</p>
    <div class="links">
      <a href="#newsletter" class="link-card">
        <strong>Join 4,200+ Weekly Readers</strong>
        <span>Architecture &amp; product engineering notes →</span>
      </a>
      <a href="#kit" class="link-card">
        <strong>UI Component Kit v2</strong>
        <span>Minimal dark-mode templates &amp; tokens →</span>
      </a>
      <a href="#book" class="link-card">
        <strong>Book a 1-on-1 Strategy Session</strong>
        <span>30-minute product &amp; code review →</span>
      </a>
    </div>
  </main>
  <script src="script.js"></script>
</body>
</html>`,
      'style.css': `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #fafafa; min-height: 100vh; display: flex; justify-content: center; padding: 3rem 1.25rem; }
.bio-wrap { width: 100%; max-width: 420px; text-align: center; }
.avatar { width: 64px; height: 64px; border-radius: 50%; background: #18181b; border: 1px solid #27272a; display: grid; place-items: center; margin: 0 auto 1rem; font-size: 1.5rem; color: #fafafa; }
h1 { font-size: 1.35rem; font-weight: 700; margin-bottom: 0.35rem; }
.tagline { color: #a1a1aa; font-size: 0.92rem; margin-bottom: 1.75rem; }
.links { display: flex; flex-direction: column; gap: 0.75rem; text-align: left; }
.link-card { display: block; padding: 1rem 1.15rem; background: #18181b; border: 1px solid #27272a; border-radius: 0.75rem; color: #fafafa; text-decoration: none; transition: border-color 0.15s ease, transform 0.15s ease; }
.link-card:hover { border-color: #52525b; transform: translateY(-1px); }
.link-card strong { display: block; font-size: 0.95rem; margin-bottom: 0.2rem; }
.link-card span { color: #a1a1aa; font-size: 0.82rem; }`,
      'script.js': `console.log('Creator Link-in-Bio ready');`
    }
  },
  waitlist: {
    name: 'Waitlist & Lead Capture Form',
    emoji: '📬',
    colorFrom: 'emerald',
    colorTo: 'teal',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Early Access Waitlist</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main class="waitlist-card">
    <span class="badge">PRIVATE BETA · EARLY ACCESS</span>
    <h1>Reserve your spot in the next wave.</h1>
    <p>Sign up below. Submissions go directly to your SpaceHub Submissions Inbox.</p>
    <form id="waitlistForm" class="form">
      <input type="text" name="name" id="leadName" placeholder="Your name" required />
      <input type="email" name="email" id="leadEmail" placeholder="you@company.com" required />
      <input type="text" name="message" id="leadNote" placeholder="What are you building? (optional)" />
      <button type="submit" id="submitBtn">Join Waitlist</button>
    </form>
    <p id="formFeedback" class="feedback" hidden></p>
  </main>
  <script src="script.js"></script>
</body>
</html>`,
      'style.css': `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #fafafa; min-height: 100vh; display: grid; place-items: center; padding: 1.5rem; }
.waitlist-card { width: 100%; max-width: 460px; background: #18181b; border: 1px solid #27272a; border-radius: 0.9rem; padding: 2rem; }
.badge { display: inline-block; font-size: 0.7rem; font-weight: 700; color: #34d399; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); padding: 0.25rem 0.65rem; border-radius: 999px; margin-bottom: 1rem; }
h1 { font-size: 1.6rem; line-height: 1.2; margin-bottom: 0.6rem; }
p { color: #a1a1aa; font-size: 0.92rem; line-height: 1.5; margin-bottom: 1.35rem; }
.form { display: flex; flex-direction: column; gap: 0.65rem; }
input { padding: 0.7rem 0.85rem; border-radius: 0.5rem; border: 1px solid #27272a; background: #09090b; color: #fafafa; font-size: 0.92rem; }
button { background: #fafafa; color: #09090b; font-weight: 700; border: none; padding: 0.75rem; border-radius: 0.5rem; cursor: pointer; margin-top: 0.25rem; }
.feedback { margin-top: 1rem; margin-bottom: 0; color: #34d399; font-weight: 600; font-size: 0.88rem; }`,
      'script.js': `const form = document.getElementById('waitlistForm');
const feedback = document.getElementById('formFeedback');
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Submitting...';
  const payload = {
    name: document.getElementById('leadName').value.trim(),
    email: document.getElementById('leadEmail').value.trim(),
    message: document.getElementById('leadNote').value.trim()
  };
  try {
    const cleanPath = window.location.pathname.replace(/\\/$/, '');
    const submitUrl = cleanPath.startsWith('/live/') || cleanPath.startsWith('/s/')
      ? cleanPath + '/submit'
      : null;
    if (submitUrl) {
      await fetch(submitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    form.reset();
    feedback.textContent = '✓ You are on the list! Saved to SpaceHub Submissions.';
    feedback.hidden = false;
  } catch (_err) {
    feedback.textContent = '✓ Submitted!';
    feedback.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Join Waitlist';
  }
});`
    }
  }
};

const HOSTING_PLANS = [
  {
    id: 'plan_monthly_1',
    name: 'Monthly Space Hosting (1 Space)',
    amountUsd: '1.00',
    billingUnit: 'M',
    priceMonthly: 1,
    billingPeriod: '1 month',
    priceLabel: '$1 / month per Space',
    provider: 'cloudflare_pages',
    providerLabel: 'SpaceHub Managed Edge (1 Space)',
    features: [
      'Hosts 1 Space (website or web app) for 1 full month',
      'Clean shareable production URL (/live/your-space)',
      'Global Cloudflare Edge CDN + automatic SSL',
      'Pay with Card, Apple/Google Pay, Venmo, or PayPal'
    ]
  },
  {
    id: 'plan_yearly_12',
    name: 'Annual Space Hosting (1 Space)',
    amountUsd: '12.00',
    billingUnit: 'Y',
    priceMonthly: 1,
    priceYearly: 12,
    billingPeriod: '1 year',
    priceLabel: '$12 / year per Space',
    provider: 'cloudflare_pages',
    providerLabel: 'SpaceHub Managed Edge (1 Space · 1 Year)',
    features: [
      'Hosts 1 Space for 12 full months ($1/month rate)',
      'Dedicated /live/your-space URL + custom domain support',
      'Priority global Cloudflare Edge CDN + automatic SSL',
      'Pay with Card, Apple/Google Pay, Venmo, or PayPal'
    ]
  }
];

function decoratePlanWithPayPalUrls(plan, origin, paypalEmail) {
  const email = paypalEmail || 'romitat924@gmail.com';
  const amount = plan.amountUsd || (plan.id === 'plan_yearly_12' ? '12.00' : '1.00');
  const unit = plan.billingUnit || (plan.id === 'plan_yearly_12' ? 'Y' : 'M');
  const returnUrl = `${origin}/?paypal_paid=1&planId=${encodeURIComponent(plan.id)}`;
  const cancelUrl = `${origin}/?paypal_canceled=1`;

  // 1. Credit / Debit Card / Apple Pay / Google Pay Guest Checkout -> Payout to PayPal
  const cardCheckoutUrl =
    `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick` +
    `&business=${encodeURIComponent(email)}` +
    `&item_name=${encodeURIComponent('SpaceHub ' + plan.name)}` +
    `&amount=${encodeURIComponent(amount)}` +
    `&currency_code=USD&no_shipping=1&landing_page=Billing&solution_type=Sole` +
    `&return=${encodeURIComponent(returnUrl)}` +
    `&cancel_return=${encodeURIComponent(cancelUrl)}`;

  // 2. PayPal Balance / Venmo / PayPal Subscription Checkout -> Payout to PayPal
  const paypalSubscriptionUrl =
    `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick-subscriptions` +
    `&business=${encodeURIComponent(email)}` +
    `&item_name=${encodeURIComponent('SpaceHub ' + plan.name)}` +
    `&a3=${encodeURIComponent(amount)}&p3=1&t3=${unit}&src=1&currency_code=USD&no_shipping=1` +
    `&return=${encodeURIComponent(returnUrl)}` +
    `&cancel_return=${encodeURIComponent(cancelUrl)}`;

  return {
    ...plan,
    merchantPayPalEmail: email,
    checkoutUrls: {
      card: cardCheckoutUrl,
      paypal: paypalSubscriptionUrl
    }
  };
}

const PROVIDER_LABELS = {
  cloudflare_pages: 'Cloudflare Pages',
  github_pages: 'GitHub Pages',
  vercel: 'Vercel',
  netlify: 'Netlify',
  custom_webhook: 'Custom Webhook'
};

// Fallback in-memory store if KV is unavailable in local dev
let memoryDb = {
  users: [],
  sessions: {},
  agentKeys: [],
  hostingConnections: [],
  spaces: []
};

const KV_KEY = 'spacehub_prod_state_v2';

async function loadDb(env) {
  if (env && env.SPACEHUB_KV) {
    try {
      const raw = await env.SPACEHUB_KV.get(KV_KEY, 'json');
      if (raw && typeof raw === 'object') {
        return {
          users: Array.isArray(raw.users) ? raw.users : [],
          sessions: raw.sessions || {},
          agentKeys: Array.isArray(raw.agentKeys) ? raw.agentKeys : [],
          hostingConnections: Array.isArray(raw.hostingConnections) ? raw.hostingConnections : [],
          spaces: Array.isArray(raw.spaces) ? raw.spaces : []
        };
      }
    } catch (_e) {
      // fallback
    }
  }
  return memoryDb;
}

async function saveDb(env, db) {
  memoryDb = db;
  if (env && env.SPACEHUB_KV) {
    await env.SPACEHUB_KV.put(KV_KEY, JSON.stringify(db));
  }
}

function randomHex(bytes = 16) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPasswordEdge(password, saltHex = null) {
  const salt = saltHex || randomHex(16);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(String(password)),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 50000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  const hashArray = Array.from(new Uint8Array(derivedBits));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return { salt, hash: hashHex };
}

async function verifyPasswordEdge(password, salt, expectedHash) {
  if (!salt || !expectedHash) return false;
  const { hash } = await hashPasswordEdge(password, salt);
  return hash === expectedHash;
}

function slugify(text) {
  return (
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'space'
  );
}

function parseCookies(cookieHeader = '') {
  const cookies = {};
  cookieHeader.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      cookies[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
    }
  });
  return cookies;
}

function getCurrentUser(db, request, url) {
  const authHeader = request.headers.get('authorization') || '';
  const agentKey = request.headers.get('x-agent-key') || '';
  let token = null;
  if (agentKey) {
    token = agentKey.trim();
  } else if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else {
    const cookies = parseCookies(request.headers.get('cookie') || '');
    token = cookies.spacehub_token || url.searchParams.get('token') || null;
  }
  if (!token) return null;
  if (token.startsWith('sh_pat_')) {
    const pat = db.agentKeys.find((k) => k.token === token);
    if (!pat) return null;
    return db.users.find((u) => u.id === pat.userId) || null;
  }
  const userId = db.sessions[token];
  if (!userId) return null;
  return db.users.find((u) => u.id === userId) || null;
}

function canViewSpace(space, user) {
  if (space.visibility === 'public' && space.status === 'published') return true;
  if (!user) return false;
  return space.ownerId === user.id;
}

function normalizeSpaceSecrets(input) {
  const out = {};
  if (!input) return out;
  if (typeof input === 'string') {
    input.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim().replace(/[^a-zA-Z0-9_]/g, '');
        const val = trimmed.slice(eqIdx + 1).trim();
        if (key && val) out[key] = val.slice(0, 512);
      }
    });
  } else if (typeof input === 'object') {
    Object.entries(input).slice(0, 25).forEach(([k, v]) => {
      const key = String(k).trim().replace(/[^a-zA-Z0-9_]/g, '');
      const val = String(v ?? '').trim();
      if (key && val) out[key] = val.slice(0, 512);
    });
  }
  return out;
}

function replaceSecretPlaceholders(str, secrets = {}) {
  return String(str ?? '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) =>
    secrets[key] !== undefined ? secrets[key] : `{{${key}}}`
  );
}

function normalizeCustomDomain(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/[^a-z0-9.-]/g, '')
    .slice(0, 120);
}

async function notifySubmissionWebhook(space, entry) {
  const hookUrl = String(space.submissionWebhookUrl || '').trim();
  if (!hookUrl) return;
  const textMsg = `📬 New submission in ${space.title} (${space.slug}): ${entry.name || 'Visitor'} <${entry.email || 'no-email'}> — ${entry.message || ''}`;
  if (hookUrl.startsWith('mock://')) {
    space.lastWebhookStatus = `delivered_mock:${hookUrl}`;
    return;
  }
  if (!/^https?:\/\//i.test(hookUrl)) return;
  try {
    const r = await fetch(hookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: textMsg,
        text: textMsg,
        space: space.slug,
        submission: entry
      })
    });
    space.lastWebhookStatus = `http_${r.status}`;
  } catch (err) {
    space.lastWebhookStatus = `error:${err.message || 'failed'}`;
  }
}

function formatSpaceSummary(space, user) {
  const isOwner = Boolean(user && space.ownerId === user.id);
  const stagingPreviewUrl = `/spaces/${space.ownerUsername}/${space.slug}/live`;
  const externalLiveUrl = space.externalHost?.liveUrl || null;
  const secretsObj = space.secrets && typeof space.secrets === 'object' ? space.secrets : {};
  const snaps = Array.isArray(space.snapshots) ? space.snapshots : [];
  return {
    id: space.id,
    ownerId: space.ownerId,
    ownerUsername: space.ownerUsername,
    slug: space.slug,
    title: space.title,
    description: space.description,
    emoji: space.emoji,
    colorFrom: space.colorFrom,
    colorTo: space.colorTo,
    sdk: space.sdk,
    visibility: space.visibility,
    appPlatform: space.appPlatform || 'both',
    appOrientation: space.appOrientation || 'any',
    appIconText: space.appIconText || '',
    appThemeColor: space.appThemeColor || '#09090b',
    customDomain: space.customDomain || '',
    submissionWebhookUrl: isOwner ? (space.submissionWebhookUrl || '') : undefined,
    lastWebhookStatus: isOwner ? (space.lastWebhookStatus || null) : undefined,
    previewPasscode: isOwner ? (space.previewPasscode || '') : undefined,
    hasPreviewPasscode: Boolean(space.previewPasscode),
    secrets: isOwner ? secretsObj : undefined,
    secretKeys: Object.keys(secretsObj),
    status: space.status,
    likes: space.likes || 0,
    views: space.views || 0,
    installs: space.installs || 0,
    appUserCount: (space.appUsers || []).length,
    submissionCount: (space.submissions || []).length,
    snapshotCount: snaps.length,
    snapshots: isOwner
      ? snaps.map((s) => ({ id: s.id, label: s.label, createdAt: s.createdAt }))
      : undefined,
    likedByMe: Boolean(user && (space.likedBy || []).includes(user.id)),
    hasUnpublishedChanges: Boolean(space.hasUnpublishedChanges),
    createdAt: space.createdAt,
    updatedAt: space.updatedAt,
    publishedAt: space.publishedAt,
    isOwner,
    stagingPreviewUrl,
    liveUrl: externalLiveUrl || stagingPreviewUrl,
    externalHost: space.externalHost || null,
    agentHistoryCount: (space.agentHistory || []).length
  };
}

function pushSpaceSnapshot(space, label = 'Previous version') {
  if (!space.draftFiles) return;
  space.snapshots = Array.isArray(space.snapshots) ? space.snapshots : [];
  space.snapshots.unshift({
    id: 'snap_' + randomHex(6),
    label,
    files: JSON.parse(JSON.stringify(space.draftFiles)),
    createdAt: new Date().toISOString()
  });
  if (space.snapshots.length > 10) {
    space.snapshots = space.snapshots.slice(0, 10);
  }
}

function generateSpaceIconSvg(spaceOrTitle = 'S') {
  const isObj = spaceOrTitle && typeof spaceOrTitle === 'object';
  const rawText = isObj
    ? spaceOrTitle.appIconText || String(spaceOrTitle.title || 'S').trim().charAt(0).toUpperCase()
    : String(spaceOrTitle || 'S').trim().charAt(0).toUpperCase();
  const initial = String(rawText || 'S').trim().slice(0, 2) || 'S';
  const bg = (isObj && /^#[0-9a-fA-F]{3,8}$/.test(spaceOrTitle.appThemeColor))
    ? spaceOrTitle.appThemeColor
    : '#09090b';
  const fontSize = initial.length > 1 ? 185 : 240;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="${bg}" />
  <rect x="24" y="24" width="464" height="464" rx="92" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="8" />
  <text x="256" y="330" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="700" fill="#fafafa">${initial.replace(/[<>&"']/g, '')}</text>
</svg>`;
}

function generateSpaceManifest(space, origin = '') {
  const startUrl = `${origin}/live/${space.slug}`;
  const themeColor = /^#[0-9a-fA-F]{3,8}$/.test(space.appThemeColor) ? space.appThemeColor : '#09090b';
  return {
    name: `${space.title}`,
    short_name: String(space.title || space.slug).slice(0, 15),
    description: space.description || `${space.title} — Web App on SpaceHub`,
    start_url: startUrl,
    scope: `${origin}/live/${space.slug}`,
    display: 'standalone',
    orientation: space.appOrientation || 'any',
    background_color: themeColor,
    theme_color: themeColor,
    icons: [
      {
        src: `${origin}/live/${space.slug}/icon.svg`,
        sizes: '192x192 512x512',
        type: 'image/svg+xml',
        purpose: 'any maskable'
      }
    ]
  };
}

function generateSpaceServiceWorker(slug) {
  return `const CACHE_NAME = 'spacehub-app-${slug}-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
`;
}

function buildBundledHtml(files, origin = '', space = null) {
  let html = files['index.html'] || '<!DOCTYPE html><html><body><h1>Empty Space</h1></body></html>';
  const css = files['style.css'] || '';
  const js = files['script.js'] || '';
  if (css) {
    if (html.includes('href="style.css"') || html.includes("href='style.css'")) {
      html = html.replace(/<link[^>]*href=["']style\.css["'][^>]*>/i, `<style>\n${css}\n</style>`);
    } else {
      html = `<style>\n${css}\n</style>\n` + html;
    }
  }
  if (js) {
    if (html.includes('src="script.js"') || html.includes("src='script.js'")) {
      html = html.replace(/<script[^>]*src=["']script\.js["'][^>]*><\/script>/i, `<script>\n${js}\n</script>`);
    } else {
      html = html + `\n<script>\n${js}\n</script>`;
    }
  }
  // Inline any additional custom .css or .js files from the workspace
  Object.entries(files || {}).forEach(([fname, content]) => {
    if (['index.html', 'style.css', 'script.js', 'README.md'].includes(fname)) return;
    const escaped = fname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (fname.endsWith('.css')) {
      const linkRe = new RegExp(`<link[^>]*href=["']\\.?\\/?${escaped}["'][^>]*>`, 'i');
      if (linkRe.test(html)) {
        html = html.replace(linkRe, `<style>\n${content}\n</style>`);
      }
    } else if (fname.endsWith('.js')) {
      const scriptRe = new RegExp(`<script[^>]*src=["']\\.?\\/?${escaped}["'][^>]*><\\/script>`, 'i');
      if (scriptRe.test(html)) {
        html = html.replace(scriptRe, `<script>\n${content}\n</script>`);
      }
    }
  });
  const appPlatform = space?.appPlatform || 'both';
  const supportsAndroid = appPlatform === 'both' || appPlatform === 'android';
  const supportsIphone = appPlatform === 'both' || appPlatform === 'iphone';

  if (space) {
    const safeTitle = String(space.title || space.slug).replace(/["<>]/g, '');
    const safeDesc = String(space.description || `${safeTitle} — Hosted on SpaceHub`).replace(/["<>]/g, '');
    const ogMeta = !html.includes('property="og:title"')
      ? `\n  <meta property="og:type" content="website" />\n  <meta property="og:title" content="${safeTitle}" />\n  <meta property="og:description" content="${safeDesc}" />\n  <meta property="og:image" content="${origin}/live/${space.slug}/icon.svg" />\n  <meta name="twitter:card" content="summary" />\n  <meta name="twitter:title" content="${safeTitle}" />\n  <meta name="twitter:description" content="${safeDesc}" />`
      : '';
    const pwaHead =
      appPlatform !== 'web_only'
        ? `${ogMeta}
  ${supportsAndroid ? `<link rel="manifest" href="/live/${space.slug}/manifest.webmanifest" />\n  <meta name="mobile-web-app-capable" content="yes" />` : ''}
  <link rel="icon" type="image/svg+xml" href="/live/${space.slug}/icon.svg" />
  ${supportsIphone ? `<link rel="apple-touch-icon" href="/live/${space.slug}/icon.svg" />\n  <meta name="apple-mobile-web-app-capable" content="yes" />\n  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />\n  <meta name="apple-mobile-web-app-title" content="${safeTitle}" />` : ''}
  <meta name="theme-color" content="${space.appThemeColor || '#09090b'}" />
  ${supportsAndroid ? `<script>if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/live/${space.slug}/sw.js').catch(()=>{});});}</script>` : ''}`
        : ogMeta;
    if (pwaHead) {
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${pwaHead}\n</head>`);
      } else {
        html = pwaHead + '\n' + html;
      }
    }
  }
  if (origin) {
    const installBtnHtml =
      appPlatform !== 'web_only'
        ? `<button type="button" id="shInstallLiveBtn" hidden style="background:#fafafa;color:#09090b;border:1px solid #e4e4e7;padding:6px 11px;border-radius:999px;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,0.35)">+ Install App</button>`
        : '';
    const badgeHtml = `<style>@media (display-mode: standalone) { .sh-live-pill { display: none !important; } }</style><div class="sh-live-pill" style="position:fixed;bottom:12px;right:12px;z-index:99999;display:flex;gap:6px;align-items:center;font-family:system-ui,-apple-system,sans-serif">${installBtnHtml}<a href="${origin}" target="_blank" rel="noopener" style="background:rgba(9,9,11,0.88);color:#fafafa;border:1px solid #27272a;padding:6px 11px;border-radius:999px;font-size:12px;font-weight:600;text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,0.35);backdrop-filter:blur(4px)">◆ Hosted on SpaceHub · $1/mo</a></div><script>(function(){let dp;const b=document.getElementById('shInstallLiveBtn');if(!b)return;const plat='${appPlatform}';const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream;const isStandalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone;if(isStandalone)return;if(isIOS&&(plat==='both'||plat==='iphone')){b.hidden=false;b.addEventListener('click',()=>alert('To install this app on iPhone/iPad:\\n1. Tap the Share button in Safari\\n2. Tap "Add to Home Screen"'));}if(plat==='both'||plat==='android'){window.addEventListener('beforeinstallprompt',(e)=>{e.preventDefault();dp=e;b.hidden=false;});b.addEventListener('click',async()=>{if(dp){dp.prompt();await dp.userChoice;dp=null;b.hidden=true;}});}})();</script>`;
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${badgeHtml}\n</body>`);
    } else {
      html += badgeHtml;
    }
  }
  return html;
}

function synthesizeWithBuiltinAgent(prompt, spaceTitle) {
  const safePrompt = String(prompt || 'Modern web application')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return {
    summary: `Generated application build for "${prompt.slice(0, 70)}"`,
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${spaceTitle}</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="shell">
    <header class="header">
      <div>
        <span class="badge">AI GENERATED BUILD</span>
        <h1>${spaceTitle}</h1>
        <p>${safePrompt}</p>
      </div>
      <button id="actionBtn" class="btn">Run Action</button>
    </header>
    <section class="grid">
      <div class="card">
        <h3>Status</h3>
        <div class="val" id="statusVal">Active</div>
      </div>
      <div class="card">
        <h3>Events</h3>
        <div class="val" id="countVal">1</div>
      </div>
      <div class="card">
        <h3>Environment</h3>
        <div class="val">Staging</div>
      </div>
    </section>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
      'style.css': `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #09090b; color: #fafafa; padding: 2.5rem; }
.shell { max-width: 880px; margin: 0 auto; }
.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid #27272a; }
.badge { display: inline-block; font-size: 0.7rem; font-weight: 600; color: #818cf8; margin-bottom: 0.5rem; letter-spacing: 0.05em; }
h1 { font-size: 1.75rem; margin-bottom: 0.35rem; }
p { color: #a1a1aa; font-size: 0.95rem; }
.btn { background: #4f46e5; color: #fff; border: none; padding: 0.65rem 1.2rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
.card { background: #18181b; border: 1px solid #27272a; border-radius: 0.75rem; padding: 1.25rem; }
.card h3 { font-size: 0.8rem; color: #a1a1aa; font-weight: 500; margin-bottom: 0.4rem; }
.val { font-size: 1.5rem; font-weight: 700; }`,
      'script.js': `let count = 1;
document.getElementById('actionBtn').addEventListener('click', () => {
  count++;
  document.getElementById('countVal').textContent = String(count);
  document.getElementById('statusVal').textContent = 'Updated ' + new Date().toLocaleTimeString();
});`
    }
  };
}

async function pushFilesToGitHubEdge({ token, repoName, files, description }) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'SpaceHub-Cloudflare-Edge'
  };
  const userRes = await fetch('https://api.github.com/user', { headers });
  if (!userRes.ok) throw new Error(`GitHub authentication failed (${userRes.status})`);
  const ghUser = await userRes.json();
  const owner = ghUser.login;
  const cleanRepo = slugify(repoName || 'spacehub-site');

  const checkRes = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`, { headers });
  if (checkRes.status === 404) {
    const createRes = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: cleanRepo,
        description: description || 'Deployed from SpaceHub',
        homepage: `https://${owner}.github.io/${cleanRepo}/`,
        private: false,
        auto_init: true
      })
    });
    if (!createRes.ok) {
      const errData = await createRes.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to create GitHub repository.');
    }
  }

  for (const [fileName, content] of Object.entries(files)) {
    const fileUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/contents/${encodeURIComponent(fileName)}`;
    let existingSha = undefined;
    const getFile = await fetch(fileUrl, { headers });
    if (getFile.ok) {
      const meta = await getFile.json();
      existingSha = meta.sha;
    }
    const bytes = new TextEncoder().encode(String(content));
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    const b64 = btoa(binary);

    await fetch(fileUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `Deploy ${fileName} from SpaceHub`,
        content: b64,
        ...(existingSha ? { sha: existingSha } : {})
      })
    });
  }

  await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/pages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ source: { branch: 'main', path: '/' } })
  }).catch(() => {});

  return {
    repoUrl: `https://github.com/${owner}/${cleanRepo}`,
    pagesUrl: `https://${owner}.github.io/${cleanRepo}/`
  };
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();

    if (pathname === '/robots.txt' && method === 'GET') {
      return new Response(
        `User-agent: *\nAllow: /\nSitemap: ${url.origin}/sitemap.xml\n`,
        { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    const customHostHeader = normalizeCustomDomain(
      request.headers.get('x-custom-host') || url.hostname
    );
    const isPlatformHost =
      !customHostHeader ||
      customHostHeader === 'spacehub.win' ||
      customHostHeader === 'www.spacehub.win' ||
      customHostHeader === 'localhost' ||
      customHostHeader === '127.0.0.1' ||
      customHostHeader.endsWith('.workers.dev');

    if (!isPlatformHost && pathname === '/' && method === 'GET') {
      const dbForHost = await loadDb(env);
      const domainSpace = [...dbForHost.spaces]
        .reverse()
        .find((s) => s.customDomain && s.customDomain.toLowerCase() === customHostHeader);
      if (domainSpace && domainSpace.visibility === 'public') {
        domainSpace.views = (domainSpace.views || 0) + 1;
        await saveDb(env, dbForHost);
        const targetFiles = domainSpace.publishedFiles || domainSpace.draftFiles;
        return new Response(buildBundledHtml(targetFiles, url.origin, domainSpace), {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
    }

    // Fast path for static files
    if (
      !pathname.startsWith('/api/') &&
      !pathname.startsWith('/spaces/') &&
      !pathname.startsWith('/live/') &&
      !pathname.startsWith('/s/') &&
      pathname !== '/sitemap.xml'
    ) {
      return env.ASSETS.fetch(request);
    }

    const db = await loadDb(env);
    const user = getCurrentUser(db, request, url);

    if (pathname === '/sitemap.xml' && method === 'GET') {
      const publicSpaces = db.spaces.filter((s) => s.visibility === 'public' && s.status === 'published');
      const urls = [
        `<url><loc>${url.origin}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
        ...publicSpaces.map(
          (s) =>
            `<url><loc>${url.origin}/live/${encodeURIComponent(s.slug)}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`
        )
      ].join('\n  ');
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  ${urls}\n</urlset>`;
      return new Response(xml, {
        status: 200,
        headers: { 'Content-Type': 'application/xml; charset=utf-8' }
      });
    }

    // 1. Per-Space Installable PWA Assets (/live/:slug/manifest.webmanifest, /live/:slug/icon.svg, /live/:slug/sw.js)
    const spacePwaMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/(manifest\.webmanifest|icon\.svg|sw\.js)$/i);
    if (spacePwaMatch && method === 'GET') {
      const slug = decodeURIComponent(spacePwaMatch[1]).toLowerCase();
      const asset = spacePwaMatch[2].toLowerCase();
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return new Response('Not found', { status: 404 });

      if (asset === 'manifest.webmanifest') {
        space.installs = (space.installs || 0) + 1;
        await saveDb(env, db);
        return new Response(JSON.stringify(generateSpaceManifest(space, url.origin), null, 2), {
          status: 200,
          headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' }
        });
      }
      if (asset === 'icon.svg') {
        return new Response(generateSpaceIconSvg(space), {
          status: 200,
          headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' }
        });
      }
      if (asset === 'sw.js') {
        return new Response(generateSpaceServiceWorker(space.slug), {
          status: 200,
          headers: { 'Content-Type': 'application/javascript; charset=utf-8' }
        });
      }
    }

    // 1b. Per-Space Cloud JSON Storage API (GET/POST/PUT/DELETE /live/:slug/storage)
    const storageLiveMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/storage\/?$/i);
    if (storageLiveMatch) {
      const slug = decodeURIComponent(storageLiveMatch[1]).toLowerCase();
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404);
      space.appStorage = space.appStorage && typeof space.appStorage === 'object' ? space.appStorage : {};

      if (method === 'GET') {
        const key = url.searchParams.get('key');
        return jsonResponse({
          ok: true,
          data: key ? space.appStorage[key] ?? null : space.appStorage
        });
      }
      if (method === 'POST' || method === 'PUT') {
        const incoming = await request.json().catch(() => ({}));
        if (incoming && typeof incoming === 'object') {
          const nextState = { ...space.appStorage, ...incoming };
          if (JSON.stringify(nextState).length > 102400) {
            return jsonResponse({ error: 'Space storage limit (100 KB) exceeded.' }, 413);
          }
          space.appStorage = nextState;
          await saveDb(env, db);
        }
        return jsonResponse({ ok: true, data: space.appStorage });
      }
      if (method === 'DELETE') {
        const key = url.searchParams.get('key');
        if (key) delete space.appStorage[key];
        else space.appStorage = {};
        await saveDb(env, db);
        return jsonResponse({ ok: true, data: space.appStorage });
      }
    }

    // 1b-0. Per-Space Built-in User Authentication API (/live/:slug/auth and /live/:slug/auth/me)
    const spaceAuthMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/auth(?:\/(me))?\/?$/i);
    if (spaceAuthMatch) {
      const slug = decodeURIComponent(spaceAuthMatch[1]).toLowerCase();
      const subAction = (spaceAuthMatch[2] || '').toLowerCase();
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404);
      space.appUsers = Array.isArray(space.appUsers) ? space.appUsers : [];
      space.appSessions = space.appSessions && typeof space.appSessions === 'object' ? space.appSessions : {};

      if (subAction === 'me' && method === 'GET') {
        const authHdr = request.headers.get('authorization') || '';
        const tok = authHdr.startsWith('Bearer ')
          ? authHdr.slice(7).trim()
          : (url.searchParams.get('token') || '').trim();
        const uid = tok ? space.appSessions[tok] : null;
        const appUser = uid ? space.appUsers.find((u) => u.id === uid) : null;
        if (!appUser) return jsonResponse({ ok: false, user: null }, 401);
        return jsonResponse({
          ok: true,
          user: { id: appUser.id, email: appUser.email, name: appUser.name, createdAt: appUser.createdAt }
        });
      }

      if (!subAction && method === 'POST') {
        const payload = await request.json().catch(() => ({}));
        const email = String(payload.email || '').trim().toLowerCase();
        const password = String(payload.password || '');
        const name = String(payload.name || email.split('@')[0] || 'Member').trim().slice(0, 80);
        if (!email || !password) {
          return jsonResponse({ error: 'Email and password are required.' }, 400);
        }
        let appUser = space.appUsers.find((u) => u.email === email);
        if (!appUser && payload.action !== 'login') {
          const { salt, hash } = await hashPasswordEdge(password);
          appUser = {
            id: 'au_' + randomHex(6),
            email,
            name,
            salt,
            passwordHash: hash,
            createdAt: new Date().toISOString()
          };
          space.appUsers.push(appUser);
        } else if (!appUser) {
          return jsonResponse({ error: 'Account not found.' }, 404);
        } else {
          const valid = await verifyPasswordEdge(password, appUser.salt, appUser.passwordHash);
          if (!valid) return jsonResponse({ error: 'Invalid email or password.' }, 401);
        }
        const tok = 'sat_' + randomHex(16);
        space.appSessions[tok] = appUser.id;
        await saveDb(env, db);
        return jsonResponse({
          ok: true,
          token: tok,
          user: { id: appUser.id, email: appUser.email, name: appUser.name, createdAt: appUser.createdAt }
        });
      }
    }

    // 1b-1. Per-Space Server-Side API Proxy & Secrets Vault (POST /live/:slug/proxy)
    const proxyLiveMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/proxy\/?$/i);
    if (proxyLiveMatch && method === 'POST') {
      const slug = decodeURIComponent(proxyLiveMatch[1]).toLowerCase();
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404);

      const payload = await request.json().catch(() => ({}));
      const rawUrl = String(payload.url || '').trim();
      if (!/^https?:\/\/|^mock:\/\//i.test(rawUrl)) {
        return jsonResponse({ error: 'Proxy target URL must start with https:// or http://' }, 400);
      }

      const secrets = space.secrets && typeof space.secrets === 'object' ? space.secrets : {};
      const resolvedUrl = replaceSecretPlaceholders(rawUrl, secrets);
      const reqMethod = String(payload.method || 'GET').toUpperCase();
      const resolvedHeaders = {};
      if (payload.headers && typeof payload.headers === 'object') {
        Object.entries(payload.headers).forEach(([hk, hv]) => {
          resolvedHeaders[hk] = replaceSecretPlaceholders(hv, secrets);
        });
      }
      let resolvedBody = undefined;
      if (payload.body !== undefined && payload.body !== null && reqMethod !== 'GET' && reqMethod !== 'HEAD') {
        const bodyStr = typeof payload.body === 'string' ? payload.body : JSON.stringify(payload.body);
        resolvedBody = replaceSecretPlaceholders(bodyStr, secrets);
      }

      if (resolvedUrl.startsWith('mock://')) {
        return jsonResponse({
          ok: true,
          status: 200,
          data: {
            mockProxy: true,
            resolvedUrl,
            method: reqMethod,
            headers: resolvedHeaders,
            body: resolvedBody ? JSON.parse(resolvedBody) : null
          }
        });
      }

      try {
        const upstreamRes = await fetch(resolvedUrl, {
          method: reqMethod,
          headers: resolvedHeaders,
          body: resolvedBody
        });
        const text = await upstreamRes.text();
        let parsed = text;
        try {
          parsed = JSON.parse(text);
        } catch (_e) {
          // keep text
        }
        return jsonResponse({
          ok: upstreamRes.ok,
          status: upstreamRes.status,
          data: parsed
        });
      } catch (err) {
        return jsonResponse({ error: err.message || 'Upstream proxy request failed.' }, 502);
      }
    }

    // 1b-2. Form & Waitlist Submissions Endpoint (POST /live/:slug/submit or POST /s/:slug/submit)
    const submitLiveMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/submit\/?$/i);
    if (submitLiveMatch && method === 'POST') {
      const slug = decodeURIComponent(submitLiveMatch[1]).toLowerCase();
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404);

      const contentType = (request.headers.get('content-type') || '').toLowerCase();
      let fields = {};
      if (contentType.includes('application/json')) {
        fields = await request.json().catch(() => ({}));
      } else {
        const text = await request.text().catch(() => '');
        const params = new URLSearchParams(text);
        params.forEach((v, k) => {
          fields[k] = v;
        });
      }

      const entry = {
        id: 'sub_' + randomHex(6),
        name: String(fields.name || '').trim().slice(0, 120),
        email: String(fields.email || '').trim().slice(0, 160),
        message: String(fields.message || fields.note || '').trim().slice(0, 1000),
        fields,
        createdAt: new Date().toISOString()
      };
      space.submissions = Array.isArray(space.submissions) ? space.submissions : [];
      space.submissions.unshift(entry);
      if (space.submissions.length > 200) {
        space.submissions = space.submissions.slice(0, 200);
      }
      await notifySubmissionWebhook(space, entry);
      await saveDb(env, db);

      const accept = (request.headers.get('accept') || '').toLowerCase();
      if (accept.includes('application/json') || contentType.includes('application/json')) {
        return jsonResponse({ ok: true, message: 'Submission saved to SpaceHub Inbox.', submission: entry }, 201);
      }
      return new Response(
        `<!DOCTYPE html><html><body style="background:#09090b;color:#fafafa;font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center;padding:2rem;border:1px solid #27272a;border-radius:0.75rem;background:#18181b;max-width:420px"><h1 style="font-size:1.25rem;margin-bottom:0.5rem">✓ Submission Received</h1><p style="color:#a1a1aa;font-size:0.9rem;margin-bottom:1.25rem">Your response has been saved to ${String(space.title).replace(/[<>&]/g, '')}.</p><a href="/live/${encodeURIComponent(space.slug)}" style="color:#818cf8;text-decoration:none;font-weight:600">← Return to ${String(space.title).replace(/[<>&]/g, '')}</a></div></body></html>`,
        { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // 1c. Short Clean Live URL Route (/live/:slug or /s/:slug) & Full Route (/spaces/:username/:slug/live)
    const shortLiveMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/?$/i);
    const liveMatch = pathname.match(/^\/spaces\/([^/]+)\/([^/]+)\/live$/i);
    if ((shortLiveMatch || liveMatch) && method === 'GET') {
      const mode = url.searchParams.get('mode') === 'draft' ? 'draft' : 'published';
      let space = null;
      if (shortLiveMatch) {
        const slug = decodeURIComponent(shortLiveMatch[1]).toLowerCase();
        space = [...db.spaces].reverse().find((s) => s.slug === slug);
      } else {
        const username = decodeURIComponent(liveMatch[1]).toLowerCase();
        const slug = decodeURIComponent(liveMatch[2]).toLowerCase();
        space = db.spaces.find((s) => s.ownerUsername === username && s.slug === slug);
      }
      const isOwner = Boolean(user && space && space.ownerId === user.id);
      const keyParam = (url.searchParams.get('key') || '').trim();
      const hasValidPasscode = Boolean(space && space.previewPasscode && keyParam === space.previewPasscode);
      const canAccess = isOwner || hasValidPasscode;

      if (!space || (space.visibility === 'private' && !canAccess) || (space.status === 'draft' && !canAccess)) {
        return new Response(
          `<!DOCTYPE html><html><body style="background:#09090b;color:#fafafa;font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center;padding:2rem;border:1px solid #27272a;border-radius:0.75rem;background:#18181b;max-width:420px"><h1 style="font-size:1.25rem;margin-bottom:0.5rem">404 — Private or Unlaunched Space</h1><p style="color:#a1a1aa;font-size:0.9rem;margin-bottom:1.25rem">This Space is set to private or is currently in staging.</p><a href="/" style="color:#818cf8;text-decoration:none;font-weight:600">← Return to SpaceHub</a></div></body></html>`,
          { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
      if (mode !== 'draft') {
        space.views = (space.views || 0) + 1;
        await saveDb(env, db);
      }
      const targetFiles =
        (mode === 'draft' && canAccess) ? space.draftFiles : space.publishedFiles || space.draftFiles;
      return new Response(buildBundledHtml(targetFiles, url.origin, space), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 1d. Serve Custom Workspace Files (/live/:slug/:filename) for Multi-File / Multi-Page Web Apps
    const customFileMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/([a-zA-Z0-9._-]+\.(?:html|css|js|json|svg|txt))$/i);
    if (customFileMatch && method === 'GET') {
      const slug = decodeURIComponent(customFileMatch[1]).toLowerCase();
      const fileName = decodeURIComponent(customFileMatch[2]);
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (space) {
        const files = space.publishedFiles || space.draftFiles || {};
        if (files[fileName] !== undefined) {
          const ext = fileName.split('.').pop().toLowerCase();
          const mimeMap = {
            html: 'text/html; charset=utf-8',
            css: 'text/css; charset=utf-8',
            js: 'application/javascript; charset=utf-8',
            json: 'application/json; charset=utf-8',
            svg: 'image/svg+xml; charset=utf-8',
            txt: 'text/plain; charset=utf-8'
          };
          return new Response(String(files[fileName]), {
            status: 200,
            headers: { 'Content-Type': mimeMap[ext] || 'text/plain; charset=utf-8' }
          });
        }
      }
    }

    // 2. API Routes
    if (pathname.startsWith('/api/')) {
      const body =
        method === 'POST' || method === 'PUT'
          ? await request.json().catch(() => ({}))
          : {};

      if (pathname === '/api/auth/me' && method === 'GET') {
        return jsonResponse({
          user: user
            ? {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                email: user.email || null,
                socialProvider: user.socialProvider || null,
                hostingPlan: user.hostingPlan || null
              }
            : null
        });
      }

      if (pathname === '/api/auth/social' && method === 'POST') {
        const provider = ['google', 'github', 'apple'].includes(body.provider) ? body.provider : 'google';
        let email = String(body.email || '').trim().toLowerCase();
        let displayName = String(body.displayName || '').trim();
        let preferredUsername = String(body.username || '').trim().toLowerCase();
        const accessToken = String(body.accessToken || '').trim();
        const idToken = String(body.idToken || '').trim();

        // Optional real Google ID Token verification
        if (provider === 'google' && idToken) {
          const gRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
          if (!gRes.ok) {
            return jsonResponse({ error: 'Invalid Google ID token.' }, 401);
          }
          const gInfo = await gRes.json();
          email = String(gInfo.email || email).toLowerCase();
          displayName = gInfo.name || displayName;
        }

        // Optional real GitHub Access Token verification
        if (provider === 'github' && accessToken) {
          const ghRes = await fetch('https://api.github.com/user', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/vnd.github+json',
              'User-Agent': 'SpaceHub-Cloudflare-Edge'
            }
          });
          if (!ghRes.ok) {
            return jsonResponse({ error: 'Invalid GitHub token.' }, 401);
          }
          const ghUser = await ghRes.json();
          preferredUsername = String(ghUser.login || preferredUsername).toLowerCase();
          displayName = ghUser.name || ghUser.login || displayName;
          email = String(ghUser.email || email || `${preferredUsername}@users.noreply.github.com`).toLowerCase();
        }

        if (!email && !preferredUsername) {
          return jsonResponse({ error: 'Please enter your Gmail / social email or account handle.' }, 400);
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          // If user typed just the Gmail handle without @gmail.com, append @gmail.com for Google
          if (provider === 'google' && /^[a-z0-9._-]+$/i.test(email)) {
            email = `${email}@gmail.com`;
          } else if (provider === 'apple' && /^[a-z0-9._-]+$/i.test(email)) {
            email = `${email}@icloud.com`;
          } else if (provider === 'github' && /^[a-z0-9_-]+$/i.test(email)) {
            preferredUsername = email;
            email = `${email}@users.noreply.github.com`;
          } else {
            return jsonResponse({ error: 'Please enter a valid email address (e.g. you@gmail.com).' }, 400);
          }
        }

        const baseHandle = slugify(preferredUsername || email.split('@')[0] || provider).slice(0, 20);
        let foundUser = db.users.find(
          (u) => (email && u.email && u.email.toLowerCase() === email) || (u.socialProvider === provider && u.username === baseHandle)
        );

        if (!foundUser) {
          let finalUsername = baseHandle.length >= 3 ? baseHandle : `${baseHandle}_${randomHex(2)}`;
          if (db.users.some((u) => u.username === finalUsername)) {
            finalUsername = `${baseHandle.slice(0, 16)}_${randomHex(2)}`;
          }
          const { salt, hash } = await hashPasswordEdge(randomHex(16));
          foundUser = {
            id: 'usr_' + randomHex(8),
            username: finalUsername,
            displayName: displayName || email.split('@')[0] || finalUsername,
            email,
            socialProvider: provider,
            salt,
            passwordHash: hash,
            createdAt: new Date().toISOString()
          };
          db.users.push(foundUser);
        } else {
          foundUser.socialProvider = foundUser.socialProvider || provider;
          if (email && !foundUser.email) foundUser.email = email;
          if (displayName) foundUser.displayName = displayName;
        }

        if (provider === 'github' && accessToken) {
          const existingGh = db.hostingConnections.find(
            (c) => c.userId === foundUser.id && c.provider === 'github_pages'
          );
          if (!existingGh) {
            db.hostingConnections.push({
              id: 'host_' + randomHex(6),
              userId: foundUser.id,
              provider: 'github_pages',
              providerLabel: 'GitHub Pages',
              name: `GitHub (@${foundUser.username})`,
              targetUrlOrProject: `${foundUser.username}-space`,
              apiToken: accessToken,
              hasToken: true,
              createdAt: new Date().toISOString()
            });
          }
        }

        const token = randomHex(24);
        db.sessions[token] = foundUser.id;
        await saveDb(env, db);
        return jsonResponse(
          {
            token,
            user: {
              id: foundUser.id,
              username: foundUser.username,
              displayName: foundUser.displayName,
              email: foundUser.email || null,
              socialProvider: foundUser.socialProvider || provider
            }
          },
          200,
          { 'Set-Cookie': `spacehub_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800` }
        );
      }

      if (pathname === '/api/auth/login' && method === 'POST') {
        const cleanUser = String(body.username || '').trim().toLowerCase();
        const found = db.users.find(
          (u) => u.username === cleanUser || (u.email && u.email.toLowerCase() === cleanUser)
        );
        if (!found || !(await verifyPasswordEdge(body.password || '', found.salt, found.passwordHash))) {
          return jsonResponse({ error: 'Invalid username/email or password.' }, 401);
        }
        const token = randomHex(24);
        db.sessions[token] = found.id;
        await saveDb(env, db);
        return jsonResponse(
          {
            token,
            user: {
              id: found.id,
              username: found.username,
              displayName: found.displayName,
              email: found.email || null,
              socialProvider: found.socialProvider || null
            }
          },
          200,
          { 'Set-Cookie': `spacehub_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800` }
        );
      }

      if (pathname === '/api/auth/register' && method === 'POST') {
        const cleanUser = String(body.username || '').trim().toLowerCase();
        if (!/^[a-z0-9_-]{3,24}$/.test(cleanUser)) {
          return jsonResponse({ error: 'Username must be 3–24 lowercase letters, numbers, - or _.' }, 400);
        }
        if (!body.password || String(body.password).length < 6) {
          return jsonResponse({ error: 'Password must be at least 6 characters.' }, 400);
        }
        if (db.users.some((u) => u.username === cleanUser)) {
          return jsonResponse({ error: 'Username is already taken.' }, 409);
        }
        const { salt, hash } = await hashPasswordEdge(body.password);
        const newUser = {
          id: 'usr_' + randomHex(8),
          username: cleanUser,
          displayName: String(body.displayName || cleanUser).trim(),
          salt,
          passwordHash: hash,
          createdAt: new Date().toISOString()
        };
        db.users.push(newUser);
        const token = randomHex(24);
        db.sessions[token] = newUser.id;
        await saveDb(env, db);
        return jsonResponse(
          { token, user: { id: newUser.id, username: newUser.username, displayName: newUser.displayName } },
          201,
          { 'Set-Cookie': `spacehub_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800` }
        );
      }

      if (pathname === '/api/auth/logout' && method === 'POST') {
        const cookies = parseCookies(request.headers.get('cookie') || '');
        if (cookies.spacehub_token && db.sessions[cookies.spacehub_token]) {
          delete db.sessions[cookies.spacehub_token];
          await saveDb(env, db);
        }
        return jsonResponse(
          { ok: true },
          200,
          { 'Set-Cookie': 'spacehub_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' }
        );
      }

      if (pathname === '/api/hosting-plans' && method === 'GET') {
        const paypalEmail = env?.PAYPAL_BUSINESS_EMAIL || 'romitat924@gmail.com';
        return jsonResponse({
          plans: HOSTING_PLANS.map((p) => decoratePlanWithPayPalUrls(p, url.origin, paypalEmail))
        });
      }

      if (pathname === '/api/hosting-plans/purchase' && method === 'POST') {
        if (!user) return jsonResponse({ error: 'Please sign in to buy a Space hosting plan.' }, 401);
        const plan = HOSTING_PLANS.find((p) => p.id === body.planId) || HOSTING_PLANS[0];
        const targetSpaceSlug = body.spaceSlug ? slugify(body.spaceSlug) : null;
        const cleanDomain =
          String(body.customDomain || '').trim().toLowerCase().replace(/^https?:\/\//, '') ||
          (targetSpaceSlug ? `${url.host}/live/${targetSpaceSlug}` : `${url.host}/live`);
        const paymentMethod = String(body.paymentMethod || 'paypal_card').trim();
        const paymentRef = String(body.paymentRef || 'paypal_verified').trim();
        const now = new Date().toISOString();
        const conn = {
          id: 'host_' + randomHex(6),
          userId: user.id,
          provider: plan.provider,
          providerLabel: `${plan.name} (${plan.priceLabel})`,
          planName: plan.name,
          priceLabel: plan.priceLabel,
          isSingleSpaceSlot: true,
          assignedSpaceSlug: targetSpaceSlug,
          name: targetSpaceSlug
            ? `${plan.name} — Space: ${targetSpaceSlug}`
            : `${plan.name} — (1 Unassigned Space Slot)`,
          targetUrlOrProject: cleanDomain,
          paymentMethod,
          paymentRef,
          hasToken: true,
          createdAt: now
        };
        db.hostingConnections.unshift(conn);
        await saveDb(env, db);
        return jsonResponse({
          message: `Activated ${plan.name} (${plan.priceLabel})`,
          connection: conn
        }, 201);
      }

      if (pathname === '/api/hosting-connections' && method === 'GET') {
        if (!user) return jsonResponse({ error: 'Authentication required.' }, 401);
        return jsonResponse({
          connections: db.hostingConnections
            .filter((c) => c.userId === user.id)
            .map(({ apiToken, ...rest }) => ({ ...rest, hasToken: Boolean(apiToken || rest.hasToken) }))
        });
      }

      if (pathname === '/api/hosting-connections' && method === 'POST') {
        if (!user) return jsonResponse({ error: 'Authentication required.' }, 401);
        const provider = PROVIDER_LABELS[body.provider] ? body.provider : 'cloudflare_pages';
        const conn = {
          id: 'host_' + randomHex(6),
          userId: user.id,
          provider,
          providerLabel: PROVIDER_LABELS[provider],
          name: String(body.name || `${PROVIDER_LABELS[provider]}`).trim(),
          targetUrlOrProject: String(body.targetUrlOrProject || '').trim(),
          apiToken: String(body.apiToken || '').trim(),
          webhookUrl: String(body.webhookUrl || '').trim(),
          hasToken: Boolean(body.apiToken),
          createdAt: new Date().toISOString()
        };
        db.hostingConnections.push(conn);
        await saveDb(env, db);
        const { apiToken, ...safeConn } = conn;
        return jsonResponse({ connection: safeConn }, 201);
      }

      const delHostMatch = pathname.match(/^\/api\/hosting-connections\/([^/]+)$/i);
      if (delHostMatch && method === 'DELETE') {
        if (!user) return jsonResponse({ error: 'Authentication required.' }, 401);
        const id = delHostMatch[1];
        db.hostingConnections = db.hostingConnections.filter((c) => !(c.id === id && c.userId === user.id));
        await saveDb(env, db);
        return jsonResponse({ ok: true });
      }

      if (pathname === '/api/agent-keys' && method === 'GET') {
        if (!user) return jsonResponse({ error: 'Authentication required.' }, 401);
        return jsonResponse({ keys: db.agentKeys.filter((k) => k.userId === user.id) });
      }

      if (pathname === '/api/agent-keys' && method === 'POST') {
        if (!user) return jsonResponse({ error: 'Authentication required.' }, 401);
        const key = {
          id: 'key_' + randomHex(6),
          userId: user.id,
          name: String(body.name || 'Coding Agent Key').trim(),
          token: 'sh_pat_' + randomHex(18),
          createdAt: new Date().toISOString()
        };
        db.agentKeys.push(key);
        await saveDb(env, db);
        return jsonResponse({ key }, 201);
      }

      const delKeyMatch = pathname.match(/^\/api\/agent-keys\/([^/]+)$/i);
      if (delKeyMatch && method === 'DELETE') {
        if (!user) return jsonResponse({ error: 'Authentication required.' }, 401);
        const id = delKeyMatch[1];
        db.agentKeys = db.agentKeys.filter((k) => !(k.id === id && k.userId === user.id));
        await saveDb(env, db);
        return jsonResponse({ ok: true });
      }

      if (pathname === '/api/spaces' && method === 'GET') {
        const filter = url.searchParams.get('filter') || 'public';
        const q = (url.searchParams.get('search') || '').trim().toLowerCase();
        let results = db.spaces.filter((space) => {
          if (filter === 'mine') return Boolean(user && space.ownerId === user.id);
          if (filter === 'private') return Boolean(user && space.ownerId === user.id && space.visibility === 'private');
          return space.visibility === 'public' && space.status === 'published';
        });
        if (q) {
          results = results.filter(
            (s) =>
              s.title.toLowerCase().includes(q) ||
              s.description.toLowerCase().includes(q) ||
              s.ownerUsername.toLowerCase().includes(q)
          );
        }
        return jsonResponse({ spaces: results.map((s) => formatSpaceSummary(s, user)) });
      }

      if ((pathname === '/api/spaces' || pathname === '/api/agent/v1/spaces') && method === 'POST') {
        if (!user) return jsonResponse({ error: 'Please sign in to create a Space.' }, 401);
        const slug = slugify(body.slug || body.title);
        if (db.spaces.some((s) => s.ownerId === user.id && s.slug === slug)) {
          return jsonResponse({ error: `You already have a Space named "${slug}".` }, 409);
        }
        const tpl = STARTER_TEMPLATES[body.templateId] || STARTER_TEMPLATES.landing;
        const now = new Date().toISOString();
        const files = body.files || tpl.files;
        const cleanTitle = String(body.title || 'Untitled Space').trim();
        const cleanDesc = String(body.description || '').trim();
        const vis = body.visibility === 'public' ? 'public' : 'private';
        const validPlatforms = ['both', 'android', 'iphone', 'web_only'];
        const appPlatform = validPlatforms.includes(body.appPlatform) ? body.appPlatform : 'both';
        const validOrientations = ['any', 'portrait', 'landscape'];
        const appOrientation = validOrientations.includes(body.appOrientation) ? body.appOrientation : 'any';

        const newSpace = {
          id: 'spc_' + randomHex(8),
          ownerId: user.id,
          ownerUsername: user.username,
          slug,
          title: cleanTitle,
          description: cleanDesc,
          emoji: body.emoji || tpl.emoji || '🚀',
          colorFrom: body.colorFrom || tpl.colorFrom || 'indigo',
          colorTo: body.colorTo || tpl.colorTo || 'cyan',
          sdk: 'static',
          visibility: vis,
          appPlatform,
          appOrientation,
          status: 'draft',
          likes: 0,
          likedBy: [],
          createdAt: now,
          updatedAt: now,
          publishedAt: null,
          hasUnpublishedChanges: true,
          agentHistory: [],
          externalHost: null,
          draftFiles: {
            ...files,
            'README.md': generateReadme({
              title: cleanTitle,
              emoji: body.emoji || tpl.emoji || '🚀',
              visibility: vis,
              description: cleanDesc
            })
          },
          publishedFiles: null
        };
        db.spaces.unshift(newSpace);
        await saveDb(env, db);
        return jsonResponse({
          space: {
            ...formatSpaceSummary(newSpace, user),
            draftFiles: newSpace.draftFiles,
            publishedFiles: newSpace.publishedFiles,
            agentHistory: []
          }
        }, 201);
      }

      // Single space routes: /api/spaces/:username/:slug...
      const spaceMatch = pathname.match(/^\/api\/(?:agent\/v1\/)?spaces\/([^/]+)\/([^/]+)(?:\/([^/]+))?$/i);
      if (spaceMatch) {
        const username = decodeURIComponent(spaceMatch[1]).toLowerCase();
        const slug = decodeURIComponent(spaceMatch[2]).toLowerCase();
        const action = spaceMatch[3] ? spaceMatch[3].toLowerCase() : '';
        const space = db.spaces.find((s) => s.ownerUsername === username && s.slug === slug);

        if (!action && method === 'GET') {
          if (!space || !canViewSpace(space, user)) {
            return jsonResponse({ error: 'Space not found or is set to Private.' }, 404);
          }
          const isOwner = Boolean(user && space.ownerId === user.id);
          return jsonResponse({
            space: {
              ...formatSpaceSummary(space, user),
              draftFiles: isOwner ? space.draftFiles : undefined,
              publishedFiles: space.publishedFiles || (isOwner ? space.draftFiles : {}),
              agentHistory: isOwner ? space.agentHistory || [] : []
            }
          });
        }

        if ((!action || action === 'files') && method === 'PUT') {
          if (!user || !space || space.ownerId !== user.id) {
            return jsonResponse({ error: 'Unauthorized.' }, 403);
          }
          if (body.title) space.title = String(body.title).trim();
          if (body.description !== undefined) space.description = String(body.description).trim();
          if (body.visibility === 'public' || body.visibility === 'private') {
            space.visibility = body.visibility;
          }
          if (['both', 'android', 'iphone', 'web_only'].includes(body.appPlatform)) {
            space.appPlatform = body.appPlatform;
          }
          if (['any', 'portrait', 'landscape'].includes(body.appOrientation)) {
            space.appOrientation = body.appOrientation;
          }
          if (typeof body.appIconText === 'string') {
            space.appIconText = body.appIconText.trim().slice(0, 2);
          }
          if (typeof body.appThemeColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(body.appThemeColor.trim())) {
            space.appThemeColor = body.appThemeColor.trim();
          }
          if (typeof body.previewPasscode === 'string') {
            space.previewPasscode = body.previewPasscode.trim().slice(0, 32);
          }
          if (body.customDomain !== undefined) {
            space.customDomain = normalizeCustomDomain(body.customDomain);
          }
          if (body.submissionWebhookUrl !== undefined) {
            space.submissionWebhookUrl = String(body.submissionWebhookUrl || '').trim().slice(0, 300);
          }
          if (body.secrets !== undefined) {
            space.secrets = normalizeSpaceSecrets(body.secrets);
          }
          if (body.appStorage !== undefined && typeof body.appStorage === 'object') {
            space.appStorage = body.appStorage;
          }
          const incomingFiles = body.draftFiles || body.files;
          if (incomingFiles && typeof incomingFiles === 'object') {
            pushSpaceSnapshot(space, 'Before manual save');
            space.draftFiles = { ...space.draftFiles, ...incomingFiles };
            space.hasUnpublishedChanges = true;
          }
          space.updatedAt = new Date().toISOString();
          await saveDb(env, db);
          return jsonResponse({
            space: {
              ...formatSpaceSummary(space, user),
              draftFiles: space.draftFiles,
              publishedFiles: space.publishedFiles,
              snapshots: space.snapshots || [],
              agentHistory: space.agentHistory || []
            }
          });
        }

        if (action === 'submissions') {
          if (!space) return jsonResponse({ error: 'Space not found.' }, 404);
          if (method === 'POST') {
            const entry = {
              id: 'sub_' + randomHex(6),
              name: String(body.name || '').trim().slice(0, 120),
              email: String(body.email || '').trim().slice(0, 160),
              message: String(body.message || body.note || '').trim().slice(0, 1000),
              fields: body,
              createdAt: new Date().toISOString()
            };
            space.submissions = Array.isArray(space.submissions) ? space.submissions : [];
            space.submissions.unshift(entry);
            if (space.submissions.length > 200) space.submissions = space.submissions.slice(0, 200);
            await saveDb(env, db);
            return jsonResponse({ ok: true, submission: entry, submissionCount: space.submissions.length }, 201);
          }
          if (!user || space.ownerId !== user.id) {
            return jsonResponse({ error: 'Only the Space owner can view or manage submissions.' }, 403);
          }
          if (method === 'GET') {
            return jsonResponse({ submissions: space.submissions || [] });
          }
          if (method === 'DELETE') {
            const subId = url.searchParams.get('id');
            if (subId) {
              space.submissions = (space.submissions || []).filter((s) => s.id !== subId);
            } else {
              space.submissions = [];
            }
            await saveDb(env, db);
            return jsonResponse({ ok: true, submissions: space.submissions });
          }
        }

        if (action === 'snapshot' && method === 'POST') {
          if (!user || !space || space.ownerId !== user.id) {
            return jsonResponse({ error: 'Unauthorized.' }, 403);
          }
          const label = String(body.label || 'Manual checkpoint').trim().slice(0, 60);
          pushSpaceSnapshot(space, label);
          await saveDb(env, db);
          return jsonResponse({
            message: `Saved checkpoint: "${label}"`,
            space: {
              ...formatSpaceSummary(space, user),
              draftFiles: space.draftFiles,
              publishedFiles: space.publishedFiles,
              agentHistory: space.agentHistory || []
            }
          }, 201);
        }

        if (action === 'rollback' && method === 'POST') {
          if (!user || !space || space.ownerId !== user.id) {
            return jsonResponse({ error: 'Unauthorized.' }, 403);
          }
          const snaps = space.snapshots || [];
          if (!snaps.length) {
            return jsonResponse({ error: 'No previous snapshot available to restore.' }, 400);
          }
          let snap;
          if (body.snapshotId) {
            const idx = snaps.findIndex((s) => s.id === body.snapshotId);
            snap = idx > -1 ? snaps.splice(idx, 1)[0] : snaps.shift();
          } else {
            snap = snaps.shift();
          }
          space.draftFiles = JSON.parse(JSON.stringify(snap.files));
          space.hasUnpublishedChanges = true;
          space.updatedAt = new Date().toISOString();
          await saveDb(env, db);
          return jsonResponse({
            message: `Restored previous version (${snap.label})`,
            space: {
              ...formatSpaceSummary(space, user),
              draftFiles: space.draftFiles,
              publishedFiles: space.publishedFiles,
              snapshots: space.snapshots || [],
              agentHistory: space.agentHistory || []
            }
          });
        }

        if (action === 'fork' && method === 'POST') {
          if (!user) return jsonResponse({ error: 'Please sign in to clone this Space.' }, 401);
          if (!space || !canViewSpace(space, user)) {
            return jsonResponse({ error: 'Space not found or is Private.' }, 404);
          }
          let forkSlug = slugify(`${space.slug}-fork`);
          if (db.spaces.some((s) => s.ownerId === user.id && s.slug === forkSlug)) {
            forkSlug = slugify(`${space.slug}-fork-${randomHex(2)}`);
          }
          const now = new Date().toISOString();
          const sourceFiles = space.publishedFiles || space.draftFiles || {};
          const forkedSpace = {
            id: 'spc_' + randomHex(8),
            ownerId: user.id,
            ownerUsername: user.username,
            slug: forkSlug,
            title: `${space.title} (Fork)`,
            description: space.description || `Cloned from @${space.ownerUsername}/${space.slug}`,
            emoji: space.emoji || '🚀',
            colorFrom: space.colorFrom || 'indigo',
            colorTo: space.colorTo || 'cyan',
            sdk: 'static',
            visibility: 'private',
            appPlatform: space.appPlatform || 'both',
            appOrientation: space.appOrientation || 'any',
            appIconText: space.appIconText || '',
            appThemeColor: space.appThemeColor || '#09090b',
            status: 'draft',
            likes: 0,
            views: 0,
            installs: 0,
            likedBy: [],
            snapshots: [],
            createdAt: now,
            updatedAt: now,
            publishedAt: null,
            hasUnpublishedChanges: true,
            agentHistory: [],
            externalHost: null,
            draftFiles: JSON.parse(JSON.stringify(sourceFiles)),
            publishedFiles: null
          };
          db.spaces.unshift(forkedSpace);
          await saveDb(env, db);
          return jsonResponse(
            {
              message: `Cloned to @${user.username}/${forkSlug} in Private Staging!`,
              space: {
                ...formatSpaceSummary(forkedSpace, user),
                draftFiles: forkedSpace.draftFiles,
                publishedFiles: null,
                agentHistory: []
              }
            },
            201
          );
        }

        if (!action && method === 'DELETE') {
          if (!user || !space || space.ownerId !== user.id) {
            return jsonResponse({ error: 'Unauthorized.' }, 403);
          }
          db.spaces = db.spaces.filter((s) => s.id !== space.id);
          await saveDb(env, db);
          return jsonResponse({ ok: true });
        }

        if (action === 'agent-build' && method === 'POST') {
          if (!user || !space || space.ownerId !== user.id) {
            return jsonResponse({ error: 'Unauthorized.' }, 403);
          }
          const prompt = String(body.prompt || '').trim();
          if (!prompt) return jsonResponse({ error: 'Prompt is required.' }, 400);

          let result;
          const provider = body.provider || 'builtin_agent';

          if (provider === 'openai_compatible' && body.apiKey) {
            const endpoint = body.endpointUrl || 'https://api.openai.com/v1/chat/completions';
            const r = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${body.apiKey}`
              },
              body: JSON.stringify({
                model: body.model || 'gpt-4o-mini',
                response_format: { type: 'json_object' },
                messages: [
                  {
                    role: 'system',
                    content: 'Return JSON: {"summary":"...","files":{"index.html":"...","style.css":"...","script.js":"..."}}'
                  },
                  { role: 'user', content: prompt }
                ]
              })
            });
            if (!r.ok) return jsonResponse({ error: `Provider returned HTTP ${r.status}` }, 400);
            const d = await r.json();
            result = JSON.parse(d.choices?.[0]?.message?.content || '{}');
          } else if (provider === 'custom_webhook' && body.endpointUrl) {
            const r = await fetch(body.endpointUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt, spaceTitle: space.title, files: space.draftFiles })
            });
            if (!r.ok) return jsonResponse({ error: `Webhook returned HTTP ${r.status}` }, 400);
            result = await r.json();
          } else {
            result = synthesizeWithBuiltinAgent(prompt, space.title);
          }

          pushSpaceSnapshot(space, `Before AI build: ${prompt.slice(0, 40)}`);
          space.draftFiles = {
            ...space.draftFiles,
            ...(result.files || {})
          };
          space.hasUnpublishedChanges = true;
          space.updatedAt = new Date().toISOString();
          const summary = result.summary || `Updated staging files for "${prompt.slice(0, 60)}"`;
          space.agentHistory = space.agentHistory || [];
          space.agentHistory.unshift({
            id: 'agt_' + randomHex(6),
            prompt,
            provider,
            summary,
            createdAt: space.updatedAt
          });
          await saveDb(env, db);
          return jsonResponse({
            summary,
            space: {
              ...formatSpaceSummary(space, user),
              draftFiles: space.draftFiles,
              publishedFiles: space.publishedFiles,
              agentHistory: space.agentHistory
            }
          });
        }

        if ((action === 'deploy-external' || action === 'publish') && method === 'POST') {
          if (!user || !space || space.ownerId !== user.id) {
            return jsonResponse({ error: 'Unauthorized.' }, 403);
          }
          if (body.visibility === 'public' || body.visibility === 'private') {
            space.visibility = body.visibility;
          }
          if (body.draftFiles) {
            space.draftFiles = { ...space.draftFiles, ...body.draftFiles };
          }
          let conn = null;
          if (body.connectionId) {
            conn = db.hostingConnections.find((c) => c.id === body.connectionId && c.userId === user.id);
          }
          if (conn && conn.isSingleSpaceSlot) {
            if (conn.assignedSpaceSlug && conn.assignedSpaceSlug !== space.slug) {
              return jsonResponse(
                {
                  error: `This hosting plan is already bound to Space "${conn.assignedSpaceSlug}". Each Space requires its own $1/month or $12/year hosting plan.`
                },
                402
              );
            }
            conn.assignedSpaceSlug = space.slug;
            conn.name = `${conn.planName || 'Space Hosting'} — Space: ${space.slug}`;
          }
          const provider = conn?.provider || (PROVIDER_LABELS[body.provider] ? body.provider : 'cloudflare_pages');
          const providerLabel = PROVIDER_LABELS[provider] || 'Cloudflare Pages';
          const apiToken = body.apiToken || conn?.apiToken || '';
          const targetProject = body.customLiveUrl || conn?.targetUrlOrProject || space.slug;

          let liveUrl = `${url.origin}/live/${space.slug}`;
          let deployNote = `Published on ${providerLabel}`;

          if (provider === 'github_pages' && apiToken) {
            const ghResult = await pushFilesToGitHubEdge({
              token: apiToken,
              repoName: targetProject || space.slug,
              files: space.draftFiles,
              description: space.description
            });
            liveUrl = ghResult.pagesUrl;
            deployNote = `Pushed to GitHub repository (${ghResult.repoUrl})`;
          } else if (body.customLiveUrl) {
            liveUrl = String(body.customLiveUrl).startsWith('http')
              ? body.customLiveUrl
              : `https://${body.customLiveUrl}`;
          }

          const now = new Date().toISOString();
          space.externalHost = {
            provider,
            providerLabel,
            projectName: space.slug,
            liveUrl,
            deployNote,
            lastDeployedAt: now
          };
          space.publishedFiles = JSON.parse(JSON.stringify(space.draftFiles));
          space.status = 'published';
          space.publishedAt = now;
          space.updatedAt = now;
          space.hasUnpublishedChanges = false;
          await saveDb(env, db);
          return jsonResponse({
            message: `${deployNote} → ${liveUrl}`,
            externalHost: space.externalHost,
            space: {
              ...formatSpaceSummary(space, user),
              draftFiles: space.draftFiles,
              publishedFiles: space.publishedFiles,
              agentHistory: space.agentHistory || []
            }
          });
        }

        if (action === 'export-bundle' && method === 'GET') {
          if (!space || !canViewSpace(space, user)) {
            return jsonResponse({ error: 'Not found' }, 404);
          }
          return jsonResponse({
            slug: space.slug,
            title: space.title,
            files: {
              ...space.draftFiles,
              'manifest.webmanifest': JSON.stringify(generateSpaceManifest(space, ''), null, 2),
              'icon.svg': generateSpaceIconSvg(space.title),
              'sw.js': generateSpaceServiceWorker(space.slug),
              'vercel.json': JSON.stringify({ version: 2, name: space.slug, cleanUrls: true }, null, 2),
              'netlify.toml': '[build]\n  publish = "."\n'
            }
          });
        }

        if (action === 'like' && method === 'POST') {
          if (!user || !space) return jsonResponse({ error: 'Sign in required' }, 401);
          space.likedBy = space.likedBy || [];
          const idx = space.likedBy.indexOf(user.id);
          if (idx === -1) space.likedBy.push(user.id);
          else space.likedBy.splice(idx, 1);
          space.likes = space.likedBy.length;
          await saveDb(env, db);
          return jsonResponse({ likes: space.likes, likedByMe: idx === -1 });
        }
      }
    }

    return env.ASSETS.fetch(request);
  }
};
