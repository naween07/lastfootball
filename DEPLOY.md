# Deploying lastfootball.com

Written after a deploy went to the wrong directory. Everything here was
verified against the live server on 28 October 2026 -- `nginx -T`, `pm2
describe`, `systemctl`, and the paths in `server/index.mjs` -- not from
memory or from older notes.

## Read this first: there are two `dist` directories

| Path | Belongs to | Served as | Process |
|---|---|---|---|
| `/var/www/lastfootball/dist` | **the website** | `lastfootball.com` | nginx `root`, plus systemd `lastfootball-api` |
| `/var/www/html/lastfootball/dist` | **the app backend** | `api.lastfootball.com` | pm2 `last-football` |

Both end in `dist`, both relate to something called "lastfootball", and
only one of them is the website. An older note recommended

    cp -r dist/* /var/www/html/lastfootball/      # DO NOT RUN

which copies the website's built files over the app backend. That is how
the app's API was taken down once already. **Never run it.**

Also on the box, and not to be touched by a website deploy:

- pm2 `lastfootball-health` -- `/var/www/lastfootball/healthcheck.mjs`
- `admin.lastfootball.com` -- its own nginx server block

## Why the build cannot target the live directory

`vite build` **empties its output directory before it writes anything**.
Pointing it at `/var/www/lastfootball/dist` therefore deletes the live
site first and only then starts compiling: the site is blank for the
length of the build, and stays blank if the build fails.

So the build always goes to a new directory, and the live one is replaced
only once the new one exists and has been looked at.

## Why `lastfootball-api` must be restarted after a swap

`server/index.mjs` writes files *into* `dist` at runtime:

- `sitemap.xml`
- `<indexnow-key>.txt` -- the IndexNow verification file
- `news/<slug>.html` -- roughly a thousand prerendered article pages that
  nginx serves directly via `try_files`

A fresh build contains none of these, so swapping a new `dist` into place
removes all of them. The service rewrites them on startup. Until it is
restarted, the sitemap is missing and every article URL falls back to the
client-rendered page, which is worse for search engines and was missed
for about twenty minutes on a previous deploy.

## The deploy

On the VPS, as root:

```bash
cd /var/www/lastfootball

# 1. Get the code
git pull origin main

# 2. Dependencies, only if package-lock.json changed
npm ci

# 3. Build into a NEW directory -- never into the live dist
npx vite build --outDir dist.new --emptyOutDir

# 4. Look before swapping. index.html and an assets/ folder must exist.
ls -la dist.new | head
test -f dist.new/index.html && echo "index.html OK" || echo "STOP: no index.html"

# 5. Swap, keeping the old one under a dated name
mv dist "dist.old.$(date +%F-%H%M)"
mv dist.new dist

# 6. Let the API rewrite the sitemap, the IndexNow key and the articles
systemctl restart lastfootball-api
sleep 5
systemctl is-active lastfootball-api

# 7. Verify the website
curl -sS -o /dev/null -w "home      %{http_code}\n" https://lastfootball.com/
curl -sS -o /dev/null -w "privacy   %{http_code}\n" https://lastfootball.com/privacy
curl -sS -o /dev/null -w "sitemap   %{http_code}\n" https://lastfootball.com/sitemap.xml
ls dist/news/*.html 2>/dev/null | wc -l    # expect hundreds, not 0

# 8. Verify the app backend was not touched
pm2 list
curl -sS -o /dev/null -w "app api   %{http_code}\n" https://api.lastfootball.com/graphql/
```

## Rollback

```bash
cd /var/www/lastfootball
mv dist dist.failed
mv dist.old.<the one you just made> dist
systemctl restart lastfootball-api
```

Restart the service on the way back too, for the same reason as step 6.

## Housekeeping

`dist.prev` and `dist.bak.2026-10-27` are both dated 24 August 2026, so
neither is the rollback point its name suggests. Delete them rather than
trusting them, and keep at most one or two `dist.old.*` directories.
