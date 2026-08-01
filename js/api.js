/**
 * Online song fetch via iTunes Search API (free, no key).
 * Returns 30s previews + artwork for Hindi / Bollywood queries.
 */
window.BeatifyAPI = (function () {
  const ITUNES = 'https://itunes.apple.com/search';

  async function searchTracks(term, limit = 24) {
    const url = `${ITUNES}?term=${encodeURIComponent(term)}&media=music&entity=song&country=IN&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();
    return (data.results || []).map((t, i) => ({
      id: 'online-' + t.trackId,
      title: t.trackName,
      artist: t.artistName,
      album: t.collectionName || 'Single',
      year: t.releaseDate ? new Date(t.releaseDate).getFullYear() : '',
      duration: Math.round((t.trackTimeMillis || 0) / 1000) || 30,
      durationText: formatDur(Math.round((t.trackTimeMillis || 30000) / 1000)),
      previewUrl: t.previewUrl,
      cover: (t.artworkUrl100 || '').replace('100x100', '300x300'),
      mood: 'Online',
      premium: false,
      online: true,
      coverHue: (i * 53) % 360,
    }));
  }

  async function resolvePreview(song) {
    if (song.previewUrl) return song.previewUrl;
    try {
      const q = `${song.title} ${song.artist}`;
      const results = await searchTracks(q, 5);
      const match = results.find((r) => r.previewUrl) || results[0];
      if (match && match.previewUrl) {
        song.previewUrl = match.previewUrl;
        if (match.cover) song.cover = match.cover;
        return match.previewUrl;
      }
    } catch (_) { /* fall through */ }
    return null;
  }

  async function fetchNewHindi() {
    const queries = [
      'Bollywood Hindi hits',
      'Arijit Singh',
      'Punjabi hits',
      'Hindi romantic songs',
      'Shreya Ghoshal',
    ];
    const pick = queries[Math.floor(Math.random() * queries.length)];
    return searchTracks(pick, 20);
  }

  function formatDur(sec) {
    const m = Math.floor(sec / 60);
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  return { searchTracks, resolvePreview, fetchNewHindi };
})();
