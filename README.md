# WarMapper web page (draft v0.1)

The public face of WarMapper: a dark world map over a timeline from 2500 BCE to today that plays one century at a time, marks where widely known wars were fought, and opens the WarMapper battle playbacks. The playbacks themselves live in https://github.com/mgm9000/WarMapper and are linked, not copied.

**Status: draft. Nothing here has been checked by a historian.** The licence of the border data is an open question (see NOTICE.md and PRD item H-10). The code in this repository has no licence file yet.

A static site: no build step, no server code. Plain HTML, CSS and JavaScript, with the MapLibre library in `vendor/`.

## Look at it

From the top of the repository:

```
python3 -m http.server 8000
```

then open http://localhost:8000/ . (Opening `index.html` directly does not work: the browser blocks the data files.)

To publish: Settings, Pages, deploy from the `main` branch, root folder. The playback links point at https://mgm9000.github.io/WarMapper/playbacks/ and work once Pages is on for that repository.

## How it is put together

| File | What it does |
| --- | --- |
| `index.html`, `js/home.js` | The home page: map, timeline, the tour, the panel that opens on a click |
| `js/shell.js` | The header and navigation shared by every page. **Edit the menu here.** |
| `about.html`, `search.html`, `institutions.html`, `publishers.html` | Blank pages for the four menu items |
| `login.html`, `account.html`, `pricing.html` | Reserved for accounts; blank |
| `js/auth.js` | Accounts seam. Nobody is signed in. A real provider replaces the inside of this file only. |
| `js/entitlements.js` | What a visitor may do. Everyone is "free" and everything is allowed. Called when a map card is built (the gating hook). |
| `data/hist/` | Border snapshots, one file per snapshot year, loaded as the tour reaches them |
| `data/wars.json` | The wars shown in each century (written by `tools/build_wars.py`) |
| `data/maps.json` | The WarMapper playbacks that appear on the map and in panels (edit by hand) |
| `data/land.json` | Coastline under the borders |
| `vendor/` | MapLibre GL JS (BSD-3-Clause) |
| `assets/` | Preview pictures of the playbacks, copied from the WarMapper repository |
| `tools/` | Scripts that make the data files |

The tour has 47 stops (`STOPS` in `js/home.js`). Each stop shows the nearest border snapshot and says which year that is.

## Add a war or a playback

- A war: add a row to `tools/build_wars.py` and run `python3 tools/build_wars.py`. Give it the stop (the century it appears in), where, how big the highlight is, a page to check it against, and optionally the ids of WarMapper maps.
- A playback on the map: add it to `data/maps.json` (id, title, dates, position, link, picture), and add its id to the war it belongs to.

## Rebuild the border data

`tools/build_hist.py` (needs `shapely`) shrinks the snapshots from a clone of https://github.com/aourednik/historical-basemaps . `tools/build_land.py` makes the coastline (see its header). Their output is checked in, so you only need these to change the data.

## Not built yet

Accounts, login, subscriptions and pricing; the content of the four menu pages; "Search a WarMap"; making this the public landing page; the domain war-mapper.com.
