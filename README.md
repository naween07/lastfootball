# Last Football — web

The front end and rendering server for **[lastfootball.com](https://lastfootball.com)**,
a football news, livescore and statistics site.

A React single-page application for readers, and a Node server in front of it
that exists largely for the crawlers: it prerenders every article and entity hub
into static HTML, generates `sitemap.xml` at runtime, and pushes new URLs
through IndexNow as they publish.

Editorial content — match reports and the team, player and competition entities
they link to — comes from the Last Football GraphQL API, which also serves the
Android app, so the site and the app stay in step.

## Stack

| | |
| --- | --- |
| Front end | React, TypeScript, Vite, Tailwind |
| Server | Node (ESM), Express |
| Content | Last Football GraphQL API (Apollo, Prisma, PostgreSQL) |
| Hosting | nginx on a VPS, systemd service |

## Running it locally

```bash
npm install
cp .env.example .env     # fill in the values
npm run dev              # Vite dev server on the client
```

The rendering server runs separately from the Vite dev server:

```bash
node server/index.mjs
```

### Environment

See `.env.example` for the full list. Two rules matter:

- **Anything named `VITE_*` is public.** Vite inlines those variables into the
  client bundle, so they are readable by anyone who loads the site. The Supabase
  publishable key belongs there and is public by design — access is governed by
  row-level security, not by the key.
- **Everything else is server-only** and must never acquire a `VITE_` prefix.
  `SUPABASE_SERVICE_KEY` and the football data API keys fall in this group.

`.env` is gitignored and stays that way.

## Layout

```
src/            React application — routes, components, hooks, services
server/         Rendering server: prerendering, sitemap, IndexNow, sync jobs
public/         Static assets and share cards
supabase/       Schema and policies for the remaining Supabase-backed features
DEPLOY.md       Deployment procedure — read it before deploying
```

## Deploying

Follow **[`DEPLOY.md`](DEPLOY.md)**. Two things in it are not optional:

- `vite build` empties its output directory before writing, so the build goes to
  `dist.new` and is swapped in only once it is verified — never built over a
  live `dist`.
- The server writes the sitemap and the prerendered article pages *into* `dist`
  at runtime, so a fresh build has none of them until the service is restarted,
  and they take a few minutes to come back after it is.

## Status

The reading path runs entirely on the GraphQL API and PostgreSQL. Accounts and
personalisation are mid-migration from Supabase onto that same backend, so that
the site and the app end up sharing one set of users.
