# Third-party material

| Material | Terms | How it is used |
|---|---|---|
| historical-basemaps, aourednik and contributors, https://github.com/aourednik/historical-basemaps | GPL-3.0 for the repository; no separate licence is stated for the data, and its README credits old student material (ThinkQuest). **Whether it can be used on a page whose code has other terms is undecided: see the PRD, item H-10.** | Simplified and trimmed into `data/hist/` by `tools/build_hist.py`. |
| Natural Earth countries 110m (via the npm package world-atlas) | Public domain | Coastline under the borders, `data/land.json` |
| MapLibre GL JS | BSD-3-Clause, `vendor/MAPLIBRE-LICENSE.txt` | The map, `vendor/` |
| Wikipedia article pages | Linked only, as pages to check each war against | `data/wars.json` |
| WarMapper preview pictures | Copied from https://github.com/mgm9000/WarMapper (all rights reserved, Starfishient LLC) | `assets/` |
