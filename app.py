from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path
from typing import Iterable

from flask import Flask, Response, jsonify, render_template, request, send_from_directory

app = Flask(__name__)

VIDEO_DIR = Path(os.environ.get("VIDEO_DIRECTORY", "/opt/video")).resolve()
DATA_DIR = Path(os.environ.get("DATA_DIRECTORY", "/etc/data")).resolve()
LOG_FILE = DATA_DIR / "messages.log"
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".m4v", ".webm", ".ogg"}


def _is_allowed_video(path: Path) -> bool:
    return path.is_file() and path.suffix.lower() in ALLOWED_VIDEO_EXTENSIONS


def _iter_video_files(directory: Path) -> Iterable[str]:
    if not directory.exists():
        return []
    try:
        return sorted(p.name for p in directory.iterdir() if _is_allowed_video(p))
    except OSError:
        return []


@app.get("/")
def index() -> str:
    videos = list(_iter_video_files(VIDEO_DIR))
    return render_template("index.html", videos=videos)


@app.post("/guestbook")
def guestbook() -> Response:
    name = (request.form.get("name", "").strip() or "Anonymous")[:80]
    message = request.form.get("message", "").strip()

    if not message:
        return jsonify({"status": "error", "message": "留言内容不能为空"}), 400

    sanitized_message = " ".join(message.split())
    timestamp = datetime.utcnow().isoformat(timespec="seconds") + "Z"

    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with LOG_FILE.open("a", encoding="utf-8") as fp:
            fp.write(f"{timestamp}\t{name}\t{sanitized_message}\n")
    except OSError as exc:
        return (
            jsonify({"status": "error", "message": f"无法写入留言：{exc}"}),
            500,
        )

    return jsonify({"status": "ok"})


@app.get("/videos/<path:filename>")
def serve_video(filename: str):
    safe_dir = VIDEO_DIR
    try:
        return send_from_directory(safe_dir, filename, as_attachment=False)
    except FileNotFoundError:
        return ("Video not found", 404)


@app.get("/health")
def health() -> Response:
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "1206"))
    app.run(host="0.0.0.0", port=port)
