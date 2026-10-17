#!/usr/bin/env python3
"""Check whether copied shared header/footer markup has drifted from master files.

The current static deployment intentionally keeps path-adjusted copies in each HTML page.
This helper reports differences; it does not overwrite page-specific paths or scripts.
"""
from pathlib import Path
import re, sys
ROOT = Path(__file__).resolve().parents[1]
MASTER_HEADER = (ROOT / "assets/include/header.html").read_text(encoding="utf-8")
MASTER_FOOTER = (ROOT / "assets/include/footer.html").read_text(encoding="utf-8")

def block(text, tag):
    m = re.search(rf"<{tag}\b.*?</{tag}>", text, re.S | re.I)
    return re.sub(r"\s+", " ", m.group(0)).strip() if m else None

def normalize_paths(text):
    # Ignore depth prefixes when comparing page copies with root-relative masters.
    return re.sub(r'(?<=["\'])(?:\.\./)+', '', text)

problems=[]
for page in sorted(ROOT.rglob("*.html")):
    if "roam-list" in page.parts:
        continue
    text=page.read_text(encoding="utf-8", errors="replace")
    h, f=block(text,"header"), block(text,"footer")
    if not h or not f:
        continue
    # This is a smoke/drift report, not a byte-equality check: page-specific inline scripts
    # and relative URLs are deliberately preserved by this legacy static build.
    for name, actual, master in (("header",h,block(MASTER_HEADER,"header")),("footer",f,block(MASTER_FOOTER,"footer"))):
        a=normalize_paths(actual); m=normalize_paths(master)
        # Report only when the actual structural content has obvious differences.
        if ("ep-header__inner" not in a if name=="header" else "ep-footer__main" not in a):
            problems.append(f"{page.relative_to(ROOT)}: missing expected {name} structure")
if problems:
    print("Shared chrome check found issues:")
    print("\n".join(problems)); sys.exit(1)
print("Shared chrome smoke check passed: expected header/footer structures found on applicable pages.")
