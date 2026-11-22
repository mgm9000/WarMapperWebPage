#!/usr/bin/env python3
"""Shrink aourednik/historical-basemaps snapshots into small files for the home page.

usage: python3 tools/build_hist.py <path to historical-basemaps clone> [output dir]
Keeps only NAME, SUBJECTO, PARTOF, BORDERPRECISION; simplifies geometry (0.12 deg); rounds to 2 decimals.
The source data is GPL-3.0 (see NOTICE.md); this script and its output are kept apart from WarMapper's own data.
"""
import json, sys, os
from shapely.geometry import shape, mapping, box
from shapely.ops import unary_union
SRC = sys.argv[1]; OUT = sys.argv[2] if len(sys.argv) > 2 else 'data/hist'
YEARS = [-3000,-2000,-1500,-1000,-700,-500,-400,-323,-300,-200,-100,-1,100,200,300,400,500,600,700,800,900,1000,1100,1200,1300,1400,1500,1600,1700,1800,1900,2000,2010]
TOL = 0.12
# Ocean fill is an artefact of the source (unnamed or very wide regions run out to sea), so large regions are clipped
# to today's coastline widened by 0.8 degrees (Natural Earth 110m, data/land.json). Antarctica is left out.
LAND = unary_union([shape(f['geometry']).buffer(0.8) for f in json.load(open('data/land.json'))['features']])
FRAME = box(-180, -60, 180, 84)
def rnd(o):
    if isinstance(o, float): return round(o, 2)
    if isinstance(o, (list, tuple)): return [rnd(x) for x in o]
    return o
os.makedirs(OUT, exist_ok=True)
index = []
for y in YEARS:
    fn = f"world_bc{-y}.geojson" if y < 0 else f"world_{y}.geojson"
    d = json.load(open(os.path.join(SRC, 'geojson', fn)))
    feats = []
    for f in d['features']:
        g = f.get('geometry')
        if not g: continue
        s = shape(g)
        if not s.is_valid: s = s.buffer(0)
        s = s.intersection(FRAME)
        b = s.bounds
        if not s.is_empty and ((b[2]-b[0])*(b[3]-b[1]) > 400 or f['properties'].get('NAME') is None):
            s = s.intersection(LAND)
        s = s.simplify(TOL, preserve_topology=True)
        if s.is_empty or s.geom_type not in ('Polygon', 'MultiPolygon'): 
            if s.is_empty: continue
            from shapely.geometry import MultiPolygon
            polys = [g2 for g2 in getattr(s, 'geoms', []) if g2.geom_type == 'Polygon']
            if not polys: continue
            s = MultiPolygon(polys)
        p = f['properties']
        feats.append({"type": "Feature",
                      "properties": {"n": p.get('NAME'), "s": p.get('SUBJECTO'), "o": p.get('PARTOF'), "b": p.get('BORDERPRECISION')},
                      "geometry": {"type": s.geom_type, "coordinates": rnd(mapping(s)['coordinates'])}})
    out = {"type": "FeatureCollection", "year": y, "features": feats}
    path = os.path.join(OUT, f"{'bc'+str(-y) if y<0 else y}.json")
    json.dump(out, open(path, 'w'), separators=(',', ':'), ensure_ascii=False)
    index.append({"year": y, "file": os.path.basename(path), "features": len(feats), "bytes": os.path.getsize(path)})
json.dump(index, open(os.path.join(OUT, 'index.json'), 'w'), indent=1)
print(sum(i['bytes'] for i in index)//1024, 'KB total'); print(max(index, key=lambda i: i['bytes']))
