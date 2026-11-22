#!/usr/bin/env python3
"""Keeps altstore.json (the AltStore / SideStore source) in sync with the
latest Tinta release on GitHub.

If the newest release is not in the file yet, it downloads Tinta.ipa, reads
the version, build number, minimum iOS version and permission texts from it
(AltStore refuses to install if these don't match), and puts the new version
first. Run by .github/workflows/release-info.yml. Exit code 0 also when
nothing changed.
"""
import io
import json
import os
import plistlib
import re
import sys
import urllib.request
import zipfile

REPO = "Pacuka/tinta"
SITE = "https://tinta.pacuka.hu"
OUT = os.path.join(os.path.dirname(__file__), "..", "altstore.json")
KEEP = 5  # how many versions to list

DESCRIPTION = (
    "Nem hivatalos, nyílt forráskódú e-napló app a KRÉTA rendszerhez, "
    "diákoknak és szülőknek. Jegyek, átlagok, órarend, házi feladatok, "
    "számonkérések, hiányzások, üzenetek és fogadóórák egy helyen.\n\n"
    "Belépés a KRÉTA hivatalos bejelentkező oldalán, a jelszavadat a Tinta "
    "nem kéri be. Nem gyűjt statisztikát, nincs benne reklám.\n\n"
    "A Tinta nem áll kapcsolatban az e-KRÉTA rendszer fejlesztőjével és "
    "üzemeltetőjével (eKRÉTA Informatikai Zrt.)."
)


def get(url, binary=False):
    req = urllib.request.Request(url, headers={
        "Accept": "application/octet-stream" if binary else "application/vnd.github+json",
        "User-Agent": "tinta-site-release-info"})
    token = os.environ.get("GITHUB_TOKEN")
    if token and "api.github.com" in url:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def notes(body):
    """Release notes as short plain text (AltStore shows it as 'What's new')."""
    out = []
    for line in body.splitlines():
        line = line.strip()
        if not line or line.startswith("!["):
            continue
        line = re.sub(r"^#+\s*", "", line)
        line = line.replace("**", "").replace(" \u2013 ", ": ").replace("\u2013", "-").replace("\u2014", "-")
        line = re.sub(r"^- ", "• ", line)
        out.append(line)
    text = "\n".join(out)
    return text[:1500].rsplit("\n", 1)[0] if len(text) > 1500 else text


def ipa_info(data):
    z = zipfile.ZipFile(io.BytesIO(data))
    privacy = {}
    main = None
    for name in z.namelist():
        if re.fullmatch(r"Payload/[^/]+\.app/Info\.plist", name) or \
           re.fullmatch(r"Payload/[^/]+\.app/PlugIns/[^/]+\.appex/Info\.plist", name):
            p = plistlib.loads(z.read(name))
            if "/PlugIns/" not in name:
                main = p
            for k, v in p.items():
                if k.endswith("UsageDescription"):
                    privacy[k] = v
    return main, privacy


def main():
    rel = json.loads(get(f"https://api.github.com/repos/{REPO}/releases/latest"))
    version = rel["tag_name"].lstrip("v")
    ipa = next((a for a in rel.get("assets", []) if a["name"] == "Tinta.ipa"), None)
    if ipa is None:
        print("Nincs Tinta.ipa a legújabb kiadásban, nem módosítok.")
        return 0

    try:
        src = json.load(open(OUT, encoding="utf-8"))
        old = src["apps"][0]["versions"]
    except (OSError, ValueError, KeyError, IndexError):
        old = []
    if old and old[0]["version"] == version:
        print(f"Már friss: {version}")
        return 0

    info, privacy = ipa_info(get(ipa["browser_download_url"], binary=True))
    entry = {
        "version": info["CFBundleShortVersionString"],
        "buildVersion": str(info["CFBundleVersion"]),
        "date": rel["published_at"][:10],
        "localizedDescription": notes(rel.get("body") or ""),
        "downloadURL": ipa["browser_download_url"],
        "size": ipa["size"],
        "minOSVersion": info.get("MinimumOSVersion", "15.0"),
    }
    versions = [entry] + [v for v in old if v["version"] != entry["version"]]

    src = {
        "name": "Tinta",
        "subtitle": "Nem hivatalos e-napló app KRÉTA-hoz",
        "description": "A Tinta saját AltStore-forrása. Innen az app frissítései is megjelennek.",
        "iconURL": f"{SITE}/img/icon-512.png",
        "website": f"{SITE}/",
        "tintColor": "#3F5EF0",
        "featuredApps": ["hu.pacuka.tinta"],
        "apps": [{
            "name": "Tinta",
            "bundleIdentifier": "hu.pacuka.tinta",
            "developerName": "Pacuka",
            "subtitle": "E-napló app KRÉTA-fiókhoz",
            "localizedDescription": DESCRIPTION,
            "iconURL": f"{SITE}/img/icon-512.png",
            "tintColor": "#3F5EF0",
            "category": "utilities",
            "screenshots": [
                {"imageURL": f"{SITE}/img/altstore/{n}.png", "width": 486, "height": 1080}
                for n in ("kezdolap-dark", "orarend-dark", "jegyek-dark", "fogadoorak-dark")
            ],
            "versions": versions[:KEEP],
            # Must match the IPA exactly, or AltStore refuses to install.
            # The CI build is unsigned, so it carries no entitlements.
            "appPermissions": {"entitlements": [], "privacy": privacy},
        }],
        "news": [],
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(src, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"Frissítve: {entry['version']} ({entry['buildVersion']})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
