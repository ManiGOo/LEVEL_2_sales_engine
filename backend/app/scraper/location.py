"""Location helpers for CDSCO regulatory data.

The raw CDSCO ``manufacturer`` string embeds the plant address after the trading
name, e.g. ``"Hanuchem Laboratories, Plot No 13, Sector-5, Industrial Area,
Parwanoo, Distt. Solan (H.P)"``. This module derives a human-readable
``location`` (the address tail) and the Indian ``state`` / Union Territory it
falls in, so the sales-app can filter companies by geography.
"""
import re

from app.scraper.names import ADDRESS_MARKERS, PAREN

_PAREN = re.compile(r"\([^)]*\)")
_PINCODE_RE = re.compile(r"\b(\d{6})\b")


def _norm_text(raw: str) -> str:
    if not raw:
        return ""
    return re.sub(r"\s+", " ", raw.replace("\n", ", ")).strip(" ,;:.-")


def extract_location(mfr_raw: str, company_name: str = "") -> str:
    """Best-effort location from the raw CDSCO manufacturer string.

    Cut everything before the address (after the cleaned company name when it
    can be anchored, otherwise at the first address marker).
    """
    raw = _norm_text(mfr_raw)
    if not raw:
        return ""

    name = _norm_text(company_name)
    if name:
        m = re.search(re.escape(name), raw, re.IGNORECASE)
        if m:
            tail = raw[m.end():].lstrip(" ,;:.-")
            if tail:
                return re.sub(r"\s+", " ", tail).strip(" ,;:.-")

    m = ADDRESS_MARKERS.search(raw)
    if m:
        tail = raw[m.start():].strip(" ,;:.-")
        if tail:
            return re.sub(r"\s+", " ", tail).strip(" ,;:.-")
    return ""


# ---------------------------------------------------------------------------
# State / Union Territory detection
# ---------------------------------------------------------------------------
# Canonical Indian states & Union Territories mapped to the aliases they appear
# under in CDSCO manufacturer strings (full names, abbreviations, paren forms).
# Matching is done on dot-free, lower-cased text so "H.P.", "H.P" and "HP" all
# resolve to "Himachal Pradesh".
_STATE_ALIASES: dict[str, list[str]] = {
    "Andhra Pradesh": ["andhra pradesh", "andhra", "a p", "ap"],
    "Arunachal Pradesh": ["arunachal pradesh", "arunachal"],
    "Assam": ["assam"],
    "Bihar": ["bihar"],
    "Chhattisgarh": ["chhattisgarh", "c g", "cg"],
    "Goa": ["goa"],
    "Gujarat": ["gujarat", "g j", "gj", "guj"],
    "Haryana": ["haryana", "h r", "hr"],
    "Himachal Pradesh": ["himachal pradesh", "h p", "hp"],
    "Jharkhand": ["jharkhand", "j harkhand"],
    "Karnataka": ["karnataka", "karnatak", "k taka", "ktaka", "k a", "ka"],
    "Kerala": ["kerala", "k l", "kl", "keral"],
    "Madhya Pradesh": ["madhya pradesh", "m p", "mp"],
    "Maharashtra": ["maharashtra", "mah", "m h", "mh", "maharastra"],
    "Manipur": ["manipur"],
    "Meghalaya": ["meghalaya", "meg"],
    "Mizoram": ["mizoram"],
    "Nagaland": ["nagaland", "nagalnd"],
    "Odisha": ["odisha", "orissa", "o d", "od"],
    "Punjab": ["punjab", "p b", "pb"],
    "Rajasthan": ["rajasthan", "raj", "r j", "rj"],
    "Sikkim": ["sikkim"],
    "Tamil Nadu": ["tamil nadu", "tamilnadu", "tamil", "t n", "tn"],
    "Telangana": ["telangana", "t g", "tg", "t s", "ts"],
    "Tripura": ["tripura"],
    "Uttar Pradesh": ["uttar pradesh", "u p", "up"],
    "Uttarakhand": ["uttarakhand", "uttaranchal", "uttarkhand", "u k", "uk"],
    "West Bengal": ["west bengal", "w b", "wb", "bengal"],
    "Andaman and Nicobar Islands": ["andaman", "nicobar", "andaman and nicobar"],
    "Chandigarh": ["chandigarh"],
    "Dadra and Nagar Haveli": ["dadra", "nagar haveli", "dadra and nagar haveli", "dnh"],
    "Daman and Diu": ["daman", "diu", "daman and diu"],
    "Delhi": ["delhi", "nct", "new delhi", "nct of delhi"],
    "Jammu and Kashmir": ["jammu", "kashmir", "j&k", "j k", "jk", "jammu and kashmir"],
    "Ladakh": ["ladakh"],
    "Lakshadweep": ["lakshadweep", "laccadive"],
    "Puducherry": ["puducherry", "pondicherry", "puducherry", "py"],
}

# Longest alias first so "andhra pradesh" wins over "andhra", "new delhi" over
# "delhi", etc.
_STATE_PATTERNS = sorted(
    ((canon, alias) for canon, aliases in _STATE_ALIASES.items() for alias in aliases),
    key=lambda x: len(x[1]),
    reverse=True,
)

# Map pypinindia's (often UPPERCASE / legacy) state names onto our canonical
# set so the dropdown stays consistent with name-based detection.
_CANON_BY_LOWER = {c.lower(): c for c in _STATE_ALIASES}
_PYPIN_SPECIAL = {
    "dadra and nagar haveli and daman and diu": "Daman and Diu",
    "dadra and nagar haveli": "Dadra and Nagar Haveli",
    "pondicherry": "Puducherry",
    "orissa": "Odisha",
    "andaman and nicobar islands": "Andaman and Nicobar Islands",
    "andaman and nicobar": "Andaman and Nicobar Islands",
}

_PINCODE_CACHE: dict[str, str] = {}


def _canon_from_pypin(raw: str) -> str:
    """Normalise a state name returned by pypinindia to our canonical form."""
    if not raw:
        return ""
    s = raw.strip()
    low = s.lower()
    if low in _PYPIN_SPECIAL:
        return _PYPIN_SPECIAL[low]
    if low in _CANON_BY_LOWER:
        return _CANON_BY_LOWER[low]
    # Unknown -> title-cased so it is still filterable.
    return s.title()


def _lookup_pincode_state(code: str) -> str:
    """Resolve a 6-digit pincode to a canonical state via pypinindia."""
    if code in _PINCODE_CACHE:
        return _PINCODE_CACHE[code]
    result = ""
    try:
        # Imported lazily: pulls in pandas only when a pincode actually appears.
        from pypinindia import get_state as _pypin_get_state
        result = _canon_from_pypin(_pypin_get_state(code))
    except Exception:
        result = ""
    _PINCODE_CACHE[code] = result
    return result


def extract_state(location: str, mfr_raw: str = "") -> str:
    """Return the canonical Indian state / Union Territory for an address.

    Tries the address text first (handles abbreviations and common
    misspellings like "Uttarkhand"), then falls back to resolving any embedded
    6-digit pincode against the India Post dataset (via ``pypinindia``).
    Returns ``""`` when no state can be detected.
    """
    text = _norm_text(location) or _norm_text(mfr_raw)
    if text:
        # Drop dots so "H.P." == "HP"; collapse whitespace.
        norm = re.sub(r"\s+", " ", text.lower().replace(".", " ")).strip()
        for canon, alias in _STATE_PATTERNS:
            # Use word-ish boundaries; aliases with spaces or & are matched as-is.
            if re.search(rf"(?<![a-z]){re.escape(alias)}(?![a-z])", norm):
                return canon
    # Fallback: a pincode embedded in the address (e.g. "Paonta Sahib-173025").
    m = _PINCODE_RE.search(f"{location} {mfr_raw}")
    if m:
        return _lookup_pincode_state(m.group(1))
    return ""
