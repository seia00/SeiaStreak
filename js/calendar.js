/* ═══════════════════════════════════════════════════
   SEIASTREAK — Calendar Module v2
   Intuitive inline preset system
   ═══════════════════════════════════════════════════ */

const CalendarModule = (() => {
  let currentYear = new Date().getFullYear();
  let currentMonth = new Date().getMonth();
  let selectedDate = null;
  let editingEventId = null;
  let presetDayActive = 0;

  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const CAT_EMOJI = { study:'\uD83D\uDCDA', exercise:'\uD83D\uDCAA', school:'\uD83C\uDFEB', personal:'\uD83C\uDFAE', sleep:'\uD83D\uDE34', meal:'\uD83C\uDF5C' };

  // ── Render Month Grid ─────────────────────────────
  function renderMonth() {
    document.getElementById('calMonthLabel').textContent = `${MONTHS[currentMonth]} ${currentYear}`;

    const grid = document.getElementById('calGrid');
    const allEvents = SS.getAllEvents();
    const checkins = SS.getCheckins();
    const today = todayStr();

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrev = new Date(currentYear, currentMonth, 0).getDate();

    let cells = '';

    // Prev month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrev - i;
      cells += `<div class="cal-cell other-month">${day}</div>`;
    }

    // Current month
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(currentYear, currentMonth, day);
      const ds = dateStr(d);
      const isToday = ds === today;
      const isSel = selectedDate && dateStr(selectedDate) === ds;
      const hasEvents = (allEvents[ds] || []).length > 0;
      const checkedIn = !!checkins[ds];

      let cls = 'cal-cell';
      if (isToday) cls += ' today';
      if (isSel) cls += ' selected';
      if (hasEvents) cls += ' has-events';
      if (checkedIn) cls += ' checked-in';

      cells += `<div class="${cls}" data-date="${ds}">${day}</div>`;
    }

    // Fill remaining
    const total = firstDay + daysInMonth;
    const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let i = 1; i <= remaining; i++) {
      cells += `<div class="cal-cell other-month">${i}</div>`;
    }

    grid.innerHTML = cells;

    // Bind cell clicks
    grid.querySelectorAll('.cal-cell:not(.other-month)').forEach(cell => {
      cell.addEventListener('click', () => {
        const ds = cell.dataset.date;
        selectedDate = new Date(ds + 'T12:00:00');
        renderMonth();
        renderDayPanel(ds);
      });
    });

    // If selected date is in this month, show its panel
    if (selectedDate) {
      const selY = selectedDate.getFullYear(), selM = selectedDate.getMonth();
      if (selY === currentYear && selM === currentMonth) {
        renderDayPanel(dateStr(selectedDate));
      }
    }
  }

  // ── Render Day Panel (v2 with inline presets) ─────
  function renderDayPanel(ds) {
    const d = new Date(ds + 'T12:00:00');
    const dow = d.getDay();
    const dayName = DAY_NAMES[dow];
    const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    document.getElementById('dayPanelDate').textContent = label;

    const events = SS.getEvents(ds);
    const preset = SS.getPreset(dow);
    const timeline = document.getElementById('dayTimeline');

    // Preset indicator bar
    const indicator = document.getElementById('presetIndicator');
    const badge = document.getElementById('presetBadge');
    if (preset.length > 0) {
      indicator.style.display = 'block';
      badge.textContent = `${dayName} Preset: ${preset.length} event${preset.length !== 1 ? 's' : ''}`;
    } else {
      indicator.style.display = 'none';
    }

    // Apply Preset CTA (only if no events & preset exists)
    const cta = document.getElementById('presetApplyCta');
    const ctaBtn = document.getElementById('applyPresetCta');
    if (!events.length && preset.length > 0) {
      cta.style.display = 'block';
      ctaBtn.textContent = `Apply ${dayName} Preset (${preset.length} events)`;
    } else {
      cta.style.display = 'none';
    }

    // Timeline content
    if (!events.length) {
      timeline.innerHTML = '<div class="empty-state">No events scheduled.</div>';
    } else {
      const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start));
      timeline.innerHTML = sorted.map(ev => `
        <div class="timeline-item cat-${ev.category}" data-id="${ev.id}" style="border-left-color:${catColor(ev.category)}">
          <div class="timeline-time">${formatTime(ev.start)}<br/><span style="color:var(--text-muted);font-size:.65rem">${formatTime(ev.end)}</span></div>
          <div class="timeline-info">
            <div class="timeline-title">${CAT_EMOJI[ev.category] || ''} ${ev.title}</div>
            ${ev.notes ? `<div class="timeline-notes">${ev.notes}</div>` : ''}
          </div>
          <span class="timeline-del" onclick="CalendarModule.deleteEvent('${ds}','${ev.id}')">\u2715</span>
        </div>
      `).join('');
    }

    // Save as Preset footer (only if day has events)
    const footer = document.getElementById('dayPanelFooter');
    if (footer) footer.style.display = events.length > 0 ? 'block' : 'none';

    // Hide preset inline editor by default when switching days
    const inline = document.getElementById('presetInline');
    if (inline) inline.style.display = 'none';
  }

  function catColor(cat) {
    const map = {
      study: 'var(--accent)', exercise: 'var(--accent3)',
      school: 'var(--accent2)', personal: '#f59e0b',
      sleep: '#6366f1', meal: '#f97316'
    };
    return map[cat] || 'var(--accent)';
  }

  // ── Inline Preset Functions ───────────────────────
  function renderPresetEvents(dayIdx) {
    const events = SS.getPreset(dayIdx);
    const container = document.getElementById('presetEvents');
    if (!container) return;
    if (!events.length) {
      container.innerHTML = '<div class="empty-state">No preset events. Add some!</div>';
      return;
    }
    const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start));
    container.innerHTML = sorted.map(ev => `
      <div class="preset-event-item">
        <span style="color:var(--text-muted);font-size:.75rem;min-width:80px">${formatTime(ev.start)}\u2013${formatTime(ev.end)}</span>
        <span style="flex:1">${CAT_EMOJI[ev.category] || ''} ${ev.title}</span>
        <span class="preset-event-del" onclick="CalendarModule.deletePresetEvent(${dayIdx},'${ev.id}')">\u2715</span>
      </div>
    `).join('');
  }

  function togglePresetInline() {
    const inline = document.getElementById('presetInline');
    const isVisible = inline.style.display !== 'none';
    inline.style.display = isVisible ? 'none' : 'block';

    if (!isVisible && selectedDate) {
      const dow = selectedDate.getDay();
      document.getElementById('presetInlineTitle').textContent = `${DAY_NAMES[dow]} Preset`;
      presetDayActive = dow;
      renderPresetEvents(dow);
    }
  }

  function saveAsPreset() {
    if (!selectedDate) return;
    const ds = dateStr(selectedDate);
    const dow = selectedDate.getDay();
    const events = SS.getEvents(ds);
    if (!events.length) { showToast('No events to save as preset.'); return; }

    const presetEvents = events.map(e => ({
      id: genId(), title: e.title, start: e.start, end: e.end,
      category: e.category, notes: e.notes || ''
    }));

    SS.setPreset(dow, presetEvents);
    renderDayPanel(ds);
    showToast(`Saved as ${DAY_NAMES[dow]} preset! (${presetEvents.length} events)`);
  }

  function applyPresetFromCta() {
    if (!selectedDate) return;
    const ds = dateStr(selectedDate);
    const dow = selectedDate.getDay();
    const preset = SS.getPreset(dow);
    if (!preset.length) return;

    const existing = SS.getEvents(ds);
    const newEvts = preset.map(e => ({ ...e, id: genId() }));
    SS.setEvents(ds, [...existing, ...newEvts]);
    renderDayPanel(ds);
    renderMonth();
    if (window.renderDashboard) renderDashboard();
    showToast(`Applied ${DAY_NAMES[dow]} preset! (${newEvts.length} events)`);
  }

  // ── Public API ────────────────────────────────────
  function render() { renderMonth(); }

  function deleteEvent(ds, id) {
    const events = SS.getEvents(ds).filter(e => e.id !== id);
    SS.setEvents(ds, events);
    renderDayPanel(ds);
    renderMonth();
    if (window.renderDashboard) renderDashboard();
    showToast('Event removed.');
  }

  function deletePresetEvent(dayIdx, id) {
    const events = SS.getPreset(dayIdx).filter(e => e.id !== id);
    SS.setPreset(dayIdx, events);
    renderPresetEvents(dayIdx);
    // Also update the day panel indicator
    if (selectedDate) renderDayPanel(dateStr(selectedDate));
  }

  function openEventModal(ds, isPreset) {
    const modal = document.getElementById('eventModal');
    modal.dataset.mode = isPreset ? 'preset' : 'day';
    modal.dataset.date = ds || '';
    editingEventId = null;

    const title = isPreset
      ? `Add to ${DAY_NAMES[presetDayActive]} Preset`
      : `Add Event \u2014 ${ds ? formatDateShort(new Date(ds + 'T12:00:00')) : ''}`;
    document.getElementById('eventModalTitle').textContent = title;
    document.getElementById('eventTitle').value = '';
    document.getElementById('eventStart').value = '08:00';
    document.getElementById('eventEnd').value = '09:00';
    document.getElementById('eventCategory').value = 'study';
    document.getElementById('eventNotes').value = '';
    modal.style.display = 'flex';
    document.getElementById('eventTitle').focus();
  }

  // ── Bind Buttons ──────────────────────────────────
  function bindButtons() {
    // Month navigation
    document.getElementById('calPrev')?.addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      renderMonth();
    });
    document.getElementById('calNext')?.addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      renderMonth();
    });

    // Add event
    document.getElementById('addEventBtn')?.addEventListener('click', () => {
      if (!selectedDate) { showToast('Select a day first!'); return; }
      openEventModal(dateStr(selectedDate), false);
    });

    // Save as preset
    document.getElementById('saveAsPresetBtn')?.addEventListener('click', saveAsPreset);

    // Preset inline toggle
    document.getElementById('presetToggleBtn')?.addEventListener('click', togglePresetInline);
    document.getElementById('closePresetInline')?.addEventListener('click', () => {
      document.getElementById('presetInline').style.display = 'none';
    });

    // Apply preset CTA
    document.getElementById('applyPresetCta')?.addEventListener('click', applyPresetFromCta);

    // Add preset event
    document.getElementById('addPresetEventBtn')?.addEventListener('click', () => {
      if (selectedDate) presetDayActive = selectedDate.getDay();
      openEventModal(null, true);
    });

    // Event modal
    document.getElementById('closeEventModal')?.addEventListener('click', () => {
      document.getElementById('eventModal').style.display = 'none';
      editingEventId = null;
    });
    document.getElementById('cancelEvent')?.addEventListener('click', () => {
      document.getElementById('eventModal').style.display = 'none';
      editingEventId = null;
    });
    document.getElementById('saveEvent')?.addEventListener('click', () => {
      const title = document.getElementById('eventTitle').value.trim();
      const start = document.getElementById('eventStart').value;
      const end = document.getElementById('eventEnd').value;
      const category = document.getElementById('eventCategory').value;
      const notes = document.getElementById('eventNotes').value.trim();
      if (!title || !start || !end) { showToast('Fill in all required fields.'); return; }
      if (start >= end) { showToast('End time must be after start time.'); return; }

      const isPreset = document.getElementById('eventModal').dataset.mode === 'preset';
      const ds = document.getElementById('eventModal').dataset.date;
      const event = { id: editingEventId || genId(), title, start, end, category, notes };

      if (isPreset) {
        const events = SS.getPreset(presetDayActive);
        if (editingEventId) {
          const idx = events.findIndex(e => e.id === editingEventId);
          if (idx !== -1) events[idx] = event;
        } else {
          events.push(event);
        }
        SS.setPreset(presetDayActive, events);
        renderPresetEvents(presetDayActive);
        if (selectedDate) renderDayPanel(dateStr(selectedDate));
        showToast('Preset event saved!');
      } else {
        const events = SS.getEvents(ds);
        if (editingEventId) {
          const idx = events.findIndex(e => e.id === editingEventId);
          if (idx !== -1) events[idx] = event;
        } else {
          events.push(event);
        }
        SS.setEvents(ds, events);
        renderDayPanel(ds);
        renderMonth();
        if (window.renderDashboard) renderDashboard();
        showToast(`Event "${title}" saved!`);
      }

      document.getElementById('eventModal').style.display = 'none';
      editingEventId = null;
      document.getElementById('eventTitle').value = '';
      document.getElementById('eventNotes').value = '';
    });
  }

  document.addEventListener('DOMContentLoaded', bindButtons);

  return { render, deleteEvent, deletePresetEvent, openEventModal, saveAsPreset };
})();
