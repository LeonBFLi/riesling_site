from __future__ import annotations

import mimetypes
import os
from datetime import datetime
from pathlib import Path

from flask import Flask, Response, abort, jsonify, render_template, request, send_from_directory
from werkzeug.utils import secure_filename

app = Flask(__name__)

DATA_DIR = Path(os.environ.get("DATA_DIRECTORY", "/etc/data")).resolve()
VIDEO_DIR = Path(os.environ.get("VIDEO_DIRECTORY", "/opt/video")).resolve()
LOG_FILE = DATA_DIR / "messages.log"
UPLOAD_DIR = DATA_DIR / "uploads"
ALLOWED_IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
ALLOWED_VIDEO_SUFFIXES = {".mp4", ".webm", ".mov", ".m4v"}
TIMELINE_VIDEO_FILENAME = "2023-12-06-graduation.mp4"


def _build_video_metadata(filename: str) -> dict[str, str] | None:
    """Return metadata for the requested video if it exists and is allowed."""

    safe_path = Path(filename)
    if safe_path.is_absolute() or ".." in safe_path.parts:
        return None

    target = (VIDEO_DIR / safe_path).resolve()
    try:
        target.relative_to(VIDEO_DIR)
    except ValueError:
        return None

    if not target.exists() or not target.is_file():
        return None

    if target.suffix.lower() not in ALLOWED_VIDEO_SUFFIXES:
        return None

    mime_type = mimetypes.guess_type(target.name)[0] or "video/mp4"
    return {
        "name": target.name,
        "url": f"/videos/{target.name}",
        "mime_type": mime_type,
    }


@app.get("/")
def index() -> str:
    timeline_video = _build_video_metadata(TIMELINE_VIDEO_FILENAME)
    return render_template(
        "index.html",
        timeline_video=timeline_video,
    )


@app.post("/guestbook")
def guestbook() -> Response:
    name = (request.form.get("name", "").strip() or "Anonymous")[:80]
    message = request.form.get("message", "").strip()
    attachment = request.files.get("attachment")

    if not message:
        return jsonify({"status": "error", "message": "留言内容不能为空"}), 400

    sanitized_message = " ".join(message.split())
    timestamp = datetime.utcnow().isoformat(timespec="seconds") + "Z"
    saved_attachment_name: str | None = None

    if attachment and attachment.filename:
        suffix = Path(attachment.filename).suffix.lower()
        if suffix not in ALLOWED_IMAGE_SUFFIXES:
            return (
                jsonify({"status": "error", "message": "仅支持上传 PNG/JPG/GIF/WebP 图片"}),
                400,
            )

        safe_name = secure_filename(attachment.filename)
        unique_name = f"{timestamp.replace(':', '-')}_{safe_name}"
        try:
            UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
            attachment.save(UPLOAD_DIR / unique_name)
            saved_attachment_name = unique_name
        except OSError as exc:
            return (
                jsonify({"status": "error", "message": f"无法保存图片：{exc}"}),
                500,
            )

    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with LOG_FILE.open("a", encoding="utf-8") as fp:
            payload = f"{timestamp}\t{name}\t{sanitized_message}"
            if saved_attachment_name:
                payload += f"\tattachment=uploads/{saved_attachment_name}"
            fp.write(payload + "\n")
    except OSError as exc:
        return (
            jsonify({"status": "error", "message": f"无法写入留言：{exc}"}),
            500,
        )

    return jsonify({"status": "ok"})


@app.get("/health")
def health() -> Response:
    return jsonify({"status": "ok"})


@app.get("/videos/<path:filename>")
def serve_video(filename: str) -> Response:
    safe_path = Path(filename)
    if safe_path.is_absolute() or ".." in safe_path.parts:
        abort(404)

    target = (VIDEO_DIR / safe_path).resolve()
    try:
        target.relative_to(VIDEO_DIR)
    except ValueError:
        abort(404)

    if not target.exists() or not target.is_file():
        abort(404)

    if target.suffix.lower() not in ALLOWED_VIDEO_SUFFIXES:
        abort(404)

    relative_path = target.relative_to(VIDEO_DIR)
    return send_from_directory(VIDEO_DIR, relative_path.as_posix())


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "1206"))
    app.run(host="0.0.0.0", port=port)
