/* ═══════════════════════════════════════════════════
   SEIASTREAK — Storage Layer
   ═══════════════════════════════════════════════════ */

const SS = {
  PREFIX: 'seiastreak_',

  get(key, fallback = null) {
    try {
      const val = localStorage.getItem(this.PREFIX + key);
      return val !== null ? JSON.parse(val) : fallback;
    } catch { return fallback; }
  },

  set(key, val) {
    try { localStorage.setItem(this.PREFIX + key, JSON.stringify(val)); }
    catch (e) { console.warn('Storage write failed:', e); }
  },

  remove(key) { localStorage.removeItem(this.PREFIX + key); },

  // ── Defaults ────────────────────────────────────
  DEFAULTS: {
    theme: 'evangelion',
    settings: {
      goalScore: 7,
      focusDuration: 25,
      shortBreak: 5,
      longBreak: 15,
      categories: ['Study', 'Exercise', 'Sleep', 'Nutrition', 'Mindset']
    },
    goals: [],
    events: {},       // { 'YYYY-MM-DD': [{ id, title, start, end, category, notes }] }
    presets: {        // { 0: [...], 1: [...], ... } day of week
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
    },
    checkins: {},     // { 'YYYY-MM-DD': { overall, categories: {}, note, ts } }
    sessionTasks: [], // [{ id, text, done }]
    pomCount: 0,
    studyTime: 0,     // minutes today
    mode: 'dark',     // 'dark' | 'light'
    bgConfig: {
      shape: 'circle',       // 'circle' | 'blob' | 'square'
      size: 'medium',        // 'small' | 'medium' | 'large'
      speed: 'normal',       // 'slow' | 'normal' | 'fast'
      color1: null,          // null = use theme default
      color2: null,
      color3: null,
      starCount: 120,        // 50-200
      starSpeed: 1.0         // 0.5-2.0
    },
    spotifyUrl: '',   // last used spotify embed url
  },

  getSettings() { return this.get('settings', this.DEFAULTS.settings); },
  setSettings(s) { this.set('settings', s); },

  getTheme() { return this.get('theme', this.DEFAULTS.theme); },
  setTheme(t) { this.set('theme', t); },

  getMode() { return this.get('mode', 'dark'); },
  setMode(m) { this.set('mode', m); },

  getBgConfig() { return this.get('bgConfig', this.DEFAULTS.bgConfig); },
  setBgConfig(c) { this.set('bgConfig', c); },

  getSpotifyUrl() { return this.get('spotifyUrl', ''); },
  setSpotifyUrl(u) { this.set('spotifyUrl', u); },

  getGoals() { return this.get('goals', []); },
  setGoals(g) { this.set('goals', g); },

  getEvents(dateStr) {
    const all = this.get('events', {});
    return all[dateStr] || [];
  },
  setEvents(dateStr, evts) {
    const all = this.get('events', {});
    all[dateStr] = evts;
    this.set('events', all);
  },
  getAllEvents() { return this.get('events', {}); },

  getPresets() { return this.get('presets', this.DEFAULTS.presets); },
  setPresets(p) { this.set('presets', p); },
  getPreset(dayOfWeek) {
    const p = this.getPresets();
    return p[dayOfWeek] || [];
  },
  setPreset(dayOfWeek, events) {
    const p = this.getPresets();
    p[dayOfWeek] = events;
    this.setPresets(p);
  },

  getCheckins() { return this.get('checkins', {}); },
  getCheckin(dateStr) {
    const all = this.getCheckins();
    return all[dateStr] || null;
  },
  setCheckin(dateStr, data) {
    const all = this.getCheckins();
    all[dateStr] = data;
    this.set('checkins', all);
  },

  getSessionTasks() { return this.get('sessionTasks', []); },
  setSessionTasks(t) { this.set('sessionTasks', t); },

  getPomCount(dateStr) {
    const all = this.get('pomCounts', {});
    return all[dateStr] || 0;
  },
  setPomCount(dateStr, n) {
    const all = this.get('pomCounts', {});
    all[dateStr] = n;
    this.set('pomCounts', all);
  },

  getStudyTime(dateStr) {
    const all = this.get('studyTimes', {});
    return all[dateStr] || 0;
  },
  addStudyTime(dateStr, minutes) {
    const all = this.get('studyTimes', {});
    all[dateStr] = (all[dateStr] || 0) + minutes;
    this.set('studyTimes', all);
  },

  // ── Streak Calculation ───────────────────────────
  calcStreaks() {
    const checkins = this.getCheckins();
    const settings = this.getSettings();
    const goal = settings.goalScore || 7;
    const dates = Object.keys(checkins).sort();
    if (!dates.length) return { current: 0, longest: 0, total: dates.length };

    let current = 0, longest = 0, temp = 0;
    const today = dateStr(new Date());
    const yesterday = dateStr(new Date(Date.now() - 86400000));

    // Calculate consecutive streak backwards from today
    const checkDates = new Set(dates.filter(d => checkins[d] && checkins[d].overall >= goal));

    // Build current streak (must include today or yesterday)
    let d = new Date();
    if (!checkDates.has(today)) d = new Date(Date.now() - 86400000);
    if (!checkDates.has(dateStr(d))) {
      current = 0;
    } else {
      while (checkDates.has(dateStr(d))) {
        current++;
        d = new Date(d.getTime() - 86400000);
      }
    }

    // Calculate longest streak
    let streak = 0;
    let prev = null;
    for (const dt of dates) {
      if (!checkins[dt] || checkins[dt].overall < goal) { streak = 0; prev = null; continue; }
      if (!prev) { streak = 1; }
      else {
        const diff = (new Date(dt) - new Date(prev)) / 86400000;
        if (diff === 1) streak++;
        else streak = 1;
      }
      longest = Math.max(longest, streak);
      prev = dt;
    }

    return { current, longest, total: dates.length, checkDates };
  },

  // ── Average Score ────────────────────────────────
  avgScore(days = 7) {
    const checkins = this.getCheckins();
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const ds = dateStr(d);
      result.push(checkins[ds] ? checkins[ds].overall : null);
    }
    return result;
  }
};

// ── Utility: date string YYYY-MM-DD ─────────────────
function dateStr(d) {
  return d.toISOString().split('T')[0];
}

function todayStr() { return dateStr(new Date()); }

function formatDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatDateShort(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(timeStr) {
  // "14:30" → "2:30 PM"
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2,'0')} ${ampm}`;
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
