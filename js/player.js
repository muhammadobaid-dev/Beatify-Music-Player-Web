/**
 * Professional MP3 / stream player with queue, shuffle, repeat.
 */
window.BeatifyPlayer = (function () {
  const audio = () => document.getElementById('audioEngine');
  let queue = [];
  let index = -1;
  let shuffle = false;
  let repeat = 0; // 0 off, 1 all, 2 one
  let isRadio = false;
  let hls = null;
  let liked = new Set(JSON.parse(localStorage.getItem('beatify_liked') || '[]'));

  const listeners = { change: [], time: [], end: [] };

  function on(evt, fn) {
    if (listeners[evt]) listeners[evt].push(fn);
  }

  function emit(evt, payload) {
    (listeners[evt] || []).forEach((fn) => fn(payload));
  }

  function current() {
    return index >= 0 ? queue[index] : null;
  }

  function setQueue(songs, startIndex = 0) {
    isRadio = false;
    queue = songs.slice();
    index = startIndex;
    playCurrent();
  }

  function destroyHls() {
    if (hls) {
      hls.destroy();
      hls = null;
    }
  }

  async function playCurrent() {
    const song = current();
    if (!song) return;
    const el = audio();
    destroyHls();
    el.removeAttribute('src');

    let url = song.streamUrl || song.previewUrl || null;

    if (!url && !song.online && window.BeatifyAPI) {
      emit('change', { song, loading: true });
      url = await BeatifyAPI.resolvePreview(song);
    }

    if (!url) {
      url = 'audio/music.mp3';
      song._usingFallback = true;
    }

    const isHls = /\.m3u8(\?|$)/i.test(url);

    try {
      if (isHls && window.Hls && Hls.isSupported()) {
        hls = new Hls({ enableWorker: true });
        hls.loadSource(url);
        hls.attachMedia(el);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          el.play().catch(() => {});
        });
      } else if (isHls && el.canPlayType('application/vnd.apple.mpegurl')) {
        el.src = url;
        await el.play();
      } else {
        el.src = url;
        await el.play();
      }
    } catch (err) {
      console.warn('Playback error', err);
      if (!song._retried && url !== 'audio/music.mp3') {
        song._retried = true;
        el.src = 'audio/music.mp3';
        el.play().catch(() => {});
      }
    }

    emit('change', { song, loading: false, isRadio });
    updateLikeUI();
  }

  function playRadio(station) {
    isRadio = true;
    queue = [station];
    index = 0;
    station.streamUrl = station.url;
    station.title = station.name;
    station.artist = station.freq + ' · Live FM';
    station.coverHue = station.hue || 140;
    playCurrent();
  }

  function toggle() {
    const el = audio();
    if (!el.src && !hls) {
      if (queue.length) playCurrent();
      return;
    }
    if (el.paused) el.play().catch(() => {});
    else el.pause();
    emit('change', { song: current(), isRadio });
  }

  function next() {
    if (isRadio || !queue.length) return;
    if (shuffle) {
      index = Math.floor(Math.random() * queue.length);
    } else if (index < queue.length - 1) {
      index++;
    } else if (repeat === 1) {
      index = 0;
    } else {
      return;
    }
    playCurrent();
  }

  function prev() {
    if (isRadio || !queue.length) return;
    const el = audio();
    if (el.currentTime > 3) {
      el.currentTime = 0;
      return;
    }
    index = index > 0 ? index - 1 : queue.length - 1;
    playCurrent();
  }

  function seek(ratio) {
    const el = audio();
    if (!el.duration || isRadio) return;
    el.currentTime = ratio * el.duration;
  }

  function setVolume(v) {
    audio().volume = Math.max(0, Math.min(1, v));
  }

  function toggleShuffle() {
    shuffle = !shuffle;
    return shuffle;
  }

  function cycleRepeat() {
    repeat = (repeat + 1) % 3;
    return repeat;
  }

  function toggleLike() {
    const song = current();
    if (!song || song.online || isRadio) return liked.has(song && song.id);
    if (liked.has(song.id)) liked.delete(song.id);
    else liked.add(song.id);
    localStorage.setItem('beatify_liked', JSON.stringify([...liked]));
    updateLikeUI();
    return liked.has(song.id);
  }

  function isLiked(id) {
    return liked.has(id);
  }

  function getLikedIds() {
    return liked;
  }

  function updateLikeUI() {
    const btn = document.getElementById('btnLike');
    const song = current();
    if (!btn) return;
    btn.classList.toggle('liked', song && liked.has(song.id));
  }

  function bindAudioEvents() {
    const el = audio();
    el.addEventListener('timeupdate', () => {
      emit('time', {
        current: el.currentTime,
        duration: el.duration || 0,
        paused: el.paused,
      });
    });
    el.addEventListener('play', () => emit('change', { song: current(), isRadio }));
    el.addEventListener('pause', () => emit('change', { song: current(), isRadio }));
    el.addEventListener('ended', () => {
      if (isRadio) return;
      if (repeat === 2) {
        el.currentTime = 0;
        el.play();
        return;
      }
      next();
      emit('end');
    });
  }

  function isPlaying() {
    const el = audio();
    return !el.paused && (!!el.src || !!hls);
  }

  function getState() {
    return { shuffle, repeat, isRadio, index, queue };
  }

  bindAudioEvents();

  return {
    setQueue,
    playRadio,
    toggle,
    next,
    prev,
    seek,
    setVolume,
    toggleShuffle,
    cycleRepeat,
    toggleLike,
    isLiked,
    getLikedIds,
    current,
    on,
    isPlaying,
    getState,
    audio,
  };
})();
