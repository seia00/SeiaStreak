/* ═══════════════════════════════════════════════════
   SEIASTREAK — Study / Cafe Mode v2
   Spotify embed, SVG timer ring, immersive 2-column
   ═══════════════════════════════════════════════════ */

const StudyModule = (() => {

  // ── State ─────────────────────────────────────────
  let timerInterval = null;
  let timerSeconds = 25 * 60;
  let timerMode = 'focus';
  let timerRunning = false;
  let currentSound = 'cafe';
  let audioCtx = null;
  let soundNodes = [];
  let pomodorosToday = 0;

  // ── Study Quotes ──────────────────────────────────
  const STUDY_QUOTES = [
    { text: "The secret of getting ahead is getting started.", source: "\u2014 Mark Twain" },
    { text: "One Pomodoro at a time. That's all it takes.", source: "\u2014 F1 Pit Strategy" },
    { text: "Even Shinji got in the robot. You can open the textbook.", source: "\u2014 Evangelion wisdom" },
    { text: "Hard work is the fastest road to the top.", source: "\u2014 Tenya Iida, MHA" },
    { text: "The Force will be with you. Study smart.", source: "\u2014 Obi-Wan, Star Wars" },
    { text: "Every champion was once a contender who didn't give up.", source: "\u2014 Rocky Balboa" },
    { text: "A Gundam pilot studies the enemy before the battle.", source: "\u2014 Gundam Wing" },
    { text: "Your future self is studying right now. Don't let them down.", source: "\u2014 SEIASTREAK" },
    { text: "Plus Ultra means going beyond your limits. Start now.", source: "\u2014 All Might, MHA" },
    { text: "The best time to study was yesterday. The next best time is now.", source: "\u2014 SEIASTREAK" },
    { text: "Pandora's most beautiful export: knowledge.", source: "\u2014 Avatar lore" },
    { text: "Ayrton Senna read everything. So should you.", source: "\u2014 F1 history" },
    { text: "Excellence is not a destination; it's a continuous journey.", source: "\u2014 Formula 1 ethos" },
  ];

  let quoteIdx = Math.floor(Math.random() * STUDY_QUOTES.length);

  // ── Timer ─────────────────────────────────────────
  function getDurations() {
    const s = SS.getSettings();
    return {
      focus: (s.focusDuration || 25) * 60,
      short: (s.shortBreak || 5) * 60,
      long: (s.longBreak || 15) * 60,
    };
  }

  function updateTimerDisplay() {
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    document.getElementById('timerDisplay').textContent =
      `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
    updateTimerRing();
  }

  function updateTimerRing() {
    const ring = document.getElementById('timerRing');
    if (!ring) return;
    const durations = getDurations();
    const totalSeconds = durations[timerMode];
    const circumference = 2 * Math.PI * 90; // r=90
    const progress = timerSeconds / totalSeconds;
    const offset = circumference * (1 - progress);
    ring.style.strokeDashoffset = offset;
  }

  function setTimerMode(mode) {
    timerMode = mode;
    timerRunning = false;
    clearInterval(timerInterval);

    const durations = getDurations();
    timerSeconds = durations[mode];
    updateTimerDisplay();

    document.querySelectorAll('.timer-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.mode === mode)
    );

    const labels = { focus: 'Ready to focus?', short: 'Short break time!', long: 'Long break \u2014 recharge!' };
    document.getElementById('timerLabel').textContent = labels[mode];
    document.getElementById('timerStart').textContent = '\u25B6 Start';
  }

  function startTimer() {
    if (timerRunning) {
      timerRunning = false;
      clearInterval(timerInterval);
      document.getElementById('timerStart').textContent = '\u25B6 Resume';
      document.getElementById('timerLabel').textContent = 'Paused';
      pauseAudio();
      return;
    }

    timerRunning = true;
    document.getElementById('timerStart').textContent = '\u23F8 Pause';
    document.getElementById('timerLabel').textContent = timerMode === 'focus' ? 'Stay locked in...' : 'Rest up!';
    playAudio();

    timerInterval = setInterval(() => {
      timerSeconds--;
      updateTimerDisplay();

      if (timerSeconds <= 0) {
        clearInterval(timerInterval);
        timerRunning = false;
        timerComplete();
      }
    }, 1000);
  }

  function resetTimer() {
    timerRunning = false;
    clearInterval(timerInterval);
    const durations = getDurations();
    timerSeconds = durations[timerMode];
    updateTimerDisplay();
    document.getElementById('timerStart').textContent = '\u25B6 Start';
    document.getElementById('timerLabel').textContent = timerMode === 'focus' ? 'Ready to focus?' : 'Ready for a break?';
    pauseAudio();
  }

  function timerComplete() {
    if (timerMode === 'focus') {
      pomodorosToday++;
      const today = todayStr();
      SS.setPomCount(today, pomodorosToday);
      SS.addStudyTime(today, getDurations().focus / 60);
      renderPomodoroDots();
      updateStudyStats();
      showToast(`Pomodoro ${pomodorosToday} complete! Take a break!`, 4000);
      setTimerMode('short');
    } else {
      showToast('Break over! Back to focus!', 3000);
      setTimerMode('focus');
    }
    playCompletionSound();
  }

  function renderPomodoroDots() {
    document.getElementById('pomCount').textContent = pomodorosToday;
    const dots = document.getElementById('pomDots');
    if (!dots) return;
    dots.innerHTML = Array.from({ length: Math.min(pomodorosToday, 8) }, () =>
      '<div class="pom-dot done"></div>'
    ).join('') + (pomodorosToday > 8 ? `<span style="font-size:.7rem;color:var(--accent)"> +${pomodorosToday-8}</span>` : '');
  }

  // ── Audio Engine ──────────────────────────────────
  function initAudio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch { return; }
    }
  }

  function stopAllSounds() {
    soundNodes.forEach(n => { try { n.stop(); } catch {} });
    soundNodes = [];
  }

  function getVolume() {
    return (parseInt(document.getElementById('volumeSlider')?.value || 40)) / 100;
  }

  function playAudio() {
    initAudio();
    if (!audioCtx) return;
    stopAllSounds();
    const vol = getVolume();
    if (vol === 0) return;
    SOUNDS[currentSound]?.(audioCtx, soundNodes, vol);
  }

  function pauseAudio() { stopAllSounds(); }

  function playCompletionSound() {
    initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1);
    osc.start(); osc.stop(audioCtx.currentTime + 1);
  }

  // ── Sound Generators ──────────────────────────────
  const SOUNDS = {
    cafe(ctx, nodes, vol) {
      const bufLen = ctx.sampleRate * 3;
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * 0.015;
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass'; filter.frequency.value = 300; filter.Q.value = 0.5;
      const gain = ctx.createGain(); gain.gain.value = vol * 0.5;
      src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      src.start(); nodes.push(src);

      function clink() {
        if (!nodes.includes(src)) return;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = 2000 + Math.random() * 500;
        g.gain.setValueAtTime(vol * 0.04, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        o.start(); o.stop(ctx.currentTime + 0.15);
        setTimeout(clink, 3000 + Math.random() * 8000);
      }
      setTimeout(clink, 1000);
    },

    rain(ctx, nodes, vol) {
      const bufLen = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * 0.1;
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const filter = ctx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 1000;
      const gain = ctx.createGain(); gain.gain.value = vol * 0.4;
      src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      src.start(); nodes.push(src);

      const bufL = ctx.sampleRate * 4;
      const bufR = ctx.createBuffer(1, bufL, ctx.sampleRate);
      const dR = bufR.getChannelData(0);
      for (let i = 0; i < bufL; i++) dR[i] = (Math.random() * 2 - 1) * 0.02;
      const src2 = ctx.createBufferSource(); src2.buffer = bufR; src2.loop = true;
      const fil2 = ctx.createBiquadFilter(); fil2.type = 'lowpass'; fil2.frequency.value = 150;
      const g2 = ctx.createGain(); g2.gain.value = vol * 0.25;
      src2.connect(fil2); fil2.connect(g2); g2.connect(ctx.destination);
      src2.start(); nodes.push(src2);
    },

    lofi(ctx, nodes, vol) {
      const bpm = 80;
      const beat = 60 / bpm;

      function kick(time) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.setValueAtTime(150, time);
        o.frequency.exponentialRampToValueAtTime(40, time + 0.1);
        g.gain.setValueAtTime(vol * 0.5, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
        o.start(time); o.stop(time + 0.25);
      }

      function snare(time) {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * (1 - i/d.length);
        const src = ctx.createBufferSource(); src.buffer = buf;
        const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 1200;
        const g = ctx.createGain(); g.gain.value = vol * 0.3;
        src.connect(filter); filter.connect(g); g.connect(ctx.destination);
        src.start(time); nodes.push(src);
      }

      function hihat(time) {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * (1 - i/d.length);
        const src = ctx.createBufferSource(); src.buffer = buf;
        const filter = ctx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 7000;
        const g = ctx.createGain(); g.gain.value = vol * 0.1;
        src.connect(filter); filter.connect(g); g.connect(ctx.destination);
        src.start(time); nodes.push(src);
      }

      const now = ctx.currentTime + 0.1;
      for (let bar = 0; bar < 8; bar++) {
        const t = now + bar * beat * 4;
        kick(t); kick(t + beat * 2);
        snare(t + beat); snare(t + beat * 3);
        for (let h = 0; h < 4; h++) { hihat(t + beat * h); hihat(t + beat * h + beat/2); }
      }

      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = 220;
      g.gain.value = vol * 0.05;
      osc.connect(g); g.connect(ctx.destination);
      osc.start(); nodes.push(osc);
    },

    space(ctx, nodes, vol) {
      [55, 110, 220].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = freq;
        gain.gain.value = vol * [0.15, 0.08, 0.04][i];
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); nodes.push(osc);
      });
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 20;
      lfo.connect(lfoGain);
      nodes[0] && lfoGain.connect(nodes[0].frequency);
      lfo.start(); nodes.push(lfo);
    },

    forest(ctx, nodes, vol) {
      const bufLen = ctx.sampleRate * 3;
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) data[i] = (Math.random()*2-1) * 0.06;
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 600; filter.Q.value = 0.3;
      const gain = ctx.createGain(); gain.gain.value = vol * 0.4;
      src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      src.start(); nodes.push(src);

      function bird() {
        if (!nodes.includes(src)) return;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine'; o.connect(g); g.connect(ctx.destination);
        const baseFreq = 1200 + Math.random() * 800;
        o.frequency.setValueAtTime(baseFreq, ctx.currentTime);
        o.frequency.linearRampToValueAtTime(baseFreq * 1.3, ctx.currentTime + 0.1);
        o.frequency.linearRampToValueAtTime(baseFreq, ctx.currentTime + 0.2);
        g.gain.setValueAtTime(vol * 0.06, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        o.start(); o.stop(ctx.currentTime + 0.3);
        setTimeout(bird, 2000 + Math.random() * 6000);
      }
      setTimeout(bird, 500);
    }
  };

  // ── Atmosphere Visuals ────────────────────────────
  function setAtmosphere(sound) {
    const visual = document.getElementById('atmosphereVisual');
    if (!visual) return;
    visual.innerHTML = '';
    visual.className = `atmosphere-visual atmo-${sound}`;

    if (sound === 'cafe') {
      for (let i = 0; i < 3; i++) {
        const steam = document.createElement('div');
        steam.className = 'cafe-steam';
        steam.textContent = '\u2615';
        steam.style.left = `${20 + i * 30}%`;
        steam.style.animationDelay = `${i * 1}s`;
        visual.appendChild(steam);
      }
    } else if (sound === 'rain') {
      for (let i = 0; i < 20; i++) {
        const drop = document.createElement('div');
        drop.className = 'rain-drop';
        drop.style.left = `${Math.random()*100}%`;
        drop.style.height = `${10 + Math.random()*20}px`;
        drop.style.animationDuration = `${0.4 + Math.random()*0.6}s`;
        drop.style.animationDelay = `${Math.random()*2}s`;
        visual.appendChild(drop);
      }
    } else if (sound === 'space') {
      for (let i = 0; i < 30; i++) {
        const star = document.createElement('div');
        star.className = 'star-dot';
        const size = Math.random() * 2 + 1;
        star.style.cssText = `width:${size}px;height:${size}px;top:${Math.random()*100}%;left:${Math.random()*100}%;animation-duration:${1+Math.random()*3}s;animation-delay:${Math.random()*2}s`;
        visual.appendChild(star);
      }
    } else if (sound === 'forest') {
      const leaves = ['\uD83C\uDF43','\uD83C\uDF3F','\uD83C\uDF31'];
      for (let i = 0; i < 5; i++) {
        const leaf = document.createElement('div');
        leaf.className = 'forest-leaf';
        leaf.textContent = leaves[i % leaves.length];
        leaf.style.cssText = `top:${20+Math.random()*60}%;left:${10+Math.random()*80}%;animation-delay:${Math.random()*2}s;animation-duration:${3+Math.random()*2}s`;
        visual.appendChild(leaf);
      }
    } else if (sound === 'lofi') {
      visual.style.background = 'linear-gradient(135deg, #0d0520, #1a0535)';
      const note = document.createElement('div');
      note.style.cssText = 'text-align:center;padding-top:30px;font-size:2rem;opacity:.3;animation:flamePulse 2s ease-in-out infinite';
      note.textContent = '\uD83C\uDFB5';
      visual.appendChild(note);
    }
  }

  // ── Session Tasks ─────────────────────────────────
  function renderSessionTasks() {
    const tasks = SS.getSessionTasks();
    const list = document.getElementById('sessionTaskList');
    if (!list) return;
    if (!tasks.length) {
      list.innerHTML = '<div class="empty-state">Add tasks for this session!</div>';
      return;
    }
    list.innerHTML = tasks.map(t => `
      <li class="session-task-item ${t.done ? 'done' : ''}">
        <span class="task-checkbox" onclick="StudyModule.toggleTask('${t.id}')">${t.done ? '\u2705' : '\u2B55'}</span>
        <span class="task-text">${t.text}</span>
        <span class="task-del" onclick="StudyModule.deleteTask('${t.id}')">\u2715</span>
      </li>
    `).join('');
  }

  function addSessionTask() {
    const input = document.getElementById('sessionTaskInput');
    const text = input.value.trim();
    if (!text) return;
    const tasks = SS.getSessionTasks();
    tasks.push({ id: genId(), text, done: false });
    SS.setSessionTasks(tasks);
    input.value = '';
    renderSessionTasks();
  }

  function toggleTask(id) {
    const tasks = SS.getSessionTasks();
    const t = tasks.find(x => x.id === id);
    if (t) { t.done = !t.done; SS.setSessionTasks(tasks); renderSessionTasks(); }
  }

  function deleteTask(id) {
    SS.setSessionTasks(SS.getSessionTasks().filter(t => t.id !== id));
    renderSessionTasks();
  }

  // ── Study Stats ───────────────────────────────────
  function updateStudyStats() {
    const today = todayStr();
    const mins = SS.getStudyTime(today);
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    const st = document.getElementById('studyTime');
    if (st) st.textContent = `${h}h ${m}m`;

    const { current } = SS.calcStreaks();
    const ss = document.getElementById('studyStreak');
    if (ss) ss.textContent = current;
  }

  // ── Quotes ────────────────────────────────────────
  function renderStudyQuote() {
    const q = STUDY_QUOTES[quoteIdx % STUDY_QUOTES.length];
    const sq = document.getElementById('studyQuote');
    const ss = document.getElementById('studyQuoteSource');
    if (sq) sq.textContent = `\u201C${q.text}\u201D`;
    if (ss) ss.textContent = q.source;
  }

  function rotateQuote() {
    quoteIdx = (quoteIdx + 1) % STUDY_QUOTES.length;
    renderStudyQuote();
  }

  // ── Spotify ───────────────────────────────────────
  function spotifyUrlToEmbed(url) {
    // Convert open.spotify.com URL to embed URL
    // Examples:
    //   https://open.spotify.com/track/xxx → https://open.spotify.com/embed/track/xxx
    //   https://open.spotify.com/playlist/xxx → https://open.spotify.com/embed/playlist/xxx
    //   https://open.spotify.com/album/xxx → https://open.spotify.com/embed/album/xxx
    try {
      const u = new URL(url);
      if (u.hostname !== 'open.spotify.com') return null;
      const path = u.pathname; // e.g. /track/xxx or /playlist/xxx
      if (!path || path === '/') return null;
      return `https://open.spotify.com/embed${path}?utm_source=generator&theme=0`;
    } catch {
      return null;
    }
  }

  function loadSpotifyUrl() {
    const input = document.getElementById('spotifyUrlInput');
    const url = input.value.trim();
    if (!url) return;

    const embedUrl = spotifyUrlToEmbed(url);
    if (!embedUrl) {
      showToast('Invalid Spotify URL. Paste a track, playlist, or album link.');
      return;
    }

    const iframe = document.getElementById('spotifyIframe');
    if (iframe) {
      iframe.src = embedUrl;
      SS.setSpotifyUrl(url);
      showToast('Spotify loaded!');
    }
  }

  function restoreSpotify() {
    const savedUrl = SS.getSpotifyUrl();
    if (savedUrl) {
      const embedUrl = spotifyUrlToEmbed(savedUrl);
      if (embedUrl) {
        const iframe = document.getElementById('spotifyIframe');
        if (iframe) iframe.src = embedUrl;
        const input = document.getElementById('spotifyUrlInput');
        if (input) input.value = savedUrl;
      }
    }
  }

  // ── Apply Settings ────────────────────────────────
  function applySettings() {
    if (!timerRunning) {
      const durations = getDurations();
      timerSeconds = durations[timerMode];
      updateTimerDisplay();
    }
  }

  // ── Sound Selection ───────────────────────────────
  function selectSound(sound) {
    currentSound = sound;
    document.querySelectorAll('.sound-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.sound === sound)
    );
    setAtmosphere(sound);
    if (timerRunning) {
      stopAllSounds();
      playAudio();
    }
  }

  // ── Bind ──────────────────────────────────────────
  function bindButtons() {
    document.getElementById('timerStart')?.addEventListener('click', startTimer);
    document.getElementById('timerReset')?.addEventListener('click', resetTimer);

    document.querySelectorAll('.timer-tab').forEach(tab => {
      tab.addEventListener('click', () => setTimerMode(tab.dataset.mode));
    });

    document.querySelectorAll('.sound-btn').forEach(btn => {
      btn.addEventListener('click', () => selectSound(btn.dataset.sound));
    });

    document.getElementById('volumeSlider')?.addEventListener('input', function() {
      if (timerRunning) { stopAllSounds(); playAudio(); }
    });

    document.getElementById('addSessionTask')?.addEventListener('click', addSessionTask);
    document.getElementById('sessionTaskInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') addSessionTask();
    });

    document.getElementById('newQuoteBtn')?.addEventListener('click', rotateQuote);

    // Spotify
    document.getElementById('spotifyLoadBtn')?.addEventListener('click', loadSpotifyUrl);
    document.getElementById('spotifyUrlInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') loadSpotifyUrl();
    });
  }

  // ── Init ──────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    bindButtons();

    pomodorosToday = SS.getPomCount(todayStr());
    renderPomodoroDots();
    updateTimerDisplay();
    renderSessionTasks();
    updateStudyStats();
    renderStudyQuote();
    setAtmosphere('cafe');
    restoreSpotify();
  });

  return {
    render: () => { updateStudyStats(); renderSessionTasks(); renderStudyQuote(); },
    toggleTask, deleteTask, applySettings
  };
})();
