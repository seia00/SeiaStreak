/* ═══════════════════════════════════════════════════
   SEIASTREAK — Productivity Protocol Module
   ═══════════════════════════════════════════════════ */

const ProductivityModule = (() => {

  let activeTab = 'tracker';

  // ── Render Entry Point ────────────────────────────
  function render() {
    renderCheckinForm();
    renderTabContent();
    updateStreakStats();
  }

  // ── Check-In Form ─────────────────────────────────
  function renderCheckinForm() {
    document.getElementById('checkinDate').textContent = formatDate(new Date());

    const settings = SS.getSettings();
    const cats = settings.categories || ['Study','Exercise','Sleep','Nutrition','Mindset'];
    const today = todayStr();
    const existing = SS.getCheckin(today);

    // Build category sliders
    const grid = document.getElementById('categoriesGrid');
    if (grid) {
      grid.innerHTML = cats.map(cat => {
        const saved = existing ? (existing.categories[cat] || 5) : 5;
        return `
          <div class="cat-item">
            <label>${cat}</label>
            <div class="cat-score-wrap">
              <input type="range" min="1" max="10" value="${saved}"
                class="cat-slider" data-cat="${cat}"
                oninput="this.nextElementSibling.textContent=this.value" />
              <span class="cat-score-num">${saved}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    // Overall score
    const overall = existing ? existing.overall : 5;
    const overallSlider = document.getElementById('overallScore');
    const scoreVal = document.getElementById('scoreValue');
    if (overallSlider) {
      overallSlider.value = overall;
      if (scoreVal) scoreVal.textContent = overall;
      overallSlider.oninput = function() {
        if (scoreVal) scoreVal.textContent = this.value;
      };
    }

    // Journal
    const journal = document.getElementById('journalInput');
    if (journal && existing) journal.value = existing.note || '';

    // Status
    const status = document.getElementById('checkinStatus');
    if (status) {
      if (existing) {
        status.textContent = `✓ Checked in today at score ${existing.overall}/10`;
        status.style.color = 'var(--success)';
      } else {
        status.textContent = '';
      }
    }
  }

  // ── Tab Switching ─────────────────────────────────
  function switchTab(tab) {
    activeTab = tab;
    ['tracker','heatmap','stats'].forEach(t => {
      const tabBtn = document.getElementById(`tab${t.charAt(0).toUpperCase()+t.slice(1)}`);
      const content = document.getElementById(`tab-${t}`);
      if (tabBtn) tabBtn.classList.toggle('active-tab', t === tab);
      if (content) content.classList.toggle('active', t === tab);
    });
    renderTabContent();
  }

  function renderTabContent() {
    if (activeTab === 'tracker') renderTracker();
    else if (activeTab === 'heatmap') renderHeatmap();
    else if (activeTab === 'stats') renderStats();
  }

  // ── Tracker Tab ───────────────────────────────────
  function renderTracker() {
    updateStreakStats();
    renderLogs();
  }

  function updateStreakStats() {
    const { current, longest, total } = SS.calcStreaks();
    document.getElementById('statCurrent') && (document.getElementById('statCurrent').textContent = current);
    document.getElementById('statLongest') && (document.getElementById('statLongest').textContent = longest);
    document.getElementById('statTotal') && (document.getElementById('statTotal').textContent = total);
    document.getElementById('sidebarStreak') && (document.getElementById('sidebarStreak').textContent = current);

    // Average score
    const checkins = SS.getCheckins();
    const scores = Object.values(checkins).map(c => c.overall).filter(Boolean);
    const avg = scores.length ? (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1) : '—';
    document.getElementById('statAvgScore') && (document.getElementById('statAvgScore').textContent = avg);
  }

  function renderLogs() {
    const checkins = SS.getCheckins();
    const { checkDates } = SS.calcStreaks();
    const dates = Object.keys(checkins).sort().reverse().slice(0, 30);
    const list = document.getElementById('logsList');
    if (!list) return;

    if (!dates.length) {
      list.innerHTML = '<div class="empty-state">No check-ins yet. Start today!</div>';
      return;
    }

    list.innerHTML = dates.map(ds => {
      const c = checkins[ds];
      const d = new Date(ds + 'T12:00:00');
      const inStreak = checkDates && checkDates.has(ds);
      const scoreColor = c.overall >= 8 ? 'var(--success)' : c.overall >= 5 ? 'var(--accent)' : 'var(--danger)';
      return `
        <div class="log-item">
          <span class="log-date">${formatDateShort(d)}</span>
          <span class="log-score" style="color:${scoreColor}">${c.overall}/10</span>
          <span class="log-note">${c.note || '—'}</span>
          ${inStreak ? '<span class="log-streak-mark" title="Part of streak">🔥</span>' : ''}
        </div>
      `;
    }).join('');
  }

  // ── Heatmap Tab ───────────────────────────────────
  function renderHeatmap() {
    const checkins = SS.getCheckins();
    const settings = SS.getSettings();
    const goal = settings.goalScore || 7;
    const grid = document.getElementById('heatmapGrid');
    if (!grid) return;

    // Show 52 weeks (364 days)
    const today = new Date();
    const start = new Date(today.getTime() - 363 * 86400000);
    // Align to Sunday
    const dayOffset = start.getDay();
    const realStart = new Date(start.getTime() - dayOffset * 86400000);

    let html = '';
    let d = new Date(realStart);

    for (let week = 0; week < 53; week++) {
      html += '<div class="heatmap-week">';
      for (let day = 0; day < 7; day++) {
        const ds = dateStr(d);
        const c = checkins[ds];
        let level = 0;
        if (c) {
          const score = c.overall;
          if (score >= goal) {
            if (score >= 9) level = 5;
            else if (score >= 8) level = 4;
            else if (score >= 7) level = 3;
            else if (score >= 6) level = 2;
            else level = 1;
          } else if (score > 0) level = 1;
        }
        const title = c ? `${ds}: ${c.overall}/10` : ds;
        html += `<div class="heatmap-cell" data-level="${level}" title="${title}"></div>`;
        d = new Date(d.getTime() + 86400000);
      }
      html += '</div>';
    }

    grid.innerHTML = html;

    // Legend
    const legendCells = document.querySelector('.legend-cells');
    if (legendCells) {
      legendCells.innerHTML = [0,1,2,3,4,5].map(l =>
        `<div class="heatmap-cell" data-level="${l}" style="width:13px;height:13px"></div>`
      ).join('');
    }
  }

  // ── Stats Tab ─────────────────────────────────────
  function renderStats() {
    renderBarChart();
    renderLineChart();
  }

  function renderBarChart() {
    const checkins = SS.getCheckins();
    const settings = SS.getSettings();
    const cats = settings.categories || [];
    const el = document.getElementById('barChart');
    if (!el) return;

    const catAvgs = {};
    cats.forEach(c => { catAvgs[c] = []; });

    Object.values(checkins).forEach(ci => {
      if (!ci.categories) return;
      Object.entries(ci.categories).forEach(([cat, val]) => {
        if (catAvgs[cat]) catAvgs[cat].push(val);
      });
    });

    el.innerHTML = cats.map(cat => {
      const vals = catAvgs[cat] || [];
      const avg = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length) : 0;
      const pct = (avg / 10 * 100).toFixed(0);
      return `
        <div class="bar-row">
          <span class="bar-name">${cat}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%"></div>
          </div>
          <span class="bar-val">${avg.toFixed(1)}</span>
        </div>
      `;
    }).join('') || '<div class="empty-state">No category data yet.</div>';
  }

  function renderLineChart() {
    const data = SS.avgScore(7);
    const days = ['S','M','T','W','T','F','S'];
    const el = document.getElementById('lineChart');
    if (!el) return;

    el.innerHTML = data.map((score, i) => {
      const d = new Date(Date.now() - (6 - i) * 86400000);
      const day = days[d.getDay()];
      const h = score ? Math.max(4, (score / 10) * 90) : 4;
      return `
        <div class="line-bar-wrap">
          <div class="line-bar" style="height:${h}px; opacity:${score ? 1 : 0.2}"></div>
          <span class="line-bar-label">${day}</span>
        </div>
      `;
    }).join('');
  }

  // ── Submit Check-In ───────────────────────────────
  function submitCheckin() {
    const overall = parseInt(document.getElementById('overallScore').value);
    const note = document.getElementById('journalInput').value.trim();
    const sliders = document.querySelectorAll('.cat-slider');
    const categories = {};
    sliders.forEach(s => { categories[s.dataset.cat] = parseInt(s.value); });

    const data = { overall, categories, note, ts: Date.now() };
    SS.setCheckin(todayStr(), data);

    // Update all displays
    renderCheckinForm();
    updateStreakStats();
    renderTracker();
    if (window.renderDashboard) renderDashboard();

    showToast(`Check-in saved! Score: ${overall}/10 🔥`);

    const { current } = SS.calcStreaks();
    if (current > 0 && current % 7 === 0) {
      setTimeout(() => showToast(`🏆 ${current} Day Streak! PLUS ULTRA!`, 4000), 1000);
    }
  }

  // ── Bind Buttons ──────────────────────────────────
  function bindButtons() {
    document.getElementById('submitCheckin')?.addEventListener('click', submitCheckin);

    document.getElementById('tabTracker')?.addEventListener('click', () => switchTab('tracker'));
    document.getElementById('tabHeatmap')?.addEventListener('click', () => switchTab('heatmap'));
    document.getElementById('tabStats')?.addEventListener('click', () => switchTab('stats'));

    // Overall score slider live update
    document.getElementById('overallScore')?.addEventListener('input', function() {
      document.getElementById('scoreValue').textContent = this.value;
    });
  }

  document.addEventListener('DOMContentLoaded', bindButtons);

  return { render };
})();
