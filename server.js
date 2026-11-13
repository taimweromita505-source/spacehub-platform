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
app.use(express.urlencoded({ extended: true }));

// Custom Domain Edge Routing Middleware (serves Space when Host or X-Custom-Host matches space.customDomain)
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path !== '/') return next();
  const rawHost = req.headers['x-custom-host'] || req.hostname || '';
  const cleanHost = normalizeCustomDomain(rawHost);
  const isPlatform =
    !cleanHost ||
    cleanHost === 'spacehub.win' ||
    cleanHost === 'www.spacehub.win' ||
    cleanHost === 'localhost' ||
    cleanHost === '127.0.0.1';
  if (isPlatform) return next();

  const db = loadDb();
  const space = [...db.spaces]
    .reverse()
    .find((s) => s.customDomain && s.customDomain.toLowerCase() === cleanHost);
  if (space && space.visibility === 'public') {
    space.views = (space.views || 0) + 1;
    saveDb(db);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(buildBundledHtml(space.publishedFiles || space.draftFiles, space));
  }
  return next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Edge API rate limiting on Space write endpoints (X-RateLimit-* headers)
app.use(['/live', '/s'], (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const slugSeg = String(req.path.split('/')[1] || '').toLowerCase();
  const rl = checkRateLimit(`${slugSeg}:${req.ip}`);
  res.setHeader('X-RateLimit-Limit', String(rl.limit));
  res.setHeader('X-RateLimit-Remaining', String(rl.remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(rl.resetAt / 1000)));
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))));
    return res.status(429).json({ error: 'Rate limit exceeded. Please retry shortly.' });
  }
  next();
});

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

function normalizeCollaborators(input) {
  if (!input) return [];
  const rawList = Array.isArray(input) ? input : String(input).split(/[,\r\n]+/);
  return Array.from(
    new Set(
      rawList
        .map((item) => String(item).trim().toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9_-]/g, ''))
        .filter((u) => u.length >= 2 && u.length <= 32)
    )
  ).slice(0, 20);
}

function canEditSpace(space, user) {
  if (!user || !space) return false;
  if (space.ownerId === user.id) return true;
  const collabs = Array.isArray(space.collaborators) ? space.collaborators : [];
  return Boolean(user.username && collabs.includes(user.username.toLowerCase()));
}

function canViewSpace(space, user) {
  if (space.visibility === 'public' && space.status === 'published') return true;
  return canEditSpace(space, user);
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

async function executeSpaceCron(space, overrideUrl = '') {
  const now = new Date().toISOString();
  space.cronLastRunAt = now;
  if (Array.isArray(space.roomEvents) && space.roomEvents.length > 50) {
    space.roomEvents = space.roomEvents.slice(-50);
  }
  const hookUrl = String(overrideUrl || space.cronWebhookUrl || '').trim();
  if (!hookUrl) {
    space.cronLastStatus = 'ok_internal_maintenance';
    return space.cronLastStatus;
  }
  if (hookUrl.startsWith('mock://')) {
    space.cronLastStatus = `ok_mock:${hookUrl}`;
    return space.cronLastStatus;
  }
  if (!/^https?:\/\//i.test(hookUrl)) {
    space.cronLastStatus = 'ok_internal_maintenance';
    return space.cronLastStatus;
  }
  try {
    const r = await fetch(hookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'space.cron',
        space: space.slug,
        title: space.title,
        schedule: space.cronSchedule || 'manual',
        timestamp: now
      })
    });
    space.cronLastStatus = `http_${r.status}`;
  } catch (err) {
    space.cronLastStatus = `error:${err.message || 'failed'}`;
  }
  return space.cronLastStatus;
}

function searchSpaceContent(space, rawQuery) {
  const q = String(rawQuery || '').trim().toLowerCase();
  if (!q) return [];
  const results = [];
  const store = space.appStorage && typeof space.appStorage === 'object' ? space.appStorage : {};
  Object.entries(store).forEach(([k, v]) => {
    const serialized = typeof v === 'string' ? v : JSON.stringify(v);
    if (k.toLowerCase().includes(q) || serialized.toLowerCase().includes(q)) {
      results.push({
        type: 'storage',
        key: k,
        snippet: serialized.slice(0, 160),
        value: v
      });
    }
  });
  const files = space.publishedFiles || space.draftFiles || {};
  Object.entries(files).forEach(([fname, content]) => {
    if (!fname.endsWith('.html') && !fname.endsWith('.md')) return;
    const plain = String(content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (fname.toLowerCase().includes(q) || plain.toLowerCase().includes(q)) {
      const idx = plain.toLowerCase().indexOf(q);
      const start = Math.max(0, idx - 40);
      results.push({
        type: 'page',
        file: fname,
        url: fname === 'index.html' ? `/live/${space.slug}` : `/live/${space.slug}/${fname}`,
        snippet: plain.slice(start, start + 160)
      });
    }
  });
  const assets = space.assets && typeof space.assets === 'object' ? space.assets : {};
  Object.values(assets).forEach((a) => {
    if (a && a.name && a.name.toLowerCase().includes(q)) {
      results.push({
        type: 'asset',
        name: a.name,
        mimeType: a.mimeType,
        url: `/live/${space.slug}/assets/${encodeURIComponent(a.name)}`
      });
    }
  });
  return results.slice(0, 25);
}

const rateLimitBuckets = new Map();
function checkRateLimit(key, limit = 120, windowMs = 60000) {
  const now = Date.now();
  let bucket = rateLimitBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    rateLimitBuckets.set(key, bucket);
  }
  bucket.count += 1;
  if (rateLimitBuckets.size > 5000) {
    for (const [k, b] of rateLimitBuckets) {
      if (now > b.resetAt) rateLimitBuckets.delete(k);
    }
  }
  return {
    allowed: bucket.count <= limit,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt
  };
}

function pickAbVariant(files, forced, cookieVal) {
  if (!files || files['index.b.html'] === undefined) return 'a';
  if (forced === 'a' || forced === 'b') return forced;
  if (cookieVal === 'a' || cookieVal === 'b') return cookieVal;
  return Math.random() < 0.5 ? 'a' : 'b';
}

function resolveSpaceRedirect(files, slug, fileName) {
  if (!files || files['redirects.json'] === undefined) return null;
  let map;
  try {
    map = JSON.parse(files['redirects.json']);
  } catch (_e) {
    return null;
  }
  if (!map || typeof map !== 'object') return null;
  const rule = map['/' + fileName] !== undefined ? map['/' + fileName] : map[fileName];
  if (rule === undefined || rule === null) return null;
  const isObj = typeof rule === 'object';
  const to = String(isObj ? rule.to : rule || '').trim();
  const status = isObj && Number(rule.status) === 301 ? 301 : 302;
  if (/^https?:\/\//i.test(to)) return { status, location: to };
  if (to.startsWith('/') && !to.startsWith('//')) {
    const hashIdx = to.indexOf('#');
    const hash = hashIdx > -1 ? to.slice(hashIdx) : '';
    const pathPart = (hashIdx > -1 ? to.slice(0, hashIdx) : to) || '/';
    const internal = pathPart === '/' || pathPart === '/index.html' ? '' : pathPart;
    if (internal === '/' + fileName) return null;
    return { status, location: `/live/${slug}${internal}${hash}` };
  }
  return null;
}

function buildSpaceOrder(db, space, payload, orderId, origin) {
  const rawItems = Array.isArray(payload.items) ? payload.items.slice(0, 20) : [];
  const items = rawItems.map((it) => ({
    name: String((it && it.name) || 'Item').trim().slice(0, 80),
    priceUsd: Math.min(10000, Math.max(0, Number(it && it.priceUsd) || 0)),
    qty: Math.min(99, Math.max(1, Math.floor(Number(it && it.qty) || 1)))
  }));
  if (!items.length) return { error: 'At least one item is required.' };
  const amountUsd = Math.round(items.reduce((s, i) => s + i.priceUsd * i.qty, 0) * 100) / 100;
  const secrets = space.secrets && typeof space.secrets === 'object' ? space.secrets : {};
  const owner = (db.users || []).find((u) => u.id === space.ownerId);
  const recipient = String(secrets.PAYPAL_EMAIL || (owner && owner.email) || '').trim();
  let checkoutUrl = null;
  if (recipient && amountUsd > 0) {
    checkoutUrl =
      `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick` +
      `&business=${encodeURIComponent(recipient)}` +
      `&item_name=${encodeURIComponent(`${space.title} Order ${orderId}`)}` +
      `&amount=${amountUsd.toFixed(2)}&currency_code=USD&no_shipping=1` +
      `&custom=${encodeURIComponent(orderId)}` +
      `&return=${encodeURIComponent(`${origin}/live/${space.slug}?order=${orderId}`)}`;
  }
  return {
    order: {
      id: orderId,
      items,
      amountUsd,
      buyerEmail: String(payload.buyerEmail || '').trim().slice(0, 160),
      status: 'pending',
      checkoutUrl,
      createdAt: new Date().toISOString()
    }
  };
}

function generateSpaceFeedItems(space, origin = '') {
  const rawPosts =
    (space.dbTables && Array.isArray(space.dbTables.posts) ? space.dbTables.posts : null) ||
    (space.appStorage && Array.isArray(space.appStorage.posts) ? space.appStorage.posts : null) ||
    [];
  if (rawPosts.length) {
    return rawPosts.slice(0, 25).map((p, idx) => ({
      id: String(p.id || `post_${idx + 1}`),
      title: String(p.title || `Update #${idx + 1}`),
      summary: String(p.summary || p.content || p.text || ''),
      url: String(p.url || `${origin}/live/${space.slug}`),
      date_published: p.createdAt || space.updatedAt || new Date().toISOString()
    }));
  }
  return [
    {
      id: `${space.slug}_launch`,
      title: `${space.title} — Live on SpaceHub`,
      summary: space.description || `Launched ${space.title} on SpaceHub.`,
      url: `${origin}/live/${space.slug}`,
      date_published: space.publishedAt || space.updatedAt || new Date().toISOString()
    }
  ];
}

function formatSpaceSummary(space, user) {
  const isOwner = canEditSpace(space, user);
  const isPrimaryOwner = Boolean(user && space.ownerId === user.id);
  const stagingPreviewUrl = `/spaces/${space.ownerUsername}/${space.slug}/live`;
  const externalLiveUrl = space.externalHost?.liveUrl || null;
  const secretsObj = space.secrets && typeof space.secrets === 'object' ? space.secrets : {};
  const snaps = Array.isArray(space.snapshots) ? space.snapshots : [];
  const collabs = Array.isArray(space.collaborators) ? space.collaborators : [];
  const assetsObj = space.assets && typeof space.assets === 'object' ? space.assets : {};
  const dbTablesObj = space.dbTables && typeof space.dbTables === 'object' ? space.dbTables : {};

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
    maintenanceMode: Boolean(space.maintenanceMode),
    appPlatform: space.appPlatform || 'both',
    appOrientation: space.appOrientation || 'any',
    appIconText: space.appIconText || '',
    appThemeColor: space.appThemeColor || '#09090b',
    customDomain: space.customDomain || '',
    collaborators: collabs,
    dbTableNames: Object.keys(dbTablesObj),
    cronSchedule: isOwner ? (space.cronSchedule || '') : undefined,
    cronWebhookUrl: isOwner ? (space.cronWebhookUrl || '') : undefined,
    cronLastRunAt: isOwner ? (space.cronLastRunAt || null) : undefined,
    cronLastStatus: isOwner ? (space.cronLastStatus || null) : undefined,
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
    abViewsA: space.abViewsA || 0,
    abViewsB: space.abViewsB || 0,
    orderCount: (space.orders || []).length,
    assetCount: Object.keys(assetsObj).length,
    eventCounts: space.eventCounts || {},
    notificationCount: (space.notifications || []).length,
    appUserCount: (space.appUsers || []).length,
    roomEventCount: (space.roomEvents || []).length,
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
    isPrimaryOwner,
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

app.post('/api/auth/social', async (req, res) => {
  const body = req.body || {};
  const provider = ['google', 'github', 'apple'].includes(body.provider) ? body.provider : 'google';
  let email = String(body.email || '').trim().toLowerCase();
  let displayName = String(body.displayName || '').trim();
  let preferredUsername = String(body.username || '').trim().toLowerCase();
  const accessToken = String(body.accessToken || '').trim();
  const idToken = String(body.idToken || '').trim();

  try {
    if (provider === 'google' && idToken) {
      const gRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
      if (!gRes.ok) {
        return res.status(401).json({ error: 'Invalid Google ID token.' });
      }
      const gInfo = await gRes.json();
      email = String(gInfo.email || email).toLowerCase();
      displayName = gInfo.name || displayName;
    }

    if (provider === 'github' && accessToken) {
      const ghRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'SpaceHub-Platform'
        }
      });
      if (!ghRes.ok) {
        return res.status(401).json({ error: 'Invalid GitHub token.' });
      }
      const ghUser = await ghRes.json();
      preferredUsername = String(ghUser.login || preferredUsername).toLowerCase();
      displayName = ghUser.name || ghUser.login || displayName;
      email = String(ghUser.email || email || `${preferredUsername}@users.noreply.github.com`).toLowerCase();
    }
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Social verification failed.' });
  }

  if (!email && !preferredUsername) {
    return res.status(400).json({ error: 'Please enter your Gmail / social email or account handle.' });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (provider === 'google' && /^[a-z0-9._-]+$/i.test(email)) {
      email = `${email}@gmail.com`;
    } else if (provider === 'apple' && /^[a-z0-9._-]+$/i.test(email)) {
      email = `${email}@icloud.com`;
    } else if (provider === 'github' && /^[a-z0-9_-]+$/i.test(email)) {
      preferredUsername = email;
      email = `${email}@users.noreply.github.com`;
    } else {
      return res.status(400).json({ error: 'Please enter a valid email address (e.g. you@gmail.com).' });
    }
  }

  const db = loadDb();
  const baseHandle = slugify(preferredUsername || email.split('@')[0] || provider).slice(0, 20);
  let foundUser = db.users.find(
    (u) => (email && u.email && u.email.toLowerCase() === email) || (u.socialProvider === provider && u.username === baseHandle)
  );

  if (!foundUser) {
    let finalUsername = baseHandle.length >= 3 ? baseHandle : `${baseHandle}_${crypto.randomBytes(2).toString('hex')}`;
    if (db.users.some((u) => u.username === finalUsername)) {
      finalUsername = `${baseHandle.slice(0, 16)}_${crypto.randomBytes(2).toString('hex')}`;
    }
    foundUser = {
      id: 'usr_' + crypto.randomBytes(6).toString('hex'),
      username: finalUsername,
      displayName: displayName || email.split('@')[0] || finalUsername,
      email,
      socialProvider: provider,
      passwordHash: hashPassword(crypto.randomBytes(16).toString('hex')),
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
        id: 'host_' + crypto.randomBytes(6).toString('hex'),
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

  const token = crypto.randomBytes(24).toString('hex');
  db.sessions[token] = foundUser.id;
  saveDb(db);

  res.setHeader('Set-Cookie', `spacehub_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
  res.json({
    token,
    user: {
      id: foundUser.id,
      username: foundUser.username,
      displayName: foundUser.displayName,
      email: foundUser.email || null,
      socialProvider: foundUser.socialProvider || provider
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const cleanUser = String(username || '').trim().toLowerCase();
  const db = loadDb();
  const user = db.users.find(
    (u) => u.username === cleanUser || (u.email && u.email.toLowerCase() === cleanUser)
  );

  if (!user || !verifyPassword(String(password || ''), user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid username/email or password.' });
  }

  const token = crypto.randomBytes(24).toString('hex');
  db.sessions[token] = user.id;
  saveDb(db);

  res.setHeader('Set-Cookie', `spacehub_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email || null,
      socialProvider: user.socialProvider || null
    }
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
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email || null,
      socialProvider: user.socialProvider || null
    }
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
    name: 'Monthly Space Hosting (1 Space)',
    amountUsd: '1.00',
    billingUnit: 'M',
    priceMonthly: 1,
    billingPeriod: '1 month',
    priceLabel: '$1 / month per Space',
    provider: 'cloudflare_pages',
    providerLabel: 'SpaceHub Managed Edge Hosting (1 Space)',
    features: [
      'Host 1 Space website or web app for 1 full month',
      'Clean shareable production URL (/live/your-app)',
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
    providerLabel: 'SpaceHub Managed Edge Hosting (1 Space · 1 Year)',
    features: [
      'Host 1 Space website or web app for 12 months ($1/mo rate)',
      'Dedicated /live/your-app production URL + custom domain option',
      'Global Cloudflare Edge CDN + automatic SSL',
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

// PayPal REST API checkout is only wired on the Cloudflare edge Worker (worker.js).
app.get('/api/paypal/config', (_req, res) => {
  res.json({ configured: false, mode: 'live' });
});

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

  const { planId, customDomain = '', spaceSlug = '' } = req.body || {};
  const plan = HOSTING_PLANS.find((p) => p.id === planId) || HOSTING_PLANS[0];
  const now = new Date().toISOString();
  const targetSpaceSlug = String(spaceSlug || '').trim().toLowerCase();

  const cleanDomain =
    String(customDomain || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/[^a-z0-9.-]/g, '') ||
    (targetSpaceSlug ? `spacehub.win/live/${targetSpaceSlug}` : `${user.username}-space.spacehub.win`);

  const provisionedConn = {
    id: 'host_' + crypto.randomBytes(6).toString('hex'),
    userId: user.id,
    provider: plan.provider,
    providerLabel: `${plan.name} (${plan.priceLabel})`,
    name: targetSpaceSlug
      ? `${plan.name} — Space: ${targetSpaceSlug}`
      : `${plan.name} — 1 Space Slot (${cleanDomain})`,
    targetUrlOrProject: cleanDomain,
    assignedSpaceSlug: targetSpaceSlug || null,
    isSingleSpaceSlot: true,
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
    message: `Purchased ${plan.name} (${plan.priceLabel}) for 1 Space!`,
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
      assignedSpaceSlug: c.assignedSpaceSlug || null,
      isSingleSpaceSlot: Boolean(c.isSingleSpaceSlot),
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
  const validPlatforms = ['both', 'android', 'iphone', 'web_only'];
  const appPlatform = validPlatforms.includes(payload?.appPlatform) ? payload.appPlatform : 'both';
  const validOrientations = ['any', 'portrait', 'landscape'];
  const appOrientation = validOrientations.includes(payload?.appOrientation) ? payload.appOrientation : 'any';
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

  const isOwner = canEditSpace(space, user);
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
    'manifest.webmanifest': JSON.stringify(generateSpaceManifest(space, ''), null, 2),
    'icon.svg': generateSpaceIconSvg(space.title),
    'sw.js': generateSpaceServiceWorker(space.slug),
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

function pushSpaceSnapshot(space, label = 'Previous version') {
  if (!space.draftFiles) return;
  space.snapshots = Array.isArray(space.snapshots) ? space.snapshots : [];
  space.snapshots.unshift({
    id: 'snap_' + crypto.randomBytes(4).toString('hex'),
    label,
    files: JSON.parse(JSON.stringify(space.draftFiles)),
    createdAt: new Date().toISOString()
  });
  if (space.snapshots.length > 10) {
    space.snapshots = space.snapshots.slice(0, 10);
  }
}

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
  if (!canEditSpace(space, user)) {
    return res.status(403).json({ error: 'Only the Space owner or collaborators can modify this project.' });
  }

  const {
    title,
    description,
    emoji,
    visibility,
    appPlatform,
    appOrientation,
    appIconText,
    appThemeColor,
    previewPasscode,
    customDomain,
    submissionWebhookUrl,
    collaborators,
    cronSchedule,
    cronWebhookUrl,
    maintenanceMode,
    secrets,
    appStorage,
    colorFrom,
    colorTo,
    draftFiles
  } = req.body || {};

  if (typeof title === 'string' && title.trim()) space.title = title.trim();
  if (typeof description === 'string') space.description = description.trim();
  if (typeof emoji === 'string' && emoji.trim()) space.emoji = emoji.trim();
  if (colorFrom) space.colorFrom = colorFrom;
  if (colorTo) space.colorTo = colorTo;
  if (visibility === 'public' || visibility === 'private') {
    space.visibility = visibility;
  }
  if (['both', 'android', 'iphone', 'web_only'].includes(appPlatform)) {
    space.appPlatform = appPlatform;
  }
  if (['any', 'portrait', 'landscape'].includes(appOrientation)) {
    space.appOrientation = appOrientation;
  }
  if (typeof appIconText === 'string') {
    space.appIconText = appIconText.trim().slice(0, 2);
  }
  if (typeof appThemeColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(appThemeColor.trim())) {
    space.appThemeColor = appThemeColor.trim();
  }
  if (typeof previewPasscode === 'string') {
    space.previewPasscode = previewPasscode.trim().slice(0, 32);
  }
  if (customDomain !== undefined) {
    space.customDomain = normalizeCustomDomain(customDomain);
  }
  if (submissionWebhookUrl !== undefined) {
    space.submissionWebhookUrl = String(submissionWebhookUrl || '').trim().slice(0, 300);
  }
  if (collaborators !== undefined && space.ownerId === user.id) {
    space.collaborators = normalizeCollaborators(collaborators);
  }
  if (cronSchedule !== undefined) {
    space.cronSchedule = ['hourly', 'daily', 'weekly', ''].includes(cronSchedule) ? cronSchedule : '';
  }
  if (cronWebhookUrl !== undefined) {
    space.cronWebhookUrl = String(cronWebhookUrl || '').trim().slice(0, 300);
  }
  if (maintenanceMode !== undefined) {
    space.maintenanceMode = Boolean(maintenanceMode);
  }
  if (secrets !== undefined) {
    space.secrets = normalizeSpaceSecrets(secrets);
  }
  if (appStorage !== undefined && typeof appStorage === 'object') {
    space.appStorage = appStorage;
  }

  if (draftFiles && typeof draftFiles === 'object') {
    pushSpaceSnapshot(space, 'Before manual save');
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
  if (!canEditSpace(space, user)) {
    return res.status(403).json({ error: 'Only the Space owner or collaborators can run a coding agent on this Space.' });
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
    pushSpaceSnapshot(space, `Before AI build: ${String(prompt).trim().slice(0, 40)}`);
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
      if (
        savedConn.isSingleSpaceSlot &&
        savedConn.assignedSpaceSlug &&
        savedConn.assignedSpaceSlug !== space.slug
      ) {
        return res.status(402).json({
          error: `This hosting plan is already assigned to Space "${savedConn.assignedSpaceSlug}". Hosting is $1/month or $12/year per Space — please purchase a plan for "${space.slug}".`
        });
      }
      if (savedConn.isSingleSpaceSlot && !savedConn.assignedSpaceSlug) {
        savedConn.assignedSpaceSlug = space.slug;
        savedConn.name = `${savedConn.providerLabel.split(' (')[0]} — Space: ${space.slug}`;
      }
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

// Full Space State Backup & 1-Click Restore
app.get('/api/spaces/:username/:slug/backup', (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  const { username, slug } = req.params;
  const space = db.spaces.find(
    (s) => s.ownerUsername === username.toLowerCase() && s.slug === slug.toLowerCase()
  );
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  if (!canEditSpace(space, user)) {
    return res.status(403).json({ error: 'Only the owner or collaborators can export a full backup.' });
  }
  res.json({
    ok: true,
    backupVersion: '1.0',
    exportedAt: new Date().toISOString(),
    space: {
      slug: space.slug,
      title: space.title,
      description: space.description,
      visibility: space.visibility,
      appPlatform: space.appPlatform || 'both',
      appOrientation: space.appOrientation || 'any',
      appIconText: space.appIconText || '',
      appThemeColor: space.appThemeColor || '#09090b',
      draftFiles: space.draftFiles || {},
      publishedFiles: space.publishedFiles || null,
      appStorage: space.appStorage || {},
      dbTables: space.dbTables || {},
      assets: space.assets || {},
      submissions: space.submissions || [],
      featureFlags: space.featureFlags || {}
    }
  });
});

app.post('/api/spaces/:username/:slug/restore', (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  const { username, slug } = req.params;
  const space = db.spaces.find(
    (s) => s.ownerUsername === username.toLowerCase() && s.slug === slug.toLowerCase()
  );
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  if (!canEditSpace(space, user)) {
    return res.status(403).json({ error: 'Only the owner or collaborators can restore a backup.' });
  }
  const body = req.body || {};
  const src = body.backup?.space || body.space || body;
  pushSpaceSnapshot(space, 'Before backup restore');
  if (src.title) space.title = String(src.title).trim();
  if (src.description !== undefined) space.description = String(src.description).trim();
  if (src.draftFiles && typeof src.draftFiles === 'object') {
    space.draftFiles = { ...src.draftFiles };
  }
  if (src.appStorage && typeof src.appStorage === 'object') {
    space.appStorage = { ...src.appStorage };
  }
  if (src.dbTables && typeof src.dbTables === 'object') {
    space.dbTables = { ...src.dbTables };
  }
  if (src.assets && typeof src.assets === 'object') {
    space.assets = { ...src.assets };
  }
  if (Array.isArray(src.submissions)) {
    space.submissions = src.submissions.slice(0, 200);
  }
  if (src.featureFlags && typeof src.featureFlags === 'object') {
    space.featureFlags = { ...src.featureFlags };
  }
  space.hasUnpublishedChanges = true;
  space.updatedAt = new Date().toISOString();
  saveDb(db);
  res.json({
    ok: true,
    message: 'Restored Space state from backup!',
    space: {
      ...formatSpaceSummary(space, user),
      draftFiles: space.draftFiles,
      publishedFiles: space.publishedFiles,
      agentHistory: space.agentHistory || []
    }
  });
});

// Run Scheduled Cron / Automation Task
app.post('/api/spaces/:username/:slug/cron', async (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const { username, slug } = req.params;
  const space = db.spaces.find(
    (s) => s.ownerUsername === username.toLowerCase() && s.slug === slug.toLowerCase()
  );
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  if (!canEditSpace(space, user)) {
    return res.status(403).json({ error: 'Only the owner or collaborators can trigger cron tasks.' });
  }

  const status = await executeSpaceCron(space, req.body?.webhookUrl || '');
  saveDb(db);
  res.json({
    ok: true,
    cronLastRunAt: space.cronLastRunAt,
    cronLastStatus: status,
    space: formatSpaceSummary(space, user)
  });
});

// Save Named Checkpoint Snapshot
app.post('/api/spaces/:username/:slug/snapshot', (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const { username, slug } = req.params;
  const space = db.spaces.find(
    (s) => s.ownerUsername === username.toLowerCase() && s.slug === slug.toLowerCase()
  );
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  if (!canEditSpace(space, user)) {
    return res.status(403).json({ error: 'Only the owner or collaborators can save a checkpoint.' });
  }

  const label = String(req.body?.label || 'Manual checkpoint').trim().slice(0, 60);
  pushSpaceSnapshot(space, label);
  saveDb(db);

  res.status(201).json({
    message: `Saved checkpoint: "${label}"`,
    space: {
      ...formatSpaceSummary(space, user),
      draftFiles: space.draftFiles,
      publishedFiles: space.publishedFiles,
      agentHistory: space.agentHistory || []
    }
  });
});

// Rollback Space to Previous Snapshot
app.post('/api/spaces/:username/:slug/rollback', (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const { username, slug } = req.params;
  const space = db.spaces.find(
    (s) => s.ownerUsername === username.toLowerCase() && s.slug === slug.toLowerCase()
  );
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  if (!canEditSpace(space, user)) {
    return res.status(403).json({ error: 'Only the owner or collaborators can rollback this Space.' });
  }

  const snaps = space.snapshots || [];
  if (!snaps.length) {
    return res.status(400).json({ error: 'No previous snapshot available to restore.' });
  }
  let snap;
  if (req.body?.snapshotId) {
    const idx = snaps.findIndex((s) => s.id === req.body.snapshotId);
    snap = idx > -1 ? snaps.splice(idx, 1)[0] : snaps.shift();
  } else {
    snap = snaps.shift();
  }

  space.draftFiles = JSON.parse(JSON.stringify(snap.files));
  space.hasUnpublishedChanges = true;
  space.updatedAt = new Date().toISOString();
  saveDb(db);

  res.json({
    message: `Restored previous version (${snap.label})`,
    space: {
      ...formatSpaceSummary(space, user),
      draftFiles: space.draftFiles,
      publishedFiles: space.publishedFiles,
      snapshots: space.snapshots || [],
      agentHistory: space.agentHistory || []
    }
  });
});

// Fork / Clone a Space into User's Private Staging Workspace
app.post('/api/spaces/:username/:slug/fork', (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  if (!user) return res.status(401).json({ error: 'Please sign in to clone this Space.' });

  const { username, slug } = req.params;
  const space = db.spaces.find(
    (s) => s.ownerUsername === username.toLowerCase() && s.slug === slug.toLowerCase()
  );
  if (!space || !canViewSpace(space, user)) {
    return res.status(404).json({ error: 'Space not found or is set to Private.' });
  }

  let forkSlug = slugify(`${space.slug}-fork`);
  if (db.spaces.some((s) => s.ownerId === user.id && s.slug === forkSlug)) {
    forkSlug = slugify(`${space.slug}-fork-${crypto.randomBytes(2).toString('hex')}`);
  }

  const now = new Date().toISOString();
  const sourceFiles = space.publishedFiles || space.draftFiles || {};
  const forkedSpace = {
    id: 'spc_' + crypto.randomBytes(6).toString('hex'),
    ownerId: user.id,
    ownerUsername: user.username,
    slug: forkSlug,
    title: `${space.title} (Fork)`,
    description: space.description || `Cloned from @${space.ownerUsername}/${space.slug}`,
    emoji: space.emoji || '🚀',
    colorFrom: space.colorFrom || 'indigo',
    colorTo: space.colorTo || 'purple',
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

  db.spaces.push(forkedSpace);
  saveDb(db);

  res.status(201).json({
    message: `Cloned to @${user.username}/${forkSlug} in Private Staging!`,
    space: {
      ...formatSpaceSummary(forkedSpace, user),
      draftFiles: forkedSpace.draftFiles,
      publishedFiles: null,
      agentHistory: []
    }
  });
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

function buildSpaceConfig(space, files = {}) {
  let fileCfg = {};
  if (files && files['config.json']) {
    try {
      fileCfg = JSON.parse(files['config.json']);
    } catch (_e) {
      fileCfg = {};
    }
  }
  return {
    slug: space?.slug || '',
    title: space?.title || '',
    flags: {
      ...(fileCfg.flags && typeof fileCfg.flags === 'object' ? fileCfg.flags : {}),
      ...(space?.featureFlags && typeof space.featureFlags === 'object' ? space.featureFlags : {})
    },
    ...fileCfg
  };
}

function buildBundledHtml(files, space = null) {
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
    const spaceConfigScript = `\n  <script>window.SPACE_CONFIG = ${JSON.stringify(buildSpaceConfig(space, files))};</script>`;
    const ogMeta = (!html.includes('property="og:title"')
      ? `\n  <meta property="og:type" content="website" />\n  <meta property="og:title" content="${safeTitle}" />\n  <meta property="og:description" content="${safeDesc}" />\n  <meta property="og:image" content="/live/${space.slug}/icon.svg" />\n  <meta name="twitter:card" content="summary" />\n  <meta name="twitter:title" content="${safeTitle}" />\n  <meta name="twitter:description" content="${safeDesc}" />`
      : '') + spaceConfigScript;
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

  return html;
}

// Per-Space Cloud JSON Storage API (GET/POST/PUT/DELETE /live/:slug/storage)
app.get(['/live/:slug/storage', '/s/:slug/storage'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  const store = space.appStorage && typeof space.appStorage === 'object' ? space.appStorage : {};
  const key = req.query.key;
  res.json({ ok: true, data: key ? store[key] ?? null : store });
});

app.post(['/live/:slug/storage', '/s/:slug/storage'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  space.appStorage = space.appStorage && typeof space.appStorage === 'object' ? space.appStorage : {};
  if (req.body && typeof req.body === 'object') {
    const nextState = { ...space.appStorage, ...req.body };
    if (JSON.stringify(nextState).length > 102400) {
      return res.status(413).json({ error: 'Space storage limit (100 KB) exceeded.' });
    }
    space.appStorage = nextState;
    saveDb(db);
  }
  res.json({ ok: true, data: space.appStorage });
});

app.delete(['/live/:slug/storage', '/s/:slug/storage'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  space.appStorage = space.appStorage && typeof space.appStorage === 'object' ? space.appStorage : {};
  if (req.query.key) delete space.appStorage[req.query.key];
  else space.appStorage = {};
  saveDb(db);
  res.json({ ok: true, data: space.appStorage });
});

// Per-Space Server-Side API Proxy & Secrets Vault (POST /live/:slug/proxy)
app.post(['/live/:slug/proxy', '/s/:slug/proxy'], async (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });

  const payload = req.body || {};
  const rawUrl = String(payload.url || '').trim();
  if (!/^https?:\/\/|^mock:\/\//i.test(rawUrl)) {
    return res.status(400).json({ error: 'Proxy target URL must start with https:// or http://' });
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
    return res.json({
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
    return res.json({
      ok: upstreamRes.ok,
      status: upstreamRes.status,
      data: parsed
    });
  } catch (err) {
    return res.status(502).json({ error: err.message || 'Upstream proxy request failed.' });
  }
});

// Per-Space Built-in User Authentication API (/live/:slug/auth and /live/:slug/auth/me)
app.get(['/live/:slug/auth/me', '/s/:slug/auth/me'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  const appUsers = Array.isArray(space.appUsers) ? space.appUsers : [];
  const appSessions = space.appSessions && typeof space.appSessions === 'object' ? space.appSessions : {};
  const authHdr = req.headers.authorization || '';
  const tok = authHdr.startsWith('Bearer ')
    ? authHdr.slice(7).trim()
    : String(req.query.token || '').trim();
  const uid = tok ? appSessions[tok] : null;
  const appUser = uid ? appUsers.find((u) => u.id === uid) : null;
  if (!appUser) return res.status(401).json({ ok: false, user: null });
  res.json({
    ok: true,
    user: { id: appUser.id, email: appUser.email, name: appUser.name, createdAt: appUser.createdAt }
  });
});

app.post(['/live/:slug/auth', '/s/:slug/auth'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  space.appUsers = Array.isArray(space.appUsers) ? space.appUsers : [];
  space.appSessions = space.appSessions && typeof space.appSessions === 'object' ? space.appSessions : {};

  const payload = req.body || {};
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');
  const name = String(payload.name || email.split('@')[0] || 'Member').trim().slice(0, 80);
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  let appUser = space.appUsers.find((u) => u.email === email);
  if (!appUser && payload.action !== 'login') {
    appUser = {
      id: 'au_' + crypto.randomBytes(4).toString('hex'),
      email,
      name,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString()
    };
    space.appUsers.push(appUser);
  } else if (!appUser) {
    return res.status(404).json({ error: 'Account not found.' });
  } else if (!verifyPassword(password, appUser.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const tok = 'sat_' + crypto.randomBytes(16).toString('hex');
  space.appSessions[tok] = appUser.id;
  saveDb(db);
  res.json({
    ok: true,
    token: tok,
    user: { id: appUser.id, email: appUser.email, name: appUser.name, createdAt: appUser.createdAt }
  });
});

// Per-Space Built-in AI Assistant API (POST /live/:slug/ai)
app.post(['/live/:slug/ai', '/s/:slug/ai'], async (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });

  const payload = req.body || {};
  const prompt = String(payload.prompt || '').trim();
  const system = String(payload.system || `You are the helpful AI assistant for ${space.title}.`).trim();
  if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

  const secrets = space.secrets && typeof space.secrets === 'object' ? space.secrets : {};
  const openAiKey = secrets.OPENAI_API_KEY || '';
  if (openAiKey && !openAiKey.startsWith('mock_')) {
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`
        },
        body: JSON.stringify({
          model: payload.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt }
          ]
        })
      });
      if (r.ok) {
        const d = await r.json();
        return res.json({
          ok: true,
          provider: 'openai',
          reply: d.choices?.[0]?.message?.content || ''
        });
      }
    } catch (_e) {
      // fallback to built-in response
    }
  }

  return res.json({
    ok: true,
    provider: 'spacehub_builtin_ai',
    reply: `[${space.title} AI]: Processed your request "${prompt.slice(0, 140)}". Everything is active and ready.`
  });
});

// Per-Space Real-Time Multiplayer & Live Chat Room API (GET/POST/DELETE /live/:slug/room)
app.get(['/live/:slug/room', '/s/:slug/room'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  res.json({ ok: true, events: Array.isArray(space.roomEvents) ? space.roomEvents : [] });
});

app.post(['/live/:slug/room', '/s/:slug/room'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  space.roomEvents = Array.isArray(space.roomEvents) ? space.roomEvents : [];

  const payload = req.body || {};
  const evt = {
    id: 'evt_' + crypto.randomBytes(4).toString('hex'),
    sender: String(payload.sender || 'Anon').trim().slice(0, 60),
    type: String(payload.type || 'message').trim().slice(0, 40),
    text: String(payload.text || '').trim().slice(0, 500),
    payload: payload.payload && typeof payload.payload === 'object' ? payload.payload : {},
    createdAt: new Date().toISOString()
  };
  space.roomEvents.push(evt);
  if (space.roomEvents.length > 100) {
    space.roomEvents = space.roomEvents.slice(-100);
  }
  saveDb(db);
  res.status(201).json({ ok: true, event: evt, events: space.roomEvents });
});

app.delete(['/live/:slug/room', '/s/:slug/room'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  space.roomEvents = [];
  saveDb(db);
  res.json({ ok: true, events: [] });
});

// Form & Waitlist Submissions API for Space Owners & Public Live Forms
app.post(['/live/:slug/submit', '/s/:slug/submit'], async (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });

  const fields = req.body || {};
  const entry = {
    id: 'sub_' + crypto.randomBytes(4).toString('hex'),
    name: String(fields.name || '').trim().slice(0, 120),
    email: String(fields.email || '').trim().slice(0, 160),
    message: String(fields.message || fields.note || '').trim().slice(0, 1000),
    fields,
    createdAt: new Date().toISOString()
  };

  space.submissions = Array.isArray(space.submissions) ? space.submissions : [];
  space.submissions.unshift(entry);
  if (space.submissions.length > 200) space.submissions = space.submissions.slice(0, 200);
  await notifySubmissionWebhook(space, entry);
  saveDb(db);

  const accept = String(req.headers.accept || '').toLowerCase();
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (accept.includes('application/json') || contentType.includes('application/json')) {
    return res.status(201).json({
      ok: true,
      message: 'Submission saved to SpaceHub Inbox.',
      submission: entry
    });
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(
    `<!DOCTYPE html><html><body style="background:#09090b;color:#fafafa;font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center;padding:2rem;border:1px solid #27272a;border-radius:0.75rem;background:#18181b;max-width:420px"><h1 style="font-size:1.25rem;margin-bottom:0.5rem">✓ Submission Received</h1><p style="color:#a1a1aa;font-size:0.9rem;margin-bottom:1.25rem">Your response has been saved to ${String(space.title).replace(/[<>&]/g, '')}.</p><a href="/live/${encodeURIComponent(space.slug)}" style="color:#818cf8;text-decoration:none;font-weight:600">← Return to ${String(space.title).replace(/[<>&]/g, '')}</a></div></body></html>`
  );
});

app.get('/api/spaces/:username/:slug/submissions', (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  const { username, slug } = req.params;
  const space = db.spaces.find(
    (s) => s.ownerUsername === username.toLowerCase() && s.slug === slug.toLowerCase()
  );
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  if (!canEditSpace(space, user)) {
    return res.status(403).json({ error: 'Only the Space owner or collaborators can view submissions.' });
  }
  res.json({ submissions: space.submissions || [] });
});

app.post('/api/spaces/:username/:slug/submissions', (req, res) => {
  const db = loadDb();
  const { username, slug } = req.params;
  const space = db.spaces.find(
    (s) => s.ownerUsername === username.toLowerCase() && s.slug === slug.toLowerCase()
  );
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  const fields = req.body || {};
  const entry = {
    id: 'sub_' + crypto.randomBytes(4).toString('hex'),
    name: String(fields.name || '').trim().slice(0, 120),
    email: String(fields.email || '').trim().slice(0, 160),
    message: String(fields.message || fields.note || '').trim().slice(0, 1000),
    fields,
    createdAt: new Date().toISOString()
  };
  space.submissions = Array.isArray(space.submissions) ? space.submissions : [];
  space.submissions.unshift(entry);
  if (space.submissions.length > 200) space.submissions = space.submissions.slice(0, 200);
  saveDb(db);
  res.status(201).json({ ok: true, submission: entry, submissionCount: space.submissions.length });
});

app.delete('/api/spaces/:username/:slug/submissions', (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  const { username, slug } = req.params;
  const space = db.spaces.find(
    (s) => s.ownerUsername === username.toLowerCase() && s.slug === slug.toLowerCase()
  );
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  if (!canEditSpace(space, user)) {
    return res.status(403).json({ error: 'Only the Space owner or collaborators can clear submissions.' });
  }
  const subId = req.query.id;
  if (subId) {
    space.submissions = (space.submissions || []).filter((s) => s.id !== subId);
  } else {
    space.submissions = [];
  }
  saveDb(db);
  res.json({ ok: true, submissions: space.submissions });
});

app.get(['/live/:slug/manifest.webmanifest', '/s/:slug/manifest.webmanifest'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found' });
  space.installs = (space.installs || 0) + 1;
  saveDb(db);
  const origin = `${req.protocol}://${req.get('host')}`;
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.send(JSON.stringify(generateSpaceManifest(space, origin), null, 2));
});

app.get(['/live/:slug/icon.svg', '/s/:slug/icon.svg'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).send('Not found');
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.send(generateSpaceIconSvg(space));
});

app.get(['/live/:slug/sw.js', '/s/:slug/sw.js'], (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.send(generateSpaceServiceWorker(req.params.slug.toLowerCase()));
});

// Built-in Media & Asset Hosting API (/live/:slug/assets and /live/:slug/assets/:name)
app.get(['/live/:slug/assets/:name', '/s/:slug/assets/:name'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  const assets = space.assets && typeof space.assets === 'object' ? space.assets : {};
  const asset = assets[req.params.name];
  if (!asset) return res.status(404).json({ error: 'Asset not found.' });

  const dataUrl = String(asset.dataUrl || '');
  const b64Match = dataUrl.match(/^data:([^;]+);base64,(.+)$/i);
  if (b64Match) {
    const mime = asset.mimeType || b64Match[1] || 'application/octet-stream';
    const buf = Buffer.from(b64Match[2], 'base64');
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buf);
  }
  res.setHeader('Content-Type', asset.mimeType || 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.send(String(asset.content ?? asset.dataUrl ?? ''));
});

app.get(['/live/:slug/assets', '/s/:slug/assets'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  const assets = space.assets && typeof space.assets === 'object' ? space.assets : {};
  const list = Object.values(assets).map((a) => ({
    name: a.name,
    mimeType: a.mimeType,
    size: a.size || 0,
    url: `/live/${space.slug}/assets/${encodeURIComponent(a.name)}`,
    createdAt: a.createdAt
  }));
  res.json({ ok: true, assets: list });
});

app.post(['/live/:slug/assets', '/s/:slug/assets'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  space.assets = space.assets && typeof space.assets === 'object' ? space.assets : {};

  const payload = req.body || {};
  const cleanName = String(payload.name || `asset_${crypto.randomBytes(3).toString('hex')}.txt`)
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 64);
  const dataUrl = String(payload.dataUrl || '');
  const content = payload.content !== undefined ? String(payload.content) : '';
  const rawLen = (dataUrl || content).length;
  if (rawLen > 204800) {
    return res.status(413).json({ error: 'Single asset size limit (200 KB) exceeded.' });
  }
  const ext = cleanName.split('.').pop().toLowerCase();
  const extMime = {
    svg: 'image/svg+xml; charset=utf-8',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    json: 'application/json; charset=utf-8',
    txt: 'text/plain; charset=utf-8'
  }[ext];
  const mimeType = String(payload.mimeType || extMime || 'application/octet-stream');
  const assetRecord = {
    name: cleanName,
    mimeType,
    dataUrl: dataUrl || undefined,
    content: !dataUrl ? content : undefined,
    size: rawLen,
    createdAt: new Date().toISOString()
  };
  space.assets[cleanName] = assetRecord;
  saveDb(db);
  res.status(201).json({
    ok: true,
    asset: {
      name: cleanName,
      mimeType,
      size: rawLen,
      url: `/live/${space.slug}/assets/${encodeURIComponent(cleanName)}`,
      createdAt: assetRecord.createdAt
    }
  });
});

app.delete(['/live/:slug/assets', '/s/:slug/assets', '/live/:slug/assets/:name', '/s/:slug/assets/:name'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  space.assets = space.assets && typeof space.assets === 'object' ? space.assets : {};
  const target = req.params.name || req.query.name;
  if (target) delete space.assets[target];
  else space.assets = {};
  saveDb(db);
  res.json({ ok: true, assetCount: Object.keys(space.assets).length });
});

// Built-in Full-Text Search API (GET /live/:slug/search?q=...)
app.get(['/live/:slug/search', '/s/:slug/search'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  const q = String(req.query.q || '');
  const results = searchSpaceContent(space, q);
  res.json({ ok: true, query: q, count: results.length, results });
});

// Automatic SEO sitemap.xml, robots.txt & /live/:slug/health
app.get(['/live/:slug/health', '/s/:slug/health'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  res.json({
    ok: true,
    slug: space.slug,
    title: space.title,
    status: space.status,
    visibility: space.visibility,
    updatedAt: space.updatedAt,
    publishedAt: space.publishedAt,
    views: space.views || 0,
    assetCount: Object.keys(space.assets || {}).length
  });
});

app.get(['/live/:slug/robots.txt', '/s/:slug/robots.txt'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).send('Not found');
  const origin = `${req.protocol}://${req.get('host')}`;
  const disallow = space.visibility === 'private' || Boolean(space.previewPasscode);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(`User-agent: *\n${disallow ? 'Disallow: /' : 'Allow: /'}\nSitemap: ${origin}/live/${space.slug}/sitemap.xml\n`);
});

app.get(['/live/:slug/sitemap.xml', '/s/:slug/sitemap.xml'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).send('Not found');
  const origin = `${req.protocol}://${req.get('host')}`;
  const files = space.publishedFiles || space.draftFiles || {};
  const htmlPages = Object.keys(files).filter(
    (f) => f.endsWith('.html') && f.toLowerCase() !== '404.html'
  );
  if (!htmlPages.includes('index.html')) htmlPages.unshift('index.html');
  const lastMod = (space.publishedAt || space.updatedAt || new Date().toISOString()).split('T')[0];
  const urlEntries = htmlPages
    .map((page) => {
      const loc =
        page === 'index.html'
          ? `${origin}/live/${space.slug}`
          : `${origin}/live/${space.slug}/${encodeURIComponent(page)}`;
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastMod}</lastmod>\n  </url>`;
    })
    .join('\n');
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`);
});

// Wave 7: Runtime Feature Flags & Public App Config (/live/:slug/config.json)
app.get(['/live/:slug/config.json', '/s/:slug/config.json'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  const files = space.publishedFiles || space.draftFiles || {};
  res.json({ ok: true, config: buildSpaceConfig(space, files) });
});

app.post(['/live/:slug/config.json', '/s/:slug/config.json'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  const payload = req.body || {};
  space.featureFlags = {
    ...(space.featureFlags && typeof space.featureFlags === 'object' ? space.featureFlags : {}),
    ...(payload.flags && typeof payload.flags === 'object' ? payload.flags : payload)
  };
  saveDb(db);
  const files = space.publishedFiles || space.draftFiles || {};
  res.json({ ok: true, config: buildSpaceConfig(space, files) });
});

// Wave 7: Serverless Edge Functions (/live/:slug/fn)
app.all(['/live/:slug/fn', '/s/:slug/fn'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  const files = space.publishedFiles || space.draftFiles || {};
  const payload = req.body || {};
  const action = String(req.query.action || payload.action || 'ping').trim();
  space.appStorage = space.appStorage && typeof space.appStorage === 'object' ? space.appStorage : {};
  if (payload.setStorage && typeof payload.setStorage === 'object') {
    space.appStorage = { ...space.appStorage, ...payload.setStorage };
    saveDb(db);
  }
  let customRouteOutput = null;
  if (files['routes.json']) {
    try {
      const parsedRoutes = JSON.parse(files['routes.json']);
      if (parsedRoutes && parsedRoutes[action] !== undefined) {
        customRouteOutput = parsedRoutes[action];
      }
    } catch (_e) {
      // ignore
    }
  }
  res.json({
    ok: true,
    space: space.slug,
    action,
    hasCustomApiJs: Boolean(files['api.js']),
    result: customRouteOutput ?? {
      message: `Edge function "${action}" executed on ${space.title}`,
      echo: payload
    },
    storage: space.appStorage,
    timestamp: new Date().toISOString()
  });
});

// Wave 7: Custom Event & Funnel Analytics API (/live/:slug/events)
app.get(['/live/:slug/events', '/s/:slug/events'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  res.json({
    ok: true,
    counts: space.eventCounts || {},
    events: space.eventLog || []
  });
});

app.post(['/live/:slug/events', '/s/:slug/events'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  space.eventCounts = space.eventCounts && typeof space.eventCounts === 'object' ? space.eventCounts : {};
  space.eventLog = Array.isArray(space.eventLog) ? space.eventLog : [];
  const payload = req.body || {};
  const eventName = String(payload.event || payload.name || 'app_event')
    .trim()
    .slice(0, 64);
  space.eventCounts[eventName] = (space.eventCounts[eventName] || 0) + 1;
  const record = {
    id: 'ev_' + crypto.randomBytes(4).toString('hex'),
    event: eventName,
    props: payload.props && typeof payload.props === 'object' ? payload.props : {},
    createdAt: new Date().toISOString()
  };
  space.eventLog.unshift(record);
  if (space.eventLog.length > 100) space.eventLog = space.eventLog.slice(0, 100);
  saveDb(db);
  res.status(201).json({
    ok: true,
    event: eventName,
    count: space.eventCounts[eventName],
    counts: space.eventCounts,
    record
  });
});

app.delete(['/live/:slug/events', '/s/:slug/events'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  space.eventCounts = {};
  space.eventLog = [];
  saveDb(db);
  res.json({ ok: true, counts: {}, events: [] });
});

// Wave 7: Transactional Email & Notification Dispatch API (/live/:slug/notify)
app.get(['/live/:slug/notify', '/s/:slug/notify'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  res.json({ ok: true, notifications: space.notifications || [] });
});

app.post(['/live/:slug/notify', '/s/:slug/notify'], async (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  space.notifications = Array.isArray(space.notifications) ? space.notifications : [];
  const payload = req.body || {};
  const to = String(payload.to || 'owner@spacehub.win').trim().slice(0, 160);
  const subject = String(payload.subject || `Alert from ${space.title}`).trim().slice(0, 160);
  const message = String(payload.message || payload.text || '').trim().slice(0, 1000);
  if (!message && !payload.subject) {
    return res.status(400).json({ error: 'Notification subject or message is required.' });
  }
  let status = 'queued_outbox';
  const secrets = space.secrets && typeof space.secrets === 'object' ? space.secrets : {};
  if (secrets.RESEND_API_KEY && !secrets.RESEND_API_KEY.startsWith('mock_')) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secrets.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: 'SpaceHub <onboarding@resend.dev>',
          to: [to],
          subject,
          text: message
        })
      });
      status = r.ok ? 'sent_resend' : `resend_http_${r.status}`;
    } catch (_e) {
      status = 'queued_outbox';
    }
  }
  const notifRecord = {
    id: 'ntf_' + crypto.randomBytes(5).toString('hex'),
    to,
    subject,
    message,
    status,
    createdAt: new Date().toISOString()
  };
  space.notifications.unshift(notifRecord);
  if (space.notifications.length > 100) space.notifications = space.notifications.slice(0, 100);
  saveDb(db);
  res.status(201).json({ ok: true, notification: notifRecord, count: space.notifications.length });
});

// Wave 9: Built-in E-Commerce & Order Checkout API (/live/:slug/orders)
app.post(['/live/:slug/orders', '/s/:slug/orders'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  space.orders = Array.isArray(space.orders) ? space.orders : [];
  const origin = `${req.protocol}://${req.get('host')}`;
  const built = buildSpaceOrder(db, space, req.body || {}, 'ord_' + crypto.randomBytes(5).toString('hex'), origin);
  if (built.error) return res.status(400).json({ error: built.error });
  space.orders.unshift(built.order);
  if (space.orders.length > 200) space.orders = space.orders.slice(0, 200);
  saveDb(db);
  res.status(201).json({ ok: true, order: built.order });
});

app.get(['/live/:slug/orders', '/s/:slug/orders'], (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  const orders = Array.isArray(space.orders) ? space.orders : [];
  const orderId = req.query.id;
  if (orderId) {
    const found = orders.find((o) => o.id === orderId);
    if (!found) return res.status(404).json({ error: 'Order not found.' });
    return res.json({
      ok: true,
      order: {
        id: found.id,
        status: found.status,
        amountUsd: found.amountUsd,
        items: found.items,
        checkoutUrl: found.checkoutUrl,
        createdAt: found.createdAt
      }
    });
  }
  if (!canEditSpace(space, user)) {
    return res.status(403).json({ error: 'Only the Space owner or collaborators can list orders.' });
  }
  res.json({ ok: true, orders });
});

app.patch(['/live/:slug/orders', '/s/:slug/orders'], (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  if (!canEditSpace(space, user)) {
    return res.status(403).json({ error: 'Only the Space owner or collaborators can update orders.' });
  }
  const payload = req.body || {};
  const targetId = String(req.query.id || payload.id || '');
  const found = (space.orders || []).find((o) => o.id === targetId);
  if (!found) return res.status(404).json({ error: 'Order not found.' });
  if (['pending', 'paid', 'fulfilled', 'cancelled'].includes(payload.status)) {
    found.status = payload.status;
  }
  found.updatedAt = new Date().toISOString();
  saveDb(db);
  res.json({ ok: true, order: found });
});

// Wave 8: Structured Table DB API (/live/:slug/db/:table) & RSS/JSON Feeds (/rss.xml, /feed.json)
app.get(['/live/:slug/db/:table', '/s/:slug/db/:table'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  const tableName = req.params.table.toLowerCase();
  const rows = (space.dbTables && Array.isArray(space.dbTables[tableName])) ? space.dbTables[tableName] : [];
  res.setHeader('Access-Control-Allow-Origin', '*');

  const rowId = req.query.id;
  if (rowId) {
    const found = rows.find((r) => String(r.id) === String(rowId)) || null;
    return res.json({ ok: true, table: tableName, row: found });
  }
  let filtered = [...rows];
  const where = String(req.query.where || '');
  if (where.includes(':')) {
    const [fk, fv] = where.split(':');
    filtered = filtered.filter((r) => String(r[fk] ?? '').toLowerCase() === String(fv).toLowerCase());
  }
  const sort = String(req.query.sort || '');
  if (sort) {
    const [sk, sdir] = sort.split(':');
    const mult = String(sdir).toLowerCase() === 'desc' ? -1 : 1;
    filtered.sort((a, b) => (a[sk] > b[sk] ? mult : a[sk] < b[sk] ? -mult : 0));
  }
  res.json({ ok: true, table: tableName, count: filtered.length, rows: filtered });
});

app.post(['/live/:slug/db/:table', '/s/:slug/db/:table'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  const tableName = req.params.table.toLowerCase();
  space.dbTables = space.dbTables && typeof space.dbTables === 'object' ? space.dbTables : {};
  space.dbTables[tableName] = Array.isArray(space.dbTables[tableName]) ? space.dbTables[tableName] : [];

  const payload = req.body || {};
  const now = new Date().toISOString();
  const newRow = {
    ...payload,
    id: String(payload.id || `row_${crypto.randomBytes(4).toString('hex')}`),
    createdAt: payload.createdAt || now,
    updatedAt: now
  };
  space.dbTables[tableName].push(newRow);
  if (space.dbTables[tableName].length > 500) {
    space.dbTables[tableName] = space.dbTables[tableName].slice(-500);
  }
  saveDb(db);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(201).json({
    ok: true,
    table: tableName,
    row: newRow,
    count: space.dbTables[tableName].length
  });
});

app.patch(['/live/:slug/db/:table', '/s/:slug/db/:table'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  const tableName = req.params.table.toLowerCase();
  const rows = (space.dbTables && Array.isArray(space.dbTables[tableName])) ? space.dbTables[tableName] : [];
  const payload = req.body || {};
  const targetId = String(req.query.id || payload.id || '');
  const idx = rows.findIndex((r) => String(r.id) === targetId);
  if (idx === -1) return res.status(404).json({ error: 'Row not found.' });
  rows[idx] = { ...rows[idx], ...payload, id: rows[idx].id, updatedAt: new Date().toISOString() };
  saveDb(db);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ ok: true, table: tableName, row: rows[idx] });
});

app.delete(['/live/:slug/db/:table', '/s/:slug/db/:table'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  const tableName = req.params.table.toLowerCase();
  space.dbTables = space.dbTables && typeof space.dbTables === 'object' ? space.dbTables : {};
  const rows = Array.isArray(space.dbTables[tableName]) ? space.dbTables[tableName] : [];
  const targetId = req.query.id;
  if (targetId) {
    space.dbTables[tableName] = rows.filter((r) => String(r.id) !== String(targetId));
  } else {
    space.dbTables[tableName] = [];
  }
  saveDb(db);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ ok: true, table: tableName, count: space.dbTables[tableName].length });
});

app.get(['/live/:slug/feed.json', '/s/:slug/feed.json'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  const origin = `${req.protocol}://${req.get('host')}`;
  const items = generateSpaceFeedItems(space, origin);
  res.json({
    version: 'https://jsonfeed.org/version/1.1',
    title: space.title,
    home_page_url: `${origin}/live/${space.slug}`,
    feed_url: `${origin}/live/${space.slug}/feed.json`,
    description: space.description,
    items: items.map((it) => ({
      id: it.id,
      title: it.title,
      content_text: it.summary,
      url: it.url,
      date_published: it.date_published
    }))
  });
});

app.get(['/live/:slug/rss.xml', '/s/:slug/rss.xml'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).send('Not found');
  const origin = `${req.protocol}://${req.get('host')}`;
  const items = generateSpaceFeedItems(space, origin);
  const rssItems = items
    .map(
      (it) =>
        `    <item>\n      <guid isPermaLink="false">${it.id.replace(/[<>&]/g, '')}</guid>\n      <title>${it.title.replace(/[<>&]/g, '')}</title>\n      <link>${it.url}</link>\n      <description>${it.summary.replace(/[<>&]/g, '')}</description>\n      <pubDate>${new Date(it.date_published).toUTCString()}</pubDate>\n    </item>`
    )
    .join('\n');
  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>${String(space.title).replace(/[<>&]/g, '')}</title>\n    <link>${origin}/live/${space.slug}</link>\n    <description>${String(space.description || space.title).replace(/[<>&]/g, '')}</description>\n${rssItems}\n  </channel>\n</rss>`);
});

app.get(['/live/:slug', '/s/:slug', '/spaces/:username/:slug/live'], (req, res) => {
  const db = loadDb();
  const user = getCurrentUser(req, db);
  const { username, slug } = req.params;
  const mode = req.query.mode === 'draft' ? 'draft' : 'published';

  const space = username
    ? db.spaces.find(
        (s) => s.ownerUsername === username.toLowerCase() && s.slug === slug.toLowerCase()
      )
    : [...db.spaces].reverse().find((s) => s.slug === slug.toLowerCase());

  const isOwner = canEditSpace(space, user);
  const keyParam = String(req.query.key || '').trim();
  const hasValidPasscode = Boolean(space && space.previewPasscode && keyParam === space.previewPasscode);
  const canAccess = isOwner || hasValidPasscode;

  if (!space || (space.visibility === 'private' && !canAccess) || (space.status === 'draft' && !canAccess)) {
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

  if (space.maintenanceMode && !canAccess && mode !== 'draft') {
    res.status(503).send(`<!DOCTYPE html><html><body style="background:#09090b;color:#fafafa;font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center;padding:2rem;border:1px solid #27272a;border-radius:0.75rem;background:#18181b;max-width:420px"><h1 style="font-size:1.25rem;margin-bottom:0.5rem">503 — Under Scheduled Maintenance</h1><p style="color:#a1a1aa;font-size:0.9rem;margin-bottom:1.25rem">${String(space.title).replace(/[<>&]/g, '')} is currently undergoing scheduled maintenance. Please check back shortly.</p></div></body></html>`);
    return;
  }

  const baseFiles = (mode === 'draft' && canAccess)
    ? space.draftFiles
    : (space.publishedFiles || space.draftFiles);
  const hasAb = Boolean(baseFiles && baseFiles['index.b.html'] !== undefined);
  const forcedVariant = String(req.query.variant || '').toLowerCase();
  const cookieVariant = parseCookies(req)[`sh_ab_${space.slug}`] || '';
  const variant = mode === 'draft'
    ? (hasAb && forcedVariant === 'b' ? 'b' : 'a')
    : pickAbVariant(baseFiles, forcedVariant, cookieVariant);

  if (mode !== 'draft') {
    space.views = (space.views || 0) + 1;
    if (hasAb) {
      if (variant === 'b') space.abViewsB = (space.abViewsB || 0) + 1;
      else space.abViewsA = (space.abViewsA || 0) + 1;
    }
    saveDb(db);
  }

  const targetFiles = hasAb && variant === 'b'
    ? { ...baseFiles, 'index.html': baseFiles['index.b.html'] }
    : baseFiles;

  if (hasAb && mode !== 'draft') {
    res.setHeader('Set-Cookie', `sh_ab_${space.slug}=${variant}; Path=/; Max-Age=2592000; SameSite=Lax`);
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(buildBundledHtml(targetFiles, space));
});

app.get(['/live/:slug/:filename', '/s/:slug/:filename'], (req, res) => {
  const db = loadDb();
  const space = [...db.spaces].reverse().find((s) => s.slug === req.params.slug.toLowerCase());
  if (!space) return res.status(404).send('Not found');
  const files = space.publishedFiles || space.draftFiles || {};
  const fileName = req.params.filename;
  const redirectRule = resolveSpaceRedirect(files, space.slug, fileName);
  if (redirectRule) {
    return res.redirect(redirectRule.status, redirectRule.location);
  }
  if (files[fileName] !== undefined) {
    const ext = fileName.split('.').pop().toLowerCase();
    const mimeMap = {
      html: 'text/html; charset=utf-8',
      css: 'text/css; charset=utf-8',
      js: 'application/javascript; charset=utf-8',
      json: 'application/json; charset=utf-8',
      svg: 'image/svg+xml; charset=utf-8',
      txt: 'text/plain; charset=utf-8',
      md: 'text/markdown; charset=utf-8'
    };
    res.setHeader('Content-Type', mimeMap[ext] || 'text/plain; charset=utf-8');
    return res.send(String(files[fileName]));
  }
  if (files['404.html'] !== undefined) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(404).send(buildBundledHtml({ ...files, 'index.html': files['404.html'] }, space));
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(buildBundledHtml(files, space));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`SpaceHub server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
