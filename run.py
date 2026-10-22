import uvicorn
import webbrowser
import os
import time
import threading

def open_browser():
    time.sleep(1.5)
    url = "http://localhost:8000"
    print(f"\n🎧 Opening SongDetect in your browser: {url}\n")
    try:
        webbrowser.open(url)
    except Exception:
        pass

if __name__ == "__main__":
    print("=" * 60)
    print(" 🎵 Starting SongDetect: Worldwide Audio Identification Engine")
    print("    Identify whole songs based on any middle snippet")
    print("=" * 60)
    
    # Open browser automatically on launch
    threading.Thread(target=open_browser, daemon=True).start()
    
    # Run FastAPI app
    uvicorn.run("backend.app:app", host="127.0.0.1", port=8000, reload=True)
