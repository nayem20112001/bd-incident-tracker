# ingest/truth_vote.py
from collections import Counter
from typing import List, Tuple, Optional, Any

def _to_int(x: Any) -> Optional[int]:
    try:
        if x is None:
            return None
        # accept strings like "03", "3", "৩" already converted upstream
        return int(str(x).strip())
    except Exception:
        return None

def vote_numbers(values: List[Any]) -> Tuple[int, int]:
    """
    Majority vote on a list of numeric-ish values.
    - Ignores non-numeric inputs.
    - Tie -> choose the HIGHER number (safer for public reporting).
    Returns: (winner_value, confidence_percent 0..100)
    """
    nums = [_to_int(v) for v in values]
    nums = [n for n in nums if n is not None]
    if not nums:
        return (0, 0)

    cnt = Counter(nums)
    # sort by frequency desc, then value desc (so ties prefer higher)
    winner, freq = max(cnt.items(), key=lambda kv: (kv[1], kv[0]))
    confidence = int(round(100 * freq / len(nums)))
    return (winner, confidence)
