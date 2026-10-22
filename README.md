# 🎵 SongDetect — Worldwide Song Identification from Middle Snippets & Human Singing

**SongDetect** is a full-stack audio recognition application featuring a **Dual-Engine architecture**:
1. **Acoustic Fingerprint Engine**: Identifies official studio tracks from just a short 5–8 second excerpt taken from anywhere in the song (including the middle, bridge, or chorus).
2. **Vocal AI & Singing Engine**: Transcribes human vocal lyrics in real time and pinpoints the official song from billions of tracks in global music catalogs!

---

## ✨ Key Features

1. **Dual-Engine Recognition**:
   - **⚡ Smart Auto Mode**: Automatically runs Shazam acoustic signature matching; if you are singing rather than playing a studio track, it automatically engages the Vocal AI engine.
   - **🎤 Human Singing Mode**: Optimized specifically for human voices, sung lyrics, and vocal melodies.
   - **🎵 Studio Track Mode**: For official tracks, radio playback, and middle excerpts.
2. **Global Catalog Detection**: Powered by Rust-accelerated audio signature matching against worldwide commercial music catalogs (billions of songs).
3. **Interactive Middle Slicer**: Upload any audio file (.mp3, .wav, .m4a, .ogg, .flac) and use the interactive timeline scrubber or the **⚡ Auto-Select Middle** button to test identifying the song from any chosen timestamp.
4. **Live Microphone Listening & Real-Time Feedback**: Tap the central radar button to listen live through your microphone. Displays real-time live transcribed lyrics as you sing!
5. **Sing / Type Lyrics Search**: Type or speak a line of chorus lyrics into the mic to identify the song in under 1 second.
6. **Instant Demo Excerpts**: Includes pre-extracted 6-second middle clips from legendary tracks (*Queen - Bohemian Rhapsody*, *The Weeknd - Blinding Lights*, *Ed Sheeran - Shape of You*) to test detection with 1 click.
7. **Rich Track Experience**:
   - High-definition album artwork with dynamic backdrop aura
   - Track title, artist, album, genre, and exact match timestamp offset
   - Built-in audio player with 30-second official preview playback
   - One-click buttons to stream on **Spotify**, **YouTube** (with embedded player modal), and **Apple Music**
   - Full synchronized/static lyrics viewer (when available)
   - Identification History drawer saved in local storage

---

## 🚀 Quick Start

### 1. Launch the Application

In this project directory, run:

```bash
python run.py
```

The server will start at `http://localhost:8000` and automatically open your default web browser!

---

## 🛠️ Project Structure

```
get your Song/
├── backend/
│   ├── app.py             # FastAPI server & REST API endpoints
│   ├── recognizer.py      # Audio conversion & ShazamIO fingerprint engine
│   └── samples/           # Pre-packaged middle excerpt snippets (.wav)
├── frontend/
│   ├── index.html         # Modern responsive UI with semantic HTML5
│   ├── style.css          # Glassmorphic dark theme, CSS variables & animations
│   └── app.js             # Web Audio API visualizer, media recorder & slicer
├── run.py                 # 1-click startup launcher
├── requirements.txt       # Python dependencies
└── README.md
```
