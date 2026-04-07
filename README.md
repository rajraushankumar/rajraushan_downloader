# 🎬 Rajraushan Video & Audio Downloader

A full-stack video & audio downloader web app built with **HTML, CSS, JavaScript, Python & Flask**.

---

## 🚀 Features

- 🎬 Download videos in MP4, WebM and more
- 🎵 Download audio in MP3, M4A and more
- 📊 Real-time download progress bar
- 🌐 Supports 1000+ sites (YouTube, Instagram, Twitter, TikTok, Vimeo, etc.)
- 📱 Responsive design — works on mobile & desktop
- 🔒 No account required, no tracking

---

## 🛠 Setup & Run

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

> Also ensure `ffmpeg` is installed:
> - **Ubuntu/Debian**: `sudo apt install ffmpeg`
> - **macOS**: `brew install ffmpeg`
> - **Windows**: Download from https://ffmpeg.org/download.html

### 2. Run the app

```bash
python app.py
```

### 3. Open in browser

```
http://localhost:5000
```

---

## 📁 Project Structure

```
rajraushan_downloader/
├── app.py                  # Flask backend
├── requirements.txt        # Python dependencies
├── downloads/              # Downloaded files (auto-created)
├── templates/
│   └── index.html          # Main HTML template
└── static/
    ├── css/
    │   └── style.css       # All styles
    └── js/
        └── main.js         # Frontend JavaScript logic
```

---

## ⚙️ API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Main web interface |
| `/api/info` | POST | Fetch video metadata & formats |
| `/api/download` | POST | Start download (async) |
| `/api/progress/<task_id>` | GET | Poll download progress |
| `/api/serve/<task_id>` | GET | Serve completed file |

---

## 📝 Notes

- Downloaded files are auto-cleaned after 1 hour
- For production use, run with gunicorn: `gunicorn -w 4 app:app`
- Built with [yt-dlp](https://github.com/yt-dlp/yt-dlp) for maximum compatibility

---

Made with ❤️ by Rajraushan
