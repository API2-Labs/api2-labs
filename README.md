# API2 Labs — API2 Mock

A tiny, stateless mock/echo HTTP API for prototypes, demos and integration tests.

## What it does

- `ANY /api/echo` — echoes method, headers, query and body
- `GET /api/mock?status=200&body=...` — custom status/body
- `GET /api/status/:code` — returns a chosen HTTP status
- `GET /api/uuid` — generates a UUID
- `GET /api/time` — current server timestamp
- `GET /api/random?count=5&max=100` — random test values

The project deliberately uses no database, no framework and no paid server.

## Recommended free deployment: Cloudflare Pages

This repository is arranged for Cloudflare Pages:

- Static site: `public/`
- API function: `functions/api/[[path]].js`

### Deploy from GitHub

1. Create a GitHub repository and push these files.
2. In Cloudflare Dashboard, open **Workers & Pages** and create a **Pages** project connected to the repository.
3. Framework preset: **None**
4. Build command: leave blank
5. Build output directory: `public`
6. Deploy.
7. In the Pages project's **Custom domains**, add `api2.win`.

Cloudflare will serve the static site and route `/api/*` through the Pages Function.

### Free-tier notes

Static asset requests on Cloudflare Pages are free/unlimited. Pages Functions share the Workers Free quota (currently 100,000 requests/day).

## Local development

Install Wrangler:

```bash
npm install -g wrangler
```

Then from this repository:

```bash
wrangler pages dev public
```

Pages Functions in the root-level `functions/` directory are detected automatically.

## Examples

```bash
curl "https://api2.win/api/uuid"

curl "https://api2.win/api/status/418"

curl -X POST "https://api2.win/api/echo?source=test" \
  -H "content-type: application/json" \
  -d '{"hello":"world"}'

curl "https://api2.win/api/mock?status=201&body=%7B%22created%22%3Atrue%7D"
```

## Positioning

**API2 Labs** is an independent software project building practical developer utilities, experiments and open-source tools.

**API2 Mock** is its first project: simple, stateless HTTP primitives for prototyping and integration testing.

## Licence

MIT. See `LICENSE`.
