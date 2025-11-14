# 1206 心灵休憩小客厅（毕业季版）

一个轻盈的 Flask 单页应用，承载毕业季的小客厅：

- 温柔的浅蓝色背景与留言区，让大家在 1206 的记忆里继续休憩。
- 时间线元素记录 2021~2024 的重要瞬间，支持你替换为真实照片或视频。
- 视频播放器会读取 `/opt/video` 里的媒体文件，随时播放你想分享的片段。
- 留言会写入 `/etc/data/messages.log`，方便在宿主机上留存祝福。

## Features

- **Blue & calm single-page UI** tuned for 低资源占用，适合在轻量容器里运行。
- **Timeline diary** with interactive milestones. Replace the SVG 占位图（位于 `static/img/timeline`）即可展示你的真实照片。
- **Video playback** for files located in `/opt/video` (including `2023-12-06-graduation.mp4` for the timeline video spot).
- **Minimal guestbook** that stores submissions with UTC timestamps on the host.
- **Health probe** available at `/health` for container orchestration.

## Prerequisites

Make sure the following tools are installed locally before developing or
building the container image:

- [Python 3.11](https://www.python.org/downloads/) and `pip`
- [Docker](https://docs.docker.com/get-docker/)

If you plan to work on the project inside a virtual environment, you may also
want to have `python3-venv` (Linux) or the equivalent virtual environment tools
installed.

## Development

1. Create and activate a virtual environment:

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```

2. Install the dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Run the Flask development server:

   ```bash
   flask --app app run --port 1206 --debug
   ```

4. Point your browser to [http://localhost:1206](http://localhost:1206) to view
   the app. The health probe is served from `/health`.

## Container image (Docker)

The repository includes a `Dockerfile` for building a lightweight container
image. From the project root, run:

```bash
docker build -t riesling-site .
```

启动容器时，请把视频目录和留言目录都挂载进去。下面给出一个包含详细参数的示例：

```bash
docker run \
  --name riesling-site \
  --restart unless-stopped \
  -p 1206:1206 \
  -e VIDEO_DIRECTORY="/opt/video" \
  -e DATA_DIRECTORY="/etc/data" \
  -v /path/on/host/videos:/opt/video:rw \
  -v /path/on/host/guestbook:/etc/data:rw \
  riesling-site
```

- `VIDEO_DIRECTORY` 会告诉应用去哪个目录读取视频。示例中把宿主机的 `/path/on/host/videos` 挂载到了 `/opt/video`，其中的文件会同时出现在播放器下拉框和“2023 年 12 月 6 日”时间轴的影片占位中（文件命名为 `2023-12-06-graduation.mp4` 时即可直接播放）。
- `DATA_DIRECTORY` 决定留言日志放在哪里。示例挂载后，可在宿主机的 `/path/on/host/guestbook/messages.log` 查看记录。
- 需要停止服务时执行 `docker stop riesling-site`，如需删除容器再运行 `docker rm riesling-site`。

如果你想保留原始 SVG 插画并替换为真实照片，只需把同名图片放进容器的 `static/img/timeline` 中即可覆盖显示。
