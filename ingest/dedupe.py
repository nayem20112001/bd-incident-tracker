# ingest/dedupe.py
from datetime import timedelta
from rapidfuzz import fuzz
from .normalize import normalize_title

def build_block_key(category: str | None, district: str | None, event_date):
    """
    Block key = (category_lower, district_lower, event_date_date_or_None)
    Use this to narrow comparisons in memory (if you pre-group).
    """
    c = (category or "").strip().lower()
    d = (district or "").strip().lower()
    day = event_date.date() if getattr(event_date, "date", None) else None
    return (c, d, day)

def _score_title(a: str, b: str) -> int:
    """
    Token-set ratio is decent for titles with shuffled words.
    Returns 0..100
    """
    return fuzz.token_set_ratio(normalize_title(a), normalize_title(b))

def candidate_matches(new_row: dict, existing_rows: list[dict], threshold: int = 60) -> dict | None:
    """
    Return the best matching existing row or None.
    Conditions:
      - same category (if provided)
      - same district (if both provided)
      - event_date within ±1 day (if both provided)
    Score:
      - base = title token_set_ratio
      - +5 if same district
      - +5 if same calendar day
    Accept if best_score >= threshold.
    """
    new_title = new_row.get("title") or ""
    new_cat   = (new_row.get("category") or "").lower()
    new_dist  = (new_row.get("district") or "").lower()
    new_date  = new_row.get("event_date")  # datetime or None

    best = None
    best_score = -1

    for r in existing_rows:
        # category gate (if new has a category)
        if new_cat:
            r_cat = (r.get("category") or "").lower()
            if r_cat != new_cat:
                continue

        # district gate (only if both have one)
        r_dist = (r.get("district") or "").lower()
        if new_dist and r_dist and new_dist != r_dist:
            continue

        # date gate (±1 day) only if both have date
        r_date = r.get("event_date")
        date_ok = True
        if new_date is not None and r_date is not None:
            try:
                delta_days = abs((new_date.date() - r_date.date()).days)
            except Exception:
                delta_days = 999
            date_ok = delta_days <= 1
        if not date_ok:
            continue

        # title similarity
        base = _score_title(new_title, r.get("title") or "")
        if new_dist and r_dist and new_dist == r_dist:
            base += 5
        if new_date is not None and r_date is not None:
            try:
                if new_date.date() == r_date.date():
                    base += 5
            except Exception:
                pass

        if base > best_score:
            best_score = base
            best = r

    if best is not None and best_score >= threshold:
        return best
    return None
