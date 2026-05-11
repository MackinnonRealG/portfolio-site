#!/usr/bin/env python3
"""Scrape live Claude plan usage from claude.ai session cookies and write to plan-usage.json."""

import json
import sqlite3
import http.cookiejar
import urllib.request
import os
import re
from datetime import datetime
from pathlib import Path

OUTPUT = Path(__file__).resolve().parent.parent / "app" / "api" / "data" / "plan-usage.json"

COOKIES_DB = Path.home() / "Library" / "Application Support" / "Claude" / "Cookies"

def get_session_key():
    """Extract sessionKey from Claude desktop app's cookie store."""
    if not COOKIES_DB.exists():
        return None
    db = sqlite3.connect(str(COOKIES_DB))
    db.text_factory = bytes
    try:
        rows = db.execute(
            "SELECT encrypted_value, value FROM cookies WHERE host_key='.claude.ai' AND name='sessionKey'"
        ).fetchall()
        if not rows:
            return None
        enc_val, plain_val = rows[0]
        if plain_val:
            return plain_val.decode("utf-8", errors="replace")
        return None
    finally:
        db.close()


def fetch_usage_page(session_key: str) -> str | None:
    """Fetch the usage settings page HTML."""
    url = "https://claude.ai/settings/usage"
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "Cookie": f"sessionKey={session_key}",
        "Accept": "text/html,application/xhtml+xml",
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.read().decode("utf-8")
    except Exception as e:
        print(f"Failed to fetch usage page: {e}")
        return None


def parse_usage(html: str) -> dict:
    """Parse usage data from the HTML page."""
    usage_pcts = [int(m) for m in re.findall(r'(\d+)% used', html)]
    reset_session = re.search(r'Resets in ([\d\w\s]+?)(?:\n|<)', html)
    reset_weekly = re.search(r'Resets (Sat \d+:\d+ [AP]M)', html)
    routine = re.search(r'(\d+)\s*/\s*(\d+)', html)
    plan_match = re.search(r'Max \((\d+)x\)', html)

    return {
        "plan": f"Max ({plan_match.group(1)}x)" if plan_match else "Max (5x)",
        "weeklyReset": reset_weekly.group(1) if reset_weekly else "Sat 7:00 AM",
        "extraUsage": True,
        "limits": {
            "currentSession": {
                "used": usage_pcts[0] if len(usage_pcts) > 0 else 0,
                "label": "Current session",
                "resetNote": f"Resets in {reset_session.group(1).strip()}" if reset_session else ""
            },
            "weeklyAll": {
                "used": usage_pcts[1] if len(usage_pcts) > 1 else 0,
                "label": "All models",
                "resetNote": f"Resets {reset_weekly.group(1)}" if reset_weekly else "Resets Sat 7:00 AM"
            },
            "weeklySonnet": {
                "used": usage_pcts[2] if len(usage_pcts) > 2 else 0,
                "label": "Sonnet only",
                "resetNote": ""
            },
            "weeklyDesign": {
                "used": usage_pcts[3] if len(usage_pcts) > 3 else 0,
                "label": "Claude Design",
                "resetNote": ""
            }
        },
        "features": {
            "routineRuns": {
                "used": int(routine.group(1)) if routine else 0,
                "total": int(routine.group(2)) if routine else 15
            }
        },
        "lastUpdated": datetime.utcnow().isoformat() + "Z"
    }


if __name__ == "__main__":
    print("Attempting cookie-based fetch...")
    session_key = get_session_key()
    if session_key:
        html = fetch_usage_page(session_key)
        if html and "% used" in html:
            data = parse_usage(html)
            OUTPUT.write_text(json.dumps(data, indent=2))
            print(f"Written live data to {OUTPUT}")
            print(json.dumps(data, indent=2))
            exit(0)
        else:
            print("Cookie fetch didn't return usage data (page may require JS rendering)")

    print("Falling back: cookie-based scraping not available.")
    print("Usage data must be updated via browser scraping or manual edit.")
    exit(1)
