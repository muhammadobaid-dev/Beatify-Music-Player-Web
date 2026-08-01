/**
 * Live FM Radio stations — MP3 / HLS streams.
 */
window.BeatifyRadio = (function () {
  const stations = [
    {
      id: 'r1',
      name: 'Hindi Retro Hits',
      freq: '98.3 FM',
      genre: 'Bollywood Classics',
      url: 'https://stream.zeno.fm/v2zfmxef798uv',
      hue: 15,
    },
    {
      id: 'r2',
      name: 'Radio Masti',
      freq: '91.1 FM',
      genre: 'Hindi Party',
      url: 'https://stream.zeno.fm/88thk459f0hvv',
      hue: 320,
    },
    {
      id: 'r3',
      name: 'Goldy Mukesh',
      freq: '94.3 FM',
      genre: 'Evergreen Hindi',
      url: 'https://stream.zeno.fm/mrcz5sus1p8uv',
      hue: 45,
    },
    {
      id: 'r4',
      name: 'Joyful Melodies',
      freq: '102.0 FM',
      genre: 'Devotional / Soft',
      url: 'https://stream.zeno.fm/9re8ry3qzk0uv',
      hue: 200,
    },
    {
      id: 'r5',
      name: 'AIR Vividh Bharati',
      freq: '100.1 FM',
      genre: 'All India Radio',
      url: 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio001/playlist.m3u8',
      hue: 160,
    },
    {
      id: 'r6',
      name: 'AIR FM Gold',
      freq: '100.5 FM',
      genre: 'News & Music',
      url: 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio005/playlist.m3u8',
      hue: 50,
    },
    {
      id: 'r7',
      name: 'AIR FM Rainbow',
      freq: '107.1 FM',
      genre: 'Contemporary',
      url: 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio004/playlist.m3u8',
      hue: 280,
    },
    {
      id: 'r8',
      name: 'AIR Raagam',
      freq: '105.0 FM',
      genre: 'Classical Indian',
      url: 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio139/playlist.m3u8',
      hue: 220,
    },
    {
      id: 'r9',
      name: 'SomaFM Groove Salad',
      freq: 'Web',
      genre: 'Chill Global',
      url: 'https://ice2.somafm.com/groovesalad-128-mp3',
      hue: 100,
    },
    {
      id: 'r10',
      name: 'Radio Paradise',
      freq: 'Web',
      genre: 'Eclectic Hits',
      url: 'https://stream.radioparadise.com/aac-128',
      hue: 190,
    },
    {
      id: 'r11',
      name: 'Kashmir Online',
      freq: '93.5 FM',
      genre: 'Regional',
      url: 'https://stream.zeno.fm/hdsynxpdam8uv',
      hue: 340,
    },
    {
      id: 'r12',
      name: 'Swachh Radio',
      freq: '90.4 FM',
      genre: 'Community / Hindi',
      url: 'https://stream.zeno.fm/4dycn4hmffhvv',
      hue: 130,
    },
  ];

  function getStations() {
    return stations;
  }

  function getById(id) {
    return stations.find((s) => s.id === id);
  }

  return { getStations, getById };
})();
