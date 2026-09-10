# The web app

One source file, `app.html`, built into an installable offline app by
`../tools/build_site.py` and deployed to GitHub Pages by
`../.github/workflows/pages.yml` on every push to `main`.

**Live:** https://abookofhope.github.io/dopamine-drop/

## Why it lives here and not in `web/`

`flutter create .` generates a `web/` target and would overwrite anything kept
there. The Flutter `.gitignore` also excludes that path, which silently dropped
this directory's icons from its first commit and failed the build.

## Why it is shaped like this

`app.html` has no `<html>`, `<head>` or `<body>` — it is page content only,
because the same file is also published as a Claude Artifact, where the host
supplies the document shell. The build wraps it, adds the manifest and icon
links, and emits the service worker.

## Updates invalidate themselves

The service worker's cache name is a hash of the built page, the manifest and
the icons. A new build produces a new name; the worker's `activate` step deletes
every cache that is not the current one. There is no version constant to forget
to bump, and no way for an installed copy to pin a stale build.

## Build it locally

```bash
python3 tools/build_site.py _site
python3 -m http.server 8000 --directory _site
```

Service workers need a secure context, which `localhost` counts as — so the
offline behaviour can be tested without deploying.

## On the phone

Chrome offers **Install app** (or Add to Home Screen). It installs to the home
screen with its own icon, runs full screen with no browser chrome, and works
with no connection at all.

## Where the data lives

Progress is in that device's `localStorage` and nowhere else — no account, no
sign-in. The cost of that is that a lost phone is a lost save, so
**Settings → Data** has Export and Import: a JSON backup you can move between
devices. Imports run through the same schema migration as a stored save, so a
backup from an older build lands upgraded rather than raw.
