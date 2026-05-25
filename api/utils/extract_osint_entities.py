import re


ACCOUNT_PATTERN = re.compile(r"(?<!\d)(\d{8,20})(?!\d)")
PHONE_PATTERN = re.compile(r"(?<!\d)(?:\+62|62|0)8[1-9][0-9]{6,12}(?!\d)", re.I)

BANK_KEYWORDS = [
    "bca",
    "bri",
    "bni",
    "mandiri",
    "cimb",
    "permata",
    "danamon",
    "seabank",
    "jago",
    "blu",
    "bsi",
    "btn",
    "ocbc",
    "maybank",
    "muamalat",
    "dana",
    "ovo",
    "gopay",
    "shopeepay",
]

RISK_KEYWORDS = [
    "penipu",
    "tipu",
    "ditipu",
    "ketipu",
    "kena tipu",
    "scam",
    "hati hati",
    "hati2",
    "awas",
    "rekening penipu",
    "transaksi segitiga",
    "rekber palsu",
    "seller palsu",
    "barang tidak dikirim",
]

NAME_HINTS = [
    "atas nama",
    "a/n",
    "an.",
    "nama rekening",
    "pemilik rekening",
]


def normalize_account_number(value):
    return re.sub(r"\D", "", value or "")


def get_context(text, start, end, radius=160):
    left = max(0, start - radius)
    right = min(len(text), end + radius)
    return " ".join(text[left:right].split())


def detect_bank(context):
    lowered = context.lower()
    for bank in BANK_KEYWORDS:
        if bank in lowered:
            return bank.upper()
    return None


def detect_name(context):
    lowered = context.lower()

    for hint in NAME_HINTS:
        index = lowered.find(hint)
        if index == -1:
            continue

        after = context[index + len(hint) : index + len(hint) + 80]
        candidate = re.sub(r"[^A-Za-z.' ]", " ", after)
        candidate = " ".join(candidate.split())

        if len(candidate) >= 3:
            return candidate[:60]

    return None


def score_candidate(context, bank_name, holder_name):
    lowered = context.lower()
    risk_hits = [keyword for keyword in RISK_KEYWORDS if keyword in lowered]

    score = 20
    score += min(40, len(risk_hits) * 12)

    if bank_name:
        score += 20

    if holder_name:
        score += 10

    if any(word in lowered for word in ["bukti", "ss", "screenshot", "transfer"]):
        score += 10

    return min(score, 100), risk_hits


def extract_osint_entities(text):
    compact_text = " ".join((text or "").split())
    results = []
    seen_accounts = set()

    for match in ACCOUNT_PATTERN.finditer(compact_text):
        raw_number = match.group(1)
        normalized = normalize_account_number(raw_number)
        if normalized in seen_accounts:
            continue

        context = get_context(compact_text, match.start(), match.end())
        bank_name = detect_bank(context)
        holder_name = detect_name(context)
        confidence, risk_hits = score_candidate(context, bank_name, holder_name)

        if confidence < 40:
            continue

        seen_accounts.add(normalized)
        results.append(
            {
                "account_number": raw_number,
                "normalized_account_number": normalized,
                "bank_name": bank_name,
                "account_holder": holder_name,
                "context": context,
                "risk_keywords": risk_hits,
                "confidence_score": confidence,
            }
        )

    phones = sorted(set(PHONE_PATTERN.findall(compact_text)))

    return {
        "accounts": results[:20],
        "phones": phones[:10],
    }
