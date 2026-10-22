import os
import shutil
import tempfile
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from backend.recognizer import SongRecognizer

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
SAMPLES_DIR = BASE_DIR / "backend" / "samples"

app = FastAPI(title="SongDetector - Global Song Identification Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

recognizer = SongRecognizer()

SAMPLE_INFO = [
    {
        "id": "queen_snippet.wav",
        "title": "Bohemian Rhapsody",
        "artist": "Queen",
        "hint": "Middle excerpt (Operatic section, seconds 12-18)",
        "duration": "6s"
    },
    {
        "id": "blinding_lights_snippet.wav",
        "title": "Blinding Lights",
        "artist": "The Weeknd",
        "hint": "Middle excerpt (Synth chorus riff, seconds 14-20)",
        "duration": "6s"
    },
    {
        "id": "shape_of_you_snippet.wav",
        "title": "Shape of You",
        "artist": "Ed Sheeran",
        "hint": "Middle excerpt (Marimba beat & chorus, seconds 10-16)",
        "duration": "6s"
    }
]

@app.get("/api/health")
async def health():
    return {
        "status": "ok", 
        "engine": "Dual-Engine (Shazam Fingerprint + Vocal Lyrics AI)",
        "supports_singing": True
    }

@app.get("/api/samples")
async def get_samples():
    return {"samples": SAMPLE_INFO}

@app.get("/api/samples/{filename}")
async def serve_sample(filename: str):
    file_path = SAMPLES_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Sample not found")
    return FileResponse(file_path, media_type="audio/wav")

@app.post("/api/recognize-sample/{filename}")
async def recognize_sample(filename: str):
    file_path = SAMPLES_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Sample not found")
    result = await recognizer.identify_file(str(file_path))
    return JSONResponse(result)

@app.post("/api/recognize-upload")
async def recognize_upload(
    file: UploadFile = File(...),
    start_time: Optional[float] = Form(None),
    duration: Optional[float] = Form(None),
    mode: Optional[str] = Form("auto"),
    lyrics: Optional[str] = Form(None)
):
    suffix = Path(file.filename).suffix if file.filename else ".wav"
    if not suffix:
        suffix = ".wav"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        result = await recognizer.identify_file(
            tmp_path, 
            start_time=start_time, 
            duration=duration,
            mode=mode or "auto",
            hint_lyrics=lyrics
        )
        return JSONResponse(result)
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass

@app.post("/api/recognize-mic")
async def recognize_mic(
    audio: UploadFile = File(...),
    mode: Optional[str] = Form("auto"),
    lyrics: Optional[str] = Form(None)
):
    suffix = Path(audio.filename).suffix if audio.filename else ".webm"
    if not suffix:
        suffix = ".webm"

    content = await audio.read()
    result = await recognizer.identify_bytes(
        content, 
        file_extension=suffix,
        mode=mode or "auto",
        hint_lyrics=lyrics
    )
    return JSONResponse(result)

@app.post("/api/recognize-lyrics")
async def recognize_lyrics(lyrics: str = Form(...)):
    res = await recognizer.search_itunes_by_lyrics(lyrics)
    if res:
        return JSONResponse(res)
    return JSONResponse({
        "found": False,
        "message": f"No song found matching the lyrics: \"{lyrics}\""
    })

# Mount frontend static directory
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
