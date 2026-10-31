#!/usr/bin/env python3
"""Writes the latest Tinta release (version + arm64 APK size) into index.html.

Run by .github/workflows/release-info.yml, so visitors' browsers never call
GitHub themselves (the site makes no external requests). Exit code 0 also
when nothing changed.
"""
import json
import os
import re
import sys
import urllib.request

REPO = "Pacuka/tinta"
PAGE = os.path.join(os.path.dirname(__file__), "..", "index.html")


def latest_release():
    req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/releases/latest",
        headers={"Accept": "application/vnd.github+json",
                 "User-Agent": "tinta-site-release-info"})
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def main():
    rel = latest_release()
    version = rel["tag_name"].lstrip("v")
    apk = next((a for a in rel.get("assets", [])
                if a["name"].endswith("arm64-v8a.apk")), None)
    if apk is None:
        print("Nincs arm64 APK a legújabb kiadásban, nem módosítok.")
        return 0
    size_mb = round(apk["size"] / 1024 / 1024)
    meta = f"v{version} · {size_mb} MB"

    html = open(PAGE, encoding="utf-8").read()
    new = re.sub(r'(<span class="dl-meta">)[^<]*(</span>)', rf"\g<1>{meta}\g<2>", html, count=1)
    if new == html:
        print(f"Már friss: {meta}")
        return 0
    open(PAGE, "w", encoding="utf-8").write(new)
    print(f"Frissítve: {meta}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
