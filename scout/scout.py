"""GoPeak HQ daily scout.

1. Refreshes every reference video's thumbnail + views (TikTok thumbnail links expire after ~2 days).
2. Scans the watchlist (data/watchlist.json) of competitor / UGC accounts for new outliers:
   >= 3x the account's median views, >= 100k views, posted in the last 60 days.
3. Has Gemini watch each new outlier and write the hook, beats, a GoPeak shot list, on-screen text and effort
   (max 5 new per run). Without GEMINI_API_KEY new outliers are still added, just without the breakdown.
Writes data/outliers.json. Text and links only: videos are never stored in this (public) repo.
"""
import base64, json, os, re, statistics, subprocess, sys, tempfile, time, urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT, WATCH = os.path.join(ROOT, "data/outliers.json"), os.path.join(ROOT, "data/watchlist.json")
GEMINI = os.environ.get("GEMINI_API_KEY")
MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
MIN_VIEWS, MIN_MULT, MAX_NEW, MAX_AGE_D = 100_000, 3.0, int(os.environ.get("MAX_NEW", 5)), 60
FORMATS = ["face-cam-reaction", "green-screen", "text-on-screen-pov", "transformation/before-after", "tutorial/routine",
           "app-screen-recording", "street-interview", "skit", "slideshow"]


def ytdlp(*args, timeout=180):
    try:
        r = subprocess.run(["yt-dlp", "--no-warnings", *args], capture_output=True, text=True, timeout=timeout)
        return r.stdout if r.returncode == 0 else ""
    except Exception as e:
        print("yt-dlp failed", args[-1], e, file=sys.stderr)
        return ""


def vid_id(url):
    m = re.search(r"/video/(\d+)", url)
    return m.group(1) if m else None


def normalize(o):
    """Flatten the research agent's nested fields and clean handles so HQ reads one shape."""
    rec = o.pop("gopeak_recreation", None) or {}
    for k, v in rec.items():
        if k == "audio":
            o.setdefault("audio_idea", v)
        elif not o.get(k):
            o[k] = v
    o["account"] = (o.get("account") or "").lstrip("@")
    o["id"] = o.get("id") or vid_id(o.get("url", ""))
    for k in ("on_screen_text", "hook_paraphrase", "why_it_works"):
        if o.get(k):
            o[k] = o[k].replace("—", ", ").replace("–", "-")
    return o


def gemini_breakdown(url):
    """Download to a temp dir (never committed), send the clip to Gemini, get a JSON breakdown back."""
    if not GEMINI:
        return {}
    with tempfile.TemporaryDirectory() as d:
        ytdlp("-q", "-f", "b[height<=540][ext=mp4]/b[ext=mp4]/b", "-o", f"{d}/v.mp4", url, timeout=240)
        path = f"{d}/v.mp4"
        if not os.path.exists(path) or os.path.getsize(path) > 18_000_000:
            return {}
        data = base64.b64encode(open(path, "rb").read()).decode()
    prompt = (
        "This is a viral short video from a competitor in the height-prediction app niche (teens, growth, heightmaxxing). "
        "Our app is GoPeak (predicts adult height, daily growth tasks, workouts, AI coach). Break down why it worked and how to "
        "remake the FORMAT for GoPeak with our own face and app. Return JSON only with keys: format (one of "
        + ", ".join(FORMATS) + "), hook_paraphrase (what happens in the first 2 seconds, max 14 words), structure (3-5 short beats), "
        "why_it_works (max 18 words), shot_list (3-6 short filming steps for a GoPeak creator on a phone), on_screen_text "
        "(max 6 words, lowercase), difficulty (easy|med|hard), est_film_minutes (number), length_sec (number). "
        "Never use em dashes or en dashes. Don't copy their exact wording."
    )
    body = {"contents": [{"role": "user", "parts": [{"inline_data": {"mime_type": "video/mp4", "data": data}}, {"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0.4, "thinkingConfig": {"thinkingLevel": "low"}}}
    req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
                                 data=json.dumps(body).encode(), headers={"content-type": "application/json", "x-goog-api-key": GEMINI})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            out = json.loads(r.read())
        text = "".join(p.get("text", "") for p in out["candidates"][0]["content"]["parts"] if not p.get("thought"))
        return json.loads(text)
    except Exception as e:
        print("gemini failed", url, e, file=sys.stderr)
        return {}


def main():
    data = json.load(open(OUT)) if os.path.exists(OUT) else {"outliers": []}
    data["outliers"] = [normalize(o) for o in data.get("outliers", [])]
    watch = json.load(open(WATCH)) if os.path.exists(WATCH) else {"tiktok": []}
    known = {o["id"] for o in data["outliers"] if o.get("id")}

    # 1. fresh thumbnails + views for existing references
    for o in data["outliers"]:
        j = ytdlp("-J", "--skip-download", o["url"], timeout=90)
        if not j:
            continue
        try:
            info = json.loads(j)
        except ValueError:
            continue
        o["thumb"] = info.get("thumbnail") or o.get("thumb")
        o["views"] = info.get("view_count") or o.get("views")
        if info.get("track") and not o.get("audio_name"):
            o["audio_name"] = f"{info['track']} - {info.get('artist') or ''}".strip(" -")
        time.sleep(1)

    # 2. new outliers from the watchlist
    found = []
    for acc in watch.get("tiktok", []):
        j = ytdlp("--flat-playlist", "-J", "--playlist-items", "1-40", f"https://www.tiktok.com/@{acc}")
        try:
            es = [e for e in (json.loads(j).get("entries") or []) if e and e.get("view_count") is not None] if j else []
        except ValueError:
            es = []
        if len(es) < 5:
            print(f"@{acc}: {len(es)} videos, skipped")
            continue
        med = statistics.median(e["view_count"] for e in es) or 1
        for e in es:
            age_d = (time.time() - (e.get("timestamp") or time.time())) / 86400
            mult = e["view_count"] / med
            if e["id"] in known or e["view_count"] < MIN_VIEWS or mult < MIN_MULT or age_d > MAX_AGE_D:
                continue
            found.append({"platform": "tiktok", "id": str(e["id"]), "url": e.get("url") or f"https://www.tiktok.com/@{acc}/video/{e['id']}",
                          "account": acc, "views": e["view_count"], "account_median_views": int(med), "multiple": round(mult, 1),
                          "posted_date": datetime.fromtimestamp(e["timestamp"], timezone.utc).date().isoformat() if e.get("timestamp") else None,
                          "caption": (e.get("title") or "")[:200]})
        print(f"@{acc}: median {int(med)}, {len([f for f in found if f['account'] == acc])} new outliers")

    found.sort(key=lambda f: -f["multiple"])
    for f in found[:MAX_NEW]:
        info_j = ytdlp("-J", "--skip-download", f["url"], timeout=90)
        try:
            info = json.loads(info_j) if info_j else {}
        except ValueError:
            info = {}
        f["thumb"] = info.get("thumbnail")
        if info.get("track"):
            f["audio_name"] = f"{info['track']} - {info.get('artist') or ''}".strip(" -")
        if info.get("music_info") or info.get("track_id"):
            pass
        f.update({k: v for k, v in gemini_breakdown(f["url"]).items() if v not in (None, "", [])})
        f["added"] = datetime.now(timezone.utc).date().isoformat()
        data["outliers"].append(normalize(f))
        print("added", f["url"], f.get("format"))

    data["generated"] = datetime.now(timezone.utc).isoformat()
    json.dump(data, open(OUT, "w"), indent=1, ensure_ascii=False)
    print(f"{len(data['outliers'])} references, {min(len(found), MAX_NEW)} new")


if __name__ == "__main__":
    main()
