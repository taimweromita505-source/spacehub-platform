// Cloudflare Worker + Static Assets Entrypoint for SpaceHub Platform
// Serves /api/* and /spaces/:username/:slug/live on Cloudflare Edge, and delegates static assets to env.ASSETS

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

${meta.description || 'Build and check how your website looks inside the SpaceHub staging workspace, then deploy to your connected hosting service.'}
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
    <p>Test your layout in the staging workspace, connect your own coding agent, keep drafts private, and push directly to Cloudflare, Vercel, Netlify, or GitHub Pages.</p>
    <div class="actions">
      <button id="launchDemoBtn" class="btn-primary">Run Interactive Demo</button>
      <span id="counterText" class="counter">12 launches today</span>
    </div>
  </main>
  <script src="script.js"></script>
</body>
</html>`,
      'style.css': `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: radial-gradient(circle at top, #1e1b4b, #090d16); color: #f8fafc; min-height: 100vh; padding: 2rem; }
.nav { display: flex; justify-content: space-between; align-items: center; max-width: 960px; margin: 0 auto 4rem; }
.logo { font-weight: 800; font-size: 1.25rem; }
.hero { max-width: 820px; margin: 0 auto; text-align: center; }
.badge { display: inline-block; padding: 0.35rem 0.85rem; border-radius: 999px; background: rgba(99, 102, 241, 0.2); border: 1px solid rgba(99, 102, 241, 0.45); color: #a5b4fc; font-size: 0.75rem; font-weight: 700; margin-bottom: 1.25rem; }
h1 { font-size: clamp(2.2rem, 5vw, 3.5rem); line-height: 1.1; margin-bottom: 1rem; }
p { color: #94a3b8; font-size: 1.1rem; line-height: 1.6; margin-bottom: 2rem; }
.actions { display: flex; gap: 1rem; justify-content: center; align-items: center; flex-wrap: wrap; }
.btn-primary { background: linear-gradient(135deg, #6366f1, #06b6d4); color: white; border: none; padding: 0.85rem 1.6rem; border-radius: 0.65rem; font-weight: 600; cursor: pointer; }
.btn-outline { background: transparent; color: #e2e8f0; border: 1px solid #334155; padding: 0.55rem 1rem; border-radius: 0.5rem; cursor: pointer; }
.counter { font-size: 0.9rem; color: #38bdf8; font-weight: 600; }`,
      'script.js': `let count = 12;
const btn = document.getElementById('launchDemoBtn');
const counterText = document.getElementById('counterText');
if (btn && counterText) {
  btn.addEventListener('click', () => {
    count++;
    counterText.textContent = count + ' launches today 🚀';
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
      'index.html': `<!DOCTYPE html><html><head><meta charset="UTF-8"><link rel="stylesheet" href="style.css"></head><body><h1>📊 PulseMetrics Live</h1><p>Interactive telemetry simulator</p><button id="simulateBtn">Simulate Traffic Spike</button><div id="bars" class="bars"></div><script src="script.js"></script></body></html>`,
      'style.css': `body { font-family: system-ui, sans-serif; background: #061311; color: #ecfdf5; padding: 2rem; } button { background: #10b981; color: #022c22; font-weight: 700; border: none; padding: 0.7rem 1.2rem; border-radius: 0.5rem; cursor: pointer; margin: 1rem 0; } .bars { display: flex; align-items: flex-end; gap: 0.5rem; height: 180px; } .bar { flex: 1; background: #34d399; border-radius: 4px 4px 0 0; }`,
      'script.js': `const barsEl = document.getElementById('bars'); function renderBars() { barsEl.innerHTML = ''; for (let i = 0; i < 12; i++) { const b = document.createElement('div'); b.className = 'bar'; b.style.height = (20 + Math.floor(Math.random() * 80)) + '%'; barsEl.appendChild(b); } } document.getElementById('simulateBtn').addEventListener('click', renderBars); renderBars();`
    }
  },
  canvas: {
    name: 'Interactive Synth & Particle Toy',
    emoji: '🎨',
    colorFrom: 'pink',
    colorTo: 'orange',
    files: {
      'index.html': `<!DOCTYPE html><html><head><meta charset="UTF-8"><link rel="stylesheet" href="style.css"></head><body><h1>🎨 Cosmic Particle Studio</h1><script src="script.js"></script></body></html>`,
      'style.css': `body { background: #090514; color: #fff; font-family: system-ui, sans-serif; padding: 2rem; }`,
      'script.js': `console.log('Canvas studio ready');`
    }
  }
};

const HOSTING_PLANS = [
  {
    id: 'plan_starter_edge',
    name: 'Starter Static Edge Hosting',
    priceMonthly: 5,
    priceLabel: '$5 / month',
    provider: 'cloudflare_pages',
    providerLabel: 'Managed Edge CDN (Cloudflare Partner)',
    features: [
      'Instant global CDN + automatic SSL',
      'Connect up to 5 launched Spaces',
      'Custom subdomain (.spacehub-edge.app)',
      '100 GB monthly bandwidth'
    ]
  },
  {
    id: 'plan_pro_cloud',
    name: 'Pro Web & Agent Cloud Hosting',
    priceMonthly: 15,
    priceLabel: '$15 / month',
    provider: 'netlify',
    providerLabel: 'Managed Pro Cloud (Netlify Partner)',
    features: [
      'Unlimited launched Spaces & custom domains',
      'Continuous Coding Agent auto-deploys',
      '1 TB monthly bandwidth + DDOS protection',
      'Private password-protected live deployments'
    ]
  },
  {
    id: 'plan_dedicated_custom',
    name: 'Dedicated Business Cloud',
    priceMonthly: 39,
    priceLabel: '$39 / month',
    provider: 'vercel',
    providerLabel: 'Dedicated Global Edge (Vercel Partner)',
    features: [
      'Dedicated edge workers & custom apex domains',
      '99.99% uptime SLA + analytics',
      'Team workspace & staging environments',
      'Unlimited bandwidth'
    ]
  }
];

const PROVIDER_LABELS = {
  vercel: 'Vercel',
  netlify: 'Netlify',
  github_pages: 'GitHub Pages',
  cloudflare_pages: 'Cloudflare Pages',
  custom_webhook: 'Custom Deploy Webhook'
};

// In-memory Edge store initialized with demo data
const nowInit = new Date().toISOString();
const edgeDb = {
  users: [
    {
      id: 'usr_demo1',
      username: 'alex',
      displayName: 'Alex Rivera',
      passwordPlain: 'demo1234',
      createdAt: nowInit
    }
  ],
  sessions: {},
  agentKeys: [
    {
      id: 'key_demo1',
      userId: 'usr_demo1',
      name: 'Default CLI Coding Agent Key',
      token: 'sh_pat_demo_alex_agent_key_2026',
      createdAt: nowInit
    }
  ],
  hostingConnections: [
    {
      id: 'host_cf_wrangler',
      userId: 'usr_demo1',
      provider: 'cloudflare_pages',
      providerLabel: 'Cloudflare Pages (Connected Account)',
      name: 'Cloudflare Pages — taimweromita505@gmail.com',
      targetUrlOrProject: 'spacehub-platform.taimweromita505.workers.dev',
      hasToken: true,
      createdAt: nowInit
    },
    {
      id: 'host_gh_pages',
      userId: 'usr_demo1',
      provider: 'github_pages',
      providerLabel: 'GitHub Pages (Repository Push)',
      name: 'GitHub Pages — Connect Token',
      targetUrlOrProject: 'spacehub-web-app',
      hasToken: false,
      createdAt: nowInit
    }
  ],
  spaces: [
    {
      id: 'spc_novacloud',
      ownerId: 'usr_demo1',
      ownerUsername: 'alex',
      slug: 'novacloud-landing',
      title: 'NovaCloud Landing Page',
      description: 'Responsive SaaS product launch page staged on SpaceHub and deployed on Cloudflare.',
      emoji: '✨',
      colorFrom: 'indigo',
      colorTo: 'cyan',
      sdk: 'static',
      visibility: 'public',
      status: 'published',
      likes: 18,
      likedBy: [],
      createdAt: nowInit,
      updatedAt: nowInit,
      publishedAt: nowInit,
      hasUnpublishedChanges: false,
      agentHistory: [],
      externalHost: {
        provider: 'cloudflare_pages',
        providerLabel: 'Cloudflare Pages',
        projectName: 'novacloud-landing',
        liveUrl: 'https://spacehub-platform.taimweromita505.workers.dev/spaces/alex/novacloud-landing/live',
        lastDeployedAt: nowInit
      },
      draftFiles: {
        ...STARTER_TEMPLATES.landing.files,
        'README.md': generateReadme({
          title: 'NovaCloud Landing Page',
          emoji: '✨',
          colorFrom: 'indigo',
          colorTo: 'cyan',
          visibility: 'public',
          externalHostProvider: 'cloudflare_pages',
          description: 'Responsive SaaS product launch page staged on SpaceHub and deployed on Cloudflare.'
        })
      },
      publishedFiles: {
        ...STARTER_TEMPLATES.landing.files,
        'README.md': generateReadme({
          title: 'NovaCloud Landing Page',
          emoji: '✨',
          colorFrom: 'indigo',
          colorTo: 'cyan',
          visibility: 'public',
          externalHostProvider: 'cloudflare_pages',
          description: 'Responsive SaaS product launch page staged on SpaceHub and deployed on Cloudflare.'
        })
      }
    },
    {
      id: 'spc_pulsemetrics',
      ownerId: 'usr_demo1',
      ownerUsername: 'alex',
      slug: 'pulse-metrics-dashboard',
      title: 'PulseMetrics Live Dashboard',
      description: 'Real-time telemetry & conversion simulator staged on SpaceHub and connected to Netlify.',
      emoji: '📊',
      colorFrom: 'emerald',
      colorTo: 'teal',
      sdk: 'static',
      visibility: 'public',
      status: 'published',
      likes: 11,
      likedBy: [],
      createdAt: nowInit,
      updatedAt: nowInit,
      publishedAt: nowInit,
      hasUnpublishedChanges: false,
      agentHistory: [],
      externalHost: {
        provider: 'netlify',
        providerLabel: 'Netlify',
        projectName: 'pulse-metrics-dashboard',
        liveUrl: 'https://pulse-metrics-demo.netlify.app',
        lastDeployedAt: nowInit
      },
      draftFiles: {
        ...STARTER_TEMPLATES.dashboard.files,
        'README.md': generateReadme({
          title: 'PulseMetrics Live Dashboard',
          emoji: '📊',
          colorFrom: 'emerald',
          colorTo: 'teal',
          visibility: 'public',
          externalHostProvider: 'netlify',
          description: 'Real-time telemetry & conversion simulator staged on SpaceHub and connected to Netlify.'
        })
      },
      publishedFiles: {
        ...STARTER_TEMPLATES.dashboard.files,
        'README.md': generateReadme({
          title: 'PulseMetrics Live Dashboard',
          emoji: '📊',
          colorFrom: 'emerald',
          colorTo: 'teal',
          visibility: 'public',
          externalHostProvider: 'netlify',
          description: 'Real-time telemetry & conversion simulator staged on SpaceHub and connected to Netlify.'
        })
      }
    }
  ]
};

function randomId(prefix = 'id_') {
  return prefix + Math.random().toString(36).slice(2, 12);
}

function slugify(text) {
  return (
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'my-space'
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

function getCurrentUser(request, url) {
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
    const pat = edgeDb.agentKeys.find((k) => k.token === token);
    if (!pat) return null;
    return edgeDb.users.find((u) => u.id === pat.userId) || null;
  }
  const userId = edgeDb.sessions[token];
  if (!userId) return null;
  return edgeDb.users.find((u) => u.id === userId) || null;
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

function buildBundledHtml(files) {
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
  return html;
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
    const user = getCurrentUser(request, url);

    // 1. Live Space Preview Route (/spaces/:username/:slug/live)
    const liveMatch = pathname.match(/^\/spaces\/([^/]+)\/([^/]+)\/live$/i);
    if (liveMatch && method === 'GET') {
      const username = decodeURIComponent(liveMatch[1]).toLowerCase();
      const slug = decodeURIComponent(liveMatch[2]).toLowerCase();
      const mode = url.searchParams.get('mode') === 'draft' ? 'draft' : 'published';
      const space = edgeDb.spaces.find(
        (s) => s.ownerUsername === username && s.slug === slug
      );
      const isOwner = Boolean(user && space && space.ownerId === user.id);
      if (!space || (space.visibility === 'private' && !isOwner) || (space.status === 'draft' && !isOwner)) {
        return new Response(
          `<!DOCTYPE html><html><body style="background:#0b0f19;color:#fff;font-family:sans-serif;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><h1>🔒 404 — Private or Unlaunched Space</h1><p>This Space is private or still in staging.</p><a href="/" style="color:#818cf8">← Back to SpaceHub</a></div></body></html>`,
          { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
      const targetFiles = mode === 'draft' && isOwner ? space.draftFiles : space.publishedFiles || space.draftFiles;
      return new Response(buildBundledHtml(targetFiles), {
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
          user: user ? { id: user.id, username: user.username, displayName: user.displayName } : null
        });
      }

      if (pathname === '/api/auth/login' && method === 'POST') {
        const cleanUser = String(body.username || '').trim().toLowerCase();
        const found = edgeDb.users.find((u) => u.username === cleanUser && u.passwordPlain === body.password);
        if (!found) return jsonResponse({ error: 'Invalid username or password.' }, 401);
        const token = randomId('tok_') + randomId('');
        edgeDb.sessions[token] = found.id;
        return jsonResponse(
          { token, user: { id: found.id, username: found.username, displayName: found.displayName } },
          200,
          { 'Set-Cookie': `spacehub_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800` }
        );
      }

      if (pathname === '/api/auth/register' && method === 'POST') {
        const cleanUser = String(body.username || '').trim().toLowerCase();
        if (!/^[a-z0-9_-]{3,24}$/.test(cleanUser)) {
          return jsonResponse({ error: 'Username must be 3-24 characters.' }, 400);
        }
        if (edgeDb.users.some((u) => u.username === cleanUser)) {
          return jsonResponse({ error: 'Username is already taken.' }, 409);
        }
        const newUser = {
          id: randomId('usr_'),
          username: cleanUser,
          displayName: String(body.displayName || cleanUser).trim(),
          passwordPlain: String(body.password || 'password'),
          createdAt: new Date().toISOString()
        };
        edgeDb.users.push(newUser);
        const token = randomId('tok_') + randomId('');
        edgeDb.sessions[token] = newUser.id;
        return jsonResponse(
          { token, user: { id: newUser.id, username: newUser.username, displayName: newUser.displayName } },
          201,
          { 'Set-Cookie': `spacehub_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800` }
        );
      }

      if (pathname === '/api/auth/logout' && method === 'POST') {
        return jsonResponse(
          { ok: true },
          200,
          { 'Set-Cookie': 'spacehub_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' }
        );
      }

      if (pathname === '/api/hosting-plans' && method === 'GET') {
        return jsonResponse({ plans: HOSTING_PLANS });
      }

      if (pathname === '/api/hosting-plans/purchase' && method === 'POST') {
        if (!user) return jsonResponse({ error: 'Please sign in to buy a hosting plan.' }, 401);
        const plan = HOSTING_PLANS.find((p) => p.id === body.planId) || HOSTING_PLANS[0];
        const cleanDomain =
          String(body.customDomain || '').trim().toLowerCase().replace(/^https?:\/\//, '') ||
          `${user.username}-cloud.spacehub-edge.app`;
        const conn = {
          id: randomId('host_'),
          userId: user.id,
          provider: plan.provider,
          providerLabel: `${plan.name} (${plan.priceLabel})`,
          name: `${plan.name} — ${cleanDomain}`,
          targetUrlOrProject: cleanDomain,
          hasToken: true,
          createdAt: new Date().toISOString()
        };
        edgeDb.hostingConnections.unshift(conn);
        return jsonResponse({
          message: `Purchased ${plan.name} (${plan.priceLabel}) and connected ${cleanDomain}!`,
          connection: conn
        }, 201);
      }

      if (pathname === '/api/hosting-connections' && method === 'GET') {
        if (!user) return jsonResponse({ error: 'Authentication required.' }, 401);
        return jsonResponse({
          connections: edgeDb.hostingConnections.filter((c) => c.userId === user.id)
        });
      }

      if (pathname === '/api/hosting-connections' && method === 'POST') {
        if (!user) return jsonResponse({ error: 'Authentication required.' }, 401);
        const provider = PROVIDER_LABELS[body.provider] ? body.provider : 'cloudflare_pages';
        const conn = {
          id: randomId('host_'),
          userId: user.id,
          provider,
          providerLabel: PROVIDER_LABELS[provider],
          name: String(body.name || `${PROVIDER_LABELS[provider]} Account`).trim(),
          targetUrlOrProject: String(body.targetUrlOrProject || '').trim(),
          hasToken: Boolean(body.apiToken),
          createdAt: new Date().toISOString()
        };
        edgeDb.hostingConnections.push(conn);
        return jsonResponse({ connection: conn }, 201);
      }

      if (pathname === '/api/agent-keys' && method === 'GET') {
        if (!user) return jsonResponse({ error: 'Authentication required.' }, 401);
        return jsonResponse({ keys: edgeDb.agentKeys.filter((k) => k.userId === user.id) });
      }

      if (pathname === '/api/agent-keys' && method === 'POST') {
        if (!user) return jsonResponse({ error: 'Authentication required.' }, 401);
        const key = {
          id: randomId('key_'),
          userId: user.id,
          name: String(body.name || 'External Coding Agent').trim(),
          token: 'sh_pat_' + randomId('') + randomId(''),
          createdAt: new Date().toISOString()
        };
        edgeDb.agentKeys.push(key);
        return jsonResponse({ key }, 201);
      }

      if (pathname === '/api/spaces' && method === 'GET') {
        const filter = url.searchParams.get('filter') || 'public';
        const q = (url.searchParams.get('search') || '').trim().toLowerCase();
        let results = edgeDb.spaces.filter((space) => {
          if (filter === 'mine') return Boolean(user && space.ownerId === user.id);
          if (filter === 'private') return Boolean(user && space.ownerId === user.id && space.visibility === 'private');
          return space.visibility === 'public' && space.status === 'published';
        });
        if (q) {
          results = results.filter(
            (s) => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
          );
        }
        return jsonResponse({ spaces: results.map((s) => formatSpaceSummary(s, user)) });
      }

      if ((pathname === '/api/spaces' || pathname === '/api/agent/v1/spaces') && method === 'POST') {
        if (!user) return jsonResponse({ error: 'Please sign in to create a Space.' }, 401);
        const slug = slugify(body.slug || body.title);
        const tpl = STARTER_TEMPLATES[body.templateId] || STARTER_TEMPLATES.landing;
        const now = new Date().toISOString();
        const files = body.files || tpl.files;
        const newSpace = {
          id: randomId('spc_'),
          ownerId: user.id,
          ownerUsername: user.username,
          slug,
          title: String(body.title || 'New Space').trim(),
          description: String(body.description || 'Staged on SpaceHub').trim(),
          emoji: body.emoji || '🚀',
          colorFrom: body.colorFrom || 'indigo',
          colorTo: body.colorTo || 'cyan',
          sdk: 'static',
          visibility: body.visibility === 'public' ? 'public' : 'private',
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
              title: String(body.title || 'New Space').trim(),
              emoji: body.emoji || '🚀',
              visibility: body.visibility === 'public' ? 'public' : 'private',
              description: String(body.description || '').trim()
            })
          },
          publishedFiles: null
        };
        edgeDb.spaces.unshift(newSpace);
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
        const space = edgeDb.spaces.find((s) => s.ownerUsername === username && s.slug === slug);

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
          if (body.title) space.title = body.title;
          if (body.description !== undefined) space.description = body.description;
          if (body.visibility === 'public' || body.visibility === 'private') {
            space.visibility = body.visibility;
          }
          const incomingFiles = body.draftFiles || body.files;
          if (incomingFiles && typeof incomingFiles === 'object') {
            space.draftFiles = { ...space.draftFiles, ...incomingFiles };
            space.hasUnpublishedChanges = true;
          }
          space.updatedAt = new Date().toISOString();
          return jsonResponse({
            space: {
              ...formatSpaceSummary(space, user),
              draftFiles: space.draftFiles,
              publishedFiles: space.publishedFiles,
              agentHistory: space.agentHistory || []
            }
          });
        }

        if (action === 'agent-build' && method === 'POST') {
          if (!user || !space || space.ownerId !== user.id) {
            return jsonResponse({ error: 'Unauthorized.' }, 403);
          }
          const prompt = String(body.prompt || 'Interactive App').trim();
          space.draftFiles = {
            ...space.draftFiles,
            'index.html': `<!DOCTYPE html><html><head><meta charset="UTF-8"><link rel="stylesheet" href="style.css"></head><body><div class="box"><span class="pill">🤖 BUILT BY CODING AGENT</span><h1>${space.title}</h1><p>${prompt.replace(/</g, '&lt;')}</p><button id="btn">Test Staging Interaction</button><p id="out"></p></div><script src="script.js"></script></body></html>`,
            'style.css': `body { font-family: system-ui, sans-serif; background: #090d16; color: #f8fafc; padding: 2.5rem; } .box { max-width: 720px; margin: 0 auto; background: #111827; border: 1px solid #263248; padding: 2rem; border-radius: 1rem; } .pill { font-size: 0.72rem; color: #38bdf8; font-weight: 800; } button { background: #6366f1; color: #fff; border: none; padding: 0.7rem 1.2rem; border-radius: 0.5rem; cursor: pointer; margin-top: 1rem; }`,
            'script.js': `document.getElementById('btn').addEventListener('click', () => { document.getElementById('out').textContent = '✓ Verified in Staging at ' + new Date().toLocaleTimeString(); });`
          };
          space.hasUnpublishedChanges = true;
          const summary = `Synthesized staging build for: "${prompt.slice(0, 60)}"`;
          space.agentHistory.unshift({
            id: randomId('agt_'),
            prompt,
            provider: body.provider || 'builtin_agent',
            summary,
            createdAt: new Date().toISOString()
          });
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
          const provider = PROVIDER_LABELS[body.provider] ? body.provider : 'cloudflare_pages';
          const providerLabel = PROVIDER_LABELS[provider];
          const liveUrl =
            body.customLiveUrl ||
            `${url.origin}/spaces/${space.ownerUsername}/${space.slug}/live`;
          const now = new Date().toISOString();
          space.externalHost = {
            provider,
            providerLabel,
            projectName: space.slug,
            liveUrl,
            lastDeployedAt: now
          };
          space.publishedFiles = JSON.parse(JSON.stringify(space.draftFiles));
          space.status = 'published';
          space.publishedAt = now;
          space.updatedAt = now;
          space.hasUnpublishedChanges = false;
          return jsonResponse({
            message: `Deployed to ${providerLabel} (${liveUrl})`,
            externalHost: space.externalHost,
            space: {
              ...formatSpaceSummary(space, user),
              draftFiles: space.draftFiles,
              publishedFiles: space.publishedFiles,
              agentHistory: space.agentHistory
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
          space.likes = (space.likes || 0) + 1;
          return jsonResponse({ likes: space.likes, likedByMe: true });
        }
      }
    }

    // 3. Static Asset Fallback
    return env.ASSETS.fetch(request);
  }
};
