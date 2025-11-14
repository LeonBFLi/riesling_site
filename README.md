# Riesling Site (Warm Lounge Edition)

A lightweight Flask application that offers a cozy landing page, a simple video player for media stored in `/opt/video`, and a guestbook that writes visitor notes to `/etc/data/messages.log` so the host can collect them via a bind mount.

## Features

- **Warm single-page UI** optimised for low resource usage inside the container.
- **Video playback** for files located in `/opt/video` (mount a host folder there to supply media).
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

Start the container with any volumes you need mounted for media playback or the
guestbook log. The example below exposes the web application, mounts a host
folder with videos as read-only, and mounts a directory for guestbook entries:

```bash
docker run \
  --name riesling-site \
  -p 1206:1206 \
  -v /var/host-videos:/opt/video:ro \
  -v /var/nextchat:/etc/data \
  riesling-site
```

- Videos copied to `/var/host-videos` on the host appear in the drop-down list
  in the UI.
- Guestbook submissions append to `/var/nextchat/messages.log` on the host.
- Stop the container with `docker stop riesling-site` and remove it with
  `docker rm riesling-site` when you are done.
