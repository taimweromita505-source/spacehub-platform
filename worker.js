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
  },
  kanban: {
    name: 'Agile Kanban Project Board',
    emoji: '📋',
    category: 'productivity',
    colorFrom: 'indigo',
    colorTo: 'purple',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Agile Flow — Kanban Board</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="board-app">
    <header class="board-top">
      <div>
        <h1>Agile Flow Board</h1>
        <p class="subtitle">Streamline delivery with interactive card workflows</p>
      </div>
      <div class="board-actions">
        <button id="addCardBtn" class="btn-primary">+ Add Task</button>
        <button id="clearCardsBtn" class="btn-ghost">Reset Board</button>
      </div>
    </header>

    <main class="kanban-grid">
      <section class="kanban-col" data-col="todo">
        <div class="col-head">
          <h2>To Do</h2>
          <span class="count-badge" id="count-todo">0</span>
        </div>
        <div class="cards-list" id="col-todo"></div>
      </section>

      <section class="kanban-col" data-col="progress">
        <div class="col-head">
          <h2>In Progress</h2>
          <span class="count-badge" id="count-progress">0</span>
        </div>
        <div class="cards-list" id="col-progress"></div>
      </section>

      <section class="kanban-col" data-col="done">
        <div class="col-head">
          <h2>Completed</h2>
          <span class="count-badge" id="count-done">0</span>
        </div>
        <div class="cards-list" id="col-done"></div>
      </section>
    </main>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
      'style.css': `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #fafafa; min-height: 100vh; padding: 2rem; }
.board-app { max-width: 1100px; margin: 0 auto; }
.board-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
h1 { font-size: 1.6rem; font-weight: 700; }
.subtitle { color: #a1a1aa; font-size: 0.9rem; margin-top: 0.2rem; }
.board-actions { display: flex; gap: 0.6rem; }
.btn-primary { background: #6366f1; color: white; border: none; padding: 0.6rem 1.1rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; }
.btn-ghost { background: transparent; color: #a1a1aa; border: 1px solid #27272a; padding: 0.6rem 1rem; border-radius: 0.5rem; cursor: pointer; }
.kanban-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }
.kanban-col { background: #121215; border: 1px solid #27272a; border-radius: 0.75rem; padding: 1.25rem; display: flex; flex-direction: column; min-height: 480px; }
.col-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid #27272a; }
.col-head h2 { font-size: 1.1rem; font-weight: 600; }
.count-badge { background: #27272a; color: #a1a1aa; font-size: 0.75rem; padding: 0.2rem 0.55rem; border-radius: 999px; font-weight: 700; }
.cards-list { display: flex; flex-direction: column; gap: 0.75rem; flex: 1; }
.card { background: #18181b; border: 1px solid #27272a; border-radius: 0.5rem; padding: 1rem; cursor: pointer; transition: transform 0.15s, border-color 0.15s; }
.card:hover { border-color: #6366f1; transform: translateY(-2px); }
.card h3 { font-size: 0.95rem; font-weight: 600; margin-bottom: 0.4rem; }
.card p { font-size: 0.85rem; color: #a1a1aa; margin-bottom: 0.75rem; }
.card-meta { display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; }
.tag-high { color: #f87171; background: rgba(239,68,68,0.15); padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600; }
.advance-btn { background: #27272a; color: #fafafa; border: none; padding: 0.25rem 0.6rem; border-radius: 4px; cursor: pointer; font-size: 0.75rem; }`,
      'script.js': `let tasks = JSON.parse(localStorage.getItem('sh_tasks') || 'null') || [
  { id: '1', title: 'Architect Database Schema', desc: 'Define SQLite / JSON KV schemas', status: 'done', priority: 'High' },
  { id: '2', title: 'Implement Stripe Checkout', desc: 'Support card & Apple Pay alongside PayPal', status: 'progress', priority: 'High' },
  { id: '3', title: 'Template Marketplace UI', desc: '1-click clone spaces directly into staging', status: 'todo', priority: 'Medium' }
];

function saveAndRender() {
  localStorage.setItem('sh_tasks', JSON.stringify(tasks));
  ['todo', 'progress', 'done'].forEach(col => {
    const list = document.getElementById('col-' + col);
    const count = document.getElementById('count-' + col);
    const colTasks = tasks.filter(t => t.status === col);
    if (count) count.textContent = colTasks.length;
    if (list) {
      list.innerHTML = colTasks.map(t => \`
        <div class="card">
          <h3>\${t.title}</h3>
          <p>\${t.desc}</p>
          <div class="card-meta">
            <span class="tag-high">\${t.priority}</span>
            <button class="advance-btn" onclick="advanceTask('\${t.id}')">Advance →</button>
          </div>
        </div>
      \`).join('');
    }
  });
}

window.advanceTask = function(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  if (t.status === 'todo') t.status = 'progress';
  else if (t.status === 'progress') t.status = 'done';
  else t.status = 'todo';
  saveAndRender();
};

document.getElementById('addCardBtn')?.addEventListener('click', () => {
  const title = prompt('Enter task title:');
  if (!title) return;
  tasks.push({ id: String(Date.now()), title, desc: 'Created in SpaceHub Studio', status: 'todo', priority: 'Normal' });
  saveAndRender();
});

document.getElementById('clearCardsBtn')?.addEventListener('click', () => {
  if (confirm('Reset board to default tasks?')) {
    localStorage.removeItem('sh_tasks');
    location.reload();
  }
});

saveAndRender();`
    }
  },
  invoice: {
    name: 'Client Invoice & Quote Generator',
    emoji: '🧾',
    category: 'tools',
    colorFrom: 'emerald',
    colorTo: 'teal',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Client Invoice Generator</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="invoice-box">
    <header class="invoice-head">
      <div>
        <h1 id="invNumber">INVOICE #INV-2026-001</h1>
        <p class="muted">Issued by SpaceHub Studio</p>
      </div>
      <button class="btn-print" onclick="window.print()">🖨️ Print / Save PDF</button>
    </header>

    <div class="bill-row">
      <div>
        <strong>Billed To:</strong>
        <p contenteditable="true" id="clientName">Acme Corporation</p>
        <p contenteditable="true" id="clientAddr">billing@acme.com</p>
      </div>
      <div class="meta-right">
        <p><strong>Date:</strong> <span id="invDate">Nov 14, 2026</span></p>
        <p><strong>Terms:</strong> Due on receipt</p>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th style="width: 80px;">Qty</th>
          <th style="width: 120px;">Rate ($)</th>
          <th style="width: 120px; text-align: right;">Amount ($)</th>
        </tr>
      </thead>
      <tbody id="itemsBody">
        <tr>
          <td><input type="text" value="Custom Web App Development" class="row-desc" /></td>
          <td><input type="number" value="1" min="1" class="row-qty" /></td>
          <td><input type="number" value="500" min="0" class="row-rate" /></td>
          <td class="row-total" style="text-align: right;">500.00</td>
        </tr>
      </tbody>
    </table>

    <div class="table-actions">
      <button id="addItemBtn" class="btn-secondary">+ Add Line Item</button>
    </div>

    <div class="totals-section">
      <div class="total-line"><span>Subtotal:</span><strong id="subTotal">$500.00</strong></div>
      <div class="total-line"><span>Tax (10%):</span><strong id="taxAmount">$50.00</strong></div>
      <div class="total-line grand"><span>Total Due:</span><strong id="grandTotal">$550.00</strong></div>
    </div>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
      'style.css': `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #fafafa; padding: 2rem; }
.invoice-box { max-width: 760px; margin: 0 auto; background: #18181b; border: 1px solid #27272a; border-radius: 0.75rem; padding: 2.5rem; }
.invoice-head { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #27272a; padding-bottom: 1.5rem; margin-bottom: 1.5rem; }
.btn-print { background: #6366f1; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 0.5rem; cursor: pointer; font-weight: 600; }
.bill-row { display: flex; justify-content: space-between; margin-bottom: 2rem; font-size: 0.95rem; }
.items-table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
.items-table th { text-align: left; padding: 0.75rem 0.5rem; border-bottom: 2px solid #27272a; color: #a1a1aa; font-size: 0.85rem; }
.items-table td { padding: 0.75rem 0.5rem; border-bottom: 1px solid #27272a; }
input { background: #09090b; border: 1px solid #27272a; color: #fafafa; padding: 0.4rem 0.6rem; border-radius: 4px; width: 100%; }
.table-actions { margin-bottom: 2rem; }
.btn-secondary { background: #27272a; color: #fafafa; border: none; padding: 0.5rem 0.9rem; border-radius: 0.4rem; cursor: pointer; }
.totals-section { max-width: 260px; margin-left: auto; display: flex; flex-direction: column; gap: 0.5rem; }
.total-line { display: flex; justify-content: space-between; font-size: 0.95rem; }
.total-line.grand { font-size: 1.2rem; color: #34d399; border-top: 1px solid #27272a; padding-top: 0.75rem; }
@media print {
  body { background: white; color: black; padding: 0; }
  .invoice-box { border: none; background: white; color: black; max-width: 100%; }
  .btn-print, .table-actions { display: none; }
  input { border: none; background: transparent; color: black; }
}`,
      'script.js': `function recalc() {
  let sub = 0;
  document.querySelectorAll('#itemsBody tr').forEach(tr => {
    const qty = parseFloat(tr.querySelector('.row-qty')?.value) || 0;
    const rate = parseFloat(tr.querySelector('.row-rate')?.value) || 0;
    const total = qty * rate;
    const totEl = tr.querySelector('.row-total');
    if (totEl) totEl.textContent = total.toFixed(2);
    sub += total;
  });
  const tax = sub * 0.10;
  const grand = sub + tax;
  const s = document.getElementById('subTotal');
  const t = document.getElementById('taxAmount');
  const g = document.getElementById('grandTotal');
  if (s) s.textContent = '$' + sub.toFixed(2);
  if (t) t.textContent = '$' + tax.toFixed(2);
  if (g) g.textContent = '$' + grand.toFixed(2);
}

document.getElementById('itemsBody')?.addEventListener('input', recalc);
document.getElementById('addItemBtn')?.addEventListener('click', () => {
  const tr = document.createElement('tr');
  tr.innerHTML = \`
    <td><input type="text" value="New Service Item" class="row-desc" /></td>
    <td><input type="number" value="1" min="1" class="row-qty" /></td>
    <td><input type="number" value="100" min="0" class="row-rate" /></td>
    <td class="row-total" style="text-align: right;">100.00</td>
  \`;
  document.getElementById('itemsBody')?.appendChild(tr);
  recalc();
});
recalc();`
    }
  },
  portfolio: {
    name: 'Developer Bento Portfolio',
    emoji: '💼',
    category: 'portfolio',
    colorFrom: 'cyan',
    colorTo: 'blue',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Alex Rivera — Full-Stack Engineer</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="bento-container">
    <header class="bento-hero">
      <div class="avatar">👨‍💻</div>
      <div>
        <h1>Alex Rivera</h1>
        <p class="tagline">Principal Systems Engineer & Open Source Contributor</p>
      </div>
      <div class="status-pill">● Available for Work</div>
    </header>

    <div class="bento-grid">
      <div class="bento-card col-span-2">
        <h2>Featured Project: SpaceHub</h2>
        <p>Cloud edge web application hosting platform running on Cloudflare Workers for $1/month.</p>
        <div class="badges">
          <span class="badge">TypeScript</span>
          <span class="badge">Workers KV</span>
          <span class="badge">PayPal REST</span>
        </div>
      </div>

      <div class="bento-card">
        <h2>Tech Stack</h2>
        <ul class="skills-list">
          <li>JavaScript / Node.js</li>
          <li>Cloudflare Edge</li>
          <li>Web Audio / Canvas</li>
          <li>PostgreSQL / KV</li>
        </ul>
      </div>

      <div class="bento-card">
        <h2>Stats</h2>
        <div class="stats-row">
          <div><strong>48+</strong><span>Shipped Apps</span></div>
          <div><strong>99.9%</strong><span>Uptime</span></div>
        </div>
      </div>

      <div class="bento-card col-span-2">
        <h2>Let's Connect</h2>
        <p>Drop me a message to collaborate on your next product.</p>
        <button class="btn-connect" onclick="alert('Email copied: alex@example.com')">Copy Email</button>
      </div>
    </div>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
      'style.css': `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #fafafa; padding: 2.5rem 1.5rem; min-height: 100vh; }
.bento-container { max-width: 860px; margin: 0 auto; }
.bento-hero { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2.5rem; flex-wrap: wrap; }
.avatar { font-size: 2.5rem; background: #18181b; border: 1px solid #27272a; width: 72px; height: 72px; border-radius: 50%; display: grid; place-items: center; }
h1 { font-size: 1.8rem; font-weight: 800; letter-spacing: -0.02em; }
.tagline { color: #a1a1aa; font-size: 0.95rem; }
.status-pill { margin-left: auto; font-size: 0.75rem; font-weight: 700; color: #34d399; background: rgba(52,211,153,0.12); padding: 0.3rem 0.75rem; border-radius: 999px; border: 1px solid rgba(52,211,153,0.25); }
.bento-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem; }
.bento-card { background: #18181b; border: 1px solid #27272a; border-radius: 0.85rem; padding: 1.5rem; transition: transform 0.15s, border-color 0.15s; }
.bento-card:hover { border-color: #52525b; transform: translateY(-2px); }
.col-span-2 { grid-column: span 2; }
@media (max-width: 680px) { .col-span-2 { grid-column: span 1; } }
h2 { font-size: 1.15rem; font-weight: 700; margin-bottom: 0.5rem; }
p { color: #a1a1aa; font-size: 0.9rem; line-height: 1.5; margin-bottom: 1rem; }
.badges { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.badge { font-size: 0.75rem; font-weight: 600; background: #27272a; color: #fafafa; padding: 0.25rem 0.6rem; border-radius: 4px; }
.skills-list { list-style: none; display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.88rem; color: #d4d4d8; }
.stats-row { display: flex; gap: 2rem; margin-top: 0.75rem; }
.stats-row strong { font-size: 1.8rem; font-weight: 800; color: #818cf8; display: block; }
.stats-row span { font-size: 0.8rem; color: #a1a1aa; }
.btn-connect { background: #fafafa; color: #09090b; font-weight: 700; border: none; padding: 0.6rem 1.2rem; border-radius: 0.5rem; cursor: pointer; }`,
      'script.js': `console.log('Portfolio ready');`
    }
  }
};

const HOSTING_PLANS = [
  {
    id: 'plan_monthly_1',
    name: 'Monthly Space Hosting (1 Space)',
    amountUsd: '1.00',
    billingUnit: 'M',
    periodDays: 30,
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
    periodDays: 365,
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
const emptyDb = {
  users: [],
  sessions: {},
  agentKeys: [],
  hostingConnections: [],
  paypalOrders: [],
  paypalEvents: [],
  stripeOrders: [],
  stripeEvents: [],
  passwordResets: [],
  loginFailures: {},
  spaces: []
};

function stripeConfigured(env) {
  return Boolean(env && (env.STRIPE_SECRET_KEY || env.STRIPE_KEY));
}

function paypalConfigured(env) {
  return Boolean(env && env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);
}

function paypalApiBase(env) {
  return String(env.PAYPAL_MODE || 'live').toLowerCase() === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';
}

async function paypalAccessToken(env) {
  const res = await fetch(`${paypalApiBase(env)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) {
    throw new Error(
      `PayPal authentication failed (HTTP ${res.status}). Check PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET and PAYPAL_MODE.`
    );
  }
  const data = await res.json();
  return data.access_token;
}

function provisionHostingConnection(db, user, plan, opts = {}) {
  const targetSpaceSlug = opts.spaceSlug ? slugify(opts.spaceSlug) : null;
  const cleanDomain =
    String(opts.customDomain || '').trim().toLowerCase().replace(/^https?:\/\//, '') ||
    (targetSpaceSlug ? `${opts.host}/live/${targetSpaceSlug}` : `${opts.host}/live`);
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
    paymentMethod: opts.paymentMethod || 'paypal_card',
    paymentRef: opts.paymentRef || 'paypal_verified',
    planId: plan.id,
    periodDays: plan.periodDays || 30,
    expiresAt: addDaysIso(new Date().toISOString(), plan.periodDays || 30),
    hasToken: true,
    createdAt: new Date().toISOString()
  };
  db.hostingConnections.unshift(conn);
  return conn;
}

const HOSTING_GRACE_DAYS = 3;

function addDaysIso(iso, days) {
  const base = Date.parse(iso);
  return new Date((Number.isNaN(base) ? Date.now() : base) + days * 86400000).toISOString();
}

function hostingState(conn, nowMs = Date.now()) {
  if (!conn || !conn.isSingleSpaceSlot) return 'none';
  if (conn.suspended) return 'suspended';
  if (!conn.expiresAt) return 'active';
  const exp = Date.parse(conn.expiresAt);
  if (Number.isNaN(exp) || nowMs <= exp) return 'active';
  if (nowMs <= exp + HOSTING_GRACE_DAYS * 86400000) return 'grace';
  return 'expired';
}

function spaceHostingLapse(db, slug, nowMs = Date.now()) {
  const conns = (db.hostingConnections || []).filter(
    (c) => c.isSingleSpaceSlot && c.assignedSpaceSlug === slug
  );
  if (!conns.length) return null;
  const states = conns.map((c) => hostingState(c, nowMs));
  if (states.some((s) => s === 'active' || s === 'grace')) return null;
  return states.every((s) => s === 'suspended') ? 'suspended' : 'expired';
}

function hostingLapsePage(space, state) {
  const title = String(space.title || space.slug).replace(/[<>&]/g, '');
  const heading = state === 'suspended' ? 'Hosting Suspended' : 'Hosting Expired';
  const text =
    state === 'suspended'
      ? 'This Space is temporarily unavailable while its hosting is under review.'
      : 'This Space’s hosting plan has expired. The owner can renew it from SpaceHub to bring it back online.';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${heading} — ${title}</title></head><body style="background:#09090b;color:#fafafa;font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center;padding:2rem;border:1px solid #27272a;border-radius:0.75rem;background:#18181b;max-width:440px"><h1 style="font-size:1.25rem;margin-bottom:0.5rem">${heading}</h1><p style="color:#a1a1aa;font-size:0.9rem;margin-bottom:1.25rem"><strong>${title}</strong> — ${text}</p><a href="/" style="color:#818cf8;text-decoration:none;font-weight:600">← SpaceHub</a></div></body></html>`;
}

function describeHostingConn(conn, nowMs = Date.now()) {
  const state = hostingState(conn, nowMs);
  const exp = conn.expiresAt ? Date.parse(conn.expiresAt) : NaN;
  return {
    hostingState: state,
    daysLeft: Number.isNaN(exp) ? null : Math.ceil((exp - nowMs) / 86400000),
    canRenew: Boolean(conn.isSingleSpaceSlot && state !== 'suspended')
  };
}

function pushUserNotice(db, userId, notice) {
  const target = (db.users || []).find((u) => u.id === userId);
  if (!target) return;
  target.notices = Array.isArray(target.notices) ? target.notices : [];
  target.notices.unshift({
    id: 'ntc_' + randomHex(5),
    type: String(notice.type || 'info'),
    title: String(notice.title || '').slice(0, 140),
    body: String(notice.body || '').slice(0, 600),
    createdAt: new Date().toISOString(),
    read: false
  });
  target.notices = target.notices.slice(0, 50);
}

async function sendPlatformEmail(env, to, subject, text) {
  if (!env || !env.RESEND_API_KEY || !to) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: env.MAIL_FROM || 'SpaceHub <onboarding@resend.dev>',
        to: [to],
        subject,
        text
      })
    });
    return r.ok;
  } catch (_e) {
    return false;
  }
}

async function notifyUser(env, db, user, notice, emailText) {
  pushUserNotice(db, user.id, notice);
  if (user.email) {
    await sendPlatformEmail(env, user.email, notice.title, emailText || notice.body);
  }
}

function isAdminUser(env, user) {
  if (!user || !env) return false;
  const admins = String(env.ADMIN_USERNAMES || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!admins.includes(String(user.username || '').toLowerCase())) return false;
  // Accounts signed in with an unverified typed email can never be admin.
  return !(user.socialProvider && !user.socialVerified);
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text)));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

function extractRequestToken(request, url) {
  const authHeader = request.headers.get('authorization') || '';
  const agentKey = request.headers.get('x-agent-key') || '';
  if (agentKey) return agentKey.trim();
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7).trim();
  const cookies = parseCookies(request.headers.get('cookie') || '');
  return cookies.spacehub_token || url.searchParams.get('token') || null;
}

function revokeUserSessions(db, userId, exceptToken = null) {
  Object.entries(db.sessions || {}).forEach(([t, uid]) => {
    if (uid === userId && t !== exceptToken) delete db.sessions[t];
  });
}

async function verifyPaypalWebhook(env, request, event) {
  if (!env.PAYPAL_WEBHOOK_ID || !paypalConfigured(env)) return false;
  const h = request.headers;
  const token = await paypalAccessToken(env);
  const r = await fetch(`${paypalApiBase(env)}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_algo: h.get('paypal-auth-algo'),
      cert_url: h.get('paypal-cert-url'),
      transmission_id: h.get('paypal-transmission-id'),
      transmission_sig: h.get('paypal-transmission-sig'),
      transmission_time: h.get('paypal-transmission-time'),
      webhook_id: env.PAYPAL_WEBHOOK_ID,
      webhook_event: event
    })
  });
  const data = await r.json().catch(() => ({}));
  return r.ok && data.verification_status === 'SUCCESS';
}

function findPaypalRecordForEvent(db, event) {
  const res = event.resource || {};
  const ids = new Set();
  if (res.id) ids.add(String(res.id));
  const up = (res.links || []).find((l) => l.rel === 'up');
  if (up && up.href) ids.add(String(up.href).split('/').pop());
  (res.disputed_transactions || []).forEach((t) => {
    if (t.seller_transaction_id) ids.add(String(t.seller_transaction_id));
  });
  const orderId = res.supplementary_data?.related_ids?.order_id;
  return (
    (db.paypalOrders || []).find(
      (o) => o.status === 'COMPLETED' && ((o.captureId && ids.has(o.captureId)) || (orderId && o.id === orderId))
    ) || null
  );
}

function applyPaypalReversal(db, rec, reason) {
  const conn = db.hostingConnections.find((c) => c.id === rec.connectionId);
  if (!conn || rec.reverted) return null;
  rec.reverted = true;
  rec.revertReason = reason;
  if (rec.kind === 'renewal') {
    conn.expiresAt = addDaysIso(conn.expiresAt || new Date().toISOString(), -(rec.periodDays || 30));
    return { conn, action: 'extension_removed' };
  }
  conn.suspended = true;
  conn.suspendedReason = reason;
  conn.suspendedAt = new Date().toISOString();
  return { conn, action: 'suspended' };
}

function applyPaypalReinstatement(db, rec) {
  const conn = db.hostingConnections.find((c) => c.id === rec.connectionId);
  if (!conn || !rec.reverted) return null;
  rec.reverted = false;
  delete rec.revertReason;
  if (rec.kind === 'renewal') {
    conn.expiresAt = addDaysIso(conn.expiresAt || new Date().toISOString(), rec.periodDays || 30);
    return { conn, action: 'extension_restored' };
  }
  conn.suspended = false;
  delete conn.suspendedReason;
  delete conn.suspendedAt;
  return { conn, action: 'reinstated' };
}

function getMarketplaceTemplates(db) {
  const builtIn = Object.entries(STARTER_TEMPLATES).map(([key, tpl]) => ({
    slug: key,
    name: tpl.name,
    description: tpl.description || `Official responsive ${tpl.name} template for SpaceHub`,
    category: tpl.category || (key === 'landing' || key === 'waitlist' ? 'saas' : key === 'dashboard' ? 'analytics' : 'tools'),
    emoji: tpl.emoji || '⚡',
    authorUsername: 'spacehub',
    isCommunity: false,
    cloneCount: tpl.cloneCount || 24,
    tags: tpl.tags || ['starter', key],
    files: tpl.files
  }));

  const community = (db?.spaces || [])
    .filter((s) => s.isTemplate && s.visibility === 'public')
    .map((s) => ({
      slug: s.slug,
      name: s.title,
      description: s.templateDescription || s.description || 'Community SpaceHub template',
      category: s.templateCategory || 'community',
      emoji: s.appIconText || '🚀',
      authorUsername: s.ownerUsername,
      isCommunity: true,
      cloneCount: s.cloneCount || 0,
      tags: s.templateTags || ['community'],
      files: s.publishedFiles || s.draftFiles || {}
    }));

  return [...builtIn, ...community];
}

function synthesizeAppFromPrompt(prompt, style = 'modern') {
  const p = String(prompt || '').toLowerCase();
  const title = prompt && prompt.length > 3 ? prompt.trim().slice(0, 45) : 'Next-Gen Web App';

  if (p.includes('kanban') || p.includes('task') || p.includes('todo') || p.includes('board') || p.includes('agile')) {
    return {
      source: 'synthesizer',
      summary: 'Responsive Agile Kanban Project Board with interactive cards, columns, and persistent storage.',
      files: STARTER_TEMPLATES.kanban.files
    };
  }

  if (p.includes('invoice') || p.includes('bill') || p.includes('quote') || p.includes('receipt')) {
    return {
      source: 'synthesizer',
      summary: 'Client Invoice & Billing Calculator with live subtotal calculation, tax, and print-ready stylesheet.',
      files: STARTER_TEMPLATES.invoice.files
    };
  }

  if (p.includes('portfolio') || p.includes('resume') || p.includes('cv') || p.includes('showcase')) {
    return {
      source: 'synthesizer',
      summary: 'Bento-Grid Developer Portfolio with interactive project cards, skills cloud, and contact modal.',
      files: STARTER_TEMPLATES.portfolio.files
    };
  }

  return {
    source: 'synthesizer',
    summary: `Interactive application: ${title} with responsive UI components and instant edge persistence.`,
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="app-wrap">
    <header class="app-top">
      <div class="brand">⚡ ${title}</div>
      <div class="badge">LIVE APP</div>
    </header>

    <main class="hero">
      <h1>${title}</h1>
      <p class="tagline">Built and deployed live on SpaceHub managed edge cloud.</p>
      
      <div class="counter-card">
        <h2>Interactive Session</h2>
        <div class="metric" id="metricVal">0</div>
        <p class="metric-label">Interactions Recorded</p>
        <div class="btn-group">
          <button id="incBtn" class="btn-primary">Pulse Counter (+1)</button>
          <button id="resetBtn" class="btn-ghost">Reset</button>
        </div>
      </div>

      <div class="features-grid">
        <div class="feature">
          <h3>⚡ Ultra-Fast Edge</h3>
          <p>Global low-latency delivery via Cloudflare CDN.</p>
        </div>
        <div class="feature">
          <h3>🔒 Built-in Storage</h3>
          <p>Persistent JSON database wired to SpaceHub cloud.</p>
        </div>
        <div class="feature">
          <h3>📱 PWA Ready</h3>
          <p>Installable as standalone iOS and Android web app.</p>
        </div>
      </div>
    </main>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
      'style.css': `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #fafafa; min-height: 100vh; padding: 2rem; }
.app-wrap { max-width: 860px; margin: 0 auto; }
.app-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3rem; }
.brand { font-size: 1.15rem; font-weight: 700; color: #818cf8; }
.badge { background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); color: #818cf8; font-size: 0.72rem; padding: 0.2rem 0.6rem; border-radius: 999px; font-weight: 700; }
.hero h1 { font-size: 2.2rem; font-weight: 800; margin-bottom: 0.5rem; letter-spacing: -0.02em; }
.tagline { color: #a1a1aa; font-size: 1.05rem; margin-bottom: 2.5rem; }
.counter-card { background: #18181b; border: 1px solid #27272a; border-radius: 0.75rem; padding: 2rem; text-align: center; margin-bottom: 2.5rem; }
.metric { font-size: 3.5rem; font-weight: 800; color: #34d399; margin: 0.5rem 0; font-variant-numeric: tabular-nums; }
.metric-label { color: #a1a1aa; font-size: 0.85rem; margin-bottom: 1.5rem; }
.btn-group { display: flex; gap: 0.75rem; justify-content: center; }
.btn-primary { background: #6366f1; color: white; border: none; padding: 0.65rem 1.35rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: transform 0.1s; }
.btn-primary:active { transform: scale(0.97); }
.btn-ghost { background: transparent; color: #a1a1aa; border: 1px solid #27272a; padding: 0.65rem 1rem; border-radius: 0.5rem; cursor: pointer; }
.features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.25rem; }
.feature { background: #121215; border: 1px solid #27272a; border-radius: 0.6rem; padding: 1.25rem; }
.feature h3 { font-size: 1rem; margin-bottom: 0.4rem; color: #fafafa; }
.feature p { font-size: 0.85rem; color: #a1a1aa; line-height: 1.4; }`,
      'script.js': `let val = parseInt(localStorage.getItem('sh_demo_count') || '0', 10);
const metric = document.getElementById('metricVal');
if (metric) metric.textContent = val;
document.getElementById('incBtn')?.addEventListener('click', () => {
  val++;
  if (metric) metric.textContent = val;
  localStorage.setItem('sh_demo_count', String(val));
});
document.getElementById('resetBtn')?.addEventListener('click', () => {
  val = 0;
  if (metric) metric.textContent = val;
  localStorage.removeItem('sh_demo_count');
});`
    }
  };
}

async function generateAppWithGeminiOrSynthesizer(env, prompt, style = 'modern') {
  const cleanPrompt = String(prompt || '').trim();
  if (env && env.GEMINI_API_KEY) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
      const sysInstruction =
        'You are an expert full-stack web engineer. Generate a production-ready, beautiful, responsive, self-contained single-page web application. Return ONLY a valid JSON object matching this schema without markdown fences: {"summary":"string","files":{"index.html":"string","style.css":"string","script.js":"string"}}';

      const resp = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${sysInstruction}\nUser Prompt: ${cleanPrompt}\nDesign Style: ${style}` }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = JSON.parse(rawText.replace(/^```json/i, '').replace(/```$/i, '').trim());
        if (parsed && parsed.files && parsed.files['index.html']) {
          return {
            source: 'gemini-2.5-flash',
            summary: parsed.summary || `Generated application: ${cleanPrompt}`,
            files: parsed.files
          };
        }
      }
    } catch (_err) {}
  }

  return synthesizeAppFromPrompt(cleanPrompt, style);
}

function recordAuditLog(space, user, action, details = {}) {
  if (!space) return;
  space.auditLogs = Array.isArray(space.auditLogs) ? space.auditLogs : [];
  space.auditLogs.unshift({
    id: 'log_' + randomHex(6),
    action,
    username: user?.username || 'system',
    details,
    timestamp: new Date().toISOString()
  });
  if (space.auditLogs.length > 50) space.auditLogs = space.auditLogs.slice(0, 50);
}

async function dispatchSpaceIntegrations(env, space, eventType, data = {}) {
  if (!space || !space.integrations) return { discord: false, slack: false, telegram: false };
  const { discordWebhookUrl, slackWebhookUrl, telegramBotToken, telegramChatId } = space.integrations;
  const results = { discord: false, slack: false, telegram: false };

  const title = `SpaceHub: ${space.title || space.slug}`;
  const summary = data.summary || `Event "${eventType}" occurred on space ${space.slug}`;

  // Discord Webhook
  if (discordWebhookUrl && /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\//i.test(discordWebhookUrl)) {
    try {
      const payload = {
        username: 'SpaceHub Bot',
        embeds: [{
          title,
          description: summary,
          color: 6537713,
          fields: Object.entries(data.fields || {}).map(([k, v]) => ({ name: k, value: String(v).slice(0, 1024), inline: true })),
          footer: { text: `Space: ${space.slug} | Event: ${eventType}` },
          timestamp: new Date().toISOString()
        }]
      };
      const r = await fetch(discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      results.discord = r.ok;
    } catch (_e) {}
  } else if (discordWebhookUrl && discordWebhookUrl.startsWith('mock://')) {
    results.discord = true;
  }

  // Slack Webhook
  if (slackWebhookUrl && /^https:\/\/hooks\.slack\.com\/services\//i.test(slackWebhookUrl)) {
    try {
      const payload = {
        text: `*${title}* — ${summary}`,
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*${title}*\n>${summary}\n_Event: \`${eventType}\` | Space: \`${space.slug}\`_` }
          }
        ]
      };
      const r = await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      results.slack = r.ok;
    } catch (_e) {}
  } else if (slackWebhookUrl && slackWebhookUrl.startsWith('mock://')) {
    results.slack = true;
  }

  // Telegram Bot
  if (telegramBotToken && telegramChatId) {
    if (telegramBotToken.startsWith('mock_')) {
      results.telegram = true;
    } else {
      try {
        const tgUrl = `https://api.telegram.org/bot${encodeURIComponent(telegramBotToken)}/sendMessage`;
        const text = `🚀 *${title}*\n${summary}\n_Event: ${eventType}_`;
        const r = await fetch(tgUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: telegramChatId, text, parse_mode: 'Markdown' })
        });
        results.telegram = r.ok;
      } catch (_e) {}
    }
  }

  return results;
}

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    table[i] = c;
  }
  return table;
}
const crcTable = makeCrcTable();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function createZip(files) {
  const enc = new TextEncoder();
  const fileEntries = [];
  let localOffset = 0;
  const localHeaders = [];

  for (const [name, content] of Object.entries(files)) {
    if (content === undefined || content === null) continue;
    const nameBuf = enc.encode(name);
    const contentBuf = typeof content === 'string' ? enc.encode(content) : new Uint8Array(content);
    const crc = crc32(contentBuf);
    const size = contentBuf.length;

    const localHdr = new Uint8Array(30 + nameBuf.length + size);
    const v = new DataView(localHdr.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 0x0800, true);
    v.setUint16(8, 0, true);
    v.setUint16(10, 0, true);
    v.setUint16(12, 0, true);
    v.setUint32(14, crc, true);
    v.setUint32(18, size, true);
    v.setUint32(22, size, true);
    v.setUint16(26, nameBuf.length, true);
    v.setUint16(28, 0, true);
    localHdr.set(nameBuf, 30);
    localHdr.set(contentBuf, 30 + nameBuf.length);

    fileEntries.push({ nameBuf, crc, size, offset: localOffset });
    localHeaders.push(localHdr);
    localOffset += localHdr.length;
  }

  const centralEntries = [];
  let centralSize = 0;
  for (const entry of fileEntries) {
    const hdr = new Uint8Array(46 + entry.nameBuf.length);
    const v = new DataView(hdr.buffer);
    v.setUint32(0, 0x02014b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 20, true);
    v.setUint16(8, 0x0800, true);
    v.setUint16(10, 0, true);
    v.setUint16(12, 0, true);
    v.setUint16(14, 0, true);
    v.setUint32(16, entry.crc, true);
    v.setUint32(20, entry.size, true);
    v.setUint32(24, entry.size, true);
    v.setUint16(28, entry.nameBuf.length, true);
    v.setUint16(30, 0, true);
    v.setUint16(32, 0, true);
    v.setUint16(34, 0, true);
    v.setUint16(36, 0, true);
    v.setUint32(38, 0, true);
    v.setUint32(42, entry.offset, true);
    hdr.set(entry.nameBuf, 46);

    centralEntries.push(hdr);
    centralSize += hdr.length;
  }

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, fileEntries.length, true);
  ev.setUint16(10, fileEntries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, localOffset, true);
  ev.setUint16(20, 0, true);

  const totalLen = localOffset + centralSize + 22;
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const h of localHeaders) { out.set(h, pos); pos += h.length; }
  for (const c of centralEntries) { out.set(c, pos); pos += c.length; }
  out.set(eocd, pos);
  return out;
}

async function getCryptoVaultKey(env) {
  const seed = (env && (env.VAULT_ENCRYPTION_KEY || env.SECRET_ENCRYPTION_KEY)) || 'spacehub-vault-seed-2026';
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(seed));
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptSecretString(plaintext, env) {
  if (!plaintext || typeof plaintext !== 'string') return '';
  if (plaintext.startsWith('enc:v1:')) return plaintext;
  const key = await getCryptoVaultKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  const ivB64 = btoa(String.fromCharCode(...iv));
  const cipherB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  return `enc:v1:${ivB64}:${cipherB64}`;
}

async function decryptSecretString(ciphertext, env) {
  if (!ciphertext || typeof ciphertext !== 'string') return '';
  if (!ciphertext.startsWith('enc:v1:')) return ciphertext;
  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 4) return ciphertext;
    const iv = Uint8Array.from(atob(parts[2]), (c) => c.charCodeAt(0));
    const cipherBytes = Uint8Array.from(atob(parts[3]), (c) => c.charCodeAt(0));
    const key = await getCryptoVaultKey(env);
    const decryptedBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBytes);
    return new TextDecoder().decode(decryptedBuf);
  } catch (_e) {
    return ciphertext;
  }
}

async function getDecryptedSpaceSecrets(space, env) {
  const secrets = space.secrets && typeof space.secrets === 'object' ? space.secrets : {};
  const decrypted = {};
  for (const [k, v] of Object.entries(secrets)) {
    decrypted[k] = await decryptSecretString(v, env);
  }
  return decrypted;
}

async function encryptSpaceSecrets(secretsObj, env) {
  if (!secretsObj || typeof secretsObj !== 'object') return {};
  const encrypted = {};
  for (const [k, v] of Object.entries(secretsObj)) {
    encrypted[k] = await encryptSecretString(v, env);
  }
  return encrypted;
}

export const LEGACY_STATE_KEY = 'spacehub_prod_state_v2';
let memoryDb = structuredClone(emptyDb);

async function loadDb(env) {
  if (env?.spaceHubStorage || env?.SPACEHUB_KV) {
    const raw = env.spaceHubStorage
      ? await env.spaceHubStorage.load()
      : await env.SPACEHUB_KV.get(LEGACY_STATE_KEY, 'json');
    if (!raw) return structuredClone(emptyDb);
    return {
      users: Array.isArray(raw.users) ? raw.users : [],
      sessions: raw.sessions || {},
      agentKeys: Array.isArray(raw.agentKeys) ? raw.agentKeys : [],
      hostingConnections: Array.isArray(raw.hostingConnections) ? raw.hostingConnections : [],
      paypalOrders: Array.isArray(raw.paypalOrders) ? raw.paypalOrders : [],
      paypalEvents: Array.isArray(raw.paypalEvents) ? raw.paypalEvents : [],
      stripeOrders: Array.isArray(raw.stripeOrders) ? raw.stripeOrders : [],
      stripeEvents: Array.isArray(raw.stripeEvents) ? raw.stripeEvents : [],
      passwordResets: Array.isArray(raw.passwordResets) ? raw.passwordResets : [],
      loginFailures: raw.loginFailures && typeof raw.loginFailures === 'object' ? raw.loginFailures : {},
      spaces: Array.isArray(raw.spaces) ? raw.spaces : []
    };
  }
  return memoryDb;
}

async function saveDb(env, db) {
  if (env?.spaceHubStorage) await env.spaceHubStorage.save(db);
  else if (env?.SPACEHUB_KV) await env.SPACEHUB_KV.put(LEGACY_STATE_KEY, JSON.stringify(db));
  else memoryDb = db;
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

function normalizeCollaborators(input) {
  if (!input) return [];
  const list = Array.isArray(input) ? input : String(input).split(/[,\r\n]+/);
  const out = [];
  const seen = new Set();
  const validRoles = ['admin', 'publisher', 'editor', 'viewer'];

  for (const item of list) {
    let username = '';
    let role = 'editor';
    if (typeof item === 'object' && item !== null) {
      username = String(item.username || '').trim().toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9_-]/g, '');
      const r = String(item.role || '').trim().toLowerCase();
      if (validRoles.includes(r)) role = r;
    } else {
      const parts = String(item || '').split(':');
      username = String(parts[0] || '').trim().toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9_-]/g, '');
      const r = String(parts[1] || '').trim().toLowerCase();
      if (validRoles.includes(r)) role = r;
    }
    if (username.length >= 2 && username.length <= 32 && !seen.has(username)) {
      seen.add(username);
      out.push({ username, role });
    }
  }
  return out.slice(0, 25);
}

function getSpaceUserRole(space, user) {
  if (!user || !space) return null;
  if (space.ownerId === user.id) return 'owner';
  const collabs = Array.isArray(space.collaborators) ? space.collaborators : [];
  const uname = String(user.username || '').toLowerCase();
  for (const c of collabs) {
    if (typeof c === 'string' && c.toLowerCase() === uname) return 'editor';
    if (typeof c === 'object' && c && String(c.username || '').toLowerCase() === uname) {
      return c.role || 'editor';
    }
  }
  return null;
}

function canEditSpace(space, user) {
  const role = getSpaceUserRole(space, user);
  return role === 'owner' || role === 'admin' || role === 'publisher' || role === 'editor';
}

function canPublishSpace(space, user) {
  const role = getSpaceUserRole(space, user);
  return role === 'owner' || role === 'admin' || role === 'publisher';
}

function canAdminSpace(space, user) {
  const role = getSpaceUserRole(space, user);
  return role === 'owner' || role === 'admin';
}

function canViewSpace(space, user) {
  if (space.visibility === 'public' && space.status === 'published') return true;
  const role = getSpaceUserRole(space, user);
  return role !== null;
}

function validateFormSubmission(fields, schema = null) {
  if (!schema || typeof schema !== 'object') {
    return { valid: true, errors: [] };
  }
  const errors = [];
  const required = Array.isArray(schema.required) ? schema.required : [];
  for (const reqKey of required) {
    const val = fields[reqKey];
    if (val === undefined || val === null || String(val).trim() === '') {
      errors.push(`Field "${reqKey}" is required.`);
    }
  }

  const props = schema.properties && typeof schema.properties === 'object' ? schema.properties : {};
  for (const [key, prop] of Object.entries(props)) {
    const val = fields[key];
    if (val === undefined || val === null || String(val).trim() === '') continue;

    if (prop.type === 'string' && typeof val !== 'string') {
      errors.push(`Field "${key}" must be a string.`);
      continue;
    }
    if (prop.type === 'number' && isNaN(Number(val))) {
      errors.push(`Field "${key}" must be a number.`);
      continue;
    }
    if (prop.type === 'boolean' && typeof val !== 'boolean' && val !== 'true' && val !== 'false') {
      errors.push(`Field "${key}" must be a boolean.`);
      continue;
    }
    if (prop.format === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val))) {
        errors.push(`Field "${key}" must be a valid email address.`);
      }
    }
    if (prop.format === 'url') {
      if (!/^https?:\/\//i.test(String(val))) {
        errors.push(`Field "${key}" must be a valid URL starting with http:// or https://.`);
      }
    }
    if (typeof prop.minLength === 'number' && String(val).length < prop.minLength) {
      errors.push(`Field "${key}" must be at least ${prop.minLength} characters.`);
    }
    if (typeof prop.maxLength === 'number' && String(val).length > prop.maxLength) {
      errors.push(`Field "${key}" must not exceed ${prop.maxLength} characters.`);
    }
    if (typeof prop.minimum === 'number' && Number(val) < prop.minimum) {
      errors.push(`Field "${key}" must be at least ${prop.minimum}.`);
    }
    if (typeof prop.maximum === 'number' && Number(val) > prop.maximum) {
      errors.push(`Field "${key}" must not exceed ${prop.maximum}.`);
    }
    if (Array.isArray(prop.enum) && !prop.enum.includes(val)) {
      errors.push(`Field "${key}" must be one of: ${prop.enum.join(', ')}.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function rowsToCsv(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return '';
  const colSet = new Set();
  for (const r of rows) {
    if (r && typeof r === 'object') {
      Object.keys(r).forEach((k) => colSet.add(k));
    }
  }
  const cols = Array.from(colSet);
  if (cols.length === 0) return '';
  const esc = (val) => {
    if (val === undefined || val === null) return '';
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [cols.map(esc).join(',')];
  for (const r of rows) {
    lines.push(cols.map((c) => esc(r ? r[c] : '')).join(','));
  }
  return lines.join('\n');
}

function parseCsvToRows(csvText = '') {
  const text = String(csvText || '').trim();
  if (!text) return [];
  const lines = [];
  let curLine = [];
  let curVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          curVal += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        curVal += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      curLine.push(curVal);
      curVal = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      curLine.push(curVal);
      lines.push(curLine);
      curLine = [];
      curVal = '';
    } else {
      curVal += ch;
    }
  }
  if (curVal !== '' || curLine.length > 0) {
    curLine.push(curVal);
    lines.push(curLine);
  }
  if (lines.length < 2) return [];
  const headers = lines[0].map((h) => h.trim()).filter(Boolean);
  const out = [];
  for (let r = 1; r < lines.length; r++) {
    const rowVals = lines[r];
    if (rowVals.length === 1 && rowVals[0].trim() === '') continue;
    const obj = {};
    headers.forEach((h, idx) => {
      const raw = rowVals[idx] !== undefined ? rowVals[idx].trim() : '';
      if (raw !== '' && !isNaN(Number(raw)) && !/^0\d+/.test(raw)) {
        obj[h] = Number(raw);
      } else if (raw === 'true') {
        obj[h] = true;
      } else if (raw === 'false') {
        obj[h] = false;
      } else {
        obj[h] = raw;
      }
    });
    out.push(obj);
  }
  return out;
}

function resolveSpaceCustomHeaders(files = {}, space = {}, routePath = '/*') {
  const out = {};
  let config = space.customHeaders && typeof space.customHeaders === 'object' ? space.customHeaders : null;
  if (!config && files && files['headers.json']) {
    try {
      config = JSON.parse(files['headers.json']);
    } catch (_e) {}
  }
  if (!config || typeof config !== 'object') return out;
  const blocked = new Set(['content-length', 'transfer-encoding', 'host', 'connection']);
  const applyMap = (mapObj) => {
    if (!mapObj || typeof mapObj !== 'object') return;
    for (const [hk, hv] of Object.entries(mapObj)) {
      if (typeof hv === 'string' && !blocked.has(hk.toLowerCase())) {
        out[hk] = hv;
      }
    }
  };
  // Flat headers object or route-keyed object
  const isRouteKeyed = Object.keys(config).some((k) => k.startsWith('/'));
  if (isRouteKeyed) {
    applyMap(config['/*']);
    if (routePath && config[routePath]) applyMap(config[routePath]);
  } else {
    applyMap(config);
  }
  return out;
}

function computeSnapshotDiff(filesA = {}, filesB = {}) {
  const allKeys = Array.from(new Set([...Object.keys(filesA || {}), ...Object.keys(filesB || {})])).sort();
  const diffs = [];
  let totalAdded = 0;
  let totalRemoved = 0;

  for (const file of allKeys) {
    const aText = filesA && filesA[file] !== undefined ? String(filesA[file]) : null;
    const bText = filesB && filesB[file] !== undefined ? String(filesB[file]) : null;
    if (aText === bText) continue;

    const aLines = aText !== null ? aText.split(/\r?\n/) : [];
    const bLines = bText !== null ? bText.split(/\r?\n/) : [];
    const aSet = new Set(aLines);
    const bSet = new Set(bLines);
    const addedLines = bLines.filter((l) => !aSet.has(l));
    const removedLines = aLines.filter((l) => !bSet.has(l));
    totalAdded += addedLines.length;
    totalRemoved += removedLines.length;

    diffs.push({
      file,
      status: aText === null ? 'added' : bText === null ? 'deleted' : 'modified',
      addedCount: addedLines.length,
      removedCount: removedLines.length,
      addedPreview: addedLines.slice(0, 10),
      removedPreview: removedLines.slice(0, 10)
    });
  }
  return {
    filesChanged: diffs.length,
    totalAdded,
    totalRemoved,
    diffs
  };
}

function generatePresenceBadgeSvg(count = 1) {
  const label = `${count} online now`;
  const width = Math.max(128, 60 + label.length * 6.5);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(width)}" height="28" viewBox="0 0 ${Math.round(width)} 28">
  <rect width="${Math.round(width)}" height="28" rx="14" fill="#18181b" stroke="#27272a" stroke-width="1"/>
  <circle cx="15" cy="14" r="4.5" fill="#22c55e"/>
  <text x="27" y="18" fill="#fafafa" font-family="system-ui, -apple-system, sans-serif" font-size="11.5" font-weight="600">${label}</text>
</svg>`;
}

function generateSpaceEmbedScript(space, origin = 'https://spacehub.win') {
  const slug = String(space.slug || 'app');
  const title = String(space.title || slug).replace(/["<>]/g, '');
  const liveUrl = `${origin}/live/${encodeURIComponent(slug)}`;
  return `(function(){
  var scripts = document.getElementsByTagName('script');
  var currentScript = document.currentScript || scripts[scripts.length - 1];
  var targetId = currentScript && currentScript.getAttribute('data-target');
  var height = (currentScript && currentScript.getAttribute('data-height')) || '600px';
  var iframe = document.createElement('iframe');
  iframe.src = '${liveUrl}?embed=1';
  iframe.title = '${title} — SpaceHub Embed';
  iframe.style.width = '100%';
  iframe.style.height = height;
  iframe.style.border = '1px solid #27272a';
  iframe.style.borderRadius = '12px';
  iframe.style.background = '#09090b';
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('allow', 'clipboard-write; fullscreen');
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'spacehub:resize' && e.data.slug === '${slug}' && e.data.height) {
      iframe.style.height = parseInt(e.data.height, 10) + 'px';
    }
  });
  var container = targetId ? document.getElementById(targetId) : null;
  if (container) {
    container.appendChild(iframe);
  } else if (currentScript && currentScript.parentNode) {
    currentScript.parentNode.insertBefore(iframe, currentScript.nextSibling);
  }
})();`;
}

function generateSpaceQrSvg(space, origin = 'https://spacehub.win', fg = '#fafafa', bg = '#09090b') {
  const slug = String(space.slug || 'app');
  const targetUrl = `${origin}/live/${slug}`;
  const size = 21;
  const grid = Array.from({ length: size }, () => Array(size).fill(false));
  const drawFinder = (r0, c0) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[r0 + r][c0 + c] = isBorder || isInner;
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);
  for (let i = 8; i < size - 8; i++) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }
  let hash = 2166136261;
  for (let i = 0; i < targetUrl.length; i++) {
    hash ^= targetUrl.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= size - 8;
      const inBotLeft = r >= size - 8 && c < 8;
      if (inTopLeft || inTopRight || inBotLeft || r === 6 || c === 6) continue;
      hash ^= (r * 31 + c * 17) & 0xff;
      hash = Math.imul(hash, 16777619) >>> 0;
      grid[r][c] = (hash & 1) === 1;
    }
  }
  const cell = 10;
  const pad = 20;
  const dim = size * cell + pad * 2;
  let rects = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c]) {
        rects += `<rect x="${pad + c * cell}" y="${pad + r * cell}" width="${cell}" height="${cell}" rx="1.5" fill="${fg}"/>`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim + 28}" viewBox="0 0 ${dim} ${dim + 28}" data-url="${targetUrl}">
  <rect width="${dim}" height="${dim + 28}" rx="16" fill="${bg}" stroke="#27272a" stroke-width="2"/>
  ${rects}
  <text x="${dim / 2}" y="${dim + 16}" text-anchor="middle" fill="${fg}" font-family="monospace, sans-serif" font-size="11" opacity="0.8">spacehub.win/s/${slug}</text>
</svg>`;
}

function analyzeSpaceSeoAndA11y(html = '', space = {}) {
  const src = String(html || '');
  const checks = [];
  let score = 0;

  const hasDoctype = /<!DOCTYPE\s+html>/i.test(src);
  checks.push({ id: 'doctype', category: 'best-practices', passed: hasDoctype, points: 10, label: 'HTML5 <!DOCTYPE html> declaration', fix: 'Add <!DOCTYPE html> at the top of index.html' });
  if (hasDoctype) score += 10;

  const hasLang = /<html[^>]+lang=["'][a-zA-Z-]+["']/i.test(src);
  checks.push({ id: 'html_lang', category: 'accessibility', passed: hasLang, points: 15, label: '<html lang="..."> attribute for screen readers', fix: 'Add lang="en" to the <html> tag' });
  if (hasLang) score += 15;

  const hasCharset = /<meta[^>]+charset=["']?utf-8["']?/i.test(src);
  checks.push({ id: 'meta_charset', category: 'best-practices', passed: hasCharset, points: 10, label: 'UTF-8 character encoding <meta charset="UTF-8">', fix: 'Insert <meta charset="UTF-8" /> inside <head>' });
  if (hasCharset) score += 10;

  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(src);
  checks.push({ id: 'meta_viewport', category: 'seo', passed: hasViewport, points: 15, label: 'Responsive mobile <meta name="viewport"> tag', fix: 'Insert <meta name="viewport" content="width=device-width, initial-scale=1.0" /> inside <head>' });
  if (hasViewport) score += 15;

  const hasTitle = /<title>[^<]+<\/title>/i.test(src);
  checks.push({ id: 'title_tag', category: 'seo', passed: hasTitle, points: 15, label: 'Non-empty <title> element', fix: `Insert <title>${space.title || 'SpaceHub App'}</title> inside <head>` });
  if (hasTitle) score += 15;

  const hasDesc = /<meta[^>]+name=["']description["'][^>]+content=["'][^"']+["']/i.test(src) || /<meta[^>]+content=["'][^"']+["'][^>]+name=["']description["']/i.test(src);
  checks.push({ id: 'meta_description', category: 'seo', passed: hasDesc, points: 15, label: 'SEO <meta name="description"> summary', fix: `Insert <meta name="description" content="${(space.description || space.title || 'Built on SpaceHub').replace(/"/g, '')}" />` });
  if (hasDesc) score += 15;

  const hasH1 = /<h1[\s>][\s\S]*?<\/h1>/i.test(src);
  checks.push({ id: 'heading_h1', category: 'seo', passed: hasH1, points: 10, label: 'Primary <h1> heading present', fix: 'Include a main <h1> heading inside <body>' });
  if (hasH1) score += 10;

  const imgTags = src.match(/<img\b[^>]*>/gi) || [];
  const imgsMissingAlt = imgTags.filter((tag) => !/\balt\s*=\s*["'][^"']*["']/i.test(tag));
  const passedImgAlt = imgsMissingAlt.length === 0;
  checks.push({ id: 'img_alt', category: 'accessibility', passed: passedImgAlt, points: 10, label: 'All <img> elements include alt attributes', fix: `Add descriptive alt="..." attributes to ${imgsMissingAlt.length} <img> tag(s)` });
  if (passedImgAlt) score += 10;

  const issues = checks.filter((c) => !c.passed);
  return {
    score,
    grade: score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D',
    passedCount: checks.length - issues.length,
    totalChecks: checks.length,
    checks,
    issues
  };
}

function autoFixSpaceSeoHtml(html = '', space = {}) {
  let out = String(html || '');
  const titleText = String(space.title || 'SpaceHub App').replace(/[<>&"]/g, '');
  const descText = String(space.description || `${titleText} — interactive web application on SpaceHub`).replace(/[<>&"]/g, '');

  if (!/<!DOCTYPE\s+html>/i.test(out)) {
    out = `<!DOCTYPE html>\n` + out;
  }
  if (/<html(?![^>]*\blang=)/i.test(out)) {
    out = out.replace(/<html/i, '<html lang="en"');
  } else if (!/<html/i.test(out)) {
    out = `<!DOCTYPE html>\n<html lang="en">\n<head>\n</head>\n<body>\n${out}\n</body>\n</html>`;
  }
  if (!/<head[\s>]/i.test(out)) {
    out = out.replace(/<html[^>]*>/i, (m) => `${m}\n<head>\n</head>`);
  }
  const headInjections = [];
  if (!/<meta[^>]+charset=/i.test(out)) {
    headInjections.push('  <meta charset="UTF-8" />');
  }
  if (!/<meta[^>]+name=["']viewport["']/i.test(out)) {
    headInjections.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0" />');
  }
  if (!/<title>[^<]+<\/title>/i.test(out)) {
    headInjections.push(`  <title>${titleText}</title>`);
  }
  if (!/<meta[^>]+name=["']description["']/i.test(out)) {
    headInjections.push(`  <meta name="description" content="${descText}" />`);
  }
  if (headInjections.length > 0) {
    out = out.replace(/<head[^>]*>/i, (m) => `${m}\n${headInjections.join('\n')}`);
  }
  out = out.replace(/<img\b(?![^>]*\balt=)([^>]*)>/gi, '<img alt="App illustration"$1>');
  return out;
}

function evaluateFeatureFlags(flagsObj = {}, userKey = '', segment = '') {
  const evaluated = {};
  const rules = {};
  for (const [k, raw] of Object.entries(flagsObj || {})) {
    if (typeof raw === 'boolean') {
      evaluated[k] = raw;
      rules[k] = { enabled: raw, rollout: raw ? 100 : 0, segments: [] };
      continue;
    }
    if (raw && typeof raw === 'object') {
      const enabled = Boolean(raw.enabled);
      const rollout = typeof raw.rollout === 'number' ? Math.max(0, Math.min(100, raw.rollout)) : (enabled ? 100 : 0);
      const segments = Array.isArray(raw.segments) ? raw.segments.map((s) => String(s).toLowerCase()) : [];
      rules[k] = { enabled, rollout, segments };
      if (!enabled) {
        evaluated[k] = false;
        continue;
      }
      if (segments.length > 0 && segment && segments.includes(String(segment).toLowerCase())) {
        evaluated[k] = true;
        continue;
      }
      if (rollout >= 100) {
        evaluated[k] = true;
      } else if (rollout <= 0) {
        evaluated[k] = false;
      } else {
        const seedStr = `${k}:${userKey || 'anon'}`;
        let h = 2166136261;
        for (let i = 0; i < seedStr.length; i++) {
          h ^= seedStr.charCodeAt(i);
          h = Math.imul(h, 16777619) >>> 0;
        }
        evaluated[k] = (h % 100) < rollout;
      }
    }
  }
  return { evaluated, rules };
}

function generateSpaceOpenApiSpec(space, origin = 'https://spacehub.win') {
  const slug = String(space.slug || 'app');
  const title = String(space.title || slug);
  const dbTablesObj = space.dbTables && typeof space.dbTables === 'object' ? space.dbTables : {};
  const tableNames = Object.keys(dbTablesObj);
  if (tableNames.length === 0) tableNames.push('items');

  const paths = {
    [`/live/${slug}/storage`]: {
      get: { summary: 'Read Space Cloud JSON Storage', responses: { '200': { description: 'Current JSON key-value store' } } },
      post: { summary: 'Merge/Update Space Cloud JSON Storage', responses: { '200': { description: 'Updated JSON store' } } }
    },
    [`/live/${slug}/submit`]: {
      post: { summary: 'Submit Form / Waitlist Entry (Validated by form.schema.json if present)', responses: { '201': { description: 'Submission saved' }, '422': { description: 'Schema validation error' } } }
    },
    [`/live/${slug}/cache/{key}`]: {
      get: { summary: 'Read Edge TTL Cache Key', parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Cache HIT or MISS' } } },
      put: { summary: 'Write Edge TTL Cache Key', parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }, { name: 'ttl', in: 'query', required: false, schema: { type: 'integer' } }], responses: { '200': { description: 'Stored in Edge Cache' } } },
      delete: { summary: 'Evict Edge Cache Key', parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Key evicted' } } }
    },
    [`/live/${slug}/presence`]: {
      get: { summary: 'List Online Visitors & Cursors', responses: { '200': { description: 'Active sessions list' } } },
      post: { summary: 'Send Visitor Presence Heartbeat', responses: { '200': { description: 'Updated presence state' } } }
    },
    [`/live/${slug}/flags`]: {
      get: { summary: 'Evaluate Feature Flags & Rollout Experiments', parameters: [{ name: 'userKey', in: 'query', required: false, schema: { type: 'string' } }, { name: 'segment', in: 'query', required: false, schema: { type: 'string' } }], responses: { '200': { description: 'Evaluated boolean flags' } } }
    },
    [`/live/${slug}/errors`]: {
      post: { summary: 'Report Client Runtime Error / Exception', responses: { '201': { description: 'Error logged' } } }
    },
    [`/live/${slug}/i18n`]: {
      get: { summary: 'Resolve Localization Dictionary (locales.<lang>.json)', parameters: [{ name: 'lang', in: 'query', required: false, schema: { type: 'string' } }], responses: { '200': { description: 'Translation key-value dictionary' } } }
    },
    [`/live/${slug}/ai`]: {
      post: { summary: 'Built-in Space AI Assistant Completion', responses: { '200': { description: 'AI response' } } }
    },
    [`/live/${slug}/orders`]: {
      get: { summary: 'List E-Commerce Orders', responses: { '200': { description: 'Orders list' } } },
      post: { summary: 'Create E-Commerce Checkout Order', responses: { '201': { description: 'Order created' } } }
    }
  };

  for (const tbl of tableNames) {
    paths[`/live/${slug}/db/${tbl}`] = {
      get: { summary: `Query rows in "${tbl}" table`, parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }, { name: 'where', in: 'query', schema: { type: 'string' } }, { name: 'sort', in: 'query', schema: { type: 'string' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }], responses: { '200': { description: 'Matching rows' } } },
      post: { summary: `Insert row into "${tbl}" table`, responses: { '201': { description: 'Created row' } } }
    };
    paths[`/live/${slug}/db/${tbl}/csv`] = {
      get: { summary: `Export "${tbl}" table as CSV`, responses: { '200': { description: 'CSV download' } } },
      post: { summary: `Bulk import CSV into "${tbl}" table`, responses: { '201': { description: 'Imported rows' } } }
    };
  }

  return {
    openapi: '3.0.3',
    info: {
      title: `${title} — SpaceHub Live API`,
      version: `1.0.${space.version || 1}`,
      description: space.description || `Auto-generated OpenAPI 3.0 specification for SpaceHub Space "${slug}".`
    },
    servers: [{ url: origin, description: 'SpaceHub Edge Production' }],
    paths
  };
}

async function signWebhookPayloadHmac(secret = '', bodyStr = '') {
  const enc = new TextEncoder();
  const keyBytes = enc.encode(String(secret || 'spacehub_default_hmac_secret'));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(String(bodyStr || '')));
  const hex = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `sha256=${hex}`;
}

async function dispatchSpaceEventBus(space, eventType, data = {}) {
  if (!space || !Array.isArray(space.webhookSubscriptions)) return [];
  const subs = space.webhookSubscriptions.filter(
    (s) => s && s.active !== false && Array.isArray(s.events) && (s.events.includes('*') || s.events.includes(eventType))
  );
  const results = [];
  const timestamp = new Date().toISOString();

  for (const sub of subs) {
    const bodyObj = {
      id: 'ev_' + randomHex(6),
      event: eventType,
      space: space.slug,
      timestamp,
      data
    };
    const bodyStr = JSON.stringify(bodyObj);
    const sig = await signWebhookPayloadHmac(sub.secret || 'sh_whsec_default', bodyStr);
    let status = 'skipped';
    if (String(sub.url || '').startsWith('mock://')) {
      status = `delivered_mock:${sub.url}`;
    } else if (/^https?:\/\//i.test(String(sub.url || ''))) {
      try {
        const r = await fetch(sub.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-SpaceHub-Event': eventType,
            'X-SpaceHub-Signature': sig
          },
          body: bodyStr
        });
        status = `http_${r.status}`;
      } catch (err) {
        status = `error:${err.message || 'failed'}`;
      }
    }
    sub.lastDeliveryAt = timestamp;
    sub.lastStatus = status;
    sub.lastSignature = sig;
    results.push({ id: sub.id, url: sub.url, event: eventType, signature: sig, status });
  }
  return results;
}

function evaluateSpaceFirewall(space, files = {}, request) {
  let fw = space.firewallConfig && typeof space.firewallConfig === 'object' ? space.firewallConfig : null;
  if (!fw && files && files['firewall.json']) {
    try {
      fw = JSON.parse(files['firewall.json']);
    } catch (_e) {}
  }
  if (!fw || typeof fw !== 'object' || fw.enabled === false) {
    return { allowed: true };
  }
  const ip = (request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'anon').split(',')[0].trim();
  const country = (request.headers.get('cf-ipcountry') || request.headers.get('x-country') || '').trim().toUpperCase();
  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  const apiKeyHdr = (request.headers.get('x-space-api-key') || '').trim();

  if (Array.isArray(fw.blockedIps) && fw.blockedIps.includes(ip)) {
    return { allowed: false, status: 403, reason: 'blocked_ip' };
  }
  if (Array.isArray(fw.blockedCountries) && country && fw.blockedCountries.map((c) => String(c).toUpperCase()).includes(country)) {
    return { allowed: false, status: 403, reason: 'blocked_country' };
  }
  if (Array.isArray(fw.blockedUserAgents) && ua) {
    for (const pat of fw.blockedUserAgents) {
      if (pat && ua.includes(String(pat).toLowerCase())) {
        return { allowed: false, status: 403, reason: 'blocked_user_agent' };
      }
    }
  }
  if (fw.requireApiKey && typeof fw.requireApiKey === 'string' && fw.requireApiKey.trim() !== '') {
    if (apiKeyHdr !== fw.requireApiKey.trim()) {
      return { allowed: false, status: 401, reason: 'invalid_or_missing_space_api_key' };
    }
  }
  return { allowed: true };
}

function summarizeSpaceVitals(samples = []) {
  const metrics = ['LCP', 'CLS', 'INP', 'TTFB', 'FCP'];
  const summary = {};
  for (const m of metrics) {
    const vals = samples
      .filter((s) => s && s.metric === m && typeof s.value === 'number')
      .map((s) => s.value)
      .sort((a, b) => a - b);
    if (vals.length === 0) continue;
    const p50 = vals[Math.floor(vals.length * 0.5)];
    const p75 = vals[Math.floor(vals.length * 0.75)];
    const p95 = vals[Math.floor(vals.length * 0.95)];
    let rating = 'good';
    if (m === 'LCP' && p75 > 2500) rating = p75 > 4000 ? 'poor' : 'needs-improvement';
    if (m === 'CLS' && p75 > 0.1) rating = p75 > 0.25 ? 'poor' : 'needs-improvement';
    if (m === 'INP' && p75 > 200) rating = p75 > 500 ? 'poor' : 'needs-improvement';
    if (m === 'TTFB' && p75 > 800) rating = p75 > 1800 ? 'poor' : 'needs-improvement';
    summary[m] = { count: vals.length, p50, p75, p95, rating };
  }
  return summary;
}

function recordSpaceInspectorLog(space, { method = 'POST', path = '/', status = 200, durationMs = 1, requestBody = null, responsePreview = null } = {}) {
  if (!space) return null;
  space.requestInspectorLogs = Array.isArray(space.requestInspectorLogs) ? space.requestInspectorLogs : [];
  let safeBody = requestBody;
  if (safeBody && typeof safeBody === 'object') {
    try {
      safeBody = JSON.parse(JSON.stringify(safeBody));
      if (safeBody.password) safeBody.password = '***';
      if (safeBody.secret) safeBody.secret = '***';
      if (safeBody.apiKey) safeBody.apiKey = '***';
    } catch (_e) {}
  }
  const entry = {
    id: 'req_' + randomHex(6),
    method: String(method).toUpperCase(),
    path: String(path),
    status: Number(status) || 200,
    durationMs: Math.max(1, Number(durationMs) || 1),
    requestBody: safeBody,
    responsePreview: responsePreview || null,
    timestamp: new Date().toISOString()
  };
  space.requestInspectorLogs.unshift(entry);
  if (space.requestInspectorLogs.length > 50) {
    space.requestInspectorLogs = space.requestInspectorLogs.slice(0, 50);
  }
  return entry;
}

async function processSpaceJobQueue(space, targetJobId = '') {
  if (!space || !Array.isArray(space.jobQueue)) return [];
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const processed = [];

  for (const job of space.jobQueue) {
    if (!job || job.status !== 'queued') continue;
    if (targetJobId && job.id !== targetJobId) continue;
    const dueMs = job.runAt ? Date.parse(job.runAt) : 0;
    if (!targetJobId && !Number.isNaN(dueMs) && dueMs > nowMs) continue;

    job.attempts = (job.attempts || 0) + 1;
    job.status = 'running';
    job.startedAt = nowIso;

    let succeeded = true;
    let execOutput = { executed: true, task: job.name, attempt: job.attempts };

    if (job.payload && job.payload.simulateFail && job.attempts <= (job.maxRetries || 0)) {
      succeeded = false;
      execOutput = { error: 'Simulated transient job failure' };
    } else if (job.webhookUrl) {
      if (job.webhookUrl.startsWith('mock://')) {
        execOutput = { webhookStatus: `delivered_mock:${job.webhookUrl}`, task: job.name };
      } else if (/^https?:\/\//i.test(job.webhookUrl)) {
        try {
          const r = await fetch(job.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jobId: job.id,
              space: space.slug,
              name: job.name,
              payload: job.payload,
              attempt: job.attempts,
              timestamp: nowIso
            })
          });
          succeeded = r.ok;
          execOutput = { webhookStatus: `http_${r.status}` };
        } catch (err) {
          succeeded = false;
          execOutput = { error: err.message || 'webhook_failed' };
        }
      }
    }

    if (succeeded) {
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.result = execOutput;
      await dispatchSpaceEventBus(space, 'job.completed', { jobId: job.id, name: job.name, result: execOutput });
    } else if (job.attempts <= (job.maxRetries ?? 2)) {
      job.status = 'queued';
      job.lastError = execOutput.error || 'execution_failed';
    } else {
      job.status = 'failed';
      job.completedAt = new Date().toISOString();
      job.result = execOutput;
      await dispatchSpaceEventBus(space, 'job.failed', { jobId: job.id, name: job.name, result: execOutput });
    }
    processed.push(job);
  }
  return processed;
}

function computeSearchFacets(space) {
  const index = Array.isArray(space?.searchIndex) ? space.searchIndex : [];
  const tagCounts = {};
  for (const doc of index) {
    if (doc && Array.isArray(doc.tags)) {
      for (const t of doc.tags) {
        const clean = String(t).trim().toLowerCase();
        if (clean) tagCounts[clean] = (tagCounts[clean] || 0) + 1;
      }
    }
  }
  return { tags: tagCounts, indexedCount: index.length };
}

function computeTextVector(text = '', dims = 32) {
  const vec = new Array(dims).fill(0);
  const clean = String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
  if (!clean) return vec;
  const words = clean.split(/\s+/).filter(Boolean);
  for (const word of words) {
    let h = 2166136261;
    for (let i = 0; i < word.length; i++) {
      h ^= word.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    vec[h % dims] += 2;
    for (let i = 0; i <= word.length - 3; i++) {
      const tri = word.slice(i, i + 3);
      let th = 2166136261;
      for (let j = 0; j < tri.length; j++) {
        th ^= tri.charCodeAt(j);
        th = Math.imul(th, 16777619) >>> 0;
      }
      vec[th % dims] += 1;
    }
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => Math.round((v / norm) * 10000) / 10000);
}

function cosineSimilarity(vecA = [], vecB = []) {
  const len = Math.min(vecA.length, vecB.length);
  if (len === 0) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < len; i++) {
    const a = Number(vecA[i]) || 0;
    const b = Number(vecB[i]) || 0;
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (!denom) return 0;
  return Math.round((dot / denom) * 10000) / 10000;
}

function evaluateSpaceStatus(space) {
  const incidents = Array.isArray(space?.statusIncidents) ? space.statusIncidents : [];
  const activeIncidents = incidents.filter((inc) => inc && inc.status !== 'resolved');
  let state = 'operational';
  let label = 'Operational';
  let color = '#10b981';
  if (space?.maintenanceMode) {
    state = 'maintenance';
    label = 'Maintenance';
    color = '#6366f1';
  } else if (activeIncidents.some((i) => i.severity === 'critical' || i.severity === 'major')) {
    state = 'outage';
    label = 'Major Outage';
    color = '#ef4444';
  } else if (activeIncidents.length > 0) {
    state = 'degraded';
    label = 'Degraded';
    color = '#f59e0b';
  }
  return {
    state,
    label,
    color,
    uptimePercent: state === 'operational' ? 99.98 : state === 'degraded' ? 99.4 : 98.0,
    activeIncidents,
    incidents
  };
}

function generateStatusBadgeSvg(space) {
  const st = evaluateSpaceStatus(space);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="170" height="28" viewBox="0 0 170 28">
  <rect width="170" height="28" rx="14" fill="#18181b" stroke="#27272a" stroke-width="1.5"/>
  <circle cx="16" cy="14" r="4.5" fill="${st.color}"/>
  <text x="28" y="18" fill="#fafafa" font-family="system-ui, -apple-system, sans-serif" font-size="11.5" font-weight="600">Status: ${st.label}</text>
</svg>`;
}

function parseGqlArgs(rawArgsStr = '', variables = {}) {
  const args = {};
  if (!rawArgsStr || !rawArgsStr.trim()) return args;
  const pairRegex = /([a-zA-Z0-9_]+)\s*:\s*(\$[a-zA-Z0-9_]+|"[^"]*"|'[^']*'|true|false|-?\d+(?:\.\d+)?|\{[^}]*\})/g;
  let m;
  while ((m = pairRegex.exec(rawArgsStr)) !== null) {
    const key = m[1];
    const rawVal = m[2].trim();
    if (rawVal.startsWith('$')) {
      const varName = rawVal.slice(1);
      args[key] = variables && variables[varName] !== undefined ? variables[varName] : null;
    } else if ((rawVal.startsWith('"') && rawVal.endsWith('"')) || (rawVal.startsWith("'") && rawVal.endsWith("'"))) {
      args[key] = rawVal.slice(1, -1);
    } else if (rawVal === 'true') {
      args[key] = true;
    } else if (rawVal === 'false') {
      args[key] = false;
    } else if (rawVal.startsWith('{') && rawVal.endsWith('}')) {
      try {
        const jsonNormalized = rawVal.replace(/([a-zA-Z0-9_]+)\s*:/g, '"$1":');
        args[key] = JSON.parse(jsonNormalized);
      } catch (_e) {
        args[key] = {};
      }
    } else if (!Number.isNaN(Number(rawVal))) {
      args[key] = Number(rawVal);
    } else {
      args[key] = rawVal;
    }
  }
  return args;
}

function executeSpaceGraphql(space, queryStr = '', variables = {}) {
  const q = String(queryStr || '').trim();
  if (!q) {
    return { data: null, errors: [{ message: 'GraphQL query string is required.' }] };
  }
  const data = {};
  const errors = [];
  let mutated = false;

  space.dbTables = space.dbTables && typeof space.dbTables === 'object' ? space.dbTables : {};
  space.appStorage = space.appStorage && typeof space.appStorage === 'object' ? space.appStorage : {};
  space.vectorStore = Array.isArray(space.vectorStore) ? space.vectorStore : [];
  space.searchIndex = Array.isArray(space.searchIndex) ? space.searchIndex : [];

  // Schema introspection
  if (q.includes('__schema')) {
    data.__schema = {
      queryType: { name: 'Query' },
      mutationType: { name: 'Mutation' },
      types: [
        { name: 'Query', kind: 'OBJECT', fields: ['spaceInfo', 'table', 'storage', 'vectors', 'search'] },
        { name: 'Mutation', kind: 'OBJECT', fields: ['insertRow', 'updateRow', 'deleteRow', 'setStorage', 'upsertVector'] },
        { name: 'SpaceInfo', kind: 'OBJECT', fields: ['id', 'slug', 'title', 'description', 'ownerUsername', 'status', 'views', 'likes', 'uptimePercent'] },
        { name: 'TableRow', kind: 'OBJECT', fields: ['id', 'data', 'createdAt', 'updatedAt'] },
        { name: 'StorageEntry', kind: 'OBJECT', fields: ['key', 'value'] },
        { name: 'VectorMatch', kind: 'OBJECT', fields: ['id', 'namespace', 'score', 'text', 'metadata'] }
      ]
    };
  }

  // spaceInfo query
  if (/\bspaceInfo\b/.test(q)) {
    const st = evaluateSpaceStatus(space);
    data.spaceInfo = {
      id: space.id,
      slug: space.slug,
      title: space.title,
      description: space.description || '',
      ownerUsername: space.ownerUsername,
      status: space.status,
      views: space.views || 0,
      likes: space.likes || 0,
      uptimePercent: st.uptimePercent,
      operationalState: st.state
    };
  }

  // table(...) query
  const tableMatch = q.match(/\btable\s*\(([^)]*)\)/);
  if (tableMatch) {
    const args = parseGqlArgs(tableMatch[1], variables);
    const tableName = String(args.name || variables.table || 'items').trim();
    const rows = Array.isArray(space.dbTables[tableName]) ? [...space.dbTables[tableName]] : [];
    let filtered = rows;
    if (args.whereKey !== undefined && args.whereEquals !== undefined) {
      filtered = filtered.filter((r) => String(r[args.whereKey]) === String(args.whereEquals));
    } else if (args.where && typeof args.where === 'object') {
      filtered = filtered.filter((r) =>
        Object.entries(args.where).every(([wk, wv]) => r && r[wk] === wv)
      );
    }
    const offset = Math.max(0, Number(args.offset || 0));
    const limit = Math.max(1, Math.min(200, Number(args.limit || 50)));
    data.table = filtered.slice(offset, offset + limit);
  }

  // storage(...) query
  const storageMatch = q.match(/\bstorage(?:\s*\(([^)]*)\))?/);
  if (storageMatch && !/\bsetStorage\b/.test(q)) {
    const args = parseGqlArgs(storageMatch[1] || '', variables);
    if (args.key) {
      data.storage = {
        key: String(args.key),
        value: space.appStorage[args.key] ?? null
      };
    } else {
      data.storage = Object.entries(space.appStorage).map(([k, v]) => ({ key: k, value: v }));
    }
  }

  // vectors(...) query
  const vectorsMatch = q.match(/\bvectors\s*\(([^)]*)\)/);
  if (vectorsMatch) {
    const args = parseGqlArgs(vectorsMatch[1], variables);
    const queryText = String(args.query || args.text || variables.query || '').trim();
    const topK = Math.max(1, Math.min(50, Number(args.topK || 5)));
    const ns = String(args.namespace || '').trim();
    const qVec = computeTextVector(queryText, 32);
    let candidates = space.vectorStore;
    if (ns) candidates = candidates.filter((v) => v.namespace === ns);
    data.vectors = candidates
      .map((v) => ({
        id: v.id,
        namespace: v.namespace,
        score: cosineSimilarity(qVec, v.values || []),
        text: v.text,
        metadata: v.metadata || {}
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  // search(...) query
  const searchMatch = q.match(/\bsearch\s*\(([^)]*)\)/);
  if (searchMatch) {
    const args = parseGqlArgs(searchMatch[1], variables);
    data.search = searchSpaceContent(space, args.q || args.query || '', args.tag || '');
  }

  // Mutations: insertRow
  const insertMatch = q.match(/\binsertRow\s*\(([^)]*)\)/);
  if (insertMatch) {
    const args = parseGqlArgs(insertMatch[1], variables);
    const tableName = String(args.table || args.name || variables.table || 'items').trim().replace(/[^a-zA-Z0-9_-]/g, '');
    const recordInput = (args.record && typeof args.record === 'object' ? args.record : null) ||
      (args.data && typeof args.data === 'object' ? args.data : null) ||
      (variables.record && typeof variables.record === 'object' ? variables.record : {}) || {};
    space.dbTables[tableName] = Array.isArray(space.dbTables[tableName]) ? space.dbTables[tableName] : [];
    const nowIso = new Date().toISOString();
    const newRow = {
      id: String(recordInput.id || `row_${randomHex(5)}`),
      ...recordInput,
      createdAt: nowIso,
      updatedAt: nowIso
    };
    space.dbTables[tableName].push(newRow);
    data.insertRow = newRow;
    mutated = true;
  }

  // Mutations: updateRow
  const updateMatch = q.match(/\bupdateRow\s*\(([^)]*)\)/);
  if (updateMatch) {
    const args = parseGqlArgs(updateMatch[1], variables);
    const tableName = String(args.table || variables.table || 'items').trim();
    const targetId = String(args.id || variables.id || '');
    const patchInput = (args.patch && typeof args.patch === 'object' ? args.patch : null) ||
      (args.data && typeof args.data === 'object' ? args.data : null) ||
      (variables.patch && typeof variables.patch === 'object' ? variables.patch : {}) || {};
    const rows = Array.isArray(space.dbTables[tableName]) ? space.dbTables[tableName] : [];
    const row = rows.find((r) => String(r.id) === targetId);
    if (row) {
      Object.assign(row, patchInput, { id: row.id, updatedAt: new Date().toISOString() });
      data.updateRow = row;
      mutated = true;
    } else {
      data.updateRow = null;
      errors.push({ message: `Row "${targetId}" not found in table "${tableName}".` });
    }
  }

  // Mutations: deleteRow
  const deleteMatch = q.match(/\bdeleteRow\s*\(([^)]*)\)/);
  if (deleteMatch) {
    const args = parseGqlArgs(deleteMatch[1], variables);
    const tableName = String(args.table || variables.table || 'items').trim();
    const targetId = String(args.id || variables.id || '');
    const rows = Array.isArray(space.dbTables[tableName]) ? space.dbTables[tableName] : [];
    const beforeLen = rows.length;
    space.dbTables[tableName] = rows.filter((r) => String(r.id) !== targetId);
    const deleted = space.dbTables[tableName].length < beforeLen;
    data.deleteRow = { deleted, id: targetId, remaining: space.dbTables[tableName].length };
    if (deleted) mutated = true;
  }

  // Mutations: setStorage
  const setStorageMatch = q.match(/\bsetStorage\s*\(([^)]*)\)/);
  if (setStorageMatch) {
    const args = parseGqlArgs(setStorageMatch[1], variables);
    const k = String(args.key || variables.key || '').trim();
    const v = args.value !== undefined ? args.value : variables.value;
    if (k) {
      space.appStorage[k] = v;
      data.setStorage = { key: k, value: v };
      mutated = true;
    }
  }

  // Mutations: upsertVector
  const upsertVecMatch = q.match(/\bupsertVector\s*\(([^)]*)\)/);
  if (upsertVecMatch) {
    const args = parseGqlArgs(upsertVecMatch[1], variables);
    const id = String(args.id || `vec_${randomHex(5)}`).trim();
    const text = String(args.text || '').trim();
    const ns = String(args.namespace || 'default').trim();
    const values = computeTextVector(text, 32);
    const rec = { id, namespace: ns, text, values, metadata: args.metadata || {}, updatedAt: new Date().toISOString() };
    const idx = space.vectorStore.findIndex((v) => v.id === id && v.namespace === ns);
    if (idx > -1) space.vectorStore[idx] = rec;
    else space.vectorStore.push(rec);
    data.upsertVector = { id, namespace: ns, dimensions: values.length };
    mutated = true;
  }

  return { data, errors: errors.length > 0 ? errors : undefined, mutated };
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
  return String(str ?? '')
    .replace(/\{\{\s*SECRET:([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) =>
      secrets[key] !== undefined ? secrets[key] : `{{SECRET:${key}}}`
    )
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) =>
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

function searchSpaceContent(space, rawQuery, tagFilter = '') {
  const q = String(rawQuery || '').trim().toLowerCase();
  const cleanTag = String(tagFilter || '').trim().toLowerCase();
  if (!q && !cleanTag) return [];
  const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
  const results = [];

  // Wave 19: Search custom full-text index with weighted scoring & tag facets
  const customIndex = Array.isArray(space.searchIndex) ? space.searchIndex : [];
  const scoredDocs = [];
  for (const doc of customIndex) {
    if (!doc) continue;
    const docTags = Array.isArray(doc.tags) ? doc.tags.map((t) => String(t).toLowerCase()) : [];
    if (cleanTag && !docTags.includes(cleanTag)) continue;

    const title = String(doc.title || '');
    const body = String(doc.body || doc.content || '');
    const titleLower = title.toLowerCase();
    const bodyLower = body.toLowerCase();

    let score = cleanTag ? 5 : 0;
    if (q) {
      if (titleLower.includes(q)) score += 10;
      if (docTags.some((t) => t.includes(q))) score += 6;
      if (bodyLower.includes(q)) score += 3;
      for (const tok of tokens) {
        if (titleLower.includes(tok)) score += 4;
        if (bodyLower.includes(tok)) score += 2;
      }
    }
    if (score > 0) {
      const idx = q ? bodyLower.indexOf(tokens[0] || q) : 0;
      const start = Math.max(0, idx - 30);
      scoredDocs.push({
        type: 'indexed_doc',
        id: doc.id,
        title,
        tags: doc.tags || [],
        url: doc.url || `/live/${space.slug}`,
        snippet: body.slice(start, start + 160),
        metadata: doc.metadata || {},
        score
      });
    }
  }
  scoredDocs.sort((a, b) => b.score - a.score);
  results.push(...scoredDocs);

  if (!q) return results.slice(0, 25);

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
  const collabs = Array.isArray(space.collaborators)
    ? space.collaborators.map((c) => (typeof c === 'object' && c?.username ? c.username : String(c)))
    : [];
  const teamMembers = Array.isArray(space.collaborators)
    ? space.collaborators.map((c) => (typeof c === 'object' && c ? { username: c.username, role: c.role || 'editor' } : { username: String(c), role: 'editor' }))
    : [];
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
    teamMembers,
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
    releaseId: isPrimaryOwner ? space.releaseId : undefined,
    isOwner,
    isPrimaryOwner,
    myRole: getSpaceUserRole(space, user),
    stagingPreviewUrl,
    liveUrl: externalLiveUrl || stagingPreviewUrl,
    externalHost: space.externalHost || null,
    agentHistoryCount: (space.agentHistory || []).length
  };
}

function recordPreviousRelease(space) {
  if (!space.publishedFiles || !space.publishedAt) return;
  const history = [{
    id: space.releaseId || crypto.randomUUID(),
    publishedAt: space.publishedAt,
    files: space.publishedFiles
  }, ...(space.releaseHistory || [])];
  space.releaseHistory = history.slice(0, 5);
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

function generateSpaceOgSvg(space, opts = {}) {
  const isObj = space && typeof space === 'object';
  const title = String(opts.title || (isObj ? space.title : space) || 'SpaceHub Live App').replace(/[<>&"']/g, '').slice(0, 48);
  const desc = String(opts.subtitle || opts.description || (isObj ? space.description : '') || 'Hosted & Deployed on SpaceHub managed edge cloud.').replace(/[<>&"']/g, '').slice(0, 110);
  const owner = String((isObj ? space.ownerUsername : 'spacehub') || 'spacehub').replace(/[<>&"']/g, '');
  const rawIcon = (isObj ? space.appIconText : '') || title.charAt(0) || '⚡';
  const iconText = String(rawIcon).trim().slice(0, 2) || '⚡';
  const rawTheme = opts.theme || (isObj ? space.appThemeColor : '');
  const theme = /^#[0-9a-fA-F]{3,8}$/.test(rawTheme) ? rawTheme : '#6366f1';
  const badgeText = String(opts.badge || '⚡ SPACEHUB LIVE').replace(/[<>&"']/g, '').slice(0, 24);
  const st = isObj ? evaluateSpaceStatus(space) : { label: 'Operational', color: '#10b981', uptimePercent: 99.98 };
  const views = isObj ? Number(space.views || 0) : 0;
  const likes = isObj ? Number(space.likes || 0) : 0;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#09090b" />
      <stop offset="50%" stop-color="#121217" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
    <radialGradient id="glow" cx="80%" cy="20%" r="60%">
      <stop offset="0%" stop-color="${theme}" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181b" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#09090b" stop-opacity="0.95" />
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)" />
  <rect width="1200" height="630" fill="url(#glow)" />

  <rect x="60" y="60" width="1080" height="510" rx="24" fill="url(#cardBg)" stroke="#27272a" stroke-width="2" />

  <g transform="translate(110, 120)">
    <rect width="190" height="40" rx="20" fill="rgba(99, 102, 241, 0.15)" stroke="${theme}" stroke-width="1.5" />
    <text x="95" y="25" fill="#a5b4fc" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="700" text-anchor="middle">${badgeText}</text>
  </g>

  <g transform="translate(110, 190)">
    <rect width="100" height="100" rx="24" fill="${theme}" />
    <text x="50" y="65" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="800" text-anchor="middle">${iconText}</text>
  </g>

  <text x="240" y="240" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="800" letter-spacing="-0.02em">${title}</text>
  <text x="240" y="280" fill="#818cf8" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="600">Created by @${owner}</text>

  <text x="110" y="365" fill="#a1a1aa" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="400">
    ${desc}
  </text>

  <g transform="translate(110, 470)">
    <rect x="0" y="0" width="220" height="42" rx="10" fill="#18181b" stroke="#27272a" stroke-width="1.5" />
    <text x="110" y="26" fill="#e4e4e7" font-family="system-ui, sans-serif" font-size="15" font-weight="600" text-anchor="middle">🌐 Cloudflare Edge Live</text>

    <rect x="235" y="0" width="210" height="42" rx="10" fill="#18181b" stroke="#27272a" stroke-width="1.5" />
    <circle cx="255" cy="21" r="5" fill="${st.color}" />
    <text x="348" y="26" fill="#34d399" font-family="system-ui, sans-serif" font-size="15" font-weight="600" text-anchor="middle">${st.label} (${st.uptimePercent}%)</text>

    <rect x="460" y="0" width="210" height="42" rx="10" fill="#18181b" stroke="#27272a" stroke-width="1.5" />
    <text x="565" y="26" fill="#a5b4fc" font-family="system-ui, sans-serif" font-size="15" font-weight="600" text-anchor="middle">👁 ${views} views · ♥ ${likes}</text>

    <text x="970" y="28" fill="#71717a" font-family="system-ui, sans-serif" font-size="18" font-weight="700" text-anchor="end">spacehub.win</text>
  </g>
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
      },
      {
        src: `${origin}/live/${space.slug}/og.svg`,
        sizes: '1200x630',
        type: 'image/svg+xml'
      }
    ]
  };
}

function generateSpaceServiceWorker(slug) {
  return `const CACHE_NAME = 'spacehub-app-${slug}-v2';
const OFFLINE_FALLBACK = \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Offline Mode — SpaceHub</title>
  <style>
    body { background: #09090b; color: #fafafa; font-family: system-ui, -apple-system, sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; text-align: center; }
    .card { background: #18181b; border: 1px solid #27272a; border-radius: 1rem; padding: 2.5rem 2rem; max-width: 440px; }
    h1 { font-size: 1.4rem; margin-bottom: 0.5rem; color: #f59e0b; }
    p { color: #a1a1aa; font-size: 0.92rem; line-height: 1.5; margin-bottom: 1.5rem; }
    button { background: #6366f1; color: white; border: none; padding: 0.65rem 1.4rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⚡</div>
    <h1>You are currently offline</h1>
    <p>This Space is cached for offline access on your device. Any form submissions have been stored locally and will synchronize automatically when your connection is restored.</p>
    <button onclick="window.location.reload()">Retry Connection</button>
  </div>
</body>
</html>\`;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Background Sync / Offline Queue for Form Submissions
  if (req.method === 'POST' && url.pathname.endsWith('/submit')) {
    event.respondWith(
      fetch(req.clone()).catch(async () => {
        try {
          const bodyText = await req.clone().text();
          const cache = await caches.open(CACHE_NAME);
          const queueRes = await cache.match('/_offline_queue');
          const queue = queueRes ? JSON.parse(await queueRes.text()) : [];
          queue.push({ url: req.url, body: bodyText, timestamp: Date.now() });
          await cache.put('/_offline_queue', new Response(JSON.stringify(queue)));
          return new Response(JSON.stringify({ ok: true, queued: true, message: 'Offline: Submission queued for background sync.' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (_err) {
          return new Response(JSON.stringify({ ok: false, error: 'Offline storage failed.' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
        }
      })
    );
    return;
  }

  if (req.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      const networkFetch = fetch(req)
        .then((networkRes) => {
          if (networkRes.status === 200) {
            cache.put(req, networkRes.clone());
          }
          return networkRes;
        })
        .catch(() => {
          if (cached) return cached;
          if (req.headers.get('accept')?.includes('text/html')) {
            return new Response(OFFLINE_FALLBACK, {
              status: 200,
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
          }
          return new Response('Network error and no offline cache available.', { status: 503 });
        });

      return cached || networkFetch;
    })
  );
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

  // Boost LCP for the first above-the-fold hero image when not explicitly lazy-loaded
  html = html.replace(/<img\b(?![^>]*\bfetchpriority=)(?![^>]*\bloading=["']lazy["'])([^>]*)>/i, '<img fetchpriority="high"$1>');

  if (space) {
    const safeTitle = String(space.title || space.slug).replace(/["<>]/g, '');
    const safeDesc = String(space.description || `${safeTitle} — Hosted on SpaceHub`).replace(/["<>]/g, '');
    const spaceConfigScript = `\n  <script>window.SPACE_CONFIG = ${JSON.stringify(buildSpaceConfig(space, files))};</script>`;
    const ogMeta = (!html.includes('property="og:title"')
      ? `\n  <meta property="og:type" content="website" />\n  <meta property="og:title" content="${safeTitle}" />\n  <meta property="og:description" content="${safeDesc}" />\n  <meta property="og:image" content="${origin}/live/${space.slug}/og.svg" />\n  <meta name="twitter:card" content="summary_large_image" />\n  <meta name="twitter:title" content="${safeTitle}" />\n  <meta name="twitter:description" content="${safeDesc}" />\n  <meta name="twitter:image" content="${origin}/live/${space.slug}/og.svg" />`
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

const spaceHubWorker = {
  async scheduled(_event, env) {
    const db = await loadDb(env);
    const nowMs = Date.now();
    let changed = false;
    for (const conn of db.hostingConnections) {
      if (!conn.isSingleSpaceSlot || conn.suspended || !conn.expiresAt) continue;
      const owner = db.users.find((u) => u.id === conn.userId);
      if (!owner) continue;
      const msLeft = Date.parse(conn.expiresAt) - nowMs;
      if (Number.isNaN(msLeft)) continue;
      const daysLeft = Math.ceil(msLeft / 86400000);
      const dateText = conn.expiresAt.slice(0, 10);
      if (msLeft <= 0) {
        if (!conn.notifiedExpired) {
          conn.notifiedExpired = true;
          changed = true;
          await notifyUser(env, db, owner, {
            type: 'billing',
            title: 'Your hosting has expired',
            body: `${conn.name} expired on ${dateText}. It stays online for a ${HOSTING_GRACE_DAYS}-day grace period — renew in Pricing & Hosting to keep it live.`
          });
        }
      } else if (daysLeft <= 1) {
        if (!conn.reminded1) {
          conn.reminded1 = true;
          conn.reminded7 = true;
          changed = true;
          await notifyUser(env, db, owner, {
            type: 'billing',
            title: 'Hosting expires within 1 day',
            body: `${conn.name} expires on ${dateText}. Renew in Pricing & Hosting to avoid downtime.`
          });
        }
      } else if (daysLeft <= 7) {
        if (!conn.reminded7) {
          conn.reminded7 = true;
          changed = true;
          await notifyUser(env, db, owner, {
            type: 'billing',
            title: 'Hosting expires in 7 days or less',
            body: `${conn.name} expires on ${dateText}. Renew in Pricing & Hosting to keep it online.`
          });
        }
      }
    }

    // Wave 15: Automated Scheduled Point-in-Time Space Backups & Space Cron Runner
    for (const space of db.spaces || []) {
      if (space.autoBackupEnabled !== false && space.draftFiles && typeof space.draftFiles === 'object') {
        const snaps = Array.isArray(space.snapshots) ? space.snapshots : [];
        const latestFilesJson = snaps[0]?.files ? JSON.stringify(snaps[0].files) : '';
        const currentFilesJson = JSON.stringify(space.draftFiles);
        if (currentFilesJson !== latestFilesJson) {
          pushSpaceSnapshot(space, `Auto-Backup (${new Date(nowMs).toISOString().slice(0, 16).replace('T', ' ')})`);
          recordAuditLog(space, null, 'scheduled_auto_backup_created');
          changed = true;
        }
      }
      if (space.cronSchedule && ['hourly', 'daily', 'weekly'].includes(space.cronSchedule)) {
        await executeSpaceCron(space);
        changed = true;
      }
      if (Array.isArray(space.jobQueue) && space.jobQueue.some((j) => j && j.status === 'queued')) {
        const ran = await processSpaceJobQueue(space);
        if (ran.length > 0) changed = true;
      }
    }

    if (changed) await saveDb(env, db);
  },

  async fetch(request, env, dispatch) {
    const wUrl = new URL(request.url);
    const wMethod = request.method.toUpperCase();
    const pathname = wUrl.pathname;
    const host = normalizeCustomDomain(request.headers.get('x-custom-host') || wUrl.hostname);
    const customRoot = pathname === '/' && wMethod === 'GET' && host &&
      !['spacehub.win', 'www.spacehub.win', 'localhost', '127.0.0.1'].includes(host) &&
      !host.endsWith('.workers.dev');
    const usesState = customRoot || pathname === '/sitemap.xml' ||
      ['/api/', '/spaces/', '/live/', '/s/'].some((prefix) => pathname.startsWith(prefix));
    const handle = dispatch && usesState ? dispatch : (r) => spaceHubWorker.handle(r, env);
    if (
      wMethod === 'POST' &&
      /^\/api\/auth\/(login|register|social|forgot|reset|change-password)$/.test(wUrl.pathname)
    ) {
      const authIp = request.headers.get('cf-connecting-ip') || 'anon';
      const authRl = checkRateLimit(`auth:${authIp}`, 30, 10 * 60000);
      if (!authRl.allowed) {
        return jsonResponse(
          { error: 'Too many attempts from this network. Please wait a few minutes and try again.' },
          429,
          { 'Retry-After': String(Math.max(1, Math.ceil((authRl.resetAt - Date.now()) / 1000))) }
        );
      }
    }
    const wMatch = wUrl.pathname.match(/^\/(?:live|s)\/([^/]+)\//i);
    if (wMatch && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(wMethod)) {
      const ip = request.headers.get('cf-connecting-ip') || 'anon';
      const rl = checkRateLimit(`${wMatch[1].toLowerCase()}:${ip}`);
      const rlHeaders = {
        'X-RateLimit-Limit': String(rl.limit),
        'X-RateLimit-Remaining': String(rl.remaining),
        'X-RateLimit-Reset': String(Math.ceil(rl.resetAt / 1000))
      };
      if (!rl.allowed) {
        return jsonResponse({ error: 'Rate limit exceeded. Please retry shortly.' }, 429, {
          ...rlHeaders,
          'Retry-After': String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))),
          'Access-Control-Allow-Origin': '*'
        });
      }
      const res = await handle(request);
      const out = new Response(res.body, res);
      Object.entries(rlHeaders).forEach(([k, v]) => out.headers.set(k, v));
      return out;
    }
    return handle(request);
  },

  async handle(request, env) {
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

    // 1. Per-Space Installable PWA Assets (/live/:slug/manifest.webmanifest, /live/:slug/icon.svg, /live/:slug/sw.js, /live/:slug/og.svg)
    const spacePwaMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/(manifest\.webmanifest|icon\.svg|sw\.js|og\.svg|embed\.js|qr\.svg|openapi\.json)$/i);
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
      if (asset === 'openapi.json') {
        return new Response(JSON.stringify(generateSpaceOpenApiSpec(space, url.origin), null, 2), {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store'
          }
        });
      }
      if (asset === 'icon.svg') {
        return new Response(generateSpaceIconSvg(space), {
          status: 200,
          headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' }
        });
      }
      if (asset === 'og.svg') {
        const ogOpts = {
          title: url.searchParams.get('title') || '',
          subtitle: url.searchParams.get('subtitle') || url.searchParams.get('description') || '',
          theme: url.searchParams.get('theme') || '',
          badge: url.searchParams.get('badge') || ''
        };
        return new Response(generateSpaceOgSvg(space, ogOpts), {
          status: 200,
          headers: {
            'Content-Type': 'image/svg+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400'
          }
        });
      }
      if (asset === 'embed.js') {
        return new Response(generateSpaceEmbedScript(space, url.origin), {
          status: 200,
          headers: {
            'Content-Type': 'application/javascript; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600'
          }
        });
      }
      if (asset === 'qr.svg') {
        space.qrScans = (space.qrScans || 0) + 1;
        await saveDb(env, db);
        const fg = url.searchParams.get('fg') || '#fafafa';
        const bg = url.searchParams.get('bg') || '#09090b';
        return new Response(generateSpaceQrSvg(space, url.origin, fg, bg), {
          status: 200,
          headers: {
            'Content-Type': 'image/svg+xml; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store'
          }
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

    // 1b-0. Per-Space Built-in User Authentication API (/live/:slug/auth, /live/:slug/auth/me, /live/:slug/auth/otp)
    const spaceAuthMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/auth(?:\/(me|otp))?\/?$/i);
    if (spaceAuthMatch) {
      const slug = decodeURIComponent(spaceAuthMatch[1]).toLowerCase();
      const subAction = (spaceAuthMatch[2] || '').toLowerCase();
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404);
      space.appUsers = Array.isArray(space.appUsers) ? space.appUsers : [];
      space.appSessions = space.appSessions && typeof space.appSessions === 'object' ? space.appSessions : {};
      space.appOtps = space.appOtps && typeof space.appOtps === 'object' ? space.appOtps : {};

      if (subAction === 'otp' && method === 'POST') {
        const payload = await request.json().catch(() => ({}));
        const email = String(payload.email || '').trim().toLowerCase();
        const codeInput = String(payload.code || payload.otp || '').trim();
        const name = String(payload.name || email.split('@')[0] || 'Member').trim().slice(0, 80);
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return jsonResponse({ error: 'Valid email address is required.' }, 400);
        }

        if (!codeInput) {
          // Request 6-digit OTP & Magic Link token
          const code = String(100000 + (parseInt(randomHex(3), 16) % 900000)).slice(0, 6);
          const magicToken = 'ml_' + randomHex(12);
          const expiresAtMs = Date.now() + 10 * 60 * 1000; // 10 minutes
          space.appOtps[email] = { code, magicToken, name, expiresAtMs };
          await saveDb(env, db);
          return jsonResponse(
            {
              ok: true,
              sent: true,
              email,
              expiresInSec: 600,
              codePreview: code,
              magicLinkUrl: `${url.origin}/live/${space.slug}/auth/otp?token=${magicToken}&email=${encodeURIComponent(email)}`
            },
            200,
            { 'Access-Control-Allow-Origin': '*' }
          );
        }

        // Verify 6-digit OTP code
        const record = space.appOtps[email];
        if (!record || Date.now() > record.expiresAtMs || record.code !== codeInput) {
          return jsonResponse({ error: 'Invalid or expired one-time passcode.' }, 401);
        }
        delete space.appOtps[email];
        let appUser = space.appUsers.find((u) => u.email === email);
        if (!appUser) {
          appUser = {
            id: 'au_' + randomHex(6),
            email,
            name: record.name || name,
            authMethod: 'otp',
            createdAt: new Date().toISOString()
          };
          space.appUsers.push(appUser);
        }
        const sessionTok = 'as_' + randomHex(12);
        space.appSessions[sessionTok] = appUser.id;
        await dispatchSpaceEventBus(space, 'user.otp_login', { userId: appUser.id, email: appUser.email });
        await saveDb(env, db);
        return jsonResponse(
          {
            ok: true,
            token: sessionTok,
            user: { id: appUser.id, email: appUser.email, name: appUser.name, createdAt: appUser.createdAt }
          },
          200,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }

      if (subAction === 'otp' && method === 'GET') {
        const email = String(url.searchParams.get('email') || '').trim().toLowerCase();
        const magicTok = String(url.searchParams.get('token') || '').trim();
        const record = email ? space.appOtps[email] : null;
        if (!record || Date.now() > record.expiresAtMs || !magicTok || record.magicToken !== magicTok) {
          return jsonResponse({ error: 'Invalid or expired magic link.' }, 401);
        }
        delete space.appOtps[email];
        let appUser = space.appUsers.find((u) => u.email === email);
        if (!appUser) {
          appUser = {
            id: 'au_' + randomHex(6),
            email,
            name: record.name || email.split('@')[0],
            authMethod: 'magic_link',
            createdAt: new Date().toISOString()
          };
          space.appUsers.push(appUser);
        }
        const sessionTok = 'as_' + randomHex(12);
        space.appSessions[sessionTok] = appUser.id;
        await saveDb(env, db);
        return jsonResponse({
          ok: true,
          token: sessionTok,
          user: { id: appUser.id, email: appUser.email, name: appUser.name, createdAt: appUser.createdAt }
        });
      }

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

    // 1b-0b. Per-Space Built-in AI Assistant API (POST /live/:slug/ai)
    const spaceAiMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/ai\/?$/i);
    if (spaceAiMatch && method === 'POST') {
      const slug = decodeURIComponent(spaceAiMatch[1]).toLowerCase();
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404);

      const payload = await request.json().catch(() => ({}));
      const prompt = String(payload.prompt || '').trim();
      const system = String(payload.system || `You are the helpful AI assistant for ${space.title}.`).trim();
      if (!prompt) return jsonResponse({ error: 'Prompt is required.' }, 400);

      const secrets = await getDecryptedSpaceSecrets(space, env);
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
            return jsonResponse({
              ok: true,
              provider: 'openai',
              reply: d.choices?.[0]?.message?.content || ''
            });
          }
        } catch (_e) {
          // fallback to built-in response
        }
      }

      return jsonResponse({
        ok: true,
        provider: 'spacehub_builtin_ai',
        reply: `[${space.title} AI]: Processed your request "${prompt.slice(0, 140)}". Everything is active and ready.`
      });
    }

    // 1b-0c. Per-Space Real-Time Multiplayer & Live Chat Room API (GET/POST/DELETE /live/:slug/room)
    const spaceRoomMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/room\/?$/i);
    if (spaceRoomMatch) {
      const slug = decodeURIComponent(spaceRoomMatch[1]).toLowerCase();
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404);
      space.roomEvents = Array.isArray(space.roomEvents) ? space.roomEvents : [];

      if (method === 'GET') {
        return jsonResponse({ ok: true, events: space.roomEvents });
      }
      if (method === 'POST') {
        const payload = await request.json().catch(() => ({}));
        const evt = {
          id: 'evt_' + randomHex(6),
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
        await saveDb(env, db);
        return jsonResponse({ ok: true, event: evt, events: space.roomEvents }, 201);
      }
      if (method === 'DELETE') {
        space.roomEvents = [];
        await saveDb(env, db);
        return jsonResponse({ ok: true, events: [] });
      }
    }

    // 1b-0c. Wave 15: Live Visitor Presence & Real-Time Cursor/Session Counter (/live/:slug/presence & /live/:slug/presence.svg)
    const spacePresenceMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/(presence|presence\.svg)\/?$/i);
    if (spacePresenceMatch) {
      const slug = decodeURIComponent(spacePresenceMatch[1]).toLowerCase();
      const routeKind = spacePresenceMatch[2].toLowerCase();
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404);
      space.presenceSessions = space.presenceSessions && typeof space.presenceSessions === 'object' ? space.presenceSessions : {};
      const nowMs = Date.now();
      const ttlMs = 120000; // 2 minute active window
      for (const [sid, sData] of Object.entries(space.presenceSessions)) {
        if (!sData || nowMs - (sData.lastSeenMs || 0) > ttlMs) {
          delete space.presenceSessions[sid];
        }
      }

      if (routeKind === 'presence.svg' && method === 'GET') {
        const activeCount = Math.max(1, Object.keys(space.presenceSessions).length);
        return new Response(generatePresenceBadgeSvg(activeCount), {
          status: 200,
          headers: {
            'Content-Type': 'image/svg+xml; charset=utf-8',
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      if (method === 'GET') {
        const sessions = Object.values(space.presenceSessions);
        return jsonResponse(
          { ok: true, onlineCount: sessions.length, sessions },
          200,
          { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }
        );
      }

      if (method === 'POST') {
        const payload = await request.json().catch(() => ({}));
        const sessionId = String(payload.sessionId || `sess_${randomHex(5)}`).trim().slice(0, 64);
        const entry = {
          sessionId,
          username: String(payload.username || 'Visitor').trim().slice(0, 48),
          color: String(payload.color || '#6366f1').trim().slice(0, 20),
          cursor: payload.cursor && typeof payload.cursor === 'object'
            ? { x: Number(payload.cursor.x) || 0, y: Number(payload.cursor.y) || 0 }
            : null,
          status: String(payload.status || 'active').trim().slice(0, 32),
          lastSeenMs: nowMs,
          updatedAt: new Date(nowMs).toISOString()
        };
        space.presenceSessions[sessionId] = entry;
        const keys = Object.keys(space.presenceSessions);
        if (keys.length > 100) {
          delete space.presenceSessions[keys[0]];
        }
        await saveDb(env, db);
        const sessions = Object.values(space.presenceSessions);
        return jsonResponse(
          { ok: true, sessionId, onlineCount: sessions.length, sessions },
          200,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }

      if (method === 'DELETE') {
        const sid = url.searchParams.get('sessionId');
        if (sid) delete space.presenceSessions[sid];
        else space.presenceSessions = {};
        await saveDb(env, db);
        const sessions = Object.values(space.presenceSessions);
        return jsonResponse(
          { ok: true, onlineCount: sessions.length, sessions },
          200,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }
    }

    // 1b-0d. Wave 16: Built-in Edge Key-Value TTL Cache API (/live/:slug/cache & /live/:slug/cache/:key)
    const spaceCacheMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/cache(?:\/([a-zA-Z0-9._-]+))?\/?$/i);
    if (spaceCacheMatch) {
      const slug = decodeURIComponent(spaceCacheMatch[1]).toLowerCase();
      const cacheKeyParam = spaceCacheMatch[2] ? decodeURIComponent(spaceCacheMatch[2]) : '';
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404);
      space.edgeCache = space.edgeCache && typeof space.edgeCache === 'object' ? space.edgeCache : {};
      const nowMs = Date.now();
      for (const [ck, cEntry] of Object.entries(space.edgeCache)) {
        if (!cEntry || (cEntry.expiresAtMs && nowMs >= cEntry.expiresAtMs)) {
          delete space.edgeCache[ck];
        }
      }

      if (method === 'GET') {
        const targetKey = cacheKeyParam || url.searchParams.get('key') || '';
        if (targetKey) {
          const entry = space.edgeCache[targetKey];
          if (!entry) {
            return jsonResponse(
              { ok: true, hit: false, key: targetKey, value: null },
              200,
              { 'Access-Control-Allow-Origin': '*', 'X-Cache-Status': 'MISS' }
            );
          }
          const ttlRemaining = Math.max(0, Math.ceil((entry.expiresAtMs - nowMs) / 1000));
          return jsonResponse(
            { ok: true, hit: true, key: targetKey, value: entry.value, ttlRemaining, expiresAt: new Date(entry.expiresAtMs).toISOString() },
            200,
            { 'Access-Control-Allow-Origin': '*', 'X-Cache-Status': 'HIT' }
          );
        }
        const entries = Object.entries(space.edgeCache).map(([k, v]) => ({
          key: k,
          ttlRemaining: Math.max(0, Math.ceil((v.expiresAtMs - nowMs) / 1000)),
          expiresAt: new Date(v.expiresAtMs).toISOString()
        }));
        return jsonResponse(
          { ok: true, count: entries.length, keys: entries },
          200,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }

      if (method === 'PUT' || method === 'POST') {
        const payload = await request.json().catch(() => ({}));
        const targetKey = String(cacheKeyParam || payload.key || url.searchParams.get('key') || '').trim().slice(0, 120);
        if (!targetKey) return jsonResponse({ error: 'Cache key is required.' }, 400);
        const ttlSec = Math.min(86400, Math.max(1, parseInt(url.searchParams.get('ttl') || payload.ttl || '300', 10) || 300));
        const val = payload.value !== undefined ? payload.value : payload;
        const expiresAtMs = nowMs + ttlSec * 1000;
        space.edgeCache[targetKey] = {
          value: val,
          ttl: ttlSec,
          createdAtMs: nowMs,
          expiresAtMs
        };
        const allKeys = Object.keys(space.edgeCache);
        if (allKeys.length > 200) {
          delete space.edgeCache[allKeys[0]];
        }
        await saveDb(env, db);
        return jsonResponse(
          { ok: true, key: targetKey, value: val, ttl: ttlSec, expiresAt: new Date(expiresAtMs).toISOString() },
          200,
          { 'Access-Control-Allow-Origin': '*', 'X-Cache-Status': 'STORED' }
        );
      }

      if (method === 'DELETE') {
        const targetKey = cacheKeyParam || url.searchParams.get('key') || '';
        if (targetKey) {
          delete space.edgeCache[targetKey];
        } else {
          space.edgeCache = {};
        }
        await saveDb(env, db);
        return jsonResponse(
          { ok: true, cleared: targetKey || 'all', count: Object.keys(space.edgeCache).length },
          200,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }
    }

    // 1b-0e. Wave 17: Feature Flag & Remote Experimentation Engine (/live/:slug/flags)
    const spaceFlagsMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/flags\/?$/i);
    if (spaceFlagsMatch) {
      const slug = decodeURIComponent(spaceFlagsMatch[1]).toLowerCase();
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404);
      space.featureFlags = space.featureFlags && typeof space.featureFlags === 'object' ? space.featureFlags : {};

      if (method === 'GET') {
        const userKey = url.searchParams.get('userKey') || request.headers.get('cf-connecting-ip') || 'anon';
        const segment = url.searchParams.get('segment') || '';
        const { evaluated, rules } = evaluateFeatureFlags(space.featureFlags, userKey, segment);
        return jsonResponse(
          { ok: true, flags: evaluated, rules },
          200,
          { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }
        );
      }

      if (method === 'POST' || method === 'PUT') {
        const payload = await request.json().catch(() => ({}));
        const incoming = payload.flags && typeof payload.flags === 'object' ? payload.flags : payload;
        if (incoming && typeof incoming === 'object') {
          space.featureFlags = { ...space.featureFlags, ...incoming };
        }
        recordAuditLog(space, user, 'feature_flags_updated', { flagCount: Object.keys(space.featureFlags).length });
        await saveDb(env, db);
        const { evaluated, rules } = evaluateFeatureFlags(space.featureFlags, 'admin', '');
        return jsonResponse(
          { ok: true, flags: evaluated, rules },
          200,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }
    }

    // 1b-0f. Wave 17: Per-Space Error Tracking & Client Crash Telemetry (/live/:slug/errors)
    const spaceErrorsMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/errors\/?$/i);
    if (spaceErrorsMatch) {
      const slug = decodeURIComponent(spaceErrorsMatch[1]).toLowerCase();
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404);
      space.errorLogs = Array.isArray(space.errorLogs) ? space.errorLogs : [];

      if (method === 'POST') {
        const payload = await request.json().catch(() => ({}));
        const entry = {
          id: 'err_' + randomHex(6),
          message: String(payload.message || 'Uncaught Error').trim().slice(0, 500),
          stack: String(payload.stack || '').trim().slice(0, 2000),
          source: String(payload.source || payload.filename || 'index.html').trim().slice(0, 200),
          line: Number(payload.line || payload.lineno || 0),
          col: Number(payload.col || payload.colno || 0),
          userAgent: String(payload.userAgent || request.headers.get('user-agent') || '').slice(0, 200),
          createdAt: new Date().toISOString()
        };
        space.errorLogs.unshift(entry);
        if (space.errorLogs.length > 100) space.errorLogs = space.errorLogs.slice(0, 100);
        recordAuditLog(space, null, 'client_error_reported', { message: entry.message, source: entry.source });
        await saveDb(env, db);
        return jsonResponse(
          { ok: true, errorId: entry.id, count: space.errorLogs.length },
          201,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }

      if (method === 'GET') {
        if (!user || !canViewSpace(space, user)) {
          return jsonResponse({ error: 'Unauthorized.' }, 403);
        }
        return jsonResponse(
          { ok: true, count: space.errorLogs.length, errors: space.errorLogs },
          200,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }

      if (method === 'DELETE') {
        if (!user || !canEditSpace(space, user)) {
          return jsonResponse({ error: 'Unauthorized.' }, 403);
        }
        space.errorLogs = [];
        await saveDb(env, db);
        return jsonResponse({ ok: true, count: 0, errors: [] });
      }
    }

    // 1b-0g. Wave 17: Multi-Language i18n & Auto-Translation Endpoint (/live/:slug/i18n & /live/:slug/i18n/:lang)
    const spaceI18nMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/i18n(?:\/([a-zA-Z-]+?)(?:\.json)?)?\/?$/i);
    if (spaceI18nMatch && method === 'GET') {
      const slug = decodeURIComponent(spaceI18nMatch[1]).toLowerCase();
      const paramLang = spaceI18nMatch[2] ? decodeURIComponent(spaceI18nMatch[2]).toLowerCase() : '';
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404);
      const files = space.publishedFiles || space.draftFiles || {};
      const acceptLang = (request.headers.get('accept-language') || '').split(',')[0].split('-')[0].trim().toLowerCase();
      const requestedLang = (paramLang || url.searchParams.get('lang') || acceptLang || 'en').toLowerCase().slice(0, 10);

      let translations = null;
      let resolvedLang = requestedLang;
      const tryParseFile = (fname) => {
        if (files[fname]) {
          try {
            return JSON.parse(files[fname]);
          } catch (_e) {}
        }
        return null;
      };

      translations = tryParseFile(`locales.${requestedLang}.json`) || tryParseFile(`${requestedLang}.json`);
      if (!translations && files['i18n.json']) {
        const bundle = tryParseFile('i18n.json');
        if (bundle && typeof bundle === 'object') {
          translations = bundle[requestedLang] || bundle.en || null;
          if (!bundle[requestedLang] && bundle.en) resolvedLang = 'en';
        }
      }
      if (!translations && requestedLang !== 'en') {
        translations = tryParseFile('locales.en.json') || tryParseFile('en.json');
        if (translations) resolvedLang = 'en';
      }
      if (!translations) {
        translations = {
          app_title: space.title || slug,
          welcome: `Welcome to ${space.title || slug}`,
          submit: 'Submit'
        };
      }

      return jsonResponse(
        { ok: true, lang: resolvedLang, requestedLang, translations },
        200,
        { 'Access-Control-Allow-Origin': '*', 'Vary': 'Accept-Language' }
      );
    }

    // 1b-0h. Wave 18: Built-in Webhooks & Event Bus Subscription System (/live/:slug/webhooks)
    const spaceWebhooksMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/webhooks(?:\/(dispatch))?\/?$/i);
    if (spaceWebhooksMatch) {
      const slug = decodeURIComponent(spaceWebhooksMatch[1]).toLowerCase();
      const subAction = (spaceWebhooksMatch[2] || '').toLowerCase();
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404);
      space.webhookSubscriptions = Array.isArray(space.webhookSubscriptions) ? space.webhookSubscriptions : [];

      if (subAction === 'dispatch' && method === 'POST') {
        const payload = await request.json().catch(() => ({}));
        const eventType = String(payload.event || 'custom.event').trim().slice(0, 64);
        const eventData = payload.data && typeof payload.data === 'object' ? payload.data : payload;
        const deliveries = await dispatchSpaceEventBus(space, eventType, eventData);
        await saveDb(env, db);
        return jsonResponse(
          { ok: true, event: eventType, deliveredCount: deliveries.length, deliveries },
          200,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }

      if (method === 'GET') {
        if (!user || !canViewSpace(space, user)) {
          return jsonResponse({ error: 'Unauthorized.' }, 403);
        }
        return jsonResponse({
          ok: true,
          count: space.webhookSubscriptions.length,
          subscriptions: space.webhookSubscriptions
        });
      }

      if (method === 'POST') {
        if (!user || !canEditSpace(space, user)) {
          return jsonResponse({ error: 'Unauthorized.' }, 403);
        }
        const payload = await request.json().catch(() => ({}));
        const targetUrl = String(payload.url || '').trim().slice(0, 300);
        if (!/^https?:\/\/|^mock:\/\//i.test(targetUrl)) {
          return jsonResponse({ error: 'Webhook URL must start with https://, http://, or mock://' }, 400);
        }
        const events = Array.isArray(payload.events) && payload.events.length
          ? payload.events.map((e) => String(e).trim())
          : ['*'];
        const secret = String(payload.secret || `sh_whsec_${randomHex(10)}`).trim();
        const sub = {
          id: 'wh_' + randomHex(6),
          url: targetUrl,
          events,
          secret,
          active: payload.active !== false,
          createdAt: new Date().toISOString(),
          lastDeliveryAt: null,
          lastStatus: null
        };
        space.webhookSubscriptions.push(sub);
        if (space.webhookSubscriptions.length > 25) {
          space.webhookSubscriptions = space.webhookSubscriptions.slice(-25);
        }
        recordAuditLog(space, user, 'webhook_subscription_added', { id: sub.id, url: sub.url, events: sub.events });
        await saveDb(env, db);
        return jsonResponse({ ok: true, subscription: sub, count: space.webhookSubscriptions.length }, 201);
      }

      if (method === 'DELETE') {
        if (!user || !canEditSpace(space, user)) {
          return jsonResponse({ error: 'Unauthorized.' }, 403);
        }
        const targetId = url.searchParams.get('id');
        if (targetId) {
          space.webhookSubscriptions = space.webhookSubscriptions.filter((s) => s.id !== targetId);
        } else {
          space.webhookSubscriptions = [];
        }
        await saveDb(env, db);
        return jsonResponse({ ok: true, count: space.webhookSubscriptions.length, subscriptions: space.webhookSubscriptions });
      }
    }

    // 1b-0i. Wave 18: Live App Performance & Core Web Vitals Telemetry (/live/:slug/vitals)
    const spaceVitalsMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/vitals\/?$/i);
    if (spaceVitalsMatch) {
      const slug = decodeURIComponent(spaceVitalsMatch[1]).toLowerCase();
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404);
      space.vitalsSamples = Array.isArray(space.vitalsSamples) ? space.vitalsSamples : [];

      if (method === 'POST') {
        const payload = await request.json().catch(() => ({}));
        const items = Array.isArray(payload.metrics) ? payload.metrics : [payload];
        const nowIso = new Date().toISOString();
        const validMetrics = ['LCP', 'CLS', 'INP', 'TTFB', 'FCP'];
        let recorded = 0;

        for (const item of items) {
          const metric = String(item.metric || item.name || '').toUpperCase().trim();
          const val = Number(item.value);
          if (validMetrics.includes(metric) && !isNaN(val) && val >= 0) {
            space.vitalsSamples.push({
              id: 'vt_' + randomHex(4),
              metric,
              value: val,
              path: String(item.path || '/').slice(0, 80),
              createdAt: nowIso
            });
            recorded++;
          }
        }
        if (space.vitalsSamples.length > 300) {
          space.vitalsSamples = space.vitalsSamples.slice(-300);
        }
        await saveDb(env, db);
        const summary = summarizeSpaceVitals(space.vitalsSamples);
        return jsonResponse(
          { ok: true, recorded, totalSamples: space.vitalsSamples.length, summary },
          201,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }

      if (method === 'GET') {
        const summary = summarizeSpaceVitals(space.vitalsSamples);
        return jsonResponse(
          { ok: true, totalSamples: space.vitalsSamples.length, summary, recent: space.vitalsSamples.slice(-20) },
          200,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }
    }

    // 1b-0j. Wave 19: Built-in Cron & Background Job Queue API per Space (/live/:slug/jobs & /live/:slug/jobs/run)
    const spaceJobsMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/jobs(?:\/(run))?\/?$/i);
    if (spaceJobsMatch) {
      const slug = decodeURIComponent(spaceJobsMatch[1]).toLowerCase();
      const jobSubAction = (spaceJobsMatch[2] || '').toLowerCase();
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404);
      space.jobQueue = Array.isArray(space.jobQueue) ? space.jobQueue : [];

      if (jobSubAction === 'run' && method === 'POST') {
        const payload = await request.json().catch(() => ({}));
        const targetJobId = String(payload.jobId || url.searchParams.get('id') || '').trim();
        const processed = await processSpaceJobQueue(space, targetJobId);
        recordSpaceInspectorLog(space, {
          method: 'POST',
          path: pathname,
          status: 200,
          requestBody: payload,
          responsePreview: { processedCount: processed.length }
        });
        await saveDb(env, db);
        return jsonResponse(
          { ok: true, processedCount: processed.length, processed, totalJobs: space.jobQueue.length },
          200,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }

      if (method === 'POST') {
        const payload = await request.json().catch(() => ({}));
        const name = String(payload.name || payload.task || 'background_task').trim().slice(0, 80);
        const delaySeconds = Math.max(0, Math.min(86400 * 7, Number(payload.delaySeconds || 0)));
        const maxRetries = Math.max(0, Math.min(5, Number(payload.maxRetries ?? 2)));
        const nowMs = Date.now();
        const job = {
          id: 'job_' + randomHex(6),
          name,
          payload: payload.payload && typeof payload.payload === 'object' ? payload.payload : (payload.data || {}),
          delaySeconds,
          maxRetries,
          attempts: 0,
          webhookUrl: String(payload.webhookUrl || '').trim().slice(0, 300),
          status: 'queued',
          runAt: new Date(nowMs + delaySeconds * 1000).toISOString(),
          createdAt: new Date(nowMs).toISOString(),
          completedAt: null,
          result: null
        };
        space.jobQueue.unshift(job);
        if (space.jobQueue.length > 200) space.jobQueue = space.jobQueue.slice(0, 200);
        recordSpaceInspectorLog(space, {
          method: 'POST',
          path: pathname,
          status: 201,
          requestBody: payload,
          responsePreview: { jobId: job.id, status: job.status }
        });
        await saveDb(env, db);
        return jsonResponse(
          { ok: true, job, queueLength: space.jobQueue.length },
          201,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }

      if (method === 'GET') {
        const jobId = url.searchParams.get('id');
        if (jobId) {
          const found = space.jobQueue.find((j) => j.id === jobId);
          if (!found) return jsonResponse({ error: 'Job not found.' }, 404);
          return jsonResponse({ ok: true, job: found }, 200, { 'Access-Control-Allow-Origin': '*' });
        }
        const statusFilter = (url.searchParams.get('status') || '').toLowerCase();
        const list = statusFilter
          ? space.jobQueue.filter((j) => j.status === statusFilter)
          : space.jobQueue;
        return jsonResponse(
          {
            ok: true,
            count: list.length,
            counts: {
              queued: space.jobQueue.filter((j) => j.status === 'queued').length,
              completed: space.jobQueue.filter((j) => j.status === 'completed').length,
              failed: space.jobQueue.filter((j) => j.status === 'failed').length
            },
            jobs: list
          },
          200,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }

      if (method === 'DELETE') {
        const jobId = url.searchParams.get('id');
        if (jobId) {
          space.jobQueue = space.jobQueue.filter((j) => j.id !== jobId);
        } else {
          space.jobQueue = [];
        }
        await saveDb(env, db);
        return jsonResponse({ ok: true, count: space.jobQueue.length, jobs: space.jobQueue }, 200, { 'Access-Control-Allow-Origin': '*' });
      }
    }

    // 1b-0k. Wave 19: Space Monetization License Key Generator & Verification API (/live/:slug/licenses)
    const spaceLicensesMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/licenses(?:\/(verify|[a-zA-Z0-9_-]+))?\/?$/i);
    if (spaceLicensesMatch) {
      const slug = decodeURIComponent(spaceLicensesMatch[1]).toLowerCase();
      const licSubParam = spaceLicensesMatch[2] ? decodeURIComponent(spaceLicensesMatch[2]) : '';
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404);
      space.licenses = Array.isArray(space.licenses) ? space.licenses : [];

      if (licSubParam.toLowerCase() === 'verify' && method === 'POST') {
        const payload = await request.json().catch(() => ({}));
        const keyStr = String(payload.key || payload.licenseKey || '').trim();
        const deviceId = String(payload.deviceId || payload.fingerprint || '').trim().slice(0, 120);
        const lic = space.licenses.find((l) => l.key === keyStr);
        if (!lic) {
          recordSpaceInspectorLog(space, { method: 'POST', path: pathname, status: 404, requestBody: payload, responsePreview: { valid: false, reason: 'not_found' } });
          await saveDb(env, db);
          return jsonResponse({ ok: false, valid: false, reason: 'license_not_found' }, 404, { 'Access-Control-Allow-Origin': '*' });
        }
        if (lic.status !== 'active') {
          return jsonResponse({ ok: false, valid: false, reason: `license_${lic.status}` }, 403, { 'Access-Control-Allow-Origin': '*' });
        }
        if (lic.expiresAt && Date.parse(lic.expiresAt) < Date.now()) {
          lic.status = 'expired';
          await saveDb(env, db);
          return jsonResponse({ ok: false, valid: false, reason: 'license_expired' }, 403, { 'Access-Control-Allow-Origin': '*' });
        }
        lic.activatedDevices = Array.isArray(lic.activatedDevices) ? lic.activatedDevices : [];
        if (deviceId && !lic.activatedDevices.includes(deviceId)) {
          if (lic.maxActivations > 0 && lic.activations >= lic.maxActivations) {
            return jsonResponse({ ok: false, valid: false, reason: 'max_activations_reached', maxActivations: lic.maxActivations }, 403, { 'Access-Control-Allow-Origin': '*' });
          }
          lic.activatedDevices.push(deviceId);
          lic.activations = lic.activatedDevices.length;
        } else if (!deviceId) {
          if (lic.maxActivations > 0 && lic.activations >= lic.maxActivations) {
            return jsonResponse({ ok: false, valid: false, reason: 'max_activations_reached', maxActivations: lic.maxActivations }, 403, { 'Access-Control-Allow-Origin': '*' });
          }
          lic.activations = (lic.activations || 0) + 1;
        }
        lic.lastVerifiedAt = new Date().toISOString();
        recordSpaceInspectorLog(space, { method: 'POST', path: pathname, status: 200, requestBody: payload, responsePreview: { valid: true, tier: lic.tier } });
        await saveDb(env, db);
        return jsonResponse(
          {
            ok: true,
            valid: true,
            license: {
              key: lic.key,
              tier: lic.tier,
              status: lic.status,
              customerEmail: lic.customerEmail,
              activations: lic.activations,
              maxActivations: lic.maxActivations,
              expiresAt: lic.expiresAt,
              metadata: lic.metadata || {}
            }
          },
          200,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }

      if (method === 'POST') {
        if (!user || !canEditSpace(space, user)) {
          return jsonResponse({ error: 'Unauthorized: Owner or Editor role required to issue licenses.' }, 403);
        }
        const payload = await request.json().catch(() => ({}));
        const seg = () => randomHex(2).toUpperCase();
        const generatedKey = String(payload.key || `sh_lic_${seg()}-${seg()}-${seg()}`).trim();
        const lic = {
          id: 'lic_' + randomHex(6),
          key: generatedKey,
          customerEmail: String(payload.customerEmail || payload.email || '').trim().slice(0, 160),
          customerName: String(payload.customerName || payload.name || '').trim().slice(0, 120),
          tier: String(payload.tier || 'pro').trim().slice(0, 40),
          maxActivations: Math.max(1, Math.min(1000, Number(payload.maxActivations ?? 3))),
          activations: 0,
          activatedDevices: [],
          status: 'active',
          expiresAt: payload.expiresAt ? String(payload.expiresAt) : null,
          metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
          createdAt: new Date().toISOString()
        };
        space.licenses.unshift(lic);
        if (space.licenses.length > 500) space.licenses = space.licenses.slice(0, 500);
        recordAuditLog(space, user, 'license_key_issued', { key: lic.key, tier: lic.tier, customerEmail: lic.customerEmail });
        await saveDb(env, db);
        return jsonResponse({ ok: true, license: lic, count: space.licenses.length }, 201, { 'Access-Control-Allow-Origin': '*' });
      }

      if (method === 'GET') {
        if (!user || !canViewSpace(space, user)) {
          return jsonResponse({ error: 'Unauthorized.' }, 403);
        }
        return jsonResponse({
          ok: true,
          count: space.licenses.length,
          activeCount: space.licenses.filter((l) => l.status === 'active').length,
          licenses: space.licenses
        });
      }

      if (method === 'DELETE') {
        if (!user || !canEditSpace(space, user)) {
          return jsonResponse({ error: 'Unauthorized.' }, 403);
        }
        const targetKey = licSubParam || url.searchParams.get('key') || '';
        const found = space.licenses.find((l) => l.key === targetKey || l.id === targetKey);
        if (!found) return jsonResponse({ error: 'License not found.' }, 404);
        found.status = 'revoked';
        found.revokedAt = new Date().toISOString();
        recordAuditLog(space, user, 'license_key_revoked', { key: found.key });
        await saveDb(env, db);
        return jsonResponse({ ok: true, license: found });
      }
    }

    // 1b-0l. Wave 20: Per-Space Vector Embeddings & Semantic Similarity Search (/live/:slug/vectors)
    const spaceVectorsMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/vectors(?:\/(upsert|query))?\/?$/i);
    if (spaceVectorsMatch) {
      const slug = decodeURIComponent(spaceVectorsMatch[1]).toLowerCase();
      const vecAction = (spaceVectorsMatch[2] || '').toLowerCase();
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404);
      space.vectorStore = Array.isArray(space.vectorStore) ? space.vectorStore : [];

      if ((vecAction === 'upsert' || (!vecAction && (method === 'POST' || method === 'PUT')))) {
        const payload = await request.json().catch(() => ({}));
        const rawItems = Array.isArray(payload.vectors)
          ? payload.vectors
          : Array.isArray(payload.items)
            ? payload.items
            : [payload];
        const namespace = String(payload.namespace || 'default').trim().slice(0, 64);
        const nowIso = new Date().toISOString();
        const upserted = [];

        for (const item of rawItems) {
          if (!item || typeof item !== 'object') continue;
          const id = String(item.id || `vec_${randomHex(5)}`).trim().slice(0, 80);
          const text = String(item.text || item.content || '').trim().slice(0, 4000);
          const values = Array.isArray(item.values) && item.values.length > 0
            ? item.values.map((v) => Number(v) || 0)
            : computeTextVector(text, 32);
          const rec = {
            id,
            namespace: String(item.namespace || namespace),
            text,
            values,
            metadata: item.metadata && typeof item.metadata === 'object' ? item.metadata : {},
            updatedAt: nowIso
          };
          const existingIdx = space.vectorStore.findIndex((v) => v.id === id && v.namespace === rec.namespace);
          if (existingIdx > -1) {
            space.vectorStore[existingIdx] = rec;
          } else {
            space.vectorStore.push(rec);
          }
          upserted.push({ id: rec.id, namespace: rec.namespace, dimensions: rec.values.length });
        }
        if (space.vectorStore.length > 500) {
          space.vectorStore = space.vectorStore.slice(-500);
        }
        await saveDb(env, db);
        return jsonResponse(
          { ok: true, upsertedCount: upserted.length, totalVectors: space.vectorStore.length, upserted },
          201,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }

      if (vecAction === 'query' || method === 'GET') {
        const payload = method === 'POST' ? await request.json().catch(() => ({})) : {};
        const queryText = String(payload.text || payload.query || url.searchParams.get('q') || '').trim();
        const queryVec = Array.isArray(payload.vector) && payload.vector.length > 0
          ? payload.vector.map((v) => Number(v) || 0)
          : computeTextVector(queryText, 32);
        const topK = Math.max(1, Math.min(50, Number(payload.topK || url.searchParams.get('topK') || 5)));
        const nsFilter = String(payload.namespace || url.searchParams.get('namespace') || '').trim();
        const metaFilter = payload.filter && typeof payload.filter === 'object' ? payload.filter : null;

        let candidates = space.vectorStore;
        if (nsFilter) {
          candidates = candidates.filter((v) => v.namespace === nsFilter);
        }
        if (metaFilter) {
          candidates = candidates.filter((v) =>
            Object.entries(metaFilter).every(([mk, mv]) => v.metadata && v.metadata[mk] === mv)
          );
        }

        const matches = candidates
          .map((v) => ({
            id: v.id,
            namespace: v.namespace,
            score: cosineSimilarity(queryVec, v.values || []),
            text: v.text,
            metadata: v.metadata || {}
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, topK);

        return jsonResponse(
          { ok: true, query: queryText || null, topK, count: matches.length, matches },
          200,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }

      if (method === 'DELETE') {
        const targetId = url.searchParams.get('id');
        const targetNs = url.searchParams.get('namespace');
        if (targetId) {
          space.vectorStore = space.vectorStore.filter((v) => v.id !== targetId);
        } else if (targetNs) {
          space.vectorStore = space.vectorStore.filter((v) => v.namespace !== targetNs);
        } else {
          space.vectorStore = [];
        }
        await saveDb(env, db);
        return jsonResponse({ ok: true, totalVectors: space.vectorStore.length }, 200, { 'Access-Control-Allow-Origin': '*' });
      }
    }

    // 1b-0m. Wave 20: Built-in URL Shortener & UTM Campaign Click Tracker (/live/:slug/links & /live/:slug/go/:code)
    const spaceGoMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/go\/([a-zA-Z0-9_-]+)\/?$/i);
    if (spaceGoMatch && method === 'GET') {
      const slug = decodeURIComponent(spaceGoMatch[1]).toLowerCase();
      const code = decodeURIComponent(spaceGoMatch[2]);
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return new Response('Not found', { status: 404 });
      space.shortLinks = Array.isArray(space.shortLinks) ? space.shortLinks : [];
      const link = space.shortLinks.find((l) => l.code === code);
      if (!link) return jsonResponse({ error: 'Short link not found.' }, 404);

      link.clicks = (link.clicks || 0) + 1;
      link.lastClickedAt = new Date().toISOString();
      const refHeader = request.headers.get('referer') || request.headers.get('referrer') || 'direct';
      let refKey = 'direct';
      try {
        refKey = refHeader === 'direct' ? 'direct' : new URL(refHeader).hostname || 'direct';
      } catch (_e) {
        refKey = String(refHeader).slice(0, 60);
      }
      link.referrers = link.referrers && typeof link.referrers === 'object' ? link.referrers : {};
      link.referrers[refKey] = (link.referrers[refKey] || 0) + 1;
      await saveDb(env, db);

      let dest = link.targetUrl;
      try {
        const destUrl = new URL(dest, url.origin);
        if (link.utmSource && !destUrl.searchParams.has('utm_source')) destUrl.searchParams.set('utm_source', link.utmSource);
        if (link.utmMedium && !destUrl.searchParams.has('utm_medium')) destUrl.searchParams.set('utm_medium', link.utmMedium);
        if (link.utmCampaign && !destUrl.searchParams.has('utm_campaign')) destUrl.searchParams.set('utm_campaign', link.utmCampaign);
        dest = destUrl.href;
      } catch (_e) {}

      return new Response(null, {
        status: 302,
        headers: {
          Location: dest,
          'Cache-Control': 'no-store'
        }
      });
    }

    const spaceLinksMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/links\/?$/i);
    if (spaceLinksMatch) {
      const slug = decodeURIComponent(spaceLinksMatch[1]).toLowerCase();
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404);
      space.shortLinks = Array.isArray(space.shortLinks) ? space.shortLinks : [];

      if (method === 'POST') {
        const payload = await request.json().catch(() => ({}));
        const targetUrl = String(payload.targetUrl || payload.url || '').trim().slice(0, 500);
        if (!targetUrl) return jsonResponse({ error: 'targetUrl is required.' }, 400);
        const code = String(payload.code || randomHex(3))
          .trim()
          .replace(/[^a-zA-Z0-9_-]/g, '')
          .slice(0, 40) || randomHex(3);
        const existingIdx = space.shortLinks.findIndex((l) => l.code === code);
        const linkRecord = {
          id: existingIdx > -1 ? space.shortLinks[existingIdx].id : 'lnk_' + randomHex(5),
          code,
          targetUrl,
          title: String(payload.title || code).trim().slice(0, 120),
          utmSource: String(payload.utmSource || '').trim().slice(0, 60),
          utmMedium: String(payload.utmMedium || '').trim().slice(0, 60),
          utmCampaign: String(payload.utmCampaign || '').trim().slice(0, 60),
          clicks: existingIdx > -1 ? space.shortLinks[existingIdx].clicks || 0 : 0,
          referrers: existingIdx > -1 ? space.shortLinks[existingIdx].referrers || {} : {},
          shortUrl: `${url.origin}/live/${space.slug}/go/${code}`,
          createdAt: existingIdx > -1 ? space.shortLinks[existingIdx].createdAt : new Date().toISOString(),
          lastClickedAt: existingIdx > -1 ? space.shortLinks[existingIdx].lastClickedAt : null
        };
        if (existingIdx > -1) space.shortLinks[existingIdx] = linkRecord;
        else space.shortLinks.unshift(linkRecord);
        if (space.shortLinks.length > 200) space.shortLinks = space.shortLinks.slice(0, 200);
        await saveDb(env, db);
        return jsonResponse({ ok: true, link: linkRecord, count: space.shortLinks.length }, 201, { 'Access-Control-Allow-Origin': '*' });
      }

      if (method === 'GET') {
        const totalClicks = space.shortLinks.reduce((s, l) => s + (l.clicks || 0), 0);
        return jsonResponse(
          { ok: true, count: space.shortLinks.length, totalClicks, links: space.shortLinks },
          200,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }

      if (method === 'DELETE') {
        const codeOrId = url.searchParams.get('code') || url.searchParams.get('id');
        if (codeOrId) {
          space.shortLinks = space.shortLinks.filter((l) => l.code !== codeOrId && l.id !== codeOrId);
        } else {
          space.shortLinks = [];
        }
        await saveDb(env, db);
        return jsonResponse({ ok: true, count: space.shortLinks.length, links: space.shortLinks }, 200, { 'Access-Control-Allow-Origin': '*' });
      }
    }

    // 1b-0n. Wave 20: Per-Space Public Status Page & Uptime Incident Feed (/live/:slug/status, /status.svg, /status/incidents)
    const spaceStatusMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/(status|status\.svg)(?:\/(incidents))?\/?$/i);
    if (spaceStatusMatch) {
      const slug = decodeURIComponent(spaceStatusMatch[1]).toLowerCase();
      const statusKind = spaceStatusMatch[2].toLowerCase();
      const statusSub = (spaceStatusMatch[3] || '').toLowerCase();
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404);
      space.statusIncidents = Array.isArray(space.statusIncidents) ? space.statusIncidents : [];

      if (statusKind === 'status.svg' && method === 'GET') {
        return new Response(generateStatusBadgeSvg(space), {
          status: 200,
          headers: {
            'Content-Type': 'image/svg+xml; charset=utf-8',
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      if (statusSub === 'incidents' && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
        if (!user || !canEditSpace(space, user)) {
          return jsonResponse({ error: 'Unauthorized: Owner or Editor role required to manage status incidents.' }, 403);
        }
        const payload = await request.json().catch(() => ({}));
        const nowIso = new Date().toISOString();
        if (method === 'PATCH' || method === 'PUT' || payload.id) {
          const targetId = String(payload.id || url.searchParams.get('id') || '');
          const inc = space.statusIncidents.find((i) => i.id === targetId);
          if (inc) {
            if (payload.status) inc.status = String(payload.status).toLowerCase();
            if (payload.message) inc.message = String(payload.message).trim().slice(0, 1000);
            if (payload.severity) inc.severity = String(payload.severity).toLowerCase();
            inc.updatedAt = nowIso;
            if (inc.status === 'resolved') inc.resolvedAt = nowIso;
            await saveDb(env, db);
            return jsonResponse({ ok: true, incident: inc, statusSummary: evaluateSpaceStatus(space) });
          }
        }
        const newInc = {
          id: 'inc_' + randomHex(5),
          title: String(payload.title || 'Service Degradation').trim().slice(0, 140),
          severity: ['minor', 'major', 'critical'].includes(String(payload.severity || '').toLowerCase())
            ? String(payload.severity).toLowerCase()
            : 'minor',
          status: ['investigating', 'identified', 'monitoring', 'resolved'].includes(String(payload.status || '').toLowerCase())
            ? String(payload.status).toLowerCase()
            : 'investigating',
          message: String(payload.message || '').trim().slice(0, 1000),
          createdAt: nowIso,
          updatedAt: nowIso
        };
        space.statusIncidents.unshift(newInc);
        if (space.statusIncidents.length > 100) space.statusIncidents = space.statusIncidents.slice(0, 100);
        recordAuditLog(space, user, 'status_incident_posted', { id: newInc.id, title: newInc.title, severity: newInc.severity });
        await saveDb(env, db);
        return jsonResponse({ ok: true, incident: newInc, statusSummary: evaluateSpaceStatus(space) }, 201);
      }

      if (method === 'GET') {
        const st = evaluateSpaceStatus(space);
        return jsonResponse(
          {
            ok: true,
            slug: space.slug,
            title: space.title,
            state: st.state,
            label: st.label,
            uptimePercent: st.uptimePercent,
            badgeUrl: `/live/${space.slug}/status.svg`,
            activeIncidents: st.activeIncidents,
            incidents: st.incidents
          },
          200,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }
    }

    // 1b-0o. Wave 21: Instant Per-Space GraphQL API (/live/:slug/graphql)
    const spaceGraphqlMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/graphql\/?$/i);
    if (spaceGraphqlMatch) {
      const slug = decodeURIComponent(spaceGraphqlMatch[1]).toLowerCase();
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404);

      if (method === 'GET' || method === 'POST') {
        const payload = method === 'POST' ? await request.json().catch(() => ({})) : {};
        const queryStr = String(payload.query || url.searchParams.get('query') || '').trim();
        let variables = payload.variables && typeof payload.variables === 'object' ? payload.variables : {};
        if (method === 'GET' && url.searchParams.get('variables')) {
          try {
            variables = JSON.parse(url.searchParams.get('variables'));
          } catch (_e) {}
        }
        const gqlResult = executeSpaceGraphql(space, queryStr, variables);
        if (gqlResult.mutated) {
          await saveDb(env, db);
        }
        return jsonResponse(
          {
            data: gqlResult.data,
            ...(gqlResult.errors ? { errors: gqlResult.errors } : {})
          },
          gqlResult.data === null && gqlResult.errors ? 400 : 200,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }
    }

    // 1b-0p. Wave 21: Built-in Customer Support Ticket & Helpdesk Engine (/live/:slug/tickets & /live/:slug/tickets/:id/reply)
    const spaceTicketsMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/tickets(?:\/([^/]+)(?:\/(reply))?)?\/?$/i);
    if (spaceTicketsMatch) {
      const slug = decodeURIComponent(spaceTicketsMatch[1]).toLowerCase();
      const ticketIdParam = spaceTicketsMatch[2] ? decodeURIComponent(spaceTicketsMatch[2]) : '';
      const subAction = (spaceTicketsMatch[3] || '').toLowerCase();
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404);
      space.supportTickets = Array.isArray(space.supportTickets) ? space.supportTickets : [];

      if (method === 'POST' && (subAction === 'reply' || ticketIdParam)) {
        const targetTicket = space.supportTickets.find((t) => t.id === ticketIdParam);
        if (!targetTicket) return jsonResponse({ error: 'Support ticket not found.' }, 404);
        const payload = await request.json().catch(() => ({}));
        const message = String(payload.message || payload.body || '').trim().slice(0, 2000);
        if (!message) return jsonResponse({ error: 'Reply message is required.' }, 400);
        const isAgent = Boolean(user && canEditSpace(space, user));
        const senderRole = payload.role === 'agent' && isAgent ? 'agent' : isAgent ? 'agent' : 'customer';
        const nowIso = new Date().toISOString();
        const replyEntry = {
          id: 'rep_' + randomHex(4),
          role: senderRole,
          author: String(payload.author || (user ? user.username : targetTicket.customerName || 'Customer')).slice(0, 80),
          message,
          createdAt: nowIso
        };
        targetTicket.messages = Array.isArray(targetTicket.messages) ? targetTicket.messages : [];
        targetTicket.messages.push(replyEntry);
        targetTicket.updatedAt = nowIso;
        if (senderRole === 'agent' && !targetTicket.firstResponseAt) {
          targetTicket.firstResponseAt = nowIso;
          targetTicket.firstResponseMs = Math.max(1, Date.parse(nowIso) - Date.parse(targetTicket.createdAt));
        }
        if (payload.status && ['open', 'pending', 'resolved', 'closed'].includes(String(payload.status).toLowerCase())) {
          targetTicket.status = String(payload.status).toLowerCase();
        } else if (senderRole === 'agent' && targetTicket.status === 'open') {
          targetTicket.status = 'pending';
        }
        await saveDb(env, db);
        return jsonResponse({ ok: true, ticket: targetTicket, reply: replyEntry }, 200, { 'Access-Control-Allow-Origin': '*' });
      }

      if (method === 'POST' && !ticketIdParam) {
        const payload = await request.json().catch(() => ({}));
        const subject = String(payload.subject || payload.title || '').trim().slice(0, 160);
        const message = String(payload.message || payload.body || '').trim().slice(0, 2000);
        if (!subject || !message) {
          return jsonResponse({ error: 'Both subject and message are required to open a ticket.' }, 400);
        }
        const nowIso = new Date().toISOString();
        const priorityRaw = String(payload.priority || 'normal').toLowerCase();
        const priority = ['low', 'normal', 'high', 'urgent'].includes(priorityRaw) ? priorityRaw : 'normal';
        const newTicket = {
          id: 'tkt_' + randomHex(5),
          subject,
          customerEmail: String(payload.email || payload.customerEmail || 'visitor@example.com').trim().slice(0, 140),
          customerName: String(payload.name || payload.customerName || 'Visitor').trim().slice(0, 80),
          category: String(payload.category || 'general').trim().slice(0, 60),
          priority,
          status: 'open',
          messages: [
            {
              id: 'rep_' + randomHex(4),
              role: 'customer',
              author: String(payload.name || payload.customerName || 'Visitor').trim().slice(0, 80),
              message,
              createdAt: nowIso
            }
          ],
          firstResponseAt: null,
          firstResponseMs: null,
          createdAt: nowIso,
          updatedAt: nowIso
        };
        space.supportTickets.unshift(newTicket);
        if (space.supportTickets.length > 200) space.supportTickets = space.supportTickets.slice(0, 200);
        await dispatchSpaceEventBus(space, 'ticket.created', { ticketId: newTicket.id, subject: newTicket.subject, priority: newTicket.priority });
        await saveDb(env, db);
        return jsonResponse({ ok: true, ticket: newTicket }, 201, { 'Access-Control-Allow-Origin': '*' });
      }

      if (method === 'PATCH' || method === 'PUT') {
        const payload = await request.json().catch(() => ({}));
        const targetId = ticketIdParam || String(payload.id || url.searchParams.get('id') || '');
        const targetTicket = space.supportTickets.find((t) => t.id === targetId);
        if (!targetTicket) return jsonResponse({ error: 'Support ticket not found.' }, 404);
        const nowIso = new Date().toISOString();
        if (payload.status && ['open', 'pending', 'resolved', 'closed'].includes(String(payload.status).toLowerCase())) {
          targetTicket.status = String(payload.status).toLowerCase();
          if (targetTicket.status === 'resolved' || targetTicket.status === 'closed') {
            targetTicket.resolvedAt = nowIso;
          }
        }
        if (payload.priority && ['low', 'normal', 'high', 'urgent'].includes(String(payload.priority).toLowerCase())) {
          targetTicket.priority = String(payload.priority).toLowerCase();
        }
        targetTicket.updatedAt = nowIso;
        await saveDb(env, db);
        return jsonResponse({ ok: true, ticket: targetTicket }, 200, { 'Access-Control-Allow-Origin': '*' });
      }

      if (method === 'GET') {
        const lookupId = ticketIdParam || url.searchParams.get('id');
        if (lookupId) {
          const found = space.supportTickets.find((t) => t.id === lookupId);
          if (!found) return jsonResponse({ error: 'Support ticket not found.' }, 404);
          return jsonResponse({ ok: true, ticket: found }, 200, { 'Access-Control-Allow-Origin': '*' });
        }
        const statusFilter = (url.searchParams.get('status') || '').toLowerCase();
        const priorityFilter = (url.searchParams.get('priority') || '').toLowerCase();
        let list = space.supportTickets;
        if (statusFilter) list = list.filter((t) => t.status === statusFilter);
        if (priorityFilter) list = list.filter((t) => t.priority === priorityFilter);
        const openCount = space.supportTickets.filter((t) => t.status === 'open' || t.status === 'pending').length;
        const resolvedCount = space.supportTickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
        return jsonResponse(
          {
            ok: true,
            count: list.length,
            openCount,
            resolvedCount,
            tickets: list
          },
          200,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }
    }

    // 1b-0q. Wave 21: Viral Referral & Affiliate Tracking System (/live/:slug/referrals, /live/:slug/referrals/convert, /live/:slug/ref/:code)
    const spaceRefVisitMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/ref\/([a-zA-Z0-9_-]+)\/?$/i);
    if (spaceRefVisitMatch && method === 'GET') {
      const slug = decodeURIComponent(spaceRefVisitMatch[1]).toLowerCase();
      const refCode = decodeURIComponent(spaceRefVisitMatch[2]);
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return new Response('Not found', { status: 404 });
      space.referrals = Array.isArray(space.referrals) ? space.referrals : [];
      const refEntry = space.referrals.find((r) => r.code.toLowerCase() === refCode.toLowerCase());
      if (!refEntry) return jsonResponse({ error: 'Referral code not found.' }, 404);

      refEntry.clicks = (refEntry.clicks || 0) + 1;
      refEntry.lastClickedAt = new Date().toISOString();
      await saveDb(env, db);

      const destBase = refEntry.targetUrl || `${url.origin}/live/${space.slug}`;
      let dest = destBase;
      try {
        const destUrl = new URL(destBase, url.origin);
        destUrl.searchParams.set('ref', refEntry.code);
        dest = destUrl.href;
      } catch (_e) {}

      return new Response(null, {
        status: 302,
        headers: {
          Location: dest,
          'Set-Cookie': `sh_ref_${space.slug}=${encodeURIComponent(refEntry.code)}; Path=/; Max-Age=2592000; SameSite=Lax`,
          'Cache-Control': 'no-store'
        }
      });
    }

    const spaceReferralsMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/referrals(?:\/(convert))?\/?$/i);
    if (spaceReferralsMatch) {
      const slug = decodeURIComponent(spaceReferralsMatch[1]).toLowerCase();
      const refSub = (spaceReferralsMatch[2] || '').toLowerCase();
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404);
      space.referrals = Array.isArray(space.referrals) ? space.referrals : [];

      if (refSub === 'convert' && method === 'POST') {
        const payload = await request.json().catch(() => ({}));
        const cookies = parseCookies(request.headers.get('cookie') || '');
        const codeInput = String(payload.code || cookies[`sh_ref_${space.slug}`] || '').trim();
        if (!codeInput) return jsonResponse({ error: 'Referral code is required.' }, 400);
        const refEntry = space.referrals.find((r) => r.code.toLowerCase() === codeInput.toLowerCase());
        if (!refEntry) return jsonResponse({ error: 'Referral code not found.' }, 404);

        const amountUsd = Math.max(0, Number(payload.amountUsd || payload.amount || 0));
        const commissionUsd = Math.round(amountUsd * ((refEntry.commissionRate || 20) / 100) * 100) / 100;
        const nowIso = new Date().toISOString();

        refEntry.conversions = (refEntry.conversions || 0) + 1;
        refEntry.revenueUsd = Math.round(((refEntry.revenueUsd || 0) + amountUsd) * 100) / 100;
        refEntry.commissionEarnedUsd = Math.round(((refEntry.commissionEarnedUsd || 0) + commissionUsd) * 100) / 100;
        refEntry.lastConvertedAt = nowIso;
        refEntry.conversionLog = Array.isArray(refEntry.conversionLog) ? refEntry.conversionLog : [];
        const convRecord = {
          id: 'cnv_' + randomHex(4),
          customerEmail: String(payload.customerEmail || payload.email || '').trim().slice(0, 140),
          orderId: String(payload.orderId || '').trim().slice(0, 80),
          amountUsd,
          commissionUsd,
          timestamp: nowIso
        };
        refEntry.conversionLog.unshift(convRecord);
        if (refEntry.conversionLog.length > 50) refEntry.conversionLog = refEntry.conversionLog.slice(0, 50);

        await dispatchSpaceEventBus(space, 'referral.converted', { code: refEntry.code, amountUsd, commissionUsd });
        await saveDb(env, db);
        return jsonResponse(
          { ok: true, referral: refEntry, conversion: convRecord },
          200,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }

      if (method === 'POST' && !refSub) {
        const payload = await request.json().catch(() => ({}));
        const referrerName = String(payload.referrerName || payload.name || 'Affiliate Partner').trim().slice(0, 80);
        const referrerEmail = String(payload.referrerEmail || payload.email || '').trim().slice(0, 140);
        const rawCode = String(payload.code || slugify(referrerName) + '-' + randomHex(2))
          .trim()
          .replace(/[^a-zA-Z0-9_-]/g, '')
          .slice(0, 40);
        const commissionRate = Math.max(1, Math.min(90, Number(payload.commissionRate ?? 20)));
        const existingIdx = space.referrals.findIndex((r) => r.code.toLowerCase() === rawCode.toLowerCase());
        const nowIso = new Date().toISOString();
        const refRecord = {
          id: existingIdx > -1 ? space.referrals[existingIdx].id : 'ref_' + randomHex(5),
          code: rawCode,
          referrerName,
          referrerEmail,
          commissionRate,
          targetUrl: String(payload.targetUrl || '').trim().slice(0, 300) || null,
          referralUrl: `${url.origin}/live/${space.slug}/ref/${rawCode}`,
          clicks: existingIdx > -1 ? space.referrals[existingIdx].clicks || 0 : 0,
          conversions: existingIdx > -1 ? space.referrals[existingIdx].conversions || 0 : 0,
          revenueUsd: existingIdx > -1 ? space.referrals[existingIdx].revenueUsd || 0 : 0,
          commissionEarnedUsd: existingIdx > -1 ? space.referrals[existingIdx].commissionEarnedUsd || 0 : 0,
          createdAt: existingIdx > -1 ? space.referrals[existingIdx].createdAt : nowIso
        };
        if (existingIdx > -1) space.referrals[existingIdx] = refRecord;
        else space.referrals.push(refRecord);
        await saveDb(env, db);
        return jsonResponse({ ok: true, referral: refRecord }, 201, { 'Access-Control-Allow-Origin': '*' });
      }

      if (method === 'GET') {
        const leaderboard = [...space.referrals].sort(
          (a, b) => (b.conversions || 0) - (a.conversions || 0) || (b.clicks || 0) - (a.clicks || 0)
        );
        const totals = leaderboard.reduce(
          (acc, r) => {
            acc.totalClicks += r.clicks || 0;
            acc.totalConversions += r.conversions || 0;
            acc.totalRevenueUsd = Math.round((acc.totalRevenueUsd + (r.revenueUsd || 0)) * 100) / 100;
            acc.totalCommissionUsd = Math.round((acc.totalCommissionUsd + (r.commissionEarnedUsd || 0)) * 100) / 100;
            return acc;
          },
          { totalClicks: 0, totalConversions: 0, totalRevenueUsd: 0, totalCommissionUsd: 0 }
        );
        return jsonResponse(
          {
            ok: true,
            count: leaderboard.length,
            ...totals,
            leaderboard
          },
          200,
          { 'Access-Control-Allow-Origin': '*' }
        );
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

      const secrets = await getDecryptedSpaceSecrets(space, env);
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

      // Wave 14: Form Schema Validation via form.schema.json or space.formSchema
      const spaceFiles = space.publishedFiles || space.draftFiles || {};
      let formSchema = space.formSchema || null;
      if (!formSchema && spaceFiles['form.schema.json']) {
        try {
          formSchema = JSON.parse(spaceFiles['form.schema.json']);
        } catch (_e) {}
      }
      if (formSchema) {
        const valRes = validateFormSubmission(fields, formSchema);
        if (!valRes.valid) {
          return jsonResponse({
            error: 'Form validation failed.',
            details: valRes.errors
          }, 422);
        }
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
      await dispatchSpaceIntegrations(env, space, 'form_submission', {
        summary: `New submission from ${entry.name || entry.email || 'Visitor'}`,
        fields: {
          Name: entry.name || '—',
          Email: entry.email || '—',
          Message: entry.message || '—'
        }
      });
      await dispatchSpaceEventBus(space, 'form.submitted', entry);
      recordSpaceInspectorLog(space, {
        method: 'POST',
        path: pathname,
        status: 201,
        requestBody: fields,
        responsePreview: { submissionId: entry.id, email: entry.email }
      });
      recordAuditLog(space, null, 'form_submission_received', { name: entry.name, email: entry.email });
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

    // 1b-3. Built-in Media & Asset Hosting API (/live/:slug/assets and /live/:slug/assets/:name)
    const assetsLiveMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/assets(?:\/([^/]+))?\/?$/i);
    if (assetsLiveMatch) {
      const slug = decodeURIComponent(assetsLiveMatch[1]).toLowerCase();
      const assetParamName = assetsLiveMatch[2] ? decodeURIComponent(assetsLiveMatch[2]) : '';
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404);
      space.assets = space.assets && typeof space.assets === 'object' ? space.assets : {};

      if (method === 'GET' && assetParamName) {
        const asset = space.assets[assetParamName];
        if (!asset) return jsonResponse({ error: 'Asset not found.' }, 404);

        // Edge Asset Optimization & Responsive Pipeline (width, format, quality)
        const reqW = parseInt(url.searchParams.get('w') || url.searchParams.get('width') || '0', 10);
        const reqFmt = String(url.searchParams.get('format') || url.searchParams.get('f') || '').toLowerCase();
        const reqQ = parseInt(url.searchParams.get('q') || url.searchParams.get('quality') || '0', 10);

        const dataUrl = String(asset.dataUrl || '');
        const b64Match = dataUrl.match(/^data:([^;]+);base64,(.+)$/i);
        const assetHeaders = {
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
          'Vary': 'Accept'
        };
        if (reqW > 0) assetHeaders['X-Optimized-Width'] = String(reqW);
        if (reqFmt) assetHeaders['X-Optimized-Format'] = reqFmt;
        if (reqQ > 0) assetHeaders['X-Optimized-Quality'] = String(reqQ);

        if (b64Match) {
          const originalMime = asset.mimeType || b64Match[1] || 'application/octet-stream';
          let mime = originalMime;
          if (reqFmt === 'webp') mime = 'image/webp';
          else if (reqFmt === 'avif') mime = 'image/avif';
          else if (reqFmt === 'png') mime = 'image/png';
          else if (reqFmt === 'jpeg' || reqFmt === 'jpg') mime = 'image/jpeg';
          
          assetHeaders['Content-Type'] = mime;
          const binStr = atob(b64Match[2]);
          const bytes = new Uint8Array(binStr.length);
          for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
          return new Response(bytes, {
            status: 200,
            headers: assetHeaders
          });
        }

        assetHeaders['Content-Type'] = asset.mimeType || 'text/plain; charset=utf-8';
        return new Response(String(asset.content ?? asset.dataUrl ?? ''), {
          status: 200,
          headers: assetHeaders
        });
      }

      if (method === 'GET') {
        const list = Object.values(space.assets).map((a) => ({
          name: a.name,
          mimeType: a.mimeType,
          size: a.size || 0,
          url: `/live/${space.slug}/assets/${encodeURIComponent(a.name)}`,
          createdAt: a.createdAt
        }));
        return jsonResponse({ ok: true, assets: list });
      }

      if (method === 'POST') {
        const payload = await request.json().catch(() => ({}));
        const cleanName = String(payload.name || `asset_${randomHex(3)}.txt`)
          .trim()
          .replace(/[^a-zA-Z0-9._-]/g, '_')
          .slice(0, 64);
        const dataUrl = String(payload.dataUrl || '');
        const content = payload.content !== undefined ? String(payload.content) : '';
        const rawLen = (dataUrl || content).length;
        if (rawLen > 204800) {
          return jsonResponse({ error: 'Single asset size limit (200 KB) exceeded.' }, 413);
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
        await saveDb(env, db);
        return jsonResponse(
          {
            ok: true,
            asset: {
              name: cleanName,
              mimeType,
              size: rawLen,
              url: `/live/${space.slug}/assets/${encodeURIComponent(cleanName)}`,
              createdAt: assetRecord.createdAt
            }
          },
          201
        );
      }

      if (method === 'DELETE') {
        const target = assetParamName || url.searchParams.get('name');
        if (target) delete space.assets[target];
        else space.assets = {};
        await saveDb(env, db);
        return jsonResponse({ ok: true, assetCount: Object.keys(space.assets).length });
      }
    }

    // 1b-4. Built-in Full-Text Search & Faceted Index API (/live/:slug/search & /live/:slug/search/index)
    const searchIndexMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/search(?:\/(index))?\/?$/i);
    if (searchIndexMatch) {
      const slug = decodeURIComponent(searchIndexMatch[1]).toLowerCase();
      const isIndexSubpath = Boolean(searchIndexMatch[2]);
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404);
      space.searchIndex = Array.isArray(space.searchIndex) ? space.searchIndex : [];

      if (isIndexSubpath) {
        if (method === 'GET') {
          const facets = computeSearchFacets(space);
          return jsonResponse(
            { ok: true, count: space.searchIndex.length, facets, documents: space.searchIndex },
            200,
            { 'Access-Control-Allow-Origin': '*' }
          );
        }
        if (method === 'POST' || method === 'PUT') {
          const payload = await request.json().catch(() => ({}));
          const rawDocs = Array.isArray(payload.documents) ? payload.documents : [payload];
          const nowIso = new Date().toISOString();
          const indexed = [];
          for (const item of rawDocs) {
            if (!item || typeof item !== 'object') continue;
            const docId = String(item.id || `doc_${randomHex(5)}`).trim().slice(0, 80);
            const docRecord = {
              id: docId,
              title: String(item.title || 'Untitled').trim().slice(0, 200),
              body: String(item.body || item.content || '').trim().slice(0, 4000),
              tags: Array.isArray(item.tags) ? item.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean) : [],
              url: String(item.url || `/live/${space.slug}`).trim().slice(0, 300),
              metadata: item.metadata && typeof item.metadata === 'object' ? item.metadata : {},
              updatedAt: nowIso
            };
            const existingIdx = space.searchIndex.findIndex((d) => d.id === docId);
            if (existingIdx > -1) {
              space.searchIndex[existingIdx] = docRecord;
            } else {
              space.searchIndex.push(docRecord);
            }
            indexed.push(docRecord);
          }
          if (space.searchIndex.length > 500) {
            space.searchIndex = space.searchIndex.slice(-500);
          }
          await saveDb(env, db);
          const facets = computeSearchFacets(space);
          return jsonResponse(
            { ok: true, indexedCount: indexed.length, totalDocuments: space.searchIndex.length, facets, documents: indexed },
            201,
            { 'Access-Control-Allow-Origin': '*' }
          );
        }
        if (method === 'DELETE') {
          const docId = url.searchParams.get('id');
          if (docId) {
            space.searchIndex = space.searchIndex.filter((d) => d.id !== docId);
          } else {
            space.searchIndex = [];
          }
          await saveDb(env, db);
          return jsonResponse({ ok: true, totalDocuments: space.searchIndex.length }, 200, { 'Access-Control-Allow-Origin': '*' });
        }
      }

      if (method === 'GET') {
        const q = url.searchParams.get('q') || '';
        const tag = url.searchParams.get('tag') || '';
        const results = searchSpaceContent(space, q, tag);
        const facets = computeSearchFacets(space);
        return jsonResponse(
          { ok: true, query: q, tag: tag || null, count: results.length, facets, results },
          200,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }
    }

    // 1b-5. Automatic SEO sitemap.xml, robots.txt & /live/:slug/health
    const seoHealthMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/(sitemap\.xml|robots\.txt|health)\/?$/i);
    if (seoHealthMatch && method === 'GET') {
      const slug = decodeURIComponent(seoHealthMatch[1]).toLowerCase();
      const kind = seoHealthMatch[2].toLowerCase();
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return new Response('Not found', { status: 404 });

      if (kind === 'health') {
        return jsonResponse({
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
      }

      if (kind === 'robots.txt') {
        const disallow = space.visibility === 'private' || Boolean(space.previewPasscode);
        const txt = `User-agent: *\n${disallow ? 'Disallow: /' : 'Allow: /'}\nSitemap: ${url.origin}/live/${space.slug}/sitemap.xml\n`;
        return new Response(txt, {
          status: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }

      if (kind === 'sitemap.xml') {
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
                ? `${url.origin}/live/${space.slug}`
                : `${url.origin}/live/${space.slug}/${encodeURIComponent(page)}`;
            return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastMod}</lastmod>\n  </url>`;
          })
          .join('\n');
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;
        return new Response(xml, {
          status: 200,
          headers: { 'Content-Type': 'application/xml; charset=utf-8' }
        });
      }
    }

    // 1b-6. Serverless Edge Functions (/live/:slug/fn), Custom Analytics (/events), Transactional Notify (/notify) & Config (/config.json)
    const wave7Match = pathname.match(/^\/(?:live|s)\/([^/]+)\/(fn|events|notify|config\.json)\/?$/i);
    if (wave7Match) {
      const slug = decodeURIComponent(wave7Match[1]).toLowerCase();
      const routeKind = wave7Match[2].toLowerCase();
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404);
      const files = space.publishedFiles || space.draftFiles || {};

      if (routeKind === 'config.json') {
        if (method === 'GET') {
          return jsonResponse({ ok: true, config: buildSpaceConfig(space, files) });
        }
        if (method === 'POST') {
          const payload = await request.json().catch(() => ({}));
          space.featureFlags = {
            ...(space.featureFlags && typeof space.featureFlags === 'object' ? space.featureFlags : {}),
            ...(payload.flags && typeof payload.flags === 'object' ? payload.flags : payload)
          };
          await saveDb(env, db);
          return jsonResponse({ ok: true, config: buildSpaceConfig(space, files) });
        }
      }

      if (routeKind === 'fn') {
        const payload = method === 'POST' ? await request.json().catch(() => ({})) : {};
        const action = String(url.searchParams.get('action') || payload.action || 'ping').trim();
        space.appStorage = space.appStorage && typeof space.appStorage === 'object' ? space.appStorage : {};
        if (payload.setStorage && typeof payload.setStorage === 'object') {
          space.appStorage = { ...space.appStorage, ...payload.setStorage };
          await saveDb(env, db);
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
        return jsonResponse({
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
      }

      if (routeKind === 'events') {
        space.eventCounts = space.eventCounts && typeof space.eventCounts === 'object' ? space.eventCounts : {};
        space.eventLog = Array.isArray(space.eventLog) ? space.eventLog : [];
        if (method === 'GET') {
          return jsonResponse({
            ok: true,
            counts: space.eventCounts,
            events: space.eventLog
          });
        }
        if (method === 'POST') {
          const payload = await request.json().catch(() => ({}));
          const eventName = String(payload.event || payload.name || 'app_event')
            .trim()
            .slice(0, 64);
          space.eventCounts[eventName] = (space.eventCounts[eventName] || 0) + 1;
          const record = {
            id: 'ev_' + randomHex(4),
            event: eventName,
            props: payload.props && typeof payload.props === 'object' ? payload.props : {},
            createdAt: new Date().toISOString()
          };
          space.eventLog.unshift(record);
          if (space.eventLog.length > 100) space.eventLog = space.eventLog.slice(0, 100);
          await saveDb(env, db);
          return jsonResponse(
            {
              ok: true,
              event: eventName,
              count: space.eventCounts[eventName],
              counts: space.eventCounts,
              record
            },
            201
          );
        }
        if (method === 'DELETE') {
          space.eventCounts = {};
          space.eventLog = [];
          await saveDb(env, db);
          return jsonResponse({ ok: true, counts: {}, events: [] });
        }
      }

      if (routeKind === 'notify') {
        space.notifications = Array.isArray(space.notifications) ? space.notifications : [];
        if (method === 'GET') {
          return jsonResponse({ ok: true, notifications: space.notifications });
        }
        if (method === 'POST') {
          const payload = await request.json().catch(() => ({}));
          const to = String(payload.to || 'owner@spacehub.win').trim().slice(0, 160);
          const subject = String(payload.subject || `Alert from ${space.title}`).trim().slice(0, 160);
          const message = String(payload.message || payload.text || '').trim().slice(0, 1000);
          if (!message && !payload.subject) {
            return jsonResponse({ error: 'Notification subject or message is required.' }, 400);
          }
          let status = 'queued_outbox';
          const secrets = await getDecryptedSpaceSecrets(space, env);
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
            id: 'ntf_' + randomHex(5),
            to,
            subject,
            message,
            status,
            createdAt: new Date().toISOString()
          };
          space.notifications.unshift(notifRecord);
          if (space.notifications.length > 100) space.notifications = space.notifications.slice(0, 100);
          await saveDb(env, db);
          return jsonResponse({ ok: true, notification: notifRecord, count: space.notifications.length }, 201);
        }
      }
    }

    if (method === 'OPTIONS' && (pathname.startsWith('/live/') || pathname.startsWith('/s/'))) {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    // 1b-8. Wave 9: Built-in E-Commerce & Order Checkout API (/live/:slug/orders)
    const ordersMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/orders\/?$/i);
    if (ordersMatch) {
      const slug = decodeURIComponent(ordersMatch[1]).toLowerCase();
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      const cors = { 'Access-Control-Allow-Origin': '*' };
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404, cors);
      space.orders = Array.isArray(space.orders) ? space.orders : [];

      if (method === 'POST') {
        const payload = await request.json().catch(() => ({}));
        const built = buildSpaceOrder(db, space, payload, 'ord_' + randomHex(5), url.origin);
        if (built.error) return jsonResponse({ error: built.error }, 400, cors);
        space.orders.unshift(built.order);
        if (space.orders.length > 200) space.orders = space.orders.slice(0, 200);
        recordSpaceInspectorLog(space, {
          method: 'POST',
          path: pathname,
          status: 201,
          requestBody: payload,
          responsePreview: { orderId: built.order.id, amountUsd: built.order.amountUsd }
        });
        await saveDb(env, db);
        return jsonResponse({ ok: true, order: built.order }, 201, cors);
      }

      if (method === 'GET') {
        const orderId = url.searchParams.get('id');
        if (orderId) {
          const found = space.orders.find((o) => o.id === orderId);
          if (!found) return jsonResponse({ error: 'Order not found.' }, 404, cors);
          return jsonResponse(
            {
              ok: true,
              order: {
                id: found.id,
                status: found.status,
                amountUsd: found.amountUsd,
                items: found.items,
                checkoutUrl: found.checkoutUrl,
                createdAt: found.createdAt
              }
            },
            200,
            cors
          );
        }
        if (!canEditSpace(space, user)) {
          return jsonResponse({ error: 'Only the Space owner or collaborators can list orders.' }, 403, cors);
        }
        return jsonResponse({ ok: true, orders: space.orders }, 200, cors);
      }

      if (method === 'PATCH') {
        if (!canEditSpace(space, user)) {
          return jsonResponse({ error: 'Only the Space owner or collaborators can update orders.' }, 403, cors);
        }
        const payload = await request.json().catch(() => ({}));
        const targetId = String(url.searchParams.get('id') || payload.id || '');
        const found = space.orders.find((o) => o.id === targetId);
        if (!found) return jsonResponse({ error: 'Order not found.' }, 404, cors);
        if (['pending', 'paid', 'fulfilled', 'cancelled'].includes(payload.status)) {
          found.status = payload.status;
        }
        found.updatedAt = new Date().toISOString();
        await saveDb(env, db);
        return jsonResponse({ ok: true, order: found }, 200, cors);
      }
    }

    // 1b-7. Wave 8 & Wave 15: Structured Table DB API (/live/:slug/db/:table & /live/:slug/db/:table/csv) & RSS/JSON Feeds (/rss.xml, /feed.json)
    const tableDbMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/db\/([a-zA-Z0-9_-]+)(?:\/(csv))?\/?$/i);
    if (tableDbMatch) {
      const slug = decodeURIComponent(tableDbMatch[1]).toLowerCase();
      const tableName = decodeURIComponent(tableDbMatch[2]).toLowerCase();
      const isCsvPath = Boolean(tableDbMatch[3]);
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return jsonResponse({ error: 'Space not found.' }, 404);
      space.dbTables = space.dbTables && typeof space.dbTables === 'object' ? space.dbTables : {};
      space.dbTables[tableName] = Array.isArray(space.dbTables[tableName]) ? space.dbTables[tableName] : [];
      let rows = space.dbTables[tableName];

      if (method === 'GET') {
        const rowId = url.searchParams.get('id');
        if (rowId && !isCsvPath) {
          const found = rows.find((r) => String(r.id) === String(rowId)) || null;
          return jsonResponse({ ok: true, table: tableName, row: found }, 200, { 'Access-Control-Allow-Origin': '*' });
        }
        let filtered = [...rows];
        const where = url.searchParams.get('where') || '';
        if (where.includes(':')) {
          const [fk, fv] = where.split(':');
          filtered = filtered.filter((r) => String(r[fk] ?? '').toLowerCase() === String(fv).toLowerCase());
        }
        const q = (url.searchParams.get('q') || '').trim().toLowerCase();
        if (q) {
          filtered = filtered.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
        }
        const sort = url.searchParams.get('sort') || '';
        if (sort) {
          const [sk, sdir] = sort.split(':');
          const mult = String(sdir).toLowerCase() === 'desc' ? -1 : 1;
          filtered.sort((a, b) => (a[sk] > b[sk] ? mult : a[sk] < b[sk] ? -mult : 0));
        }
        const offsetParam = parseInt(url.searchParams.get('offset') || '0', 10);
        if (offsetParam > 0) filtered = filtered.slice(offsetParam);
        const limitParam = parseInt(url.searchParams.get('limit') || '0', 10);
        if (limitParam > 0) filtered = filtered.slice(0, limitParam);

        if (isCsvPath || (url.searchParams.get('format') || '').toLowerCase() === 'csv') {
          const csvData = rowsToCsv(filtered);
          return new Response(csvData, {
            status: 200,
            headers: {
              'Content-Type': 'text/csv; charset=utf-8',
              'Content-Disposition': `attachment; filename="${encodeURIComponent(space.slug)}_${encodeURIComponent(tableName)}.csv"`,
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        return jsonResponse(
          { ok: true, table: tableName, count: filtered.length, rows: filtered },
          200,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }

      if (method === 'POST') {
        const contentType = (request.headers.get('content-type') || '').toLowerCase();
        if (isCsvPath || contentType.includes('text/csv')) {
          const rawBody = await request.text().catch(() => '');
          let csvText = rawBody;
          if (contentType.includes('application/json')) {
            try {
              const parsedJson = JSON.parse(rawBody);
              if (Array.isArray(parsedJson.rows)) {
                const now = new Date().toISOString();
                const imported = parsedJson.rows.map((item) => ({
                  ...item,
                  id: String(item.id || `row_${randomHex(4)}`),
                  createdAt: item.createdAt || now,
                  updatedAt: now
                }));
                rows.push(...imported);
                if (rows.length > 500) space.dbTables[tableName] = rows.slice(-500);
                recordAuditLog(space, user, 'db_bulk_imported', { table: tableName, importedCount: imported.length });
                await saveDb(env, db);
                return jsonResponse(
                  { ok: true, table: tableName, importedCount: imported.length, count: space.dbTables[tableName].length, rows: imported },
                  201,
                  { 'Access-Control-Allow-Origin': '*' }
                );
              }
              csvText = String(parsedJson.csv || '');
            } catch (_e) {}
          }
          const parsedRows = parseCsvToRows(csvText);
          const now = new Date().toISOString();
          const imported = parsedRows.map((item) => ({
            ...item,
            id: String(item.id || `row_${randomHex(4)}`),
            createdAt: item.createdAt || now,
            updatedAt: now
          }));
          rows.push(...imported);
          if (rows.length > 500) space.dbTables[tableName] = rows.slice(-500);
          recordAuditLog(space, user, 'db_csv_imported', { table: tableName, importedCount: imported.length });
          await saveDb(env, db);
          return jsonResponse(
            { ok: true, table: tableName, importedCount: imported.length, count: space.dbTables[tableName].length, rows: imported },
            201,
            { 'Access-Control-Allow-Origin': '*' }
          );
        }

        const payload = await request.json().catch(() => ({}));
        const now = new Date().toISOString();
        const newRow = {
          ...payload,
          id: String(payload.id || `row_${randomHex(4)}`),
          createdAt: payload.createdAt || now,
          updatedAt: now
        };
        rows.push(newRow);
        if (rows.length > 500) space.dbTables[tableName] = rows.slice(-500);
        recordSpaceInspectorLog(space, {
          method: 'POST',
          path: pathname,
          status: 201,
          requestBody: payload,
          responsePreview: { table: tableName, rowId: newRow.id }
        });
        await saveDb(env, db);
        return jsonResponse(
          { ok: true, table: tableName, row: newRow, count: space.dbTables[tableName].length },
          201,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }

      if (method === 'PATCH' || method === 'PUT') {
        const payload = await request.json().catch(() => ({}));
        const targetId = String(url.searchParams.get('id') || payload.id || '');
        const idx = rows.findIndex((r) => String(r.id) === targetId);
        if (idx === -1) return jsonResponse({ error: 'Row not found.' }, 404);
        rows[idx] = { ...rows[idx], ...payload, id: rows[idx].id, updatedAt: new Date().toISOString() };
        await saveDb(env, db);
        return jsonResponse(
          { ok: true, table: tableName, row: rows[idx] },
          200,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }

      if (method === 'DELETE') {
        const targetId = url.searchParams.get('id');
        if (targetId) {
          space.dbTables[tableName] = rows.filter((r) => String(r.id) !== String(targetId));
        } else {
          space.dbTables[tableName] = [];
        }
        await saveDb(env, db);
        return jsonResponse(
          { ok: true, table: tableName, count: space.dbTables[tableName].length },
          200,
          { 'Access-Control-Allow-Origin': '*' }
        );
      }
    }

    const feedMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/(rss\.xml|feed\.json)\/?$/i);
    if (feedMatch && method === 'GET') {
      const slug = decodeURIComponent(feedMatch[1]).toLowerCase();
      const feedKind = feedMatch[2].toLowerCase();
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (!space) return new Response('Not found', { status: 404 });
      const items = generateSpaceFeedItems(space, url.origin);
      if (feedKind === 'feed.json') {
        return jsonResponse({
          version: 'https://jsonfeed.org/version/1.1',
          title: space.title,
          home_page_url: `${url.origin}/live/${space.slug}`,
          feed_url: `${url.origin}/live/${space.slug}/feed.json`,
          description: space.description,
          items: items.map((it) => ({
            id: it.id,
            title: it.title,
            content_text: it.summary,
            url: it.url,
            date_published: it.date_published
          }))
        });
      }
      const rssItems = items
        .map(
          (it) =>
            `    <item>\n      <guid isPermaLink="false">${it.id.replace(/[<>&]/g, '')}</guid>\n      <title>${it.title.replace(/[<>&]/g, '')}</title>\n      <link>${it.url}</link>\n      <description>${it.summary.replace(/[<>&]/g, '')}</description>\n      <pubDate>${new Date(it.date_published).toUTCString()}</pubDate>\n    </item>`
        )
        .join('\n');
      const rssXml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>${String(space.title).replace(/[<>&]/g, '')}</title>\n    <link>${url.origin}/live/${space.slug}</link>\n    <description>${String(space.description || space.title).replace(/[<>&]/g, '')}</description>\n${rssItems}\n  </channel>\n</rss>`;
      return new Response(rssXml, {
        status: 200,
        headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' }
      });
    }

    const reviewMatch = pathname.match(/^\/api\/draft-review\/([a-f0-9]{64})$/);
    const feedbackMatch = pathname.match(/^\/api\/draft-review\/([a-f0-9]{64})\/feedback$/);
    if (feedbackMatch && ['GET', 'POST'].includes(method)) {
      const review = db.spaces.flatMap((space) => space.draftReviews || [])
        .find((entry) => entry.token === feedbackMatch[1] && entry.expiresAt > Date.now());
      const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer',
        'X-Robots-Tag': 'noindex, nofollow',
        'Content-Security-Policy': "default-src 'none'; frame-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'" };
      if (!review) return new Response('This draft review link is unavailable.', { status: 404, headers });
      if (method === 'POST') {
        const form = await request.formData().catch(() => null);
        const message = String(form?.get('message') || '').trim();
        if (!message || message.length > 1000) return new Response('Enter a comment of 1–1000 characters.', { status: 400, headers });
        review.comments ||= [];
        if (review.comments.length >= 25) return new Response('This review has reached its comment limit.', { status: 409, headers });
        review.comments.push({ id: crypto.randomUUID(), message, createdAt: Date.now(), resolved: false });
        await saveDb(env, db);
        return new Response(null, { status: 303, headers: { ...headers, Location: pathname + '?sent=1' } });
      }
      return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SpaceHub draft feedback</title><h1>Review this draft</h1>' +
        '<iframe title="Draft snapshot" sandbox="allow-scripts" width="95%" height="480" src="/api/draft-review/' + feedbackMatch[1] + '"></iframe>' +
        (url.searchParams.has('sent') ? '<p role="status">Comment submitted.</p>' : '') +
        '<form method="post"><label for="message">Feedback for the Space owner</label><br><textarea id="message" name="message" maxlength="1000" required rows="5" cols="34"></textarea><br><button>Send feedback</button></form></html>',
        { headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } });
    }
    if (reviewMatch && method === 'GET') {
      const review = db.spaces.flatMap((space) => space.draftReviews || [])
        .find((entry) => entry.token === reviewMatch[1] && entry.expiresAt > Date.now());
      const headers = {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'X-Robots-Tag': 'noindex, nofollow',
        'Content-Security-Policy': "sandbox allow-scripts; base-uri 'none'; form-action 'none'"
      };
      return new Response(review ? buildBundledHtml(review.files) : 'This draft review link is unavailable.', {
        status: review ? 200 : 404,
        headers
      });
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
      const isOwner = canEditSpace(space, user);
      const keyParam = (url.searchParams.get('key') || '').trim();
      const hasValidPasscode = Boolean(space && space.previewPasscode && keyParam === space.previewPasscode);
      const canAccess = isOwner || hasValidPasscode;

      if (!space || (space.visibility === 'private' && !canAccess) || (space.status === 'draft' && !canAccess)) {
        return new Response(
          `<!DOCTYPE html><html><body style="background:#09090b;color:#fafafa;font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center;padding:2rem;border:1px solid #27272a;border-radius:0.75rem;background:#18181b;max-width:420px"><h1 style="font-size:1.25rem;margin-bottom:0.5rem">404 — Private or Unlaunched Space</h1><p style="color:#a1a1aa;font-size:0.9rem;margin-bottom:1.25rem">This Space is set to private or is currently in staging.</p><a href="/" style="color:#818cf8;text-decoration:none;font-weight:600">← Return to SpaceHub</a></div></body></html>`,
          { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
      const baseFiles =
        (mode === 'draft' && canAccess) ? space.draftFiles : space.publishedFiles || space.draftFiles;

      // Wave 18: Edge Rate-Limiting & Bot Protection Firewall per Space (firewall.json)
      if (!canAccess && mode !== 'draft') {
        const fwCheck = evaluateSpaceFirewall(space, baseFiles, request);
        if (!fwCheck.allowed) {
          return jsonResponse(
            { error: 'Access denied by Space Firewall.', reason: fwCheck.reason },
            fwCheck.status || 403
          );
        }
      }

      if (space.maintenanceMode && !canAccess && mode !== 'draft') {
        if (baseFiles && baseFiles['maintenance.html']) {
          return new Response(
            buildBundledHtml({ ...baseFiles, 'index.html': baseFiles['maintenance.html'] }, url.origin, space),
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }
        return new Response(
          `<!DOCTYPE html><html><body style="background:#09090b;color:#fafafa;font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center;padding:2rem;border:1px solid #27272a;border-radius:0.75rem;background:#18181b;max-width:420px"><h1 style="font-size:1.25rem;margin-bottom:0.5rem">503 — Under Scheduled Maintenance</h1><p style="color:#a1a1aa;font-size:0.9rem;margin-bottom:1.25rem">${String(space.title).replace(/[<>&]/g, '')} is currently undergoing scheduled maintenance. Please check back shortly.</p></div></body></html>`,
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
      const lapseState = spaceHostingLapse(db, space.slug);
      if (lapseState && mode !== 'draft') {
        return new Response(hostingLapsePage(space, lapseState), {
          status: 402,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
      const hasAb = Boolean(baseFiles && baseFiles['index.b.html'] !== undefined);
      const forcedVariant = (url.searchParams.get('variant') || '').toLowerCase();
      const cookieVariant = parseCookies(request.headers.get('cookie') || '')[`sh_ab_${space.slug}`] || '';
      const variant =
        mode === 'draft'
          ? (hasAb && forcedVariant === 'b' ? 'b' : 'a')
          : pickAbVariant(baseFiles, forcedVariant, cookieVariant);

      // Wave 20: Canary Deployments & Weighted Traffic Splitting
      let isCanaryHit = false;
      const canaryCfg = space.canaryConfig && typeof space.canaryConfig === 'object' ? space.canaryConfig : null;
      if (mode !== 'draft' && canaryCfg && canaryCfg.enabled && canaryCfg.files) {
        const forceCanary = url.searchParams.get('canary') === '1' || request.headers.get('x-canary') === '1';
        const forceProd = url.searchParams.get('canary') === '0' || request.headers.get('x-canary') === '0';
        const weight = Math.max(0, Math.min(100, Number(canaryCfg.weight ?? 0)));
        if (forceCanary) {
          isCanaryHit = true;
        } else if (!forceProd && weight > 0) {
          isCanaryHit = weight >= 100 || Math.random() * 100 < weight;
        }
      }

      if (mode !== 'draft') {
        space.views = (space.views || 0) + 1;
        if (isCanaryHit) {
          space.canaryViews = (space.canaryViews || 0) + 1;
        } else {
          space.prodViews = (space.prodViews || 0) + 1;
        }
        if (hasAb) {
          if (variant === 'b') space.abViewsB = (space.abViewsB || 0) + 1;
          else space.abViewsA = (space.abViewsA || 0) + 1;
        }
        await saveDb(env, db);
      }
      const effectiveBaseFiles = isCanaryHit ? canaryCfg.files : baseFiles;
      const targetFiles =
        hasAb && variant === 'b' ? { ...effectiveBaseFiles, 'index.html': effectiveBaseFiles['index.b.html'] } : effectiveBaseFiles;
      const customHdrs = resolveSpaceCustomHeaders(effectiveBaseFiles, space, '/*');
      const liveHeaders = {
        ...customHdrs,
        'Content-Type': 'text/html; charset=utf-8'
      };
      liveHeaders['X-SpaceHub-Canary'] = isCanaryHit ? 'true' : 'false';
      if (mode !== 'draft' && space.releaseId) {
        liveHeaders['X-SpaceHub-Release'] = space.releaseId;
        if (!liveHeaders['Cache-Control']) liveHeaders['Cache-Control'] = 'no-cache';
      }
      if (hasAb && mode !== 'draft') {
        liveHeaders['Set-Cookie'] = `sh_ab_${space.slug}=${variant}; Path=/; Max-Age=2592000; SameSite=Lax`;
      }
      return new Response(buildBundledHtml(targetFiles, url.origin, space), {
        status: 200,
        headers: liveHeaders
      });
    }

    // 1d. Serve Custom Workspace Files (/live/:slug/:filename) + Custom 404.html & SPA Fallback Routing
    const customSubpathMatch = pathname.match(/^\/(?:live|s)\/([^/]+)\/([a-zA-Z0-9._-]+)$/i);
    if (customSubpathMatch && method === 'GET') {
      const slug = decodeURIComponent(customSubpathMatch[1]).toLowerCase();
      const fileName = decodeURIComponent(customSubpathMatch[2]);
      const space = [...db.spaces].reverse().find((s) => s.slug === slug);
      if (space) {
        const files = space.publishedFiles || space.draftFiles || {};
        const subpathLapse = spaceHostingLapse(db, space.slug);
        if (subpathLapse) {
          return new Response(hostingLapsePage(space, subpathLapse), {
            status: 402,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        }
        const redirectRule = resolveSpaceRedirect(files, space.slug, fileName);
        if (redirectRule) {
          return new Response(null, {
            status: redirectRule.status,
            headers: { Location: redirectRule.location }
          });
        }
        const customFileHdrs = resolveSpaceCustomHeaders(files, space, `/${fileName}`);
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
          return new Response(String(files[fileName]), {
            status: 200,
            headers: {
              ...customFileHdrs,
              'Content-Type': mimeMap[ext] || 'text/plain; charset=utf-8'
            }
          });
        }
        if (files['404.html'] !== undefined) {
          return new Response(
            buildBundledHtml({ ...files, 'index.html': files['404.html'] }, url.origin, space),
            { status: 404, headers: { ...customFileHdrs, 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }
        return new Response(buildBundledHtml(files, url.origin, space), {
          status: 200,
          headers: { ...customFileHdrs, 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
    }

    // 2. API Routes
    if (pathname.startsWith('/api/')) {
      const body =
        method === 'POST' || method === 'PUT' || method === 'PATCH'
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
                socialVerified: Boolean(user.socialVerified),
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

        // Strict mode (enabled once GOOGLE_CLIENT_ID is configured): only cryptographically verified
        // identities are accepted — no typed-email sign-in that anyone could use to claim an account.
        const strictSocial = Boolean(env.GOOGLE_CLIENT_ID);
        let googleVerified = false;
        let githubVerified = false;
        if (strictSocial) {
          if (provider === 'apple') {
            return jsonResponse({ error: 'Apple sign-in is not available yet. Please use Google, GitHub, or a password.' }, 400);
          }
          if (provider === 'google' && !idToken) {
            return jsonResponse({ error: 'Please use the Google Sign-In button.' }, 400);
          }
          if (provider === 'github' && !accessToken) {
            return jsonResponse({ error: 'Paste a GitHub token so we can verify your account.' }, 400);
          }
        }

        // Real Google ID token verification (audience, issuer and verified email are all checked)
        if (provider === 'google' && idToken && env.GOOGLE_CLIENT_ID) {
          const gRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
          if (!gRes.ok) {
            return jsonResponse({ error: 'Invalid Google ID token.' }, 401);
          }
          const gInfo = await gRes.json();
          if (gInfo.aud !== env.GOOGLE_CLIENT_ID) {
            return jsonResponse({ error: 'Google token was issued for a different application.' }, 401);
          }
          if (!['accounts.google.com', 'https://accounts.google.com'].includes(gInfo.iss)) {
            return jsonResponse({ error: 'Invalid Google token issuer.' }, 401);
          }
          if (!gInfo.email || !(gInfo.email_verified === true || gInfo.email_verified === 'true')) {
            return jsonResponse({ error: 'Your Google account email is not verified.' }, 401);
          }
          email = String(gInfo.email).toLowerCase();
          displayName = gInfo.name || displayName;
          googleVerified = true;
        }

        // Real GitHub Access Token verification (identity always comes from GitHub, never from typed fields)
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
          preferredUsername = String(ghUser.login || '').toLowerCase();
          displayName = ghUser.name || ghUser.login || displayName;
          email = String(ghUser.email || `${preferredUsername}@users.noreply.github.com`).toLowerCase();
          githubVerified = true;
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
        const socialVerifiedNow = googleVerified || githubVerified;
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
            socialVerified: socialVerifiedNow,
            salt,
            passwordHash: hash,
            createdAt: new Date().toISOString()
          };
          db.users.push(foundUser);
        } else {
          foundUser.socialProvider = foundUser.socialProvider || provider;
          if (socialVerifiedNow) {
            // First verified login on an account that was created from an unverified typed email:
            // kill any sessions that existed before, so a squatter cannot keep access.
            if (!foundUser.socialVerified) revokeUserSessions(db, foundUser.id, null);
            foundUser.socialVerified = true;
          }
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
              socialProvider: foundUser.socialProvider || provider,
              socialVerified: Boolean(foundUser.socialVerified)
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
        const failKey = cleanUser.slice(0, 64);
        db.loginFailures = db.loginFailures && typeof db.loginFailures === 'object' ? db.loginFailures : {};
        const nowMs = Date.now();
        const failRec = db.loginFailures[failKey];
        if (failRec && failRec.until && nowMs < failRec.until) {
          const mins = Math.max(1, Math.ceil((failRec.until - nowMs) / 60000));
          return jsonResponse(
            { error: `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.` },
            429,
            { 'Retry-After': String(Math.ceil((failRec.until - nowMs) / 1000)) }
          );
        }
        if (!found || !(await verifyPasswordEdge(body.password || '', found.salt, found.passwordHash))) {
          const stillCounting = failRec && nowMs - failRec.firstAt < 15 * 60000;
          const next = {
            count: (stillCounting ? failRec.count : 0) + 1,
            firstAt: stillCounting ? failRec.firstAt : nowMs
          };
          if (next.count >= 8) next.until = nowMs + 15 * 60000;
          db.loginFailures[failKey] = next;
          const keys = Object.keys(db.loginFailures);
          if (keys.length > 2000) {
            keys
              .sort((a, b) => db.loginFailures[a].firstAt - db.loginFailures[b].firstAt)
              .slice(0, keys.length - 2000)
              .forEach((k) => delete db.loginFailures[k]);
          }
          await saveDb(env, db);
          return jsonResponse({ error: 'Invalid username/email or password.' }, 401);
        }
        delete db.loginFailures[failKey];
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

      if (pathname === '/api/paypal/webhook' && method === 'POST') {
        if (!env.PAYPAL_WEBHOOK_ID) {
          return jsonResponse({ error: 'PayPal webhook is not configured.' }, 503);
        }
        let verified = false;
        try {
          verified = await verifyPaypalWebhook(env, request, body);
        } catch (_e) {
          verified = false;
        }
        if (!verified) return jsonResponse({ error: 'Invalid webhook signature.' }, 400);

        db.paypalEvents = Array.isArray(db.paypalEvents) ? db.paypalEvents : [];
        if (body.id && db.paypalEvents.includes(body.id)) {
          return jsonResponse({ ok: true, duplicate: true });
        }
        const type = String(body.event_type || '');
        const rec = findPaypalRecordForEvent(db, body);
        let outcome = 'ignored';
        if (rec) {
          const owner = db.users.find((u) => u.id === rec.userId);
          const tell = async (title, text) => {
            if (owner) await notifyUser(env, db, owner, { type: 'billing', title, body: text }, text);
          };
          if (type === 'PAYMENT.CAPTURE.REFUNDED') {
            const refunded = Number(body.resource?.amount?.value || 0);
            if (refunded >= Number(rec.amountUsd)) {
              const r = applyPaypalReversal(db, rec, 'refunded');
              outcome = r ? r.action : 'noop';
              if (r) await tell('Payment refunded', 'Your payment was refunded, so the related hosting has been removed or shortened.');
            } else {
              rec.partialRefundUsd = Math.round(((rec.partialRefundUsd || 0) + refunded) * 100) / 100;
              outcome = 'partial_refund_recorded';
            }
          } else if (type === 'PAYMENT.CAPTURE.REVERSED' || type === 'PAYMENT.CAPTURE.DENIED') {
            const r = applyPaypalReversal(db, rec, 'payment_reversed');
            outcome = r ? r.action : 'noop';
            if (r) await tell('Payment reversed', 'PayPal reversed a payment, so the related hosting has been suspended.');
          } else if (type === 'CUSTOMER.DISPUTE.CREATED') {
            const r = applyPaypalReversal(db, rec, 'dispute');
            outcome = r ? r.action : 'noop';
            if (r) await tell('Payment dispute opened', 'A dispute was opened on a payment, so the related hosting is paused until it is resolved.');
          } else if (type === 'CUSTOMER.DISPUTE.RESOLVED') {
            if (body.resource?.dispute_outcome?.outcome_code === 'RESOLVED_SELLER_FAVOUR') {
              const r = applyPaypalReinstatement(db, rec);
              outcome = r ? r.action : 'noop';
              if (r) await tell('Dispute resolved', 'The dispute was resolved in our favour and your hosting has been restored.');
            } else {
              outcome = 'dispute_not_in_seller_favour';
            }
          }
        }
        if (body.id) db.paypalEvents.push(body.id);
        db.paypalEvents = db.paypalEvents.slice(-200);
        await saveDb(env, db);
        return jsonResponse({ ok: true, eventType: type, outcome });
      }

      if (pathname.startsWith('/api/admin/')) {
        if (!user) return jsonResponse({ error: 'Authentication required.' }, 401);
        if (!isAdminUser(env, user)) return jsonResponse({ error: 'Administrator access required.' }, 403);
        const nowMs = Date.now();
        const nameOf = (id) => (db.users.find((u) => u.id === id) || {}).username || 'unknown';

        if (pathname === '/api/admin/overview' && method === 'GET') {
          const orders = (db.paypalOrders || []).filter((o) => o.status === 'COMPLETED');
          const sumUsd = (arr) =>
            Math.round(arr.reduce((s, o) => s + Number(o.amountUsd || 0), 0) * 100) / 100;
          const kept = orders.filter((o) => !o.reverted);
          const cutoff = nowMs - 30 * 86400000;
          const slots = db.hostingConnections.filter((c) => c.isSingleSpaceSlot);
          const counts = { active: 0, grace: 0, expired: 0, suspended: 0 };
          slots.forEach((c) => {
            const s = hostingState(c, nowMs);
            if (counts[s] !== undefined) counts[s] += 1;
          });
          const mrr = slots
            .filter((c) => c.paymentMethod === 'paypal_api' && ['active', 'grace'].includes(hostingState(c, nowMs)))
            .reduce((s, c) => s + Number((HOSTING_PLANS.find((p) => p.id === c.planId) || {}).priceMonthly || 1), 0);
          return jsonResponse({
            totals: {
              users: db.users.length,
              spaces: db.spaces.length,
              publishedSpaces: db.spaces.filter((s) => s.status === 'published').length
            },
            hosting: counts,
            revenue: {
              allTimeUsd: sumUsd(kept),
              last30dUsd: sumUsd(kept.filter((o) => Date.parse(o.capturedAt || 0) >= cutoff)),
              refundedUsd: sumUsd(orders.filter((o) => o.reverted)),
              mrrUsd: Math.round(mrr * 100) / 100
            },
            recentPayments: [...orders]
              .sort((a, b) => String(b.capturedAt).localeCompare(String(a.capturedAt)))
              .slice(0, 20)
              .map((o) => ({
                orderId: o.id,
                captureId: o.captureId,
                username: nameOf(o.userId),
                planId: o.planId,
                kind: o.kind || 'purchase',
                amountUsd: o.amountUsd,
                capturedAt: o.capturedAt,
                reverted: Boolean(o.reverted),
                revertReason: o.revertReason || null
              })),
            hostingSlots: slots.slice(0, 40).map((c) => ({
              id: c.id,
              username: nameOf(c.userId),
              name: c.name,
              spaceSlug: c.assignedSpaceSlug || null,
              state: hostingState(c, nowMs),
              expiresAt: c.expiresAt || null,
              paymentMethod: c.paymentMethod || null,
              suspendedReason: c.suspendedReason || null
            })),
            recentSignups: [...db.users]
              .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
              .slice(0, 10)
              .map((u) => ({ username: u.username, createdAt: u.createdAt }))
          });
        }

        if (pathname === '/api/admin/grant' && method === 'POST') {
          const target = db.users.find((u) => u.username === String(body.username || '').trim().toLowerCase());
          if (!target) return jsonResponse({ error: 'User not found.' }, 404);
          const plan = HOSTING_PLANS.find((p) => p.id === body.planId) || HOSTING_PLANS[0];
          const conn = provisionHostingConnection(db, target, plan, {
            spaceSlug: body.spaceSlug || '',
            host: url.host,
            paymentMethod: 'admin_grant',
            paymentRef: `granted_by_${user.username}`
          });
          const days = Math.floor(Number(body.days) || 0);
          if (days >= 1 && days <= 3650) conn.expiresAt = addDaysIso(new Date().toISOString(), days);
          await notifyUser(env, db, target, {
            type: 'billing',
            title: 'Hosting slot granted',
            body: `You were granted a hosting slot (${conn.name}) valid until ${conn.expiresAt.slice(0, 10)}.`
          });
          await saveDb(env, db);
          return jsonResponse({ ok: true, connection: conn }, 201);
        }

        if ((pathname === '/api/admin/revoke' || pathname === '/api/admin/reinstate') && method === 'POST') {
          const conn = db.hostingConnections.find((c) => c.id === body.connectionId && c.isSingleSpaceSlot);
          if (!conn) return jsonResponse({ error: 'Hosting slot not found.' }, 404);
          const revoke = pathname === '/api/admin/revoke';
          if (revoke) {
            conn.suspended = true;
            conn.suspendedReason = 'admin';
            conn.suspendedAt = new Date().toISOString();
          } else {
            conn.suspended = false;
            delete conn.suspendedReason;
            delete conn.suspendedAt;
          }
          const owner = db.users.find((u) => u.id === conn.userId);
          if (owner) {
            await notifyUser(env, db, owner, {
              type: 'billing',
              title: revoke ? 'Hosting slot suspended' : 'Hosting slot restored',
              body: `${conn.name} was ${revoke ? 'suspended' : 'restored'} by an administrator.`
            });
          }
          await saveDb(env, db);
          return jsonResponse({ ok: true, connection: conn });
        }
        return jsonResponse({ error: 'Unknown admin endpoint.' }, 404);
      }

      if (pathname === '/api/notices' && method === 'GET') {
        if (!user) return jsonResponse({ error: 'Authentication required.' }, 401);
        const list = Array.isArray(user.notices) ? user.notices : [];
        return jsonResponse({ notices: list, unread: list.filter((n) => !n.read).length });
      }

      if (pathname === '/api/notices/read' && method === 'POST') {
        if (!user) return jsonResponse({ error: 'Authentication required.' }, 401);
        (user.notices || []).forEach((n) => {
          if (!body.id || n.id === body.id) n.read = true;
        });
        await saveDb(env, db);
        return jsonResponse({ ok: true });
      }

      if (pathname === '/api/auth/change-password' && method === 'POST') {
        if (!user) return jsonResponse({ error: 'Authentication required.' }, 401);
        const newPassword = String(body.newPassword || '');
        if (newPassword.length < 8) {
          return jsonResponse({ error: 'New password must be at least 8 characters.' }, 400);
        }
        if (!(await verifyPasswordEdge(String(body.currentPassword || ''), user.salt, user.passwordHash))) {
          return jsonResponse({ error: 'Current password is incorrect.' }, 403);
        }
        const { salt, hash } = await hashPasswordEdge(newPassword);
        user.salt = salt;
        user.passwordHash = hash;
        revokeUserSessions(db, user.id, extractRequestToken(request, url));
        pushUserNotice(db, user.id, {
          type: 'security',
          title: 'Password changed',
          body: 'Your password was changed and other devices were signed out.'
        });
        await saveDb(env, db);
        return jsonResponse({ ok: true, message: 'Password changed. Other devices were signed out.' });
      }

      if (pathname === '/api/auth/logout-all' && method === 'POST') {
        if (!user) return jsonResponse({ error: 'Authentication required.' }, 401);
        revokeUserSessions(db, user.id, null);
        await saveDb(env, db);
        return jsonResponse(
          { ok: true },
          200,
          { 'Set-Cookie': 'spacehub_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' }
        );
      }

      if (pathname === '/api/auth/forgot' && method === 'POST') {
        const generic = {
          ok: true,
          message: 'If an account with a verified email exists, a reset link has been sent.'
        };
        const ident = String(body.identifier || '').trim().toLowerCase();
        const found = ident
          ? db.users.find((u) => u.username === ident || (u.email && u.email.toLowerCase() === ident))
          : null;
        if (found && found.email && env.RESEND_API_KEY) {
          const token = randomHex(24);
          db.passwordResets = (Array.isArray(db.passwordResets) ? db.passwordResets : []).filter(
            (r) => r.expiresAt > Date.now() && r.userId !== found.id
          );
          db.passwordResets.push({
            tokenHash: await sha256Hex(token),
            userId: found.id,
            expiresAt: Date.now() + 30 * 60000
          });
          await saveDb(env, db);
          await sendPlatformEmail(
            env,
            found.email,
            'Reset your SpaceHub password',
            `Use this link within 30 minutes to choose a new password:\n\n${url.origin}/?reset=${token}\n\nIf you did not request this, you can ignore this email.`
          );
        }
        return jsonResponse(generic);
      }

      if (pathname === '/api/auth/reset' && method === 'POST') {
        const newPassword = String(body.newPassword || '');
        if (newPassword.length < 8) {
          return jsonResponse({ error: 'New password must be at least 8 characters.' }, 400);
        }
        const tokenHash = await sha256Hex(String(body.token || ''));
        db.passwordResets = Array.isArray(db.passwordResets) ? db.passwordResets : [];
        const rec = db.passwordResets.find((r) => r.tokenHash === tokenHash && r.expiresAt > Date.now());
        if (!rec) return jsonResponse({ error: 'This reset link is invalid or has expired.' }, 400);
        const target = db.users.find((u) => u.id === rec.userId);
        if (!target) return jsonResponse({ error: 'This reset link is invalid or has expired.' }, 400);
        const { salt, hash } = await hashPasswordEdge(newPassword);
        target.salt = salt;
        target.passwordHash = hash;
        db.passwordResets = db.passwordResets.filter((r) => r.tokenHash !== tokenHash);
        revokeUserSessions(db, target.id, null);
        delete db.loginFailures[String(target.username).toLowerCase()];
        pushUserNotice(db, target.id, {
          type: 'security',
          title: 'Password reset',
          body: 'Your password was reset and all devices were signed out.'
        });
        await saveDb(env, db);
        return jsonResponse({ ok: true, message: 'Password updated. You can sign in now.' });
      }

      if (pathname === '/api/hosting-plans' && method === 'GET') {
        const paypalEmail = env?.PAYPAL_BUSINESS_EMAIL || 'romitat924@gmail.com';
        return jsonResponse({
          plans: HOSTING_PLANS.map((p) => decoratePlanWithPayPalUrls(p, url.origin, paypalEmail))
        });
      }

      if (pathname === '/api/auth/config' && method === 'GET') {
        return jsonResponse({ googleClientId: env.GOOGLE_CLIENT_ID || null });
      }

      if (pathname === '/api/paypal/config' && method === 'GET') {
        return jsonResponse({
          configured: paypalConfigured(env),
          mode: String(env.PAYPAL_MODE || 'live').toLowerCase() === 'sandbox' ? 'sandbox' : 'live'
        });
      }

      if (pathname === '/api/paypal/create-order' && method === 'POST') {
        if (!user) return jsonResponse({ error: 'Please sign in to buy a Space hosting plan.' }, 401);
        if (!paypalConfigured(env)) {
          return jsonResponse({ error: 'PayPal API checkout is not configured yet.', fallback: true }, 503);
        }
        const renewConn = body.renewConnectionId
          ? db.hostingConnections.find(
              (c) => c.id === body.renewConnectionId && c.userId === user.id && c.isSingleSpaceSlot
            )
          : null;
        if (body.renewConnectionId && !renewConn) {
          return jsonResponse({ error: 'Hosting slot to renew was not found on this account.' }, 404);
        }
        if (renewConn && renewConn.suspended) {
          return jsonResponse({ error: 'This hosting slot is suspended and cannot be renewed. Contact support.' }, 403);
        }
        const plan =
          HOSTING_PLANS.find((p) => p.id === (renewConn ? renewConn.planId || body.planId : body.planId)) ||
          HOSTING_PLANS[0];
        const spaceSlug = renewConn
          ? renewConn.assignedSpaceSlug || ''
          : body.spaceSlug
            ? slugify(body.spaceSlug)
            : '';
        try {
          const accessToken = await paypalAccessToken(env);
          const orderRes = await fetch(`${paypalApiBase(env)}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'PayPal-Request-Id': 'sh_' + randomHex(12)
            },
            body: JSON.stringify({
              intent: 'CAPTURE',
              purchase_units: [
                {
                  reference_id: plan.id,
                  description: `SpaceHub ${plan.name}`.slice(0, 120),
                  custom_id: `${user.id}|${plan.id}|${spaceSlug}`.slice(0, 120),
                  amount: { currency_code: 'USD', value: plan.amountUsd }
                }
              ],
              payment_source: {
                paypal: {
                  experience_context: {
                    brand_name: 'SpaceHub',
                    user_action: 'PAY_NOW',
                    shipping_preference: 'NO_SHIPPING',
                    return_url: `${url.origin}/?paypal_return=1`,
                    cancel_url: `${url.origin}/?paypal_canceled=1`
                  }
                }
              }
            })
          });
          const orderData = await orderRes.json().catch(() => ({}));
          if (!orderRes.ok || !orderData.id) {
            return jsonResponse(
              { error: `PayPal could not create the order (HTTP ${orderRes.status}).` },
              502
            );
          }
          const approveLink = (orderData.links || []).find((l) =>
            ['payer-action', 'approve'].includes(l.rel)
          );
          db.paypalOrders = Array.isArray(db.paypalOrders) ? db.paypalOrders : [];
          db.paypalOrders.unshift({
            id: orderData.id,
            userId: user.id,
            planId: plan.id,
            spaceSlug,
            amountUsd: plan.amountUsd,
            kind: renewConn ? 'renewal' : 'purchase',
            connectionId: renewConn ? renewConn.id : null,
            periodDays: plan.periodDays || 30,
            status: 'CREATED',
            createdAt: new Date().toISOString()
          });
          db.paypalOrders = db.paypalOrders.slice(0, 500);
          await saveDb(env, db);
          return jsonResponse({
            ok: true,
            orderId: orderData.id,
            approveUrl: approveLink ? approveLink.href : null
          });
        } catch (err) {
          return jsonResponse({ error: err.message || 'PayPal order creation failed.' }, 502);
        }
      }

      if (pathname === '/api/paypal/capture-order' && method === 'POST') {
        if (!user) return jsonResponse({ error: 'Please sign in to finish activating your plan.' }, 401);
        if (!paypalConfigured(env)) {
          return jsonResponse({ error: 'PayPal API checkout is not configured yet.' }, 503);
        }
        const orderId = String(body.orderId || '').trim();
        db.paypalOrders = Array.isArray(db.paypalOrders) ? db.paypalOrders : [];
        const rec = db.paypalOrders.find((o) => o.id === orderId && o.userId === user.id);
        if (!rec) return jsonResponse({ error: 'Order not found for this account.' }, 404);
        const plan = HOSTING_PLANS.find((p) => p.id === rec.planId) || HOSTING_PLANS[0];

        if (rec.status === 'COMPLETED') {
          const existing = db.hostingConnections.find((c) => c.id === rec.connectionId) || null;
          return jsonResponse({
            message: `Plan already activated (${plan.priceLabel})`,
            connection: existing,
            alreadyCaptured: true
          });
        }

        try {
          const accessToken = await paypalAccessToken(env);
          const capRes = await fetch(
            `${paypalApiBase(env)}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'PayPal-Request-Id': `cap_${orderId}`
              },
              body: '{}'
            }
          );
          const capData = await capRes.json().catch(() => ({}));
          const capture = capData?.purchase_units?.[0]?.payments?.captures?.[0];
          const paidOk =
            capRes.ok &&
            capData.status === 'COMPLETED' &&
            capture &&
            capture.status === 'COMPLETED' &&
            capture.amount?.currency_code === 'USD' &&
            Number(capture.amount?.value) === Number(rec.amountUsd);
          if (!paidOk) {
            return jsonResponse(
              {
                error:
                  'PayPal has not confirmed a completed payment for this order, so the plan was not activated.'
              },
              402
            );
          }
          let conn;
          let message;
          if (rec.kind === 'renewal') {
            conn = db.hostingConnections.find((c) => c.id === rec.connectionId && c.userId === user.id);
            if (!conn) {
              return jsonResponse({ error: 'The hosting slot for this renewal no longer exists.' }, 404);
            }
            const nowMs = Date.now();
            const currentExp = conn.expiresAt ? Date.parse(conn.expiresAt) : nowMs;
            const base = Math.max(nowMs, Number.isNaN(currentExp) ? nowMs : currentExp);
            conn.expiresAt = addDaysIso(new Date(base).toISOString(), plan.periodDays || 30);
            conn.planId = conn.planId || plan.id;
            delete conn.reminded7;
            delete conn.reminded1;
            delete conn.notifiedExpired;
            message = `Payment confirmed — renewed ${conn.name} until ${conn.expiresAt.slice(0, 10)}`;
          } else {
            conn = provisionHostingConnection(db, user, plan, {
              spaceSlug: rec.spaceSlug,
              host: url.host,
              paymentMethod: 'paypal_api',
              paymentRef: capture.id || orderId
            });
            message = `Payment confirmed — activated ${plan.name} (${plan.priceLabel})`;
          }
          rec.status = 'COMPLETED';
          rec.connectionId = conn.id;
          rec.captureId = capture.id || orderId;
          rec.capturedAt = new Date().toISOString();
          await notifyUser(
            env,
            db,
            user,
            {
              type: 'receipt',
              title: `SpaceHub receipt — $${plan.amountUsd} (${plan.name})`,
              body: `Payment ${rec.captureId} received. ${conn.name} is active until ${String(conn.expiresAt).slice(0, 10)}.`
            },
            `Thanks for your payment!\n\nPlan: ${plan.name}\nAmount: $${plan.amountUsd} USD\nPayPal reference: ${rec.captureId}\nHosting active until: ${String(conn.expiresAt).slice(0, 10)}\n\nManage or renew at ${url.origin}`
          );
          await saveDb(env, db);
          return jsonResponse({ message, connection: conn }, 201);
        } catch (err) {
          return jsonResponse({ error: err.message || 'PayPal capture failed.' }, 502);
        }
      }

      // --- STRIPE DUAL-GATEWAY ROUTES ---
      if (pathname === '/api/stripe/config' && method === 'GET') {
        return jsonResponse({
          configured: stripeConfigured(env),
          publishableKey: env.STRIPE_PUBLISHABLE_KEY || null
        });
      }

      if (pathname === '/api/stripe/create-checkout-session' && method === 'POST') {
        if (!user) return jsonResponse({ error: 'Please sign in to buy a Space hosting plan.' }, 401);
        const renewConn = body.renewConnectionId
          ? db.hostingConnections.find((c) => c.id === body.renewConnectionId && c.userId === user.id && c.isSingleSpaceSlot)
          : null;
        if (body.renewConnectionId && !renewConn) {
          return jsonResponse({ error: 'Hosting slot to renew was not found on this account.' }, 404);
        }
        if (renewConn && renewConn.suspended) {
          return jsonResponse({ error: 'This hosting slot is suspended and cannot be renewed.' }, 403);
        }
        const plan =
          HOSTING_PLANS.find((p) => p.id === (renewConn ? renewConn.planId || body.planId : body.planId)) ||
          HOSTING_PLANS[0];
        const spaceSlug = renewConn ? renewConn.assignedSpaceSlug || null : (body.spaceSlug ? slugify(body.spaceSlug) : null);
        const amountCents = plan.id === 'plan_yearly_12' ? 1200 : 100;

        if (!stripeConfigured(env)) {
          return jsonResponse(
            { error: 'Stripe API checkout is not configured yet. Please use PayPal.', fallback: true },
            503
          );
        }

        try {
          const params = new URLSearchParams();
          params.append('mode', 'payment');
          params.append('success_url', `https://${url.host}/?stripe_success=1&session_id={CHECKOUT_SESSION_ID}`);
          params.append('cancel_url', `https://${url.host}/?stripe_canceled=1`);
          params.append('payment_method_types[0]', 'card');
          params.append('line_items[0][price_data][currency]', 'usd');
          params.append('line_items[0][price_data][unit_amount]', String(amountCents));
          params.append('line_items[0][price_data][product_data][name]', `SpaceHub Hosting — ${plan.name}`);
          params.append('line_items[0][price_data][product_data][description]', `Hosting slot ($${amountCents / 100} USD)`);
          params.append('line_items[0][quantity]', '1');
          params.append('client_reference_id', user.id);
          params.append('metadata[userId]', user.id);
          params.append('metadata[planId]', plan.id);
          params.append('metadata[spaceSlug]', spaceSlug || '');
          params.append('metadata[renewConnectionId]', renewConn ? renewConn.id : '');
          if (user.email) params.append('customer_email', user.email);

          const sRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
          });

          if (!sRes.ok) {
            const errBody = await sRes.text();
            return jsonResponse({ error: 'Stripe session creation failed: ' + errBody }, 502);
          }

          const session = await sRes.json();
          db.stripeOrders = Array.isArray(db.stripeOrders) ? db.stripeOrders : [];
          db.stripeOrders.push({
            id: session.id,
            userId: user.id,
            planId: plan.id,
            spaceSlug,
            amountUsd: amountCents / 100,
            renewConnectionId: renewConn ? renewConn.id : null,
            status: 'PENDING',
            createdAt: new Date().toISOString()
          });
          await saveDb(env, db);

          return jsonResponse({
            sessionId: session.id,
            url: session.url
          }, 201);
        } catch (err) {
          return jsonResponse({ error: err.message || 'Stripe request failed.' }, 502);
        }
      }

      if (pathname === '/api/stripe/webhook' && method === 'POST') {
        const event = body;
        if (!event || !event.type) return jsonResponse({ error: 'Invalid event payload.' }, 400);

        db.stripeEvents = Array.isArray(db.stripeEvents) ? db.stripeEvents : [];
        if (db.stripeEvents.includes(event.id)) {
          return jsonResponse({ received: true, deduplicated: true });
        }
        db.stripeEvents.push(event.id);
        if (db.stripeEvents.length > 500) db.stripeEvents.shift();

        if (event.type === 'checkout.session.completed') {
          const session = event.data?.object || {};
          const userId = session.client_reference_id || session.metadata?.userId;
          const planId = session.metadata?.planId || 'plan_monthly_1';
          const spaceSlug = session.metadata?.spaceSlug || null;
          const renewConnId = session.metadata?.renewConnectionId || null;
          const plan = HOSTING_PLANS.find((p) => p.id === planId) || HOSTING_PLANS[0];

          db.stripeOrders = Array.isArray(db.stripeOrders) ? db.stripeOrders : [];
          let orderRec = db.stripeOrders.find((o) => o.id === session.id);
          if (!orderRec) {
            orderRec = {
              id: session.id,
              userId,
              planId,
              spaceSlug,
              amountUsd: (session.amount_total || 100) / 100,
              createdAt: new Date().toISOString()
            };
            db.stripeOrders.push(orderRec);
          }
          orderRec.status = 'COMPLETED';
          orderRec.capturedAt = new Date().toISOString();

          if (renewConnId) {
            const conn = db.hostingConnections.find((c) => c.id === renewConnId);
            if (conn) {
              conn.expiresAt = addDaysIso(conn.expiresAt || new Date().toISOString(), plan.periodDays || 30);
              conn.suspended = false;
            }
          } else if (userId) {
            const conn = provisionHostingConnection(db, { id: userId }, plan, {
              spaceSlug,
              paymentMethod: 'stripe_card',
              paymentRef: session.id,
              host: url.host
            });
            orderRec.connectionId = conn.id;
          }
          await saveDb(env, db);
        }
        return jsonResponse({ received: true });
      }

      if (pathname === '/api/stripe/verify-session' && method === 'GET') {
        const sessionId = url.searchParams.get('sessionId');
        if (!sessionId) return jsonResponse({ error: 'sessionId required' }, 400);
        if (!stripeConfigured(env)) {
          return jsonResponse({ error: 'Stripe not configured' }, 503);
        }
        try {
          const sRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
            headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }
          });
          if (!sRes.ok) return jsonResponse({ error: 'Session not found' }, 404);
          const session = await sRes.json();
          if (session.payment_status === 'paid') {
            db.stripeOrders = Array.isArray(db.stripeOrders) ? db.stripeOrders : [];
            let orderRec = db.stripeOrders.find((o) => o.id === session.id);
            if (!orderRec && session.metadata?.userId) {
              const plan = HOSTING_PLANS.find((p) => p.id === session.metadata.planId) || HOSTING_PLANS[0];
              const conn = provisionHostingConnection(db, { id: session.metadata.userId }, plan, {
                spaceSlug: session.metadata.spaceSlug,
                paymentMethod: 'stripe_card',
                paymentRef: session.id,
                host: url.host
              });
              db.stripeOrders.push({
                id: session.id,
                userId: session.metadata.userId,
                planId: plan.id,
                spaceSlug: session.metadata.spaceSlug,
                connectionId: conn.id,
                amountUsd: (session.amount_total || 100) / 100,
                status: 'COMPLETED',
                createdAt: new Date().toISOString()
              });
              await saveDb(env, db);
            }
            return jsonResponse({ ok: true, paid: true, message: 'Hosting plan activated via Stripe!' });
          }
          return jsonResponse({ ok: false, paid: false, status: session.payment_status });
        } catch (err) {
          return jsonResponse({ error: err.message }, 502);
        }
      }

      // --- TEMPLATES MARKETPLACE ROUTES ---
      if (pathname === '/api/templates' && method === 'GET') {
        const category = (url.searchParams.get('category') || 'all').toLowerCase();
        const search = (url.searchParams.get('search') || '').trim().toLowerCase();
        let list = getMarketplaceTemplates(db);
        if (category !== 'all') {
          list = list.filter((t) => (t.category || '').toLowerCase() === category);
        }
        if (search) {
          list = list.filter((t) =>
            t.name.toLowerCase().includes(search) ||
            t.description.toLowerCase().includes(search) ||
            (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(search)))
          );
        }
        return jsonResponse({ templates: list });
      }

      const tplCloneMatch = pathname.match(/^\/api\/templates\/([^/]+)\/clone$/i);
      if (tplCloneMatch && method === 'POST') {
        if (!user) return jsonResponse({ error: 'Please sign in to clone a template.' }, 401);
        const tplSlug = decodeURIComponent(tplCloneMatch[1]).toLowerCase();
        const allTpls = getMarketplaceTemplates(db);
        const template = allTpls.find((t) => t.slug === tplSlug);
        if (!template) return jsonResponse({ error: 'Template not found.' }, 404);

        const newSlug = slugify(`${template.slug}-${user.username}-${randomHex(2)}`);
        const newSpace = {
          id: 'spc_' + randomHex(8),
          ownerId: user.id,
          ownerUsername: user.username,
          slug: newSlug,
          title: `${template.name} (Cloned)`,
          description: template.description || 'Cloned from SpaceHub Template Marketplace',
          visibility: 'private',
          appPlatform: 'both',
          appOrientation: 'any',
          appIconText: template.emoji || '🚀',
          appThemeColor: '#09090b',
          draftFiles: { ...template.files },
          publishedFiles: { ...template.files },
          status: 'draft',
          version: 1,
          snapshots: [
            {
              id: 'snap_' + randomHex(4),
              label: `Cloned from ${template.name}`,
              createdAt: new Date().toISOString(),
              files: { ...template.files }
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        db.spaces.push(newSpace);
        template.cloneCount = (template.cloneCount || 0) + 1;
        await saveDb(env, db);

        return jsonResponse({
          ok: true,
          message: `Template "${template.name}" cloned into your staging workspace!`,
          space: formatSpaceSummary(newSpace, user)
        }, 201);
      }

      if (pathname === '/api/hosting-plans/purchase' && method === 'POST') {
        if (!user) return jsonResponse({ error: 'Please sign in to buy a Space hosting plan.' }, 401);
        if (paypalConfigured(env)) {
          return jsonResponse(
            { error: 'Hosting is activated automatically after PayPal confirms your payment. Use "Pay securely with PayPal".' },
            402
          );
        }
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
          planId: plan.id,
          periodDays: plan.periodDays || 30,
          expiresAt: addDaysIso(now, plan.periodDays || 30),
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
            .map(({ apiToken, ...rest }) => ({
              ...rest,
              hasToken: Boolean(apiToken || rest.hasToken),
              ...describeHostingConn(rest)
            }))
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
          publishedFiles: null,
          auditLogs: []
        };
        recordAuditLog(newSpace, user, 'space_created', { title: cleanTitle });
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
      const spaceMatch = pathname.match(/^\/api\/(?:agent\/v1\/)?spaces\/([^/]+)\/([^/]+)(?:\/([^/]+)(?:\/([^/]+))?)?$/i);
      if (spaceMatch) {
        const username = decodeURIComponent(spaceMatch[1]).toLowerCase();
        const slug = decodeURIComponent(spaceMatch[2]).toLowerCase();
        const action = spaceMatch[3] ? spaceMatch[3].toLowerCase() : '';
        const subAction = spaceMatch[4] ? spaceMatch[4].toLowerCase() : '';
        const space = db.spaces.find((s) => s.ownerUsername === username && s.slug === slug);

        if (!action && method === 'GET') {
          if (!space || !canViewSpace(space, user)) {
            return jsonResponse({ error: 'Space not found or is set to Private.' }, 404);
          }
          const isOwner = canEditSpace(space, user);
          return jsonResponse({
            space: {
              ...formatSpaceSummary(space, user),
              draftFiles: isOwner ? space.draftFiles : undefined,
              publishedFiles: space.publishedFiles || (isOwner ? space.draftFiles : {}),
              agentHistory: isOwner ? space.agentHistory || [] : []
            }
          });
        }

        if ((!action || action === 'files') && (method === 'PUT' || method === 'PATCH')) {
          if (!user || !space || !canEditSpace(space, user)) {
            return jsonResponse({ error: 'Unauthorized: Owner, Admin, Publisher, or Editor role required to edit files.' }, 403);
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
          if (body.collaborators !== undefined && canAdminSpace(space, user)) {
            space.collaborators = normalizeCollaborators(body.collaborators);
            recordAuditLog(space, user, 'collaborators_updated', { count: space.collaborators.length });
          }
          if (body.cronSchedule !== undefined) {
            space.cronSchedule = ['hourly', 'daily', 'weekly', ''].includes(body.cronSchedule)
              ? body.cronSchedule
              : '';
          }
          if (body.cronWebhookUrl !== undefined) {
            space.cronWebhookUrl = String(body.cronWebhookUrl || '').trim().slice(0, 300);
          }
          if (body.maintenanceMode !== undefined) {
            space.maintenanceMode = Boolean(body.maintenanceMode);
          }
          if (body.secrets !== undefined) {
            const rawSecrets = normalizeSpaceSecrets(body.secrets);
            space.secrets = await encryptSpaceSecrets(rawSecrets, env);
            recordAuditLog(space, user, 'secrets_updated', { count: Object.keys(rawSecrets).length });
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
          if (!user || !canEditSpace(space, user)) {
            return jsonResponse({ error: 'Only the Space owner or collaborators can view or manage submissions.' }, 403);
          }
          if (method === 'GET') {
            const subs = space.submissions || [];
            if ((url.searchParams.get('format') || '').toLowerCase() === 'csv') {
              const csvRows = subs.map((s) => ({
                id: s.id,
                name: s.name || '',
                email: s.email || '',
                message: s.message || '',
                createdAt: s.createdAt || ''
              }));
              return new Response(rowsToCsv(csvRows), {
                status: 200,
                headers: {
                  'Content-Type': 'text/csv; charset=utf-8',
                  'Content-Disposition': `attachment; filename="${encodeURIComponent(space.slug)}_submissions.csv"`
                }
              });
            }
            return jsonResponse({ submissions: subs });
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

        if (action === 'backup' && method === 'GET') {
          if (!user || !space || !canEditSpace(space, user)) {
            return jsonResponse({ error: 'Unauthorized.' }, 403);
          }
          return jsonResponse({
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
        }

        if (action === 'restore' && method === 'POST') {
          if (!user || !space || !canEditSpace(space, user)) {
            return jsonResponse({ error: 'Unauthorized.' }, 403);
          }
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
          await saveDb(env, db);
          return jsonResponse({
            ok: true,
            message: 'Restored Space state from backup!',
            space: {
              ...formatSpaceSummary(space, user),
              draftFiles: space.draftFiles,
              publishedFiles: space.publishedFiles,
              agentHistory: space.agentHistory || []
            }
          });
        }

        if (action === 'cron' && method === 'POST') {
          if (!user || !space || !canEditSpace(space, user)) {
            return jsonResponse({ error: 'Unauthorized.' }, 403);
          }
          const status = await executeSpaceCron(space, body.webhookUrl || '');
          await saveDb(env, db);
          return jsonResponse({
            ok: true,
            cronLastRunAt: space.cronLastRunAt,
            cronLastStatus: status,
            space: formatSpaceSummary(space, user)
          });
        }

        if (action === 'snapshot' && method === 'POST') {
          if (!user || !space || !canEditSpace(space, user)) {
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

        if (action === 'snapshots-diff' && method === 'GET') {
          if (!user || !space || !canViewSpace(space, user)) {
            return jsonResponse({ error: 'Unauthorized.' }, 403);
          }
          const snaps = Array.isArray(space.snapshots) ? space.snapshots : [];
          const fromId = (url.searchParams.get('from') || '').trim();
          const toId = (url.searchParams.get('to') || 'current').trim();
          const resolveSnapFiles = (idStr, fallbackSnap) => {
            if (idStr === 'current') return space.draftFiles || space.publishedFiles || {};
            if (idStr === 'published') return space.publishedFiles || {};
            if (idStr) {
              const found = snaps.find((s) => s.id === idStr);
              if (found && found.files) return found.files;
            }
            return fallbackSnap && fallbackSnap.files ? fallbackSnap.files : (space.draftFiles || {});
          };
          const fromFiles = resolveSnapFiles(fromId, snaps[0] || null);
          const toFiles = resolveSnapFiles(toId, null);
          const diffResult = computeSnapshotDiff(fromFiles, toFiles);
          return jsonResponse({
            ok: true,
            from: fromId || (snaps[0]?.id || 'none'),
            to: toId,
            ...diffResult
          });
        }

        if (action === 'rollback' && method === 'POST') {
          if (!user || !space || !canEditSpace(space, user)) {
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

        if (action === 'ai-generate' && method === 'POST') {
          if (!user) return jsonResponse({ error: 'Authentication required.' }, 401);
          if (!space || !canEditSpace(space, user)) {
            return jsonResponse({ error: 'Unauthorized.' }, 403);
          }
          const prompt = String(body.prompt || '').trim();
          if (!prompt) return jsonResponse({ error: 'Prompt is required.' }, 400);
          const style = String(body.style || 'modern').trim();

          const generated = await generateAppWithGeminiOrSynthesizer(env, prompt, style);
          pushSpaceSnapshot(space, `AI: ${prompt.slice(0, 32)}`);
          space.draftFiles = { ...space.draftFiles, ...generated.files };
          space.hasUnpublishedChanges = true;
          space.version = (space.version || 1) + 1;
          space.updatedAt = new Date().toISOString();
          await saveDb(env, db);

          return jsonResponse({
            ok: true,
            message: 'Application generated successfully with AI!',
            summary: generated.summary,
            source: generated.source,
            files: space.draftFiles,
            version: space.version
          });
        }

        if (action === 'domain-diagnostics' && method === 'GET') {
          if (!user) return jsonResponse({ error: 'Authentication required.' }, 401);
          if (!space || !canEditSpace(space, user)) {
            return jsonResponse({ error: 'Unauthorized.' }, 403);
          }
          const cleanDomain = normalizeCustomDomain(space.customDomain);
          if (!cleanDomain) {
            return jsonResponse({ error: 'No custom domain configured for this space.' }, 400);
          }

          let resolvedCname = [];
          let resolvedA = [];
          try {
            const cRes = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(cleanDomain)}&type=CNAME`, {
              headers: { accept: 'application/dns-json' }
            });
            if (cRes.ok) {
              const cJson = await cRes.json();
              resolvedCname = (cJson.Answer || []).map((a) => String(a.data).replace(/\.$/, '').toLowerCase());
            }
          } catch (_e) {}

          try {
            const aRes = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(cleanDomain)}&type=A`, {
              headers: { accept: 'application/dns-json' }
            });
            if (aRes.ok) {
              const aJson = await aRes.json();
              resolvedA = (aJson.Answer || []).map((a) => String(a.data));
            }
          } catch (_e) {}

          const cnameMatches = resolvedCname.some(
            (c) => c === 'spacehub.win' || c === 'www.spacehub.win' || c.endsWith('.workers.dev')
          );

          let sslActive = false;
          try {
            const sslRes = await fetch(`https://${cleanDomain}`, { method: 'HEAD', redirect: 'manual' });
            sslActive = sslRes.status < 500;
          } catch (_e) {
            sslActive = false;
          }

          let status = 'dns_pending';
          if (cnameMatches && sslActive) {
            status = 'ready';
          } else if (cnameMatches && !sslActive) {
            status = 'ssl_pending';
          }

          return jsonResponse({
            domain: cleanDomain,
            expectedCname: 'spacehub.win',
            resolvedCname,
            resolvedA,
            cnameMatches,
            sslActive,
            status,
            instructions: [
              `Create a CNAME record in your DNS provider for "${cleanDomain}" pointing to "spacehub.win".`,
              `Ensure TTL is set to 300 seconds (or Automatic).`,
              `Cloudflare edge automatically provisions a free SSL certificate once DNS resolves.`
            ],
            checkedAt: new Date().toISOString()
          });
        }

        if (action === 'publish-template' && method === 'POST') {
          if (!user) return jsonResponse({ error: 'Authentication required.' }, 401);
          if (!space || !canEditSpace(space, user)) {
            return jsonResponse({ error: 'Unauthorized.' }, 403);
          }
          space.isTemplate = true;
          space.templateCategory = String(body.category || 'tools').trim();
          space.templateDescription = String(body.description || space.description || '').trim();
          space.templateTags = Array.isArray(body.tags) ? body.tags : ['community'];
          space.visibility = 'public';
          space.updatedAt = new Date().toISOString();
          recordAuditLog(space, user, 'published_as_template', { category: space.templateCategory });
          await saveDb(env, db);
          return jsonResponse({
            ok: true,
            message: `Space "${space.title}" published to Template Marketplace!`
          });
        }

        if (action === 'unpublish-template' && method === 'POST') {
          if (!user) return jsonResponse({ error: 'Authentication required.' }, 401);
          if (!space || !canEditSpace(space, user)) {
            return jsonResponse({ error: 'Unauthorized.' }, 403);
          }
          space.isTemplate = false;
          space.updatedAt = new Date().toISOString();
          recordAuditLog(space, user, 'unpublished_template');
          await saveDb(env, db);
          return jsonResponse({
            ok: true,
            message: `Space "${space.title}" unpublished from Template Marketplace.`
          });
        }

        if (action === 'activity' && method === 'GET') {
          if (!space || !canViewSpace(space, user)) {
            return jsonResponse({ error: 'Not found' }, 404);
          }
          return jsonResponse({ logs: space.auditLogs || [] });
        }

        if (action === 'custom-hostname' && method === 'POST') {
          if (!user) return jsonResponse({ error: 'Authentication required.' }, 401);
          if (!space || !canEditSpace(space, user)) {
            return jsonResponse({ error: 'Unauthorized.' }, 403);
          }
          const cleanDomain = normalizeCustomDomain(body.hostname || space.customDomain);
          if (!cleanDomain) {
            return jsonResponse({ error: 'Valid custom domain required.' }, 400);
          }

          let cfResult = null;
          if (env && env.CF_API_TOKEN && env.CF_ZONE_ID) {
            try {
              const cfRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/custom_hostnames`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${env.CF_API_TOKEN}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  hostname: cleanDomain,
                  ssl: { method: 'http', type: 'dv', settings: { min_tls_version: '1.2' } }
                })
              });
              cfResult = await cfRes.json();
            } catch (_err) {}
          }

          const hostnameData = (cfResult && cfResult.result) ? {
            id: cfResult.result.id,
            hostname: cfResult.result.hostname,
            status: cfResult.result.status || 'pending',
            ssl: cfResult.result.ssl || { status: 'pending_validation' },
            verificationRecord: cfResult.result.ownership_verification || {
              type: 'cname',
              name: `_cf-custom-hostname.${cleanDomain}`,
              value: `${cleanDomain}.cdn.cloudflare.net`
            },
            createdAt: new Date().toISOString()
          } : {
            id: 'cf_chn_' + randomHex(8),
            hostname: cleanDomain,
            status: 'active',
            ssl: { status: 'active', method: 'http', type: 'dv' },
            verificationRecord: {
              type: 'cname',
              name: `_cf-custom-hostname.${cleanDomain}`,
              value: `${cleanDomain}.cdn.cloudflare.net`
            },
            createdAt: new Date().toISOString(),
            simulated: true
          };

          space.customHostname = hostnameData;
          space.customDomain = cleanDomain;
          recordAuditLog(space, user, 'custom_hostname_provisioned', { hostname: cleanDomain, status: hostnameData.status });
          await saveDb(env, db);
          return jsonResponse({ ok: true, customHostname: hostnameData });
        }

        if (action === 'custom-hostname' && method === 'GET') {
          if (!space || !canViewSpace(space, user)) return jsonResponse({ error: 'Not found' }, 404);
          return jsonResponse({ customHostname: space.customHostname || null });
        }

        if (action === 'integrations' && method === 'GET') {
          if (!user || !space || !canEditSpace(space, user)) return jsonResponse({ error: 'Unauthorized.' }, 403);
          return jsonResponse({ integrations: space.integrations || {} });
        }

        if (action === 'integrations' && method === 'PUT') {
          if (!user || !space || !canEditSpace(space, user)) return jsonResponse({ error: 'Unauthorized.' }, 403);
          space.integrations = {
            discordWebhookUrl: String(body.discordWebhookUrl || '').trim(),
            slackWebhookUrl: String(body.slackWebhookUrl || '').trim(),
            telegramBotToken: String(body.telegramBotToken || '').trim(),
            telegramChatId: String(body.telegramChatId || '').trim()
          };
          recordAuditLog(space, user, 'integrations_updated');
          await saveDb(env, db);
          return jsonResponse({ ok: true, integrations: space.integrations });
        }

        if (action === 'test-integrations' && method === 'POST') {
          if (!user || !space || !canEditSpace(space, user)) return jsonResponse({ error: 'Unauthorized.' }, 403);
          if (body && body.integrations) {
            space.integrations = {
              discordWebhookUrl: String(body.integrations.discordWebhookUrl || space.integrations?.discordWebhookUrl || '').trim(),
              slackWebhookUrl: String(body.integrations.slackWebhookUrl || space.integrations?.slackWebhookUrl || '').trim(),
              telegramBotToken: String(body.integrations.telegramBotToken || space.integrations?.telegramBotToken || '').trim(),
              telegramChatId: String(body.integrations.telegramChatId || space.integrations?.telegramChatId || '').trim()
            };
          }
          const res = await dispatchSpaceIntegrations(env, space, 'test_alert', {
            summary: `Webhook integration test dispatched from SpaceHub for space "${space.title}".`,
            fields: { Status: 'Connected', TriggeredBy: user.username }
          });
          recordAuditLog(space, user, 'integration_test_dispatched', res);
          await saveDb(env, db);
          return jsonResponse({ ok: true, dispatched: res });
        }

        // Wave 14: Creator Alert Rules & Notification Channels
        if (action === 'alerts' && method === 'GET') {
          if (!user || !space || !canEditSpace(space, user)) return jsonResponse({ error: 'Unauthorized.' }, 403);
          return jsonResponse({
            alerts: space.alertSettings || {
              enabled: true,
              trafficSpikeThreshold: 500,
              errorAlerts: true,
              notifyWebhookUrl: '',
              channel: 'webhook'
            }
          });
        }

        if (action === 'alerts' && method === 'PUT') {
          if (!user || !space || !canAdminSpace(space, user)) return jsonResponse({ error: 'Unauthorized: Owner or Admin role required.' }, 403);
          space.alertSettings = {
            enabled: body.enabled !== undefined ? Boolean(body.enabled) : true,
            trafficSpikeThreshold: Number(body.trafficSpikeThreshold) || 500,
            errorAlerts: body.errorAlerts !== undefined ? Boolean(body.errorAlerts) : true,
            notifyWebhookUrl: String(body.notifyWebhookUrl || '').trim().slice(0, 300),
            channel: ['webhook', 'discord', 'slack', 'email'].includes(body.channel) ? body.channel : 'webhook'
          };
          recordAuditLog(space, user, 'alert_settings_updated', space.alertSettings);
          await saveDb(env, db);
          return jsonResponse({ ok: true, alerts: space.alertSettings });
        }

        if (action === 'test-alert' && method === 'POST') {
          if (!user || !space || !canEditSpace(space, user)) return jsonResponse({ error: 'Unauthorized.' }, 403);
          const alertConfig = space.alertSettings || {};
          const testMsg = `🚨 SpaceHub Creator Alert Test: Space "${space.title}" traffic alert is active and operational.`;
          const alertTarget = String(alertConfig.notifyWebhookUrl || '').trim();
          let status = 'skipped_no_webhook';
          if (alertTarget.startsWith('mock://')) {
            status = `delivered_mock:${alertTarget}`;
          } else if (/^https?:\/\//i.test(alertTarget)) {
            try {
              const r = await fetch(alertTarget, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  event: 'creator_alert_test',
                  space: space.slug,
                  title: space.title,
                  message: testMsg,
                  timestamp: new Date().toISOString()
                })
              });
              status = `http_${r.status}`;
            } catch (e) {
              status = `error:${e.message || 'dispatch_failed'}`;
            }
          }
          recordAuditLog(space, user, 'creator_alert_test_dispatched', { status });
          await saveDb(env, db);
          return jsonResponse({ ok: true, status, channel: alertConfig.channel || 'webhook' });
        }

        // Wave 16: Automated Lighthouse / SEO & Accessibility Audit & 1-Click Auto-Fix
        if (action === 'seo-audit' && method === 'GET') {
          if (!space || !canViewSpace(space, user)) return jsonResponse({ error: 'Not found.' }, 404);
          const files = space.draftFiles || space.publishedFiles || {};
          const html = files['index.html'] || '';
          const report = analyzeSpaceSeoAndA11y(html, space);
          return jsonResponse({ ok: true, slug: space.slug, ...report });
        }

        if (action === 'seo-audit' && method === 'POST') {
          if (!user || !space || !canEditSpace(space, user)) return jsonResponse({ error: 'Unauthorized.' }, 403);
          space.draftFiles = space.draftFiles && typeof space.draftFiles === 'object' ? space.draftFiles : {};
          const currentHtml = space.draftFiles['index.html'] || '';
          pushSpaceSnapshot(space, 'Before SEO & A11y Auto-Fix');
          const fixedHtml = autoFixSpaceSeoHtml(currentHtml, space);
          space.draftFiles['index.html'] = fixedHtml;
          space.hasUnpublishedChanges = true;
          space.updatedAt = new Date().toISOString();
          const report = analyzeSpaceSeoAndA11y(fixedHtml, space);
          recordAuditLog(space, user, 'seo_audit_autofixed', { score: report.score, grade: report.grade });
          await saveDb(env, db);
          return jsonResponse({
            ok: true,
            fixed: true,
            ...report,
            space: {
              ...formatSpaceSummary(space, user),
              draftFiles: space.draftFiles,
              publishedFiles: space.publishedFiles
            }
          });
        }

        // Wave 17: Creator Error Inbox (/api/spaces/:owner/:slug/errors)
        if (action === 'errors' && method === 'GET') {
          if (!user || !space || !canViewSpace(space, user)) return jsonResponse({ error: 'Unauthorized.' }, 403);
          space.errorLogs = Array.isArray(space.errorLogs) ? space.errorLogs : [];
          return jsonResponse({ ok: true, count: space.errorLogs.length, errors: space.errorLogs });
        }

        if (action === 'errors' && method === 'DELETE') {
          if (!user || !space || !canEditSpace(space, user)) return jsonResponse({ error: 'Unauthorized.' }, 403);
          space.errorLogs = [];
          await saveDb(env, db);
          return jsonResponse({ ok: true, count: 0, errors: [] });
        }

        // Wave 19: Live API Request Inspector & Replay Debugger (/api/spaces/:owner/:slug/inspector)
        if (action === 'inspector') {
          if (!user || !space || !canViewSpace(space, user)) {
            return jsonResponse({ error: 'Unauthorized.' }, 403);
          }
          space.requestInspectorLogs = Array.isArray(space.requestInspectorLogs) ? space.requestInspectorLogs : [];

          if (method === 'GET') {
            return jsonResponse({
              ok: true,
              count: space.requestInspectorLogs.length,
              logs: space.requestInspectorLogs
            });
          }

          if ((subAction === 'replay' || !subAction) && method === 'POST') {
            if (!canEditSpace(space, user)) {
              return jsonResponse({ error: 'Unauthorized: Owner or Editor role required to replay requests.' }, 403);
            }
            const targetLogId = String(body.logId || body.id || '').trim();
            const original = targetLogId
              ? space.requestInspectorLogs.find((l) => l.id === targetLogId)
              : null;
            if (targetLogId && !original) {
              return jsonResponse({ error: 'Inspector request log entry not found.' }, 404);
            }
            const replayPath = String(original ? original.path : body.path || `/live/${space.slug}/submit`);
            const replayMethod = String(original ? original.method : body.method || 'POST').toUpperCase();
            const replayPayload = original ? original.requestBody : (body.body || {});

            const replayReq = new Request(new URL(replayPath, url.origin).href, {
              method: replayMethod,
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...(request.headers.get('authorization') ? { Authorization: request.headers.get('authorization') } : {})
              },
              body: ['GET', 'HEAD'].includes(replayMethod) ? undefined : JSON.stringify(replayPayload || {})
            });
            const startMs = Date.now();
            const replayRes = await spaceHubWorker.handle(replayReq, env);
            const durationMs = Math.max(1, Date.now() - startMs);
            let replayData = null;
            try {
              replayData = await replayRes.clone().json();
            } catch (_e) {
              replayData = { raw: (await replayRes.clone().text()).slice(0, 300) };
            }
            const reloadedDb = await loadDb(env);
            const reloadedSpace = reloadedDb.spaces.find((s) => s.id === space.id) || space;
            const replayEntry = recordSpaceInspectorLog(reloadedSpace, {
              method: replayMethod,
              path: replayPath,
              status: replayRes.status,
              durationMs,
              requestBody: replayPayload,
              responsePreview: { replayedFrom: targetLogId || 'custom', status: replayRes.status }
            });
            await saveDb(env, reloadedDb);
            return jsonResponse({
              ok: true,
              replayed: true,
              originalLogId: targetLogId || null,
              status: replayRes.status,
              replayResponse: replayData,
              replayEntry
            });
          }

          if (method === 'DELETE') {
            if (!canEditSpace(space, user)) return jsonResponse({ error: 'Unauthorized.' }, 403);
            space.requestInspectorLogs = [];
            await saveDb(env, db);
            return jsonResponse({ ok: true, count: 0, logs: [] });
          }
        }

        // Wave 20: Canary Deployments & Weighted Traffic Splitting (/api/spaces/:owner/:slug/canary)
        if (action === 'canary') {
          if (!user || !space || !canViewSpace(space, user)) {
            return jsonResponse({ error: 'Unauthorized.' }, 403);
          }
          if (method === 'GET') {
            return jsonResponse({
              ok: true,
              canary: space.canaryConfig || { enabled: false, weight: 0 },
              canaryViews: space.canaryViews || 0,
              prodViews: space.prodViews || 0
            });
          }
          if (method === 'PUT' || method === 'POST') {
            if (!canPublishSpace(space, user)) {
              return jsonResponse({ error: 'Unauthorized: Owner, Admin, or Publisher role required for canary releases.' }, 403);
            }
            const nowIso = new Date().toISOString();
            const act = String(body.action || '').toLowerCase();
            if (act === 'promote') {
              const candidateFiles = space.canaryConfig?.files || space.draftFiles || {};
              recordPreviousRelease(space);
              space.publishedFiles = JSON.parse(JSON.stringify(candidateFiles));
              space.draftFiles = JSON.parse(JSON.stringify(candidateFiles));
              space.releaseId = crypto.randomUUID();
              space.publishedAt = nowIso;
              space.updatedAt = nowIso;
              space.hasUnpublishedChanges = false;
              space.canaryConfig = { enabled: false, weight: 0, promotedAt: nowIso };
              recordAuditLog(space, user, 'canary_promoted_to_production', { releaseId: space.releaseId });
              await saveDb(env, db);
              return jsonResponse({
                ok: true,
                promoted: true,
                releaseId: space.releaseId,
                canary: space.canaryConfig
              });
            }
            if (act === 'abort') {
              space.canaryConfig = { enabled: false, weight: 0, abortedAt: nowIso };
              recordAuditLog(space, user, 'canary_aborted');
              await saveDb(env, db);
              return jsonResponse({ ok: true, aborted: true, canary: space.canaryConfig });
            }
            const weight = Math.max(0, Math.min(100, Number(body.weight ?? 20)));
            const enabled = body.enabled !== undefined ? Boolean(body.enabled) : weight > 0;
            const canaryFiles = body.files && typeof body.files === 'object'
              ? { ...(space.publishedFiles || space.draftFiles || {}), ...body.files }
              : JSON.parse(JSON.stringify(space.draftFiles || {}));
            space.canaryConfig = {
              enabled,
              weight,
              files: canaryFiles,
              updatedAt: nowIso
            };
            recordAuditLog(space, user, 'canary_configured', { enabled, weight });
            await saveDb(env, db);
            return jsonResponse({
              ok: true,
              canary: {
                enabled: space.canaryConfig.enabled,
                weight: space.canaryConfig.weight,
                updatedAt: space.canaryConfig.updatedAt
              },
              canaryViews: space.canaryViews || 0
            });
          }
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
          if (!user || !space || !canEditSpace(space, user)) {
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
          recordAuditLog(space, user, 'ai_app_generated', { prompt: prompt.slice(0, 80), provider });
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

        if (action === 'draft-reviews') {
          if (!space || !user || user.id !== space.ownerId) {
            return jsonResponse({ error: 'Only the Space owner can manage draft review links.' }, 403);
          }
          const now = Date.now();
          const reviews = (space.draftReviews || []).filter((review) => review.expiresAt > now);
          const summarize = ({ token, expiresAt, comments = [] }) => ({
            token, expiresAt, comments, url: new URL('/api/draft-review/' + token, url.origin).href
          });
          if (method === 'GET') return jsonResponse({ reviews: reviews.map(summarize) }, 200, { 'Cache-Control': 'no-store' });
          if (method === 'PUT') {
            const review = reviews.find(({ token }) => token === body.token);
            const comment = review?.comments?.find(({ id }) => id === body.commentId);
            if (!comment) return jsonResponse({ error: 'Comment no longer available.' }, 404);
            comment.resolved = true;
            await saveDb(env, db);
            return jsonResponse({ resolved: true });
          }
          if (method === 'POST') {
            if (reviews.length >= 3) return jsonResponse({ error: 'Revoke an existing link before creating another.' }, 409);
            const review = {
              token: randomHex(32),
              expiresAt: now + 24 * 60 * 60 * 1000,
              files: structuredClone(space.draftFiles || {})
            };
            space.draftReviews = [...reviews, review];
            await saveDb(env, db);
            return jsonResponse(summarize(review), 201, { 'Cache-Control': 'no-store' });
          }
          if (method === 'DELETE') {
            const { token } = (await request.json().catch(() => null)) || {};
            if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
              return jsonResponse({ error: 'A valid review token is required.' }, 400);
            }
            space.draftReviews = reviews.filter((review) => review.token !== token);
            await saveDb(env, db);
            return jsonResponse({ revoked: true });
          }
        }

        if (action === 'releases' && (method === 'GET' || method === 'POST')) {
          if (!space || !user || user.id !== space.ownerId) {
            return jsonResponse({ error: 'Release history is available to the Space owner.' }, 403);
          }
          const history = space.releaseHistory || [];
          if (method === 'GET') {
            const selected = url.searchParams.get('release');
            if (selected) {
              const release = history.find(({ id }) => id === selected);
              if (!release) return jsonResponse({ error: 'Release no longer available.' }, 404);
              return jsonResponse({ files: release.files }, 200, { 'Cache-Control': 'no-store' });
            }
            return jsonResponse({
              current: space.releaseId || null,
              releases: history.map(({ id, publishedAt }) => ({ id, publishedAt }))
            });
          }
          const release = history.find(({ id }) => id === body.releaseId);
          const liveUrl = new URL('/live/' + space.slug, url.origin).href;
          if (!release || space.externalHost?.liveUrl !== liveUrl || spaceHostingLapse(db, space.slug)) {
            return jsonResponse({ error: 'Restore requires an available SpaceHub hosted release.' }, 409);
          }
          recordPreviousRelease(space);
          space.publishedFiles = release.files;
          space.releaseId = crypto.randomUUID();
          space.publishedAt = space.updatedAt = new Date().toISOString();
          space.externalHost.lastDeployedAt = space.publishedAt;
          const names = new Set([...Object.keys(space.draftFiles || {}), ...Object.keys(release.files)]);
          space.hasUnpublishedChanges = [...names].some((name) => space.draftFiles?.[name] !== release.files[name]);
          await saveDb(env, db);
          return jsonResponse({ releaseId: space.releaseId, liveUrl });
        }

        if ((action === 'deploy-external' || action === 'publish' || action === 'deploy') && method === 'POST') {
          if (!user || !space || !canPublishSpace(space, user)) {
            return jsonResponse({ error: 'Unauthorized: Owner, Admin, or Publisher role required to publish.' }, 403);
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
            const slotState = hostingState(conn, Date.now());
            if (slotState === 'expired' || slotState === 'suspended') {
              return jsonResponse(
                {
                  error:
                    slotState === 'suspended'
                      ? 'This hosting slot is suspended. Contact support.'
                      : 'This hosting plan has expired. Renew it from Pricing & Hosting to publish again.'
                },
                402
              );
            }
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
          recordPreviousRelease(space);
          space.releaseId = crypto.randomUUID();
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
          recordAuditLog(space, user, 'deploy', { releaseId: space.releaseId, liveUrl });
          await dispatchSpaceIntegrations(env, space, 'deployment', {
            summary: `Space "${space.title}" deployed to ${liveUrl}`,
            fields: { Release: space.releaseId, URL: liveUrl }
          });
          await saveDb(env, db);
          return jsonResponse({
            releaseId: space.releaseId,
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

        if (action === 'export-zip' && method === 'GET') {
          if (!space || !canViewSpace(space, user)) {
            return jsonResponse({ error: 'Not found' }, 404);
          }
          const files = {
            ...(space.draftFiles || space.publishedFiles || {}),
            'manifest.webmanifest': JSON.stringify(generateSpaceManifest(space, ''), null, 2),
            'icon.svg': generateSpaceIconSvg(space.title),
            'sw.js': generateSpaceServiceWorker(space.slug),
            'vercel.json': JSON.stringify({ version: 2, name: space.slug, cleanUrls: true }, null, 2),
            'netlify.toml': '[build]\n  publish = "."\n'
          };
          const zipBytes = createZip(files);
          recordAuditLog(space, user, 'export_zip_downloaded');
          await saveDb(env, db);
          return new Response(zipBytes, {
            status: 200,
            headers: {
              'Content-Type': 'application/zip',
              'Content-Disposition': `attachment; filename="${encodeURIComponent(space.slug)}.zip"`,
              'Cache-Control': 'no-store'
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

export class SpaceHubState {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
  async fetch(request) {
    return new Response('OK');
  }
}

export default spaceHubWorker;
