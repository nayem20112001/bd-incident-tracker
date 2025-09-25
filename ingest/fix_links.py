# ingest/fix_links.py
import os
import sys
import urllib.parse as up
from supabase import create_client

DRY = "--dry" in sys.argv

def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        print("[fix_links] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in env")
        sys.exit(1)
    return create_client(url, key)

def unwrap(link: str) -> str:
    if not link or "news.google." not in link:
        return link
    parsed = up.urlparse(link)
    qs = up.parse_qs(parsed.query)
    if "url" in qs and qs["url"]:
        return qs["url"][0]
    # fallback: leave as is
    return link

def main():
    supabase = get_supabase()

    # grab the bad rows
    resp = supabase.table("incidents")\
        .select("id, link")\
        .ilike("link", "%news.google.com%")\
        .limit(1000)\
        .execute()

    rows = resp.data or []
    if not rows:
        print("[fix_links] nothing to fix")
        return

    changed = 0
    for r in rows:
        new = unwrap(r["link"])
        if new and new != r["link"]:
            changed += 1
            if DRY:
                print(f"[DRY] would update {r['id']} -> {new}")
            else:
                supabase.table("incidents").update({"link": new}).eq("id", r["id"]).execute()
                print(f"[fix] updated {r['id']}")

    print(f"[fix_links] done; changed={changed}, total={len(rows)}")

if __name__ == "__main__":
    main()
