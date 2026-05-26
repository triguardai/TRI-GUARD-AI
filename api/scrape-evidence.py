from datetime import datetime, timezone
from html import unescape
from http.server import BaseHTTPRequestHandler
import ipaddress
import json
import os
import re
import socket
import sys
from urllib.error import URLError
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen

sys.path.append(os.path.join(os.path.dirname(__file__), "utils"))
from extract_osint_entities import extract_osint_entities

MAX_HTML_BYTES = 2_000_000
MAX_TEXT_CHARS = 12_000
ACCOUNT_PATTERN = re.compile(r"\b\d{8,20}\b")
SCRIPT_STYLE_PATTERN = re.compile(r"<(script|style)[^>]*>.*?</\1>", re.I | re.S)
TAG_PATTERN = re.compile(r"<[^>]+>")


def send_json(handler, status, payload):
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def is_blocked_ip(raw_ip):
    ip = ipaddress.ip_address(raw_ip)
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


def validate_public_url(raw_url):
    parsed = urlparse((raw_url or "").strip())
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("URL harus memakai http atau https.")

    host = parsed.hostname
    if not host:
        raise ValueError("Host URL tidak valid.")

    if host.lower() in {"localhost", "0.0.0.0"}:
        raise ValueError("URL lokal tidak boleh discrape.")

    for info in socket.getaddrinfo(host, None):
        ip = info[4][0]
        if is_blocked_ip(ip):
            raise ValueError("URL internal atau private network tidak boleh discrape.")

    return parsed.geturl()


def clean_text(value):
    return re.sub(r"\s+", " ", unescape(value or "")).strip()


def first_value(*values):
    for value in values:
        cleaned = clean_text(value)
        if cleaned:
            return cleaned
    return ""


def extract_meta_from_html(html, selectors):
    for selector in selectors:
        pattern = re.compile(
            rf'<meta\s+[^>]*(?:name|property)=["\']{re.escape(selector)}["\'][^>]*content=["\']([^"\']+)["\']',
            re.I,
        )
        match = pattern.search(html)
        if match:
            return clean_text(match.group(1))

        reversed_pattern = re.compile(
            rf'<meta\s+[^>]*content=["\']([^"\']+)["\'][^>]*(?:name|property)=["\']{re.escape(selector)}["\']',
            re.I,
        )
        match = reversed_pattern.search(html)
        if match:
            return clean_text(match.group(1))

    return ""


def text_from_html(html):
    without_scripts = SCRIPT_STYLE_PATTERN.sub(" ", html)
    return clean_text(TAG_PATTERN.sub(" ", without_scripts))


def scrape_with_urllib(url):
    request = Request(
        url,
        headers={
            "User-Agent": "TriGuardAI-ReportBot/0.1 (+https://tri-guard-ai.vercel.app/)",
            "Accept": "text/html,application/xhtml+xml",
        },
    )

    with urlopen(request, timeout=12) as response:
        html = response.read(MAX_HTML_BYTES).decode("utf-8", errors="ignore")

    title_match = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
    title = clean_text(title_match.group(1)) if title_match else ""
    description = extract_meta_from_html(html, ["og:description", "description"])
    image = extract_meta_from_html(html, ["og:image", "twitter:image"])
    page_text = text_from_html(html)[:MAX_TEXT_CHARS]

    return {
        "title": first_value(extract_meta_from_html(html, ["og:title", "twitter:title"]), title),
        "description": description,
        "image": image,
        "text": page_text,
        "scraper": "urllib-fallback",
    }


def select_first(page, *selectors):
    for selector in selectors:
        try:
            value = page.css(selector).get()
            if value:
                return clean_text(str(value))
        except Exception:
            continue
    return ""


def select_all_text(page):
    try:
        values = page.css("body ::text").getall()
        return clean_text(" ".join(str(value) for value in values))[:MAX_TEXT_CHARS]
    except Exception:
        return ""


def scrape_with_scrapling(url):
    try:
        from scrapling.fetchers import Fetcher

        page = Fetcher.get(url)
        return {
            "title": first_value(
                select_first(page, 'meta[property="og:title"]::attr(content)'),
                select_first(page, 'meta[name="twitter:title"]::attr(content)'),
                select_first(page, "title::text"),
            ),
            "description": first_value(
                select_first(page, 'meta[property="og:description"]::attr(content)'),
                select_first(page, 'meta[name="description"]::attr(content)'),
            ),
            "image": first_value(
                select_first(page, 'meta[property="og:image"]::attr(content)'),
                select_first(page, 'meta[name="twitter:image"]::attr(content)'),
            ),
            "text": select_all_text(page),
            "scraper": "scrapling-fetcher",
        }
    except Exception:
        return scrape_with_urllib(url)


def build_payload(url):
    parsed = urlparse(url)
    scraped = scrape_with_scrapling(url)
    evidence_text = " ".join(
        [
            scraped.get("title", ""),
            scraped.get("description", ""),
            scraped.get("text", ""),
        ]
    )
    evidence_signals = sorted(set(ACCOUNT_PATTERN.findall(evidence_text)))[:10]
    text_excerpt = clean_text(scraped.get("text", ""))[:MAX_TEXT_CHARS]
    entities = extract_osint_entities(evidence_text[:MAX_TEXT_CHARS])

    return {
        "url": url,
        "sourceUrl": url,
        "sourceHost": (parsed.hostname or "").removeprefix("www."),
        "title": scraped.get("title") or "Tanpa judul",
        "description": scraped.get("description") or "",
        "image": scraped.get("image") or "",
        "evidenceSignals": evidence_signals,
        "text_excerpt": text_excerpt,
        "entities": entities,
        "scraper": scraped.get("scraper") or "scrapling-fetcher",
        "scrape_status": "scraped",
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
    }


def require_internal_token(handler):
    expected = os.environ.get("INTERNAL_API_TOKEN")
    received = handler.headers.get("X-Internal-Token")

    if not expected:
        return False

    return received == expected

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,X-Internal-Token")
        self.end_headers()

    def do_GET(self):
        if not require_internal_token(self):
            send_json(self, 401, {"error": "Unauthorized"})
            return
            
        query = parse_qs(urlparse(self.path).query)
        self.handle_scrape(query.get("url", [""])[0])

    def do_POST(self):
        if not require_internal_token(self):
            send_json(self, 401, {"error": "Unauthorized"})
            return
            
        length = int(self.headers.get("content-length") or 0)
        raw_body = self.rfile.read(length).decode("utf-8") if length else "{}"

        try:
            payload = json.loads(raw_body)
        except json.JSONDecodeError:
            payload = {}

        self.handle_scrape(payload.get("url", ""))

    def handle_scrape(self, raw_url):
        try:
            url = validate_public_url(raw_url)
            payload = build_payload(url)
            send_json(self, 200, payload)
        except ValueError as error:
            send_json(self, 400, {"error": str(error)})
        except (TimeoutError, URLError):
            send_json(self, 504, {"error": "Target terlalu lama merespons."})
        except Exception:
            send_json(self, 502, {"error": "Gagal mengambil metadata URL."})
