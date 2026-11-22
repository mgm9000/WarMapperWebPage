/* WarMapper home page: the tour of the centuries. Static, no build step. See README.md. */
(function () {
  "use strict";
  const SHOW_PINS = false; /* WarMapper map diamonds: switched off for now */
  const DWELL_MS = 3000, FADE_MS = 1000, TEXT_FADE_MS = 280;
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const STOPS = []; for (let y = -2500; y <= -100; y += 100) STOPS.push(y); STOPS.push(1); for (let y = 100; y <= 2000; y += 100) STOPS.push(y); STOPS.push(2026);
  const WORLD_BOUNDS = [[-168, -52], [178, 76]];

  const $ = (id) => document.getElementById(id);
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function fmtYear(y) { return y === 2026 ? "Today" : y < 0 ? (-y) + " BCE" : y + " CE"; }
  function snapLabel(y) { return y < 0 ? (-y) + " BCE" : y + " CE"; }
  const bust = "?v=0.1";
  const getJSON = (u) => fetch(u + bust).then((r) => { if (!r.ok) throw new Error(u + " " + r.status); return r.json(); });

  let hist = [], wars = [], mapsList = [], land = null;
  const cache = new Map();
  let map, idx = 0, playing = !REDUCED, timer = null, buf = "A", curSnap = null, panelOpen = false;
  let warMarkers = [], pinMarkers = [], lastFeatures = [];

  function snapFor(stop) {
    let best = hist[0], bd = Infinity;
    for (const h of hist) { const d = Math.abs(h.year - stop); if (d < bd || (d === bd && h.year > best.year)) { best = h; bd = d; } }
    return best;
  }
  function loadSnap(h) {
    if (cache.has(h.year)) return cache.get(h.year);
    const p = getJSON("data/hist/" + h.file).then((fc) => {
      fc.features.forEach((f, i) => { f.id = i; f.properties.approx = f.properties.b === 1 || f.properties.b == null ? 1 : 0; });
      return fc;
    });
    cache.set(h.year, p); return p;
  }

  /* ---------- map ---------- */
  function initMap() {
    map = new maplibregl.Map({
      container: "map", attributionControl: false, dragRotate: false, pitchWithRotate: false, touchPitch: false,
      minZoom: 0, maxZoom: 8, bounds: WORLD_BOUNDS, fitBoundsOptions: { padding: { top: 10, bottom: 10, left: 10, right: 10 } }, renderWorldCopies: false,
      style: { version: 8, sources: {}, layers: [{ id: "bg", type: "background", paint: { "background-color": "#080b10" } }] },
    });
    map.touchZoomRotate.disableRotation();
    map.on("load", () => {
      map.addSource("land", { type: "geojson", data: land });
      map.addLayer({ id: "land-fill", type: "fill", source: "land", paint: { "fill-color": "#111a25" } });
      map.addLayer({ id: "land-line", type: "line", source: "land", paint: { "line-color": "#223044", "line-width": 0.8 } });
      for (const b of ["A", "B"]) {
        map.addSource("era" + b, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({ id: "fill" + b, type: "fill", source: "era" + b, paint: {
          "fill-color": ["case", ["boolean", ["feature-state", "hover"], false], "#46648a", "#1f2d40"],
          "fill-opacity": 0, "fill-opacity-transition": { duration: FADE_MS } } });
        map.addLayer({ id: "line" + b, type: "line", source: "era" + b, filter: ["==", ["get", "approx"], 0], paint: { "line-color": "#c9d3e0", "line-width": 0.9, "line-opacity": 0, "line-opacity-transition": { duration: FADE_MS } } });
        map.addLayer({ id: "lined" + b, type: "line", source: "era" + b, filter: ["==", ["get", "approx"], 1], paint: { "line-color": "#aab6c6", "line-width": 0.8, "line-dasharray": [3, 3], "line-opacity": 0, "line-opacity-transition": { duration: FADE_MS } } });
      }
      map.addSource("wars", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      const rad = ["interpolate", ["exponential", 2], ["zoom"], 0, ["get", "r0"], 22, ["*", ["get", "r0"], 4194304]];
      map.addLayer({ id: "war-glow", type: "circle", source: "wars", paint: { "circle-radius": rad, "circle-color": "#d2a24a", "circle-opacity": 0.16, "circle-blur": 0.5, "circle-pitch-alignment": "map" } });
      map.addLayer({ id: "war-ring", type: "circle", source: "wars", paint: { "circle-radius": rad, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": "#f0c874", "circle-stroke-width": 1.4, "circle-stroke-opacity": 0.85, "circle-pitch-alignment": "map" } });
      if (SHOW_PINS) pinsInit();
      go(0, true);
      if (playing) schedule();
      syncPlay();
    });
    map.on("click", (e) => {
      const f = map.queryRenderedFeatures(e.point, { layers: ["fill" + buf] })[0];
      if (!f) return;
      pause(); openRegion(f);
    });
    map.on("mousemove", (e) => {
      if (!map.getLayer("fill" + buf)) return;
      const f = map.queryRenderedFeatures(e.point, { layers: ["fill" + buf] })[0];
      setHover(f ? f.id : null);
      map.getCanvas().style.cursor = f ? "pointer" : "";
      const tip = $("tip");
      if (f) { tip.textContent = f.properties.n || f.properties.s || "Unnamed region"; tip.style.display = "block"; tip.style.left = e.point.x + "px"; tip.style.top = e.point.y + "px"; }
      else tip.style.display = "none";
    });
    map.on("mouseout", () => { $("tip").style.display = "none"; setHover(null); });
  }

  let hoverId = null, hoverBuf = null;
  function setHover(id) {
    if (id === hoverId && hoverBuf === buf) return;
    if (hoverId !== null && map.getSource("era" + hoverBuf)) map.setFeatureState({ source: "era" + hoverBuf, id: hoverId }, { hover: false });
    hoverId = id; hoverBuf = buf;
    if (id !== null) map.setFeatureState({ source: "era" + buf, id }, { hover: true });
  }

  /* ---------- tour ---------- */
  let sliderAnim = null, hudTimer = null;
  function setSlider(i, animate) {
    cancelAnimationFrame(sliderAnim);
    const sl = $("slider"), from = parseFloat(sl.value), to = i, max = STOPS.length - 1;
    const paint = (v) => { sl.value = v; sl.style.setProperty("--p", (v / max * 100) + "%"); };
    if (!animate || REDUCED || from === to) { paint(to); return; }
    const t0 = performance.now(), dur = 650;
    const step = (t) => { const k = Math.min(1, (t - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; paint(from + (to - from) * e); if (k < 1) sliderAnim = requestAnimationFrame(step); };
    sliderAnim = requestAnimationFrame(step);
  }
  /* two stacked text layers: the new year fades in as the old one fades out */
  let hudOn = 0;
  function setHud(stop, h, soft) {
    const layers = document.querySelectorAll("#hud .hudl");
    const next = layers[soft ? 1 - hudOn : hudOn], prev = layers[hudOn];
    next.querySelector(".era").textContent = fmtYear(stop);
    const meta = next.querySelector(".meta"); meta.textContent = "";
    const exact = h.year === stop;
    meta.append("Borders from the ", Object.assign(el("b"), { textContent: snapLabel(h.year) }), " snapshot" + (exact ? "" : " (nearest available)"));
    if (stop === 2026) meta.append(". Latest data is 2010.");
    else if (h.year <= 1000) meta.append(". Early borders are approximate.");
    if (next !== prev) { next.classList.add("on"); prev.classList.remove("on"); hudOn = 1 - hudOn; }
  }
  /* go(i, instant): instant = the viewer is dragging or the page is starting, so no fades or slider glide */
  function go(i, instant) {
    idx = i;
    const stop = STOPS[i], h = snapFor(stop);
    setSlider(i, !instant);
    setHud(stop, h, !instant);
    if (!playing) $("live").textContent = fmtYear(stop) + ". Borders from the " + snapLabel(h.year) + " snapshot.";
    showWars(stop, instant);
    loadSnap(h).then((fc) => {
      if (STOPS[idx] !== stop) return;
      lastFeatures = fc.features; curSnap = h;
      if (cur() !== h.year) swap(fc, h.year, instant);
      const nx = STOPS[(i + 1) % STOPS.length]; loadSnap(snapFor(nx));
    }).catch((e) => console.error(e));
  }
  let shown = null; function cur() { return shown; }
  function swap(fc, year, instant) {
    const inc = buf === "A" ? "B" : "A", old = buf;
    map.getSource("era" + inc).setData(fc);
    const d = instant ? 0 : FADE_MS;
    for (const [l, o] of [["fill", 0.38], ["line", 0.9], ["lined", 0.9]]) {
      map.setPaintProperty(l + inc, l === "fill" ? "fill-opacity-transition" : "line-opacity-transition", { duration: d });
      map.setPaintProperty(l + old, l === "fill" ? "fill-opacity-transition" : "line-opacity-transition", { duration: d });
      map.setPaintProperty(l + inc, l === "fill" ? "fill-opacity" : "line-opacity", o);
      map.setPaintProperty(l + old, l === "fill" ? "fill-opacity" : "line-opacity", 0);
    }
    setHover(null);
    buf = inc; shown = year;
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(() => { go((idx + 1) % STOPS.length); schedule(); }, DWELL_MS); }
  function pause() { playing = false; clearTimeout(timer); syncPlay(); }
  function resume() {
    closePanel(); playing = true; syncPlay();
    map.fitBounds(WORLD_BOUNDS, { padding: 10, duration: REDUCED ? 0 : 900 });
    $("live").textContent = ""; schedule();
  }
  function syncPlay() {
    const b = $("play");
    b.setAttribute("aria-label", playing ? "Pause the tour" : "Resume the tour");
    b.innerHTML = playing ? '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z"/></svg>';
  }

  /* ---------- war highlights ---------- */
  let warToken = 0;
  function showWars(stop, instant) {
    const list = wars.filter((w) => w.stop === stop), token = ++warToken;
    const old = warMarkers; warMarkers = [];
    if (!map.getSource("wars")) { old.forEach((m) => m.remove()); return; }
    const soft = !instant && !REDUCED;
    old.forEach((m) => { m.getElement().classList.add("out"); });
    setTimeout(() => old.forEach((m) => m.remove()), soft ? 320 : 0);
    const fade = (op, ms) => { for (const l of ["war-glow", "war-ring"]) { map.setPaintProperty(l, l === "war-glow" ? "circle-opacity-transition" : "circle-stroke-opacity-transition", { duration: ms }); } map.setPaintProperty("war-glow", "circle-opacity", op * 0.16); map.setPaintProperty("war-ring", "circle-stroke-opacity", op * 0.85); };
    const build = () => {
      if (token !== warToken) return;
      map.getSource("wars").setData({ type: "FeatureCollection", features: list.map((w) => ({ type: "Feature", properties: { r0: w.r * 1000 / (156543.03 * Math.cos(w.at[1] * Math.PI / 180)) }, geometry: { type: "Point", coordinates: w.at } })) });
      fade(1, soft ? 600 : 0);
      const placed = []; /* labels that would overlap at the world view are stacked downwards */
      list.forEach((w, k) => {
        const px = map.project(w.at); let dy = 0;
        while (placed.some((q) => Math.abs(q.x - px.x) < 170 && Math.abs(q.y - (px.y + dy)) < 26)) dy += 26;
        placed.push({ x: px.x, y: px.y + dy });
        const wrap = el("div", "warwrap"); /* MapLibre positions the wrapper; the button inside does the animation */
        const b = el("button", "war", w.name); b.type = "button"; b.style.animationDelay = (k * 160) + "ms"; b.title = w.name + " (" + w.when + ")";
        b.addEventListener("click", (e) => { e.stopPropagation(); pause(); openWar(w); });
        wrap.append(b);
        warMarkers.push(new maplibregl.Marker({ element: wrap, anchor: "left", offset: [8, dy] }).setLngLat(w.at).addTo(map));
      });
    };
    if (soft) { fade(0, 300); setTimeout(build, 420); } else { fade(0, 0); build(); }
  }
  function pinsInit() {
    mapsList.forEach((m) => {
      const b = el("button", "pin"); b.type = "button"; b.title = m.title + " (WarMapper map)"; b.setAttribute("aria-label", "WarMapper map: " + m.title);
      b.addEventListener("click", (e) => { e.stopPropagation(); pause(); openMap(m); });
      pinMarkers.push(new maplibregl.Marker({ element: b }).setLngLat(m.at).addTo(map));
    });
  }

  /* ---------- panel ---------- */
  const panel = () => $("panel");
  function openPanel(build) {
    const p = panel(); p.textContent = "";
    const c = el("button", "close", "×"); c.type = "button"; c.setAttribute("aria-label", "Close"); c.addEventListener("click", () => { closePanel(); toWorld(); });
    p.append(c); build(p);
    const btns = el("div", "btns");
    const back = el("button", "btn", "Back to the world"); back.type = "button"; back.addEventListener("click", () => { closePanel(); toWorld(); });
    const res = el("button", "btn pri", "Resume the tour"); res.type = "button"; res.addEventListener("click", resume);
    btns.append(res, back); p.append(btns);
    p.classList.add("open"); panelOpen = true; p.scrollTop = 0; p.focus({ preventScroll: true });
  }
  function closePanel() { panel().classList.remove("open"); panelOpen = false; }
  function toWorld() { map.fitBounds(WORLD_BOUNDS, { padding: 10, duration: REDUCED ? 0 : 800 }); }
  function pad() { return innerWidth > 760 ? { top: 70, bottom: 60, left: 40, right: 420 } : { top: 80, bottom: Math.round($("map").clientHeight * 0.55), left: 24, right: 24 }; }
  function fit(b, maxZoom) { map.fitBounds(b, { padding: pad(), maxZoom: maxZoom || 6.5, duration: REDUCED ? 0 : 900 }); }

  function mapCard(m) {
    const gate = WMEntitlements.can("open-map", { id: m.id });
    const a = el("a", "card"); a.href = gate.allowed ? m.href : WMAuth.pricingUrl();
    const img = el("img"); img.src = m.img; img.alt = ""; img.loading = "lazy";
    const t = el("div"); t.append(el("div", "t", m.title), el("div", "d", m.when), el("div", "b", m.blurb));
    a.append(img, t); return a;
  }
  function soonCard(text) { const c = el("div", "card soon"); const t = el("div"); t.append(el("div", "t", "More WarMaps coming"), el("div", "b", text)); c.append(t); return c; }
  function warRows(list) {
    const box = el("div");
    list.forEach((w) => {
      const r = el("div", "warrow"); r.append(w.name);
      const s = el("small"); s.append(w.when + " · "); const a = el("a", null, "check this war"); a.href = w.src; a.target = "_blank"; a.rel = "noopener"; s.append(a);
      r.append(s);
      (w.maps || []).forEach((id) => { const m = mapsList.find((x) => x.id === id); if (m) r.append(mapCard(m)); });
      box.append(r);
    });
    return box;
  }

  function pip(pt, geom) {
    const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.type === "MultiPolygon" ? geom.coordinates : [];
    const inRing = (ring) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const a = ring[i], b = ring[j]; if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
    return polys.some((p) => inRing(p[0]) && !p.slice(1).some(inRing));
  }
  function bboxOf(geom) {
    let w = 180, s = 90, e = -180, n = -90;
    (function walk(a) { if (typeof a[0] === "number") { w = Math.min(w, a[0]); e = Math.max(e, a[0]); s = Math.min(s, a[1]); n = Math.max(n, a[1]); } else a.forEach(walk); })(geom.coordinates);
    return [[w, s], [e, n]];
  }
  function openRegion(rf) {
    const feat = lastFeatures.find((f) => f.id === rf.id) || rf; const p = feat.properties, bb = bboxOf(feat.geometry);
    const stop = STOPS[idx], year = curSnap ? curSnap.year : stop;
    fit(bb, 6);
    const here = mapsList.filter((m) => pip(m.at, feat.geometry));
    const inBox = wars.filter((w) => w.stop === stop && w.at[0] >= bb[0][0] && w.at[0] <= bb[1][0] && w.at[1] >= bb[0][1] && w.at[1] <= bb[1][1]);
    openPanel((el0) => {
      el0.append(el("div", "eyebrow", "Region · " + fmtYear(stop)), el("h2", null, p.n || p.s || "Unnamed region"));
      if (!p.n) el0.append(el("p", null, "The data for this period does not name this region."));
      if (p.s && p.s !== p.n) el0.append(el("p", null, "Subject to: " + p.s + "."));
      if (p.o && p.o !== p.n && p.o !== p.s) el0.append(el("p", null, "Part of: " + p.o + "."));
      el0.append(el("p", null, "Map data year: " + snapLabel(year) + ". Border " + (p.b === 3 ? "set by international law." : p.b === 2 ? "moderately precise." : "approximate.") + " Draft, unreviewed."));
      el0.append(el("h3", null, "WarMapper maps here"));
      here.forEach((m) => el0.append(mapCard(m)));
      el0.append(soonCard(here.length ? "More battles in this region are planned." : "No WarMap covers this region yet."));
      if (inBox.length) { el0.append(el("h3", null, "Wars of this century in view")); el0.append(warRows(inBox)); }
    });
  }
  function openWar(w) {
    const k = w.r / 111; map.fitBounds([[w.at[0] - k * 1.6, w.at[1] - k], [w.at[0] + k * 1.6, w.at[1] + k]], { padding: pad(), maxZoom: 6, duration: REDUCED ? 0 : 900 });
    openPanel((el0) => {
      el0.append(el("div", "eyebrow", "War · " + fmtYear(STOPS[idx])), el("h2", null, w.name), el("p", null, w.when));
      const a = el("a", null, "Check this war (Wikipedia)"); a.href = w.src; a.target = "_blank"; a.rel = "noopener"; const pp = el("p"); pp.append(a); el0.append(pp);
      el0.append(el("p", null, "The highlight shows roughly where it was fought, not its exact extent."));
      el0.append(el("h3", null, "WarMapper maps"));
      const ms = (w.maps || []).map((id) => mapsList.find((m) => m.id === id)).filter(Boolean);
      ms.forEach((m) => el0.append(mapCard(m)));
      el0.append(soonCard(ms.length ? "More battles of this war are planned." : "No WarMap for this war yet."));
    });
  }
  function openMap(m) {
    map.flyTo({ center: m.at, zoom: 6, duration: REDUCED ? 0 : 900, padding: pad() });
    openPanel((el0) => { el0.append(el("div", "eyebrow", "WarMapper map"), el("h2", null, m.title)); el0.append(mapCard(m)); });
  }

  /* ---------- controls ---------- */
  function buildTicks() {
    const t = $("ticks"); t.textContent = "";
    const marks = [[-2500, 1], [-2000, 0], [-1500, 0], [-1000, 1], [-500, 0], [1, 0], [500, 1], [1000, 0], [1500, 0], [2026, 1]]; /* [year, shown on a phone] */
    marks.forEach(([y, m]) => {
      const s = el("span", (y === 1 ? "zero " : "") + (m ? "m" : ""), y === 2026 ? "Today" : y === 1 ? "1 CE" : fmtYear(y));
      s.style.left = (STOPS.indexOf(y) / (STOPS.length - 1) * 100) + "%"; t.append(s);
    });
  }
  function wire() {
    $("play").addEventListener("click", () => { if (playing) pause(); else resume(); });
    $("slider").addEventListener("input", (e) => { pause(); closePanel(); cancelAnimationFrame(sliderAnim); const i = Math.max(0, Math.min(STOPS.length - 1, Math.round(+e.target.value))); if (i !== idx) go(i, true); else setSlider(i, false); });
    $("slider").addEventListener("keydown", (e) => { /* the slider glides (step "any"), so the keys are handled here: one stop at a time */
      const d = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -5, PageUp: 5 }[e.key];
      const to = e.key === "Home" ? 0 : e.key === "End" ? STOPS.length - 1 : d ? Math.max(0, Math.min(STOPS.length - 1, idx + d)) : null;
      if (to === null) return;
      e.preventDefault(); pause(); closePanel(); cancelAnimationFrame(sliderAnim); if (to !== idx) go(to, true); else setSlider(to, false);
    });
    $("home-view").addEventListener("click", () => { closePanel(); toWorld(); });
    $("info").addEventListener("click", () => $("about-data").showModal());
    addEventListener("keydown", (e) => { if (e.key === "Escape" && panelOpen) { closePanel(); toWorld(); } });
    document.addEventListener("visibilitychange", () => { if (document.hidden) clearTimeout(timer); else if (playing) schedule(); });
  }

  /* ---------- start ---------- */
  Promise.all([getJSON("data/hist/index.json"), getJSON("data/wars.json"), getJSON("data/maps.json"), getJSON("data/land.json")]).then(([h, w, m, l]) => {
    hist = h; wars = w; mapsList = m; land = l;
    $("slider").max = STOPS.length - 1; buildTicks(); wire(); syncPlay(); initMap();
    window.WM_TOUR = { map: map, STOPS, go, pause, resume, get idx() { return idx; }, get playing() { return playing; } }; /* handle for testing */
  }).catch((e) => { $("era").textContent = "Could not load the map data"; console.error(e); });
})();
