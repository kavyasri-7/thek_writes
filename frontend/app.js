// State
let currentTab = 'micTab';
let recordDuration = 6;
let selectedMicMode = 'auto'; // 'auto', 'singing', 'shazam'
let selectedUploadMode = 'auto'; // 'auto', 'singing', 'shazam'

let mediaRecorder = null;
let audioChunks = [];
let audioContext = null;
let analyser = null;
let animFrameId = null;
let isRecording = false;

// Speech Recognition for live singing detection
let speechRecognition = null;
let liveCapturedLyrics = '';

let uploadedFile = null;
let uploadedAudioDuration = 0;

let currentTrack = null;
let previewAudio = document.getElementById('audioElement');
let isAudioPlaying = false;

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60';

// DOM Elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

const recordBtn = document.getElementById('recordBtn');
const micIcon = document.getElementById('micIcon');
const countdownNum = document.getElementById('countdownNum');
const micStatusTitle = document.getElementById('micStatusTitle');
const micStatusDesc = document.getElementById('micStatusDesc');
const micCanvas = document.getElementById('micCanvas');
const durationPills = document.querySelectorAll('.duration-pill');
const micModePills = document.querySelectorAll('#micModeSelector .mode-pill');
const liveSingingBox = document.getElementById('liveSingingBox');
const liveSingingText = document.getElementById('liveSingingText');

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileConfigCard = document.getElementById('fileConfigCard');
const loadedFileName = document.getElementById('loadedFileName');
const loadedFileMeta = document.getElementById('loadedFileMeta');
const clearFileBtn = document.getElementById('clearFileBtn');
const autoMiddleBtn = document.getElementById('autoMiddleBtn');
const startTimeInput = document.getElementById('startTimeInput');
const durationInput = document.getElementById('durationInput');
const startTimeFormatted = document.getElementById('startTimeFormatted');
const timeSlider = document.getElementById('timeSlider');
const detectUploadBtn = document.getElementById('detectUploadBtn');
const middleIndicator = document.getElementById('middleIndicator');
const uploadModePills = document.querySelectorAll('#uploadModeSelector .mode-pill');

// Lyrics Search Elements
const lyricsTextInput = document.getElementById('lyricsTextInput');
const speakLyricsBtn = document.getElementById('speakLyricsBtn');
const searchLyricsBtn = document.getElementById('searchLyricsBtn');
const quickChips = document.querySelectorAll('.quick-chip');

const demoCardsGrid = document.getElementById('demoCardsGrid');

const loadingCard = document.getElementById('loadingCard');
const loadingText = document.getElementById('loadingText');
const loadingSubtext = document.getElementById('loadingSubtext');
const resultCard = document.getElementById('resultCard');
const errorCard = document.getElementById('errorCard');
const errorTitle = document.getElementById('errorTitle');
const errorDesc = document.getElementById('errorDesc');
const retryBtn = document.getElementById('retryBtn');

// Result Elements
const resCover = document.getElementById('resCover');
const resTitle = document.getElementById('resTitle');
const resArtist = document.getElementById('resArtist');
const resAlbumChip = document.getElementById('resAlbumChip');
const resGenreChip = document.getElementById('resGenreChip');
const resOffsetChip = document.getElementById('resOffsetChip');
const resSourceBadge = document.getElementById('resSourceBadge');
const resSourceIcon = document.getElementById('resSourceIcon');
const resSourceText = document.getElementById('resSourceText');

const playPauseBtn = document.getElementById('playPauseBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const playerTimer = document.getElementById('playerTimer');
const audioScrubber = document.getElementById('audioScrubber');
const audioProgress = document.getElementById('audioProgress');
const resSpotifyBtn = document.getElementById('resSpotifyBtn');
const resYouTubeBtn = document.getElementById('resYouTubeBtn');
const resAppleBtn = document.getElementById('resAppleBtn');
const lyricsContainer = document.getElementById('lyricsContainer');
const toggleLyricsBtn = document.getElementById('toggleLyricsBtn');
const lyricsContent = document.getElementById('lyricsContent');
const lyricsArrow = document.getElementById('lyricsArrow');

// History & Modals
const viewHistoryBtn = document.getElementById('viewHistoryBtn');
const historyModal = document.getElementById('historyModal');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const historyList = document.getElementById('historyList');
const historyCount = document.getElementById('historyCount');

const youtubeModal = document.getElementById('youtubeModal');
const ytModalTitle = document.getElementById('ytModalTitle');
const closeYtBtn = document.getElementById('closeYtBtn');
const ytIframe = document.getElementById('ytIframe');

/* ==========================================================================
   Initialization
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupMicControls();
  setupUploadControls();
  setupLyricsSearchControls();
  setupAudioPlayer();
  setupModals();
  loadDemoSamples();
  updateHistoryUI();
  drawDefaultCanvas();
});

/* ==========================================================================
   Tab Navigation
   ========================================================================== */
function setupTabs() {
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(targetId).classList.add('active');
      currentTab = targetId;

      hideResultsAndErrors();
    });
  });
}

function hideResultsAndErrors() {
  resultCard.classList.add('hidden');
  errorCard.classList.add('hidden');
  loadingCard.classList.add('hidden');
  pausePreview();
}

/* ==========================================================================
   Microphone Live Recording & Audio Visualizer
   ========================================================================== */
function setupMicControls() {
  durationPills.forEach(pill => {
    pill.addEventListener('click', () => {
      durationPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      recordDuration = parseInt(pill.dataset.duration, 10);
    });
  });

  micModePills.forEach(pill => {
    pill.addEventListener('click', () => {
      micModePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedMicMode = pill.dataset.mode;
      
      if (selectedMicMode === 'singing') {
        micStatusTitle.textContent = "Sing into Microphone";
        micStatusDesc.textContent = "Sing words from the chorus or verse clearly. SongDetect will identify the song via vocal AI!";
      } else if (selectedMicMode === 'shazam') {
        micStatusTitle.textContent = "Play Original Track";
        micStatusDesc.textContent = "Play a studio snippet or song through your speaker for fingerprint matching.";
      } else {
        micStatusTitle.textContent = "Tap Radar to Sing or Play";
        micStatusDesc.textContent = "Sing your favorite song or play music aloud. Dual-engine automatically detects both!";
      }
    });
  });

  recordBtn.addEventListener('click', () => {
    if (isRecording) return;
    startRecording();
  });
}

function initLiveSpeechRecognition() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    speechRecognition = null;
    return;
  }

  try {
    speechRecognition = new SpeechRec();
    speechRecognition.continuous = true;
    speechRecognition.interimResults = true;
    speechRecognition.lang = 'en-US';

    speechRecognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        interim += event.results[i][0].transcript;
      }
      if (interim.trim()) {
        liveCapturedLyrics = interim.trim();
        liveSingingBox.classList.remove('hidden');
        liveSingingText.textContent = `"${liveCapturedLyrics}"`;
      }
    };

    speechRecognition.onerror = (e) => {
      // Speech recognition non-critical, backend will transcribe fallback
    };
  } catch (e) {
    speechRecognition = null;
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    isRecording = true;
    audioChunks = [];
    liveCapturedLyrics = '';

    // Setup visualizer
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    // Setup MediaRecorder
    let options = {};
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      options = { mimeType: 'audio/webm;codecs=opus' };
    } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
      options = { mimeType: 'audio/ogg;codecs=opus' };
    }

    mediaRecorder = new MediaRecorder(stream, options);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const mimeType = mediaRecorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunks, { type: mimeType });
      stream.getTracks().forEach(track => track.stop());
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
      cancelAnimationFrame(animFrameId);
      drawDefaultCanvas();

      if (speechRecognition) {
        try { speechRecognition.stop(); } catch (e) {}
      }

      // Send to backend
      await sendMicAudioToBackend(audioBlob, liveCapturedLyrics);
    };

    mediaRecorder.start();

    // Start live speech recognition if in singing or auto mode
    if (selectedMicMode !== 'shazam') {
      initLiveSpeechRecognition();
      if (speechRecognition) {
        try { speechRecognition.start(); } catch (e) {}
      }
    }

    // UI Updates
    recordBtn.classList.add('listening');
    micIcon.classList.add('hidden');
    countdownNum.classList.remove('hidden');
    micStatusTitle.textContent = selectedMicMode === 'singing' ? "Listening to your singing..." : "Listening to Audio...";
    micStatusDesc.textContent = "Sing chorus lyrics clearly or play the song. Identifying soon...";

    let remaining = recordDuration;
    countdownNum.textContent = remaining;

    const timer = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        countdownNum.textContent = remaining;
      } else {
        clearInterval(timer);
        stopRecording();
      }
    }, 1000);

    drawLiveWaves();

  } catch (err) {
    console.error("Microphone access error:", err);
    alert("Could not access microphone. Please grant microphone permission in your browser.");
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  isRecording = false;
  recordBtn.classList.remove('listening');
  micIcon.classList.remove('hidden');
  countdownNum.classList.add('hidden');
  micStatusTitle.textContent = "Identifying song...";
}

function drawDefaultCanvas() {
  const ctx = micCanvas.getContext('2d');
  const w = micCanvas.width;
  const h = micCanvas.height;
  ctx.clearRect(0, 0, w, h);
  
  // Draw subtle circular track
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 85, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawLiveWaves() {
  if (!isRecording || !analyser) return;

  const ctx = micCanvas.getContext('2d');
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  const w = micCanvas.width;
  const h = micCanvas.height;
  const centerX = w / 2;
  const centerY = h / 2;
  const radius = 85;

  ctx.clearRect(0, 0, w, h);

  const numBars = 36;
  const step = (Math.PI * 2) / numBars;

  for (let i = 0; i < numBars; i++) {
    const dataIndex = Math.floor((i / numBars) * bufferLength);
    const value = dataArray[dataIndex] || 0;
    const barHeight = Math.max(4, (value / 255) * 45);

    const angle = i * step;
    const x1 = centerX + Math.cos(angle) * radius;
    const y1 = centerY + Math.sin(angle) * radius;
    const x2 = centerX + Math.cos(angle) * (radius + barHeight);
    const y2 = centerY + Math.sin(angle) * (radius + barHeight);

    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, '#9d4edd');
    grad.addColorStop(0.5, '#ff2a85');
    grad.addColorStop(1, '#00f2fe');

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  animFrameId = requestAnimationFrame(drawLiveWaves);
}

async function sendMicAudioToBackend(blob, capturedLyrics) {
  showLoading(
    selectedMicMode === 'singing' 
      ? "Transcribing your singing & matching lyrics against global catalog..."
      : "Fingerprinting audio & checking studio / singing databases..."
  );

  const formData = new FormData();
  formData.append('audio', blob, 'mic_recording.webm');
  formData.append('mode', selectedMicMode);
  if (capturedLyrics) {
    formData.append('lyrics', capturedLyrics);
  }

  try {
    const resp = await fetch('/api/recognize-mic', {
      method: 'POST',
      body: formData
    });
    const data = await resp.json();
    handleRecognitionResponse(data);
  } catch (err) {
    showError("Connection Error", "Failed to communicate with recognition server: " + err.message);
  } finally {
    liveSingingBox.classList.add('hidden');
  }
}

/* ==========================================================================
   File Upload & Middle Snippet Slicer
   ========================================================================== */
function setupUploadControls() {
  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFileSelected(fileInput.files[0]);
    }
  });

  uploadModePills.forEach(pill => {
    pill.addEventListener('click', () => {
      uploadModePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedUploadMode = pill.dataset.mode;
    });
  });

  clearFileBtn.addEventListener('click', () => {
    uploadedFile = null;
    fileInput.value = '';
    fileConfigCard.classList.add('hidden');
    dropZone.classList.remove('hidden');
  });

  autoMiddleBtn.addEventListener('click', () => {
    if (!uploadedAudioDuration) return;
    const middlePoint = Math.floor(uploadedAudioDuration / 2);
    startTimeInput.value = middlePoint;
    timeSlider.value = middlePoint;
    startTimeFormatted.textContent = formatSeconds(middlePoint);
  });

  timeSlider.addEventListener('input', () => {
    const val = parseInt(timeSlider.value, 10);
    startTimeInput.value = val;
    startTimeFormatted.textContent = formatSeconds(val);
  });

  startTimeInput.addEventListener('input', () => {
    let val = parseInt(startTimeInput.value, 10) || 0;
    if (val < 0) val = 0;
    if (uploadedAudioDuration && val > uploadedAudioDuration) val = Math.floor(uploadedAudioDuration);
    timeSlider.value = val;
    startTimeFormatted.textContent = formatSeconds(val);
  });

  detectUploadBtn.addEventListener('click', async () => {
    if (!uploadedFile) return;

    const startVal = parseFloat(startTimeInput.value) || 0;
    const durVal = parseFloat(durationInput.value) || 7;

    showLoading(
      selectedUploadMode === 'singing'
        ? "Transcribing voice recording & matching song..."
        : `Analyzing audio snippet (${formatSeconds(startVal)} - ${formatSeconds(startVal + durVal)})...`
    );

    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('start_time', startVal);
    formData.append('duration', durVal);
    formData.append('mode', selectedUploadMode);

    try {
      const resp = await fetch('/api/recognize-upload', {
        method: 'POST',
        body: formData
      });
      const data = await resp.json();
      handleRecognitionResponse(data);
    } catch (err) {
      showError("Upload Error", "Failed to analyze uploaded audio: " + err.message);
    }
  });
}

function handleFileSelected(file) {
  uploadedFile = file;
  loadedFileName.textContent = file.name;
  loadedFileMeta.textContent = `Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB • Analyzing duration...`;

  dropZone.classList.add('hidden');
  fileConfigCard.classList.remove('hidden');

  const tempAudio = new Audio();
  tempAudio.src = URL.createObjectURL(file);
  tempAudio.addEventListener('loadedmetadata', () => {
    uploadedAudioDuration = tempAudio.duration;
    loadedFileMeta.textContent = `Duration: ${formatSeconds(tempAudio.duration)} • Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`;

    timeSlider.max = Math.floor(tempAudio.duration);
    const defaultMiddle = Math.floor(tempAudio.duration / 2);
    timeSlider.value = defaultMiddle;
    startTimeInput.value = defaultMiddle;
    startTimeFormatted.textContent = formatSeconds(defaultMiddle);
  });
}

/* ==========================================================================
   Lyrics Sing or Type Search Controls
   ========================================================================== */
function setupLyricsSearchControls() {
  searchLyricsBtn.addEventListener('click', () => {
    const text = lyricsTextInput.value.trim();
    if (!text) {
      alert("Please enter or sing a few words of lyrics first!");
      return;
    }
    searchSongByLyrics(text);
  });

  lyricsTextInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const text = lyricsTextInput.value.trim();
      if (text) searchSongByLyrics(text);
    }
  });

  // Voice input button in search bar
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRec) {
    const voiceSearcher = new SpeechRec();
    voiceSearcher.lang = 'en-US';

    voiceSearcher.onstart = () => {
      speakLyricsBtn.classList.add('listening');
      lyricsTextInput.placeholder = "Sing or speak lyrics now...";
    };

    voiceSearcher.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      lyricsTextInput.value = transcript;
      speakLyricsBtn.classList.remove('listening');
      lyricsTextInput.placeholder = "e.g. 'I see a little silhouetto of a man'";
      searchSongByLyrics(transcript);
    };

    voiceSearcher.onerror = () => {
      speakLyricsBtn.classList.remove('listening');
      lyricsTextInput.placeholder = "e.g. 'I see a little silhouetto of a man'";
    };

    voiceSearcher.onend = () => {
      speakLyricsBtn.classList.remove('listening');
    };

    speakLyricsBtn.addEventListener('click', () => {
      try {
        voiceSearcher.start();
      } catch (e) {
        voiceSearcher.stop();
      }
    });
  } else {
    speakLyricsBtn.style.display = 'none';
  }

  // Quick lyrics chips
  quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const query = chip.dataset.query;
      lyricsTextInput.value = query;
      searchSongByLyrics(query);
    });
  });
}

async function searchSongByLyrics(lyricsText) {
  showLoading(`Searching global music catalog for lyrics: "${lyricsText}"...`);

  const formData = new FormData();
  formData.append('lyrics', lyricsText);

  try {
    const resp = await fetch('/api/recognize-lyrics', {
      method: 'POST',
      body: formData
    });
    const data = await resp.json();
    handleRecognitionResponse(data);
  } catch (err) {
    showError("Search Error", err.message);
  }
}

/* ==========================================================================
   Demo Middle Snippets
   ========================================================================== */
async function loadDemoSamples() {
  try {
    const resp = await fetch('/api/samples');
    const data = await resp.json();
    const samples = data.samples || [];

    demoCardsGrid.innerHTML = '';
    samples.forEach(sample => {
      const card = document.createElement('div');
      card.className = 'demo-card';
      card.innerHTML = `
        <div class="demo-card-info">
          <div class="demo-card-title">${escapeHtml(sample.title)}</div>
          <div class="demo-card-artist">${escapeHtml(sample.artist)}</div>
          <div class="demo-card-hint">${escapeHtml(sample.hint)}</div>
        </div>
        <button class="btn-primary btn-sm test-sample-btn" data-id="${sample.id}">
          ⚡ Test Middle Snippet (${sample.duration})
        </button>
      `;
      demoCardsGrid.appendChild(card);
    });

    document.querySelectorAll('.test-sample-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        showLoading(`Analyzing middle excerpt (${id})...`);
        try {
          const res = await fetch(`/api/recognize-sample/${id}`, { method: 'POST' });
          const json = await res.json();
          handleRecognitionResponse(json);
        } catch (err) {
          showError("Demo Error", err.message);
        }
      });
    });

  } catch (err) {
    console.error("Failed to load demo samples:", err);
  }
}

/* ==========================================================================
   Handle Recognition Result
   ========================================================================== */
function handleRecognitionResponse(data) {
  loadingCard.classList.add('hidden');

  if (!data || !data.found) {
    showError(
      "Song Not Recognized",
      data?.message || "No match was found in the worldwide catalog. If you are singing, try singing with louder, clearer lyrics or use the 'Sing / Type Lyrics' tab!"
    );
    return;
  }

  currentTrack = data;
  saveToHistory(data);

  // Populate UI
  resCover.src = data.cover_art || DEFAULT_COVER;
  resTitle.textContent = data.title;
  resArtist.textContent = data.artist;

  // Source Badge (Studio vs Singing)
  if (data.detection_mode === 'singing') {
    resSourceBadge.classList.add('singing-source');
    resSourceIcon.textContent = '🎤';
    resSourceText.textContent = data.detected_lyrics 
      ? `Human Singing: "${data.detected_lyrics}"` 
      : 'Human Singing Voice Match';
  } else {
    resSourceBadge.classList.remove('singing-source');
    resSourceIcon.textContent = '🎵';
    resSourceText.textContent = 'Studio Fingerprint Match';
  }

  resAlbumChip.textContent = data.album ? `Album: ${data.album}` : 'Single / Album';
  resGenreChip.textContent = `Genre: ${data.genre || 'Music'}`;
  
  if (data.offset_seconds !== null && data.offset_seconds !== undefined) {
    resOffsetChip.textContent = `Match Offset: ~${formatSeconds(data.offset_seconds)}`;
    resOffsetChip.classList.remove('hidden');
  } else {
    resOffsetChip.classList.add('hidden');
  }

  // Preview Audio
  if (data.preview_audio) {
    previewAudio.src = data.preview_audio;
    document.getElementById('audioPlayerContainer').classList.remove('hidden');
    resetPlayerUI();
  } else {
    document.getElementById('audioPlayerContainer').classList.add('hidden');
  }

  // External Links
  resSpotifyBtn.href = data.links.spotify;
  resYouTubeBtn.onclick = () => openYouTubeModal(data.title, data.artist);
  if (data.links.apple_music) {
    resAppleBtn.href = data.links.apple_music;
    resAppleBtn.classList.remove('hidden');
  } else {
    resAppleBtn.classList.add('hidden');
  }

  // Lyrics
  if (data.lyrics && data.lyrics.length > 0) {
    lyricsContainer.classList.remove('hidden');
    lyricsContent.textContent = data.lyrics.join('\n');
    lyricsContent.classList.add('hidden');
    lyricsArrow.textContent = '▼';
  } else {
    lyricsContainer.classList.add('hidden');
  }

  errorCard.classList.add('hidden');
  resultCard.classList.remove('hidden');
  resultCard.scrollIntoView({ behavior: 'smooth' });
}

/* ==========================================================================
   Built-in Preview Player
   ========================================================================== */
function setupAudioPlayer() {
  playPauseBtn.addEventListener('click', togglePreviewPlayback);

  previewAudio.addEventListener('timeupdate', () => {
    if (!previewAudio.duration) return;
    const progress = (previewAudio.currentTime / previewAudio.duration) * 100;
    audioProgress.style.width = `${progress}%`;
    playerTimer.textContent = `${formatSeconds(previewAudio.currentTime)} / ${formatSeconds(previewAudio.duration)}`;
  });

  previewAudio.addEventListener('ended', () => {
    pausePreview();
    audioProgress.style.width = '0%';
    playerTimer.textContent = `0:00 / ${formatSeconds(previewAudio.duration || 30)}`;
  });

  audioScrubber.addEventListener('click', (e) => {
    if (!previewAudio.duration) return;
    const rect = audioScrubber.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = clickX / rect.width;
    previewAudio.currentTime = pct * previewAudio.duration;
  });

  toggleLyricsBtn.addEventListener('click', () => {
    const isHidden = lyricsContent.classList.toggle('hidden');
    lyricsArrow.textContent = isHidden ? '▼' : '▲';
  });
}

function togglePreviewPlayback() {
  if (previewAudio.paused) {
    previewAudio.play().then(() => {
      isAudioPlaying = true;
      playIcon.classList.add('hidden');
      pauseIcon.classList.remove('hidden');
    }).catch(err => console.error("Playback error:", err));
  } else {
    pausePreview();
  }
}

function pausePreview() {
  previewAudio.pause();
  isAudioPlaying = false;
  playIcon.classList.remove('hidden');
  pauseIcon.classList.add('hidden');
}

function resetPlayerUI() {
  pausePreview();
  audioProgress.style.width = '0%';
  playerTimer.textContent = '0:00 / 0:30';
}

/* ==========================================================================
   Modals & YouTube Embed
   ========================================================================== */
function setupModals() {
  // YouTube Modal
  closeYtBtn.addEventListener('click', () => {
    youtubeModal.classList.add('hidden');
    ytIframe.src = '';
  });

  // History Modal
  viewHistoryBtn.addEventListener('click', () => {
    renderHistoryList();
    historyModal.classList.remove('hidden');
  });

  closeHistoryBtn.addEventListener('click', () => historyModal.classList.add('hidden'));

  clearHistoryBtn.addEventListener('click', () => {
    localStorage.removeItem('song_detect_history');
    updateHistoryUI();
    renderHistoryList();
  });

  // Retry button
  retryBtn.addEventListener('click', () => {
    hideResultsAndErrors();
    if (currentTab === 'micTab') {
      startRecording();
    } else if (currentTab === 'uploadTab') {
      fileInput.click();
    }
  });
}

function openYouTubeModal(title, artist) {
  pausePreview();
  ytModalTitle.textContent = `${title} • ${artist} (YouTube)`;
  const query = encodeURIComponent(`${title} ${artist} official audio`);
  ytIframe.src = `https://www.youtube.com/embed?listType=search&list=${query}&autoplay=1`;
  youtubeModal.classList.remove('hidden');
}

/* ==========================================================================
   History Storage (localStorage)
   ========================================================================== */
function getHistory() {
  try {
    return JSON.parse(localStorage.getItem('song_detect_history')) || [];
  } catch {
    return [];
  }
}

function saveToHistory(track) {
  let hist = getHistory();
  // Filter out duplicates with same title & artist
  hist = hist.filter(item => !(item.title === track.title && item.artist === track.artist));
  hist.unshift({
    ...track,
    identifiedAt: new Date().toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  });
  if (hist.length > 25) hist.pop();
  localStorage.setItem('song_detect_history', JSON.stringify(hist));
  updateHistoryUI();
}

function updateHistoryUI() {
  const hist = getHistory();
  historyCount.textContent = hist.length;
}

function renderHistoryList() {
  const hist = getHistory();
  if (hist.length === 0) {
    historyList.innerHTML = `<p style="text-align:center; color: var(--text-dim); padding: 2rem;">No songs identified yet.</p>`;
    return;
  }

  historyList.innerHTML = hist.map(item => `
    <div class="history-item" onclick="restoreFromHistory('${escapeHtml(item.title)}')">
      <img src="${item.cover_art || DEFAULT_COVER}" class="history-img" alt="${escapeHtml(item.title)}">
      <div class="history-info">
        <div class="history-title">${escapeHtml(item.title)}</div>
        <div class="history-artist">${escapeHtml(item.artist)}</div>
        <div class="history-date">${item.identifiedAt || ''}</div>
      </div>
    </div>
  `).join('');
}

window.restoreFromHistory = function(title) {
  const hist = getHistory();
  const track = hist.find(item => item.title === title);
  if (track) {
    historyModal.classList.add('hidden');
    handleRecognitionResponse(track);
  }
};

/* ==========================================================================
   Utilities & Feedback Helpers
   ========================================================================== */
function showLoading(msg) {
  hideResultsAndErrors();
  loadingText.textContent = msg;
  loadingCard.classList.remove('hidden');
  loadingCard.scrollIntoView({ behavior: 'smooth' });
}

function showError(title, desc) {
  loadingCard.classList.add('hidden');
  resultCard.classList.add('hidden');
  errorTitle.textContent = title;
  errorDesc.textContent = desc;
  errorCard.classList.remove('hidden');
  errorCard.scrollIntoView({ behavior: 'smooth' });
}

function formatSeconds(secs) {
  if (isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
