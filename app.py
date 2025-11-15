from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path

from flask import Flask, Response, jsonify, render_template, request

app = Flask(__name__)

DATA_DIR = Path(os.environ.get("DATA_DIRECTORY", "/etc/data")).resolve()
LOG_FILE = DATA_DIR / "messages.log"


@app.get("/")
def index() -> str:
    return render_template("index.html")


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


@app.get("/health")
def health() -> Response:
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "1206"))
    app.run(host="0.0.0.0", port=port)
