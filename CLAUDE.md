# Lift Log

A personal workout tracker Eddie uses on his iPhone during training sessions, and
to text a weekly summary to his trainer.

- **Live:** https://eddiestern51-blip.github.io/lift-log/ (GitHub Pages, `main` branch)
- **Repo:** `eddiestern51-blip/lift-log`
- **Used as:** a PWA saved to the iPhone home screen, often with no signal in the gym

## Shape of the thing

Two files, no build step, no dependencies, no framework:

- `index.html` — the entire app: markup, CSS, and one IIFE of ES5-style JS
- `sw.js` — service worker, network-first with an offline fallback

Workouts live in IndexedDB (`liftTrackerDB`, store `workouts`), one record per
date: `{ date: "YYYY-MM-DD", exercises: { "<name>": [set, ...] }, screenshots: [] }`.
There is no server and no account — the data exists only in the browser on his
phone. Never suggest clearing site data as a fix for anything; that erases his
training history.

## Adding or changing an exercise

Exercises are data, not code. Most requests are a one-line change to `EXERCISES`,
which is keyed by category (`LIFTS`, `PLYOS`, `BODYWEIGHT`, `RUN`). Note that the
`PLYOS` and `RUN` keys are internal only — they display as "Plyos / Power" and
"Cardio" via `CAT_LABELS`, and the tabs read `PLYO/PWR` and `CARDIO`.

Each entry names a `type`, and the type is what wires up the wheel pickers:

| type | wheels |
| --- | --- |
| `reps_weight` | Reps, Weight (lb) |
| `reps_height` | Reps, Height (in) |
| `count` / `count_bw` | Count, (+ % BW) |
| `time` / `time_bw` | Min, Sec, (+ % BW) |
| `mins` / `secs` / `secs_bw` | single duration wheel, (+ % BW) |
| `reps_secs30` | Reps, Secs in 30s steps |
| `sets_reps` | Sets, Reps — one entry is a whole block |
| `mins_weight` | Mins, Weight (lb) — timed work under load |
| `mins_mins` | two independent minute wheels |
| `run` | Type, Mins, Miles |
| `cardio` | Intensity (HR band), Mins — Cycling and Elliptical |

A new type needs five things kept in sync: `FIELDS`, `DEFAULTS`, `UNIT_SUFFIX`,
`formatSet`, and `formatSetCompact`. Defaults are per-type, not per-exercise.

**Renaming an exercise is not a one-line change.** Sets are stored under the
exercise *name*, so a rename orphans every set logged under the old one. Add the
pair to the `RENAMES` map instead — `migrateNames()` moves them across once on
startup, and it is idempotent.

## Shipping

Every change bumps the version in **two** places, or the phone keeps the old copy:

1. the `build-tag` div in `index.html`
2. `CACHE_NAME` in `sw.js`

One commit per version, message ending in `(vNN)`. Pages takes 30–60s to rebuild;
poll the live URL for the new build tag rather than assuming.

Push needs a credential override, because `~/.gitconfig` still points GitHub auth
at a `gh` binary under `/tmp` that macOS wiped (the token itself is in the
keychain):

```
git -c 'credential.https://github.com.helper=osxkeychain' push origin main
```

## Things that have already bitten

- **The HTTP cache.** Pages serves HTML and `sw.js` with `max-age=600`, so a new
  build could sit unseen for ten minutes — including the new worker itself. Fixed
  in v28: the shell is fetched `no-store`, the worker registers with
  `updateViaCache: "none"`, and ↻ checks for a new worker before reloading. If a
  build ever looks stuck, `?v=NN` on the URL bypasses it.
- **`body { height: 100% }`** kept its bottom padding inside the viewport box, so
  the last card of every tab hid under the fixed History bar. It is `min-height`
  now — keep it that way.
- **iOS share sheets** only open from a direct tap. The week summary's text is
  built when the week view renders, not when Share is tapped, so no `await` sits
  between the tap and `navigator.share`.
- **Previewing locally.** The browser preview server is sandboxed out of
  `~/Desktop` and 404s on every file there. Copy `index.html` and `sw.js` into the
  session scratchpad, serve that directory, and re-copy after each edit.

## Verifying

The pane is often hidden, so clicks time out — drive the app with
`javascript_tool` instead (click tabs, open sheets, spin wheels by setting
`scrollTop` to `index * 40` and dispatching a `scroll` event). Check at 375px
width; it is only ever used on a phone.
