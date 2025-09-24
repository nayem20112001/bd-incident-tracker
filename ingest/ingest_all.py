# ingest/ingest_all.py
import json
import os
import sys
import time
from pathlib import Path
from typing import List, Dict

from .ingest_one import (
    get_supabase,
    discover_columns,
    load_recent,
    fetch_rss_items,
    make_row_from_item,
    upsert_incident,
)

DEFAULT_LIMIT_PER_FEED = 10  # safety cap

def load_sources(path: str | Path) -> List[Dict[str, str]]:
    p = Path(path)
    if not p.exists():
        raise SystemExit(f"[ingest_all] sources file not found: {p}")
    return json.loads(p.read_text(encoding="utf-8"))

def main():
    dry = ("--dry" in sys.argv)
    limit = DEFAULT_LIMIT_PER_FEED

    supabase = get_supabase()
    known_cols = discover_columns(supabase)
    recent = load_recent(supabase, days=7)

    sources = load_sources(Path(__file__).parent / "sources.json")
    print(f"[ingest_all] Found {len(sources)} sources. Dry={dry}. Limit per feed={limit}")

    for s in sources:
        name = s.get("name") or "source"
        url = s.get("url")
        if not url:
            print(f"[ingest_all] Skipping {name}: missing url")
            continue

        print(f"[ingest_all] --> {name}: {url}")
        try:
            items = fetch_rss_items(url)
        except Exception as e:
            print(f"[ingest_all] ERROR fetching {name}: {e}")
            continue

        if not items:
            print(f"[ingest_all] No items parsed for {name}")
            continue

        count = 0
        for it in items:
            if count >= limit:
                break
            try:
                row = make_row_from_item(it)
                upsert_incident(supabase, row, recent, known_cols, dry=dry)
                count += 1
                # tiny pause to be polite to free tiers
                time.sleep(0.2)
            except Exception as e:
                print(f"[ingest_all] ERROR processing item for {name}: {e}")

        print(f"[ingest_all] <-- {name}: processed {count} items\n")

    print("[ingest_all] DONE")

if __name__ == "__main__":
    main()
