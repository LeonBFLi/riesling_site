# Riesling Site (Warm Lounge Edition)

A lightweight Flask application that offers a cozy landing page, a simple video player for media stored in `/opt/video`, and a guestbook that writes visitor notes to `/etc/data/messages.log` so the host can collect them via a bind mount.

## Features

- **Warm single-page UI** optimised for low resource usage inside the container.
- **Video playback** for files located in `/opt/video` (mount a host folder there to supply media).
- **Minimal guestbook** that stores submissions with UTC timestamps on the host.
- **Health probe** available at `/health` for container orchestration.

## Development

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
flask --app app run --port 1206 --debug
```

Point your browser to [http://localhost:1206](http://localhost:1206).

## Container image

The container is tuned for small footprint:

```bash
podman build -t riesling-site .
podman run \
  -p 1206:1206 \
  -v /var/host-videos:/opt/video:ro \
  -v /var/nextchat:/etc/data \
  riesling-site
```

- Videos copied to `/var/host-videos` on the host will appear in the drop-down list.
- Guestbook submissions append to `/var/nextchat/messages.log` on the host.
