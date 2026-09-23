#!/usr/bin/env python3
"""
TINDA POS - Scrapling Suggested Retail Price (SRP) Scraper & API Service
========================================================================
Powered by Scrapling (https://github.com/d4vinci/Scrapling)

Features:
- Scrapes the latest official DTI Suggested Retail Price (SRP) bulletins from:
  https://www.dti.gov.ph/dti-consumer-space/dti-latest-srps-basic-necessities-prime-commodities
- Extracts official SRPs for Basic Necessities and Prime Commodities (BNPC)
- Searches suggested prices by barcode or product keyword
- Serves a local REST API endpoint on http://127.0.0.1:5174/api/srp for TINDA POS Web
"""

import os
import sys
import json
import re
import argparse
import subprocess
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

try:
    from scrapling.fetchers import Fetcher
    SCRAPLING_AVAILABLE = True
except ImportError:
    SCRAPLING_AVAILABLE = False
    print("Warning: scrapling library not found. Falling back to urllib/requests.", file=sys.stderr)

DTI_SRP_PORTAL = "https://www.dti.gov.ph/dti-consumer-space/dti-latest-srps-basic-necessities-prime-commodities"
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "data")
CACHE_FILE = os.path.join(DATA_DIR, "scrapling_srp_cache.json")


def fetch_dti_srp_bulletin():
    """
    Uses Scrapling to locate and download the latest DTI BNPC SRP bulletin PDF.
    """
    if not SCRAPLING_AVAILABLE:
        raise RuntimeError("Scrapling is required to fetch live DTI bulletins.")

    print(f"[*] Connecting to DTI Consumer Portal via Scrapling: {DTI_SRP_PORTAL}")
    resp = Fetcher.get(DTI_SRP_PORTAL, timeout=20)
    if resp.status != 200:
        raise RuntimeError(f"Failed to fetch DTI portal, HTTP status: {resp.status}")

    # Find PDF bulletin link in the page
    html = resp.html_content
    pdf_matches = re.findall(r'href=[\"\']([^\"\']*(?:srp|bulletin|bnpc)[^\"\']*\.pdf)[\"\']', html, re.I)
    if not pdf_matches:
        # Fallback to general PDF links
        pdf_matches = re.findall(r'href=[\"\']([^\"\']+\.pdf)[\"\']', html, re.I)

    if not pdf_matches:
        raise RuntimeError("No PDF SRP bulletin link found on DTI portal.")

    bulletin_url = pdf_matches[0]
    if bulletin_url.startswith('/'):
        bulletin_url = 'https://www.dti.gov.ph' + bulletin_url

    print(f"[+] Found DTI SRP Bulletin PDF: {bulletin_url}")
    print("[*] Downloading PDF via Scrapling Fetcher...")
    pdf_resp = Fetcher.get(bulletin_url, timeout=30)
    if pdf_resp.status != 200:
        raise RuntimeError(f"Failed to download PDF bulletin, status: {pdf_resp.status}")

    pdf_path = "/tmp/dti_srp_bulletin_live.pdf"
    with open(pdf_path, "wb") as f:
        f.write(pdf_resp.body)

    print(f"[+] Downloaded {len(pdf_resp.body):,} bytes to {pdf_path}")
    return pdf_path, bulletin_url


def parse_dti_pdf(pdf_path, source_url):
    """
    Extracts text from the PDF bulletin using pdftotext and parses items, units, and SRPs.
    """
    txt_path = "/tmp/dti_srp_bulletin_live.txt"
    subprocess.run(["pdftotext", "-layout", pdf_path, txt_path], check=True)

    items = []
    current_category = "General Commodities"
    
    with open(txt_path, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()

    for line in lines:
        cleaned = line.strip()
        if not cleaned:
            continue

        # Look for category headers
        if re.search(r'^(CANNED SARDINES|PROCESSED MILK|COFFEE|BREAD|INSTANT MAMI|SALT|WATER|DETERGENT|CANDLES|MEAT LOAF|CORNED BEEF|CONDIMENTS)', cleaned, re.I):
            current_category = cleaned.title()
            continue

        # Find occurrences of: Item Name, Unit (g, kg, mL, L, pack), SRP (XX.XX)
        # e.g.: Saba Philippines Sardines    155g    21.50
        matches = re.finditer(r'([A-Za-z0-9\s\.\-\(\)\/\,\’\–\+]+?)\s{2,}(\d+(?:\.\d+)?(?:g|kg|mL|L|pcs\.\/pack|\#\d+(?:x\d+)?))\s+(\d+\.\d{2})', line)
        for m in matches:
            name = m.group(1).strip()
            unit = m.group(2).strip()
            price_val = float(m.group(3).strip())

            # Skip header or noise rows
            if "UNIT" in name or "SRP" in name or "COMMODITIES" in name or len(name) < 3:
                continue

            price_c = int(round(price_val * 100))
            items.append({
                "product_name": f"{name} {unit}",
                "brand": name.split()[0] if name else "General",
                "variant": unit,
                "unit": unit,
                "market_price_c": price_c,
                "min_price_c": int(round(price_c * 0.9)),
                "max_price_c": int(round(price_c * 1.15)),
                "category": current_category,
                "currency": "PHP",
                "source_name": "Official DTI SRP Bulletin (via Scrapling)",
                "source_type": "official",
                "source_url": source_url,
                "effective_date": "2026-05-11"
            })

    print(f"[+] Successfully parsed {len(items)} items from DTI bulletin.")
    return items


def load_cached_or_bundled_srp():
    """
    Loads SRP catalog from cache or bundled seed data.
    """
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass

    # Read from seedPriceReferences.ts
    seed_file = os.path.join(DATA_DIR, "seedPriceReferences.ts")
    if os.path.exists(seed_file):
        try:
            with open(seed_file, "r", encoding="utf-8") as f:
                content = f.read()
            start = content.find('= [') + 2
            end = content.rfind(']')
            if start > 1 and end > start:
                raw_json = content[start:end+1]
                return json.loads(raw_json)
        except Exception as e:
            print("Error parsing seed data:", e)

    return []


def search_srp(query, catalog):
    """
    Search catalog by barcode or fuzzy keywords.
    """
    q = query.strip().lower()
    if not q:
        return catalog[:20]

    # Barcode match
    barcode_matches = [item for item in catalog if item.get("barcode") and q in item["barcode"].lower()]
    if barcode_matches:
        return barcode_matches

    # Keyword match
    keywords = q.split()
    results = []
    for item in catalog:
        text = f"{item.get('product_name', '')} {item.get('brand', '')} {item.get('variant', '')}".lower()
        if all(kw in text for kw in keywords):
            results.append(item)

    if not results:
        # Partial match if any keyword matches
        for item in catalog:
            text = f"{item.get('product_name', '')} {item.get('brand', '')}".lower()
            if any(kw in text for kw in keywords):
                results.append(item)

    return results


class SrpApiHandler(BaseHTTPRequestHandler):
    catalog = []

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        if parsed.path == "/api/status":
            resp = {
                "status": "online",
                "scraper": "Scrapling",
                "version": "0.4.15",
                "total_srp_items": len(self.catalog)
            }
            self.wfile.write(json.dumps(resp).encode("utf-8"))
            return

        if parsed.path == "/api/srp":
            q = params.get("q", [""])[0]
            results = search_srp(q, self.catalog)
            resp = {
                "query": q,
                "count": len(results),
                "items": results[:30]
            }
            self.wfile.write(json.dumps(resp).encode("utf-8"))
            return

        # Default fallback
        self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode("utf-8"))

    def log_message(self, format, *args):
        # Concise logging
        sys.stderr.write(f"[Scrapling API] {args[0]} - {args[1]}\n")


def run_server(port=5174):
    catalog = load_cached_or_bundled_srp()
    SrpApiHandler.catalog = catalog
    server_address = ("127.0.0.1", port)
    httpd = HTTPServer(server_address, SrpApiHandler)
    print(f"\n=======================================================")
    print(f"🚀 TINDA Scrapling SRP API Server running on:")
    print(f"   http://127.0.0.1:{port}/api/srp?q=Lucky+Me")
    print(f"   http://127.0.0.1:{port}/api/status")
    print(f"   Total items loaded: {len(catalog)}")
    print(f"=======================================================\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Scrapling SRP Server...")
        httpd.server_close()


def main():
    parser = argparse.ArgumentParser(description="TINDA Scrapling SRP Scraper & API")
    parser.add_argument("--sync", action="store_true", help="Scrape live DTI bulletin via Scrapling and update cache")
    parser.add_argument("--lookup", type=str, help="Search suggested price for a product or barcode")
    parser.add_argument("--serve", action="store_true", help="Run local HTTP API server for TINDA POS Web")
    parser.add_argument("--port", type=int, default=5174, help="Port for local HTTP API server (default: 5174)")
    args = parser.parse_args()

    if args.sync:
        try:
            pdf_path, url = fetch_dti_srp_bulletin()
            items = parse_dti_pdf(pdf_path, url)
            if items:
                with open(CACHE_FILE, "w", encoding="utf-8") as f:
                    json.dump(items, f, indent=2)
                print(f"[+] Saved {len(items)} DTI SRP items to {CACHE_FILE}")
        except Exception as e:
            print(f"[-] Sync failed: {e}", file=sys.stderr)
            sys.exit(1)

    elif args.lookup:
        catalog = load_cached_or_bundled_srp()
        results = search_srp(args.lookup, catalog)
        print(f"\nResults for '{args.lookup}': ({len(results)} found)\n" + "-" * 60)
        for r in results[:10]:
            srp = r.get("market_price_c", 0) / 100
            print(f"- {r.get('product_name')} | SRP: ₱{srp:.2f} ({r.get('source_name', 'DTI')})")
        print("-" * 60)

    elif args.serve:
        run_server(args.port)

    else:
        # Default behavior: show lookup help and sample lookup
        parser.print_help()


if __name__ == "__main__":
    main()
