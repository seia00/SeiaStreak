/* ═══════════════════════════════════════════════════
   SEIASTREAK — Main App v2
   Landing, Nav, Dashboard, Starfield, Theme, BG Config
   ═══════════════════════════════════════════════════ */

// ── Fandom Quotes ────────────────────────────────────
const QUOTES = [
  { text: "It's not about having time. It's about making time.", source: "— Hamilton (F1)" },
  { text: "Do or do not. There is no try.", source: "— Yoda, Star Wars" },
  { text: "Plus Ultra!", source: "— All Might, My Hero Academia" },
  { text: "I mustn't run away.", source: "— Shinji Ikari, Evangelion" },
  { text: "I see you.", source: "— Jake Sully, Avatar" },
  { text: "The first step is always the hardest.", source: "— Deku, My Hero Academia" },
  { text: "Your focus determines your reality.", source: "— Qui-Gon Jinn, Star Wars" },
  { text: "Whatever happens, happens.", source: "— Spike Spiegel, Cowboy Bebop" },
  { text: "A warrior never fears the storm — he becomes it.", source: "— Gundam Wing" },
  { text: "Hard work is the fastest road to the top.", source: "— Tenya Iida, MHA" },
  { text: "The Force will be with you. Always.", source: "— Obi-Wan Kenobi, Star Wars" },
  { text: "Believe in yourself. That's the Deku way.", source: "— My Hero Academia" },
  { text: "Every scar is a lesson learned at speed.", source: "— Formula 1 spirit" },
  { text: "On the battlefield of life, there are no shortcuts.", source: "— Gundam 00" },
  { text: "Eywa hears you. So does your future self.", source: "— Avatar: Pandora" },
  { text: "Pain is temporary. Greatness is permanent.", source: "— Racing proverb" },
  { text: "One lap at a time. One hour at a time.", source: "— F1 Strategy" },
  { text: "The path of a hero is paved with effort and scars.", source: "— MHA" },
  { text: "Speed is not just a number. It's a lifestyle.", source: "— Formula 1 lore" },
  { text: "Excellence is not a destination; it's a continuous journey.", source: "— Formula 1 ethos" },
];

let currentQuoteIdx = Math.floor(Math.random() * QUOTES.length);
function getQuote() { return QUOTES[currentQuoteIdx % QUOTES.length]; }
function nextQuote() {
  currentQuoteIdx = (currentQuoteIdx + 1) % QUOTES.length;
  return getQuote();
}

// ── Landing Page ─────────────────────────────────────
function initLanding() {
  const overlay = document.getElementById('landingOverlay');
  if (!overlay) return;

  // Check if already seen this session
  const seenToday = sessionStorage.getItem('seiastreak_landing_seen');
  if (seenToday) {
    overlay.remove();
    document.getElementById('appShell').style.opacity = '1';
    return;
  }

  document.getElementById('landingEnterBtn')?.addEventListener('click', () => {
    sessionStorage.setItem('seiastreak_landing_seen', 'true');
    overlay.classList.add('dismissed');

    setTimeout(() => {
      const shell = document.getElementById('appShell');
      shell.style.transition = 'opacity 0.6s ease';
      shell.style.opacity = '1';
    }, 200);

    setTimeout(() => overlay.remove(), 1000);
  });
}

// ── Starfield Canvas ─────────────────────────────────
let starfieldState = { count: 120, speedMult: 1.0 };
let _starfieldAnimId = null;

function initStarfield() {
  const canvas = document.getElementById('starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let stars = [];
  let W, H;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    stars = Array.from({ length: starfieldState.count }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.5 + 0.2,
      o: Math.random() * 0.5 + 0.2,
      speed: (Math.random() * 0.3 + 0.05) * starfieldState.speedMult,
      drift: (Math.random() - 0.5) * 0.1,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    stars.forEach(s => {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.o})`;
      ctx.fill();
      s.y += s.speed;
      s.x += s.drift;
      s.o += (Math.random() - 0.5) * 0.02;
      s.o = Math.max(0.1, Math.min(0.8, s.o));
      if (s.y > H) { s.y = -2; s.x = Math.random() * W; }
      if (s.x < 0 || s.x > W) { s.x = Math.random() * W; }
    });
    _starfieldAnimId = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();

  window._reinitStarfield = () => {
    if (_starfieldAnimId) cancelAnimationFrame(_starfieldAnimId);
    resize();
    draw();
  };
}

function updateStarfield(count, speedMult) {
  starfieldState.count = count;
  starfieldState.speedMult = speedMult;
  if (window._reinitStarfield) window._reinitStarfield();
}

// ── Navigation (smooth transitions) ──────────────────
function initNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.section));
  });
}

function navigateTo(section) {
  const allSections = document.querySelectorAll('.section');
  const target = document.getElementById(`section-${section}`);
  if (!target) return;

  // Update nav
  document.querySelectorAll('.nav-item').forEach(i =>
    i.classList.toggle('active', i.dataset.section === section)
  );

  // Outgoing: add leaving class
  allSections.forEach(s => {
    if (s.classList.contains('active') && s !== target) {
      s.classList.remove('active');
      s.classList.add('leaving');
      setTimeout(() => s.classList.remove('leaving'), 400);
    } else if (s !== target) {
      s.classList.remove('active', 'leaving');
    }
  });

  // Incoming
  requestAnimationFrame(() => {
    target.classList.add('active');
  });

  // Scroll to top
  document.querySelector('.main-content').scrollTop = 0;

  // Render section content
  if (section === 'dashboard') renderDashboard();
  if (section === 'calendar') window.CalendarModule && CalendarModule.render();
  if (section === 'productivity') window.ProductivityModule && ProductivityModule.render();
  if (section === 'settings') renderSettings();
}

// ── Theme ─────────────────────────────────────────────
function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  SS.setTheme(theme);
  document.querySelectorAll('.theme-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.theme === theme)
  );
}

// ── Light/Dark Mode ──────────────────────────────────
function applyMode(mode) {
  document.body.setAttribute('data-mode', mode);
  SS.setMode(mode);
  const icon = document.getElementById('modeIcon');
  if (icon) icon.textContent = mode === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19';
}

function toggleMode() {
  applyMode(SS.getMode() === 'dark' ? 'light' : 'dark');
}

// ── Background Config ────────────────────────────────
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function applyBgConfig(config) {
  const bgLayer = document.getElementById('bgLayer');
  if (!bgLayer) return;
  bgLayer.setAttribute('data-orb-shape', config.shape || 'circle');
  bgLayer.setAttribute('data-orb-size', config.size || 'medium');
  bgLayer.setAttribute('data-orb-speed', config.speed || 'normal');

  // Custom colors
  const orb1 = document.querySelector('#bgLayer .orb1');
  const orb2 = document.querySelector('#bgLayer .orb2');
  const orb3 = document.querySelector('#bgLayer .orb3');
  if (config.color1 && orb1) orb1.style.background = hexToRgba(config.color1, 0.35);
  else if (orb1) orb1.style.background = '';
  if (config.color2 && orb2) orb2.style.background = hexToRgba(config.color2, 0.25);
  else if (orb2) orb2.style.background = '';
  if (config.color3 && orb3) orb3.style.background = hexToRgba(config.color3, 0.2);
  else if (orb3) orb3.style.background = '';

  updateStarfield(config.starCount || 120, config.starSpeed || 1.0);
}

function resetOrbColors() {
  const config = SS.getBgConfig();
  config.color1 = null;
  config.color2 = null;
  config.color3 = null;
  SS.setBgConfig(config);
  document.querySelector('#bgLayer .orb1').style.background = '';
  document.querySelector('#bgLayer .orb2').style.background = '';
  document.querySelector('#bgLayer .orb3').style.background = '';
  showToast('Orb colors reset to theme defaults.');
  renderBgSettings();
}

// ── Toast ─────────────────────────────────────────────
function showToast(msg, duration = 2500) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ── Dashboard ─────────────────────────────────────────
function renderDashboard() {
  document.getElementById('dashDate').textContent = formatDate(new Date());
  const ci = document.getElementById('checkinDate');
  if (ci) ci.textContent = formatDate(new Date());

  // Streak
  const { current } = SS.calcStreaks();
  document.getElementById('dashStreakNum').textContent = current;
  document.getElementById('sidebarStreak').textContent = current;

  const flames = document.getElementById('streakFlames');
  if (flames) flames.innerHTML = current > 0 ? '\uD83D\uDD25'.repeat(Math.min(current, 7)) : '\uD83D\uDCA4';

  const msgEl = document.getElementById('streakMessage');
  if (msgEl) {
    if (current === 0) msgEl.textContent = 'Start your streak today!';
    else if (current < 3) msgEl.textContent = `${current} days strong \u2014 keep pushing!`;
    else if (current < 7) msgEl.textContent = `${current} days! You're on fire!`;
    else if (current < 14) msgEl.textContent = `${current} days! Incredible dedication!`;
    else if (current < 30) msgEl.textContent = `${current} days! PLUS ULTRA!`;
    else msgEl.textContent = `${current} days! LEGENDARY HERO STATUS!`;
  }

  // Today's schedule
  const today = todayStr();
  const events = SS.getEvents(today);
  const schedEl = document.getElementById('todaySchedule');
  if (schedEl) {
    if (!events.length) {
      schedEl.innerHTML = '<div class="empty-state">No events today. Add via Calendar \u2192</div>';
    } else {
      const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start));
      schedEl.innerHTML = sorted.map(ev => `
        <div class="schedule-item cat-${ev.category}">
          <span class="item-time">${formatTime(ev.start)} \u2013 ${formatTime(ev.end)}</span>
          <span class="item-title">${ev.title}</span>
        </div>
      `).join('');
    }
  }

  // Weekly bars
  const weeklyData = SS.avgScore(7);
  const days = ['S','M','T','W','T','F','S'];
  const ringsEl = document.getElementById('weeklyRings');
  if (ringsEl) {
    ringsEl.innerHTML = weeklyData.map((score, i) => {
      const d = new Date(Date.now() - (6 - i) * 86400000);
      const day = days[d.getDay()];
      const pct = score ? (score / 10 * 100) : 0;
      return `
        <div class="week-bar-wrap">
          <div class="week-bar" style="height:60px">
            <div class="week-bar-fill" style="height:${pct}%"></div>
          </div>
          <div class="week-bar-label">${day}</div>
        </div>
      `;
    }).join('');
  }

  const validScores = weeklyData.filter(s => s !== null);
  const avg = validScores.length ? (validScores.reduce((a,b)=>a+b,0)/validScores.length).toFixed(1) : '\u2014';
  const weekAvg = document.getElementById('weekAvg');
  if (weekAvg) weekAvg.textContent = `Weekly Avg: ${avg}/10`;

  // Quote
  const q = getQuote();
  const dq = document.getElementById('dailyQuote');
  const qs = document.getElementById('quoteSource');
  if (dq) dq.textContent = `\u201C${q.text}\u201D`;
  if (qs) qs.textContent = q.source;

  renderGoals();
  renderUpcoming();
}

function renderGoals() {
  const goals = SS.getGoals();
  const list = document.getElementById('goalsList');
  if (!list) return;
  if (!goals.length) {
    list.innerHTML = '<div class="empty-state">No goals yet. Add one!</div>';
    return;
  }
  list.innerHTML = goals.map(g => `
    <li class="goal-item">
      <span class="goal-check" onclick="toggleGoal('${g.id}')">${g.done ? '\u2705' : '\u2B55'}</span>
      <span class="goal-text ${g.done ? 'done' : ''}">${g.text} <small style="opacity:.5">(${g.type})</small></span>
      <span class="goal-del" onclick="deleteGoal('${g.id}')">\u2715</span>
    </li>
  `).join('');
}

function renderUpcoming() {
  const allEvents = SS.getAllEvents();
  const today = new Date();
  const upcoming = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    const ds = dateStr(d);
    (allEvents[ds] || []).forEach(ev => upcoming.push({ date: d, ds, ev }));
  }
  const el = document.getElementById('upcomingList');
  if (!el) return;
  if (!upcoming.length) {
    el.innerHTML = '<div class="empty-state">No upcoming events</div>';
    return;
  }
  el.innerHTML = upcoming.slice(0, 8).map(({ date, ev }) => `
    <div class="upcoming-item">
      <div class="upcoming-date">${formatDateShort(date)}</div>
      <div class="upcoming-title">${ev.title}</div>
      <div style="font-size:.7rem;color:var(--text-muted)">${formatTime(ev.start)}</div>
    </div>
  `).join('');
}

function toggleGoal(id) {
  const goals = SS.getGoals();
  const g = goals.find(x => x.id === id);
  if (g) { g.done = !g.done; SS.setGoals(goals); renderGoals(); }
}

function deleteGoal(id) {
  SS.setGoals(SS.getGoals().filter(g => g.id !== id));
  renderGoals();
}

// ── Settings ──────────────────────────────────────────
function renderSettings() {
  const settings = SS.getSettings();
  document.getElementById('goalScore').value = settings.goalScore;
  document.getElementById('focusDuration').value = settings.focusDuration;
  document.getElementById('shortBreak').value = settings.shortBreak;
  document.getElementById('longBreak').value = settings.longBreak;

  const cats = settings.categories || [];
  const catTags = document.getElementById('catTags');
  if (catTags) {
    catTags.innerHTML = cats.map(c =>
      `<span class="cat-tag" onclick="removeCategory('${c}')" title="Click to remove">${c}</span>`
    ).join('');
  }

  applyTheme(SS.getTheme());
  renderBgSettings();
}

function renderBgSettings() {
  const config = SS.getBgConfig();

  // Toggle buttons
  setToggleGroup('orbShapeGroup', config.shape || 'circle');
  setToggleGroup('orbSizeGroup', config.size || 'medium');
  setToggleGroup('orbSpeedGroup', config.speed || 'normal');

  // Sliders
  const starCount = document.getElementById('starCountSlider');
  const starSpeed = document.getElementById('starSpeedSlider');
  if (starCount) { starCount.value = config.starCount || 120; }
  if (starSpeed) { starSpeed.value = (config.starSpeed || 1.0) * 10; }
  const scv = document.getElementById('starCountVal');
  const ssv = document.getElementById('starSpeedVal');
  if (scv) scv.textContent = config.starCount || 120;
  if (ssv) ssv.textContent = (config.starSpeed || 1.0).toFixed(1);

  // Color pickers (show current or theme defaults)
  const colors = getThemeDefaultColors();
  document.getElementById('orbColor1').value = config.color1 || colors[0];
  document.getElementById('orbColor2').value = config.color2 || colors[1];
  document.getElementById('orbColor3').value = config.color3 || colors[2];
}

function setToggleGroup(groupId, activeVal) {
  const group = document.getElementById(groupId);
  if (!group) return;
  group.querySelectorAll('.toggle-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.val === activeVal)
  );
}

function getThemeDefaultColors() {
  const theme = SS.getTheme();
  const map = {
    evangelion: ['#7c3aed', '#06b6d4', '#8b5cf6'],
    f1: ['#e10600', '#c0c0c0', '#ff6b35'],
    starwars: ['#4fc3f7', '#ffd700', '#4fc3f7'],
    southpark: ['#2196f3', '#ff9800', '#4caf50'],
    mha: ['#22c55e', '#ef4444', '#84cc16'],
    avatar: ['#06b6d4', '#10b981', '#a78bfa'],
    gundam: ['#3b82f6', '#ef4444', '#f59e0b'],
  };
  return map[theme] || map.evangelion;
}

function removeCategory(cat) {
  const s = SS.getSettings();
  s.categories = s.categories.filter(c => c !== cat);
  SS.setSettings(s);
  renderSettings();
}

// ── Bind Buttons ──────────────────────────────────────
function bindButtons() {
  // Check-in shortcut
  document.getElementById('checkInBtn')?.addEventListener('click', () => navigateTo('productivity'));

  // Goal modal
  document.getElementById('addGoalBtn')?.addEventListener('click', () => {
    document.getElementById('goalModal').style.display = 'flex';
    document.getElementById('goalText').focus();
  });
  document.getElementById('closeGoalModal')?.addEventListener('click', () => {
    document.getElementById('goalModal').style.display = 'none';
  });
  document.getElementById('cancelGoal')?.addEventListener('click', () => {
    document.getElementById('goalModal').style.display = 'none';
  });
  document.getElementById('saveGoal')?.addEventListener('click', () => {
    const text = document.getElementById('goalText').value.trim();
    const type = document.getElementById('goalType').value;
    if (!text) return;
    const goals = SS.getGoals();
    goals.push({ id: genId(), text, type, done: false, created: todayStr() });
    SS.setGoals(goals);
    document.getElementById('goalText').value = '';
    document.getElementById('goalModal').style.display = 'none';
    renderGoals();
    showToast('Goal added!');
  });

  // Theme buttons
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.theme);
      showToast(`Theme: ${btn.querySelector('span').textContent} activated!`);
    });
  });

  // Mode toggle
  document.getElementById('modeToggle')?.addEventListener('click', toggleMode);

  // Save settings
  document.getElementById('saveSettings')?.addEventListener('click', () => {
    const s = SS.getSettings();
    s.goalScore = parseInt(document.getElementById('goalScore').value) || 7;
    s.focusDuration = parseInt(document.getElementById('focusDuration').value) || 25;
    s.shortBreak = parseInt(document.getElementById('shortBreak').value) || 5;
    s.longBreak = parseInt(document.getElementById('longBreak').value) || 15;
    SS.setSettings(s);
    showToast('Settings saved!');
    if (window.StudyModule) StudyModule.applySettings();
  });

  // Add category
  document.getElementById('addCatBtn')?.addEventListener('click', () => {
    const cat = prompt('New category name:');
    if (!cat || !cat.trim()) return;
    const s = SS.getSettings();
    if (!s.categories.includes(cat.trim())) {
      s.categories.push(cat.trim());
      SS.setSettings(s);
      renderSettings();
    }
  });

  // Background settings
  bindBgSettings();

  // Modal close on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.style.display = 'none';
    });
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
    }
  });
}

function bindBgSettings() {
  // Toggle groups
  ['orbShapeGroup', 'orbSizeGroup', 'orbSpeedGroup'].forEach(groupId => {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        saveBgConfig();
      });
    });
  });

  // Star count slider
  document.getElementById('starCountSlider')?.addEventListener('input', function() {
    document.getElementById('starCountVal').textContent = this.value;
    saveBgConfig();
  });

  // Star speed slider
  document.getElementById('starSpeedSlider')?.addEventListener('input', function() {
    const val = (this.value / 10).toFixed(1);
    document.getElementById('starSpeedVal').textContent = val;
    saveBgConfig();
  });

  // Color pickers
  ['orbColor1', 'orbColor2', 'orbColor3'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => saveBgConfig());
  });

  // Reset colors
  document.getElementById('resetOrbColors')?.addEventListener('click', resetOrbColors);
}

function saveBgConfig() {
  const config = {
    shape: document.querySelector('#orbShapeGroup .toggle-btn.active')?.dataset.val || 'circle',
    size: document.querySelector('#orbSizeGroup .toggle-btn.active')?.dataset.val || 'medium',
    speed: document.querySelector('#orbSpeedGroup .toggle-btn.active')?.dataset.val || 'normal',
    starCount: parseInt(document.getElementById('starCountSlider')?.value) || 120,
    starSpeed: (parseInt(document.getElementById('starSpeedSlider')?.value) || 10) / 10,
    color1: document.getElementById('orbColor1')?.value || null,
    color2: document.getElementById('orbColor2')?.value || null,
    color3: document.getElementById('orbColor3')?.value || null,
  };

  // Check if colors match theme defaults (if so, store null)
  const defaults = getThemeDefaultColors();
  if (config.color1 === defaults[0]) config.color1 = null;
  if (config.color2 === defaults[1]) config.color2 = null;
  if (config.color3 === defaults[2]) config.color3 = null;

  SS.setBgConfig(config);
  applyBgConfig(config);
}

// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Apply saved theme and mode
  applyTheme(SS.getTheme());
  applyMode(SS.getMode());

  // Apply saved bg config
  const bgConfig = SS.getBgConfig();
  starfieldState.count = bgConfig.starCount || 120;
  starfieldState.speedMult = bgConfig.starSpeed || 1.0;

  // Init landing
  initLanding();

  // Init starfield
  initStarfield();

  // Apply bg config (orbs)
  applyBgConfig(bgConfig);

  // Init nav
  initNav();

  // Bind buttons
  bindButtons();

  // Initial render
  renderDashboard();

  // Update time every minute
  setInterval(() => {
    const dashDate = document.getElementById('dashDate');
    if (dashDate) dashDate.textContent = formatDate(new Date());
  }, 60000);
});
