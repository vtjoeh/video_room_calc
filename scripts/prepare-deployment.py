#!/usr/bin/env python3
"""Prepare an immutable static deployment directory with a content build id."""
from __future__ import annotations

import argparse
import hashlib
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXCLUDED = {".git", ".ai", ".agents", ".claude", ".codex", ".cursor", ".vscode", "notes", "scripts"}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path, help="new deployment directory outside the source checkout")
    output = parser.parse_args().output.expanduser().resolve()
    if output == ROOT or ROOT in output.parents:
        raise SystemExit("Output must be outside the source checkout.")
    if output.exists():
        raise SystemExit("Output path must not already exist.")

    status = subprocess.run(["git", "status", "--porcelain"], cwd=ROOT, check=True, text=True, capture_output=True).stdout
    if status.strip():
        raise SystemExit("Source checkout must be clean for deployment provenance.")
    branch = subprocess.run(["git", "branch", "--show-current"], cwd=ROOT, check=True, text=True, capture_output=True).stdout.strip()
    revision = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, check=True, text=True, capture_output=True).stdout.strip()

    version_path = ROOT / "js/version.js"
    source_version = version_path.read_text()
    pattern = r'const BUILD_VERSION = "[^"]*";'
    if not re.search(pattern, source_version):
        raise SystemExit("Could not find BUILD_VERSION in js/version.js.")

    digest = hashlib.sha256()
    normalized = re.sub(pattern, 'const BUILD_VERSION = "";', source_version)
    digest.update(b"js/version.js\0" + normalized.encode())
    app_roots = {ROOT / "js", ROOT / "assets", ROOT / "data"}
    app_files = {ROOT / name for name in ("RoomCalculator.html", "style.css", "sw.js", "manifest.json", "favicon.ico")}
    files = []
    for path in sorted(ROOT.rglob("*")):
        relative = path.relative_to(ROOT)
        is_app_file = path in app_files or any(root in path.parents for root in app_roots)
        if path.is_file() and is_app_file and path != version_path and path.name != ".DS_Store":
            files.append(path)
    for path in files:
        digest.update(path.relative_to(ROOT).as_posix().encode() + b"\0" + path.read_bytes() + b"\0")
    build_id = digest.hexdigest()[:16]

    shutil.copytree(ROOT, output, ignore=shutil.ignore_patterns(*EXCLUDED, "AGENTS.md", "CLAUDE.md", ".DS_Store"))
    staged_version = output / "js/version.js"
    staged_version.write_text(re.sub(pattern, f'const BUILD_VERSION = "{build_id}";', staged_version.read_text()))
    app_version = re.search(r'const APP_VERSION = "([^"]+)";', source_version).group(1)
    print(f"Prepared: {output}")
    print(f"APP_VERSION: {app_version}")
    print(f"BUILD_VERSION: {build_id}")
    print(f"Source: {branch} {revision}")


if __name__ == "__main__":
    main()
