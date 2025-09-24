# ingest/ingest_one.py
import os
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

import httpx
from bs4 import BeautifulSoup
from supabase import create_client

from .normalize import bn2en_digits, map_category, parse_event_date, normalize_title
from .dedupe import candidate_matches
from .truth_vote import vote_numbers

TABLE = "incidents"

def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")  # SERVICE ROLE KEY ONLY
    if not url or not key:
        raise SystemExit("[ingest_one] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in env")
    return create_client(url, key)

def fetch_rss_items(feed_url: str, timeout: int = 25) -> List[Dict[str, str]]:
    """Fetch and parse a basic RSS/Atom feed into items {title, link, published, summary}."""
    r = httpx.get(feed_url, timeout=timeout, follow_redirects=True)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "xml")
    items = soup.find_all(["item", "entry"])
    out = []
    for it in items:
        title = (it.title.text if it.title else "").strip()
        # <link> sometimes has href attribute (Atom), sometimes inner text (RSS)
        link = ""
        if it.link:
            link = (it.link.text or it.link.get("href") or "").strip()
        pubdate = ""
        for tag in ("pubDate", "updated", "published"):
            node = it.find(tag)
            if node and node.text:
                pubdate = node.text.strip()
                break
        summary = ""
        for tag in ("description", "summary", "content"):
            node = it.find(tag)
            if node and node.text:
                summary = node.text.strip()
                break
        out.append({"title": title, "link": link, "published": pubdate, "summary": summary})
    return out

def discover_columns(supabase) -> List[str]:
    """Peek one row to figure out actual column names."""
    peek = supabase.table(TABLE).select("*").limit(1).execute()
    if getattr(peek, "error", None):
        raise SystemExit(f"[ingest_one] Supabase error: {peek.error.message}")
    return list(peek.data[0].keys()) if peek.data else []

def load_recent(supabase, days: int = 7) -> List[Dict[str, Any]]:
    """Pull recent incidents to dedupe against."""
    since = (datetime.utcnow() - timedelta(days=days)).date().isoformat()
    # Ask for a common subset; if schema differs, fall back to *
    try:
        resp = supabase.table(TABLE).select("id,title,category,event_date,district").gte("event_date", since).limit(2000).execute()
        data = resp.data or []
    except Exception:
        resp = supabase.table(TABLE).select("*").gte("event_date", since).limit(2000).execute()
        data = resp.data or []
    rows = []
    for r in data:
        dt = r.get("event_date")
        try:
            r["event_date"] = datetime.fromisoformat(str(dt)) if dt else None
        except Exception:
            r["event_date"] = None
        rows.append(r)
    return rows

def extract_numbers(text: str) -> List[int]:
    """Naive number extractor; good enough as a starter."""
    if not text:
        return []
    import re
    t = bn2en_digits(text)
    return [int(x) for x in re.findall(r"\b\d{1,3}\b", t)]

def make_row_from_item(item: Dict[str, str]) -> Dict[str, Any]:
    """Normalize one RSS item into an incident-like dict."""
    title = (item.get("title") or "").strip()
    summary = (item.get("summary") or "").strip()
    published = item.get("published") or ""

    # category guess from title+summary
    category = map_category(f"{title} {summary}")

    # event date from published first, then summary text
    event_dt = parse_event_date(published) or parse_event_date(summary)

    # crude numbers for deaths/injuries from text
    nums = extract_numbers(f"{title} {summary}")
    reported_dead, _ = vote_numbers(nums[:3])
    reported_injured, _ = vote_numbers(nums[3:6])

    return {
        "title": title,
        "category": category,
        "event_date": event_dt.isoformat()[:10] if event_dt else None,
        # keep schema-flex; these keys are common but optional in your DB
        "district": None,
        "location": None,
        "reported_dead": reported_dead,
        "reported_injured": reported_injured,
        "source_count": 1,
        "link": item.get("link") or "",
    }

def filter_known_columns(payload: Dict[str, Any], columns: List[str]) -> Dict[str, Any]:
    return {k: v for k, v in payload.items() if k in columns}

def upsert_incident(supabase, row: Dict[str, Any], recent: List[Dict[str, Any]], known_cols: List[str], dry: bool = False) -> Dict[str, Any]:
    """Deduplicate against recent; insert if new."""
    # Build candidate for matching
    new_candidate = {
        "title": row.get("title"),
        "category": row.get("category"),
        "district": row.get("district"),
        "event_date": datetime.fromisoformat(row["event_date"]) if row.get("event_date") else None,
    }
    match = candidate_matches(new_candidate, recent, threshold=60)
    if match:
        print(f"[ingest_one] deduped -> id={match.get('id')} title={(match.get('title') or '')[:70]!r}")
        return {"status": "deduped", "id": match.get("id")}

    safe = filter_known_columns(row, known_cols)
    if dry:
        print("[ingest_one] DRY RUN insert:", safe)
        return {"status": "dryrun"}

    ins = supabase.table(TABLE).insert(safe).execute()
    if getattr(ins, "error", None):
        raise SystemExit(f"[ingest_one] insert error: {ins.error.message}")
    new_id = (ins.data or [{}])[0].get("id")
    print(f"[ingest_one] inserted -> id={new_id} title={(row.get('title') or '')[:70]!r}")
    return {"status": "inserted", "id": new_id}

def main():
    if len(sys.argv) < 2:
        print("Usage: python -m ingest.ingest_one <RSS_URL> [--dry]")
        sys.exit(1)
    feed_url = sys.argv[1]
    dry = ("--dry" in sys.argv)

    supabase = get_supabase()
    known_cols = discover_columns(supabase)
    recent = load_recent(supabase)

    items = fetch_rss_items(feed_url)
    if not items:
        print("[ingest_one] No items parsed from feed.")
        return

    # Take the first 10 for safety on first run
    for it in items[:10]:
        row = make_row_from_item(it)
        upsert_incident(supabase, row, recent, known_cols, dry)

if __name__ == "__main__":
    main()
