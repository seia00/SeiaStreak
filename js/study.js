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
  let focusSecondsAccum = 0; // tracks seconds since last study time save

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
    // Save any accumulated focus time before switching
    if (timerMode === 'focus') saveFocusAccum();
    timerMode = mode;
    timerRunning = false;
    clearInterval(timerInterval);
    focusSecondsAccum = 0;

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

  function saveFocusAccum() {
    if (focusSecondsAccum > 0) {
      SS.addStudyTime(todayStr(), focusSecondsAccum / 60);
      focusSecondsAccum = 0;
      updateStudyStats();
    }
  }

  function startTimer() {
    if (timerRunning) {
      // Pausing — save accumulated focus time
      timerRunning = false;
      clearInterval(timerInterval);
      if (timerMode === 'focus') saveFocusAccum();
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

      // Track every second of focus time, save each minute
      if (timerMode === 'focus') {
        focusSecondsAccum++;
        if (focusSecondsAccum >= 60) {
          SS.addStudyTime(todayStr(), 1);
          focusSecondsAccum = 0;
          updateStudyStats();
        }
      }

      if (timerSeconds <= 0) {
        clearInterval(timerInterval);
        timerRunning = false;
        timerComplete();
      }
    }, 1000);
  }

  function resetTimer() {
    // Save any accumulated focus time before resetting
    if (timerMode === 'focus') saveFocusAccum();
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
      // Save any remaining partial-minute focus time
      saveFocusAccum();
      pomodorosToday++;
      SS.setPomCount(todayStr(), pomodorosToday);
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

  // ── Sound Generators (v3 — softer, cozier) ───────
  const SOUNDS = {
    cafe(ctx, nodes, vol) {
      // Warm brown noise for cafe ambience
      const bufLen = ctx.sampleRate * 4;
      const buf = ctx.createBuffer(2, bufLen, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buf.getChannelData(ch);
        let last = 0;
        for (let i = 0; i < bufLen; i++) {
          const white = Math.random() * 2 - 1;
          // Brown noise: integrate white noise
          last = (last + (0.02 * white)) / 1.02;
          data[i] = last * 3.5;
        }
      }
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 500; lp.Q.value = 0.7;
      const gain = ctx.createGain(); gain.gain.value = vol * 0.35;
      src.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
      src.start(); nodes.push(src);

      // Gentle occasional ceramic clink
      function clink() {
        if (!nodes.includes(src)) return;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = 3000 + Math.random() * 1000;
        g.gain.setValueAtTime(vol * 0.015, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        o.start(); o.stop(ctx.currentTime + 0.08);
        setTimeout(clink, 5000 + Math.random() * 12000);
      }
      setTimeout(clink, 3000);
    },

    rain(ctx, nodes, vol) {
      // Soft rain: filtered pink noise
      const bufLen = ctx.sampleRate * 4;
      const buf = ctx.createBuffer(2, bufLen, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buf.getChannelData(ch);
        let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
        for (let i = 0; i < bufLen; i++) {
          const white = Math.random() * 2 - 1;
          // Pink noise approximation (Paul Kellet's)
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
          b6 = white * 0.115926;
        }
      }
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 800; bp.Q.value = 0.4;
      const gain = ctx.createGain(); gain.gain.value = vol * 0.3;
      src.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
      src.start(); nodes.push(src);

      // Deep rumble layer (distant thunder)
      const bufD = ctx.createBuffer(1, ctx.sampleRate * 6, ctx.sampleRate);
      const dD = bufD.getChannelData(0);
      let prev = 0;
      for (let i = 0; i < dD.length; i++) {
        prev = (prev + (Math.random() * 2 - 1) * 0.01) / 1.01;
        dD[i] = prev * 2;
      }
      const srcD = ctx.createBufferSource(); srcD.buffer = bufD; srcD.loop = true;
      const lpD = ctx.createBiquadFilter(); lpD.type = 'lowpass'; lpD.frequency.value = 100;
      const gD = ctx.createGain(); gD.gain.value = vol * 0.15;
      srcD.connect(lpD); lpD.connect(gD); gD.connect(ctx.destination);
      srcD.start(); nodes.push(srcD);
    },

    lofi(ctx, nodes, vol) {
      // Gentle warm drone with slow chord changes instead of harsh beats
      const chords = [
        [261.6, 329.6, 392.0], // C major
        [220.0, 277.2, 329.6], // A minor
        [246.9, 311.1, 370.0], // B dim approx
        [196.0, 246.9, 293.7], // G major
      ];
      const chord = chords[Math.floor(Math.random() * chords.length)];

      chord.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq / 2; // lower octave for warmth
        const gain = ctx.createGain();
        gain.gain.value = vol * 0.06;
        // Warm filter
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 400;
        osc.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
        osc.start(); nodes.push(osc);
      });

      // Soft vinyl crackle
      const bufLen = ctx.sampleRate * 3;
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) {
        data[i] = Math.random() < 0.002 ? (Math.random() * 0.3 - 0.15) : (Math.random() * 2 - 1) * 0.003;
      }
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2000;
      const g = ctx.createGain(); g.gain.value = vol * 0.12;
      src.connect(hp); hp.connect(g); g.connect(ctx.destination);
      src.start(); nodes.push(src);
    },

    space(ctx, nodes, vol) {
      // Deep cosmic drone — very low, gentle, ethereal
      [55, 82.4, 110].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = freq;
        gain.gain.value = vol * [0.08, 0.05, 0.03][i];
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 200;
        osc.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
        osc.start(); nodes.push(osc);
      });

      // Slow LFO for gentle pulsing
      const lfo = ctx.createOscillator();
      lfo.type = 'sine'; lfo.frequency.value = 0.03;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 8;
      lfo.connect(lfoGain);
      if (nodes[0]) lfoGain.connect(nodes[0].frequency);
      lfo.start(); nodes.push(lfo);

      // Subtle cosmic shimmer
      const bufLen = ctx.sampleRate * 5;
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * 0.008;
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 4000; bp.Q.value = 2;
      const g = ctx.createGain(); g.gain.value = vol * 0.06;
      src.connect(bp); bp.connect(g); g.connect(ctx.destination);
      src.start(); nodes.push(src);
    },

    forest(ctx, nodes, vol) {
      // Gentle wind through leaves — brown noise with soft bandpass
      const bufLen = ctx.sampleRate * 5;
      const buf = ctx.createBuffer(2, bufLen, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buf.getChannelData(ch);
        let last = 0;
        for (let i = 0; i < bufLen; i++) {
          last = (last + (Math.random() * 2 - 1) * 0.02) / 1.02;
          data[i] = last * 2.5;
        }
      }
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 400; bp.Q.value = 0.5;
      const gain = ctx.createGain(); gain.gain.value = vol * 0.25;
      src.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
      src.start(); nodes.push(src);

      // Gentle bird chirps — quieter, less frequent
      function bird() {
        if (!nodes.includes(src)) return;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine'; o.connect(g); g.connect(ctx.destination);
        const baseFreq = 1800 + Math.random() * 600;
        const t = ctx.currentTime;
        o.frequency.setValueAtTime(baseFreq, t);
        o.frequency.linearRampToValueAtTime(baseFreq * 1.15, t + 0.06);
        o.frequency.linearRampToValueAtTime(baseFreq * 0.95, t + 0.12);
        g.gain.setValueAtTime(vol * 0.025, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        o.start(); o.stop(t + 0.18);
        setTimeout(bird, 4000 + Math.random() * 10000);
      }
      setTimeout(bird, 2000);
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
    setTimerMode('focus'); // loads saved focus duration from settings
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
