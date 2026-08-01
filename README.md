# Beatify — Professional Hindi Music Player

Spotify-style MP3 music player with **500 Hindi songs**, online track fetch, **live FM radio**, and a **Premium payment system**.

## Features

- Spotify-inspired UI / UX (sidebar, home, search, player bar)
- 500 Hindi / Bollywood catalog with moods & playlists
- Online song discovery via iTunes Search API (previews + artwork)
- Professional player: play / pause, seek, volume, shuffle, repeat, likes
- Live FM Radio (Zeno, All India Radio HLS, SomaFM, Radio Paradise)
- Premium plans with UPI / Card / Wallet demo checkout + creator earnings

## How to run

Open `index.html` in a modern browser, or serve locally:

```bash
npx serve .
```

Online previews and some radio streams need internet. For CORS-free local use, prefer a simple static server.

## Payment (demo)

Checkout is simulated and saved in `localStorage`. For production, connect **Razorpay** or **Stripe** on a backend and replace `js/payment.js`.

## Project structure

```
index.html      → App shell
css/app.css     → Design system
js/songs-data.js → 500 Hindi tracks
js/api.js       → Online fetch
js/player.js    → Audio engine
js/radio.js     → FM stations
js/payment.js   → Subscriptions
js/app.js       → UI controller
```
