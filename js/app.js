/**
 * Beatify — main UI / UX controller (Spotify-style).
 */
(function () {
  const songs = window.HINDI_SONGS || [];
  const Player = window.BeatifyPlayer;
  const API = window.BeatifyAPI;
  const Radio = window.BeatifyRadio;
  const Pay = window.BeatifyPay;

  const MOODS = ['All', 'Romantic', 'Party', 'Sad', 'Workout', 'Chill', 'Retro', 'Punjabi Hits', 'Bollywood', 'Devotional'];
  const PLAYLIST_FILTERS = {
    liked: null,
    bollywood: (s) => s.mood === 'Bollywood' || /Bollywood|Arijit|Shreya/i.test(s.artist + s.album),
    romantic: (s) => s.mood === 'Romantic',
    party: (s) => s.mood === 'Party',
    retro: (s) => s.mood === 'Retro' || s.year < 2005,
    punjabi: (s) => s.mood === 'Punjabi Hits' || /Diljit|Sidhu|Punjabi|AP Dhillon|Karan/i.test(s.artist),
    workout: (s) => s.mood === 'Workout',
    sad: (s) => s.mood === 'Sad',
  };

  let activeMood = 'All';
  let historyStack = ['home'];
  let historyIdx = 0;
  let selectedPlan = { plan: 'premium', price: 119 };
  let payMethod = 'upi';

  /* ——— Helpers ——— */
  function coverHTML(song, big) {
    if (song.cover) {
      return `<img src="${song.cover}" alt="" loading="lazy" />`;
    }
    const hue = song.coverHue ?? ((song.id * 47) % 360);
    const letter = (song.title || '♪').charAt(0);
    const size = big ? '2.5rem' : '1rem';
    return `<div class="cover-fallback" style="background:linear-gradient(135deg,hsl(${hue},55%,35%),hsl(${(hue + 40) % 360},50%,20%));font-size:${size}">${letter}</div>`;
  }

  function fmtTime(sec) {
    if (!sec || !isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function canPlayPremium(song) {
    if (!song.premium) return true;
    return Pay.isPremium();
  }

  /* ——— Navigation ——— */
  function showView(name, push = true) {
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    const view = document.getElementById('view-' + name);
    if (view) view.classList.add('active');

    document.querySelectorAll('.nav-link, .mobile-nav button').forEach((b) => {
      b.classList.toggle('active', b.dataset.view === name);
    });

    if (push && historyStack[historyIdx] !== name) {
      historyStack = historyStack.slice(0, historyIdx + 1);
      historyStack.push(name);
      historyIdx = historyStack.length - 1;
    }

    if (name === 'premium') refreshEarnings();
    if (name === 'radio') renderRadio();
  }

  /* ——— Render tracks ——— */
  function trackRow(song, i, list) {
    const playing = Player.current() && Player.current().id === song.id;
    const locked = song.premium && !Pay.isPremium();
    return `
      <div class="track-row ${playing ? 'playing' : ''}" data-id="${song.id}" data-idx="${i}">
        <div>
          <span class="track-num">${i + 1}</span>
          <svg class="track-play-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <div class="track-info">
          <div class="track-thumb">${coverHTML(song)}</div>
          <div style="min-width:0">
            <div class="track-title">${escapeHtml(song.title)}${song.premium ? '<span class="badge-prem">PREMIUM</span>' : ''}</div>
            <div class="track-artist">${escapeHtml(song.artist)}</div>
          </div>
        </div>
        <div class="track-album">${escapeHtml(song.album || '')}</div>
        <div class="track-dur">${song.durationText || fmtTime(song.duration)}</div>
        <div class="track-lock">${locked ? '🔒' : ''}</div>
      </div>`;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function bindTrackClicks(container, list) {
    container.querySelectorAll('.track-row').forEach((row) => {
      row.addEventListener('click', () => {
        const idx = Number(row.dataset.idx);
        const song = list[idx];
        if (!canPlayPremium(song)) {
          toast('Premium track — upgrade to play');
          showView('premium');
          return;
        }
        Player.setQueue(list, idx);
      });
    });
  }

  function renderTrackList(containerId, list) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = list.map((s, i) => trackRow(s, i, list)).join('');
    bindTrackClicks(el, list);
  }

  function albumCard(song, list, idx) {
    return `
      <button class="album-card" data-idx="${idx}">
        <div class="card-art">
          ${coverHTML(song, true)}
          <span class="card-play" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </span>
        </div>
        <h3>${escapeHtml(song.title)}</h3>
        <p>${escapeHtml(song.artist)}</p>
      </button>`;
  }

  /* ——— Home ——— */
  function filterByMood(mood) {
    if (!mood || mood === 'All') return songs.slice();
    return songs.filter((s) => s.mood === mood);
  }

  function renderMoods(containerId, onPick) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = MOODS.map(
      (m) => `<button class="mood-chip ${m === activeMood ? 'active' : ''}" data-mood="${m}">${m}</button>`
    ).join('');
    el.querySelectorAll('.mood-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        activeMood = chip.dataset.mood;
        onPick(activeMood);
        renderMoods('moodRow', onPick);
        renderMoods('searchMoods', (m) => {
          activeMood = m;
          showView('search');
          renderSearch(filterByMood(m).slice(0, 80));
        });
      });
    });
  }

  function renderHome() {
    const curated = [
      { title: 'Daily Mix Hindi', slice: songs.slice(0, 1) },
      { title: 'Romantic India', slice: songs.filter((s) => s.mood === 'Romantic').slice(0, 1) },
      { title: 'Party Non-Stop', slice: songs.filter((s) => s.mood === 'Party').slice(0, 1) },
      { title: 'Retro Rewind', slice: songs.filter((s) => s.mood === 'Retro').slice(0, 1) },
      { title: 'Punjabi Heat', slice: songs.filter((s) => s.mood === 'Punjabi Hits').slice(0, 1) },
      { title: 'Chill Beats', slice: songs.filter((s) => s.mood === 'Chill').slice(0, 1) },
    ];

    const made = document.getElementById('madeForYou');
    made.innerHTML = curated
      .map((c, i) => {
        const song = c.slice[0] || songs[i];
        const list = filterByMood(song.mood === 'Bollywood' ? 'All' : song.mood);
        return `
          <button class="album-card" data-mood-play="${song.mood}">
            <div class="card-art">
              ${coverHTML({ ...song, title: c.title }, true)}
              <span class="card-play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>
            </div>
            <h3>${escapeHtml(c.title)}</h3>
            <p>${list.length} songs</p>
          </button>`;
      })
      .join('');

    made.querySelectorAll('.album-card').forEach((card) => {
      card.addEventListener('click', () => {
        const mood = card.dataset.moodPlay;
        const list = mood === 'Bollywood' || !mood ? songs.slice(0, 100) : filterByMood(mood);
        const playable = list.filter((s) => canPlayPremium(s));
        if (!playable.length) return;
        Player.setQueue(playable, 0);
        toast('Playing ' + (card.querySelector('h3').textContent));
      });
    });

    const trending = [...songs].sort((a, b) => b.plays - a.plays).slice(0, 12);
    renderTrackList('trendingTracks', applyMood(trending));
  }

  function applyMood(list) {
    if (activeMood === 'All') return list;
    const filtered = filterByMood(activeMood);
    return filtered.length ? filtered.slice(0, 12) : list;
  }

  async function loadOnlineSongs() {
    const box = document.getElementById('onlineSongs');
    box.innerHTML = '<div class="loading-spinner"></div>';
    try {
      const online = await API.fetchNewHindi();
      if (!online.length) throw new Error('empty');
      box.innerHTML = online.map((s, i) => albumCard(s, online, i)).join('');
      box.querySelectorAll('.album-card').forEach((card) => {
        card.addEventListener('click', () => {
          const idx = Number(card.dataset.idx);
          Player.setQueue(online, idx);
          toast('Streaming preview · ' + online[idx].title);
        });
      });
    } catch (err) {
      box.innerHTML = `<div class="empty-state"><h3>Couldn't reach online catalog</h3><p>Check your internet — local 500 Hindi songs still work.</p></div>`;
    }
  }

  /* ——— Search ——— */
  function renderSearch(list) {
    const el = document.getElementById('searchResults');
    if (!list.length) {
      el.innerHTML = `<div class="empty-state"><h3>No results</h3><p>Try another keyword or mood.</p></div>`;
      return;
    }
    el.innerHTML = `
      <div class="track-table">
        <div class="track-header"><span>#</span><span>Title</span><span>Album</span><span>Time</span><span></span></div>
        <div id="searchTrackList"></div>
      </div>`;
    renderTrackList('searchTrackList', list.slice(0, 100));
  }

  function doSearch(q) {
    q = (q || '').trim().toLowerCase();
    if (!q) {
      document.getElementById('searchResults').innerHTML = `
        <div class="empty-state"><h3>Find your next favourite</h3><p>Search across 500 Hindi songs.</p></div>`;
      return;
    }
    const local = songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.album.toLowerCase().includes(q)
    );
    renderSearch(local);
    showView('search');

    API.searchTracks(q + ' hindi', 12)
      .then((online) => {
        if (!online.length) return;
        const el = document.getElementById('searchResults');
        el.insertAdjacentHTML(
          'beforeend',
          `<div class="section" style="margin-top:28px">
            <div class="section-head"><h2>Online results</h2><span class="online-status">iTunes previews</span></div>
            <div class="card-row" id="searchOnline"></div>
          </div>`
        );
        const box = document.getElementById('searchOnline');
        box.innerHTML = online.map((s, i) => albumCard(s, online, i)).join('');
        box.querySelectorAll('.album-card').forEach((card) => {
          card.addEventListener('click', () => Player.setQueue(online, Number(card.dataset.idx)));
        });
      })
      .catch(() => {});
  }

  /* ——— Library / Playlists ——— */
  function openPlaylist(key) {
    let list;
    let title = 'Your Library';
    if (key === 'liked') {
      const ids = Player.getLikedIds();
      list = songs.filter((s) => ids.has(s.id));
      title = 'Liked Songs';
    } else if (PLAYLIST_FILTERS[key]) {
      list = songs.filter(PLAYLIST_FILTERS[key]);
      title = key.charAt(0).toUpperCase() + key.slice(1) + ' playlist';
    } else {
      list = songs.slice(0, 100);
    }
    document.getElementById('libraryTitle').textContent = title + ` · ${list.length} songs`;
    renderTrackList('libraryTracks', list);
    showView('library');
    document.getElementById('shuffleLibrary').onclick = () => {
      if (!list.length) return toast('Playlist is empty');
      const playable = list.filter(canPlayPremium);
      const start = Math.floor(Math.random() * playable.length);
      Player.setQueue(playable, start);
      if (!Player.getState().shuffle) Player.toggleShuffle();
      document.getElementById('btnShuffle').classList.add('active');
    };
  }

  /* ——— Radio ——— */
  function renderRadio() {
    const grid = document.getElementById('radioGrid');
    const stations = Radio.getStations();
    const cur = Player.current();
    grid.innerHTML = stations
      .map(
        (s) => `
      <button class="radio-card ${cur && cur.id === s.id ? 'live' : ''}" data-id="${s.id}" style="background: linear-gradient(145deg, hsl(${s.hue},40%,18%), var(--surface-2));">
        <div class="radio-freq">${escapeHtml(s.freq)}</div>
        <div class="radio-name">${escapeHtml(s.name)}</div>
        <div class="radio-genre">${escapeHtml(s.genre)}</div>
        <div class="live-dot">Live</div>
        <div class="radio-wave"></div>
      </button>`
      )
      .join('');

    grid.querySelectorAll('.radio-card').forEach((card) => {
      card.addEventListener('click', () => {
        const st = Radio.getById(card.dataset.id);
        Player.playRadio(st);
        toast('Live · ' + st.name);
        renderRadio();
      });
    });
  }

  /* ——— Payment UI ——— */
  function refreshEarnings() {
    const e = Pay.getEarnings();
    document.getElementById('totalEarned').textContent = '₹' + e.total;
    document.getElementById('subCount').textContent = e.subscribers;
    const plan = Pay.getPlan();
    document.getElementById('currentPlanLabel').textContent =
      plan.charAt(0).toUpperCase() + plan.slice(1);

    if (Pay.isPremium()) {
      document.getElementById('qualityBadge').textContent = 'HQ';
      document.getElementById('qualityBadge').classList.add('hq');
      document.getElementById('topPremiumBtn').textContent = 'Premium ✓';
      const banner = document.getElementById('sidebarPremium');
      if (banner) banner.style.display = 'none';
      document.querySelectorAll('.price-card .btn-plan').forEach((btn) => {
        if (btn.dataset.plan === plan) {
          btn.textContent = 'Active';
          btn.disabled = true;
        }
      });
    }
  }

  function openPayModal(plan, price) {
    selectedPlan = { plan, price };
    payMethod = 'upi';
    document.getElementById('payAmount').textContent = '₹' + price;
    document.getElementById('payFormView').style.display = 'block';
    document.getElementById('paySuccessView').style.display = 'none';
    document.getElementById('payModal').classList.add('open');
    syncPayFields();
  }

  function syncPayFields() {
    document.getElementById('upiFields').style.display = payMethod === 'upi' ? 'block' : 'none';
    document.getElementById('cardFields').style.display = payMethod === 'card' ? 'block' : 'none';
    document.getElementById('walletFields').style.display = payMethod === 'wallet' ? 'block' : 'none';
    document.querySelectorAll('.pay-method').forEach((m) => {
      m.classList.toggle('active', m.dataset.method === payMethod);
    });
  }

  async function submitPayment() {
    const name = document.getElementById('payName').value.trim();
    const contact = document.getElementById('payContact').value.trim();
    if (!name || !contact) {
      toast('Enter name and email/phone');
      return;
    }
    if (payMethod === 'upi' && !document.getElementById('payUpi').value.includes('@')) {
      toast('Enter a valid UPI ID');
      return;
    }
    if (payMethod === 'card') {
      const card = document.getElementById('payCard').value.replace(/\s/g, '');
      if (card.length < 12) {
        toast('Enter a valid card number');
        return;
      }
    }

    const btn = document.getElementById('paySubmit');
    btn.textContent = 'Processing…';
    btn.disabled = true;

    await Pay.processPayment({
      plan: selectedPlan.plan,
      price: selectedPlan.price,
      name,
      method: payMethod,
    });

    btn.textContent = 'Pay now';
    btn.disabled = false;
    document.getElementById('payFormView').style.display = 'none';
    document.getElementById('paySuccessView').style.display = 'block';
    document.getElementById('paySuccessMsg').textContent =
      `You're on Beatify ${selectedPlan.plan} · ₹${selectedPlan.price}/mo. Earnings updated.`;
    refreshEarnings();
    renderHome();
  }

  /* ——— Player UI sync ——— */
  function updatePlayerUI({ song, isRadio, loading }) {
    if (!song) return;
    document.getElementById('npTitle').textContent = loading ? 'Loading…' : song.title;
    document.getElementById('npArtist').textContent = song.artist || '';
    document.getElementById('npArt').innerHTML = coverHTML(song, true);
    document.getElementById('npArt').classList.toggle('spinning', isRadio || false);

    const playing = Player.isPlaying();
    document.getElementById('iconPlay').style.display = playing ? 'none' : 'block';
    document.getElementById('iconPause').style.display = playing ? 'block' : 'none';

    if (isRadio) {
      document.getElementById('timeTotal').textContent = 'LIVE';
      document.getElementById('progressFill').style.width = '100%';
    }

    // Refresh playing highlights
    document.querySelectorAll('.track-row').forEach((row) => {
      row.classList.toggle('playing', String(row.dataset.id) === String(song.id));
    });
  }

  Player.on('change', updatePlayerUI);
  Player.on('time', ({ current, duration, paused }) => {
    if (Player.getState().isRadio) return;
    const pct = duration ? (current / duration) * 100 : 0;
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('timeCurrent').textContent = fmtTime(current);
    document.getElementById('timeTotal').textContent = fmtTime(duration);
    document.getElementById('iconPlay').style.display = paused ? 'block' : 'none';
    document.getElementById('iconPause').style.display = paused ? 'none' : 'block';
  });

  /* ——— Events ——— */
  function bindUI() {
    document.querySelectorAll('[data-view]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        showView(el.dataset.view);
      });
    });

    document.querySelectorAll('[data-playlist]').forEach((el) => {
      el.addEventListener('click', () => openPlaylist(el.dataset.playlist));
    });

    document.getElementById('heroPlay').addEventListener('click', () => {
      const list = songs.filter(canPlayPremium).slice(0, 100);
      Player.setQueue(list, 0);
      toast('Playing Top Hindi Hits');
    });

    document.getElementById('btnPlay').addEventListener('click', () => Player.toggle());
    document.getElementById('btnNext').addEventListener('click', () => Player.next());
    document.getElementById('btnPrev').addEventListener('click', () => Player.prev());
    document.getElementById('btnShuffle').addEventListener('click', () => {
      const on = Player.toggleShuffle();
      document.getElementById('btnShuffle').classList.toggle('active', on);
    });
    document.getElementById('btnRepeat').addEventListener('click', () => {
      const r = Player.cycleRepeat();
      document.getElementById('btnRepeat').classList.toggle('active', r > 0);
      toast(r === 0 ? 'Repeat off' : r === 1 ? 'Repeat all' : 'Repeat one');
    });
    document.getElementById('btnLike').addEventListener('click', () => {
      const on = Player.toggleLike();
      toast(on ? 'Added to Liked Songs' : 'Removed from Liked Songs');
    });

    document.getElementById('progressBar').addEventListener('click', (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      Player.seek((e.clientX - rect.left) / rect.width);
    });

    document.getElementById('volumeBar').addEventListener('click', (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const v = (e.clientX - rect.left) / rect.width;
      Player.setVolume(v);
      document.getElementById('volumeFill').style.width = v * 100 + '%';
    });

    document.getElementById('btnMute').addEventListener('click', () => {
      const el = Player.audio();
      el.muted = !el.muted;
      document.getElementById('volumeFill').style.width = el.muted ? '0%' : el.volume * 100 + '%';
    });

    let searchTimer;
    document.getElementById('globalSearch').addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => doSearch(e.target.value), 280);
    });

    document.getElementById('refreshOnline').addEventListener('click', loadOnlineSongs);

    document.getElementById('btnBack').addEventListener('click', () => {
      if (historyIdx > 0) {
        historyIdx--;
        showView(historyStack[historyIdx], false);
      }
    });
    document.getElementById('btnForward').addEventListener('click', () => {
      if (historyIdx < historyStack.length - 1) {
        historyIdx++;
        showView(historyStack[historyIdx], false);
      }
    });

    document.querySelectorAll('.btn-plan[data-plan]').forEach((btn) => {
      btn.addEventListener('click', () => openPayModal(btn.dataset.plan, btn.dataset.price));
    });

    document.querySelectorAll('.pay-method').forEach((m) => {
      m.addEventListener('click', () => {
        payMethod = m.dataset.method;
        syncPayFields();
      });
    });

    document.getElementById('payCancel').addEventListener('click', () => {
      document.getElementById('payModal').classList.remove('open');
    });
    document.getElementById('paySubmit').addEventListener('click', submitPayment);
    document.getElementById('payDone').addEventListener('click', () => {
      document.getElementById('payModal').classList.remove('open');
      showView('home');
      toast('Premium unlocked — enjoy HQ audio');
    });
    document.getElementById('payModal').addEventListener('click', (e) => {
      if (e.target.id === 'payModal') e.target.classList.remove('open');
    });

    // Card formatting
    document.getElementById('payCard').addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 16);
      e.target.value = v.replace(/(\d{4})(?=\d)/g, '$1 ');
    });
  }

  /* ——— Boot ——— */
  function init() {
    Player.setVolume(0.8);
    renderMoods('moodRow', (m) => {
      activeMood = m;
      const trending = [...songs].sort((a, b) => b.plays - a.plays);
      renderTrackList('trendingTracks', applyMood(trending).slice(0, 12));
    });
    renderMoods('searchMoods', (m) => {
      activeMood = m;
      showView('search');
      renderSearch(filterByMood(m).slice(0, 80));
    });
    renderHome();
    renderTrackList('libraryTracks', songs.slice(0, 100));
    document.getElementById('libraryTitle').textContent = `Your Library · ${songs.length} songs`;
    showView('home', false);
    historyStack = ['home'];
    historyIdx = 0;
    loadOnlineSongs();
    refreshEarnings();
    bindUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
