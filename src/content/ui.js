/**
 * Rapido - UI Module
 * Manages Shadow DOM injection, FAB, Panel, Recording, Field Targeting
 */
const RapidoUI = (() => {
  // ---- State ----
  let shadowRoot = null;
  let fab = null;
  let panel = null;
  let crosshairOverlay = null;
  let targetElement = null;
  let mediaRecorder = null;
  let audioChunks = [];
  let recordingStartTime = null;
  let timerInterval = null;
  let isRecording = false;
  let isPanelOpen = false;
  let isFieldPicking = false;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let fabStartX = 0;
  let fabStartY = 0;
  let hasDragged = false;
  let panelLayout = 'compact'; // 'compact' or 'wide'
  let isResizing = false;
  let resizeEdge = '';
  let resizeStartX = 0;
  let resizeStartY = 0;
  let resizeStartW = 0;
  let resizeStartH = 0;
  let resizeStartL = 0;
  let resizeStartT = 0;

  const MIN_PANEL_W = 280;
  const MIN_PANEL_H = 200;
  let resizeHandleEls = {};

  // ---- SVG Icons ----
  const ICONS = {
    mic: `<svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>`,
    stop: `<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>`,
    close: `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
    send: `<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`,
    target: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2"/></svg>`,
    paste: `<svg viewBox="0 0 24 24"><path d="M19 2h-4.18C14.4.84 13.3 0 12 0c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z"/></svg>`,
    logo: `<img class="ecd-logo-img" alt="Rapido">`,
    fabLogo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="7" x2="12" y2="12"/><line x1="12" y1="12" x2="15.5" y2="14.5"/><line x1="1" y1="6" x2="4" y2="8"/><line x1="0.5" y1="10.5" x2="3.5" y2="11.5"/><line x1="1" y1="18" x2="4" y2="16"/></svg>`,
    layoutCompact: `<svg viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
    layoutWide: `<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
    settings: `<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.6 3.6 0 0112 15.6z"/></svg>`
  };

  // ---- Initialize ----
  function init() {
    if (shadowRoot) return; // Already initialized

    const host = document.createElement('div');
    host.id = 'rapido-root';
    shadowRoot = host.attachShadow({ mode: 'closed' });

    // Load CSS
    const style = document.createElement('style');
    style.textContent = getCSS();
    shadowRoot.appendChild(style);

    // Create elements
    createFAB();
    createPanel();
    createCrosshairOverlay();
    createResizeHandles();

    document.documentElement.appendChild(host);

    // Restore FAB position + writing style
    restoreFabPosition();
    restoreWritingStyle();
    restorePanelLayout();

    // Listen for focus changes to auto-detect target
    document.addEventListener('focusin', onDocumentFocusIn, true);
  }

  function getCSS() {
    // CSS is embedded here to avoid fetch issues with Shadow DOM
    return `/* Inline CSS - see ui.css for source */
:host{all:initial;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.5;color:#1e293b}*{box-sizing:border-box;margin:0;padding:0}
.ecd-fab{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:#2563eb;color:#fff;border:none;cursor:pointer;z-index:2147483647;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.25);transition:background .15s ease,transform .15s ease;user-select:none;touch-action:none}
.ecd-fab:hover{background:#1d4ed8;transform:scale(1.05)}.ecd-fab:active{transform:scale(.97)}.ecd-fab.dragging{cursor:grabbing;transition:none;transform:none;opacity:.9}.ecd-fab svg{width:28px;height:28px;stroke:currentColor;fill:none;pointer-events:none}
.ecd-panel{position:fixed;width:380px;max-height:540px;background:#fff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.18);z-index:2147483646;display:none;flex-direction:column;overflow:hidden;border:1px solid #e2e8f0}.ecd-panel.open{display:flex}
.ecd-panel-header{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#2563eb;color:#fff}
.ecd-header-logo{display:flex;align-items:center}.ecd-header-logo img{height:22px;width:auto}
.ecd-header-actions{display:flex;align-items:center;gap:2px}
.ecd-layout-btn{background:0 0;border:1px solid rgba(255,255,255,.3);color:rgba(255,255,255,.6);cursor:pointer;padding:4px;border-radius:4px;display:flex;align-items:center;transition:all .15s ease}.ecd-layout-btn:hover{background:rgba(255,255,255,.15);color:#fff}.ecd-layout-btn.active{background:rgba(255,255,255,.25);color:#fff;border-color:rgba(255,255,255,.5)}.ecd-layout-btn svg{width:16px;height:16px;stroke:currentColor;fill:none}
.ecd-header-btn{background:0 0;border:1px solid rgba(255,255,255,.3);color:rgba(255,255,255,.6);cursor:pointer;padding:4px;border-radius:4px;display:flex;align-items:center;transition:all .15s ease}.ecd-header-btn:hover{background:rgba(255,255,255,.15);color:#fff}.ecd-header-btn svg{width:16px;height:16px;fill:currentColor}
.ecd-close-btn{background:0 0;border:none;color:#fff;cursor:pointer;padding:4px;border-radius:4px;display:flex;align-items:center;margin-left:6px}.ecd-close-btn:hover{background:rgba(255,255,255,.2)}.ecd-close-btn svg{width:18px;height:18px;fill:currentColor}
.ecd-panel-body{padding:16px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:12px}
.ecd-label{font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.ecd-select{width:100%;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;background:#f8fafc;color:#1e293b;cursor:pointer;outline:0}.ecd-select:focus{border-color:#2563eb;box-shadow:0 0 0 2px rgba(37,99,235,.15)}
.ecd-record-section{display:flex;align-items:center;gap:10px}
.ecd-btn{padding:8px 16px;border:none;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:background .15s ease}.ecd-btn:disabled{opacity:.5;cursor:not-allowed}
.ecd-btn-primary{background:#2563eb;color:#fff}.ecd-btn-primary:hover:not(:disabled){background:#1d4ed8}
.ecd-btn-danger{background:#dc2626;color:#fff}.ecd-btn-danger:hover:not(:disabled){background:#b91c1c}
.ecd-btn-secondary{background:#f1f5f9;color:#334155;border:1px solid #cbd5e1}.ecd-btn-secondary:hover:not(:disabled){background:#e2e8f0}
.ecd-btn-success{background:#16a34a;color:#fff}.ecd-btn-success:hover:not(:disabled){background:#15803d}
.ecd-btn-warning{background:#f97316;color:#fff}.ecd-btn-warning:hover:not(:disabled){background:#ea580c}
.ecd-btn svg{width:16px;height:16px;fill:currentColor;pointer-events:none}
.ecd-timer{font-size:14px;font-weight:600;color:#dc2626;font-variant-numeric:tabular-nums;min-width:48px}
.ecd-recording-dot{width:10px;height:10px;border-radius:50%;background:#dc2626;animation:ecd-pulse 1s ease-in-out infinite;flex-shrink:0}
@keyframes ecd-pulse{0%,100%{opacity:1}50%{opacity:.3}}
.ecd-textarea{width:100%;min-height:80px;max-height:140px;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;outline:0;color:#1e293b;background:#fff;line-height:1.5}.ecd-textarea:focus{border-color:#2563eb;box-shadow:0 0 0 2px rgba(37,99,235,.15)}.ecd-textarea.readonly{background:#f8fafc;color:#475569;resize:none;cursor:default}
.ecd-status{font-size:12px;padding:8px 12px;border-radius:6px;display:none}.ecd-status.visible{display:block}.ecd-status.info{background:#eff6ff;color:#1e40af}.ecd-status.error{background:#fef2f2;color:#991b1b}.ecd-status.success{background:#f0fdf4;color:#166534}
.ecd-spinner{display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:ecd-spin .6s linear infinite;vertical-align:middle;margin-right:6px}@keyframes ecd-spin{to{transform:rotate(360deg)}}
.ecd-crosshair-overlay{position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483645;cursor:crosshair;display:none}.ecd-crosshair-overlay.active{display:block}
.ecd-target-info{font-size:11px;color:#64748b;font-style:italic;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ecd-paste-row{display:flex;align-items:center;gap:8px;margin-top:6px}
.ecd-divider{height:1px;background:#e2e8f0;margin:4px 0}
.ecd-panel.wide{width:620px;max-height:420px}
.ecd-panel.wide .ecd-panel-body{gap:10px;padding:12px 16px}
.ecd-panel.wide .ecd-textarea{min-height:60px;max-height:100px}`;
  }

  // ---- FAB ----
  function createFAB() {
    fab = document.createElement('button');
    fab.className = 'ecd-fab';
    fab.innerHTML = ICONS.fabLogo;
    fab.title = 'Rapido';

    fab.addEventListener('mousedown', onFabMouseDown);
    fab.addEventListener('click', onFabClick);

    shadowRoot.appendChild(fab);
  }

  function onFabMouseDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();

    dragStartX = e.clientX;
    dragStartY = e.clientY;
    const rect = fab.getBoundingClientRect();
    fabStartX = rect.left;
    fabStartY = rect.top;
    hasDragged = false;

    document.addEventListener('mousemove', onFabMouseMove);
    document.addEventListener('mouseup', onFabMouseUp);
  }

  function onFabMouseMove(e) {
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    // Drag threshold of 3px
    if (!hasDragged && Math.sqrt(dx * dx + dy * dy) < 3) return;

    if (!hasDragged) {
      hasDragged = true;
      isDragging = true;
      fab.classList.add('dragging');
    }

    let newX = fabStartX + dx;
    let newY = fabStartY + dy;

    // Clamp within viewport
    newX = Math.max(0, Math.min(window.innerWidth - 56, newX));
    newY = Math.max(0, Math.min(window.innerHeight - 56, newY));

    fab.style.left = newX + 'px';
    fab.style.top = newY + 'px';
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
  }

  function onFabMouseUp(e) {
    document.removeEventListener('mousemove', onFabMouseMove);
    document.removeEventListener('mouseup', onFabMouseUp);

    if (hasDragged) {
      fab.classList.remove('dragging');

      // Edge snapping
      const rect = fab.getBoundingClientRect();
      const centerX = rect.left + 28;
      const snapToRight = centerX > window.innerWidth / 2;

      let y = Math.max(8, Math.min(window.innerHeight - 64, rect.top));

      if (snapToRight) {
        fab.style.left = 'auto';
        fab.style.right = '20px';
      } else {
        fab.style.right = 'auto';
        fab.style.left = '20px';
      }
      fab.style.top = y + 'px';
      fab.style.bottom = 'auto';

      // Save position
      const side = snapToRight ? 'right' : 'left';
      StorageHelper.setFabPosition({ y, side });

      // Reset drag state after a tick so click handler doesn't fire
      setTimeout(() => {
        isDragging = false;
        hasDragged = false;
      }, 0);

      // Update panel position
      if (isPanelOpen) positionPanel();
    }
  }

  function onFabClick(e) {
    if (isDragging || hasDragged) return;
    togglePanel();
  }

  async function restoreFabPosition() {
    try {
      const pos = await StorageHelper.getFabPosition();
      if (pos && pos.y !== null && pos.y !== undefined) {
        fab.style.bottom = 'auto';
        fab.style.top = pos.y + 'px';
        if (pos.side === 'left') {
          fab.style.right = 'auto';
          fab.style.left = '20px';
        } else {
          fab.style.left = 'auto';
          fab.style.right = '20px';
        }
      }
    } catch (e) {
      // Default position is fine
    }
  }

  async function restoreWritingStyle() {
    try {
      const style = await StorageHelper.get(StorageHelper.KEYS.WRITING_STYLE);
      if (style && panel) {
        const select = panel.querySelector('#ecd-writing-style');
        if (select) select.value = style;
      }
    } catch (e) {
      // Default is fine
    }
  }

  function setPanelLayout(layout) {
    panelLayout = layout;

    // Clear manual resize inline styles
    panel.style.width = '';
    panel.style.height = '';
    panel.style.maxHeight = '';

    panel.classList.toggle('wide', layout === 'wide');

    // Update active button
    const compactBtn = panel.querySelector('#ecd-layout-compact');
    const wideBtn = panel.querySelector('#ecd-layout-wide');
    compactBtn.classList.toggle('active', layout === 'compact');
    wideBtn.classList.toggle('active', layout === 'wide');

    // Save preference
    StorageHelper.set({ [StorageHelper.KEYS.PANEL_LAYOUT]: layout });

    // Reposition panel
    if (isPanelOpen) positionPanel();
  }

  async function restorePanelLayout() {
    try {
      const layout = await StorageHelper.get(StorageHelper.KEYS.PANEL_LAYOUT);
      if (layout === 'wide' && panel) {
        setPanelLayout('wide');
      }
    } catch (e) {
      // Default compact is fine
    }
  }

  // ---- Panel ----
  function createPanel() {
    panel = document.createElement('div');
    panel.className = 'ecd-panel';

    panel.innerHTML = `
      <div class="ecd-panel-header">
        <span class="ecd-header-logo">${ICONS.logo}</span>
        <div class="ecd-header-actions">
          <button class="ecd-layout-btn active" id="ecd-layout-compact" title="Compact">${ICONS.layoutCompact}</button>
          <button class="ecd-layout-btn" id="ecd-layout-wide" title="Breed">${ICONS.layoutWide}</button>
          <button class="ecd-header-btn" id="ecd-settings-link" title="Instellingen">${ICONS.settings}</button>
          <button class="ecd-close-btn" title="Sluiten">${ICONS.close}</button>
        </div>
      </div>
      <div class="ecd-panel-body">
        <div>
          <div class="ecd-label">Preset</div>
          <select class="ecd-select" id="ecd-preset">
            <option value="dagrapportage">Dagrapportage</option>
            <option value="contactmoment">Contactmoment</option>
            <option value="evaluatie">Evaluatie</option>
          </select>
        </div>

        <div>
          <div class="ecd-label">Schrijfstijl</div>
          <select class="ecd-select" id="ecd-writing-style">
            <option value="professional">Professioneel & volledig</option>
            <option value="literal">Letterlijk & compact</option>
          </select>
        </div>

        <div>
          <div class="ecd-label">Opname</div>
          <div class="ecd-record-section">
            <button class="ecd-btn ecd-btn-primary" id="ecd-record-btn">
              ${ICONS.mic} Opnemen
            </button>
            <span class="ecd-timer" id="ecd-timer" style="display:none">00:00</span>
            <span class="ecd-recording-dot" id="ecd-rec-dot" style="display:none"></span>
          </div>
        </div>

        <div>
          <div class="ecd-label">Transcript</div>
          <textarea class="ecd-textarea" id="ecd-transcript" placeholder="Spreek in of typ hier je tekst..."></textarea>
        </div>

        <div>
          <button class="ecd-btn ecd-btn-primary" id="ecd-generate-btn" style="width:100%">
            ${ICONS.send} Genereer rapportage
          </button>
        </div>

        <div id="ecd-output-section" style="display:none">
          <div class="ecd-label">Gegenereerde tekst</div>
          <textarea class="ecd-textarea" id="ecd-output"></textarea>
          <div class="ecd-paste-row">
            <span class="ecd-target-info" id="ecd-target-info">Klik eerst in een tekstveld</span>
            <button class="ecd-btn ecd-btn-success" id="ecd-paste-btn" disabled>
              ${ICONS.paste} Plakken
            </button>
          </div>
        </div>

        <div class="ecd-status" id="ecd-status"></div>

        <div>
          <button class="ecd-btn ecd-btn-warning" id="ecd-clear-btn" style="width:100%">Wis velden</button>
        </div>
      </div>
    `;

    // Set logo src dynamically (chrome.runtime.getURL works in content scripts)
    const logoImg = panel.querySelector('.ecd-logo-img');
    if (logoImg) logoImg.src = chrome.runtime.getURL('logo/logo-header.png');

    // Event listeners
    panel.querySelector('.ecd-close-btn').addEventListener('click', () => togglePanel(false));
    panel.querySelector('#ecd-record-btn').addEventListener('click', toggleRecording);
    panel.querySelector('#ecd-generate-btn').addEventListener('click', handleGenerate);
    panel.querySelector('#ecd-paste-btn').addEventListener('click', handlePaste);
    panel.querySelector('#ecd-clear-btn').addEventListener('click', handleClear);
    panel.querySelector('#ecd-settings-link').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openOptions' });
    });
    panel.querySelector('#ecd-transcript').addEventListener('input', updateGenerateBtn);
    panel.querySelector('#ecd-layout-compact').addEventListener('click', () => setPanelLayout('compact'));
    panel.querySelector('#ecd-layout-wide').addEventListener('click', () => setPanelLayout('wide'));

    shadowRoot.appendChild(panel);
  }

  function togglePanel(forceState) {
    isPanelOpen = forceState !== undefined ? forceState : !isPanelOpen;
    panel.classList.toggle('open', isPanelOpen);
    if (isPanelOpen) {
      positionPanel();
    } else {
      positionResizeHandles(); // hides handles
    }
  }

  function positionPanel() {
    const fabRect = fab.getBoundingClientRect();
    const panelWidth = panel.offsetWidth || (panelLayout === 'wide' ? 620 : 380);
    const panelHeight = panel.offsetHeight || 500;

    // Position panel next to FAB
    let left, top;
    const fabCenterX = fabRect.left + 28;

    if (fabCenterX > window.innerWidth / 2) {
      // FAB is on right side, panel opens to the left
      left = fabRect.left - panelWidth - 12;
      if (left < 8) left = 8;
    } else {
      // FAB is on left side, panel opens to the right
      left = fabRect.right + 12;
      if (left + panelWidth > window.innerWidth - 8) {
        left = window.innerWidth - panelWidth - 8;
      }
    }

    top = Math.max(8, Math.min(fabRect.top - panelHeight / 2 + 28, window.innerHeight - panelHeight - 8));

    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
    positionResizeHandles();
  }

  // ---- Panel Resize (handle-based) ----
  const CURSOR_MAP = {
    n:'ns-resize', s:'ns-resize', e:'ew-resize', w:'ew-resize',
    ne:'nesw-resize', sw:'nesw-resize', nw:'nwse-resize', se:'nwse-resize'
  };

  function createResizeHandles() {
    const edges = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
    edges.forEach(edge => {
      const el = document.createElement('div');
      el.style.cssText = `position:fixed;display:none;z-index:2147483647;cursor:${CURSOR_MAP[edge]};`;
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        beginResize(edge, e);
      });
      shadowRoot.appendChild(el);
      resizeHandleEls[edge] = el;
    });
  }

  function positionResizeHandles() {
    if (!isPanelOpen) {
      Object.values(resizeHandleEls).forEach(el => el.style.display = 'none');
      return;
    }
    const r = panel.getBoundingClientRect();
    const S = 5;  // half-thickness of edge strips
    const C = 14; // corner handle size
    setHandle('n',  r.left + C,  r.top - S,      r.width - C * 2, S * 2);
    setHandle('s',  r.left + C,  r.bottom - S,    r.width - C * 2, S * 2);
    setHandle('e',  r.right - S, r.top + C,       S * 2, r.height - C * 2);
    setHandle('w',  r.left - S,  r.top + C,       S * 2, r.height - C * 2);
    setHandle('nw', r.left - S,  r.top - S,       C + S, C + S);
    setHandle('ne', r.right - C, r.top - S,       C + S, C + S);
    setHandle('sw', r.left - S,  r.bottom - C,    C + S, C + S);
    setHandle('se', r.right - C, r.bottom - C,    C + S, C + S);
  }

  function setHandle(edge, left, top, width, height) {
    const el = resizeHandleEls[edge];
    if (!el) return;
    el.style.display = 'block';
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    el.style.width = Math.max(0, width) + 'px';
    el.style.height = Math.max(0, height) + 'px';
  }

  function beginResize(edge, e) {
    const rect = panel.getBoundingClientRect();
    isResizing = true;
    resizeEdge = edge;
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    resizeStartW = rect.width;
    resizeStartH = rect.height;
    resizeStartL = rect.left;
    resizeStartT = rect.top;

    // Hide handles during resize
    Object.values(resizeHandleEls).forEach(el => el.style.display = 'none');

    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeEnd);
  }

  function onResizeMove(e) {
    const dx = e.clientX - resizeStartX;
    const dy = e.clientY - resizeStartY;

    let newW = resizeStartW;
    let newH = resizeStartH;
    let newL = resizeStartL;
    let newT = resizeStartT;

    if (resizeEdge.includes('e')) newW = resizeStartW + dx;
    if (resizeEdge.includes('w')) { newW = resizeStartW - dx; newL = resizeStartL + dx; }
    if (resizeEdge.includes('s')) newH = resizeStartH + dy;
    if (resizeEdge.includes('n')) { newH = resizeStartH - dy; newT = resizeStartT + dy; }

    // Clamp to minimum
    if (newW < MIN_PANEL_W) {
      if (resizeEdge.includes('w')) newL = resizeStartL + resizeStartW - MIN_PANEL_W;
      newW = MIN_PANEL_W;
    }
    if (newH < MIN_PANEL_H) {
      if (resizeEdge.includes('n')) newT = resizeStartT + resizeStartH - MIN_PANEL_H;
      newH = MIN_PANEL_H;
    }

    // Clamp to viewport
    if (newL < 0) { newW += newL; newL = 0; }
    if (newT < 0) { newH += newT; newT = 0; }
    if (newL + newW > window.innerWidth) newW = window.innerWidth - newL;
    if (newT + newH > window.innerHeight) newH = window.innerHeight - newT;

    panel.style.width = newW + 'px';
    panel.style.height = newH + 'px';
    panel.style.maxHeight = 'none';
    panel.style.left = newL + 'px';
    panel.style.top = newT + 'px';
  }

  function onResizeEnd() {
    isResizing = false;
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeEnd);

    // Deactivate preset buttons - user manually resized
    panel.querySelector('#ecd-layout-compact')?.classList.remove('active');
    panel.querySelector('#ecd-layout-wide')?.classList.remove('active');

    // Show handles at new position
    positionResizeHandles();
  }

  // ---- Recording ----
  async function toggleRecording() {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }

  async function startRecording() {
    const btn = panel.querySelector('#ecd-record-btn');
    try {
      setStatus('info', 'Microfoon wordt geactiveerd...');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];

      mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        await processRecording();
      };

      mediaRecorder.start(250);

      // Set recording state immediately - no delay
      isRecording = true;
      recordingStartTime = Date.now();

      btn.className = 'ecd-btn ecd-btn-danger';
      btn.innerHTML = `${ICONS.stop} Stop`;
      panel.querySelector('#ecd-timer').style.display = '';
      panel.querySelector('#ecd-rec-dot').style.display = '';

      timerInterval = setInterval(updateTimer, 1000);
      setStatus('success', 'Opname gestart. Spreek nu.');
    } catch (err) {
      // Reset button state on error
      isRecording = false;
      btn.className = 'ecd-btn ecd-btn-primary';
      btn.innerHTML = `${ICONS.mic} Opnemen`;
      btn.disabled = false;

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStatus('error', 'Microfoontoegang geweigerd. Sta toegang toe in browserinstellingen.');
      } else {
        setStatus('error', `Microfoon fout: ${err.message}`);
      }
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    isRecording = false;
    clearInterval(timerInterval);

    const btn = panel.querySelector('#ecd-record-btn');
    btn.className = 'ecd-btn ecd-btn-primary';
    btn.innerHTML = `${ICONS.mic} Opnemen`;
    panel.querySelector('#ecd-timer').style.display = 'none';
    panel.querySelector('#ecd-rec-dot').style.display = 'none';
  }

  function updateTimer() {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');
    panel.querySelector('#ecd-timer').textContent = `${mins}:${secs}`;
  }

  async function processRecording() {
    if (!audioChunks.length) {
      setStatus('error', 'Geen audio opgenomen. Probeer opnieuw.');
      return;
    }

    const blob = new Blob(audioChunks, { type: mediaRecorder?.mimeType || 'audio/webm' });

    if (blob.size === 0) {
      setStatus('error', 'Lege audio opname. Probeer opnieuw.');
      return;
    }

    setStatus('info', '<span class="ecd-spinner"></span>Transcriberen...');

    try {
      // Convert blob to base64
      const base64 = await blobToBase64(blob);

      const response = await chrome.runtime.sendMessage({
        action: MSG.TRANSCRIBE,
        audioBase64: base64,
        mimeType: blob.type
      });

      if (response.success) {
        const transcript = panel.querySelector('#ecd-transcript');
        // Append to existing text if any
        const existing = transcript.value.trim();
        transcript.value = existing ? existing + ' ' + response.transcript : response.transcript;
        setStatus('success', 'Transcriptie voltooid.');
        updateGenerateBtn();
      } else {
        setStatus('error', response.error || 'Transcriptie mislukt.');
      }
    } catch (err) {
      setStatus('error', `Transcriptie fout: ${err.message}`);
    }
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // ---- Generate ----
  function updateGenerateBtn() {
    const transcript = panel.querySelector('#ecd-transcript').value.trim();
    panel.querySelector('#ecd-generate-btn').disabled = !transcript;
  }

  async function handleGenerate() {
    const transcript = panel.querySelector('#ecd-transcript').value.trim();
    if (!transcript) return;

    const preset = panel.querySelector('#ecd-preset').value;
    const writingStyle = panel.querySelector('#ecd-writing-style').value;
    const genBtn = panel.querySelector('#ecd-generate-btn');
    genBtn.disabled = true;

    setStatus('info', '<span class="ecd-spinner"></span>Genereren (2-staps analyse)...');

    try {
      const response = await chrome.runtime.sendMessage({
        action: MSG.GENERATE,
        preset,
        writingStyle,
        input: transcript,
        context: {
          url: window.location.href,
          title: document.title
        }
      });

      if (response.success) {
        const outputSection = panel.querySelector('#ecd-output-section');
        const outputEl = panel.querySelector('#ecd-output');
        outputEl.value = response.output;
        outputSection.style.display = '';
        setStatus('success', 'Tekst gegenereerd. Klaar om te plakken.');
        updatePasteBtn();
      } else {
        setStatus('error', response.error || 'Generatie mislukt.');
      }
    } catch (err) {
      setStatus('error', `Generatie fout: ${err.message}`);
    } finally {
      genBtn.disabled = false;
    }
  }

  // ---- Field Targeting ----
  function createCrosshairOverlay() {
    crosshairOverlay = document.createElement('div');
    crosshairOverlay.className = 'ecd-crosshair-overlay';

    crosshairOverlay.addEventListener('mousemove', onCrosshairMove);
    crosshairOverlay.addEventListener('click', onCrosshairClick);
    crosshairOverlay.addEventListener('keydown', onCrosshairKeydown);

    shadowRoot.appendChild(crosshairOverlay);
  }

  let highlightedEl = null;

  function startFieldPicking() {
    isFieldPicking = true;
    crosshairOverlay.classList.add('active');
    crosshairOverlay.setAttribute('tabindex', '0');
    crosshairOverlay.focus();
    setStatus('info', 'Klik op een bewerkbaar veld. Druk Escape om te annuleren.');
  }

  function stopFieldPicking() {
    isFieldPicking = false;
    crosshairOverlay.classList.remove('active');
    if (highlightedEl) {
      highlightedEl.style.outline = highlightedEl._ecdOrigOutline || '';
      highlightedEl = null;
    }
  }

  function onCrosshairMove(e) {
    // Remove old highlight
    if (highlightedEl) {
      highlightedEl.style.outline = highlightedEl._ecdOrigOutline || '';
    }

    // Get element under overlay
    crosshairOverlay.style.pointerEvents = 'none';
    const elUnder = document.elementFromPoint(e.clientX, e.clientY);
    crosshairOverlay.style.pointerEvents = '';

    if (elUnder && DomHelper.isEditable(elUnder)) {
      elUnder._ecdOrigOutline = elUnder.style.outline;
      elUnder.style.outline = '2px solid #2563eb';
      highlightedEl = elUnder;
    } else {
      highlightedEl = null;
    }
  }

  function onCrosshairClick(e) {
    e.preventDefault();
    e.stopPropagation();

    crosshairOverlay.style.pointerEvents = 'none';
    const elUnder = document.elementFromPoint(e.clientX, e.clientY);
    crosshairOverlay.style.pointerEvents = '';

    if (elUnder && DomHelper.isEditable(elUnder)) {
      setTarget(elUnder);
      stopFieldPicking();
    } else {
      setStatus('info', 'Selecteer een bewerkbaar veld (input, textarea, of contenteditable).');
    }
  }

  function onCrosshairKeydown(e) {
    if (e.key === 'Escape') {
      stopFieldPicking();
      setStatus('', '');
    }
  }

  function onDocumentFocusIn(e) {
    // Auto-detect target field when user focuses an editable element
    if (!isFieldPicking && DomHelper.isEditable(e.target)) {
      setTarget(e.target);
    }
  }

  function setTarget(el) {
    targetElement = el;
    panel.querySelector('#ecd-target-info').textContent = 'Veld geselecteerd';
    updatePasteBtn();
  }

  function updatePasteBtn() {
    const hasOutput = !!panel.querySelector('#ecd-output')?.value;
    const hasTarget = !!targetElement;
    panel.querySelector('#ecd-paste-btn').disabled = !(hasOutput && hasTarget);
  }

  // ---- Paste ----
  function handlePaste() {
    const output = panel.querySelector('#ecd-output').value;
    if (!output || !targetElement) return;

    const success = DomHelper.pasteIntoElement(targetElement, output);
    if (success) {
      DomHelper.highlightElement(targetElement);
      setStatus('success', 'Tekst geplakt!');
    } else {
      setStatus('error', 'Kon tekst niet plakken in dit veld.');
    }
  }

  // ---- Clear ----
  function handleClear() {
    panel.querySelector('#ecd-transcript').value = '';
    panel.querySelector('#ecd-output').value = '';
    panel.querySelector('#ecd-output-section').style.display = 'none';
    targetElement = null;
    panel.querySelector('#ecd-target-info').textContent = 'Klik eerst in een tekstveld';
    updateGenerateBtn();
    updatePasteBtn();
    setStatus('', '');
  }

  // ---- Status ----
  function setStatus(type, message) {
    const statusEl = panel.querySelector('#ecd-status');
    if (!type || !message) {
      statusEl.className = 'ecd-status';
      statusEl.innerHTML = '';
      return;
    }
    statusEl.className = `ecd-status visible ${type}`;
    statusEl.innerHTML = message;
  }

  // ---- Public API ----
  return { init };
})();
