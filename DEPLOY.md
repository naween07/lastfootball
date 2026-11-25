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
- `team/<id>/index.html` and `player/<id>/index.html` -- the club and player
  hub pages, served by the `$uri/` arm of `try_files $uri $uri/ /index.html`
  plus the `index` directive

Both prerenderers exist as server routes *as well*, and in production
neither route runs: nginx answers `/news/<slug>` and `/team/<id>` off disk
and never proxies them. The files are the whole mechanism; the routes only
matter to the dev server. So "the code is deployed" is not the same as "the
pages are prerendered" -- only a restart, or the next half-hourly pass, puts
the files back.

A fresh build contains none of these, so swapping a new `dist` into place
removes all of them. The service writes them back **on a timer, not
instantly**:

| What | When, measured from the restart |
|---|---|
| `sitemap.xml` and the IndexNow key | within seconds |
| `news/<slug>.html`, all ~2,100 | pass starts at 60s, runs 4-5 minutes |
| `team/<id>/` and `player/<id>/` | pass starts at 110s |

So the article files are absent for the first minute and incomplete for
several more. **Checking the count a few seconds after the restart returns 0,
which looks exactly like a failed deploy and is not one.** Verified on
23 November 2026: 0 articles at 100 seconds became 2,143 articles and 1,104
team pages by the four-minute mark.

Nor does an absent `[PRERENDER]` line in the log mean anything mid-pass --
each pass logs only once, after it finishes.

Until the article pass completes, every article URL falls back to the
client-rendered page, which is worse for search engines and was missed for
about twenty minutes on a previous deploy. The window cannot be removed, only
waited out, so do not deploy and walk away without the check in step 8.

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

# 6. Let the API rewrite the sitemap, the IndexNow key and the articles.
#    The service is up in seconds. The prerendered files are not -- see above.
systemctl restart lastfootball-api
sleep 5
systemctl is-active lastfootball-api

# 7. Verify the website responds
curl -sS -o /dev/null -w "home      %{http_code}\n" https://lastfootball.com/
curl -sS -o /dev/null -w "privacy   %{http_code}\n" https://lastfootball.com/privacy
curl -sS -o /dev/null -w "sitemap   %{http_code}\n" https://lastfootball.com/sitemap.xml

# 8. Wait for the prerender, THEN count the files. Not before: at eight
#    seconds this is legitimately 0 and tells you nothing.
sleep 300
ls dist/news/*.html 2>/dev/null | wc -l    # expect ~2,100, not 0
ls -d dist/team/*/ 2>/dev/null | wc -l     # expect ~1,100
journalctl -u lastfootball-api --since "10 minutes ago" --no-pager | grep PRERENDER

# 9. Verify the app backend was not touched
pm2 list

# A bare GET has no query, so Apollo answers 400 whether it is healthy or not.
# Post a real one: a dead backend gives 502 or a refused connection instead.
curl -sS -X POST https://api.lastfootball.com/graphql/ \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ __typename }"}'
# expect {"data":{"__typename":"RootQueryType"}}
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
