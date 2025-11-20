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
EXPECTED_TOOL_ANSWER = "化身孤岛的鲸"
ANSWER_FILE = Path(__file__).resolve().parent / "answer.txt"


def _iter_video_files() -> list[dict[str, str]]:
    videos: list[dict[str, str]] = []
    if not VIDEO_DIR.exists():
        return videos

    try:
        for entry in sorted(VIDEO_DIR.iterdir()):
            if not entry.is_file():
                continue
            suffix = entry.suffix.lower()
            if suffix not in ALLOWED_VIDEO_SUFFIXES:
                continue
            mime_type = mimetypes.guess_type(entry.name)[0] or "video/mp4"
            videos.append(
                {
                    "name": entry.name,
                    "display_name": entry.stem.replace("_", " ").replace("-", " "),
                    "url": f"/videos/{entry.name}",
                    "mime_type": mime_type,
                }
            )
    except OSError:
        return videos

    return videos


@app.get("/")
def index() -> str:
    video_files = _iter_video_files()
    timeline_video = next((video for video in video_files if video["name"] == "2023-12-06-graduation.mp4"), None)
    wandering_video = next(
        (video for video in video_files if video["name"].lower().startswith("wandering")), None
    )
    return render_template(
        "index.html",
        timeline_video=timeline_video,
        wandering_video=wandering_video,
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


@app.post("/tool-secret")
def tool_secret() -> Response:
    data = request.get_json(silent=True) or {}
    answer = str(data.get("answer", "")).strip()

    if not answer:
        return jsonify({"message": "需要输入小提示里的歌名，才能打开这个传送门。"}), 400

    if answer != EXPECTED_TOOL_ANSWER:
        return jsonify({"message": "密码和背景鲸鱼的线索还对不上哦，再试试看。"}), 403

    if not ANSWER_FILE.exists():
        return jsonify({"message": "暂时没找到要分享的内容，请等我再检查一下。"}), 500

    try:
        content = ANSWER_FILE.read_text(encoding="utf-8")
    except OSError:
        return jsonify({"message": "读取文件时出了点小状况，稍后再试试。"}), 500

    return jsonify({"content": content})


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

    relative_path = target.relative_to(VIDEO_DIR)
    return send_from_directory(VIDEO_DIR, relative_path.as_posix())


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "1206"))
    app.run(host="0.0.0.0", port=port)
