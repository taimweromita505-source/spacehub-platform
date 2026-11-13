// --- 1. MODERN WEB GUIDANCE: DIALOG LIGHT-DISMISS FALLBACK & ARIA VALIDATION SYNC ---

(function setupDialogFallbacks() {
  const dialogs = document.querySelectorAll('dialog[closedby="any"]');
  dialogs.forEach((dialog) => {
    dialog.addEventListener('close', () => {
      dialog.returnValue = '';
    });
  });

  if (!('closedBy' in HTMLDialogElement.prototype)) {
    dialogs.forEach((dialog) => {
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (isDialogContent) return;
        dialog.close();
      });
    });
  }

  document.querySelectorAll('[data-close-dialog]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-close-dialog');
      const dlg = document.getElementById(targetId);
      if (dlg) dlg.close();
    });
  });
})();

(function setupAccessibleValidation() {
  const linkError = (el, shown) => {
    const errorId = el.dataset.error;
    if (!errorId) return;
    const ids = (el.getAttribute('aria-describedby') || '')
      .split(/\s+/)
      .filter((id) => id && id !== errorId);
    if (shown) ids.push(errorId);
    if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
    else el.removeAttribute('aria-describedby');
  };

  const announcer = document.createElement('div');
  announcer.setAttribute('aria-live', 'polite');
  announcer.classList.add('visually-hidden');
  document.body.append(announcer);
  let announceTimer;
  let announcedField;

  const spokenText = (node) => {
    const copy = node.cloneNode(true);
    copy.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
    copy.querySelectorAll('[role="img"][aria-label]').forEach((n) => {
      n.replaceWith(`${n.getAttribute('aria-label')}: `);
    });
    return copy.textContent.replace(/\s+/g, ' ').trim();
  };

  const announceError = (el) => {
    const error = document.getElementById(el.dataset.error);
    if (!error) return;
    const label = el.labels?.[0] ? `${spokenText(el.labels[0])}: ` : '';
    clearTimeout(announceTimer);
    announcer.textContent = '';
    announcedField = el;
    announceTimer = setTimeout(() => {
      announcer.textContent = label + spokenText(error);
    }, 500);
  };

  const flagged = new WeakSet();
  const announced = new WeakSet();
  const supportsUserInvalid = CSS.supports('selector(:user-invalid)');

  const syncAria = (el, announce = false) => {
    if (!el.matches?.('input, select, textarea')) return;
    const invalid = supportsUserInvalid
      ? el.matches(':user-invalid')
      : el.classList.contains('user-invalid-fallback');

    if (invalid) {
      if (announce && !announced.has(el)) {
        announceError(el);
        announced.add(el);
      }
      el.setAttribute('aria-invalid', 'true');
      linkError(el, true);
      flagged.add(el);
    } else if (flagged.has(el) || el.getAttribute('aria-invalid') !== 'true') {
      el.setAttribute('aria-invalid', 'false');
      linkError(el, false);
      flagged.delete(el);
      announced.delete(el);
      if (announcedField === el) {
        clearTimeout(announceTimer);
        announcer.textContent = '';
      }
    }
  };

  document.querySelectorAll('input, select, textarea').forEach((el) => syncAria(el));
  document.addEventListener('blur', (e) => syncAria(e.target, true), true);
  document.addEventListener('input', (e) => {
    if (e.target.hasAttribute('aria-invalid')) syncAria(e.target);
  });
  document.addEventListener('change', (e) => syncAria(e.target, true), true);
  document.addEventListener(
    'invalid',
    (e) => {
      announced.add(e.target);
      syncAria(e.target);
    },
    true
  );
})();

// Show / Hide Password toggle buttons
document.querySelectorAll('.toggle-pw-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.getAttribute('data-target'));
    if (!input) return;
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    btn.setAttribute('aria-pressed', String(!showing));
    btn.textContent = showing ? 'Show password' : 'Hide password';
  });
});

// --- 2. SPACEHUB APPLICATION STATE & LOGIC ---

const state = {
  user: null,
  token: localStorage.getItem('spacehub_token') || null,
  filter: 'public',
  searchQuery: '',
  spaces: [],
  hostingPlans: [],
  hostingConnections: [],
  currentSpace: null,
  activeFile: 'index.html',
  workingFiles: {},
  isDirty: false,
  agentConfig: JSON.parse(localStorage.getItem('spacehub_agent_cfg') || 'null') || {
    provider: 'builtin_agent',
    model: 'gemini-3.8-flash',
    apiKey: '',
    endpointUrl: ''
  }
};

function showToast(msg) {
  const toast = document.getElementById('statusToast');
  if (!toast) return;
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.hidden = true;
  }, 3600);
}

async function apiFetch(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

function getBannerGradientClass(colorFrom, colorTo) {
  const pair = `${colorFrom}-${colorTo}`;
  if (pair === 'emerald-teal') return 'grad-emerald-teal';
  if (pair === 'pink-orange') return 'grad-pink-orange';
  if (pair === 'indigo-purple') return 'grad-indigo-purple';
  return 'grad-indigo-cyan';
}

function bundleClientPreview(files, includeConsoleBridge = true) {
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

  if (includeConsoleBridge) {
    const bridgeScript = `<script>(function(){function s(l,a){try{var m=Array.prototype.slice.call(a).map(function(x){return typeof x==='object'?JSON.stringify(x):String(x)}).join(' ');window.parent.postMessage({type:'sh_console',level:l,message:m},'*');}catch(_e){}}['log','warn','error'].forEach(function(k){var o=console[k];console[k]=function(){s(k,arguments);if(o)o.apply(console,arguments);};});window.addEventListener('error',function(e){s('error',[e.message||'Runtime error']);});window.addEventListener('unhandledrejection',function(e){s('error',['Unhandled Promise Rejection: '+(e.reason&&e.reason.message||e.reason)]);});window.addEventListener('message',function(ev){if(!ev.data||ev.data.type!=='sh_toggle_visual_edit')return;var on=Boolean(ev.data.enabled);document.querySelectorAll('h1,h2,h3,h4,p,button,a,li,span').forEach(function(el){if(el.children.length>0&&el.tagName!=='P'&&el.tagName!=='H1'&&el.tagName!=='H2')return;el.contentEditable=on?'true':'false';el.style.outline=on?'1px dashed rgba(129,140,248,0.55)':'';if(on&&!el._shBound){el._shBound=true;el.addEventListener('focus',function(){el._oldTxt=el.textContent;});el.addEventListener('blur',function(){if(el._oldTxt&&el.textContent!==el._oldTxt){window.parent.postMessage({type:'sh_visual_edit',oldText:el._oldTxt,newText:el.textContent},'*');el._oldTxt=el.textContent;}});}});});})();</script>`;
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>\n  ${bridgeScript}`);
    } else {
      html = `${bridgeScript}\n` + html;
    }
  }
  return html;
}

function updateAgentProviderBadge() {
  const badge = document.getElementById('activeAgentProviderBadge');
  if (!badge) return;
  const labels = {
    builtin_agent: 'Built-in Agent',
    gemini: `Gemini (${state.agentConfig.model || 'gemini-3.8-flash'})`,
    openai_compatible: `OpenAI-Compatible (${state.agentConfig.model || 'custom'})`,
    custom_webhook: 'Custom Webhook'
  };
  badge.textContent = labels[state.agentConfig.provider] || 'Built-in Agent';
}

function updateAuthUI() {
  const guestActions = document.getElementById('guestActions');
  const userProfileBar = document.getElementById('userProfileBar');
  const currentUserBadge = document.getElementById('currentUserBadge');
  const tabMySpaces = document.getElementById('tabMySpaces');
  const tabPrivateSpaces = document.getElementById('tabPrivateSpaces');

  if (state.user) {
    guestActions.hidden = true;
    userProfileBar.hidden = false;
    const provLabels = { google: 'Google', github: 'GitHub', apple: 'Apple' };
    const provPrefix = state.user.socialProvider && provLabels[state.user.socialProvider]
      ? `${provLabels[state.user.socialProvider]} · `
      : '';
    currentUserBadge.textContent = `${provPrefix}@${state.user.username}`;
    tabMySpaces.hidden = false;
    tabPrivateSpaces.hidden = false;
  } else {
    guestActions.hidden = false;
    userProfileBar.hidden = true;
    tabMySpaces.hidden = true;
    tabPrivateSpaces.hidden = true;
    if (state.filter === 'mine' || state.filter === 'private') {
      state.filter = 'public';
    }
  }
  updateAgentProviderBadge();
}

async function refreshStats() {
  try {
    const pubData = await apiFetch('/api/spaces?filter=public');
    document.getElementById('statPublicCount').textContent = pubData.spaces.length;
    if (state.user) {
      const myData = await apiFetch('/api/spaces?filter=mine');
      document.getElementById('statMyCount').textContent = myData.spaces.length;
    } else {
      document.getElementById('statMyCount').textContent = '0';
    }
  } catch (_err) {
    // Ignore stat errors
  }
}

async function loadSpacesList() {
  const grid = document.getElementById('spacesGrid');
  const heading = document.getElementById('gridHeading');
  const sub = document.getElementById('gridSubtext');

  if (state.filter === 'mine') {
    heading.textContent = 'My Spaces';
    sub.textContent = 'Your staging drafts, private projects, and deployed applications';
  } else if (state.filter === 'private') {
    heading.textContent = 'Private Spaces';
    sub.textContent = 'Only accessible to your account';
  } else {
    heading.textContent = 'Published Spaces';
    sub.textContent = 'Public applications deployed by the community';
  }

  try {
    const q = encodeURIComponent(state.searchQuery);
    const data = await apiFetch(`/api/spaces?filter=${state.filter}&search=${q}`);
    state.spaces = data.spaces || [];
    renderSpacesGrid();
    refreshStats();
  } catch (err) {
    grid.innerHTML = `<p>${escapeHtml(err.message)}</p>`;
  }
}

function renderSpacesGrid() {
  const grid = document.getElementById('spacesGrid');
  if (!state.spaces.length) {
    const actionLabel = state.user ? '+ Create Space' : 'Create Account to Get Started';
    grid.innerHTML = `
      <div class="empty-state">
        <h3>No Spaces yet</h3>
        <p>${
          state.user
            ? 'Create a Space to start building in your private staging workspace.'
            : 'Create an account or sign in to stage your web applications and connect your hosting provider.'
        }</p>
        <button type="button" class="btn btn-primary btn-sm" id="emptyStateCtaBtn">${actionLabel}</button>
      </div>
    `;
    document.getElementById('emptyStateCtaBtn')?.addEventListener('click', () => {
      if (state.user) {
        document.getElementById('createSpaceDialog').showModal();
      } else {
        document.getElementById('signUpDialog').showModal();
      }
    });
    return;
  }

  grid.innerHTML = state.spaces
    .map((s) => {
      const visBadge = s.visibility === 'private' ? 'Private' : 'Public';
      const hostLabel = s.externalHost
        ? escapeHtml(s.externalHost.providerLabel)
        : 'Staging';
      const platLabels = {
        both: 'Android & iOS',
        android: 'Android App',
        iphone: 'iPhone App',
        web_only: 'Web Only'
      };
      const platLabel = platLabels[s.appPlatform || 'both'] || 'Android & iOS';

      return `
        <article class="space-card">
          <div>
            <div class="space-card-top">
              <div>
                <h3 class="space-card-title">${escapeHtml(s.title)}</h3>
                <div class="space-card-path">@${escapeHtml(s.ownerUsername)}/${escapeHtml(s.slug)}</div>
              </div>
              <div class="space-card-badges">
                <span class="badge-pill">${visBadge}</span>
                <span class="badge-pill">${platLabel}</span>
                <span class="badge-pill">${hostLabel}</span>
              </div>
            </div>
            <p class="space-card-desc" style="margin-block-start: 0.75rem;">${escapeHtml(s.description || 'Staged web application')}</p>
          </div>
          <div class="space-card-footer">
            <span class="section-sub">${s.views || 0} views · ${s.likes || 0} likes</span>
            <div style="display: flex; gap: 0.35rem;">
              <button type="button" class="btn btn-ghost btn-xs" data-fork-space="${escapeHtml(s.ownerUsername)}/${escapeHtml(s.slug)}">
                Clone
              </button>
              <button type="button" class="btn btn-outline btn-xs" data-open-space="${escapeHtml(s.ownerUsername)}/${escapeHtml(s.slug)}">
                ${s.isOwner ? 'Open Workspace' : 'Open Space'}
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  grid.querySelectorAll('[data-open-space]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [owner, slug] = btn.getAttribute('data-open-space').split('/');
      openSpaceStudio(owner, slug);
    });
  });

  grid.querySelectorAll('[data-fork-space]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!state.user) {
        showToast('Sign in to clone this Space into your private staging workspace.');
        document.getElementById('signInDialog').showModal();
        return;
      }
      const [owner, slug] = btn.getAttribute('data-fork-space').split('/');
      try {
        const res = await apiFetch(`/api/spaces/${owner}/${slug}/fork`, { method: 'POST' });
        showToast(res.message);
        openSpaceStudio(res.space.ownerUsername, res.space.slug);
      } catch (err) {
        showToast(err.message);
      }
    });
  });
}

// --- 3. SPACE STUDIO (WORKSPACE IDE + BYOA AGENT + LIVE CHECK + BUY/CONNECT HOSTING) ---

function switchMainSection(sectionId) {
  document.getElementById('hubView').hidden = sectionId !== 'hubView';
  document.getElementById('hostingHubView').hidden = sectionId !== 'hostingHubView';
  document.getElementById('agentApiView').hidden = sectionId !== 'agentApiView';
  document.getElementById('archView').hidden = sectionId !== 'archView';
  document.getElementById('spaceStudioView').hidden = sectionId !== 'spaceStudioView';
}

function setStudioTab(tabName) {
  const tabs = {
    workspace: document.getElementById('studioTabWorkspace'),
    app: document.getElementById('studioTabApp'),
    submissions: document.getElementById('studioTabSubmissions'),
    settings: document.getElementById('studioTabSettings')
  };
  const panels = {
    workspace: document.getElementById('panelWorkspace'),
    app: document.getElementById('panelApp'),
    submissions: document.getElementById('panelSubmissions'),
    settings: document.getElementById('panelSettings')
  };

  Object.keys(tabs).forEach((k) => {
    if (!tabs[k] || !panels[k]) return;
    const active = k === tabName;
    tabs[k].classList.toggle('active', active);
    tabs[k].setAttribute('aria-selected', String(active));
    panels[k].hidden = !active;
  });

  if (tabName === 'app' && state.currentSpace) {
    const frame = document.getElementById('publishedAppFrame');
    frame.src = `${state.currentSpace.stagingPreviewUrl}?t=${Date.now()}`;
  }
  if (tabName === 'submissions' && state.currentSpace?.isOwner) {
    loadSpaceSubmissions();
    loadSpaceCloudStorage();
  }
}

let studioConsoleEntries = [];
let lastRuntimeErrorMsg = '';

function renderStudioConsole() {
  const listEl = document.getElementById('consoleLogsList');
  const countBadge = document.getElementById('consoleCountBadge');
  const fixBtn = document.getElementById('fixErrorWithAiBtn');
  if (!listEl) return;
  if (countBadge) countBadge.textContent = String(studioConsoleEntries.length);
  if (fixBtn) fixBtn.hidden = !lastRuntimeErrorMsg;

  if (!studioConsoleEntries.length) {
    listEl.innerHTML = `<div>Ready — console.log() and runtime errors appear here live.</div>`;
    return;
  }
  listEl.innerHTML = studioConsoleEntries
    .slice(-30)
    .map((entry) => {
      const color =
        entry.level === 'error' ? '#f87171' : entry.level === 'warn' ? '#fbbf24' : '#a1a1aa';
      const tag = entry.level.toUpperCase();
      return `<div style="color:${color};word-break:break-word;"><strong>[${tag}]</strong> ${escapeHtml(entry.message)}</div>`;
    })
    .join('');
  listEl.scrollTop = listEl.scrollHeight;
}

window.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;
  if (data.type === 'sh_visual_edit' && state.currentSpace?.isOwner) {
    const oldText = String(data.oldText || '');
    const newText = String(data.newText || '');
    if (oldText && newText && state.workingFiles['index.html']?.includes(oldText)) {
      state.workingFiles['index.html'] = state.workingFiles['index.html'].replace(oldText, newText);
      state.isDirty = true;
      document.getElementById('dirtyIndicator').textContent = '● Unsaved visual text edit';
      if (state.activeFile === 'index.html') {
        document.getElementById('codeEditorTextarea').value = state.workingFiles['index.html'];
      }
      showToast('Synced inline text edit to index.html!');
    }
    return;
  }
  if (data.type !== 'sh_console') return;
  const level = ['log', 'warn', 'error'].includes(data.level) ? data.level : 'log';
  const message = String(data.message ?? '').slice(0, 500);
  studioConsoleEntries.push({ level, message });
  if (level === 'error') {
    lastRuntimeErrorMsg = message;
  }
  renderStudioConsole();
});

document.getElementById('clearConsoleBtn')?.addEventListener('click', () => {
  studioConsoleEntries = [];
  lastRuntimeErrorMsg = '';
  renderStudioConsole();
});

document.getElementById('fixErrorWithAiBtn')?.addEventListener('click', () => {
  if (!lastRuntimeErrorMsg) return;
  const promptInput = document.getElementById('agentPromptInput');
  const form = document.getElementById('studioAgentForm');
  if (promptInput && form) {
    promptInput.value = `Fix this runtime error in my Space: ${lastRuntimeErrorMsg}`;
    form.requestSubmit();
  }
});

function updateLiveStagingPreview() {
  const iframe = document.getElementById('workspacePreviewFrame');
  if (!iframe) return;
  studioConsoleEntries = [];
  lastRuntimeErrorMsg = '';
  renderStudioConsole();
  iframe.srcdoc = bundleClientPreview(state.workingFiles, true);
}

function updateStudioHeaderBadges(space) {
  document.getElementById('studioEmoji').textContent = space.emoji || '🚀';
  document.getElementById('studioOwner').textContent = `@${space.ownerUsername}`;
  document.getElementById('studioTitle').textContent = space.title;
  document.getElementById('likeCountText').textContent = space.likes || 0;

  const visBadge = document.getElementById('studioVisibilityBadge');
  visBadge.textContent = space.visibility === 'private' ? 'Private' : 'Public';

  const platBadge = document.getElementById('studioPlatformBadge');
  const installSpaceBtn = document.getElementById('installSpaceAppBtn');
  const platLabels = {
    both: 'Android & iPhone',
    android: 'Android App',
    iphone: 'iPhone App',
    web_only: 'Web Only'
  };
  const currentPlat = space.appPlatform || 'both';
  if (platBadge) {
    platBadge.textContent = platLabels[currentPlat] || 'Android & iPhone';
  }
  if (installSpaceBtn) {
    installSpaceBtn.hidden = currentPlat === 'web_only';
  }

  const statusBadge = document.getElementById('studioStatusBadge');
  if (space.status === 'draft') {
    statusBadge.textContent = 'Staging';
  } else if (space.hasUnpublishedChanges) {
    statusBadge.textContent = 'Unpublished Changes';
  } else {
    statusBadge.textContent = 'Live';
  }

  const analyticsBadge = document.getElementById('studioAnalyticsBadge');
  if (analyticsBadge) {
    analyticsBadge.textContent = `${space.views || 0} views · ${space.installs || 0} installs`;
  }

  const rollbackBtn = document.getElementById('rollbackDraftBtn');
  const snapSelect = document.getElementById('snapshotRestoreSelect');
  const saveSnapBtn = document.getElementById('saveSnapshotBtn');
  if (saveSnapBtn) {
    saveSnapBtn.hidden = !space.isOwner;
  }
  const snapsList = Array.isArray(space.snapshots) ? space.snapshots : [];
  const snapCount = space.snapshotCount || snapsList.length;
  if (rollbackBtn) {
    rollbackBtn.hidden = !(space.isOwner && snapCount > 0);
    rollbackBtn.textContent = `Undo (${snapCount})`;
  }
  if (snapSelect) {
    snapSelect.hidden = !(space.isOwner && snapsList.length > 0);
    snapSelect.innerHTML =
      `<option value="">History (${snapsList.length})...</option>` +
      snapsList
        .map(
          (s) =>
            `<option value="${escapeHtml(s.id)}">Restore: ${escapeHtml(s.label || s.id)}</option>`
        )
        .join('');
  }

  const hostBadge = document.getElementById('studioHostBadge');
  const appViewHostSummary = document.getElementById('appViewHostSummary');
  const externalDirectLink = document.getElementById('externalHostDirectLink');

  if (space.externalHost) {
    hostBadge.textContent = space.externalHost.providerLabel;
    appViewHostSummary.innerHTML = `Deployed on <strong>${escapeHtml(
      space.externalHost.providerLabel
    )}</strong> · <code>${escapeHtml(space.externalHost.liveUrl)}</code>`;
    externalDirectLink.href = space.externalHost.liveUrl;
    externalDirectLink.hidden = false;
  } else {
    hostBadge.textContent = 'No Host';
    appViewHostSummary.textContent =
      'Staging preview active. Connect a hosting provider or select a plan when ready to deploy.';
    externalDirectLink.hidden = true;
  }

  const quickPrivacyBtn = document.getElementById('quickPrivacyToggleBtn');
  const launchBtn = document.getElementById('launchSpaceBtn');
  const submissionsTab = document.getElementById('studioTabSubmissions');
  const submissionsCountBadge = document.getElementById('submissionsCountBadge');
  const settingsTab = document.getElementById('studioTabSettings');
  const saveDraftBtn = document.getElementById('saveDraftBtn');
  const codeTextarea = document.getElementById('codeEditorTextarea');
  const studioAgentBar = document.getElementById('studioAgentBar');

  if (submissionsCountBadge) {
    submissionsCountBadge.textContent = String(space.submissionCount || 0);
  }
  const formEndpointSnippet = document.getElementById('formEndpointSnippet');
  if (formEndpointSnippet) {
    formEndpointSnippet.textContent = `<form action="/live/${space.slug}/submit" method="POST">\n  <input type="text" name="name" placeholder="Your name" required />\n  <input type="email" name="email" placeholder="you@example.com" required />\n  <textarea name="message" placeholder="Message"></textarea>\n  <button type="submit">Submit</button>\n</form>`;
  }

  if (space.isOwner) {
    quickPrivacyBtn.hidden = false;
    quickPrivacyBtn.textContent =
      space.visibility === 'private' ? 'Make Public' : 'Make Private';
    launchBtn.hidden = false;
    launchBtn.textContent = space.externalHost ? 'Update Deployment' : 'Deploy';
    if (submissionsTab) submissionsTab.hidden = false;
    settingsTab.hidden = false;
    saveDraftBtn.hidden = false;
    codeTextarea.readOnly = false;
    studioAgentBar.hidden = false;
  } else {
    quickPrivacyBtn.hidden = true;
    launchBtn.hidden = true;
    if (submissionsTab) submissionsTab.hidden = true;
    settingsTab.hidden = true;
    saveDraftBtn.hidden = true;
    codeTextarea.readOnly = true;
    studioAgentBar.hidden = true;
  }

  const liveLink = document.getElementById('openStandaloneLink');
  liveLink.href = space.liveUrl || space.stagingPreviewUrl;
}

function renderFileTabs() {
  const container = document.getElementById('fileTabsList');
  if (!container) return;
  const defaultOrder = ['index.html', 'style.css', 'script.js', 'README.md'];
  const extraFiles = Object.keys(state.workingFiles || {}).filter((f) => !defaultOrder.includes(f));
  const allFiles = [...defaultOrder, ...extraFiles];

  container.innerHTML = allFiles
    .map(
      (fname) =>
        `<button type="button" class="file-tab ${fname === state.activeFile ? 'active' : ''}" data-file="${escapeHtml(
          fname
        )}">${escapeHtml(fname)}</button>`
    )
    .join('');

  container.querySelectorAll('.file-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const file = btn.getAttribute('data-file');
      state.activeFile = file;
      container.querySelectorAll('.file-tab').forEach((b) => b.classList.toggle('active', b === btn));
      document.getElementById('codeEditorTextarea').value = state.workingFiles[file] || '';
      const addr = document.getElementById('previewAddressBar');
      if (addr) addr.textContent = `staging://${file}`;
    });
  });
}

async function openSpaceStudio(username, slug) {
  try {
    const data = await apiFetch(`/api/spaces/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`);
    const space = data.space;
    state.currentSpace = space;

    const sourceFiles = space.isOwner
      ? space.draftFiles || space.publishedFiles || {}
      : space.publishedFiles || {};
    state.workingFiles = JSON.parse(JSON.stringify(sourceFiles));
    state.activeFile = 'index.html';
    state.isDirty = false;

    updateStudioHeaderBadges(space);
    renderFileTabs();
    document.getElementById('codeEditorTextarea').value = state.workingFiles[state.activeFile] || '';
    document.getElementById('dirtyIndicator').textContent = space.isOwner
      ? 'Staging Workspace Ready'
      : 'Read-only Source View';

    const lastSummaryEl = document.getElementById('agentLastSummary');
    if (space.agentHistory && space.agentHistory.length > 0) {
      lastSummaryEl.textContent = `Last Agent Build: ${space.agentHistory[0].summary}`;
      lastSummaryEl.hidden = false;
    } else {
      lastSummaryEl.hidden = true;
    }

    document.getElementById('settingsTitleInput').value = space.title;
    document.getElementById('settingsDescInput').value = space.description;
    document.getElementById('visPublic').checked = space.visibility === 'public';
    document.getElementById('visPrivate').checked = space.visibility === 'private';

    const platVal = space.appPlatform || 'both';
    const platRadio = document.querySelector(`input[name="settingsAppPlatform"][value="${platVal}"]`);
    if (platRadio) platRadio.checked = true;
    const orientSelect = document.getElementById('settingsOrientationSelect');
    if (orientSelect) orientSelect.value = space.appOrientation || 'any';
    const iconTextInput = document.getElementById('settingsIconTextInput');
    if (iconTextInput) iconTextInput.value = space.appIconText || '';
    const themeColorSelect = document.getElementById('settingsThemeColorSelect');
    if (themeColorSelect) themeColorSelect.value = space.appThemeColor || '#09090b';
    const passcodeInput = document.getElementById('settingsPasscodeInput');
    if (passcodeInput) passcodeInput.value = space.previewPasscode || '';
    const secretsInput = document.getElementById('settingsSecretsInput');
    if (secretsInput) {
      const secretsObj = space.secrets && typeof space.secrets === 'object' ? space.secrets : {};
      secretsInput.value = Object.entries(secretsObj)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');
    }
    const customDomainInput = document.getElementById('settingsCustomDomainInput');
    if (customDomainInput) customDomainInput.value = space.customDomain || '';
    const webhookUrlInput = document.getElementById('settingsWebhookUrlInput');
    if (webhookUrlInput) webhookUrlInput.value = space.submissionWebhookUrl || '';
    const collaboratorsInput = document.getElementById('settingsCollaboratorsInput');
    if (collaboratorsInput) {
      collaboratorsInput.value = Array.isArray(space.collaborators)
        ? space.collaborators.join(', ')
        : '';
    }
    const cronSchedSelect = document.getElementById('settingsCronScheduleSelect');
    if (cronSchedSelect) cronSchedSelect.value = space.cronSchedule || '';
    const cronUrlInput = document.getElementById('settingsCronUrlInput');
    if (cronUrlInput) cronUrlInput.value = space.cronWebhookUrl || '';
    const cronStatusEl = document.getElementById('cronLastRunStatus');
    if (cronStatusEl) {
      cronStatusEl.textContent = space.cronLastRunAt
        ? `Last cron run: ${new Date(space.cronLastRunAt).toLocaleString()} (${space.cronLastStatus || 'ok'})`
        : 'No cron execution recorded yet.';
    }
    const maintChk = document.getElementById('settingsMaintenanceCheckbox');
    if (maintChk) maintChk.checked = Boolean(space.maintenanceMode);

    updateLiveStagingPreview();
    switchMainSection('spaceStudioView');
    setStudioTab(space.isOwner ? 'workspace' : 'app');
  } catch (err) {
    showToast(err.message);
  }
}

// Add Custom File (+ File button)
document.getElementById('addCustomFileBtn')?.addEventListener('click', () => {
  if (!state.currentSpace || !state.currentSpace.isOwner) return;
  const rawName = window.prompt('New file name (e.g. components.js, data.json, pricing.html, theme.css):');
  if (!rawName) return;
  const cleanName = rawName.trim().replace(/[^a-zA-Z0-9._-]/g, '');
  if (!cleanName || !/\.(html|css|js|json|svg|txt)$/i.test(cleanName)) {
    showToast('Use a valid extension: .html, .css, .js, .json, .svg, or .txt');
    return;
  }
  if (state.workingFiles[cleanName] === undefined) {
    state.workingFiles[cleanName] = cleanName.endsWith('.json')
      ? '{\n  "status": "ready"\n}'
      : `// ${cleanName}\n`;
    if (cleanName.endsWith('.js') && state.workingFiles['index.html'] && !state.workingFiles['index.html'].includes(cleanName)) {
      state.workingFiles['index.html'] = state.workingFiles['index.html'].replace(
        '</body>',
        `  <script src="${cleanName}"></script>\n</body>`
      );
    } else if (cleanName.endsWith('.css') && state.workingFiles['index.html'] && !state.workingFiles['index.html'].includes(cleanName)) {
      state.workingFiles['index.html'] = state.workingFiles['index.html'].replace(
        '</head>',
        `  <link rel="stylesheet" href="${cleanName}" />\n</head>`
      );
    }
  }
  state.activeFile = cleanName;
  state.isDirty = true;
  renderFileTabs();
  document.getElementById('codeEditorTextarea').value = state.workingFiles[cleanName];
  updateLiveStagingPreview();
  showToast(`Created ${cleanName} in workspace!`);
});

// Import Local Files from Disk (Import button + Drag-and-Drop on Editor)
async function handleImportedFileList(fileList) {
  if (!state.currentSpace || !state.currentSpace.isOwner || !fileList?.length) return;
  let importedCount = 0;
  let lastImportedName = state.activeFile;

  for (const file of Array.from(fileList)) {
    const cleanName = file.name.trim().replace(/[^a-zA-Z0-9._-]/g, '');
    if (!/\.(html|css|js|json|svg|txt|md)$/i.test(cleanName)) continue;
    const content = await file.text();
    state.workingFiles[cleanName] = content;
    lastImportedName = cleanName;
    importedCount++;

    if (cleanName !== 'script.js' && cleanName.endsWith('.js') && state.workingFiles['index.html'] && !state.workingFiles['index.html'].includes(cleanName)) {
      state.workingFiles['index.html'] = state.workingFiles['index.html'].replace(
        '</body>',
        `  <script src="${cleanName}"></script>\n</body>`
      );
    } else if (cleanName !== 'style.css' && cleanName.endsWith('.css') && state.workingFiles['index.html'] && !state.workingFiles['index.html'].includes(cleanName)) {
      state.workingFiles['index.html'] = state.workingFiles['index.html'].replace(
        '</head>',
        `  <link rel="stylesheet" href="${cleanName}" />\n</head>`
      );
    }
  }

  if (!importedCount) {
    showToast('Select .html, .css, .js, .json, .svg, .txt, or .md files to import.');
    return;
  }
  state.activeFile = lastImportedName;
  state.isDirty = true;
  renderFileTabs();
  document.getElementById('codeEditorTextarea').value = state.workingFiles[state.activeFile] || '';
  document.getElementById('dirtyIndicator').textContent = `● Imported ${importedCount} file(s) (Unsaved)`;
  updateLiveStagingPreview();
  showToast(`Imported ${importedCount} file(s) into staging workspace!`);
}

document.getElementById('importLocalFilesBtn')?.addEventListener('click', () => {
  if (!state.currentSpace || !state.currentSpace.isOwner) return;
  document.getElementById('importFilesInput')?.click();
});

document.getElementById('importFilesInput')?.addEventListener('change', async (e) => {
  await handleImportedFileList(e.target.files);
  e.target.value = '';
});

const editorPaneEl = document.getElementById('editorPane');
if (editorPaneEl) {
  editorPaneEl.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  editorPaneEl.addEventListener('drop', async (e) => {
    if (e.dataTransfer?.files?.length) {
      e.preventDefault();
      await handleImportedFileList(e.dataTransfer.files);
    }
  });
}

// 1-Click Library & Stack Injector (+ Add Library / Stack)
document.getElementById('injectStackSelect')?.addEventListener('change', (e) => {
  const stack = e.target.value;
  e.target.value = '';
  if (!stack || !state.currentSpace || !state.currentSpace.isOwner) return;

  const snippets = {
    tailwind: `<script src="https://cdn.tailwindcss.com"></script>`,
    react: `<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>\n  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>\n  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>`,
    alpine: `<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>`,
    chartjs: `<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>`,
    threejs: `<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>`,
    lucide: `<script src="https://unpkg.com/lucide@latest"></script>`
  };

  if (stack === 'cloud_db') {
    const slug = state.currentSpace.slug;
    const helperCode = `\n// --- SpaceHub Built-in Cloud JSON Storage Helper ---\nasync function loadCloudState() {\n  const res = await fetch('/live/${slug}/storage');\n  const json = await res.json();\n  return json.data || {};\n}\nasync function saveCloudState(patch) {\n  const res = await fetch('/live/${slug}/storage', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify(patch)\n  });\n  return (await res.json()).data;\n}\n`;
    state.workingFiles['script.js'] = (state.workingFiles['script.js'] || '') + helperCode;
    state.activeFile = 'script.js';
    renderFileTabs();
    document.getElementById('codeEditorTextarea').value = state.workingFiles['script.js'];
    showToast('Added Cloud Storage SDK helper functions to script.js!');
    return;
  }

  if (stack === 'proxy_helper') {
    const slug = state.currentSpace.slug;
    const proxyCode = `\n// --- SpaceHub Server-Side API Proxy Helper (replaces {{SECRET_NAME}} server-side) ---\nasync function callSpaceProxy(url, options = {}) {\n  const res = await fetch('/live/${slug}/proxy', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({\n      url,\n      method: options.method || 'GET',\n      headers: options.headers || { Authorization: 'Bearer {{API_KEY}}' },\n      body: options.body || null\n    })\n  });\n  return res.json();\n}\n`;
    state.workingFiles['script.js'] = (state.workingFiles['script.js'] || '') + proxyCode;
    state.activeFile = 'script.js';
    state.isDirty = true;
    renderFileTabs();
    document.getElementById('codeEditorTextarea').value = state.workingFiles['script.js'];
    showToast('Added callSpaceProxy() helper to script.js! Configure secrets in Settings.');
    return;
  }

  if (stack === 'app_auth') {
    const slug = state.currentSpace.slug;
    const authCode = `\n// --- SpaceHub Built-in Member Login & Auth SDK (/live/${slug}/auth) ---\nasync function spaceMemberAuth(email, password, name = '') {\n  const res = await fetch('/live/${slug}/auth', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({ email, password, name })\n  });\n  const data = await res.json();\n  if (data.token) localStorage.setItem('space_member_token', data.token);\n  return data;\n}\nasync function getCurrentSpaceMember() {\n  const tok = localStorage.getItem('space_member_token') || '';\n  if (!tok) return null;\n  const res = await fetch('/live/${slug}/auth/me', {\n    headers: { Authorization: 'Bearer ' + tok }\n  });\n  if (!res.ok) return null;\n  return (await res.json()).user;\n}\n`;
    state.workingFiles['script.js'] = (state.workingFiles['script.js'] || '') + authCode;
    state.activeFile = 'script.js';
    state.isDirty = true;
    renderFileTabs();
    document.getElementById('codeEditorTextarea').value = state.workingFiles['script.js'];
    showToast('Added spaceMemberAuth() & getCurrentSpaceMember() SDK to script.js!');
    return;
  }

  if (stack === 'space_ai') {
    const slug = state.currentSpace.slug;
    const aiCode = `\n// --- SpaceHub Built-in AI Assistant SDK (/live/${slug}/ai) ---\nasync function askSpaceAI(prompt, system = '') {\n  const res = await fetch('/live/${slug}/ai', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({ prompt, system })\n  });\n  return (await res.json()).reply;\n}\n`;
    state.workingFiles['script.js'] = (state.workingFiles['script.js'] || '') + aiCode;
    state.activeFile = 'script.js';
    state.isDirty = true;
    renderFileTabs();
    document.getElementById('codeEditorTextarea').value = state.workingFiles['script.js'];
    showToast('Added askSpaceAI(prompt) helper to script.js!');
    return;
  }

  if (stack === 'live_room') {
    const slug = state.currentSpace.slug;
    const roomCode = `\n// --- SpaceHub Real-Time Multiplayer & Live Chat Room SDK (/live/${slug}/room) ---\nasync function sendRoomEvent(sender, text, payload = {}) {\n  const res = await fetch('/live/${slug}/room', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({ sender, text, payload })\n  });\n  return (await res.json()).events || [];\n}\nasync function getRoomEvents() {\n  const res = await fetch('/live/${slug}/room');\n  return (await res.json()).events || [];\n}\n`;
    state.workingFiles['script.js'] = (state.workingFiles['script.js'] || '') + roomCode;
    state.activeFile = 'script.js';
    state.isDirty = true;
    renderFileTabs();
    document.getElementById('codeEditorTextarea').value = state.workingFiles['script.js'];
    showToast('Added sendRoomEvent() & getRoomEvents() SDK to script.js!');
    return;
  }

  if (stack === 'space_assets') {
    const assetsSdk = `\n// --- SpaceHub Built-in Media & Asset Hosting SDK (/live/:slug/assets) ---\nasync function uploadSpaceAsset(name, dataUrlOrText, mimeType = '') {\n  const res = await fetch('/live/${state.currentSpace.slug}/assets', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify(dataUrlOrText.startsWith('data:') ? { name, dataUrl: dataUrlOrText, mimeType } : { name, content: dataUrlOrText, mimeType })\n  });\n  return res.json();\n}\nasync function listSpaceAssets() {\n  const res = await fetch('/live/${state.currentSpace.slug}/assets');\n  const json = await res.json();\n  return json.assets || [];\n}\nwindow.SpaceAssets = { upload: uploadSpaceAsset, list: listSpaceAssets };\n`;
    const currentJs = state.workingFiles['script.js'] || '';
    state.workingFiles['script.js'] = currentJs + assetsSdk;
    state.activeFile = 'script.js';
    state.isDirty = true;
    renderFileTabs();
    document.getElementById('codeEditorTextarea').value = state.workingFiles['script.js'];
    updateLiveStagingPreview();
    showToast('Added SpaceAssets.upload() & SpaceAssets.list() SDK to script.js!');
    return;
  }

  if (stack === 'space_search') {
    const searchSdk = `\n// --- SpaceHub Instant Full-Text Search SDK (/live/:slug/search) ---\nasync function searchSpace(query) {\n  const res = await fetch('/live/${state.currentSpace.slug}/search?q=' + encodeURIComponent(query));\n  const json = await res.json();\n  return json.results || [];\n}\nwindow.SpaceSearch = { query: searchSpace };\n`;
    const currentJs = state.workingFiles['script.js'] || '';
    state.workingFiles['script.js'] = currentJs + searchSdk;
    state.activeFile = 'script.js';
    state.isDirty = true;
    renderFileTabs();
    document.getElementById('codeEditorTextarea').value = state.workingFiles['script.js'];
    updateLiveStagingPreview();
    showToast('Added SpaceSearch.query(q) SDK to script.js!');
    return;
  }

  if (stack === 'space_table_db') {
    const tableSdk = `\n// --- SpaceHub Structured Table DB SDK (/live/:slug/db/:table) ---\nfunction getSpaceTable(tableName = 'items') {\n  const base = '/live/${state.currentSpace.slug}/db/' + encodeURIComponent(tableName);\n  return {\n    async list(where = '', sort = '') {\n      const q = new URLSearchParams();\n      if (where) q.set('where', where);\n      if (sort) q.set('sort', sort);\n      const res = await fetch(base + (q.toString() ? '?' + q.toString() : ''));\n      const json = await res.json();\n      return json.rows || [];\n    },\n    async insert(row) {\n      const res = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) });\n      return res.json();\n    },\n    async update(id, patch) {\n      const res = await fetch(base + '?id=' + encodeURIComponent(id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });\n      return res.json();\n    },\n    async remove(id) {\n      const res = await fetch(base + '?id=' + encodeURIComponent(id), { method: 'DELETE' });\n      return res.json();\n    }\n  };\n}\nwindow.SpaceDB = { table: getSpaceTable };\n`;
    state.workingFiles['script.js'] = (state.workingFiles['script.js'] || '') + tableSdk;
    state.activeFile = 'script.js';
    state.isDirty = true;
    renderFileTabs();
    document.getElementById('codeEditorTextarea').value = state.workingFiles['script.js'];
    updateLiveStagingPreview();
    showToast('Added SpaceDB.table(name) SDK to script.js!');
    return;
  }

  if (stack === 'space_orders') {
    const ordersSdk = `\n// --- SpaceHub Storefront & Order Checkout SDK (/live/:slug/orders) ---\nasync function createSpaceOrder(items, buyerEmail = '') {\n  const res = await fetch('/live/${state.currentSpace.slug}/orders', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({ items, buyerEmail })\n  });\n  return res.json();\n}\nasync function getSpaceOrder(id) {\n  const res = await fetch('/live/${state.currentSpace.slug}/orders?id=' + encodeURIComponent(id));\n  return res.json();\n}\n// Usage: const { order } = await SpaceOrders.create([{ name: 'Pro Plan', priceUsd: 10, qty: 1 }], 'buyer@example.com'); window.location = order.checkoutUrl;\nwindow.SpaceOrders = { create: createSpaceOrder, get: getSpaceOrder };\n`;
    state.workingFiles['script.js'] = (state.workingFiles['script.js'] || '') + ordersSdk;
    state.activeFile = 'script.js';
    state.isDirty = true;
    renderFileTabs();
    document.getElementById('codeEditorTextarea').value = state.workingFiles['script.js'];
    updateLiveStagingPreview();
    showToast('Added SpaceOrders.create(items, email) SDK! Set PAYPAL_EMAIL in the Secrets Vault to receive payments.');
    return;
  }

  if (stack === 'ab_variant') {
    if (state.workingFiles['index.b.html'] !== undefined) {
      showToast('index.b.html already exists — edit it to change Variant B.');
    } else {
      state.workingFiles['index.b.html'] = state.workingFiles['index.html'] || '';
      showToast('Created index.b.html (Variant B). Publish to split live traffic 50/50 — use ?variant=a|b to force.');
    }
    state.activeFile = 'index.b.html';
    state.isDirty = true;
    renderFileTabs();
    document.getElementById('codeEditorTextarea').value = state.workingFiles['index.b.html'];
    return;
  }

  if (stack === 'redirects_json') {
    if (state.workingFiles['redirects.json'] === undefined) {
      state.workingFiles['redirects.json'] = JSON.stringify(
        {
          '/pricing': '/index.html#pricing',
          '/twitter': 'https://x.com/yourhandle',
          '/old-page': { to: '/', status: 301 }
        },
        null,
        2
      );
    }
    state.activeFile = 'redirects.json';
    state.isDirty = true;
    renderFileTabs();
    document.getElementById('codeEditorTextarea').value = state.workingFiles['redirects.json'];
    showToast('Created redirects.json — single-segment paths like /pricing redirect after publish.');
    return;
  }

  if (stack === 'edge_fn') {
    state.workingFiles['routes.json'] = JSON.stringify(
      {
        ping: { status: 'online', version: '1.0.0' },
        pricing: { monthlyUsd: 1, yearlyUsd: 12 }
      },
      null,
      2
    );
    const fnSdk = `\n// --- SpaceHub Serverless Edge Function SDK (/live/:slug/fn) ---\nasync function callSpaceFn(action = 'ping', payload = {}) {\n  const res = await fetch('/live/${state.currentSpace.slug}/fn?action=' + encodeURIComponent(action), {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({ action, ...payload })\n  });\n  return res.json();\n}\nwindow.SpaceFn = { call: callSpaceFn };\n`;
    state.workingFiles['script.js'] = (state.workingFiles['script.js'] || '') + fnSdk;
    state.activeFile = 'routes.json';
    state.isDirty = true;
    renderFileTabs();
    document.getElementById('codeEditorTextarea').value = state.workingFiles['routes.json'];
    updateLiveStagingPreview();
    showToast('Created routes.json & added SpaceFn.call(action, payload) SDK!');
    return;
  }

  if (stack === 'space_analytics') {
    const analyticsSdk = `\n// --- SpaceHub Custom Event & Funnel Analytics SDK (/live/:slug/events) ---\nasync function trackSpaceEvent(event, props = {}) {\n  const res = await fetch('/live/${state.currentSpace.slug}/events', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({ event, props })\n  });\n  return res.json();\n}\nasync function getSpaceAnalytics() {\n  const res = await fetch('/live/${state.currentSpace.slug}/events');\n  return res.json();\n}\nwindow.SpaceAnalytics = { track: trackSpaceEvent, getSummary: getSpaceAnalytics };\n`;
    state.workingFiles['script.js'] = (state.workingFiles['script.js'] || '') + analyticsSdk;
    state.activeFile = 'script.js';
    state.isDirty = true;
    renderFileTabs();
    document.getElementById('codeEditorTextarea').value = state.workingFiles['script.js'];
    updateLiveStagingPreview();
    showToast('Added SpaceAnalytics.track(event, props) SDK to script.js!');
    return;
  }

  if (stack === 'space_notify') {
    const notifySdk = `\n// --- SpaceHub Transactional Email & Notification SDK (/live/:slug/notify) ---\nasync function sendSpaceNotification(to, subject, message) {\n  const res = await fetch('/live/${state.currentSpace.slug}/notify', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({ to, subject, message })\n  });\n  return res.json();\n}\nwindow.SpaceNotify = { send: sendSpaceNotification };\n`;
    state.workingFiles['script.js'] = (state.workingFiles['script.js'] || '') + notifySdk;
    state.activeFile = 'script.js';
    state.isDirty = true;
    renderFileTabs();
    document.getElementById('codeEditorTextarea').value = state.workingFiles['script.js'];
    updateLiveStagingPreview();
    showToast('Added SpaceNotify.send(to, subject, message) SDK to script.js!');
    return;
  }

  if (stack === 'creator_checkout') {
    const recipient = encodeURIComponent(state.user?.email || 'romitat924@gmail.com');
    const itemName = encodeURIComponent(`${state.currentSpace.title} — Creator Pass`);
    const checkoutUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${recipient}&item_name=${itemName}&amount=5.00&currency_code=USD&no_shipping=1`;
    const widgetHtml = `\n  <!-- SpaceHub Creator Buy / Tip Button -->\n  <div style="margin:1.25rem 0;padding:1rem 1.25rem;border:1px solid #27272a;border-radius:0.75rem;background:#18181b;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">\n    <div>\n      <strong style="display:block;color:#fafafa;font-size:0.95rem;">Support ${escapeHtml(state.currentSpace.title)}</strong>\n      <span style="color:#a1a1aa;font-size:0.82rem;">Instant checkout via Card, Apple Pay, Google Pay, or PayPal</span>\n    </div>\n    <a href="${checkoutUrl}" target="_blank" rel="noopener" style="background:#fafafa;color:#09090b;padding:0.55rem 1rem;border-radius:0.5rem;font-weight:700;font-size:0.85rem;text-decoration:none;">Buy / Tip $5 ↗</a>\n  </div>\n`;
    let html = state.workingFiles['index.html'] || '';
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${widgetHtml}</body>`);
    } else {
      html += widgetHtml;
    }
    state.workingFiles['index.html'] = html;
    state.activeFile = 'index.html';
    state.isDirty = true;
    renderFileTabs();
    document.getElementById('codeEditorTextarea').value = html;
    updateLiveStagingPreview();
    showToast('Injected Creator Buy / Tip Checkout widget into index.html!');
    return;
  }

  const tag = snippets[stack];
  if (!tag) return;
  let html = state.workingFiles['index.html'] || '';
  if (html.includes(tag)) {
    showToast('This library is already included in index.html.');
    return;
  }
  if (html.includes('</head>')) {
    html = html.replace('</head>', `  ${tag}\n</head>`);
  } else {
    html = `${tag}\n` + html;
  }
  state.workingFiles['index.html'] = html;
  state.isDirty = true;
  if (state.activeFile === 'index.html') {
    document.getElementById('codeEditorTextarea').value = html;
  }
  updateLiveStagingPreview();
  showToast(`Injected ${stack.toUpperCase()} into index.html!`);
});

// 1-Click AI Visual Theme & Design Remixer
document.getElementById('themePresetSelect')?.addEventListener('change', (e) => {
  const preset = e.target.value;
  e.target.value = '';
  if (!preset || !state.currentSpace || !state.currentSpace.isOwner) return;

  const themes = {
    vercel_dark: `/* --- SpaceHub Theme Preset: Vercel Monochrome Dark --- */\n:root { --accent: #fafafa !important; }\nbody { background: #09090b !important; color: #fafafa !important; font-family: system-ui, -apple-system, sans-serif !important; }\n.card, .waitlist-card, .control-box, .metrics-box, .link-card { background: #121215 !important; border: 1px solid #27272a !important; color: #fafafa !important; }\nbutton, .btn-primary { background: #fafafa !important; color: #09090b !important; }`,
    linear_glass: `/* --- SpaceHub Theme Preset: Linear Indigo Glass --- */\n:root { --accent: #818cf8 !important; }\nbody { background: radial-gradient(circle at top, #1e1b4b, #09090b 70%) !important; color: #f8fafc !important; }\n.card, .waitlist-card, .control-box, .metrics-box, .link-card { background: rgba(24, 24, 36, 0.78) !important; border: 1px solid rgba(129, 140, 248, 0.28) !important; backdrop-filter: blur(12px) !important; }\nbutton, .btn-primary { background: #6366f1 !important; color: #ffffff !important; }`,
    daylight_light: `/* --- SpaceHub Theme Preset: Clean Daylight Light --- */\n:root { --accent: #18181b !important; }\nbody { background: #f8fafc !important; color: #0f172a !important; }\n.card, .waitlist-card, .control-box, .metrics-box, .link-card { background: #ffffff !important; border: 1px solid #e2e8f0 !important; color: #0f172a !important; box-shadow: 0 4px 16px rgba(15,23,42,0.05) !important; }\np, .tagline { color: #475569 !important; }\nbutton, .btn-primary { background: #0f172a !important; color: #ffffff !important; }`,
    emerald_cyber: `/* --- SpaceHub Theme Preset: Emerald Cyber Matrix --- */\n:root { --accent: #10b981 !important; }\nbody { background: #02100b !important; color: #ecfdf5 !important; }\n.card, .waitlist-card, .control-box, .metrics-box, .link-card { background: #062016 !important; border: 1px solid rgba(16, 185, 129, 0.35) !important; }\nbutton, .btn-primary { background: #10b981 !important; color: #022c22 !important; }`,
    warm_editorial: `/* --- SpaceHub Theme Preset: Warm Sunset Editorial --- */\n:root { --accent: #f97316 !important; }\nbody { background: #1c1917 !important; color: #fafaf9 !important; }\n.card, .waitlist-card, .control-box, .metrics-box, .link-card { background: #292524 !important; border: 1px solid #44403c !important; }\nbutton, .btn-primary { background: #f97316 !important; color: #0c0a09 !important; }`
  };

  const cssBlock = themes[preset];
  if (!cssBlock) return;
  let currentCss = state.workingFiles['style.css'] || '';
  currentCss = currentCss.replace(/\/\* --- SpaceHub Theme Preset:[\s\S]*$/, '').trim();
  state.workingFiles['style.css'] = `${currentCss}\n\n${cssBlock}\n`;
  state.isDirty = true;
  if (state.activeFile === 'style.css') {
    document.getElementById('codeEditorTextarea').value = state.workingFiles['style.css'];
  }
  updateLiveStagingPreview();
  showToast(`Applied ${preset.replace('_', ' ').toUpperCase()} theme preset to style.css!`);
});

// Live typing updates staging preview
let previewDebounce;
document.getElementById('codeEditorTextarea').addEventListener('input', (e) => {
  if (!state.currentSpace || !state.currentSpace.isOwner) return;
  state.workingFiles[state.activeFile] = e.target.value;
  state.isDirty = true;
  document.getElementById('dirtyIndicator').textContent = '● Unsaved edits (Live in staging check)';
  clearTimeout(previewDebounce);
  previewDebounce = setTimeout(updateLiveStagingPreview, 220);
});

document.getElementById('refreshPreviewBtn').addEventListener('click', () => {
  updateLiveStagingPreview();
  showToast('Staging preview refreshed');
});

// In-Studio SEO, Mobile & Accessibility Auditor
function runSpaceQualityAudit() {
  if (!state.currentSpace) return;
  const html = state.workingFiles['index.html'] || '';
  const checks = [
    {
      label: 'Document <title> tag present',
      passed: /<title>[^<]+<\/title>/i.test(html),
      pts: 20,
      hint: 'Helps search engines and mobile home-screen icons label your app.'
    },
    {
      label: 'Responsive mobile <meta name="viewport"> tag',
      passed: /name=["']viewport["']/i.test(html),
      pts: 20,
      hint: 'Ensures proper scaling on Android and iPhone screens.'
    },
    {
      label: 'SEO <meta name="description"> tag',
      passed: /name=["']description["']/i.test(html),
      pts: 20,
      hint: 'Improves search ranking snippets and social link previews.'
    },
    {
      label: 'Semantic <main> or <h1> heading landmark',
      passed: /<main[\s>]|<h1[\s>]/i.test(html),
      pts: 20,
      hint: 'Essential for screen readers and keyboard navigation.'
    },
    {
      label: 'All <img> tags include accessible alt attributes',
      passed: !/<img(?![^>]*\balt=)[^>]*>/i.test(html),
      pts: 20,
      hint: 'Every image should provide an alt attribute for accessibility.'
    }
  ];

  const score = checks.reduce((sum, c) => sum + (c.passed ? c.pts : 0), 0);
  const scoreBadge = document.getElementById('auditScoreBadge');
  if (scoreBadge) {
    scoreBadge.textContent = `${score} / 100`;
    scoreBadge.style.color = score === 100 ? '#34d399' : score >= 60 ? '#fbbf24' : '#f87171';
  }
  const container = document.getElementById('auditChecklistContainer');
  if (container) {
    container.innerHTML = checks
      .map(
        (c) => `
      <div class="pat-key-item">
        <div>
          <strong>${c.passed ? '✓' : '⚠'} ${escapeHtml(c.label)}</strong>
          <div class="section-sub">${escapeHtml(c.hint)}</div>
        </div>
        <span class="badge-pill">${c.passed ? `+${c.pts} pts` : 'Missing'}</span>
      </div>
    `
      )
      .join('');
  }
  const fixBtn = document.getElementById('autoFixAuditBtn');
  if (fixBtn) {
    fixBtn.hidden = !(state.currentSpace.isOwner && score < 100);
  }
}

document.getElementById('auditSpaceBtn')?.addEventListener('click', () => {
  if (!state.currentSpace) return;
  runSpaceQualityAudit();
  document.getElementById('spaceAuditDialog')?.showModal();
});

// Staging vs. Published Live Code Diff Viewer
function openSpaceDiffViewer() {
  if (!state.currentSpace) return;
  const draft = state.workingFiles || state.currentSpace.draftFiles || {};
  const live = state.currentSpace.publishedFiles || {};
  const allFileNames = Array.from(new Set([...Object.keys(draft), ...Object.keys(live)]));
  const summaryEl = document.getElementById('spaceDiffSummaryText');
  const container = document.getElementById('spaceDiffContainer');
  if (!container) return;

  let changedCount = 0;
  const cardsHtml = allFileNames
    .map((fname) => {
      const dContent = draft[fname];
      const lContent = live[fname];
      if (dContent === lContent) {
        return `<div class="pat-key-item"><div><strong>${escapeHtml(fname)}</strong><div class="section-sub">Identical in Staging and Live</div></div><span class="badge-pill">Unchanged</span></div>`;
      }
      changedCount++;
      const statusLabel = lContent === undefined ? 'New in Staging' : dContent === undefined ? 'Deleted in Staging' : 'Modified';
      const dLines = String(dContent || '').split('\n');
      const lLines = String(lContent || '').split('\n');
      const maxLines = Math.min(40, Math.max(dLines.length, lLines.length));
      const diffRows = [];
      for (let i = 0; i < maxLines; i++) {
        if (dLines[i] !== lLines[i]) {
          if (lLines[i] !== undefined) {
            diffRows.push(`<div style="color:#f87171;background:rgba(248,113,113,0.08);padding:0.1rem 0.4rem;">- ${escapeHtml(lLines[i])}</div>`);
          }
          if (dLines[i] !== undefined) {
            diffRows.push(`<div style="color:#34d399;background:rgba(52,211,153,0.08);padding:0.1rem 0.4rem;">+ ${escapeHtml(dLines[i])}</div>`);
          }
        }
      }
      return `<div style="border:1px solid var(--border);border-radius:var(--radius-md);padding:0.75rem;background:var(--bg-elevated);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.45rem;">
          <strong>${escapeHtml(fname)}</strong>
          <span class="badge-pill">${statusLabel}</span>
        </div>
        <div style="font-family:var(--font-mono);font-size:0.74rem;max-height:140px;overflow-y:auto;border-radius:0.35rem;background:#09090b;padding:0.4rem;">
          ${diffRows.join('') || '<div style="color:#a1a1aa;">Whitespace or trailing changes</div>'}
        </div>
      </div>`;
    })
    .join('');

  if (summaryEl) {
    summaryEl.textContent =
      changedCount === 0
        ? 'Your staging workspace is 100% in sync with your published live Space.'
        : `${changedCount} file(s) have unpublished changes in staging compared to live.`;
  }
  container.innerHTML = cardsHtml;
  document.getElementById('spaceDiffDialog')?.showModal();
}

document.getElementById('diffSpaceBtn')?.addEventListener('click', openSpaceDiffViewer);

let visualEditEnabled = false;
document.getElementById('visualEditSpaceBtn')?.addEventListener('click', () => {
  if (!state.currentSpace || !state.currentSpace.isOwner) return;
  visualEditEnabled = !visualEditEnabled;
  const btn = document.getElementById('visualEditSpaceBtn');
  if (btn) {
    btn.textContent = visualEditEnabled ? '✓ Visual Edit On' : 'Visual Edit';
  }
  const iframe = document.getElementById('workspacePreviewFrame');
  iframe?.contentWindow?.postMessage(
    { type: 'sh_toggle_visual_edit', enabled: visualEditEnabled },
    '*'
  );
  showToast(
    visualEditEnabled
      ? 'Visual Edit enabled — click any heading or text in the preview to edit inline!'
      : 'Visual Edit disabled.'
  );
});

document.getElementById('autoFixAuditBtn')?.addEventListener('click', () => {
  if (!state.currentSpace || !state.currentSpace.isOwner) return;
  let html = state.workingFiles['index.html'] || '<!DOCTYPE html>\n<html lang="en">\n<head>\n</head>\n<body>\n</body>\n</html>';
  const safeTitle = escapeHtml(state.currentSpace.title || 'Space Web App');
  const safeDesc = escapeHtml(state.currentSpace.description || `${safeTitle} — Built on SpaceHub`);

  if (!/<head[\s>]/i.test(html)) {
    html = `<head>\n  <meta charset="UTF-8" />\n</head>\n` + html;
  }
  if (!/name=["']viewport["']/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (m) => `${m}\n  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />`);
  }
  if (!/name=["']description["']/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (m) => `${m}\n  <meta name="description" content="${safeDesc}" />`);
  }
  if (!/<title>[^<]+<\/title>/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (m) => `${m}\n  <title>${safeTitle}</title>`);
  }
  html = html.replace(/<img(?![^>]*\balt=)([^>]*)>/gi, '<img alt="App illustration"$1>');
  if (!/<main[\s>]|<h1[\s>]/i.test(html)) {
    if (html.includes('<body')) {
      html = html.replace(/<body[^>]*>/i, (m) => `${m}\n  <h1 style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">${safeTitle}</h1>`);
    } else {
      html = `<h1>${safeTitle}</h1>\n` + html;
    }
  }

  state.workingFiles['index.html'] = html;
  state.isDirty = true;
  if (state.activeFile === 'index.html') {
    document.getElementById('codeEditorTextarea').value = html;
  }
  document.getElementById('dirtyIndicator').textContent = '● Auto-fixed SEO & Accessibility (Unsaved)';
  updateLiveStagingPreview();
  runSpaceQualityAudit();
  showToast('Auto-fixed SEO, Mobile Viewport & Accessibility tags in index.html!');
});

// Responsive Viewport Switcher (Desktop / Tablet / Mobile Portrait / Mobile Landscape)
document.querySelectorAll('.vp-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const vp = btn.getAttribute('data-vp');
    document.querySelectorAll('.vp-btn').forEach((b) => b.classList.toggle('active', b === btn));
    const stage = document.getElementById('previewStage');
    stage.classList.remove('vp-tablet', 'vp-mobile', 'vp-mobile-landscape');
    if (vp === 'tablet') stage.classList.add('vp-tablet');
    if (vp === 'mobile') stage.classList.add('vp-mobile');
    if (vp === 'mobile-landscape') stage.classList.add('vp-mobile-landscape');
  });
});

// --- IN-STUDIO BYOA CODING AGENT SUBMISSION & IME-SAFE ENTER HANDLER ---

const agentPromptInput = document.getElementById('agentPromptInput');
const studioAgentForm = document.getElementById('studioAgentForm');

if (agentPromptInput && studioAgentForm) {
  agentPromptInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (event.isComposing || event.keyCode === 229) {
        return;
      }
      studioAgentForm.requestSubmit();
    }
  });

  document.querySelectorAll('.chip-btn[data-prompt]').forEach((chip) => {
    chip.addEventListener('click', () => {
      agentPromptInput.value = chip.getAttribute('data-prompt');
      studioAgentForm.requestSubmit();
    });
  });

  studioAgentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.currentSpace || !state.currentSpace.isOwner) return;
    const prompt = agentPromptInput.value.trim();
    if (!prompt) return;

    const runBtn = document.getElementById('runAgentBtn');
    const origText = runBtn.textContent;
    runBtn.disabled = true;
    runBtn.textContent = '🤖 Agent Building...';

    try {
      const { ownerUsername, slug } = state.currentSpace;
      const data = await apiFetch(`/api/spaces/${ownerUsername}/${slug}/agent-build`, {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          provider: state.agentConfig.provider,
          model: state.agentConfig.model,
          apiKey: state.agentConfig.apiKey,
          endpointUrl: state.agentConfig.endpointUrl,
          currentFiles: state.workingFiles
        })
      });

      state.currentSpace = data.space;
      state.workingFiles = JSON.parse(JSON.stringify(data.space.draftFiles));
      document.getElementById('codeEditorTextarea').value =
        state.workingFiles[state.activeFile] || '';
      document.getElementById('dirtyIndicator').textContent = '✓ Updated by Coding Agent (Staging)';

      const lastSummaryEl = document.getElementById('agentLastSummary');
      lastSummaryEl.textContent = `🤖 Agent Build Complete: ${data.summary}`;
      lastSummaryEl.hidden = false;

      updateStudioHeaderBadges(data.space);
      updateLiveStagingPreview();
      agentPromptInput.value = '';
      showToast('Coding Agent updated your staging files! Check the live preview.');
    } catch (err) {
      showToast(err.message);
    } finally {
      runBtn.disabled = false;
      runBtn.textContent = origText;
    }
  });
}

// Configure BYOA Agent Provider Dialog
function openAgentConfigModal() {
  const cfg = state.agentConfig;
  const radio = document.querySelector(`input[name="agentProvider"][value="${cfg.provider}"]`);
  if (radio) radio.checked = true;
  document.getElementById('agentModelInput').value = cfg.model || 'gemini-3.8-flash';
  document.getElementById('agentApiKeyInput').value = cfg.apiKey || '';
  document.getElementById('agentEndpointInput').value = cfg.endpointUrl || '';
  document.getElementById('agentConfigDialog').showModal();
}

document.getElementById('configureStudioAgentBtn')?.addEventListener('click', openAgentConfigModal);
document.getElementById('openAgentConfigDialogBtn')?.addEventListener('click', openAgentConfigModal);

document.getElementById('agentConfigForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const provider =
    form.querySelector('input[name="agentProvider"]:checked')?.value || 'builtin_agent';
  const model = document.getElementById('agentModelInput').value.trim() || 'gemini-3.8-flash';
  const apiKey = document.getElementById('agentApiKeyInput').value.trim();
  const endpointUrl = document.getElementById('agentEndpointInput').value.trim();

  state.agentConfig = { provider, model, apiKey, endpointUrl };
  localStorage.setItem('spacehub_agent_cfg', JSON.stringify(state.agentConfig));
  updateAgentProviderBadge();
  document.getElementById('agentConfigDialog').close();
  showToast('Coding Agent provider settings saved!');
});

// Save Staging Draft
document.getElementById('saveDraftBtn').addEventListener('click', async () => {
  if (!state.currentSpace || !state.currentSpace.isOwner) return;
  try {
    const { ownerUsername, slug } = state.currentSpace;
    const data = await apiFetch(`/api/spaces/${ownerUsername}/${slug}`, {
      method: 'PUT',
      body: JSON.stringify({ draftFiles: state.workingFiles })
    });
    state.currentSpace = data.space;
    state.isDirty = false;
    document.getElementById('dirtyIndicator').textContent = '✓ Staging draft saved';
    updateStudioHeaderBadges(data.space);
    showToast('Staging draft saved! Connect or buy hosting when ready to launch.');
  } catch (err) {
    showToast(err.message);
  }
});

// Save Named Checkpoint Snapshot
document.getElementById('saveSnapshotBtn')?.addEventListener('click', async () => {
  if (!state.currentSpace || !state.currentSpace.isOwner) return;
  const label = window.prompt('Checkpoint name (e.g. "v1 Ready", "Before Theme Update"):', 'Manual checkpoint');
  if (!label) return;
  try {
    const { ownerUsername, slug } = state.currentSpace;
    const data = await apiFetch(`/api/spaces/${ownerUsername}/${slug}/snapshot`, {
      method: 'POST',
      body: JSON.stringify({ label })
    });
    state.currentSpace = data.space;
    updateStudioHeaderBadges(data.space);
    showToast(data.message);
  } catch (err) {
    showToast(err.message);
  }
});

// Restore Specific Snapshot from History Dropdown
document.getElementById('snapshotRestoreSelect')?.addEventListener('change', async (e) => {
  const snapshotId = e.target.value;
  e.target.value = '';
  if (!snapshotId || !state.currentSpace || !state.currentSpace.isOwner) return;
  try {
    const { ownerUsername, slug } = state.currentSpace;
    const data = await apiFetch(`/api/spaces/${ownerUsername}/${slug}/rollback`, {
      method: 'POST',
      body: JSON.stringify({ snapshotId })
    });
    state.currentSpace = data.space;
    state.workingFiles = JSON.parse(JSON.stringify(data.space.draftFiles));
    state.isDirty = false;
    document.getElementById('codeEditorTextarea').value =
      state.workingFiles[state.activeFile] || '';
    document.getElementById('dirtyIndicator').textContent = '✓ Restored selected checkpoint';
    updateStudioHeaderBadges(data.space);
    updateLiveStagingPreview();
    showToast(data.message);
  } catch (err) {
    showToast(err.message);
  }
});

// 1-Click Rollback / Undo to Previous Snapshot
document.getElementById('rollbackDraftBtn')?.addEventListener('click', async () => {
  if (!state.currentSpace || !state.currentSpace.isOwner) return;
  try {
    const { ownerUsername, slug } = state.currentSpace;
    const data = await apiFetch(`/api/spaces/${ownerUsername}/${slug}/rollback`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    state.currentSpace = data.space;
    state.workingFiles = JSON.parse(JSON.stringify(data.space.draftFiles));
    state.isDirty = false;
    document.getElementById('codeEditorTextarea').value =
      state.workingFiles[state.activeFile] || '';
    document.getElementById('dirtyIndicator').textContent = '✓ Restored previous snapshot';
    updateStudioHeaderBadges(data.space);
    updateLiveStagingPreview();
    showToast(data.message);
  } catch (err) {
    showToast(err.message);
  }
});

// Fork / Clone Space from Studio
document.getElementById('forkSpaceBtn')?.addEventListener('click', async () => {
  if (!state.currentSpace) return;
  if (!state.user) {
    showToast('Sign in to clone this Space into your private staging workspace.');
    document.getElementById('signInDialog').showModal();
    return;
  }
  try {
    const { ownerUsername, slug } = state.currentSpace;
    const res = await apiFetch(`/api/spaces/${ownerUsername}/${slug}/fork`, { method: 'POST' });
    showToast(res.message);
    openSpaceStudio(res.space.ownerUsername, res.space.slug);
  } catch (err) {
    showToast(err.message);
  }
});

// Share Space Live Link
document.getElementById('shareSpaceBtn')?.addEventListener('click', async () => {
  if (!state.currentSpace) return;
  const shareUrl = `${window.location.origin}/live/${state.currentSpace.slug}`;
  if (navigator.share) {
    try {
      await navigator.share({
        title: `${state.currentSpace.title} — Hosted on SpaceHub`,
        text: state.currentSpace.description || 'Check out this web app on SpaceHub',
        url: shareUrl
      });
      return;
    } catch (_e) {
      // fallback to clipboard
    }
  }
  try {
    await navigator.clipboard.writeText(shareUrl);
    showToast(`Copied share link: ${shareUrl}`);
  } catch (_e) {
    showToast(`Share URL: ${shareUrl}`);
  }
});

// Open Export, Single-File HTML Download & Embed Dialog
document.getElementById('exportBundleBtn')?.addEventListener('click', () => {
  if (!state.currentSpace) return;
  const liveUrl = `${window.location.origin}/live/${state.currentSpace.slug}`;
  const snippetEl = document.getElementById('embedIframeSnippet');
  if (snippetEl) {
    snippetEl.textContent = `<iframe src="${liveUrl}" width="100%" height="600" style="border:1px solid #27272a;border-radius:12px;" loading="lazy" title="${state.currentSpace.title}"></iframe>`;
  }
  document.getElementById('exportEmbedDialog')?.showModal();
});

document.getElementById('downloadSingleHtmlBtn')?.addEventListener('click', () => {
  if (!state.currentSpace) return;
  const bundled = bundleClientPreview(state.workingFiles, false);
  const blob = new Blob([bundled], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.currentSpace.slug}.html`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Downloaded standalone ${state.currentSpace.slug}.html!`);
});

document.getElementById('downloadFullBundleBtn')?.addEventListener('click', async () => {
  if (!state.currentSpace) return;
  try {
    const { ownerUsername, slug } = state.currentSpace;
    const bundle = await apiFetch(`/api/spaces/${ownerUsername}/${slug}/export-bundle`);
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-hosting-bundle.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported ready-to-host PWA bundle!');
  } catch (err) {
    showToast(err.message);
  }
});

document.getElementById('copyEmbedSnippetBtn')?.addEventListener('click', async () => {
  const snippet = document.getElementById('embedIframeSnippet')?.textContent || '';
  if (!snippet) return;
  try {
    await navigator.clipboard.writeText(snippet);
    showToast('Copied <iframe> embed code to clipboard!');
  } catch (_e) {
    showToast('Copy the <iframe> snippet from the box.');
  }
});

// Open "Ready to Launch: Connect or Buy Hosting" Dialog
document.getElementById('launchSpaceBtn').addEventListener('click', async () => {
  if (!state.currentSpace || !state.currentSpace.isOwner) return;
  await loadHostingConnections();

  const select = document.getElementById('deployConnectionSelect');
  select.innerHTML =
    `<option value="">-- Or select a provider directly below --</option>` +
    state.hostingConnections
      .map(
        (c) =>
          `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)} (${escapeHtml(
            c.providerLabel
          )})</option>`
      )
      .join('');

  if (state.hostingConnections.length > 0) {
    select.value = state.hostingConnections[0].id;
  }

  document.getElementById('deployCustomUrlInput').value =
    state.currentSpace.externalHost?.liveUrl || '';
  document.getElementById('deployHostingDialog').showModal();
});

document.getElementById('goToBuyHostingFromModalBtn')?.addEventListener('click', () => {
  document.getElementById('deployHostingDialog').close();
  document.querySelectorAll('.nav-tab').forEach((b) => b.classList.remove('active'));
  document.getElementById('tabHosting').classList.add('active');
  switchMainSection('hostingHubView');
  loadHostingMarketplace();
});

// Confirm Deploy to Connected / Purchased Hosting Service
document.getElementById('deployHostingForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.currentSpace || !state.currentSpace.isOwner) return;

  const form = e.currentTarget;
  const connectionId = document.getElementById('deployConnectionSelect').value;
  const provider = form.querySelector('input[name="provider"]:checked')?.value || 'vercel';
  const customLiveUrl = document.getElementById('deployCustomUrlInput').value.trim();
  const webhookUrl = document.getElementById('deployWebhookUrlInput').value.trim();

  try {
    const { ownerUsername, slug } = state.currentSpace;
    const data = await apiFetch(`/api/spaces/${ownerUsername}/${slug}/deploy-external`, {
      method: 'POST',
      body: JSON.stringify({
        connectionId,
        provider,
        customLiveUrl,
        webhookUrl,
        draftFiles: state.workingFiles
      })
    });
    state.currentSpace = data.space;
    state.isDirty = false;
    document.getElementById('dirtyIndicator').textContent = `✓ Deployed to ${data.externalHost.providerLabel}`;
    document.getElementById('deployHostingDialog').close();
    updateStudioHeaderBadges(data.space);
    refreshStats();
    showToast(`🚀 ${data.message}`);
  } catch (err) {
    showToast(err.message);
  }
});

// One-click Privacy Toggle in Studio Header
document.getElementById('quickPrivacyToggleBtn').addEventListener('click', async () => {
  if (!state.currentSpace || !state.currentSpace.isOwner) return;
  const nextVis = state.currentSpace.visibility === 'private' ? 'public' : 'private';
  try {
    const { ownerUsername, slug } = state.currentSpace;
    const data = await apiFetch(`/api/spaces/${ownerUsername}/${slug}`, {
      method: 'PUT',
      body: JSON.stringify({ visibility: nextVis })
    });
    state.currentSpace = data.space;
    document.getElementById('visPublic').checked = nextVis === 'public';
    document.getElementById('visPrivate').checked = nextVis === 'private';
    updateStudioHeaderBadges(data.space);
    refreshStats();
    showToast(
      nextVis === 'private'
        ? '🔒 Space is now Private and hidden from everyone else.'
        : '🌍 Space is now Public!'
    );
  } catch (err) {
    showToast(err.message);
  }
});

// Like button
document.getElementById('likeSpaceBtn').addEventListener('click', async () => {
  if (!state.currentSpace) return;
  if (!state.user) {
    document.getElementById('signInDialog').showModal();
    return;
  }
  try {
    const { ownerUsername, slug } = state.currentSpace;
    const data = await apiFetch(`/api/spaces/${ownerUsername}/${slug}/like`, { method: 'POST' });
    state.currentSpace.likes = data.likes;
    document.getElementById('likeCountText').textContent = data.likes;
  } catch (err) {
    showToast(err.message);
  }
});

// Studio mode tabs
document.getElementById('studioTabWorkspace').addEventListener('click', () => setStudioTab('workspace'));
document.getElementById('studioTabApp').addEventListener('click', () => setStudioTab('app'));
document.getElementById('studioTabSubmissions')?.addEventListener('click', () => setStudioTab('submissions'));
document.getElementById('studioTabSettings').addEventListener('click', () => setStudioTab('settings'));

// Built-in Form & Waitlist Submissions Inbox
let currentSpaceSubmissions = [];

async function loadSpaceSubmissions() {
  if (!state.currentSpace || !state.currentSpace.isOwner) return;
  const container = document.getElementById('submissionsListContainer');
  if (!container) return;
  try {
    const { ownerUsername, slug } = state.currentSpace;
    const data = await apiFetch(`/api/spaces/${ownerUsername}/${slug}/submissions`);
    currentSpaceSubmissions = data.submissions || [];
    state.currentSpace.submissionCount = currentSpaceSubmissions.length;
    const badge = document.getElementById('submissionsCountBadge');
    if (badge) badge.textContent = String(currentSpaceSubmissions.length);

    if (!currentSpaceSubmissions.length) {
      container.innerHTML = `<p class="section-sub">No submissions yet. Click "+ Send Test Lead" above or submit a form from your live Space.</p>`;
      return;
    }

    container.innerHTML = currentSpaceSubmissions
      .map(
        (sub) => `
      <div class="pat-key-item">
        <div>
          <strong>${escapeHtml(sub.name || 'Anonymous Visitor')}</strong>
          ${sub.email ? `· <code>${escapeHtml(sub.email)}</code>` : ''}
          <div class="section-sub">${escapeHtml(sub.message || JSON.stringify(sub.fields || {}))} · ${new Date(
          sub.createdAt
        ).toLocaleString()}</div>
        </div>
        <button type="button" class="btn btn-ghost btn-xs" data-del-submission="${escapeHtml(sub.id)}">Delete</button>
      </div>
    `
      )
      .join('');

    container.querySelectorAll('[data-del-submission]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-del-submission');
        await apiFetch(
          `/api/spaces/${state.currentSpace.ownerUsername}/${state.currentSpace.slug}/submissions?id=${encodeURIComponent(id)}`,
          { method: 'DELETE' }
        );
        loadSpaceSubmissions();
      });
    });
  } catch (err) {
    container.innerHTML = `<p class="section-sub">${escapeHtml(err.message)}</p>`;
  }
}

document.getElementById('sendTestSubmissionBtn')?.addEventListener('click', async () => {
  if (!state.currentSpace) return;
  try {
    await apiFetch(`/live/${state.currentSpace.slug}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Alex Rivera (Test Lead)',
        email: 'alex@example.com',
        message: 'Excited for early access!'
      })
    });
    showToast('Test lead submitted to your Space Inbox!');
    loadSpaceSubmissions();
  } catch (err) {
    showToast(err.message);
  }
});

document.getElementById('exportSubmissionsCsvBtn')?.addEventListener('click', () => {
  if (!currentSpaceSubmissions.length) {
    showToast('No submissions to export yet.');
    return;
  }
  const rows = [
    ['ID', 'Name', 'Email', 'Message', 'Created At'],
    ...currentSpaceSubmissions.map((s) => [
      s.id,
      s.name || '',
      s.email || '',
      (s.message || '').replace(/\r?\n/g, ' '),
      s.createdAt
    ])
  ];
  const csv = rows
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.currentSpace?.slug || 'space'}-submissions.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exported submissions as CSV!');
});

document.getElementById('clearSubmissionsBtn')?.addEventListener('click', async () => {
  if (!state.currentSpace || !state.currentSpace.isOwner) return;
  try {
    const { ownerUsername, slug } = state.currentSpace;
    await apiFetch(`/api/spaces/${ownerUsername}/${slug}/submissions`, { method: 'DELETE' });
    showToast('Cleared Submissions Inbox.');
    loadSpaceSubmissions();
  } catch (err) {
    showToast(err.message);
  }
});

// Visual Cloud JSON Database (/live/:slug/storage) Inspector & Editor
async function loadSpaceCloudStorage() {
  if (!state.currentSpace) return;
  const textarea = document.getElementById('cloudStorageTextarea');
  if (!textarea) return;
  try {
    const data = await apiFetch(`/live/${state.currentSpace.slug}/storage`);
    textarea.value = JSON.stringify(data.data || {}, null, 2);
  } catch (err) {
    textarea.value = `{\n  "error": ${JSON.stringify(err.message)}\n}`;
  }
}

document.getElementById('refreshCloudStorageBtn')?.addEventListener('click', () => {
  loadSpaceCloudStorage();
  showToast('Refreshed Cloud JSON Storage.');
});

document.getElementById('saveCloudStorageBtn')?.addEventListener('click', async () => {
  if (!state.currentSpace || !state.currentSpace.isOwner) return;
  const textarea = document.getElementById('cloudStorageTextarea');
  if (!textarea) return;
  let parsed;
  try {
    parsed = JSON.parse(textarea.value || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Root must be a JSON object {...}');
    }
  } catch (err) {
    showToast(`Invalid JSON: ${err.message}`);
    return;
  }
  try {
    const { ownerUsername, slug } = state.currentSpace;
    await apiFetch(`/api/spaces/${ownerUsername}/${slug}`, {
      method: 'PUT',
      body: JSON.stringify({ appStorage: parsed })
    });
    await loadSpaceCloudStorage();
    showToast('Saved Cloud JSON Database!');
  } catch (err) {
    showToast(err.message);
  }
});

document.getElementById('clearCloudStorageBtn')?.addEventListener('click', async () => {
  if (!state.currentSpace || !state.currentSpace.isOwner) return;
  try {
    await apiFetch(`/live/${state.currentSpace.slug}/storage`, { method: 'DELETE' });
    await loadSpaceCloudStorage();
    showToast('Cleared Cloud JSON Database.');
  } catch (err) {
    showToast(err.message);
  }
});

document.getElementById('copyClientPreviewBtn')?.addEventListener('click', async () => {
  if (!state.currentSpace) return;
  const code = document.getElementById('settingsPasscodeInput')?.value.trim() || '';
  if (!code) {
    showToast('Enter a passcode first and click Save Changes to enable client preview links.');
    return;
  }
  const clientUrl = `${window.location.origin}/live/${state.currentSpace.slug}?mode=draft&key=${encodeURIComponent(code)}`;
  try {
    await navigator.clipboard.writeText(clientUrl);
    showToast(`Copied client preview link: ${clientUrl}`);
  } catch (_e) {
    showToast(clientUrl);
  }
});

// Save Settings Form
document.getElementById('spaceSettingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.currentSpace || !state.currentSpace.isOwner) return;
  const title = document.getElementById('settingsTitleInput').value.trim();
  const description = document.getElementById('settingsDescInput').value.trim();
  const visibility = document.getElementById('visPrivate').checked ? 'private' : 'public';
  const appPlatform =
    document.querySelector('input[name="settingsAppPlatform"]:checked')?.value || 'both';
  const appOrientation = document.getElementById('settingsOrientationSelect')?.value || 'any';
  const appIconText = document.getElementById('settingsIconTextInput')?.value.trim() || '';
  const appThemeColor = document.getElementById('settingsThemeColorSelect')?.value || '#09090b';
  const previewPasscode = document.getElementById('settingsPasscodeInput')?.value.trim() || '';
  const secrets = document.getElementById('settingsSecretsInput')?.value || '';
  const customDomain = document.getElementById('settingsCustomDomainInput')?.value.trim() || '';
  const submissionWebhookUrl = document.getElementById('settingsWebhookUrlInput')?.value.trim() || '';
  const collaborators = document.getElementById('settingsCollaboratorsInput')?.value.trim() || '';
  const cronSchedule = document.getElementById('settingsCronScheduleSelect')?.value || '';
  const cronWebhookUrl = document.getElementById('settingsCronUrlInput')?.value.trim() || '';
  const maintenanceMode = Boolean(document.getElementById('settingsMaintenanceCheckbox')?.checked);

  try {
    const { ownerUsername, slug } = state.currentSpace;
    const data = await apiFetch(`/api/spaces/${ownerUsername}/${slug}`, {
      method: 'PUT',
      body: JSON.stringify({
        title,
        description,
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
        secrets
      })
    });
    state.currentSpace = data.space;
    state.workingFiles['README.md'] = data.space.draftFiles['README.md'];
    if (state.activeFile === 'README.md') {
      document.getElementById('codeEditorTextarea').value = state.workingFiles['README.md'];
    }
    updateStudioHeaderBadges(data.space);
    showToast('Space settings, platform target & orientation updated.');
  } catch (err) {
    showToast(err.message);
  }
});

document.getElementById('runCronNowBtn')?.addEventListener('click', async () => {
  if (!state.currentSpace || !state.currentSpace.isOwner) return;
  try {
    const { ownerUsername, slug } = state.currentSpace;
    const webhookUrl = document.getElementById('settingsCronUrlInput')?.value.trim() || '';
    const data = await apiFetch(`/api/spaces/${ownerUsername}/${slug}/cron`, {
      method: 'POST',
      body: JSON.stringify({ webhookUrl })
    });
    state.currentSpace = data.space;
    const cronStatusEl = document.getElementById('cronLastRunStatus');
    if (cronStatusEl && data.cronLastRunAt) {
      cronStatusEl.textContent = `Last cron run: ${new Date(data.cronLastRunAt).toLocaleString()} (${data.cronLastStatus || 'ok'})`;
    }
    showToast(`Cron task executed (${data.cronLastStatus})!`);
  } catch (err) {
    showToast(err.message);
  }
});

// Full Space State Backup & Restore
document.getElementById('downloadSpaceBackupBtn')?.addEventListener('click', async () => {
  if (!state.currentSpace || !state.currentSpace.isOwner) return;
  try {
    const { ownerUsername, slug } = state.currentSpace;
    const data = await apiFetch(`/api/spaces/${ownerUsername}/${slug}/backup`);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${slug}.spacehub.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast(`Downloaded ${slug}.spacehub.json backup!`);
  } catch (err) {
    showToast(err.message);
  }
});

document.getElementById('restoreSpaceBackupBtn')?.addEventListener('click', () => {
  document.getElementById('restoreBackupFileInput')?.click();
});

document.getElementById('restoreBackupFileInput')?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file || !state.currentSpace || !state.currentSpace.isOwner) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const { ownerUsername, slug } = state.currentSpace;
    const res = await apiFetch(`/api/spaces/${ownerUsername}/${slug}/restore`, {
      method: 'POST',
      body: JSON.stringify({ backup: parsed })
    });
    showToast(res.message || 'Backup restored!');
    await openSpaceStudio(ownerUsername, slug);
  } catch (err) {
    showToast(`Restore failed: ${err.message}`);
  }
});

// In-Studio API Playground & Endpoint Tester
function getApiTesterEndpoints() {
  const slug = state.currentSpace?.slug || 'your-space';
  const base = `/live/${slug}`;
  return [
    { label: 'GET /health', path: `${base}/health`, method: 'GET', body: '' },
    { label: 'GET /storage', path: `${base}/storage`, method: 'GET', body: '' },
    { label: 'POST /storage', path: `${base}/storage`, method: 'POST', body: '{"hello":"world"}' },
    { label: 'GET /db/items', path: `${base}/db/items`, method: 'GET', body: '' },
    { label: 'POST /db/items', path: `${base}/db/items`, method: 'POST', body: '{"title":"First row","status":"active"}' },
    { label: 'POST /ai', path: `${base}/ai`, method: 'POST', body: '{"prompt":"Say hello"}' },
    { label: 'POST /fn?action=ping', path: `${base}/fn?action=ping`, method: 'POST', body: '{}' },
    { label: 'POST /events', path: `${base}/events`, method: 'POST', body: '{"event":"button_clicked"}' },
    { label: 'GET /events', path: `${base}/events`, method: 'GET', body: '' },
    { label: 'POST /notify', path: `${base}/notify`, method: 'POST', body: '{"to":"you@example.com","subject":"Hi","message":"Test"}' },
    { label: 'POST /orders', path: `${base}/orders`, method: 'POST', body: '{"items":[{"name":"Pro Plan","priceUsd":10,"qty":1}]}' },
    { label: 'GET /search?q=', path: `${base}/search?q=hello`, method: 'GET', body: '' },
    { label: 'GET /config.json', path: `${base}/config.json`, method: 'GET', body: '' },
    { label: 'GET /feed.json', path: `${base}/feed.json`, method: 'GET', body: '' },
    { label: 'GET /sitemap.xml', path: `${base}/sitemap.xml`, method: 'GET', body: '' }
  ];
}

function openApiTester() {
  if (!state.currentSpace) return;
  const select = document.getElementById('apiTesterEndpointSelect');
  if (!select) return;
  const endpoints = getApiTesterEndpoints();
  select.innerHTML = endpoints
    .map((ep, i) => `<option value="${i}">${escapeHtml(ep.label)}</option>`)
    .join('');
  const applyPreset = () => {
    const ep = endpoints[Number(select.value)] || endpoints[0];
    document.getElementById('apiTesterMethodSelect').value = ep.method;
    document.getElementById('apiTesterBodyInput').value = ep.body || '{}';
  };
  select.onchange = applyPreset;
  applyPreset();
  document.getElementById('apiTesterResponse').textContent = 'Response will appear here.';
  document.getElementById('apiTesterStatus').textContent = '';
  document.getElementById('apiTesterDialog')?.showModal();
}

document.getElementById('apiTesterBtn')?.addEventListener('click', openApiTester);

document.getElementById('apiTesterSendBtn')?.addEventListener('click', async () => {
  if (!state.currentSpace) return;
  const endpoints = getApiTesterEndpoints();
  const ep = endpoints[Number(document.getElementById('apiTesterEndpointSelect').value)] || endpoints[0];
  const method = document.getElementById('apiTesterMethodSelect').value;
  const bodyText = document.getElementById('apiTesterBodyInput').value.trim();
  const statusEl = document.getElementById('apiTesterStatus');
  const outEl = document.getElementById('apiTesterResponse');
  const options = { method, headers: {} };
  if (state.token) options.headers.Authorization = `Bearer ${state.token}`;
  if (method !== 'GET' && method !== 'DELETE' && bodyText) {
    try {
      JSON.parse(bodyText);
    } catch (err) {
      statusEl.textContent = 'Invalid JSON body';
      outEl.textContent = String(err.message);
      return;
    }
    options.headers['Content-Type'] = 'application/json';
    options.body = bodyText;
  }
  statusEl.textContent = 'Sending...';
  const startedAt = performance.now();
  try {
    const res = await fetch(ep.path, options);
    const text = await res.text();
    let pretty = text;
    try {
      pretty = JSON.stringify(JSON.parse(text), null, 2);
    } catch (_e) {
      // not JSON
    }
    const remaining = res.headers.get('X-RateLimit-Remaining');
    statusEl.textContent = `${res.status} ${res.statusText || ''} · ${Math.round(performance.now() - startedAt)} ms${remaining ? ` · rate-limit remaining ${remaining}` : ''}`;
    outEl.textContent = pretty.slice(0, 8000) || '(empty response)';
  } catch (err) {
    statusEl.textContent = 'Request failed';
    outEl.textContent = String(err.message);
  }
});

// In-Studio Command Palette (Ctrl+K / ⌘K)
function getAvailablePaletteCommands() {
  const cmds = [
    {
      label: 'Explore Public Spaces',
      category: 'Navigation',
      run: () => document.getElementById('tabExplore')?.click()
    },
    {
      label: 'Create a New Space',
      category: 'Action',
      run: () => document.getElementById('newSpaceBtn')?.click()
    },
    {
      label: 'Pricing & $1/mo Hosting Slots',
      category: 'Navigation',
      run: () => document.getElementById('tabHosting')?.click()
    },
    {
      label: 'Coding Agent API & Personal Access Tokens',
      category: 'Navigation',
      run: () => document.getElementById('tabAgents')?.click()
    }
  ];

  if (state.currentSpace) {
    Object.keys(state.workingFiles || {}).forEach((fname) => {
      cmds.push({
        label: `Open File: ${fname}`,
        category: `Workspace (${state.currentSpace.slug})`,
        run: () => {
          setStudioTab('workspace');
          state.activeFile = fname;
          renderFileTabs();
          document.getElementById('codeEditorTextarea').value = state.workingFiles[fname] || '';
        }
      });
    });
    cmds.push(
      {
        label: 'Run SEO, Mobile & Accessibility Audit',
        category: `Studio (${state.currentSpace.slug})`,
        run: () => document.getElementById('auditSpaceBtn')?.click()
      },
      {
        label: 'Inspect Staging vs. Live Code Diff',
        category: `Studio (${state.currentSpace.slug})`,
        run: () => document.getElementById('diffSpaceBtn')?.click()
      },
      {
        label: 'Open API Playground & Endpoint Tester',
        category: `Studio (${state.currentSpace.slug})`,
        run: () => document.getElementById('apiTesterBtn')?.click()
      },
      {
        label: 'Toggle Visual Inline Text Editor',
        category: `Studio (${state.currentSpace.slug})`,
        run: () => document.getElementById('visualEditSpaceBtn')?.click()
      },
      {
        label: 'Open Space Settings',
        category: `Studio (${state.currentSpace.slug})`,
        run: () => setStudioTab('settings')
      }
    );
  }

  (state.spaces || []).slice(0, 12).forEach((s) => {
    cmds.push({
      label: `Jump to Space: ${s.title} (@${s.ownerUsername}/${s.slug})`,
      category: 'Spaces',
      run: () => openSpaceStudio(s.ownerUsername, s.slug)
    });
  });

  return cmds;
}

function renderCommandPalette(filterText = '') {
  const listEl = document.getElementById('commandPaletteList');
  if (!listEl) return;
  const q = String(filterText || '').trim().toLowerCase();
  const commands = getAvailablePaletteCommands().filter(
    (c) => !q || c.label.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
  );
  if (!commands.length) {
    listEl.innerHTML = `<div class="section-sub" style="padding:0.5rem;">No matching commands found.</div>`;
    return;
  }
  listEl.innerHTML = commands
    .map(
      (c, idx) => `
    <div class="pat-key-item" style="cursor:pointer;" data-cmd-idx="${idx}">
      <div>
        <strong>${escapeHtml(c.label)}</strong>
        <div class="section-sub">${escapeHtml(c.category)}</div>
      </div>
      <span class="badge-pill">Run ↵</span>
    </div>
  `
    )
    .join('');

  listEl.querySelectorAll('[data-cmd-idx]').forEach((item) => {
    item.addEventListener('click', () => {
      const idx = Number(item.getAttribute('data-cmd-idx'));
      const chosen = commands[idx];
      document.getElementById('commandPaletteDialog')?.close();
      if (chosen) chosen.run();
    });
  });
}

function openCommandPalette() {
  const dlg = document.getElementById('commandPaletteDialog');
  const input = document.getElementById('commandPaletteInput');
  if (!dlg) return;
  if (input) input.value = '';
  renderCommandPalette('');
  dlg.showModal();
  input?.focus();
}

document.getElementById('openCommandPaletteBtn')?.addEventListener('click', openCommandPalette);
document.getElementById('commandPaletteInput')?.addEventListener('input', (e) => {
  renderCommandPalette(e.target.value);
});
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openCommandPalette();
  }
});

// Delete Space
document.getElementById('deleteSpaceBtn').addEventListener('click', async () => {
  if (!state.currentSpace || !state.currentSpace.isOwner) return;
  try {
    const { ownerUsername, slug } = state.currentSpace;
    await apiFetch(`/api/spaces/${ownerUsername}/${slug}`, { method: 'DELETE' });
    state.currentSpace = null;
    switchMainSection('hubView');
    loadSpacesList();
    showToast('Space deleted.');
  } catch (err) {
    showToast(err.message);
  }
});

// --- 4. BUY & CONNECT HOSTING SERVICES MARKETPLACE ---

async function loadHostingConnections() {
  const container = document.getElementById('hostingConnectionsList');
  if (!state.user) {
    state.hostingConnections = [];
    if (container) {
      container.innerHTML = `<p class="section-sub">Sign in to buy a hosting plan or connect your Vercel, Netlify, GitHub Pages, or custom hosting account.</p>`;
    }
    return;
  }

  try {
    const data = await apiFetch('/api/hosting-connections');
    state.hostingConnections = data.connections || [];
    if (!container) return;

    if (!state.hostingConnections.length) {
      container.innerHTML = `<p class="section-sub">No hosting services connected yet. Buy a plan above or connect an existing host on the left.</p>`;
      return;
    }

    container.innerHTML = state.hostingConnections
      .map(
        (c) => `
      <div class="pat-key-item">
        <div>
          <strong>${escapeHtml(c.name)}</strong>
          <div class="section-sub">${escapeHtml(c.providerLabel)} · Target: <code>${escapeHtml(
          c.targetUrlOrProject || 'auto'
        )}</code></div>
        </div>
        <button type="button" class="btn btn-danger btn-xs" data-remove-host="${escapeHtml(
          c.id
        )}">Remove</button>
      </div>
    `
      )
      .join('');

    container.querySelectorAll('[data-remove-host]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await apiFetch(`/api/hosting-connections/${btn.getAttribute('data-remove-host')}`, {
            method: 'DELETE'
          });
          loadHostingConnections();
          showToast('Hosting service disconnected.');
        } catch (err) {
          showToast(err.message);
        }
      });
    });
  } catch (err) {
    if (container) container.innerHTML = `<p class="section-sub">${escapeHtml(err.message)}</p>`;
  }
}

async function loadHostingMarketplace() {
  const plansGrid = document.getElementById('hostingPlansGrid');
  try {
    state.paypalApi = await apiFetch('/api/paypal/config').catch(() => ({ configured: false }));
    const data = await apiFetch('/api/hosting-plans');
    state.hostingPlans = data.plans || [];
    if (plansGrid) {
      plansGrid.innerHTML = state.hostingPlans
        .map(
          (p) => `
        <article class="plan-card">
          <div>
            <span class="eyebrow">${escapeHtml(p.providerLabel)}</span>
            <h3>${escapeHtml(p.name)}</h3>
            <div class="plan-price">${escapeHtml(p.priceLabel)}</div>
            <ul class="plan-features">
              ${p.features.map((f) => `<li>✓ ${escapeHtml(f)}</li>`).join('')}
            </ul>
          </div>
          <button type="button" class="btn btn-primary btn-sm" data-buy-plan="${escapeHtml(p.id)}">
            Activate Plan (${escapeHtml(p.priceLabel)})
          </button>
        </article>
      `
        )
        .join('');

      plansGrid.querySelectorAll('[data-buy-plan]').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (!state.user) {
            showToast('Please sign in to activate a hosting plan.');
            document.getElementById('signInDialog').showModal();
            return;
          }
          const planId = btn.getAttribute('data-buy-plan');
          const plan = state.hostingPlans.find((p) => p.id === planId) || state.hostingPlans[0];
          if (!plan) return;

          document.getElementById('checkoutPlanIdInput').value = plan.id;
          document.getElementById('paypalCheckoutSummary').innerHTML = `Selected Plan: <strong>${escapeHtml(
            plan.name
          )} (${escapeHtml(plan.priceLabel)})</strong>`;

          const cardBtn = document.getElementById('payByCardLinkBtn');
          const paypalBtn = document.getElementById('payByPayPalLinkBtn');
          if (cardBtn && plan.checkoutUrls?.card) {
            cardBtn.href = plan.checkoutUrls.card;
            cardBtn.textContent = `Pay ${plan.priceLabel} with Debit / Credit Card, Apple Pay or Google Pay ↗`;
          }
          if (paypalBtn && plan.checkoutUrls?.paypal) {
            paypalBtn.href = plan.checkoutUrls.paypal;
            paypalBtn.textContent = `Pay ${plan.priceLabel} with PayPal / Venmo / Pay Later ↗`;
          }

          const apiOn = Boolean(state.paypalApi?.configured);
          document.getElementById('paypalApiCheckoutBlock').hidden = !apiOn;
          document.getElementById('legacyPayCard').hidden = apiOn;
          document.getElementById('legacyRefField').hidden = apiOn;
          document.getElementById('legacyActivateBtn').hidden = apiOn;

          document.getElementById('paypalCheckoutDialog').showModal();
        });
      });
    }
  } catch (_err) {
    // ignore
  }
  await loadHostingConnections();
}

document.getElementById('payWithPayPalApiBtn')?.addEventListener('click', async () => {
  if (!state.user) return;
  const btn = document.getElementById('payWithPayPalApiBtn');
  const planId = document.getElementById('checkoutPlanIdInput').value;
  const spaceSlug = state.currentSpace?.slug || '';
  btn.disabled = true;
  btn.textContent = 'Contacting PayPal...';
  try {
    const res = await apiFetch('/api/paypal/create-order', {
      method: 'POST',
      body: JSON.stringify({ planId, spaceSlug })
    });
    if (!res.approveUrl) throw new Error('PayPal did not return a checkout link.');
    window.location.assign(res.approveUrl);
  } catch (err) {
    showToast(err.message);
    btn.disabled = false;
    btn.textContent = 'Pay securely with PayPal ↗';
  }
});

document.getElementById('paypalCheckoutForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.user) return;
  const planId = document.getElementById('checkoutPlanIdInput').value;
  const customDomain = document.getElementById('purchaseCustomDomainInput')?.value.trim() || '';
  const paymentRef = document.getElementById('checkoutRefInput')?.value.trim() || 'paypal_checkout';
  const spaceSlug = state.currentSpace?.slug || '';
  try {
    const res = await apiFetch('/api/hosting-plans/purchase', {
      method: 'POST',
      body: JSON.stringify({
        planId,
        customDomain,
        spaceSlug,
        paymentMethod: 'paypal_all_methods',
        paymentRef
      })
    });
    document.getElementById('paypalCheckoutDialog').close();
    await loadHostingConnections();
    showToast(res.message);
  } catch (err) {
    showToast(err.message);
  }
});

document.getElementById('connectHostingForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.user) {
    document.getElementById('signInDialog').showModal();
    return;
  }
  const provider = document.getElementById('connProviderSelect').value;
  const name = document.getElementById('connNameInput').value.trim();
  const targetUrlOrProject = document.getElementById('connTargetInput').value.trim();
  const apiToken = document.getElementById('connTokenInput').value.trim();
  const webhookUrl = document.getElementById('connWebhookInput').value.trim();

  try {
    await apiFetch('/api/hosting-connections', {
      method: 'POST',
      body: JSON.stringify({ provider, name, targetUrlOrProject, apiToken, webhookUrl })
    });
    e.target.reset();
    await loadHostingConnections();
    showToast('Hosting service connected! You can now deploy Spaces to it.');
  } catch (err) {
    showToast(err.message);
  }
});

// --- 5. AGENT API KEYS (sh_pat_...) MANAGEMENT ---

async function loadAgentKeys() {
  const container = document.getElementById('patKeysList');
  if (!container) return;
  if (!state.user) {
    container.innerHTML = `<p class="section-sub">Sign in to generate and manage your Personal Access Tokens (<code>sh_pat_...</code>) for external coding agents.</p>`;
    return;
  }

  try {
    const data = await apiFetch('/api/agent-keys');
    const keys = data.keys || [];
    if (!keys.length) {
      container.innerHTML = `<p class="section-sub">No active Agent API keys yet. Generate one above.</p>`;
      return;
    }
    container.innerHTML = keys
      .map(
        (k) => `
      <div class="pat-key-item">
        <div>
          <strong>${escapeHtml(k.name)}</strong>
          <div><code class="pat-key-token">${escapeHtml(k.token)}</code></div>
        </div>
        <button type="button" class="btn btn-danger btn-xs" data-revoke-key="${escapeHtml(k.id)}">Revoke</button>
      </div>
    `
      )
      .join('');

    container.querySelectorAll('[data-revoke-key]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await apiFetch(`/api/agent-keys/${btn.getAttribute('data-revoke-key')}`, {
            method: 'DELETE'
          });
          loadAgentKeys();
          showToast('Agent API key revoked.');
        } catch (err) {
          showToast(err.message);
        }
      });
    });
  } catch (err) {
    container.innerHTML = `<p class="section-sub">${escapeHtml(err.message)}</p>`;
  }
}

document.getElementById('createPatForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.user) {
    document.getElementById('signInDialog').showModal();
    return;
  }
  const input = document.getElementById('patNameInput');
  const name = input.value.trim();
  if (!name) return;
  try {
    await apiFetch('/api/agent-keys', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
    input.value = '';
    loadAgentKeys();
    showToast('New Agent API Key (sh_pat_...) generated!');
  } catch (err) {
    showToast(err.message);
  }
});

// --- 6. TOP NAVIGATION, SEARCH & DIALOG FORMS ---

function setTopNavFilter(filterName) {
  state.filter = filterName;
  document.querySelectorAll('.nav-tab[data-filter]').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-filter') === filterName);
  });
  document.getElementById('tabHosting').classList.remove('active');
  document.getElementById('tabArchitecture').classList.remove('active');
  document.getElementById('tabAgents').classList.remove('active');
  switchMainSection('hubView');
  loadSpacesList();
}

document.querySelectorAll('.nav-tab[data-filter]').forEach((btn) => {
  btn.addEventListener('click', () => {
    setTopNavFilter(btn.getAttribute('data-filter'));
  });
});

document.getElementById('tabHosting').addEventListener('click', () => {
  document.querySelectorAll('.nav-tab').forEach((b) => b.classList.remove('active'));
  document.getElementById('tabHosting').classList.add('active');
  switchMainSection('hostingHubView');
  loadHostingMarketplace();
});

document.getElementById('tabAgents').addEventListener('click', () => {
  document.querySelectorAll('.nav-tab').forEach((b) => b.classList.remove('active'));
  document.getElementById('tabAgents').classList.add('active');
  switchMainSection('agentApiView');
  loadAgentKeys();
});

document.getElementById('tabArchitecture').addEventListener('click', () => {
  document.querySelectorAll('.nav-tab').forEach((b) => b.classList.remove('active'));
  document.getElementById('tabArchitecture').classList.add('active');
  switchMainSection('archView');
});

document.getElementById('navHomeBtn').addEventListener('click', (e) => {
  e.preventDefault();
  setTopNavFilter('public');
});

document.getElementById('backToHubBtn').addEventListener('click', () => {
  switchMainSection('hubView');
  loadSpacesList();
});

document.getElementById('searchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  state.searchQuery = document.getElementById('searchInput').value.trim();
  loadSpacesList();
});

document.getElementById('searchInput').addEventListener('input', (e) => {
  if (e.target.value === '' && state.searchQuery !== '') {
    state.searchQuery = '';
    loadSpacesList();
  }
});

// Open Dialogs
document.getElementById('newSpaceBtn').addEventListener('click', () => {
  if (!state.user) {
    showToast('Sign in or create an account to create your own Space.');
    document.getElementById('signInDialog').showModal();
    return;
  }
  document.getElementById('createSpaceDialog').showModal();
});

document.getElementById('openSignInBtn').addEventListener('click', () => {
  document.getElementById('signInServerError').hidden = true;
  document.getElementById('signInDialog').showModal();
});

document.getElementById('openSignUpBtn').addEventListener('click', () => {
  document.getElementById('signUpServerError').hidden = true;
  document.getElementById('signUpDialog').showModal();
});

// Social Account Sign-In (Google / Gmail, GitHub, Apple)
document.querySelectorAll('.social-auth-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const provider = btn.getAttribute('data-social-provider') || 'google';
    document.getElementById('signInDialog')?.close();
    document.getElementById('signUpDialog')?.close();

    const titleEl = document.getElementById('socialAuthDialogTitle');
    const leadEl = document.getElementById('socialAuthDialogLead');
    const provInput = document.getElementById('socialProviderInput');
    const emailLabel = document.getElementById('socialEmailLabel');
    const emailInput = document.getElementById('socialEmailInput');
    const ghTokenField = document.getElementById('socialGithubTokenField');
    const submitBtn = document.getElementById('socialAuthSubmitBtn');
    const errBox = document.getElementById('socialAuthServerError');

    if (errBox) errBox.hidden = true;
    if (provInput) provInput.value = provider;

    if (provider === 'github') {
      if (titleEl) titleEl.textContent = 'Continue with GitHub';
      if (leadEl) {
        leadEl.textContent =
          'Enter your GitHub username or email (or paste a GitHub token to auto-connect GitHub Pages hosting).';
      }
      if (emailLabel) emailLabel.innerHTML = 'GitHub Username or Email <span aria-hidden="true">*</span>';
      if (emailInput) emailInput.placeholder = 'octocat or octocat@github.com';
      if (ghTokenField) ghTokenField.hidden = false;
      if (submitBtn) submitBtn.textContent = 'Continue with GitHub';
    } else if (provider === 'apple') {
      if (titleEl) titleEl.textContent = 'Continue with Apple';
      if (leadEl) {
        leadEl.textContent =
          'Enter your Apple ID email (e.g. @icloud.com or @me.com) to sign in or create your linked SpaceHub account.';
      }
      if (emailLabel) emailLabel.innerHTML = 'Apple ID Email <span aria-hidden="true">*</span>';
      if (emailInput) emailInput.placeholder = 'you@icloud.com';
      if (ghTokenField) ghTokenField.hidden = true;
      if (submitBtn) submitBtn.textContent = 'Continue with Apple';
    } else {
      if (titleEl) titleEl.textContent = 'Continue with Google (Gmail)';
      if (leadEl) {
        leadEl.textContent =
          'Enter your Gmail address to sign in or automatically create your linked SpaceHub account.';
      }
      if (emailLabel) emailLabel.innerHTML = 'Gmail Address <span aria-hidden="true">*</span>';
      if (emailInput) emailInput.placeholder = 'you@gmail.com';
      if (ghTokenField) ghTokenField.hidden = true;
      if (submitBtn) submitBtn.textContent = 'Continue with Google';
    }

    document.getElementById('socialAuthDialog')?.showModal();
    emailInput?.focus();
  });
});

document.getElementById('socialAuthForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const provider = document.getElementById('socialProviderInput')?.value || 'google';
  const email = document.getElementById('socialEmailInput')?.value.trim() || '';
  const displayName = document.getElementById('socialDisplayNameInput')?.value.trim() || '';
  const accessToken = document.getElementById('socialGithubTokenInput')?.value.trim() || '';
  const errBox = document.getElementById('socialAuthServerError');
  if (errBox) errBox.hidden = true;

  if (!email && !accessToken) {
    if (errBox) {
      errBox.textContent = 'Please enter your email or account handle.';
      errBox.hidden = false;
    }
    return;
  }

  try {
    const data = await apiFetch('/api/auth/social', {
      method: 'POST',
      body: JSON.stringify({ provider, email, displayName, accessToken })
    });
    state.user = data.user;
    state.token = data.token;
    localStorage.setItem('spacehub_token', data.token);
    updateAuthUI();
    document.getElementById('socialAuthDialog')?.close();
    e.target.reset();
    loadSpacesList();
    loadAgentKeys();
    loadHostingConnections();
    const provLabels = { google: 'Google (Gmail)', github: 'GitHub', apple: 'Apple' };
    showToast(`Signed in with ${provLabels[provider] || provider} as @${data.user.username}!`);
  } catch (err) {
    if (errBox) {
      errBox.textContent = err.message;
      errBox.hidden = false;
    }
  }
});

// Sign In Submit
document.getElementById('signInForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  if (!form.checkValidity()) {
    const firstInvalid = form.querySelector(':invalid');
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  const username = document.getElementById('signInUsername').value.trim();
  const password = document.getElementById('signInPassword').value;
  const errBox = document.getElementById('signInServerError');
  errBox.hidden = true;

  try {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    state.user = data.user;
    state.token = data.token;
    localStorage.setItem('spacehub_token', data.token);
    updateAuthUI();
    document.getElementById('signInDialog').close();
    loadSpacesList();
    loadAgentKeys();
    loadHostingConnections();
    showToast(`Welcome back, @${data.user.username}!`);
  } catch (err) {
    errBox.textContent = err.message;
    errBox.hidden = false;
  }
});

// Sign Up Submit
document.getElementById('signUpForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  if (!form.checkValidity()) {
    const firstInvalid = form.querySelector(':invalid');
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  const displayName = document.getElementById('signUpFullName').value.trim();
  const username = document.getElementById('signUpUsername').value.trim();
  const password = document.getElementById('signUpPassword').value;
  const errBox = document.getElementById('signUpServerError');
  errBox.hidden = true;

  try {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ displayName, username, password })
    });
    state.user = data.user;
    state.token = data.token;
    localStorage.setItem('spacehub_token', data.token);
    updateAuthUI();
    document.getElementById('signUpDialog').close();
    loadSpacesList();
    loadAgentKeys();
    loadHostingConnections();
    showToast(`Account created! Welcome, @${data.user.username}.`);
  } catch (err) {
    errBox.textContent = err.message;
    errBox.hidden = false;
  }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch (_e) {
    // ignore
  }
  state.user = null;
  state.token = null;
  localStorage.removeItem('spacehub_token');
  updateAuthUI();
  switchMainSection('hubView');
  setTopNavFilter('public');
  showToast('Signed out.');
});

// Create Space Submit
document.getElementById('createSpaceForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  if (!form.checkValidity()) {
    const firstInvalid = form.querySelector(':invalid');
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  const title = document.getElementById('spaceTitleInput').value.trim();
  const description = document.getElementById('spaceDescInput').value.trim();
  const templateId = form.querySelector('input[name="templateId"]:checked')?.value || 'landing';
  const visibility = form.querySelector('input[name="visibility"]:checked')?.value || 'private';
  const appPlatform = document.getElementById('createPlatformSelect')?.value || 'both';
  const appOrientation = document.getElementById('createOrientationSelect')?.value || 'any';

  const templateMeta = {
    landing: { emoji: '✨', colorFrom: 'indigo', colorTo: 'cyan' },
    dashboard: { emoji: '📊', colorFrom: 'emerald', colorTo: 'teal' },
    canvas: { emoji: '🎨', colorFrom: 'pink', colorTo: 'orange' },
    mobile_app: { emoji: '📱', colorFrom: 'indigo', colorTo: 'cyan' },
    link_bio: { emoji: '🔗', colorFrom: 'pink', colorTo: 'orange' },
    waitlist: { emoji: '📬', colorFrom: 'emerald', colorTo: 'teal' }
  }[templateId] || { emoji: '🚀', colorFrom: 'indigo', colorTo: 'purple' };

  try {
    const data = await apiFetch('/api/spaces', {
      method: 'POST',
      body: JSON.stringify({
        title,
        description,
        templateId,
        visibility,
        appPlatform,
        appOrientation,
        ...templateMeta
      })
    });
    document.getElementById('createSpaceDialog').close();
    form.reset();
    showToast('Space created in Staging! Check how your website looks, then buy or connect hosting to launch.');
    openSpaceStudio(data.space.ownerUsername, data.space.slug);
  } catch (err) {
    showToast(err.message);
  }
});

// --- 7. INSTALLABLE MOBILE APP (ANDROID & IPHONE PWA) ---

let deferredInstallPrompt = null;
let currentInstallUrl = window.location.origin;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const wrap = document.getElementById('nativeInstallPromptWrap');
  if (wrap) wrap.hidden = false;
});

function openInstallAppModal(appName, targetUrl) {
  currentInstallUrl = targetUrl || window.location.origin;
  const titleEl = document.getElementById('installAppDialogTitle');
  const leadEl = document.getElementById('installAppDialogLead');
  const androidCode = document.getElementById('installTargetUrlAndroid');
  const iosCode = document.getElementById('installTargetUrlIos');
  const qrImg = document.getElementById('installQrCodeImg');
  if (titleEl) titleEl.textContent = `Install ${appName} on Android & iPhone`;
  if (leadEl) {
    leadEl.innerHTML = `Scan the QR code or open the link below to install <strong>${escapeHtml(
      appName
    )}</strong> onto your Android or iPhone home screen.`;
  }
  if (androidCode) androidCode.textContent = currentInstallUrl;
  if (iosCode) iosCode.textContent = currentInstallUrl;
  if (qrImg) {
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
      currentInstallUrl
    )}`;
  }
  document.getElementById('installAppDialog')?.showModal();
}

document.getElementById('installSpaceHubBtn')?.addEventListener('click', async () => {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    return;
  }
  openInstallAppModal('SpaceHub', window.location.origin);
});

document.getElementById('installSpaceAppBtn')?.addEventListener('click', () => {
  if (!state.currentSpace) return;
  const spaceLiveUrl = `${window.location.origin}/live/${state.currentSpace.slug}`;
  openInstallAppModal(state.currentSpace.title, spaceLiveUrl);
});

document.getElementById('triggerNativeInstallBtn')?.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  document.getElementById('installAppDialog')?.close();
});

document.getElementById('copyInstallLinkBtn')?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(currentInstallUrl);
    showToast(`Copied mobile app link: ${currentInstallUrl}`);
  } catch (_e) {
    showToast(currentInstallUrl);
  }
});

// Bootstrap application on load
(async function initApp() {
  try {
    const me = await apiFetch('/api/auth/me');
    state.user = me.user;
  } catch (_e) {
    state.user = null;
  }
  updateAuthUI();
  await loadSpacesList();

  const params = new URLSearchParams(window.location.search);
  if (params.get('paypal_return') === '1' && params.get('token')) {
    if (!state.user) {
      showToast('Sign in, then reload this page to finish activating your hosting plan.');
    } else {
      try {
        const res = await apiFetch('/api/paypal/capture-order', {
          method: 'POST',
          body: JSON.stringify({ orderId: params.get('token') })
        });
        window.history.replaceState({}, '', window.location.pathname);
        showToast(res.message);
        document.getElementById('tabHosting')?.click();
      } catch (err) {
        showToast(err.message);
      }
    }
  } else if (params.get('paypal_canceled') === '1') {
    window.history.replaceState({}, '', window.location.pathname);
    showToast('PayPal checkout was canceled — you have not been charged.');
  }
  if (params.get('paypal_paid') === '1' && state.user) {
    const planId = params.get('planId') || 'plan_monthly_1';
    try {
      const res = await apiFetch('/api/hosting-plans/purchase', {
        method: 'POST',
        body: JSON.stringify({
          planId,
          paymentMethod: 'paypal_redirect',
          paymentRef: params.get('tx') || 'paypal_return_verified'
        })
      });
      window.history.replaceState({}, '', window.location.pathname);
      showToast(res.message);
    } catch (_e) {
      // ignore
    }
  }
})();
