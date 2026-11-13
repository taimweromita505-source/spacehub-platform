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

function bundleClientPreview(files) {
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
    currentUserBadge.textContent = `@${state.user.username}`;
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
            <span class="section-sub">${s.likes} ${s.likes === 1 ? 'like' : 'likes'}</span>
            <button type="button" class="btn btn-outline btn-xs" data-open-space="${escapeHtml(s.ownerUsername)}/${escapeHtml(s.slug)}">
              ${s.isOwner ? 'Open Workspace' : 'Open Space'}
            </button>
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
    settings: document.getElementById('studioTabSettings')
  };
  const panels = {
    workspace: document.getElementById('panelWorkspace'),
    app: document.getElementById('panelApp'),
    settings: document.getElementById('panelSettings')
  };

  Object.keys(tabs).forEach((k) => {
    const active = k === tabName;
    tabs[k].classList.toggle('active', active);
    tabs[k].setAttribute('aria-selected', String(active));
    panels[k].hidden = !active;
  });

  if (tabName === 'app' && state.currentSpace) {
    const frame = document.getElementById('publishedAppFrame');
    frame.src = `${state.currentSpace.stagingPreviewUrl}?t=${Date.now()}`;
  }
}

function updateLiveStagingPreview() {
  const iframe = document.getElementById('workspacePreviewFrame');
  if (!iframe) return;
  iframe.srcdoc = bundleClientPreview(state.workingFiles);
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
  const settingsTab = document.getElementById('studioTabSettings');
  const saveDraftBtn = document.getElementById('saveDraftBtn');
  const codeTextarea = document.getElementById('codeEditorTextarea');
  const studioAgentBar = document.getElementById('studioAgentBar');

  if (space.isOwner) {
    quickPrivacyBtn.hidden = false;
    quickPrivacyBtn.textContent =
      space.visibility === 'private' ? 'Make Public' : 'Make Private';
    launchBtn.hidden = false;
    launchBtn.textContent = space.externalHost ? 'Update Deployment' : 'Deploy';
    settingsTab.hidden = false;
    saveDraftBtn.hidden = false;
    codeTextarea.readOnly = false;
    studioAgentBar.hidden = false;
  } else {
    quickPrivacyBtn.hidden = true;
    launchBtn.hidden = true;
    settingsTab.hidden = true;
    saveDraftBtn.hidden = true;
    codeTextarea.readOnly = true;
    studioAgentBar.hidden = true;
  }

  const liveLink = document.getElementById('openStandaloneLink');
  liveLink.href = space.liveUrl || space.stagingPreviewUrl;
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

    document.querySelectorAll('.file-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-file') === state.activeFile);
    });
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

    updateLiveStagingPreview();
    switchMainSection('spaceStudioView');
    setStudioTab(space.isOwner ? 'workspace' : 'app');
  } catch (err) {
    showToast(err.message);
  }
}

// File tab switching inside editor
document.querySelectorAll('.file-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    const file = btn.getAttribute('data-file');
    state.activeFile = file;
    document.querySelectorAll('.file-tab').forEach((b) => {
      b.classList.toggle('active', b === btn);
    });
    document.getElementById('codeEditorTextarea').value = state.workingFiles[file] || '';
  });
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

// Export Ready-to-Host Static Bundle
document.getElementById('exportBundleBtn')?.addEventListener('click', async () => {
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
    showToast('Exported ready-to-host bundle (with vercel.json & netlify.toml)!');
  } catch (err) {
    showToast(err.message);
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
document.getElementById('studioTabSettings').addEventListener('click', () => setStudioTab('settings'));

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

  try {
    const { ownerUsername, slug } = state.currentSpace;
    const data = await apiFetch(`/api/spaces/${ownerUsername}/${slug}`, {
      method: 'PUT',
      body: JSON.stringify({ title, description, visibility, appPlatform, appOrientation })
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

          document.getElementById('paypalCheckoutDialog').showModal();
        });
      });
    }
  } catch (_err) {
    // ignore
  }
  await loadHostingConnections();
}

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
    canvas: { emoji: '🎨', colorFrom: 'pink', colorTo: 'orange' }
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
  if (titleEl) titleEl.textContent = `Install ${appName} on Android & iPhone`;
  if (leadEl) {
    leadEl.innerHTML = `Install <strong>${escapeHtml(
      appName
    )}</strong> onto your phone home screen for a full-screen mobile app experience.`;
  }
  if (androidCode) androidCode.textContent = currentInstallUrl;
  if (iosCode) iosCode.textContent = currentInstallUrl;
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
