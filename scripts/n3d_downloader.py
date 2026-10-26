#!/usr/bin/env python3
"""
N3D Melbourne – Design Downloader
==================================
Downloads all entitled pokeball print profiles from the official N3D API
(https://www.n3dmelbourne.com/resources/docs/designs-api).

Usage
-----
  # First time: put your API key in the environment or pass it as an arg
  export N3D_API_KEY="n3d_sk_..."
  python3 n3d_downloader.py

  # Or pass it directly
  python3 n3d_downloader.py --api-key n3d_sk_...

  # Preview only (no downloads)
  python3 n3d_downloader.py --dry-run

  # Force re-download of everything
  python3 n3d_downloader.py --force

  # Download a specific design only
  python3 n3d_downloader.py --slug 0025-pikachu

Requirements
------------
  pip install requests tqdm

Notes
-----
- API rate limit: 5 req/min (Casual) or 30 req/min (Commercial)
- Download cap: 100 distinct designs per rolling 24 hours (Casual)
  -> Activate the Backfill Window (Dashboard -> Tools -> API) to lift it for 72h
- The script will pause automatically if it hits the daily cap
- Files are saved as: ./{slug}/{profile_name}.3mf
- State is tracked in n3d_sync_state.json (safe to delete to reset)
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

try:
    import requests
except ImportError:
    print("Missing dependency: requests")
    print("Install it with:  pip install requests")
    sys.exit(1)

try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False

# Constants
BASE_URL   = "https://www.n3dmelbourne.com/api/v1"
STATE_FILE = "n3d_sync_state.json"
USER_AGENT = "N3D-Downloader/1.0 (personal backup script)"

# Profile types we skip (community profiles may live on MakerWorld, not N3D)
SKIP_PROFILE_TYPES = {"community"}

# Terminal colours
class C:
    RESET  = "\033[0m"
    BOLD   = "\033[1m"
    GREEN  = "\033[92m"
    YELLOW = "\033[93m"
    RED    = "\033[91m"
    CYAN   = "\033[96m"
    DIM    = "\033[2m"
    ORANGE = "\033[33m"

def cprint(color, msg):
    print(f"{color}{msg}{C.RESET}")

# ── State Management ──────────────────────────────────────────────────────────

def load_state():
    if Path(STATE_FILE).exists():
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            cprint(C.YELLOW, f"Could not read {STATE_FILE}, starting fresh.")
    return {"last_sync": None, "designs": {}}

def save_state(state):
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2, ensure_ascii=False)
    except IOError as e:
        cprint(C.RED, f"Could not save state: {e}")

# ── API Client ────────────────────────────────────────────────────────────────

class N3DClient:
    def __init__(self, api_key):
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
        })
        self._last_request_time = 0.0
        # Casual: 5 req/min => 1 per 12s (use 13s to be safe)
        # Commercial: 30 req/min => 1 per 2s (adjusted after /me)
        self._min_interval = 13.0

    def _wait(self):
        elapsed = time.time() - self._last_request_time
        if elapsed < self._min_interval:
            time.sleep(self._min_interval - elapsed)
        self._last_request_time = time.time()

    def _get(self, path, params=None, stream=False, skip_rate_limit=False):
        url = f"{BASE_URL}{path}"
        max_retries = 6
        for attempt in range(max_retries):
            if not skip_rate_limit:
                self._wait()
            try:
                resp = self.session.get(url, params=params, stream=stream, timeout=120)
            except requests.RequestException as e:
                if attempt < max_retries - 1:
                    wait = 2 ** attempt * 5
                    cprint(C.YELLOW, f"  Network error: {e}. Retrying in {wait}s...")
                    time.sleep(wait)
                    continue
                raise

            if resp.status_code == 429:
                retry_after = int(resp.headers.get("Retry-After", 60))
                try:
                    body = resp.json()
                    if body.get("code") == "download_cap_reached":
                        reset_at = body.get("reset_at", "unknown")
                        cprint(C.ORANGE,
                            f"\n  Daily download cap reached!\n"
                            f"  Resets at: {reset_at}\n"
                            f"  Tip: activate the Backfill Window at\n"
                            f"  Dashboard -> Tools -> API to get 72h with no cap.\n"
                            f"  Waiting {retry_after}s (press Ctrl+C to stop)."
                        )
                    else:
                        cprint(C.YELLOW, f"  Rate limited. Waiting {retry_after}s...")
                except Exception:
                    cprint(C.YELLOW, f"  Rate limited. Waiting {retry_after}s...")
                time.sleep(retry_after + 2)
                continue

            if resp.status_code >= 500:
                wait = 2 ** attempt * 10
                cprint(C.YELLOW, f"  Server error {resp.status_code}. Retrying in {wait}s...")
                time.sleep(wait)
                continue

            return resp

        raise RuntimeError(f"Failed after {max_retries} retries: {url}")

    def verify_key(self):
        resp = self._get("/me")
        resp.raise_for_status()
        return resp.json()

    def list_entitled_designs(self, limit=200):
        designs = []
        page = 1
        total_pages = None
        while True:
            params = {"entitled": "true", "include": "details", "limit": limit, "page": page}
            cprint(C.DIM, f"  Fetching page {page}{f'/{total_pages}' if total_pages else ''}...")
            resp = self._get("/designs", params=params)
            if resp.status_code != 200:
                cprint(C.RED, f"  Failed to list designs: {resp.status_code} {resp.text[:200]}")
                break
            data = resp.json()
            page_data  = data.get("data", [])
            pagination = data.get("pagination", {})
            total_pages = pagination.get("total_pages", 1)
            designs.extend(page_data)
            cprint(C.DIM, f"     {len(page_data)} designs on this page, {len(designs)} total so far")
            if not pagination.get("has_next"):
                break
            page += 1
        return designs

    def get_download_link(self, slug, profile_index):
        resp = self._get(f"/designs/{slug}/download", params={"profile": profile_index})
        if resp.status_code == 200:
            return {"ok": True, "data": resp.json()}
        elif resp.status_code == 403:
            body = resp.json()
            return {"ok": False, "reason": "not_entitled", "message": body.get("error", "")}
        elif resp.status_code == 404:
            body = resp.json()
            code = body.get("code", "")
            mw_url = body.get("maker_world_url")
            if code in ("hosted_on_makerworld", "file_unavailable"):
                return {"ok": False, "reason": "makerworld", "url": mw_url, "code": code}
            return {"ok": False, "reason": "not_found", "message": body.get("error", "")}
        else:
            return {"ok": False, "reason": "error", "message": f"HTTP {resp.status_code}: {resp.text[:100]}"}

    def download_file(self, download_url, dest_path):
        """Stream a one-time download URL to a local file.
        Returns True on success, False on failure.
        NOTE: The URL is single-use and expires. Do NOT retry with the same URL.
        Call this method only once per URL; re-request a fresh link for retries.
        """
        try:
            resp = self.session.get(download_url, stream=True, timeout=180)
            resp.raise_for_status()
            total = int(resp.headers.get("content-length", 0))
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            if HAS_TQDM and total > 0:
                with open(dest_path, "wb") as f:
                    with tqdm(total=total, unit="B", unit_scale=True,
                              desc=f"    {dest_path.name}", leave=False) as pbar:
                        for chunk in resp.iter_content(chunk_size=65536):
                            f.write(chunk)
                            pbar.update(len(chunk))
            else:
                with open(dest_path, "wb") as f:
                    for chunk in resp.iter_content(chunk_size=65536):
                        f.write(chunk)
            return True
        except Exception as e:
            cprint(C.RED, f"    Download stream error: {e}")
            if dest_path.exists():
                dest_path.unlink()   # remove partial file
            return False

# ── Helpers ───────────────────────────────────────────────────────────────────

def safe_filename(name):
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name)
    name = name.strip(". ")
    return name or "profile"

# ── Main ──────────────────────────────────────────────────────────────────────

def sync(api_key, dry_run=False, force=False, slug_filter=None):
    client = N3DClient(api_key)

    # Verify key
    cprint(C.BOLD, "\nVerifying API key...")
    try:
        me = client.verify_key()
    except Exception as e:
        cprint(C.RED, f"API key verification failed: {e}")
        sys.exit(1)

    display_name = me.get("display_name") or "Unknown"
    tier         = me.get("tier", "?")
    usage        = me.get("usage", {})
    dl_enabled   = me.get("key", {}).get("downloads_enabled", False)
    backfill_ends = usage.get("backfill_window_ends_at")
    downloads_today = usage.get("downloads_today", "?")
    dl_remaining    = usage.get("downloads_remaining_today", "?")

    cprint(C.GREEN, f"Connected as: {display_name}  ({tier} tier)")
    print(f"  Downloads enabled  : {dl_enabled}")
    print(f"  Downloads today    : {downloads_today}  |  remaining: {dl_remaining}")
    if backfill_ends:
        cprint(C.GREEN, f"  Backfill window active until {backfill_ends} (daily cap lifted!)")

    if not dl_enabled:
        cprint(C.RED,
            "\nDownloads are NOT enabled on this API key.\n"
            "Go to Dashboard -> Tools -> Design API and enable 'Allow file downloads'."
        )
        sys.exit(1)

    if tier == "commercial":
        client._min_interval = 2.5   # 30 req/min

    # Load state
    state = load_state()
    designs_state = state.setdefault("designs", {})

    # Fetch designs
    cprint(C.BOLD, "\nFetching entitled design list...")
    all_designs = client.list_entitled_designs()

    if slug_filter:
        all_designs = [d for d in all_designs if d["slug"] == slug_filter]
        if not all_designs:
            cprint(C.RED, f"No entitled design found with slug '{slug_filter}'")
            sys.exit(1)

    cprint(C.GREEN, f"\nFound {len(all_designs)} entitled design(s)")

    # Determine what needs downloading
    to_download = []
    already_ok  = 0

    for design in all_designs:
        slug       = design["slug"]
        title      = design["title"]
        updated_at = design.get("updated_at")
        profiles   = design.get("profiles", [])

        slug_dir = Path(slug)
        ds = designs_state.setdefault(slug, {
            "title": title, "updated_at": None, "profiles": {}
        })

        design_updated = (updated_at != ds.get("updated_at"))

        for idx, profile in enumerate(profiles):
            pname = profile["name"]
            ptype = profile.get("type", "")
            fname = safe_filename(pname) + ".3mf"
            dest  = slug_dir / fname

            # Always skip community profiles
            if ptype in SKIP_PROFILE_TYPES:
                ds["profiles"][pname] = "skipped_community"
                continue

            pstate = ds["profiles"].get(pname)

            if force:
                should_dl = True
            elif pstate == "downloaded" and dest.exists():
                if design_updated:
                    cprint(C.CYAN, f"  Design updated: {title} -> {pname} will be re-downloaded")
                    should_dl = True
                else:
                    already_ok += 1
                    should_dl = False
            else:
                should_dl = True

            if should_dl:
                to_download.append((design, idx, profile, dest))

    # Print summary
    print(f"\n{'─' * 60}")
    cprint(C.BOLD, f"  To download  : {len(to_download)} profile file(s)")
    cprint(C.DIM,  f"  Already done : {already_ok} profile file(s)")
    print(f"{'─' * 60}\n")

    if not to_download:
        cprint(C.GREEN, "Everything is up to date! Nothing to download.")
        state["last_sync"] = datetime.now(timezone.utc).isoformat()
        save_state(state)
        return

    if dry_run:
        cprint(C.YELLOW, "DRY RUN – what would be downloaded:\n")
        for design, idx, profile, dest in to_download:
            print(f"  [{design['slug']}]  {profile['name']}  ->  {dest}")
        print()
        cprint(C.YELLOW, f"Would download {len(to_download)} file(s). Run without --dry-run to proceed.")
        return

    # Download loop
    downloaded = 0
    failed     = 0
    skipped    = 0
    MAX_DL_RETRIES = 3

    for i, (design, idx, profile, dest) in enumerate(to_download, 1):
        slug  = design["slug"]
        title = design["title"]
        pname = profile["name"]
        ds    = designs_state[slug]

        print(f"[{i}/{len(to_download)}] {C.BOLD}{title}{C.RESET}  |  {pname}")

        # --- Get initial download link (with possible skip reasons) ---
        result = client.get_download_link(slug, idx)

        if not result["ok"]:
            reason = result["reason"]
            if reason == "makerworld":
                mw_url = result.get("url", "")
                code   = result.get("code", "")
                msg = "MakerWorld only"
                if mw_url:
                    msg += f": {mw_url}"
                cprint(C.DIM, f"  -> Skipped ({code}): {msg}")
                ds["profiles"][pname] = f"makerworld:{mw_url}"
                skipped += 1
            elif reason == "not_entitled":
                cprint(C.YELLOW, f"  -> Not entitled: {result.get('message', '')}")
                ds["profiles"][pname] = "not_entitled"
                skipped += 1
            else:
                cprint(C.RED, f"  -> Error ({reason}): {result.get('message', '')}")
                failed += 1
            save_state(state)
            continue

        # --- Download with retry (fresh one-time link each attempt) ---
        ok = False
        for attempt in range(1, MAX_DL_RETRIES + 1):
            if attempt > 1:
                # One-time links can't be reused; request a fresh one
                wait_s = attempt * 5
                cprint(C.YELLOW, f"  -> Retry {attempt}/{MAX_DL_RETRIES}: waiting {wait_s}s then requesting fresh link...")
                time.sleep(wait_s)
                result = client.get_download_link(slug, idx)
                if not result["ok"]:
                    cprint(C.RED, f"  -> Could not get fresh link: {result.get('message', result.get('reason', ''))}")
                    break

            download_url = result["data"]["download_url"]
            expires_in   = result["data"].get("expires_in", 300)
            attempt_label = f" (attempt {attempt}/{MAX_DL_RETRIES})" if attempt > 1 else ""
            cprint(C.DIM, f"  -> Link obtained (expires in {expires_in}s), downloading...{attempt_label}")

            ok = client.download_file(download_url, dest)
            if ok:
                break
            # else: loop will retry with a fresh link

        if ok:
            size_kb = dest.stat().st_size // 1024
            cprint(C.GREEN, f"  -> Saved: {dest}  ({size_kb} KB)")
            ds["profiles"][pname] = "downloaded"
            ds["updated_at"] = design.get("updated_at")
            ds["title"] = title
            downloaded += 1
        else:
            cprint(C.RED, f"  -> Failed after {MAX_DL_RETRIES} attempt(s). Will retry on next run.")
            failed += 1

        save_state(state)

    # Final state
    state["last_sync"] = datetime.now(timezone.utc).isoformat()
    save_state(state)

    print(f"\n{'─' * 60}")
    cprint(C.BOLD, "  Download session complete!")
    cprint(C.GREEN,  f"  Downloaded : {downloaded}")
    cprint(C.YELLOW, f"  Skipped    : {skipped}  (MakerWorld / not entitled)")
    if failed:
        cprint(C.RED, f"  Failed     : {failed}")
    print(f"{'─' * 60}\n")


def main():
    parser = argparse.ArgumentParser(
        description="Download all entitled N3D Melbourne pokeball design profiles.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--api-key", "-k",
        default=os.environ.get("N3D_API_KEY", ""),
        help="Your N3D API key (or set N3D_API_KEY env var). "
             "Get it from: Dashboard -> Tools -> Design API."
    )
    parser.add_argument(
        "--dry-run", "-n",
        action="store_true",
        help="Show what would be downloaded without downloading anything."
    )
    parser.add_argument(
        "--force", "-f",
        action="store_true",
        help="Re-download all profiles even if they already exist on disk."
    )
    parser.add_argument(
        "--slug", "-s",
        default=None,
        metavar="SLUG",
        help="Only download a specific design slug (e.g. 0025-pikachu)."
    )
    args = parser.parse_args()

    if not args.api_key:
        cprint(C.RED,
            "No API key provided.\n"
            "Set the N3D_API_KEY environment variable or use --api-key.\n"
            "Get your key at: https://www.n3dmelbourne.com/dashboard  -> Tools -> Design API\n"
            "(Enable 'Allow file downloads' when creating the key!)"
        )
        sys.exit(1)

    print(f"\n{'=' * 60}")
    print("  N3D Melbourne - Design Downloader")
    print(f"{'=' * 60}")
    print(f"  Working dir : {Path.cwd()}")
    print(f"  State file  : {STATE_FILE}")
    if args.dry_run:
        cprint(C.YELLOW, "  Mode        : DRY RUN (no files will be written)")
    elif args.force:
        cprint(C.ORANGE, "  Mode        : FORCE (re-download everything)")
    else:
        cprint(C.GREEN, "  Mode        : SMART SYNC (skip already-downloaded files)")
    if args.slug:
        cprint(C.CYAN, f"  Filter slug : {args.slug}")
    print()

    sync(
        api_key     = args.api_key,
        dry_run     = args.dry_run,
        force       = args.force,
        slug_filter = args.slug,
    )

if __name__ == "__main__":
    main()
