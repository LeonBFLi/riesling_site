# 1206 心灵休憩小客厅（毕业季版）

一个轻盈的 Flask 单页应用，用温柔的蓝色基调收纳这段旅程：首页呈现暖心问候、互动式时间轴、
位于 `/opt/video` 的视频播放器，以及写入 `/etc/data/messages.log` 的留言本，方便通过挂载目录在宿主机上收集。

## Features

- **温馨首页**：更新为浅蓝色背景与毕业季主题文案。
- **心动时间册**：时间戳式互动元素，可逐一查看每个阶段的插图或占位图，方便替换成真实照片与视频。
- **视频播放器**：读取 `/opt/video` 中的媒体文件，40M 的毕业季影片挂载后会自动出现。
- **留言本**：访客留言保存至宿主机绑定的目录，并附带 UTC 时间戳。
- **健康检查**：`/health` 端点可用于容器编排探测。

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

启动容器时记得挂载所需目录，这样媒体与留言才能被持久化。下面的命令示例包含详细参数说明：

```bash
docker run \
  --name 1206-lounge \
  --publish 1206:1206 \
  --env TZ=Asia/Shanghai \
  --mount type=bind,src=/srv/grad-memory/videos,dst=/opt/video,ro \
  --mount type=bind,src=/srv/grad-memory/messages,dst=/etc/data \
  --restart unless-stopped \
  riesling-site
```

- 将 40M 的毕业季 MP4 拷贝到 `/srv/grad-memory/videos` 后，播放器会在下拉列表中显示它。
- 留言内容会写入 `/srv/grad-memory/messages/messages.log`，可随时在宿主机查看或备份。
- 使用 `docker stop 1206-lounge` 停止容器，如需删除可运行 `docker rm 1206-lounge`。
