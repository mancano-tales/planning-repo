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
        <div class="pomo-controls">
          <button type="button" class="pomo-btn primary" id="pomoBtnStart">Iniciar</button>
          <button type="button" class="pomo-btn" id="pomoBtnReset">Reiniciar</button>
          <button type="button" class="pomo-btn" id="pomoBtnSkip">Pular</button>
        </div>
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
      </div>`;
    document.body.appendChild(el);

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

  // ── WALLPAPER (Momentum-like) ─────────────
  // Foto de fundo discreta, tinta com paper-color por cima.
  // Rotaciona diariamente; clique no relógio do today-panel troca manualmente.
  const WALLPAPERS = ['vernazza', 'sandstone', 'banff', 'tatras', 'chureito', 'bettmerhorn'];
  const WP_KEY = 'planning-repo:wallpaper';

  function pickWallpaperForToday() {
    const d = new Date();
    const dayNum = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    return WALLPAPERS[dayNum % WALLPAPERS.length];
  }

  function applyWallpaper(name) {
    if (!name || !WALLPAPERS.includes(name)) return;
    // O CSS-var é consumido na .wp-bg (definida em assets/styles.css), então o
    // path relativo precisa ser resolvido a partir desse CSS — usamos URL absoluto.
    const base = new URL('wallpapers/' + name + '.jpg', new URL('assets/', document.baseURI)).href;
    document.documentElement.style.setProperty('--wp-url', `url("${base}")`);
  }

  function ensureWpLayer() {
    if (document.querySelector('.wp-bg')) return;
    const el = document.createElement('div');
    el.className = 'wp-bg';
    document.body.insertBefore(el, document.body.firstChild);
  }

  function initWallpaper() {
    ensureWpLayer();
    let chosen = null;
    try {
      const raw = localStorage.getItem(WP_KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj && obj.date === todayStr() && obj.name && WALLPAPERS.includes(obj.name)) {
          chosen = obj.name;
        }
      }
    } catch (e) {}
    if (!chosen) {
      chosen = pickWallpaperForToday();
      try { localStorage.setItem(WP_KEY, JSON.stringify({ date: todayStr(), name: chosen })); } catch (e) {}
    }
    applyWallpaper(chosen);

    // Clicar no relógio do today-panel cicla pra próxima
    const clock = document.getElementById('todayTime');
    if (clock) {
      clock.style.cursor = 'pointer';
      clock.title = 'Clique para trocar de wallpaper';
      clock.addEventListener('click', () => {
        let cur = chosen;
        const idx = WALLPAPERS.indexOf(cur);
        chosen = WALLPAPERS[(idx + 1) % WALLPAPERS.length];
        applyWallpaper(chosen);
        try { localStorage.setItem(WP_KEY, JSON.stringify({ date: todayStr(), name: chosen })); } catch (e) {}
      });
    }
  }

  // ── BOOTSTRAP ─────────────────────────────
  function boot() {
    window.__originalTitle = document.title;
    initWallpaper();
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
