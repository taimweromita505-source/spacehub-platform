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
  }
};

const HOSTING_PLANS = [
  {
    id: 'plan_monthly_1',
    name: 'Monthly Account Hosting',
    amountUsd: '1.00',
    billingUnit: 'M',
    priceMonthly: 1,
    billingPeriod: '1 month',
    priceLabel: '$1 / month',
    provider: 'cloudflare_pages',
    providerLabel: 'SpaceHub Managed Edge Hosting',
    features: [
      'Host your account websites & apps for 1 full month',
      'Clean shareable production URL (/live/your-app)',
      'Global Cloudflare Edge CDN + automatic SSL',
      'Pay with Card, Apple/Google Pay, Venmo, or PayPal'
    ]
  },
  {
    id: 'plan_yearly_12',
    name: 'Annual Account Hosting',
    amountUsd: '12.00',
    billingUnit: 'Y',
    priceMonthly: 1,
    priceYearly: 12,
    billingPeriod: '1 year',
    priceLabel: '$12 / year',
    provider: 'cloudflare_pages',
    providerLabel: 'SpaceHub Managed Edge Hosting (1 Year)',
    features: [
      'Full 12 months of account hosting ($1/month rate)',
      'Unlimited hosted Spaces & clean /live/ URLs',
      'Custom domain routing & priority global CDN',
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

function formatSpaceSummary(space, user) {
  const isOwner = Boolean(user && space.ownerId === user.id);
  const stagingPreviewUrl = `/spaces/${space.ownerUsername}/${space.slug}/live`;
  const externalLiveUrl = space.externalHost?.liveUrl || null;
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
    status: space.status,
    likes: space.likes || 0,
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

function buildBundledHtml(files, origin = '') {
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
  if (origin) {
    const badgeHtml = `<a href="${origin}" target="_blank" rel="noopener" style="position:fixed;bottom:12px;right:12px;z-index:99999;background:rgba(9,9,11,0.88);color:#fafafa;border:1px solid #27272a;padding:6px 11px;border-radius:999px;font-family:system-ui,sans-serif;font-size:12px;font-weight:600;text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,0.35);backdrop-filter:blur(4px)">◆ Hosted on SpaceHub · $1/mo</a>`;
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

    // 1. Short Clean Live URL Route (/live/:slug or /s/:slug) & Full Route (/spaces/:username/:slug/live)
    const shortLiveMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/?$/i);
    const liveMatch = pathname.match(/^\/spaces\/([^/]+)\/([^/]+)\/live$/i);
    if ((shortLiveMatch || liveMatch) && method === 'GET') {
      const mode = url.searchParams.get('mode') === 'draft' ? 'draft' : 'published';
      let space = null;
      if (shortLiveMatch) {
        const slug = decodeURIComponent(shortLiveMatch[1]).toLowerCase();
        space = db.spaces.find((s) => s.slug === slug);
      } else {
        const username = decodeURIComponent(liveMatch[1]).toLowerCase();
        const slug = decodeURIComponent(liveMatch[2]).toLowerCase();
        space = db.spaces.find((s) => s.ownerUsername === username && s.slug === slug);
      }
      const isOwner = Boolean(user && space && space.ownerId === user.id);
      if (!space || (space.visibility === 'private' && !isOwner) || (space.status === 'draft' && !isOwner)) {
        return new Response(
          `<!DOCTYPE html><html><body style="background:#09090b;color:#fafafa;font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center;padding:2rem;border:1px solid #27272a;border-radius:0.75rem;background:#18181b;max-width:420px"><h1 style="font-size:1.25rem;margin-bottom:0.5rem">404 — Private or Unlaunched Space</h1><p style="color:#a1a1aa;font-size:0.9rem;margin-bottom:1.25rem">This Space is set to private or is currently in staging.</p><a href="/" style="color:#818cf8;text-decoration:none;font-weight:600">← Return to SpaceHub</a></div></body></html>`,
          { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
      const targetFiles = mode === 'draft' && isOwner ? space.draftFiles : space.publishedFiles || space.draftFiles;
      return new Response(buildBundledHtml(targetFiles, url.origin), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
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
                hostingPlan: user.hostingPlan || null
              }
            : null
        });
      }

      if (pathname === '/api/auth/login' && method === 'POST') {
        const cleanUser = String(body.username || '').trim().toLowerCase();
        const found = db.users.find((u) => u.username === cleanUser);
        if (!found || !(await verifyPasswordEdge(body.password || '', found.salt, found.passwordHash))) {
          return jsonResponse({ error: 'Invalid username or password.' }, 401);
        }
        const token = randomHex(24);
        db.sessions[token] = found.id;
        await saveDb(env, db);
        return jsonResponse(
          { token, user: { id: found.id, username: found.username, displayName: found.displayName } },
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
        if (!user) return jsonResponse({ error: 'Please sign in to buy a hosting plan.' }, 401);
        const plan = HOSTING_PLANS.find((p) => p.id === body.planId) || HOSTING_PLANS[0];
        const cleanDomain =
          String(body.customDomain || '').trim().toLowerCase().replace(/^https?:\/\//, '') ||
          `${url.host}/live`;
        const paymentMethod = String(body.paymentMethod || 'paypal_card').trim();
        const paymentRef = String(body.paymentRef || 'paypal_verified').trim();
        const now = new Date().toISOString();
        user.hostingPlan = {
          planId: plan.id,
          name: plan.name,
          priceLabel: plan.priceLabel,
          billingPeriod: plan.billingPeriod,
          paymentMethod,
          paymentRef,
          activatedAt: now
        };
        const conn = {
          id: 'host_' + randomHex(6),
          userId: user.id,
          provider: plan.provider,
          providerLabel: `${plan.name} (${plan.priceLabel})`,
          name: `${plan.name} — ${cleanDomain}`,
          targetUrlOrProject: cleanDomain,
          hasToken: true,
          createdAt: now
        };
        db.hostingConnections.unshift(conn);
        await saveDb(env, db);
        return jsonResponse({
          message: `Activated ${plan.name} (${plan.priceLabel}) via PayPal Checkout`,
          hostingPlan: user.hostingPlan,
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
          const incomingFiles = body.draftFiles || body.files;
          if (incomingFiles && typeof incomingFiles === 'object') {
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
              agentHistory: space.agentHistory || []
            }
          });
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
