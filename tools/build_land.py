#!/usr/bin/env python3
"""Writes data/land.json from Natural Earth 110m land (public domain, npm package world-atlas).
Needs: npm i world-atlas topojson-client (in a scratch folder), then pass the GeoJSON this prints via land_raw.json.
Antarctica and polar seams are left out; the map is clipped to latitudes -60..84."""
import json, sys
from shapely.geometry import shape, mapping, box
src = json.load(open(sys.argv[1])); frame = box(-180, -60, 180, 84)
def rnd(o): return round(o, 2) if isinstance(o, float) else [rnd(x) for x in o]
from shapely.geometry import Polygon, MultiPolygon
from shapely.affinity import translate
def unwrap(g):
    # Natural Earth rings that cross the date line (Russia, Fiji) arrive with a jump from +180 to -180: shift them to 0..360, then cut at 180
    polys = list(g.geoms) if g.geom_type == 'MultiPolygon' else [g]
    out = []
    for pl in polys:
        r = list(pl.exterior.coords)
        if any(abs(a[0] - b[0]) > 180 for a, b in zip(r, r[1:])):
            pl = Polygon([(x + 360 if x < 0 else x, y) for x, y in r]).buffer(0)
            east, west = pl.intersection(box(0, -90, 180, 90)), translate(pl.intersection(box(180, -90, 540, 90)), -360)
            out += [q for q in (east, west) if not q.is_empty]
        else:
            out.append(pl)
    flat = []
    for q in out: flat += list(q.geoms) if q.geom_type == 'MultiPolygon' else [q]
    return MultiPolygon([q for q in flat if q.geom_type == 'Polygon'])
feats = []
for f in src['features']:
    s = unwrap(shape(f['geometry'])).buffer(0).intersection(frame)
    if s.is_empty: continue
    feats.append({"type": "Feature", "properties": {}, "geometry": {"type": s.geom_type, "coordinates": rnd(mapping(s.simplify(0.05))['coordinates'])}})
json.dump({"type": "FeatureCollection", "features": feats}, open('data/land.json', 'w'), separators=(',', ':'))
