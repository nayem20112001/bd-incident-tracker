# ingest/normalize.py
import re
from datetime import datetime, timedelta
from dateutil import parser as dp
import pytz

# Use Bangladesh timezone for relative/naive dates
BD_TZ = pytz.timezone("Asia/Dhaka")

# Bangla → English digits
_BN_TO_EN_DIGITS = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")

def bn2en_digits(s: str) -> str:
    """Convert Bangla digits inside a string to English digits."""
    if not s:
        return s
    return s.translate(_BN_TO_EN_DIGITS)

# Minimal keyword mapping for categories (extend later)
_CATEGORY_KEYWORDS = {
    "road_accident": [
        "সড়ক দুর্ঘটনা","সড়ক দুর্ঘটনা","বাস দুর্ঘটনা","মাইক্রোবাস","ট্রাক","মোটরসাইকেল",
        "হাইওয়ে","নিহত","আহত","ধাক্কা","সংঘর্ষ",
        "road accident","bus crash","truck crash","collision","highway","overturned","hit-and-run"
    ],
    "fire": [
        "অগ্নিকাণ্ড","আগুন","পুড়ে","পুড়ে গেছে","দাহ","ফায়ার সার্ভিস",
        "fire","blaze","inferno","burnt","factory fire"
    ],
    "crime": [
        "খুন","গুলি","ছুরিকাঘাত","ডাকাতি","ছিনতাই","গুম","সন্ত্রাস","ধর্ষণ মামলায়",
        "murder","homicide","shooting","stabbing","robbery","kidnap","abduction","extortion"
    ],
    "rape": [
        "ধর্ষণ","ধর্ষিতা","ধর্ষণের","শ্লীলতাহানি",
        "rape","sexual assault","molest","gang rape"
    ],
    "murder": [
        "খুন","হত্যা","গলা কাটা","লাশ উদ্ধার",
        "murder","homicide","body recovered"
    ],
    "flood": [
        "বন্যা","জলাবদ্ধতা","পানিবন্দী","জোয়ার","char","ভেসে গেছে",
        "flood","inundation","flash flood"
    ],
    "other": []
}


def map_category(text: str) -> str:
    """Return a coarse category based on BN/EN keywords in the text."""
    if not text:
        return "other"
    t = text.lower()
    for cat, kws in _CATEGORY_KEYWORDS.items():
        for kw in kws:
            if kw.lower() in t:
                return cat
    return "other"

# Simple relative phrases
_RELATIVE_PATTERNS = [
    (r"\bগতকাল\b|\byesterday\b", lambda now: now - timedelta(days=1)),
    (r"\bআজ\b|\btoday\b",        lambda now: now),
    (r"\blast night\b|\bগত রাত\b|\bগতরাত\b", lambda now: (now - timedelta(days=1)).replace(hour=22, minute=0, second=0)),
]

def parse_event_date(s: str, now: datetime | None = None) -> datetime | None:
    """
    Try absolute parse first; then relative BN/EN; return timezone-aware Asia/Dhaka datetime.
    Accepts strings with Bangla digits.
    """
    if not s:
        return None
    if now is None:
        now = datetime.now(BD_TZ)

    s_norm = bn2en_digits(s)

    # 1) Absolute date parse
    try:
        dt = dp.parse(s_norm, dayfirst=True, fuzzy=True)
        if dt.tzinfo is None:
            dt = BD_TZ.localize(dt)
        else:
            dt = dt.astimezone(BD_TZ)
        return dt
    except Exception:
        pass

    # 2) Relative phrases
    for pat, fn in _RELATIVE_PATTERNS:
        if re.search(pat, s_norm, flags=re.I):
            dt = fn(now)
            if dt.tzinfo is None:
                dt = BD_TZ.localize(dt)
            return dt

    return None

def normalize_title(s: str) -> str:
    """Lowercase, collapse spaces, convert digits."""
    if not s:
        return ""
    s = bn2en_digits(s)
    s = re.sub(r"\s+", " ", s).strip().lower()
    return s
