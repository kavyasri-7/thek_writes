import os
import tempfile
import subprocess
import urllib.parse
from typing import Optional, Dict, Any, List
import aiohttp
import imageio_ffmpeg
from shazamio import Shazam
import speech_recognition as sr

FFMPEG_PATH = imageio_ffmpeg.get_ffmpeg_exe()

def convert_audio_to_wav(input_path: str, output_path: str, start_time: Optional[float] = None, duration: Optional[float] = None) -> bool:
    """
    Converts any input audio file (WebM, MP3, M4A, OGG, WAV, etc.) to standard 44.1kHz 16-bit stereo WAV for Shazam.
    Optionally extracts a specific slice (start_time, duration).
    """
    cmd = [FFMPEG_PATH, "-y"]
    if start_time is not None and start_time > 0:
        cmd.extend(["-ss", str(start_time)])
    if duration is not None and duration > 0:
        cmd.extend(["-t", str(duration)])
    
    cmd.extend([
        "-i", input_path,
        "-vn",
        "-ar", "44100",
        "-ac", "2",
        "-c:a", "pcm_s16le",
        output_path
    ])
    
    result = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return result.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0


def convert_audio_for_speech(input_path: str, output_path: str) -> bool:
    """
    Converts audio into 16kHz mono WAV optimized for SpeechRecognition engine.
    """
    cmd = [
        FFMPEG_PATH, "-y",
        "-i", input_path,
        "-vn",
        "-ar", "16000",
        "-ac", "1",
        "-c:a", "pcm_s16le",
        output_path
    ]
    result = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return result.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0


class SongRecognizer:
    def __init__(self):
        self.shazam = Shazam()
        self.sr_recognizer = sr.Recognizer()

    def parse_track_data(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        matches = data.get("matches", [])
        track = data.get("track")
        if not track:
            return None

        title = track.get("title", "Unknown Title")
        artist = track.get("subtitle", "Unknown Artist")
        
        # Cover Art
        images = track.get("images", {})
        cover_art = images.get("coverarthq") or images.get("coverart") or images.get("background")

        # Genres
        genres = track.get("genres", {})
        genre_name = genres.get("primary", "Various")

        # Preview Audio (30s preview stream)
        preview_audio = None
        hub = track.get("hub", {})
        for action in hub.get("actions", []):
            if action.get("type") == "uri" and action.get("uri"):
                preview_audio = action.get("uri")
                break

        # Streaming & External Links
        apple_music_url = None
        for option in hub.get("options", []):
            for action in option.get("actions", []):
                uri = action.get("uri")
                if uri and "music.apple.com" in uri:
                    apple_music_url = uri
                    break
            if apple_music_url:
                break

        query = urllib.parse.quote(f"{title} {artist}")
        spotify_search_url = f"https://open.spotify.com/search/{query}"
        youtube_search_url = f"https://www.youtube.com/results?search_query={query}"
        youtube_music_url = f"https://music.youtube.com/search?q={query}"
        shazam_url = track.get("url")

        # Lyrics
        lyrics = []
        album_name = None
        label = None
        released = None

        sections = track.get("sections", [])
        for section in sections:
            sec_type = section.get("type")
            if sec_type == "LYRICS":
                lyrics = section.get("text", [])
            elif sec_type == "SONG":
                for meta in section.get("metadata", []):
                    title_m = meta.get("title", "").lower()
                    text_m = meta.get("text", "")
                    if "album" in title_m:
                        album_name = text_m
                    elif "label" in title_m:
                        label = text_m
                    elif "released" in title_m:
                        released = text_m

        # Match offset / timing
        offset_seconds = None
        if matches and len(matches) > 0:
            offset_seconds = matches[0].get("offset")

        return {
            "found": True,
            "detection_mode": "studio",
            "title": title,
            "artist": artist,
            "album": album_name,
            "genre": genre_name,
            "label": label,
            "released": released,
            "cover_art": cover_art,
            "preview_audio": preview_audio,
            "lyrics": lyrics,
            "offset_seconds": offset_seconds,
            "links": {
                "spotify": spotify_search_url,
                "youtube": youtube_search_url,
                "youtube_music": youtube_music_url,
                "apple_music": apple_music_url,
                "shazam": shazam_url
            },
            "raw_key": track.get("key")
        }

    async def search_itunes_by_lyrics(self, lyrics_query: str) -> Optional[Dict[str, Any]]:
        """
        Queries iTunes Music Catalog using extracted or provided singing lyrics.
        """
        clean_query = lyrics_query.strip()
        if not clean_query:
            return None

        # Build clean search terms
        encoded_query = urllib.parse.quote(clean_query)
        url = f"https://itunes.apple.com/search?term={encoded_query}&entity=song&limit=5"

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=aiohttp.ClientTimeout(total=6)) as resp:
                    if resp.status != 200:
                        return None
                    data = await resp.json(content_type=None)
                    results = data.get("results", [])
                    if not results:
                        return None

                    top = results[0]
                    title = top.get("trackName", "Unknown Title")
                    artist = top.get("artistName", "Unknown Artist")
                    album = top.get("collectionName", "Unknown Album")
                    genre = top.get("primaryGenreName", "Music")
                    preview_audio = top.get("previewUrl")
                    
                    # High quality artwork (replace 100x100 with 600x600)
                    raw_art = top.get("artworkUrl100", "")
                    cover_art = raw_art.replace("100x100bb", "600x600bb") if raw_art else None

                    release_date = top.get("releaseDate")
                    year = release_date[:4] if release_date and len(release_date) >= 4 else None

                    track_url = top.get("trackViewUrl")
                    q = urllib.parse.quote(f"{title} {artist}")
                    spotify_url = f"https://open.spotify.com/search/{q}"
                    youtube_url = f"https://www.youtube.com/results?search_query={q}"
                    yt_music_url = f"https://music.youtube.com/search?q={q}"

                    return {
                        "found": True,
                        "detection_mode": "singing",
                        "detected_lyrics": clean_query,
                        "title": title,
                        "artist": artist,
                        "album": album,
                        "genre": genre,
                        "label": "iTunes Music Catalog",
                        "released": year,
                        "cover_art": cover_art,
                        "preview_audio": preview_audio,
                        "lyrics": [
                            f"🎤 Detected Sung Lyrics: \"{clean_query}\"",
                            "Identified by matching your vocal lyrics against global music catalogs."
                        ],
                        "offset_seconds": None,
                        "links": {
                            "spotify": spotify_url,
                            "youtube": youtube_url,
                            "youtube_music": yt_music_url,
                            "apple_music": track_url,
                            "shazam": None
                        }
                    }
        except Exception:
            return None

    def extract_lyrics_from_file(self, wav_path: str) -> Optional[str]:
        """
        Uses Google Speech Recognition to transcribe singing lyrics from the audio file.
        """
        try:
            with sr.AudioFile(wav_path) as source:
                self.sr_recognizer.adjust_for_ambient_noise(source, duration=0.3)
                audio_data = self.sr_recognizer.record(source)
                text = self.sr_recognizer.recognize_google(audio_data)
                return text.strip() if text else None
        except Exception:
            return None

    async def identify_singing(self, file_path: str, hint_lyrics: Optional[str] = None) -> Dict[str, Any]:
        """
        Identifies a song when sung by a human by transcribing the lyrics and matching them.
        """
        # 1. Check if client already provided transcribed lyrics
        if hint_lyrics and len(hint_lyrics.strip()) > 2:
            res = await self.search_itunes_by_lyrics(hint_lyrics.strip())
            if res:
                return res

        # 2. Extract lyrics directly from audio file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_speech:
            speech_wav_path = tmp_speech.name

        try:
            converted = convert_audio_for_speech(file_path, speech_wav_path)
            target_path = speech_wav_path if converted else file_path
            lyrics = self.extract_lyrics_from_file(target_path)
            
            if lyrics:
                res = await self.search_itunes_by_lyrics(lyrics)
                if res:
                    return res
                # Return partial info if lyrics found but song wasn't exact match
                return {
                    "found": False,
                    "detected_lyrics": lyrics,
                    "message": f"Heard your lyrics: \"{lyrics}\", but could not pinpoint an exact song match. Try singing a few more words or the chorus!"
                }
            
            return {
                "found": False,
                "message": "Could not clearly understand the lyrics from your singing. Try singing closer to the microphone, pronouncing the chorus lyrics clearly."
            }
        finally:
            if os.path.exists(speech_wav_path):
                try:
                    os.remove(speech_wav_path)
                except OSError:
                    pass

    async def identify_file(
        self, 
        file_path: str, 
        start_time: Optional[float] = None, 
        duration: Optional[float] = None,
        mode: str = "auto",
        hint_lyrics: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Dual-Engine Identification:
        - Mode 'shazam': Studio track fingerprinting only.
        - Mode 'singing': Vocal lyrics AI recognition only.
        - Mode 'auto': Tries Shazam first; if no match or if lyrics are detected, falls back to singing AI.
        """
        # If user explicitly requested singing mode
        if mode == "singing":
            return await self.identify_singing(file_path, hint_lyrics=hint_lyrics)

        # 1. Try Shazam Fingerprint Recognition (Studio track matching)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_wav:
            tmp_wav_path = tmp_wav.name

        try:
            converted = convert_audio_to_wav(file_path, tmp_wav_path, start_time, duration)
            target_to_recognize = tmp_wav_path if converted else file_path

            raw_result = await self.shazam.recognize(target_to_recognize)
            parsed = self.parse_track_data(raw_result)
            if parsed:
                return parsed

            # If Shazam couldn't match and mode is auto, fall back to Singing Detection!
            if mode == "auto":
                singing_result = await self.identify_singing(file_path, hint_lyrics=hint_lyrics)
                if singing_result.get("found"):
                    return singing_result

            return {
                "found": False,
                "message": "No match found. If you are playing an original song, ensure it is clear. If you are singing, switch to 'Human Singing' mode or pronounce the lyrics clearly!"
            }
        except Exception as e:
            # Fall back to singing if Shazam error
            if mode == "auto":
                try:
                    return await self.identify_singing(file_path, hint_lyrics=hint_lyrics)
                except Exception:
                    pass
            return {
                "found": False,
                "error": str(e),
                "message": f"Error recognizing audio: {str(e)}"
            }
        finally:
            if os.path.exists(tmp_wav_path):
                try:
                    os.remove(tmp_wav_path)
                except OSError:
                    pass

    async def identify_bytes(
        self, 
        audio_bytes: bytes, 
        file_extension: str = ".wav", 
        mode: str = "auto", 
        hint_lyrics: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Takes raw audio bytes (e.g. from mic upload), writes to temp file, and identifies.
        """
        with tempfile.NamedTemporaryFile(suffix=file_extension, delete=False) as tmp_in:
            tmp_in.write(audio_bytes)
            tmp_in_path = tmp_in.name

        try:
            return await self.identify_file(tmp_in_path, mode=mode, hint_lyrics=hint_lyrics)
        finally:
            if os.path.exists(tmp_in_path):
                try:
                    os.remove(tmp_in_path)
                except OSError:
                    pass
