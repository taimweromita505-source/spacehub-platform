const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Load .env from project root if present
const ENV_PATH = path.join(__dirname, '.env');
if (fs.existsSync(ENV_PATH)) {
  fs.readFileSync(ENV_PATH, 'utf8')
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
      } else if (/^(ghp_|github_pat_)/.test(trimmed) && !process.env.GITHUB_TOKEN) {
        process.env.GITHUB_TOKEN = trimmed;
      }
    });
}

app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

function generateReadme(meta) {
  return `---
title: ${meta.title}
emoji: ${meta.emoji || '🚀'}
colorFrom: ${meta.colorFrom || 'indigo'}
colorTo: ${meta.colorTo || 'purple'}
sdk: static
app_file: index.html
visibility: ${meta.visibility || 'public'}
external_host: ${meta.externalHostProvider || 'none'}
short_description: ${meta.description || 'A web application staged on SpaceHub'}
---

# ${meta.emoji || '🚀'} ${meta.title}

${meta.description || 'Build and check how your website looks inside the SpaceHub staging workspace, then deploy to your connected hosting service (Vercel, Netlify, GitHub Pages, Cloudflare Pages, or Custom Host).'}
`;
}

const STARTER_TEMPLATES = {
  landing: {
    name: 'Modern SaaS Landing Page',
    emoji: '✨',
    colorFrom: 'indigo',
    colorTo: 'cyan',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NovaCloud — Next-Gen Web Platform</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <nav class="nav">
    <div class="logo">✨ NovaCloud</div>
    <button id="ctaBtn" class="btn-outline">Get Early Access</button>
  </nav>
  <main class="hero">
    <span class="badge">STAGED ON SPACEHUB · DEPLOY ANYWHERE</span>
    <h1>Build &amp; Check in Staging. Deploy to Your Own Host.</h1>
    <p>Test your layout in the staging workspace, connect your own coding agent, keep drafts private, and push directly to Vercel, Netlify, GitHub Pages, or your own hosting webhook.</p>
    <div class="actions">
      <button id="launchDemoBtn" class="btn-primary">Run Interactive Demo</button>
      <span id="counterText" class="counter">0 launches today</span>
    </div>
    <div class="cards">
      <div class="card">
        <h3>🛠️ Staging &amp; Live Check</h3>
        <p>Preview Desktop, Tablet, and Mobile viewports before deploying.</p>
      </div>
      <div class="card">
        <h3>☁️ Connect Your Hosting</h3>
        <p>Deploy directly to Vercel, Netlify, GitHub Pages, or custom webhooks.</p>
      </div>
      <div class="card">
        <h3>🔒 Privacy First</h3>
        <p>Hide your project in Private mode while building or testing.</p>
      </div>
    </div>
  </main>
  <script src="script.js"></script>
</body>
</html>`,
      'style.css': `* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: system-ui, -apple-system, sans-serif;
  background: radial-gradient(circle at top, #1e1b4b, #090d16);
  color: #f8fafc;
  min-height: 100vh;
  padding: 2rem;
}
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 960px;
  margin: 0 auto 4rem;
}
.logo { font-weight: 800; font-size: 1.25rem; letter-spacing: -0.02em; }
.hero {
  max-width: 820px;
  margin: 0 auto;
  text-align: center;
}
.badge {
  display: inline-block;
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.2);
  border: 1px solid rgba(99, 102, 241, 0.45);
  color: #a5b4fc;
  font-size: 0.75rem;
  font-weight: 700;
  margin-bottom: 1.25rem;
}
h1 {
  font-size: clamp(2.2rem, 5vw, 3.5rem);
  line-height: 1.1;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #fff, #93c5fd);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
p { color: #94a3b8; font-size: 1.1rem; line-height: 1.6; margin-bottom: 2rem; }
.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  align-items: center;
  margin-bottom: 3.5rem;
  flex-wrap: wrap;
}
.btn-primary {
  background: linear-gradient(135deg, #6366f1, #06b6d4);
  color: white;
  border: none;
  padding: 0.85rem 1.6rem;
  border-radius: 0.65rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(99, 102, 241, 0.35); }
.btn-outline {
  background: transparent;
  color: #e2e8f0;
  border: 1px solid #334155;
  padding: 0.55rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
}
.counter { font-size: 0.9rem; color: #38bdf8; font-weight: 600; }
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem;
  text-align: left;
}
.card {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.15);
  padding: 1.5rem;
  border-radius: 1rem;
}
.card h3 { font-size: 1rem; margin-bottom: 0.5rem; color: #f1f5f9; }
.card p { font-size: 0.9rem; margin-bottom: 0; }`,
      'script.js': `let count = 12;
const btn = document.getElementById('launchDemoBtn');
const counterText = document.getElementById('counterText');

if (btn && counterText) {
  counterText.textContent = count + ' launches today';
  btn.addEventListener('click', () => {
    count++;
    counterText.textContent = count + ' launches today 🚀';
    btn.textContent = 'Boosted! (+1)';
    setTimeout(() => { btn.textContent = 'Run Interactive Demo'; }, 900);
  });
}`
    }
  },
  dashboard: {
    name: 'Interactive Analytics App',
    emoji: '📊',
    colorFrom: 'emerald',
    colorTo: 'teal',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PulseMetrics Dashboard</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="app">
    <header>
      <div>
        <h1>📊 PulseMetrics Live</h1>
        <p class="subtitle">Real-time interactive metric simulator</p>
      </div>
      <button id="simulateBtn">Simulate Traffic Spike</button>
    </header>
    <section class="kpi-grid">
      <div class="kpi"><span class="label">Active Users</span><strong id="usersVal">1,420</strong></div>
      <div class="kpi"><span class="label">Conversion Rate</span><strong id="convVal">4.8%</strong></div>
      <div class="kpi"><span class="label">Avg Latency</span><strong id="latVal">24ms</strong></div>
    </section>
    <section class="chart-box">
      <h3>Live Throughput (req/sec)</h3>
      <div id="bars" class="bars"></div>
    </section>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
      'style.css': `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #061311; color: #ecfdf5; padding: 2rem; }
.app { max-width: 860px; margin: 0 auto; }
header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
.subtitle { color: #6ee7b7; font-size: 0.9rem; margin-top: 0.25rem; }
button { background: #10b981; color: #022c22; font-weight: 700; border: none; padding: 0.7rem 1.2rem; border-radius: 0.5rem; cursor: pointer; }
button:hover { background: #34d399; }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
.kpi { background: #062822; border: 1px solid #0f5144; padding: 1.25rem; border-radius: 0.75rem; }
.kpi .label { display: block; font-size: 0.8rem; color: #a7f3d0; margin-bottom: 0.4rem; }
.kpi strong { font-size: 1.8rem; color: #fff; }
.chart-box { background: #062822; border: 1px solid #0f5144; padding: 1.5rem; border-radius: 0.75rem; }
.chart-box h3 { font-size: 0.95rem; color: #a7f3d0; margin-bottom: 1.25rem; }
.bars { display: flex; align-items: flex-end; gap: 0.5rem; height: 180px; padding-top: 1rem; }
.bar { flex: 1; background: linear-gradient(to top, #059669, #34d399); border-radius: 4px 4px 0 0; transition: height 0.35s ease; min-height: 12%; }`,
      'script.js': `const barsEl = document.getElementById('bars');
const usersVal = document.getElementById('usersVal');
const convVal = document.getElementById('convVal');
const latVal = document.getElementById('latVal');

function renderBars(multiplier = 1) {
  barsEl.innerHTML = '';
  for (let i = 0; i < 16; i++) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    const h = Math.min(100, Math.max(15, Math.floor(Math.random() * 75 * multiplier)));
    bar.style.height = h + '%';
    barsEl.appendChild(bar);
  }
}

document.getElementById('simulateBtn').addEventListener('click', () => {
  renderBars(1.35);
  usersVal.textContent = (1500 + Math.floor(Math.random() * 900)).toLocaleString();
  convVal.textContent = (4.2 + Math.random() * 2.1).toFixed(1) + '%';
  latVal.textContent = (18 + Math.floor(Math.random() * 14)) + 'ms';
});

renderBars();`
    }
  },
  canvas: {
    name: 'Interactive Synth & Particle Toy',
    emoji: '🎨',
    colorFrom: 'pink',
    colorTo: 'orange',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cosmic Particle Playground</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="overlay">
    <h1>🎨 Cosmic Particle Studio</h1>
    <p>Move your cursor or tap anywhere to spawn reactive particles.</p>
    <button id="burstBtn">Supernova Burst</button>
  </div>
  <canvas id="canvas"></canvas>
  <script src="script.js"></script>
</body>
</html>`,
      'style.css': `* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #090514; color: #fff; font-family: system-ui, sans-serif; overflow: hidden; height: 100vh; }
canvas { display: block; width: 100vw; height: 100vh; }
.overlay {
  position: fixed;
  top: 1.5rem;
  left: 1.5rem;
  z-index: 10;
  background: rgba(15, 10, 30, 0.78);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(244, 114, 182, 0.35);
  padding: 1.25rem;
  border-radius: 0.85rem;
  max-width: 320px;
}
h1 { font-size: 1.2rem; margin-bottom: 0.35rem; }
p { font-size: 0.85rem; color: #cbd5e1; margin-bottom: 0.85rem; }
button {
  background: linear-gradient(135deg, #ec4899, #f97316);
  border: none;
  color: white;
  font-weight: 600;
  padding: 0.55rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
}`,
      'script.js': `const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let particles = [];

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function spawn(x, y, count = 6) {
  const hues = [320, 280, 25, 190];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4.5;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 4,
      hue: hues[Math.floor(Math.random() * hues.length)],
      alpha: 1
    });
  }
}

window.addEventListener('pointermove', (e) => spawn(e.clientX, e.clientY, 4));
document.getElementById('burstBtn').addEventListener('click', () => {
  spawn(canvas.width / 2, canvas.height / 2, 90);
});

function animate() {
  ctx.fillStyle = 'rgba(9, 5, 20, 0.16)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 0.014;
    if (p.alpha <= 0) {
      particles.splice(i, 1);
      continue;
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = \`hsla(\${p.hue}, 95%, 65%, \${p.alpha})\`;
    ctx.fill();
  }
  requestAnimationFrame(animate);
}
spawn(window.innerWidth / 2, window.innerHeight / 2, 50);
animate();`
    }
  }
};

function loadDb() {
  if (!fs.existsSync(DB_FILE)) {
    const seed = {
      users: [],
      sessions: {},
      agentKeys: [],
      hostingConnections: [],
      spaces: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf8');
    return seed;
  }
  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  db.users = db.users || [];
  db.sessions = db.sessions || {};
  db.agentKeys = db.agentKeys || [];
  db.hostingConnections = db.hostingConnections || [];
  db.spaces = db.spaces || [];
  return db;
}

function saveDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const cookies = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const key = pair.slice(0, idx).trim();
      const val = decodeURIComponent(pair.slice(idx + 1).trim());
      cookies[key] = val;
    }
  });
  return cookies;
}

function getCurrentUser(req, db) {
  const authHeader = req.headers.authorization || '';
  const agentKeyHeader = req.headers['x-agent-key'] || '';
  let token = null;

  if (agentKeyHeader) {
    token = String(agentKeyHeader).trim();
  } else if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else {
    const cookies = parseCookies(req);
    token = cookies.spacehub_token || req.query.token || null;
  }

  if (!token) return null;

  if (token.startsWith('sh_pat_')) {
    const pat = (db.agentKeys || []).find((k) => k.token === token);
    if (!pat) return null;
    return db.users.find((u) => u.id === pat.userId) || null;
  }

  const userId = db.sessions[token];
  if (!userId) return null;
  return db.users.find((u) => u.id === userId) || null;
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'my-space';
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

// --- EXTERNAL HOSTING SERVICE CONNECTORS (Vercel, Netlify, GitHub Pages, Cloudflare/Custom Webhook) ---

const PROVIDER_LABELS = {
  vercel: 'Vercel',
  netlify: 'Netlify',
  github_pages: 'GitHub Pages',
  cloudflare_pages: 'Cloudflare Pages',
  custom_webhook: 'Custom Deploy Webhook'
};

async function deployToExternalHost({
  provider,
  apiToken = '',
  projectName = '',
  webhookUrl = '',
  customLiveUrl = '',
  files,
  space
}) {
  const cleanProvider = PROVIDER_LABELS[provider] ? provider : 'vercel';
  const providerLabel = PROVIDER_LABELS[cleanProvider];
  const cleanProject = slugify(projectName || space.slug);
  const now = new Date().toISOString();

  // 1. Custom Deploy Webhook (or local test webhook server)
  if (webhookUrl && /^https?:\/\//i.test(webhookUrl)) {
    const headers = { 'Content-Type': 'application/json' };
    if (apiToken) headers['Authorization'] = `Bearer ${apiToken}`;

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        provider: cleanProvider,
        projectName: cleanProject,
        slug: space.slug,
        title: space.title,
        files
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`${providerLabel} webhook returned ${res.status}: ${errText.slice(0, 160)}`);
    }

    const data = await res.json().catch(() => ({}));
    const resolvedUrl =
      data.liveUrl ||
      data.url ||
      customLiveUrl ||
      `https://${cleanProject}.deployed-app.dev`;

    return {
      provider: cleanProvider,
      providerLabel,
      projectName: cleanProject,
      liveUrl: resolvedUrl,
      lastDeployedAt: now,
      mode: 'webhook_push'
    };
  }

  // 2. Direct Vercel API Deployment (when user supplies a real Vercel token and no customLiveUrl override)
  if (
    cleanProvider === 'vercel' &&
    apiToken &&
    !String(apiToken).startsWith('provisioned_') &&
    !customLiveUrl
  ) {
    const vercelFiles = Object.entries(files).map(([file, data]) => ({
      file,
      data: String(data)
    }));

    const res = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: cleanProject,
        files: vercelFiles,
        projectSettings: { framework: null }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Vercel API error (${res.status}): ${errText.slice(0, 180)}`);
    }

    const data = await res.json();
    const url = data.url ? `https://${data.url}` : `https://${cleanProject}.vercel.app`;
    return {
      provider: 'vercel',
      providerLabel: 'Vercel',
      projectName: cleanProject,
      liveUrl: url,
      lastDeployedAt: now,
      mode: 'vercel_api'
    };
  }

  // 3. Direct Cloudflare Pages Deployment via Connected Wrangler OAuth Account
  if (
    cleanProvider === 'cloudflare_pages' &&
    apiToken === 'wrangler_oauth' &&
    !customLiveUrl
  ) {
    const { execFileSync } = require('child_process');
    const cfDeployDir = path.join(DATA_DIR, 'cf_deploys', cleanProject);
    fs.mkdirSync(cfDeployDir, { recursive: true });
    for (const [fileName, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(cfDeployDir, fileName), String(content), 'utf8');
    }

    const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const deployOut = execFileSync(
      npxBin,
      [
        'wrangler',
        'deploy',
        `--assets=${cfDeployDir}`,
        `--name=${cleanProject}`,
        '--compatibility-date=2026-11-10'
      ],
      { cwd: __dirname, encoding: 'utf8', shell: true }
    );

    const urlMatch = String(deployOut).match(/https:\/\/[a-z0-9.-]+\.(?:workers\.dev|pages\.dev)/i);
    const liveUrl = urlMatch ? urlMatch[0] : `https://${cleanProject}.taimweromita505.workers.dev`;

    return {
      provider: 'cloudflare_pages',
      providerLabel: 'Cloudflare Pages / Workers (Live)',
      projectName: cleanProject,
      liveUrl,
      lastDeployedAt: now,
      mode: 'cloudflare_wrangler_live'
    };
  }

  // 4. Direct GitHub Repository & GitHub Pages Push (when GITHUB_TOKEN or apiToken is supplied)
  const ghToken =
    cleanProvider === 'github_pages'
      ? (apiToken && !String(apiToken).startsWith('provisioned_') ? apiToken : process.env.GITHUB_TOKEN)
      : '';

  if (cleanProvider === 'github_pages' && ghToken && !customLiveUrl) {
    const ghHeaders = {
      Authorization: `Bearer ${ghToken}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'SpaceHub-Platform'
    };

    const userRes = await fetch('https://api.github.com/user', { headers: ghHeaders });
    if (!userRes.ok) {
      throw new Error(`GitHub authentication failed (${userRes.status}). Check your GITHUB_TOKEN.`);
    }
    const ghUser = await userRes.json();
    const owner = ghUser.login;
    const repoName = cleanProject;

    // Create repo if it doesn't exist
    await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: ghHeaders,
      body: JSON.stringify({
        name: repoName,
        description: space.description || 'Deployed from SpaceHub staging workspace',
        private: space.visibility === 'private',
        auto_init: true
      })
    });

    // Push each file to the repo main branch
    for (const [fileName, content] of Object.entries(files)) {
      const fileUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${encodeURIComponent(fileName)}`;
      let sha = undefined;
      const existing = await fetch(fileUrl, { headers: ghHeaders });
      if (existing.ok) {
        const exData = await existing.json();
        sha = exData.sha;
      }
      await fetch(fileUrl, {
        method: 'PUT',
        headers: ghHeaders,
        body: JSON.stringify({
          message: `Deploy ${fileName} from SpaceHub`,
          content: Buffer.from(String(content), 'utf8').toString('base64'),
          ...(sha ? { sha } : {})
        })
      });
    }

    // Enable GitHub Pages on main branch
    await fetch(`https://api.github.com/repos/${owner}/${repoName}/pages`, {
      method: 'POST',
      headers: ghHeaders,
      body: JSON.stringify({ source: { branch: 'main', path: '/' } })
    }).catch(() => {});

    return {
      provider: 'github_pages',
      providerLabel: 'GitHub Pages (Live)',
      projectName: `${owner}/${repoName}`,
      liveUrl: `https://${owner}.github.io/${repoName}/`,
      repoUrl: `https://github.com/${owner}/${repoName}`,
      lastDeployedAt: now,
      mode: 'github_api_live'
    };
  }

  // 5. Connected Hosting Target Link / Simulated Instant Push (when user links their external hosting domain or project)
  const defaultDomains = {
    vercel: `https://${cleanProject}.vercel.app`,
    netlify: `https://${cleanProject}.netlify.app`,
    github_pages: `https://${space.ownerUsername}.github.io/${cleanProject}`,
    cloudflare_pages: `https://${cleanProject}.pages.dev`,
    custom_webhook: `https://${cleanProject}.example.com`
  };

  const finalLiveUrl =
    customLiveUrl && /^https?:\/\//i.test(customLiveUrl)
      ? customLiveUrl.trim()
      : defaultDomains[cleanProvider] || `https://${cleanProject}.vercel.app`;

  return {
    provider: cleanProvider,
    providerLabel,
    projectName: cleanProject,
    liveUrl: finalLiveUrl,
    lastDeployedAt: now,
    mode: 'connected_host'
  };
}

// --- BUILT-IN & BYOA CODING AGENT SYNTHESIZERS ---

function runBuiltinCodingAgent(prompt, currentFiles, spaceTitle) {
  const p = String(prompt || '').toLowerCase();

  if (p.includes('kanban') || p.includes('task') || p.includes('todo') || p.includes('board')) {
    return {
      summary: 'Built an interactive Kanban Task Board with Drag/Click column progression and task creation.',
      files: {
        'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${spaceTitle} — Agent-Built Kanban</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="board-app">
    <header class="top">
      <div>
        <span class="tag">🤖 BUILT BY CODING AGENT</span>
        <h1>⚡ FlowBoard Studio</h1>
      </div>
      <form id="addTaskForm" class="add-bar">
        <input type="text" id="taskInput" placeholder="New task title..." required />
        <button type="submit">+ Add Task</button>
      </form>
    </header>
    <div class="columns">
      <div class="col" data-col="todo"><h3>📌 To Do</h3><div class="list" id="col-todo"></div></div>
      <div class="col" data-col="doing"><h3>🔨 In Progress</h3><div class="list" id="col-doing"></div></div>
      <div class="col" data-col="done"><h3>✅ Ready for Host</h3><div class="list" id="col-done"></div></div>
    </div>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
        'style.css': `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #0b0f19; color: #f8fafc; padding: 2rem; min-height: 100vh; }
.board-app { max-width: 1000px; margin: 0 auto; }
.top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
.tag { font-size: 0.7rem; font-weight: 800; color: #818cf8; letter-spacing: 0.06em; }
.add-bar { display: flex; gap: 0.5rem; }
.add-bar input { padding: 0.65rem 1rem; border-radius: 0.5rem; border: 1px solid #334155; background: #1e293b; color: #fff; }
.add-bar button { padding: 0.65rem 1.1rem; border-radius: 0.5rem; border: none; background: #6366f1; color: white; font-weight: 700; cursor: pointer; }
.columns { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem; }
.col { background: #111827; border: 1px solid #1f2937; border-radius: 0.85rem; padding: 1.1rem; min-height: 360px; }
.col h3 { font-size: 0.95rem; margin-bottom: 1rem; color: #cbd5e1; }
.list { display: flex; flex-direction: column; gap: 0.65rem; }
.task-card { background: #1e293b; border: 1px solid #334155; padding: 0.85rem; border-radius: 0.6rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
.task-card button { background: #334155; color: #e2e8f0; border: none; padding: 0.3rem 0.6rem; border-radius: 0.35rem; cursor: pointer; font-size: 0.75rem; }`,
        'script.js': `const tasks = [
  { id: 1, text: 'Design staging workspace UI', col: 'done' },
  { id: 2, text: 'Connect BYOA Coding Agent API', col: 'doing' },
  { id: 3, text: 'Deploy to connected Vercel / Netlify host', col: 'todo' }
];

function render() {
  ['todo', 'doing', 'done'].forEach(c => {
    document.getElementById('col-' + c).innerHTML = '';
  });
  tasks.forEach(t => {
    const card = document.createElement('div');
    card.className = 'task-card';
    const nextCol = t.col === 'todo' ? 'doing' : t.col === 'doing' ? 'done' : 'todo';
    const btnLabel = t.col === 'done' ? '↺ Reset' : 'Advance →';
    card.innerHTML = \`<span>\${t.text}</span><button data-id="\${t.id}">\${btnLabel}</button>\`;
    card.querySelector('button').addEventListener('click', () => {
      t.col = nextCol;
      render();
    });
    document.getElementById('col-' + t.col).appendChild(card);
  });
}

document.getElementById('addTaskForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('taskInput');
  if (!input.value.trim()) return;
  tasks.push({ id: Date.now(), text: input.value.trim(), col: 'todo' });
  input.value = '';
  render();
});

render();`
      }
    };
  }

  const cleanPrompt = String(prompt || 'Interactive Web App').trim();
  return {
    summary: `Synthesized custom responsive web app for: "${cleanPrompt.slice(0, 80)}"`,
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${spaceTitle} — AI Agent Build</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="shell">
    <header class="header">
      <span class="agent-pill">🤖 GENERATED BY YOUR CODING AGENT</span>
      <h1>${spaceTitle}</h1>
      <p class="prompt-desc">Built from prompt: <em>"${cleanPrompt.replace(/</g, '&lt;')}"</em></p>
    </header>

    <section class="interactive-panel">
      <div class="control-box">
        <h3>Interactive Feature Playground</h3>
        <p>Test state updates and dynamic rendering inside your staging preview:</p>
        <div class="input-row">
          <input type="text" id="itemInput" placeholder="Add an interactive item or command..." />
          <button id="addItemBtn">Execute Action</button>
        </div>
        <ul id="itemsList" class="items-list"></ul>
      </div>
      <div class="metrics-box">
        <h3>Live App Telemetry</h3>
        <div class="stat"><span class="k">Agent Status</span><strong class="v" id="statusVal">Active &amp; Ready</strong></div>
        <div class="stat"><span class="k">Interactions</span><strong class="v" id="clicksVal">1</strong></div>
        <button id="themeBtn" class="secondary-btn">Switch Accent Glow</button>
      </div>
    </section>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
      'style.css': `:root { --accent: #38bdf8; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: system-ui, -apple-system, sans-serif;
  background: radial-gradient(circle at top right, #1e1b4b, #090d16 70%);
  color: #f8fafc;
  min-height: 100vh;
  padding: 2.25rem;
}
.shell { max-width: 900px; margin: 0 auto; }
.header { margin-bottom: 2rem; }
.agent-pill {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid var(--accent);
  color: var(--accent);
  margin-bottom: 0.75rem;
}
h1 { font-size: clamp(1.8rem, 4vw, 2.75rem); margin-bottom: 0.5rem; }
.prompt-desc { color: #94a3b8; font-size: 1rem; }
.interactive-panel {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 1.25rem;
}
@media (max-width: 720px) { .interactive-panel { grid-template-columns: 1fr; } }
.control-box, .metrics-box {
  background: rgba(17, 24, 39, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 1rem;
  padding: 1.5rem;
}
h3 { margin-bottom: 0.5rem; color: #e2e8f0; }
p { color: #94a3b8; font-size: 0.9rem; margin-bottom: 1rem; }
.input-row { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
input {
  flex: 1;
  padding: 0.65rem 0.9rem;
  border-radius: 0.5rem;
  border: 1px solid #334155;
  background: #0f172a;
  color: #fff;
}
button {
  background: var(--accent);
  color: #020617;
  font-weight: 700;
  border: none;
  padding: 0.65rem 1.1rem;
  border-radius: 0.5rem;
  cursor: pointer;
}
.items-list { list-style: none; display: flex; flex-direction: column; gap: 0.5rem; }
.items-list li {
  background: rgba(30, 41, 59, 0.75);
  border-left: 3px solid var(--accent);
  padding: 0.6rem 0.85rem;
  border-radius: 0.4rem;
  font-size: 0.9rem;
}
.stat {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.15);
}
.stat .k { color: #94a3b8; font-size: 0.85rem; }
.stat .v { color: var(--accent); }
.secondary-btn { width: 100%; margin-top: 1.25rem; }`,
      'script.js': `const list = document.getElementById('itemsList');
const input = document.getElementById('itemInput');
const clicksVal = document.getElementById('clicksVal');
let interactions = 1;
const accents = ['#38bdf8', '#a855f7', '#10b981', '#f43f5e'];
let accentIdx = 0;

function addEntry(text) {
  const li = document.createElement('li');
  li.textContent = '✓ ' + text;
  list.prepend(li);
}

addEntry('Initialized staging preview from Coding Agent');
addEntry('Ready to deploy to connected external host');

document.getElementById('addItemBtn').addEventListener('click', () => {
  const val = input.value.trim() || 'Dynamic Action #' + (interactions + 1);
  addEntry(val);
  input.value = '';
  interactions++;
  clicksVal.textContent = String(interactions);
});

document.getElementById('themeBtn').addEventListener('click', () => {
  accentIdx = (accentIdx + 1) % accents.length;
  document.documentElement.style.setProperty('--accent', accents[accentIdx]);
  interactions++;
  clicksVal.textContent = String(interactions);
});`
    }
  };
}

function extractJsonFromText(text) {
  const raw = String(text || '').trim();
  try {
    return JSON.parse(raw);
  } catch (_e) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Coding agent response did not contain valid JSON files.');
  }
}

async function runExternalOrGeminiAgent({
  provider,
  apiKey,
  model,
  endpointUrl,
  prompt,
  currentFiles,
  spaceTitle
}) {
  if (!provider || provider === 'builtin_agent') {
    return runBuiltinCodingAgent(prompt, currentFiles, spaceTitle);
  }

  const systemInstruction = `You are an expert web application coding agent inside SpaceHub.
Generate or update a complete static web app consisting of index.html, style.css, and script.js.
Always return a strict JSON object with this exact shape:
{
  "summary": "Short description of what you built or changed",
  "files": {
    "index.html": "<!DOCTYPE html>...",
    "style.css": "...",
    "script.js": "..."
  }
}
Current Space title: ${spaceTitle}
Current index.html:\n${currentFiles['index.html'] || ''}
Current style.css:\n${currentFiles['style.css'] || ''}
Current script.js:\n${currentFiles['script.js'] || ''}`;

  if (provider === 'gemini') {
    const resolvedKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!resolvedKey) {
      throw new Error('Please provide your Gemini API Key (or select the Built-in Instant Agent to test without a key).');
    }

    let selectedModel = model || 'gemini-3.8-flash';
    if (/^gemini-(1\.5|2\.0|2\.5)/.test(selectedModel)) {
      selectedModel = 'gemini-3.8-flash';
    }

    const client = new GoogleGenAI({ apiKey: resolvedKey });

    if (selectedModel === 'antigravity-preview-09-2026') {
      const interaction = await client.interactions.create({
        agent: 'antigravity-preview-09-2026',
        input: `${systemInstruction}\n\nUser Request: ${prompt}`,
        environment: 'remote'
      });
      return extractJsonFromText(interaction.output_text);
    }

    const interaction = await client.interactions.create({
      model: selectedModel,
      system_instruction: systemInstruction,
      input: prompt,
      response_format: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          files: {
            type: 'object',
            properties: {
              'index.html': { type: 'string' },
              'style.css': { type: 'string' },
              'script.js': { type: 'string' }
            },
            required: ['index.html', 'style.css', 'script.js']
          }
        },
        required: ['summary', 'files']
      }
    });

    return extractJsonFromText(interaction.output_text);
  }

  if (provider === 'openai_compatible' || provider === 'custom_webhook') {
    const targetUrl =
      endpointUrl || 'https://api.openai.com/v1/chat/completions';
    if (!apiKey && targetUrl.includes('openai.com')) {
      throw new Error('Please provide an API Key for your OpenAI-compatible agent endpoint.');
    }

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const body =
      provider === 'custom_webhook'
        ? { prompt, spaceTitle, files: currentFiles }
        : {
            model: model || 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: prompt }
            ]
          };

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Agent endpoint returned ${res.status}: ${errText.slice(0, 180)}`);
    }

    const data = await res.json();
    if (data.files && typeof data.files === 'object') {
      return {
        summary: data.summary || 'Updated files via custom coding agent webhook.',
        files: data.files
      };
    }
    const content = data.choices?.[0]?.message?.content || '';
    return extractJsonFromText(content);
  }

  return runBuiltinCodingAgent(prompt, currentFiles, spaceTitle);
}

// --- AUTH ROUTES ---

app.post('/api/auth/register', (req, res) => {
  const { username, displayName, password } = req.body || {};
  const cleanUser = String(username || '').trim().toLowerCase();
  if (!/^[a-z0-9_-]{3,24}$/.test(cleanUser)) {
    return res.status(400).json({ error: 'Username must be 3-24 characters (lowercase letters, numbers, - or _).' });
  }
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const db = loadDb();
  if (db.users.some((u) => u.username === cleanUser)) {
    return res.status(409).json({ error: 'Username is already taken.' });
  }

  const newUser = {
    id: 'usr_' + crypto.randomBytes(6).toString('hex'),
    username: cleanUser,
    displayName: String(displayName || cleanUser).trim(),
    passwordHash: hashPassword(String(password)),
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  const now = new Date().toISOString();
  db.hostingConnections.push({
    id: 'host_' + crypto.randomBytes(6).toString('hex'),
    userId: newUser.id,
    provider: 'cloudflare_pages',
    providerLabel: 'Cloudflare Pages',
    name: 'Cloudflare Pages (Connected Account)',
    targetUrlOrProject: `${cleanUser}-space`,
    apiToken: 'wrangler_oauth',
    hasToken: true,
    createdAt: now
  });
  if (process.env.GITHUB_TOKEN) {
    db.hostingConnections.push({
      id: 'host_' + crypto.randomBytes(6).toString('hex'),
      userId: newUser.id,
      provider: 'github_pages',
      providerLabel: 'GitHub Pages',
      name: 'GitHub Pages (Connected Repository)',
      targetUrlOrProject: `${cleanUser}-space`,
      apiToken: process.env.GITHUB_TOKEN,
      hasToken: true,
      createdAt: now
    });
  }
  const token = crypto.randomBytes(24).toString('hex');
  db.sessions[token] = newUser.id;
  saveDb(db);

  res.setHeader('Set-Cookie', `spacehub_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
  res.status(201).json({
    token,
    user: { id: newUser.id, username: newUser.username, displayName: newUser.displayName }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const cleanUser = String(username || '').trim().toLowerCase();
  const db = loadDb();
  const user = db.users.find((u) => u.username === cleanUser);

  if (!user || !verifyPassword(String(password || ''), user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const token = crypto.randomBytes(24).toString('hex');
  db.sessions[token] = user.id;
  saveDb(db);

  res.setHeader('Set-Cookie', `spacehub_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
  res.json({
    token,
    user: { id: user.id, username: user.username, displayName: user.displayName }
  });
});

app.post('/api/auth/logout', (req, res) => {
  const db = loadDb();
  const authHeader = req.headers.authorization || '';
  const cookies = parseCookies(req);
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : cookies.spacehub_token;
  if (token && db.sessions[token]) {
    delete db.sessions[token];
    saveDb(db);
  }
  res.setHeader('Set-Cookie', 'spacehub_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  if (!user) return res.json({ user: null });
  res.json({
    user: { id: user.id, username: user.username, displayName: user.displayName }
  });
});

// --- PERSONAL ACCESS TOKENS FOR EXTERNAL CODING AGENTS ---

app.get('/api/agent-keys', (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const keys = (db.agentKeys || [])
    .filter((k) => k.userId === user.id)
    .map((k) => ({
      id: k.id,
      name: k.name,
      token: k.token,
      createdAt: k.createdAt
    }));
  res.json({ keys });
});

app.post('/api/agent-keys', (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const name = String(req.body?.name || 'External Coding Agent').trim().slice(0, 60);
  const newKey = {
    id: 'key_' + crypto.randomBytes(6).toString('hex'),
    userId: user.id,
    name,
    token: 'sh_pat_' + crypto.randomBytes(18).toString('hex'),
    createdAt: new Date().toISOString()
  };

  db.agentKeys.push(newKey);
  saveDb(db);
  res.status(201).json({ key: newKey });
});

app.delete('/api/agent-keys/:id', (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const idx = (db.agentKeys || []).findIndex(
    (k) => k.id === req.params.id && k.userId === user.id
  );
  if (idx === -1) return res.status(404).json({ error: 'Agent API key not found.' });

  db.agentKeys.splice(idx, 1);
  saveDb(db);
  res.json({ ok: true });
});

// --- HOSTING PLANS MARKETPLACE & EXTERNAL HOSTING CONNECTIONS ---

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
  const email = paypalEmail || process.env.PAYPAL_BUSINESS_EMAIL || 'romitat924@gmail.com';
  const amount = plan.amountUsd || (plan.id === 'plan_yearly_12' ? '12.00' : '1.00');
  const unit = plan.billingUnit || (plan.id === 'plan_yearly_12' ? 'Y' : 'M');
  const returnUrl = `${origin}/?paypal_paid=1&planId=${encodeURIComponent(plan.id)}`;
  const cancelUrl = `${origin}/?paypal_canceled=1`;

  const cardCheckoutUrl =
    `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick` +
    `&business=${encodeURIComponent(email)}` +
    `&item_name=${encodeURIComponent('SpaceHub ' + plan.name)}` +
    `&amount=${encodeURIComponent(amount)}` +
    `&currency_code=USD&no_shipping=1&landing_page=Billing&solution_type=Sole` +
    `&return=${encodeURIComponent(returnUrl)}` +
    `&cancel_return=${encodeURIComponent(cancelUrl)}`;

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

app.get('/api/hosting-plans', (req, res) => {
  const origin = `${req.protocol}://${req.get('host')}`;
  res.json({
    plans: HOSTING_PLANS.map((p) => decoratePlanWithPayPalUrls(p, origin))
  });
});

app.post('/api/hosting-plans/purchase', (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  if (!user) return res.status(401).json({ error: 'Please sign in to buy a hosting plan.' });

  const { planId, customDomain = '' } = req.body || {};
  const plan = HOSTING_PLANS.find((p) => p.id === planId) || HOSTING_PLANS[0];
  const now = new Date().toISOString();

  const cleanDomain =
    String(customDomain || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/[^a-z0-9.-]/g, '') || `${user.username}-cloud.spacehub-edge.app`;

  const provisionedConn = {
    id: 'host_' + crypto.randomBytes(6).toString('hex'),
    userId: user.id,
    provider: plan.provider,
    providerLabel: `${plan.name} (${plan.priceLabel})`,
    name: `${plan.name} — ${cleanDomain}`,
    targetUrlOrProject: cleanDomain,
    apiToken: 'provisioned_' + crypto.randomBytes(12).toString('hex'),
    webhookUrl: '',
    hasToken: true,
    planId: plan.id,
    priceLabel: plan.priceLabel,
    purchasedAt: now,
    createdAt: now
  };

  db.hostingConnections = db.hostingConnections || [];
  db.hostingConnections.unshift(provisionedConn);
  saveDb(db);

  res.status(201).json({
    message: `Purchased ${plan.name} (${plan.priceLabel}) and connected ${cleanDomain}!`,
    connection: provisionedConn
  });
});

app.get('/api/hosting-connections', (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const connections = (db.hostingConnections || [])
    .filter((c) => c.userId === user.id)
    .map((c) => ({
      id: c.id,
      provider: c.provider,
      providerLabel: c.providerLabel,
      name: c.name,
      targetUrlOrProject: c.targetUrlOrProject,
      webhookUrl: c.webhookUrl || '',
      hasToken: Boolean(c.apiToken || c.hasToken),
      createdAt: c.createdAt
    }));
  res.json({ connections });
});

app.post('/api/hosting-connections', (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const {
    provider = 'vercel',
    name = '',
    targetUrlOrProject = '',
    apiToken = '',
    webhookUrl = ''
  } = req.body || {};

  const cleanProvider = PROVIDER_LABELS[provider] ? provider : 'vercel';
  const providerLabel = PROVIDER_LABELS[cleanProvider];

  const newConn = {
    id: 'host_' + crypto.randomBytes(6).toString('hex'),
    userId: user.id,
    provider: cleanProvider,
    providerLabel,
    name: String(name || `${providerLabel} Account`).trim().slice(0, 60),
    targetUrlOrProject: String(targetUrlOrProject || '').trim(),
    apiToken: String(apiToken || '').trim(),
    webhookUrl: String(webhookUrl || '').trim(),
    hasToken: Boolean(apiToken),
    createdAt: new Date().toISOString()
  };

  db.hostingConnections.push(newConn);
  saveDb(db);
  res.status(201).json({
    connection: {
      id: newConn.id,
      provider: newConn.provider,
      providerLabel: newConn.providerLabel,
      name: newConn.name,
      targetUrlOrProject: newConn.targetUrlOrProject,
      webhookUrl: newConn.webhookUrl,
      hasToken: newConn.hasToken,
      createdAt: newConn.createdAt
    }
  });
});

app.delete('/api/hosting-connections/:id', (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const idx = (db.hostingConnections || []).findIndex(
    (c) => c.id === req.params.id && c.userId === user.id
  );
  if (idx === -1) return res.status(404).json({ error: 'Hosting connection not found.' });

  db.hostingConnections.splice(idx, 1);
  saveDb(db);
  res.json({ ok: true });
});

// --- TEMPLATES & SPACES ROUTES ---

app.get('/api/templates', (_req, res) => {
  const list = Object.entries(STARTER_TEMPLATES).map(([id, t]) => ({
    id,
    name: t.name,
    emoji: t.emoji,
    colorFrom: t.colorFrom,
    colorTo: t.colorTo
  }));
  res.json({ templates: list });
});

app.get('/api/spaces', (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  const { filter = 'public', search = '' } = req.query;
  const q = String(search || '').trim().toLowerCase();

  let results = db.spaces.filter((space) => {
    if (filter === 'mine') {
      return Boolean(user && space.ownerId === user.id);
    }
    if (filter === 'private') {
      return Boolean(user && space.ownerId === user.id && space.visibility === 'private');
    }
    if (filter === 'all_accessible') {
      return (space.visibility === 'public' && space.status === 'published') || (user && space.ownerId === user.id);
    }
    return space.visibility === 'public' && space.status === 'published';
  });

  if (q) {
    results = results.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.ownerUsername.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q)
    );
  }

  results.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json({ spaces: results.map((s) => formatSpaceSummary(s, user)) });
});

function createSpaceRecord(db, user, payload) {
  const {
    title,
    slug,
    description = '',
    emoji = '🚀',
    colorFrom = 'indigo',
    colorTo = 'purple',
    visibility = 'private',
    templateId = 'landing',
    files = null
  } = payload || {};

  if (!title || !String(title).trim()) {
    const err = new Error('Space title is required.');
    err.status = 400;
    throw err;
  }

  const finalSlug = slugify(slug || title);
  const exists = db.spaces.some(
    (s) => s.ownerUsername === user.username && s.slug === finalSlug
  );
  if (exists) {
    const err = new Error(`You already have a Space named "${finalSlug}".`);
    err.status = 409;
    throw err;
  }

  const template = STARTER_TEMPLATES[templateId] || STARTER_TEMPLATES.landing;
  const cleanVisibility = visibility === 'public' ? 'public' : 'private';
  const now = new Date().toISOString();

  const baseFiles = files && typeof files === 'object' ? files : template.files;
  const initialFiles = {
    'index.html': baseFiles['index.html'] || template.files['index.html'],
    'style.css': baseFiles['style.css'] ?? template.files['style.css'],
    'script.js': baseFiles['script.js'] ?? template.files['script.js'],
    'README.md': generateReadme({
      title: String(title).trim(),
      emoji,
      colorFrom,
      colorTo,
      visibility: cleanVisibility,
      description: String(description).trim()
    })
  };

  const newSpace = {
    id: 'spc_' + crypto.randomBytes(6).toString('hex'),
    ownerId: user.id,
    ownerUsername: user.username,
    slug: finalSlug,
    title: String(title).trim(),
    description: String(description).trim() || 'Staged on SpaceHub',
    emoji: String(emoji || '🚀'),
    colorFrom: String(colorFrom || 'indigo'),
    colorTo: String(colorTo || 'purple'),
    sdk: 'static',
    visibility: cleanVisibility,
    status: 'draft',
    likes: 0,
    likedBy: [],
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    hasUnpublishedChanges: true,
    agentHistory: [],
    externalHost: null,
    draftFiles: initialFiles,
    publishedFiles: null
  };

  db.spaces.push(newSpace);
  saveDb(db);
  return newSpace;
}

app.post('/api/spaces', (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  if (!user) {
    return res.status(401).json({ error: 'Please sign in to create a Space.' });
  }
  try {
    const newSpace = createSpaceRecord(db, user, req.body);
    res.status(201).json({
      space: {
        ...formatSpaceSummary(newSpace, user),
        draftFiles: newSpace.draftFiles,
        publishedFiles: newSpace.publishedFiles,
        agentHistory: newSpace.agentHistory
      }
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get('/api/spaces/:username/:slug', (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  const { username, slug } = req.params;

  const space = db.spaces.find(
    (s) => s.ownerUsername === username.toLowerCase() && s.slug === slug.toLowerCase()
  );

  if (!space || !canViewSpace(space, user)) {
    return res.status(404).json({
      error: 'Space not found or is set to Private by its owner.'
    });
  }

  const isOwner = Boolean(user && space.ownerId === user.id);
  res.json({
    space: {
      ...formatSpaceSummary(space, user),
      draftFiles: isOwner ? space.draftFiles : undefined,
      publishedFiles: space.publishedFiles || (isOwner ? space.draftFiles : {}),
      agentHistory: isOwner ? space.agentHistory || [] : []
    }
  });
});

// Export ready-to-host static bundle (with vercel.json & netlify.toml) for any external hosting service
app.get('/api/spaces/:username/:slug/export-bundle', (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  const { username, slug } = req.params;

  const space = db.spaces.find(
    (s) => s.ownerUsername === username.toLowerCase() && s.slug === slug.toLowerCase()
  );
  if (!space || !canViewSpace(space, user)) {
    return res.status(404).json({ error: 'Space not found or is set to Private.' });
  }

  const files = space.draftFiles || space.publishedFiles || {};
  const bundle = {
    ...files,
    'vercel.json': JSON.stringify(
      {
        version: 2,
        name: space.slug,
        cleanUrls: true
      },
      null,
      2
    ),
    'netlify.toml': `[build]\n  publish = "."\n`
  };

  res.json({
    slug: space.slug,
    title: space.title,
    files: bundle
  });
});

// Save draft workspace files or update settings (privacy, title, description)
app.put('/api/spaces/:username/:slug', (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const { username, slug } = req.params;
  const space = db.spaces.find(
    (s) => s.ownerUsername === username.toLowerCase() && s.slug === slug.toLowerCase()
  );

  if (!space) return res.status(404).json({ error: 'Space not found.' });
  if (space.ownerId !== user.id) {
    return res.status(403).json({ error: 'Only the Space owner can modify this project.' });
  }

  const { title, description, emoji, visibility, colorFrom, colorTo, draftFiles } = req.body || {};

  if (typeof title === 'string' && title.trim()) space.title = title.trim();
  if (typeof description === 'string') space.description = description.trim();
  if (typeof emoji === 'string' && emoji.trim()) space.emoji = emoji.trim();
  if (colorFrom) space.colorFrom = colorFrom;
  if (colorTo) space.colorTo = colorTo;
  if (visibility === 'public' || visibility === 'private') {
    space.visibility = visibility;
  }

  if (draftFiles && typeof draftFiles === 'object') {
    space.draftFiles = { ...space.draftFiles, ...draftFiles };
    space.hasUnpublishedChanges = true;
  }

  space.draftFiles['README.md'] = generateReadme({
    title: space.title,
    emoji: space.emoji,
    colorFrom: space.colorFrom,
    colorTo: space.colorTo,
    visibility: space.visibility,
    externalHostProvider: space.externalHost?.provider,
    description: space.description
  });

  space.updatedAt = new Date().toISOString();
  saveDb(db);

  res.json({
    space: {
      ...formatSpaceSummary(space, user),
      draftFiles: space.draftFiles,
      publishedFiles: space.publishedFiles,
      agentHistory: space.agentHistory || []
    }
  });
});

// IN-STUDIO BYOA CODING AGENT RUNNER
app.post('/api/spaces/:username/:slug/agent-build', async (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const { username, slug } = req.params;
  const space = db.spaces.find(
    (s) => s.ownerUsername === username.toLowerCase() && s.slug === slug.toLowerCase()
  );
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  if (space.ownerId !== user.id) {
    return res.status(403).json({ error: 'Only the Space owner can run a coding agent on this Space.' });
  }

  const {
    prompt,
    provider = 'builtin_agent',
    apiKey = '',
    model = '',
    endpointUrl = '',
    currentFiles = null
  } = req.body || {};

  if (!prompt || !String(prompt).trim()) {
    return res.status(400).json({ error: 'Please provide a build prompt for your coding agent.' });
  }

  const baseFiles = currentFiles && typeof currentFiles === 'object' ? currentFiles : space.draftFiles;

  try {
    const result = await runExternalOrGeminiAgent({
      provider,
      apiKey,
      model,
      endpointUrl,
      prompt: String(prompt).trim(),
      currentFiles: baseFiles,
      spaceTitle: space.title
    });

    const now = new Date().toISOString();
    space.draftFiles = {
      ...space.draftFiles,
      ...result.files,
      'README.md': generateReadme({
        title: space.title,
        emoji: space.emoji,
        colorFrom: space.colorFrom,
        colorTo: space.colorTo,
        visibility: space.visibility,
        externalHostProvider: space.externalHost?.provider,
        description: space.description
      })
    };
    space.hasUnpublishedChanges = true;
    space.updatedAt = now;
    space.agentHistory = space.agentHistory || [];
    space.agentHistory.unshift({
      id: 'agt_' + crypto.randomBytes(4).toString('hex'),
      prompt: String(prompt).trim(),
      provider,
      model: model || provider,
      summary: result.summary,
      createdAt: now
    });

    saveDb(db);

    res.json({
      summary: result.summary,
      space: {
        ...formatSpaceSummary(space, user),
        draftFiles: space.draftFiles,
        publishedFiles: space.publishedFiles,
        agentHistory: space.agentHistory
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Coding agent build failed.' });
  }
});

// Deploy / Launch Space to Connected External Hosting Service (Vercel, Netlify, GitHub Pages, Cloudflare, or Custom Webhook)
async function handleExternalDeploy(req, res) {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const { username, slug } = req.params;
  const space = db.spaces.find(
    (s) => s.ownerUsername === username.toLowerCase() && s.slug === slug.toLowerCase()
  );

  if (!space) return res.status(404).json({ error: 'Space not found.' });
  if (space.ownerId !== user.id) {
    return res.status(403).json({ error: 'Only the Space owner can deploy this Space.' });
  }

  const {
    connectionId = '',
    provider = 'vercel',
    projectName = '',
    apiToken = '',
    webhookUrl = '',
    customLiveUrl = '',
    visibility,
    draftFiles
  } = req.body || {};

  if (visibility === 'public' || visibility === 'private') {
    space.visibility = visibility;
  }
  if (draftFiles && typeof draftFiles === 'object') {
    space.draftFiles = { ...space.draftFiles, ...draftFiles };
  }

  // Look up saved hosting connection if connectionId was passed
  let resolvedProvider = provider;
  let resolvedToken = apiToken;
  let resolvedWebhook = webhookUrl;
  let resolvedProject = projectName || space.slug;
  let resolvedCustomUrl = customLiveUrl;

  if (connectionId) {
    const savedConn = (db.hostingConnections || []).find(
      (c) => c.id === connectionId && c.userId === user.id
    );
    if (savedConn) {
      resolvedProvider = savedConn.provider;
      resolvedToken = resolvedToken || savedConn.apiToken || '';
      resolvedWebhook = resolvedWebhook || savedConn.webhookUrl || '';
      resolvedProject = projectName || savedConn.targetUrlOrProject || space.slug;
      if (!resolvedCustomUrl && savedConn.targetUrlOrProject && savedConn.targetUrlOrProject.includes('.')) {
        const cleanHost = savedConn.targetUrlOrProject.replace(/^https?:\/\//, '').replace(/\/+$/, '');
        resolvedCustomUrl = `https://${cleanHost}/${space.slug}`;
      }
    }
  }

  try {
    const externalHost = await deployToExternalHost({
      provider: resolvedProvider,
      apiToken: resolvedToken,
      projectName: resolvedProject,
      webhookUrl: resolvedWebhook,
      customLiveUrl: resolvedCustomUrl,
      files: space.draftFiles,
      space
    });

    const now = new Date().toISOString();
    space.externalHost = externalHost;
    space.draftFiles['README.md'] = generateReadme({
      title: space.title,
      emoji: space.emoji,
      colorFrom: space.colorFrom,
      colorTo: space.colorTo,
      visibility: space.visibility,
      externalHostProvider: externalHost.provider,
      description: space.description
    });
    space.publishedFiles = JSON.parse(JSON.stringify(space.draftFiles));
    space.status = 'published';
    space.publishedAt = now;
    space.updatedAt = now;
    space.hasUnpublishedChanges = false;

    saveDb(db);

    res.json({
      message: `Deployed to ${externalHost.providerLabel} (${externalHost.liveUrl})`,
      externalHost,
      space: {
        ...formatSpaceSummary(space, user),
        draftFiles: space.draftFiles,
        publishedFiles: space.publishedFiles,
        agentHistory: space.agentHistory || []
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'External hosting deployment failed.' });
  }
}

app.post('/api/spaces/:username/:slug/deploy-external', handleExternalDeploy);
app.post('/api/spaces/:username/:slug/publish', handleExternalDeploy);

// --- EXTERNAL CODING AGENT REST API (/api/agent/v1/...) ---

app.post('/api/agent/v1/spaces', (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  if (!user) {
    return res.status(401).json({ error: 'Valid Agent API Key (Bearer sh_pat_...) required.' });
  }
  try {
    const newSpace = createSpaceRecord(db, user, req.body);
    res.status(201).json({
      message: 'Space created in Draft staging mode. Push files or inspect preview before deploying to external host.',
      space: formatSpaceSummary(newSpace, user),
      stagingPreviewUrl: `/spaces/${newSpace.ownerUsername}/${newSpace.slug}/live?mode=draft`,
      draftFiles: newSpace.draftFiles
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.put('/api/agent/v1/spaces/:username/:slug/files', (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  if (!user) {
    return res.status(401).json({ error: 'Valid Agent API Key (Bearer sh_pat_...) required.' });
  }

  const { username, slug } = req.params;
  const space = db.spaces.find(
    (s) => s.ownerUsername === username.toLowerCase() && s.slug === slug.toLowerCase()
  );
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  if (space.ownerId !== user.id) {
    return res.status(403).json({ error: 'Unauthorized to modify this Space.' });
  }

  const { files, summary = 'Files pushed via External Coding Agent API', visibility } = req.body || {};
  if (!files || typeof files !== 'object') {
    return res.status(400).json({ error: 'Provide a "files" object (e.g. {"index.html": "...", "style.css": "...", "script.js": "..."}).' });
  }

  if (visibility === 'public' || visibility === 'private') {
    space.visibility = visibility;
  }

  const now = new Date().toISOString();
  space.draftFiles = {
    ...space.draftFiles,
    ...files,
    'README.md': generateReadme({
      title: space.title,
      emoji: space.emoji,
      colorFrom: space.colorFrom,
      colorTo: space.colorTo,
      visibility: space.visibility,
      externalHostProvider: space.externalHost?.provider,
      description: space.description
    })
  };
  space.hasUnpublishedChanges = true;
  space.updatedAt = now;
  space.agentHistory = space.agentHistory || [];
  space.agentHistory.unshift({
    id: 'agt_' + crypto.randomBytes(4).toString('hex'),
    prompt: summary,
    provider: 'external_agent_api',
    model: 'REST API',
    summary,
    createdAt: now
  });

  saveDb(db);

  res.json({
    message: 'Staging draftFiles updated. Check the website in the Workspace before deploying to external host.',
    space: formatSpaceSummary(space, user),
    stagingPreviewUrl: `/spaces/${space.ownerUsername}/${space.slug}/live?mode=draft`
  });
});

app.post('/api/agent/v1/spaces/:username/:slug/publish', handleExternalDeploy);
app.post('/api/agent/v1/spaces/:username/:slug/deploy-external', handleExternalDeploy);

// Like / Unlike a Space
app.post('/api/spaces/:username/:slug/like', (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  if (!user) return res.status(401).json({ error: 'Sign in to like Spaces.' });

  const { username, slug } = req.params;
  const space = db.spaces.find(
    (s) => s.ownerUsername === username.toLowerCase() && s.slug === slug.toLowerCase()
  );
  if (!space || !canViewSpace(space, user)) {
    return res.status(404).json({ error: 'Space not found.' });
  }

  space.likedBy = space.likedBy || [];
  const idx = space.likedBy.indexOf(user.id);
  if (idx > -1) {
    space.likedBy.splice(idx, 1);
  } else {
    space.likedBy.push(user.id);
  }
  space.likes = space.likedBy.length;
  saveDb(db);

  res.json({ likes: space.likes, likedByMe: space.likedBy.includes(user.id) });
});

// Delete a Space
app.delete('/api/spaces/:username/:slug', (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const { username, slug } = req.params;
  const idx = db.spaces.findIndex(
    (s) => s.ownerUsername === username.toLowerCase() && s.slug === slug.toLowerCase()
  );
  if (idx === -1) return res.status(404).json({ error: 'Space not found.' });
  if (db.spaces[idx].ownerId !== user.id) {
    return res.status(403).json({ error: 'Only the owner can delete this Space.' });
  }

  db.spaces.splice(idx, 1);
  saveDb(db);
  res.json({ ok: true });
});

// --- STAGING SANDBOX PREVIEW RUNNER (/spaces/:username/:slug/live) ---
// Used inside the platform to check how the website/app looks before deploying to an external hosting service!
function buildBundledHtml(files) {
  let html = files['index.html'] || '<!DOCTYPE html><html><body><h1>Empty Space</h1></body></html>';
  const css = files['style.css'] || '';
  const js = files['script.js'] || '';

  if (css) {
    if (html.includes('href="style.css"') || html.includes("href='style.css'")) {
      html = html.replace(/<link[^>]*href=["']style\.css["'][^>]*>/i, `<style>\n${css}\n</style>`);
    } else if (html.includes('</head>')) {
      html = html.replace('</head>', `<style>\n${css}\n</style>\n</head>`);
    } else {
      html = `<style>\n${css}\n</style>\n` + html;
    }
  }

  if (js) {
    if (html.includes('src="script.js"') || html.includes("src='script.js'")) {
      html = html.replace(/<script[^>]*src=["']script\.js["'][^>]*><\/script>/i, `<script>\n${js}\n</script>`);
    } else if (html.includes('</body>')) {
      html = html.replace('</body>', `<script>\n${js}\n</script>\n</body>`);
    } else {
      html = html + `\n<script>\n${js}\n</script>`;
    }
  }

  return html;
}

app.get(['/live/:slug', '/s/:slug', '/spaces/:username/:slug/live'], (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  const { username, slug } = req.params;
  const mode = req.query.mode === 'draft' ? 'draft' : 'published';

  const space = username
    ? db.spaces.find(
        (s) => s.ownerUsername === username.toLowerCase() && s.slug === slug.toLowerCase()
      )
    : db.spaces.find((s) => s.slug === slug.toLowerCase());

  const isOwner = Boolean(user && space && space.ownerId === user.id);

  if (!space || (space.visibility === 'private' && !isOwner) || (space.status === 'draft' && !isOwner)) {
    res.status(404).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>404 — Private or Unstaged Space</title>
  <style>
    body { background: #0b0f19; color: #f8fafc; font-family: system-ui, sans-serif; display: grid; place-items: center; height: 100vh; margin: 0; text-align: center; }
    .box { max-width: 440px; padding: 2.5rem; background: #111827; border: 1px solid #1f2937; border-radius: 1rem; }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h1 { font-size: 1.4rem; margin: 0 0 0.75rem; }
    p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem; }
    a { color: #818cf8; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">🔒</div>
    <h1>Private or Unlaunched Space</h1>
    <p>This Space either does not exist, hasn't been deployed yet, or has been set to <strong>Private</strong> by its owner.</p>
    <a href="/">← Back to SpaceHub</a>
  </div>
</body>
</html>`);
    return;
  }

  const targetFiles = (mode === 'draft' && isOwner)
    ? space.draftFiles
    : (space.publishedFiles || space.draftFiles);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(buildBundledHtml(targetFiles));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`SpaceHub server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
