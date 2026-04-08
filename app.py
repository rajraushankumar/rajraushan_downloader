from flask import Flask, render_template, request, jsonify, send_file
import yt_dlp
import os
import re
import uuid
import threading
import time
import glob

app = Flask(__name__)

DOWNLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "downloads")
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

progress_store = {}

def clean_filename(name):
    # Remove ALL special/unicode problematic chars for Windows safety
    name = re.sub(r'[\\/*?:"<>|]', "", name)
    name = name.strip().strip('.')
    # Limit length
    return name[:80] if len(name) > 80 else name

def safe_outtmpl():
    # Use a UUID-based filename to avoid Hindi/unicode filename issues on Windows
    return os.path.join(DOWNLOAD_FOLDER, '%(id)s.%(ext)s')

def get_progress_hook(task_id):
    def hook(d):
        if d['status'] == 'downloading':
            total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
            downloaded = d.get('downloaded_bytes', 0)
            percent = int(downloaded / total * 100) if total else 0
            speed = d.get('speed', 0)
            speed_str = f"{speed/1024:.1f} KB/s" if speed else "..."
            progress_store[task_id].update({
                'status': 'downloading',
                'percent': percent,
                'speed': speed_str,
                'eta': d.get('eta', 0)
            })
        elif d['status'] == 'finished':
            progress_store[task_id].update({
                'status': 'finished',
                'percent': 100,
                'filename': d['filename']
            })
        elif d['status'] == 'error':
            progress_store[task_id].update({'status': 'error', 'percent': 0})
    return hook

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/info', methods=['POST'])
def get_info():
    data = request.json
    url = data.get('url', '').strip()
    if not url:
        return jsonify({'error': 'URL is required'}), 400

    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        formats = []
        seen = set()
        for f in info.get('formats', []):
            ext = f.get('ext', '')
            res = f.get('height', '')
            abr = f.get('abr', '')
            vcodec = f.get('vcodec', 'none')
            acodec = f.get('acodec', 'none')
            fid = f.get('format_id', '')
            fsize = f.get('filesize') or f.get('filesize_approx') or 0

            if vcodec != 'none' and res:
                label = f"{res}p Video ({ext})"
                key = f"video_{res}_{ext}"
                ftype = 'video'
            elif acodec != 'none' and vcodec == 'none' and abr:
                label = f"{int(abr)}kbps Audio ({ext})"
                key = f"audio_{int(abr)}_{ext}"
                ftype = 'audio'
            else:
                continue

            if key not in seen:
                seen.add(key)
                formats.append({
                    'format_id': fid,
                    'label': label,
                    'type': ftype,
                    'ext': ext,
                    'size': f"{fsize/1024/1024:.1f} MB" if fsize else "Unknown"
                })

        formats.sort(key=lambda x: (x['type'], x['label']), reverse=True)

        return jsonify({
            'title': info.get('title', 'Unknown'),
            'thumbnail': info.get('thumbnail', ''),
            'duration': info.get('duration', 0),
            'uploader': info.get('uploader', 'Unknown'),
            'view_count': info.get('view_count', 0),
            'formats': formats[:20]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/download', methods=['POST'])
def download():
    data = request.json
    url = data.get('url', '').strip()
    format_id = data.get('format_id', 'best')
    media_type = data.get('type', 'video')
    task_id = str(uuid.uuid4())
    progress_store[task_id] = {'status': 'starting', 'percent': 0}

    def do_download():
        try:
            # Use video ID as filename — avoids ALL unicode/Hindi title issues on Windows
            outtmpl = safe_outtmpl()

            if media_type == 'audio':
                ydl_opts = {
                    'format': format_id,
                    'outtmpl': outtmpl,
                    'quiet': True,
                    'progress_hooks': [get_progress_hook(task_id)],
                    'no_warnings': True,
                }
            else:
                ydl_opts = {
                    'format': format_id,
                    'outtmpl': outtmpl,
                    'quiet': True,
                    'progress_hooks': [get_progress_hook(task_id)],
                    'merge_output_format': 'mp4',
                    'no_warnings': True,
                }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                video_id = info.get('id', task_id)
                title = info.get('title', 'download')

                # Find the actual downloaded file by video ID
                found = None

                # First try: prepared filename
                prepared = ydl.prepare_filename(info)
                if os.path.exists(prepared):
                    found = prepared
                else:
                    # For merged video, check .mp4
                    mp4_path = os.path.splitext(prepared)[0] + '.mp4'
                    if os.path.exists(mp4_path):
                        found = mp4_path

                # Fallback: glob by video ID in downloads folder
                if not found:
                    pattern = os.path.join(DOWNLOAD_FOLDER, f"{video_id}.*")
                    matches = glob.glob(pattern)
                    if matches:
                        # Prefer .mp4 for video
                        mp4s = [m for m in matches if m.endswith('.mp4')]
                        found = mp4s[0] if mp4s else matches[0]

                # Last resort: most recently modified file in downloads
                if not found:
                    all_files = [
                        os.path.join(DOWNLOAD_FOLDER, f)
                        for f in os.listdir(DOWNLOAD_FOLDER)
                        if os.path.isfile(os.path.join(DOWNLOAD_FOLDER, f))
                    ]
                    if all_files:
                        found = max(all_files, key=os.path.getmtime)

                if found:
                    progress_store[task_id].update({
                        'status': 'done',
                        'filename': found,
                        'title': title,
                        'percent': 100
                    })
                else:
                    progress_store[task_id] = {
                        'status': 'error',
                        'error': 'Downloaded file not found on disk.',
                        'percent': 0
                    }

        except Exception as e:
            progress_store[task_id] = {'status': 'error', 'error': str(e), 'percent': 0}

    t = threading.Thread(target=do_download, daemon=True)
    t.start()
    return jsonify({'task_id': task_id})

@app.route('/api/progress/<task_id>')
def progress(task_id):
    return jsonify(progress_store.get(task_id, {'status': 'not_found'}))

@app.route('/api/serve/<task_id>')
def serve_file(task_id):
    info = progress_store.get(task_id, {})
    filename = info.get('filename', '')

    # Verify file exists
    if not filename or not os.path.exists(filename):
        return jsonify({'error': 'File not found. Please download again.'}), 404

    title = info.get('title', 'download')
    ext = os.path.splitext(filename)[1]
    safe_name = clean_filename(title) + ext

    return send_file(
        filename,
        as_attachment=True,
        download_name=safe_name
    )

# Cleanup old files every hour
def cleanup():
    while True:
        time.sleep(3600)
        now = time.time()
        try:
            for f in os.listdir(DOWNLOAD_FOLDER):
                fp = os.path.join(DOWNLOAD_FOLDER, f)
                if os.path.isfile(fp) and now - os.path.getmtime(fp) > 3600:
                    os.remove(fp)
        except Exception:
            pass

threading.Thread(target=cleanup, daemon=True).start()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
# Rajraushan
#new