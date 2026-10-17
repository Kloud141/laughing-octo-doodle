#!/usr/bin/env python3
"""
Download every externally hot-linked Unsplash image, store it locally,
rewrite the URLs in the code, keep each file under 1 MB (no resizing),
and regenerate CREDITS.md.

Run from the project root, on a machine with internet access:
    pip install pillow
    python3 tools/localize_external_images.py            # do it
    python3 tools/localize_external_images.py --dry-run  # just print the plan

Where files go
    assets/images/destinations/<slug>.jpg   <- DESTINATIONS_DATA in datasets.js
    assets/images/roams/photos/<id>.jpg     <- roams-data.js + roams/roam-list/*.html
Safe to re-run: existing files are not downloaded again.
"""
import io, os, re, sys, time, json, html, urllib.request
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRY = "--dry-run" in sys.argv
MAX_BYTES = 1024 * 1024
UA = {"User-Agent": "Mozilla/5.0 (embarkpedia image localiser)"}
URL_RE = re.compile(r"https://images\.unsplash\.com/photo-([0-9a-f]+-[0-9a-f]+|[0-9]+)\?[^\"'\s)<>]*")
W_RE = re.compile(r"[?&](?:amp;)?w=(\d+)")

def p(*a): return os.path.join(ROOT, *a)
def read(path):  return open(path, encoding="utf-8").read()
def write(path, s): open(path, "w", encoding="utf-8", newline="").write(s)

def fetch(url):
    for i in range(3):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
        except Exception as e:
            if i == 2: raise
            time.sleep(2 * (i + 1))

def save_under_1mb(data, dest):
    im = Image.open(io.BytesIO(data)).convert("RGB")      # pixel size is never changed
    for q in (92, 90, 88, 85, 82):
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=q, subsampling=0, optimize=True, progressive=True)
        if buf.tell() <= MAX_BYTES: break
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    open(dest, "wb").write(buf.getvalue())

def photographer(pid):
    try:
        t = fetch(f"https://unsplash.com/photos/{pid}").decode("utf8", "ignore")
        m = re.search(r"<title>(.*?)</title>", t, re.S)
        m = re.search(r"Photo by (.+?) on Unsplash", html.unescape(m.group(1))) if m else None
        return m.group(1).strip() if m else ""
    except Exception:
        return ""

credits = {}   # local path -> (photo id, description)
jobs = {}      # local abs path -> (url, width)

# ---- 1. destinations (datasets.js): one image per destination slug -------------
ds = p("assets", "js", "datasets.js")
src = read(ds)
def dest_sub(m):
    slug, url = m.group(1), m.group(2)
    pid = URL_RE.match(url).group(1)
    rel = f"assets/images/destinations/{slug}.jpg"
    jobs[p(rel)] = (url, 900); credits[rel] = (pid, slug)
    return f'"slug": "{slug}",' + m.group(0).split(",", 1)[1].replace(url, "../" + rel)
src_new = re.sub(r'"slug":\s*"([^"]+)",(?:(?!"slug")[\s\S])*?"image":\s*"(https://images\.unsplash\.com[^"]+)"',
                 dest_sub, src, count=0)
if not DRY: write(ds, src_new)

# ---- 2. roams-data.js and roam pages: one file per photo id --------------------
def roam_targets():
    yield p("assets", "js", "roams-data.js"), "../"
    d = p("roams", "roam-list")
    for f in sorted(os.listdir(d)):
        if f.endswith(".html"): yield os.path.join(d, f), "../../"

widest = {}
for path, _ in roam_targets():
    for m in URL_RE.finditer(read(path)):
        w = int(W_RE.search(m.group(0)).group(1))
        widest[m.group(1)] = max(widest.get(m.group(1), 0), w)
for path, prefix in roam_targets():
    s = read(path)
    def sub(m):
        pid = m.group(1)
        rel = f"assets/images/roams/photos/{pid}.jpg"
        jobs[p(rel)] = (f"https://images.unsplash.com/photo-{pid}?fm=jpg&q=80&w={widest[pid]}&auto=format&fit=crop", widest[pid])
        credits.setdefault(rel, (pid, "roam"))
        return prefix + rel
    if not DRY: write(path, URL_RE.sub(sub, s))
    else: URL_RE.sub(sub, s)

print(f"{len(jobs)} images to localise")
if DRY:
    for k, (u, w) in jobs.items(): print(" ", os.path.relpath(k, ROOT), "<-", u)
    sys.exit(0)

# ---- 3. download -----------------------------------------------------------------
for dest, (url, w) in jobs.items():
    if os.path.exists(dest): continue
    print("downloading", os.path.relpath(dest, ROOT))
    save_under_1mb(fetch(url), dest)

# ---- 4. credits ------------------------------------------------------------------
lines = ["# Image credits", "",
         "Photographs below are from [Unsplash](https://unsplash.com) and used under the",
         "[Unsplash License](https://unsplash.com/license) (free to use, attribution appreciated).", "",
         "| File | Photographer | Source |", "|---|---|---|"]
for rel, (pid, _) in sorted(credits.items()):
    who = photographer(pid) or "Unsplash contributor"
    lines.append(f"| `{rel}` | {who} | https://unsplash.com/photos/{pid} |")
lines += ["", "Other images in `assets/images/` (logos, banners, about/core/clients artwork) are Embark Pedia's own.", ""]
write(p("CREDITS.md"), "\n".join(lines))
print("done - review CREDITS.md and open the site to confirm every image loads.")
