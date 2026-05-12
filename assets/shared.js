/* ============================================
   SHARED — pomodoro, mini-player extras, helpers
   ============================================ */

(function () {
  'use strict';

  // ── HELPERS DE TEMPO ──────────────────────
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  // Formata uma quantidade de dias num rótulo curto em pt-BR:
  //   0       → "hoje"
  //   1       → "1 dia"
  //   2–13    → "X dias"
  //   14–59   → "X sem · Yd"
  //   60+     → "X meses · Y sem"
  window.formatRelativeDays = function (days) {
    if (days === null || days === undefined || isNaN(days)) return '—';
    if (days <= 0) return 'hoje';
    if (days === 1) return '1 dia';
    if (days < 14) return days + ' dias';
    if (days < 60) {
      const w = Math.floor(days / 7);
      const d = days % 7;
      return w + ' sem' + (d ? ' · ' + d + 'd' : '');
    }
    const m = Math.floor(days / 30);
    const w = Math.floor((days % 30) / 7);
    return m + (m === 1 ? ' mês' : ' meses') + (w ? ' · ' + w + 'sem' : '');
  };

  // Versão a partir de milissegundos: inclui horas se faltar pouco
  window.formatRelativeMs = function (ms) {
    if (ms === null || ms === undefined || isNaN(ms)) return '—';
    if (ms <= 0) return 'vencido';
    const totalDays = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    if (totalDays === 0) return hours + 'h';
    if (totalDays < 2) return totalDays + 'd · ' + hours + 'h';
    return window.formatRelativeDays(totalDays);
  };

  // ── MINI-PLAYER: BOTÃO MINIMIZAR ──────────
  // Adiciona um botão "—" antes do "×" e gerencia o estado colapsado
  // (esconde só o vídeo; a barra continua visível, o áudio continua tocando).

  const MIN_KEY = 'planning-repo:player-minimized';

  function injectMinimizeButton() {
    const bar = document.querySelector('.mini-player .mini-player-bar');
    if (!bar) return;
    if (bar.querySelector('.mini-player-min')) return;

    const closeBtn = bar.querySelector('.mini-player-close');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mini-player-min';
    btn.setAttribute('aria-label', 'Minimizar vídeo');
    btn.title = 'Minimizar vídeo (mantém o áudio)';
    btn.textContent = '—';
    btn.addEventListener('click', toggleMinimize);

    if (closeBtn) bar.insertBefore(btn, closeBtn);
    else bar.appendChild(btn);

    // Restaurar estado salvo
    try {
      if (localStorage.getItem(MIN_KEY) === '1') applyMinimized(true);
    } catch (e) {}
  }

  function toggleMinimize() {
    const player = document.getElementById('miniPlayer');
    if (!player) return;
    const isMin = player.classList.contains('minimized');
    applyMinimized(!isMin);
  }

  function applyMinimized(min) {
    const player = document.getElementById('miniPlayer');
    if (!player) return;
    player.classList.toggle('minimized', min);
    const btn = player.querySelector('.mini-player-min');
    if (btn) {
      btn.textContent = min ? '▣' : '—';
      btn.title = min ? 'Restaurar vídeo' : 'Minimizar vídeo (mantém o áudio)';
    }
    try { localStorage.setItem(MIN_KEY, min ? '1' : '0'); } catch (e) {}
  }

  // ── POMODORO ──────────────────────────────
  // Estado persistido em localStorage; cálculo baseado em wall-clock para
  // sobreviver às navegações entre páginas. Notificação + beep ao terminar.

  const POMO_KEY = 'planning-repo:pomodoro';
  const POMO_DEFAULT = {
    mode: 'work',        // 'work' | 'break'
    running: false,
    endsAt: null,        // timestamp ms (quando running)
    remainingMs: 25 * 60000, // quando pausado/parado
    workMin: 25,
    breakMin: 5,
    sessionsToday: 0,
    sessionsDate: null,  // YYYY-MM-DD
  };

  function loadPomo() {
    try {
      const raw = localStorage.getItem(POMO_KEY);
      if (!raw) return { ...POMO_DEFAULT };
      const parsed = JSON.parse(raw);
      return { ...POMO_DEFAULT, ...parsed };
    } catch (e) {
      return { ...POMO_DEFAULT };
    }
  }
  function savePomo(state) {
    try { localStorage.setItem(POMO_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  let pomoState = loadPomo();
  // Reset diário do contador de sessões
  if (pomoState.sessionsDate !== todayStr()) {
    pomoState.sessionsDate = todayStr();
    pomoState.sessionsToday = 0;
    savePomo(pomoState);
  }

  function pomoTotalMs() {
    return pomoState.mode === 'work'
      ? pomoState.workMin * 60000
      : pomoState.breakMin * 60000;
  }

  function pomoCurrentRemainingMs() {
    if (pomoState.running && pomoState.endsAt) {
      return Math.max(0, pomoState.endsAt - Date.now());
    }
    return pomoState.remainingMs;
  }

  function pomoStart() {
    if (pomoState.running) return;
    pomoState.running = true;
    pomoState.endsAt = Date.now() + (pomoState.remainingMs || pomoTotalMs());
    savePomo(pomoState);
    renderPomo();
  }
  function pomoPause() {
    if (!pomoState.running) return;
    pomoState.remainingMs = Math.max(0, pomoState.endsAt - Date.now());
    pomoState.running = false;
    pomoState.endsAt = null;
    savePomo(pomoState);
    renderPomo();
  }
  function pomoReset() {
    pomoState.running = false;
    pomoState.endsAt = null;
    pomoState.remainingMs = pomoTotalMs();
    savePomo(pomoState);
    renderPomo();
  }
  function pomoSwitchMode(nextMode, autoStart) {
    pomoState.mode = nextMode;
    pomoState.remainingMs = pomoTotalMs();
    pomoState.endsAt = null;
    pomoState.running = !!autoStart;
    if (autoStart) pomoState.endsAt = Date.now() + pomoState.remainingMs;
    savePomo(pomoState);
    renderPomo();
  }
  function pomoSkip() {
    pomoOnComplete(true);
  }

  function pomoOnComplete(silent) {
    const finishedMode = pomoState.mode;
    if (finishedMode === 'work') {
      pomoState.sessionsToday = (pomoState.sessionsToday || 0) + 1;
      pomoState.sessionsDate = todayStr();
    }
    pomoState.running = false;
    pomoState.endsAt = null;
    // Auto-troca para o modo oposto, sem auto-start
    pomoState.mode = finishedMode === 'work' ? 'break' : 'work';
    pomoState.remainingMs = pomoTotalMs();
    savePomo(pomoState);

    if (!silent) {
      try { pomoBeep(); } catch (e) {}
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(
            finishedMode === 'work' ? 'Pomodoro concluído' : 'Pausa concluída',
            {
              body: finishedMode === 'work'
                ? 'Hora da pausa · ' + pomoState.breakMin + ' min'
                : 'De volta ao foco · ' + pomoState.workMin + ' min',
              silent: false,
            }
          );
        }
      } catch (e) {}
      // Flash visual
      const widget = document.getElementById('pomoWidget');
      if (widget) {
        widget.classList.add('flash');
        setTimeout(() => widget.classList.remove('flash'), 2200);
      }
    }
    renderPomo();
  }

  // Beep curto via WebAudio (sem arquivo de áudio)
  function pomoBeep() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const beep = (freq, start, dur) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + start);
      o.stop(ctx.currentTime + start + dur + 0.02);
    };
    beep(660, 0, 0.18);
    beep(880, 0.22, 0.22);
    setTimeout(() => ctx.close(), 800);
  }

  function injectPomoWidget() {
    if (document.getElementById('pomoWidget')) return;
    const host = document.body;
    const el = document.createElement('div');
    el.id = 'pomoWidget';
    el.className = 'pomo-widget';
    el.innerHTML = `
      <button type="button" class="pomo-pill" id="pomoPill" aria-label="Pomodoro">
        <span class="pomo-pill-dot" id="pomoDot"></span>
        <span class="pomo-pill-time" id="pomoPillTime">25:00</span>
        <span class="pomo-pill-icon" id="pomoPillIcon">▶</span>
      </button>
      <div class="pomo-panel" id="pomoPanel" hidden>
        <div class="pomo-panel-head">
          <div class="pomo-mode" id="pomoMode">Foco</div>
          <div class="pomo-sessions" id="pomoSessions">0 sessões hoje</div>
        </div>
        <div class="pomo-time" id="pomoTime">25:00</div>
        <div class="pomo-ring">
          <div class="pomo-ring-fill" id="pomoRingFill"></div>
        </div>
        <div class="pomo-focus-line" id="pomoFocusLine" hidden>
          <span class="pomo-focus-label">Trabalhando em</span>
          <span class="pomo-focus-text" id="pomoFocusText">—</span>
          <button type="button" class="pomo-focus-clear" id="pomoFocusClear" title="Limpar foco">×</button>
        </div>
        <div class="pomo-controls">
          <button type="button" class="pomo-btn primary" id="pomoBtnStart">Iniciar</button>
          <button type="button" class="pomo-btn" id="pomoBtnReset">Reiniciar</button>
          <button type="button" class="pomo-btn" id="pomoBtnSkip">Pular</button>
        </div>

        <div class="pomo-ql">
          <div class="pomo-ql-head">
            <span class="pomo-ql-title">Lista rápida</span>
            <span class="pomo-ql-count" id="pomoQlCount">0</span>
          </div>
          <div class="pomo-ql-items" id="pomoQlItems"></div>
          <div class="pomo-ql-add">
            <input type="text" id="pomoQlInput" placeholder="+ nova nota…">
            <button type="button" id="pomoQlAdd" aria-label="Adicionar">+</button>
          </div>
        </div>

        <details class="pomo-settings-details">
          <summary id="pomoSettingsSummary">Foco 25 min · Pausa 5 min</summary>
          <div class="pomo-settings">
            <label class="pomo-set">
              <span class="pomo-set-label">Foco</span>
              <input type="number" min="1" max="120" step="1" id="pomoWorkMin">
              <span class="pomo-set-unit">min</span>
            </label>
            <label class="pomo-set">
              <span class="pomo-set-label">Pausa</span>
              <input type="number" min="1" max="60" step="1" id="pomoBreakMin">
              <span class="pomo-set-unit">min</span>
            </label>
          </div>
        </details>
      </div>`;
    host.appendChild(el);

    document.getElementById('pomoPill').addEventListener('click', (ev) => {
      // Se panel aberto, fecha; senão abre. Permitir clique no ícone para start/pause rápido.
      if (ev.shiftKey) {
        pomoState.running ? pomoPause() : pomoStart();
        return;
      }
      togglePomoPanel();
    });
    document.getElementById('pomoBtnStart').addEventListener('click', () => {
      pomoState.running ? pomoPause() : pomoStart();
    });
    document.getElementById('pomoBtnReset').addEventListener('click', pomoReset);
    document.getElementById('pomoBtnSkip').addEventListener('click', pomoSkip);

    const workInp = document.getElementById('pomoWorkMin');
    const breakInp = document.getElementById('pomoBreakMin');
    workInp.value = pomoState.workMin;
    breakInp.value = pomoState.breakMin;
    workInp.addEventListener('change', () => {
      const v = Math.max(1, Math.min(120, parseInt(workInp.value, 10) || 25));
      pomoState.workMin = v;
      workInp.value = v;
      if (pomoState.mode === 'work' && !pomoState.running) {
        pomoState.remainingMs = v * 60000;
      }
      savePomo(pomoState);
      renderPomo();
    });
    breakInp.addEventListener('change', () => {
      const v = Math.max(1, Math.min(60, parseInt(breakInp.value, 10) || 5));
      pomoState.breakMin = v;
      breakInp.value = v;
      if (pomoState.mode === 'break' && !pomoState.running) {
        pomoState.remainingMs = v * 60000;
      }
      savePomo(pomoState);
      renderPomo();
    });

    // Fecha o panel ao clicar fora
    document.addEventListener('click', (ev) => {
      const widget = document.getElementById('pomoWidget');
      if (!widget) return;
      if (!widget.contains(ev.target)) {
        const panel = document.getElementById('pomoPanel');
        if (panel && !panel.hidden) panel.hidden = true;
        widget.classList.remove('open');
      }
    });

    // Permissão de notificação ao primeiro clique
    document.getElementById('pomoPill').addEventListener('click', requestNotifOnce, { once: true });

    // Quicklist integrada
    document.getElementById('pomoQlAdd').addEventListener('click', qlAdd);
    document.getElementById('pomoQlInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') qlAdd();
    });
    document.getElementById('pomoFocusClear').addEventListener('click', (e) => {
      e.stopPropagation();
      clearFocusItem();
    });

    qlRender();
    renderFocusLine();
    enablePomoDrag();
    restorePomoPosition();
  }

  // ── QUICKLIST (integrada ao painel do Pomodoro) ──
  const QL_KEY = 'planning-repo:quicklist';
  const QL_FOCUS_KEY = 'planning-repo:quicklist-focus';

  function qlLoad() {
    try { return JSON.parse(localStorage.getItem(QL_KEY)) || { items: [] }; }
    catch (e) { return { items: [] }; }
  }
  function qlSave(d) {
    try { localStorage.setItem(QL_KEY, JSON.stringify(d)); } catch (e) {}
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function qlRender() {
    const data = qlLoad();
    const items = data.items;
    const itemsEl = document.getElementById('pomoQlItems');
    const countEl = document.getElementById('pomoQlCount');
    if (countEl) {
      const open = items.filter(it => !it.done).length;
      countEl.textContent = open;
      countEl.classList.toggle('zero', open === 0);
    }
    if (!itemsEl) return;
    if (items.length === 0) {
      itemsEl.innerHTML = '<div class="pomo-ql-empty">Vazio — adicione uma nota.</div>';
      return;
    }
    const focusIdx = getFocusIdx();
    itemsEl.innerHTML = items.map((item, i) => {
      const isFocus = i === focusIdx && !item.done;
      return `
        <div class="pomo-ql-item${isFocus ? ' focus' : ''}${item.done ? ' done' : ''}" data-i="${i}">
          <input type="checkbox" class="task-cb" ${item.done ? 'checked' : ''}
            onchange="window.__qlToggle(${i})">
          <span class="pomo-ql-text" title="${escapeHtml(item.text)}"
            ondblclick="window.__qlStartEdit(this,${i})"
            onblur="window.__qlFinishEdit(this,${i})"
            onkeydown="window.__qlEditKey(event,this,${i})">${escapeHtml(item.text)}</span>
          <button type="button" class="pomo-ql-focus" title="${isFocus ? 'É o foco atual' : 'Marcar como foco do pomodoro'}"
            onclick="window.__qlSetFocus(${i})">${isFocus ? '◉' : '○'}</button>
          <button type="button" class="pomo-ql-del" onclick="window.__qlDel(${i})" aria-label="Remover">×</button>
        </div>`;
    }).join('');
  }

  function qlAdd() {
    const inp = document.getElementById('pomoQlInput');
    if (!inp) return;
    const txt = inp.value.trim();
    if (!txt) return;
    const d = qlLoad();
    d.items.push({ text: txt, done: false });
    qlSave(d);
    inp.value = '';
    qlRender();
    renderFocusLine();
    inp.focus();
  }

  function qlToggle(i) {
    const d = qlLoad();
    if (!d.items[i]) return;
    d.items[i].done = !d.items[i].done;
    qlSave(d);
    // Se a tarefa "focada" foi marcada como feita, limpa o foco
    if (d.items[i].done && getFocusId() === d.items[i].id) {
      clearFocusItem();
    }
    qlRender();
    renderFocusLine();
  }

  function qlDel(i) {
    const d = qlLoad();
    if (!d.items[i]) return;
    const wasFocus = i === getFocusIdx();
    d.items.splice(i, 1);
    qlSave(d);
    if (wasFocus) clearFocusItem();
    qlRender();
    renderFocusLine();
  }

  function qlStartEdit(el, i) {
    el.contentEditable = 'true';
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function qlFinishEdit(el, i) {
    el.contentEditable = 'false';
    const d = qlLoad();
    if (!d.items[i]) return;
    const txt = el.textContent.trim();
    if (txt) d.items[i].text = txt;
    else el.textContent = d.items[i].text;
    qlSave(d);
    renderFocusLine();
  }

  function qlEditKey(e, el, i) {
    if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
    if (e.key === 'Escape') {
      const d = qlLoad();
      if (d.items[i]) el.textContent = d.items[i].text;
      el.blur();
    }
  }

  // Foco do pomodoro: índice da tarefa atualmente "em foco".
  function getFocusIdx() {
    try {
      const raw = localStorage.getItem(QL_FOCUS_KEY);
      if (!raw) return -1;
      const n = parseInt(raw, 10);
      const items = qlLoad().items;
      if (n >= 0 && n < items.length && !items[n].done) return n;
      return -1;
    } catch (e) { return -1; }
  }
  function getFocusId() {
    const idx = getFocusIdx();
    if (idx < 0) return null;
    const items = qlLoad().items;
    return items[idx] ? items[idx].id : null;
  }
  function qlSetFocus(i) {
    const items = qlLoad().items;
    if (!items[i] || items[i].done) return;
    const current = getFocusIdx();
    if (current === i) {
      clearFocusItem();
    } else {
      try { localStorage.setItem(QL_FOCUS_KEY, String(i)); } catch (e) {}
    }
    qlRender();
    renderFocusLine();
  }
  function clearFocusItem() {
    try { localStorage.removeItem(QL_FOCUS_KEY); } catch (e) {}
    qlRender();
    renderFocusLine();
  }

  function renderFocusLine() {
    const line = document.getElementById('pomoFocusLine');
    const text = document.getElementById('pomoFocusText');
    if (!line || !text) return;
    const idx = getFocusIdx();
    if (idx < 0) {
      line.hidden = true;
      return;
    }
    const items = qlLoad().items;
    if (!items[idx]) { line.hidden = true; return; }
    line.hidden = false;
    text.textContent = items[idx].text;
  }

  // Expose para os onclicks inline
  window.__qlToggle = qlToggle;
  window.__qlDel = qlDel;
  window.__qlStartEdit = qlStartEdit;
  window.__qlFinishEdit = qlFinishEdit;
  window.__qlEditKey = qlEditKey;
  window.__qlSetFocus = qlSetFocus;

  // ── DRAG do pomodoro ──────────────────────
  // Permite arrastar o widget. Posição salva em localStorage como
  // { top, left } em pixels relativos ao viewport.
  const POMO_POS_KEY = 'planning-repo:pomodoro-pos';
  let _dragState = null;
  let _dragMoved = false;

  function restorePomoPosition() {
    try {
      const raw = localStorage.getItem(POMO_POS_KEY);
      if (!raw) return;
      const pos = JSON.parse(raw);
      if (!pos || typeof pos.top !== 'number' || typeof pos.left !== 'number') return;
      applyPomoPosition(pos.top, pos.left);
    } catch (e) {}
  }

  function applyPomoPosition(top, left) {
    const widget = document.getElementById('pomoWidget');
    if (!widget) return;
    const w = widget.offsetWidth || 130;
    const h = widget.offsetHeight || 40;
    const maxLeft = window.innerWidth - w - 4;
    const maxTop = window.innerHeight - h - 4;
    top = Math.max(4, Math.min(maxTop, top));
    left = Math.max(4, Math.min(maxLeft, left));
    widget.style.top = top + 'px';
    widget.style.left = left + 'px';
    widget.style.bottom = 'auto';
    widget.style.right = 'auto';
  }

  function enablePomoDrag() {
    const widget = document.getElementById('pomoWidget');
    const pill = document.getElementById('pomoPill');
    if (!widget || !pill) return;

    function onDown(ev) {
      // Botão esquerdo apenas; ignorar quando clica nos botões internos
      if (ev.button !== undefined && ev.button !== 0) return;
      const rect = widget.getBoundingClientRect();
      _dragState = {
        startX: ev.clientX,
        startY: ev.clientY,
        origLeft: rect.left,
        origTop: rect.top,
      };
      _dragMoved = false;
      widget.classList.add('dragging');
      pill.setPointerCapture && pill.setPointerCapture(ev.pointerId);
      ev.preventDefault();
    }
    function onMove(ev) {
      if (!_dragState) return;
      const dx = ev.clientX - _dragState.startX;
      const dy = ev.clientY - _dragState.startY;
      if (!_dragMoved && Math.hypot(dx, dy) > 4) _dragMoved = true;
      applyPomoPosition(_dragState.origTop + dy, _dragState.origLeft + dx);
    }
    function onUp(ev) {
      if (!_dragState) return;
      const widgetEl = document.getElementById('pomoWidget');
      widgetEl.classList.remove('dragging');
      try { pill.releasePointerCapture && pill.releasePointerCapture(ev.pointerId); } catch (e) {}
      if (_dragMoved) {
        const rect = widgetEl.getBoundingClientRect();
        try { localStorage.setItem(POMO_POS_KEY, JSON.stringify({ top: rect.top, left: rect.left })); } catch (e) {}
        // Suprime o próximo click para não abrir o panel
        const swallow = (e) => { e.stopPropagation(); e.preventDefault(); pill.removeEventListener('click', swallow, true); };
        pill.addEventListener('click', swallow, true);
      }
      _dragState = null;
    }

    pill.addEventListener('pointerdown', onDown);
    pill.addEventListener('pointermove', onMove);
    pill.addEventListener('pointerup', onUp);
    pill.addEventListener('pointercancel', onUp);

    // Reposiciona ao redimensionar a janela
    window.addEventListener('resize', () => {
      try {
        const raw = localStorage.getItem(POMO_POS_KEY);
        if (!raw) return;
        const pos = JSON.parse(raw);
        applyPomoPosition(pos.top, pos.left);
      } catch (e) {}
    });
  }

  function requestNotifOnce() {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } catch (e) {}
  }

  function togglePomoPanel() {
    const panel = document.getElementById('pomoPanel');
    const widget = document.getElementById('pomoWidget');
    if (!panel || !widget) return;
    panel.hidden = !panel.hidden;
    widget.classList.toggle('open', !panel.hidden);
  }

  function fmtTime(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return pad(m) + ':' + pad(s);
  }

  function renderPomo() {
    const remaining = pomoCurrentRemainingMs();
    const txt = fmtTime(remaining);
    const pillTime = document.getElementById('pomoPillTime');
    const pillIcon = document.getElementById('pomoPillIcon');
    const pillDot = document.getElementById('pomoDot');
    const widget = document.getElementById('pomoWidget');
    const timeEl = document.getElementById('pomoTime');
    const modeEl = document.getElementById('pomoMode');
    const startBtn = document.getElementById('pomoBtnStart');
    const ringFill = document.getElementById('pomoRingFill');
    const sessionsEl = document.getElementById('pomoSessions');

    if (pillTime) pillTime.textContent = txt;
    if (timeEl) timeEl.textContent = txt;
    if (pillIcon) pillIcon.textContent = pomoState.running ? '❚❚' : '▶';
    if (startBtn) startBtn.textContent = pomoState.running ? 'Pausar' : 'Iniciar';
    if (modeEl) modeEl.textContent = pomoState.mode === 'work' ? 'Foco' : 'Pausa';
    if (widget) {
      widget.classList.toggle('running', pomoState.running);
      widget.classList.toggle('mode-break', pomoState.mode === 'break');
    }
    if (sessionsEl) {
      const n = pomoState.sessionsToday || 0;
      sessionsEl.textContent = n + (n === 1 ? ' sessão hoje' : ' sessões hoje');
    }
    if (ringFill) {
      const total = pomoTotalMs();
      const pct = total > 0 ? Math.max(0, Math.min(100, (1 - remaining / total) * 100)) : 0;
      ringFill.style.width = pct.toFixed(2) + '%';
    }

    // Title da aba mostra o tempo (estilo Momentum)
    if (pomoState.running) {
      document.title = '⏱ ' + txt + ' · ' + (window.__originalTitle || document.title);
    } else if (window.__originalTitle) {
      document.title = window.__originalTitle;
    }

    // Resumo das settings no <summary>
    const summary = document.getElementById('pomoSettingsSummary');
    if (summary) {
      summary.textContent = 'Foco ' + pomoState.workMin + ' min · Pausa ' + pomoState.breakMin + ' min';
    }
  }

  function pomoTick() {
    if (pomoState.running && pomoState.endsAt) {
      const rem = pomoState.endsAt - Date.now();
      if (rem <= 0) {
        pomoOnComplete(false);
        return;
      }
    }
    // Recarrega estado de outras abas (storage event não dispara na própria aba)
    renderPomo();
  }

  // Sincroniza com outras abas
  window.addEventListener('storage', (ev) => {
    if (ev.key === POMO_KEY) {
      pomoState = loadPomo();
      const workInp = document.getElementById('pomoWorkMin');
      const breakInp = document.getElementById('pomoBreakMin');
      if (workInp) workInp.value = pomoState.workMin;
      if (breakInp) breakInp.value = pomoState.breakMin;
      renderPomo();
    } else if (ev.key === MIN_KEY) {
      const player = document.getElementById('miniPlayer');
      if (player) applyMinimized(ev.newValue === '1');
    }
  });

  // ── ONDAS — animação calmante dos blobs de fundo ──
  // Substitui o mousemove. Move --mx/--my em duas senoides com frequências
  // diferentes, criando órbitas elípticas lentas e relaxantes.
  function startWaveMotion() {
    const prefersReduced = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      document.documentElement.style.setProperty('--mx', '50%');
      document.documentElement.style.setProperty('--my', '70%');
      return;
    }
    function tick(t) {
      const e = t / 1000;
      // Períodos ~80s e ~120s para evitar ciclos óbvios
      const mx = 50 + 28 * Math.sin(e * (2 * Math.PI / 80));
      const my = 65 + 20 * Math.sin(e * (2 * Math.PI / 120) + 1.3);
      document.documentElement.style.setProperty('--mx', mx.toFixed(2) + '%');
      document.documentElement.style.setProperty('--my', my.toFixed(2) + '%');
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ── PALETTE SWITCHER ─────────────────────
  const PALETTES = [
    { id: '',         name: 'Terracota', swatch: '#D06224' },
    { id: 'sage',     name: 'Sálvia',    swatch: '#7A8A50' },
    { id: 'ocean',    name: 'Oceano',    swatch: '#4A7B95' },
    { id: 'lavender', name: 'Lavanda',   swatch: '#8A75B0' },
    { id: 'forest',   name: 'Floresta',  swatch: '#4A6E2A' },
  ];
  const PALETTE_KEY = 'planning-repo:palette';

  function applyPalette(id) {
    const root = document.documentElement;
    PALETTES.forEach(p => {
      if (p.id) root.classList.toggle('palette-' + p.id, p.id === id);
    });
    try { localStorage.setItem(PALETTE_KEY, id || ''); } catch (e) {}
    // Atualiza estado visual do selector
    document.querySelectorAll('.palette-opt').forEach(btn => {
      btn.classList.toggle('active', (btn.dataset.palette || '') === (id || ''));
    });
  }

  function injectPaletteSelector() {
    // music.html tem paleta verde fixa — não injetar selector lá
    if (/music\.html$/.test(window.location.pathname)) return;
    const intensity = document.getElementById('intensityCtrl');
    if (!intensity || document.querySelector('.palette-ctrl')) return;
    const el = document.createElement('div');
    el.className = 'palette-ctrl';
    el.innerHTML = PALETTES.map(p =>
      `<button type="button" class="palette-opt" data-palette="${p.id}"
        title="${p.name}" style="background: ${p.swatch};"
        aria-label="Paleta ${p.name}"></button>`
    ).join('');
    intensity.parentNode.insertBefore(el, intensity);

    el.querySelectorAll('.palette-opt').forEach(btn => {
      btn.addEventListener('click', () => applyPalette(btn.dataset.palette || ''));
    });

    // Restaurar paleta salva
    let saved = '';
    try { saved = localStorage.getItem(PALETTE_KEY) || ''; } catch (e) {}
    if (saved && PALETTES.some(p => p.id === saved)) {
      applyPalette(saved);
    } else {
      applyPalette('');
    }
  }

  // ── BOOTSTRAP ─────────────────────────────
  function boot() {
    window.__originalTitle = document.title;
    startWaveMotion();
    injectPaletteSelector();
    injectMinimizeButton();
    injectPomoWidget();
    renderPomo();
    setInterval(pomoTick, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
