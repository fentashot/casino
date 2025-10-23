To install dependencies:

```sh
bun install
```

To run:

```sh
bun run dev
```

open http://localhost:3000

## Docker

Development via Docker Compose:

1. Build and run containers:

```
docker compose up --build
```

2. Backend will be available at http://localhost:2137 and client at http://localhost:3000

Notes:

- The `backend` service mounts the repo for live edits. For production, remove the volume and build the image cleanly.
- Supply database and auth env values in the `.env` file at project root. The `backend` service uses `env_file: .env`.
