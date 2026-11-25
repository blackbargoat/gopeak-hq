"""GoPeak research brain. Runs in GitHub Actions (.github/workflows/brain.yml) so it works with every PC off.

Agents (python agents/brain.py <agent> [<agent> ...]):
  collect   Scout: competitor + UGC accounts (TikTok via yt-dlp, Instagram via Apify) and our own posts -> br_videos
  analyze   Analyst: Gemini watches outliers, a sample of normal videos (contrast) and our posts -> features
  learn     Brain: which features beat each account's median (lift), plus a written "what performs" summary
  predict   Predictor: scores every queued pipeline / gopeak.app video before it posts; checks itself after posting
  ideas     Writer: new post ideas + scripts from the brain
  creators  Creator finder: hashtag search (Apify) for small creators with height outliers; competitor UGC gets tracked
  report    Weekly report: our numbers, what worked, what to post next
Data lives in private Supabase tables (supabase/brain.sql); HQ reads it via rpc hq_brain. Videos are never stored.
Secrets: SUPABASE_SERVICE_KEY, BRAIN_KEY (Gemini relay, FREE-tier key only), optional APIFY_TOKEN.
"""
import json, math, os, random, statistics, subprocess, sys, tempfile, time, base64, urllib.request, urllib.error, urllib.parse
from datetime import datetime, timezone, timedelta

SB = "https://etdbjahwegsmuelcawgf.supabase.co"
SK, BK, APIFY = os.environ.get("SUPABASE_SERVICE_KEY", ""), os.environ.get("BRAIN_KEY", ""), os.environ.get("APIFY_TOKEN", "")
BOT = "https://raw.githubusercontent.com/blackbargoat/height-reply-bot/main/stats/"
NOW = datetime.now(timezone.utc)
FORMATS = ["face-cam-reaction", "green-screen", "text-on-screen-pov", "transformation/before-after", "tutorial/routine",
           "app-screen-recording", "street-interview", "skit", "slideshow", "talking-head"]
HOOKS = ["age_height_list", "if_you_are_x_at_y", "would_you_rather", "flex_comment_bait", "signs_list", "average_height",
         "sleep_habit", "myth_fact", "story", "transformation", "app_demo", "challenge_series", "other"]
FEATURE_KEYS = ["format", "hook_type", "talking", "has_app_screen", "app_screen_when", "text_style", "setting", "cta", "audio",
                "emotion", "length_bucket"]
APPS = {"gotall": "GoTall", "heightgpt": "HeightGPT", "hite": "HeightGPT", "taller": "Taller", "tallify": "Tallify"}
HASHTAGS = ["heightmaxxing", "heightgrowth", "growtaller", "heightprediction", "tallteen", "howtogrowtaller"]


# ---------- plumbing ----------
def http(method, url, body=None, headers=None, timeout=120):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={"content-type": "application/json", **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            t = r.read()
            return json.loads(t) if t else None
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{method} {url.split('?')[0]} {e.code}: {e.read()[:300]!r}")


def db(method, path, body=None, prefer=None):
    h = {"apikey": SK, "authorization": "Bearer " + SK}
    if prefer:
        h["prefer"] = prefer
    return http(method, f"{SB}/rest/v1/{path}", body, h)


def upsert(table, rows, on):
    for i in range(0, len(rows), 200):
        db("POST", f"{table}?on_conflict={on}", rows[i:i + 200], "resolution=merge-duplicates,return=minimal")


_last_call = [0.0]


def gemini(parts, temperature=0.4, as_json=True):
    # gentle pacing between calls
    wait = 2 - (time.time() - _last_call[0])
    if wait > 0:
        time.sleep(wait)
    _last_call[0] = time.time()
    body = {"contents": [{"role": "user", "parts": parts}],
            "generationConfig": {"temperature": temperature, "thinkingConfig": {"thinkingLevel": "low"},
                                 **({"responseMimeType": "application/json"} if as_json else {})}}
    out = http("POST", f"{SB}/functions/v1/brain/gemini", {"body": body}, {"x-brain-key": BK}, timeout=240)
    text = "".join(p.get("text", "") for p in out["candidates"][0]["content"]["parts"] if not p.get("thought"))
    return json.loads(text) if as_json else text


def ytdlp(*args, timeout=180):
    try:
        r = subprocess.run(["yt-dlp", "--no-warnings", *args], capture_output=True, text=True, timeout=timeout)
        return r.stdout if r.returncode == 0 else ""
    except Exception as e:
        print("yt-dlp failed", e, file=sys.stderr)
        return ""


def apify(actor, payload, timeout=300):
    if not APIFY:
        return []
    url = f"https://api.apify.com/v2/acts/{actor}/run-sync-get-dataset-items?token={APIFY}&timeout={timeout - 20}"
    try:
        return http("POST", url, payload, timeout=timeout) or []
    except Exception as e:
        print("apify failed", actor, e, file=sys.stderr)
        return []


def video_bytes(v):
    """Small mp4 for Gemini: direct source if we have one, else yt-dlp. None when the platform blocks us."""
    with tempfile.TemporaryDirectory() as d:
        p = f"{d}/v.mp4"
        if v.get("video_src"):
            try:
                urllib.request.urlretrieve(v["video_src"], p)
            except Exception:
                pass
        if not os.path.exists(p):
            ytdlp("-q", "-f", "b[height<=720][ext=mp4]/b[ext=mp4]/b", "-o", p, v["url"], timeout=240)
        if not os.path.exists(p) or os.path.getsize(p) > 18_000_000:
            return None
        return open(p, "rb").read()


def iso(ts):
    if ts is None:
        return None
    if isinstance(ts, (int, float)):
        return datetime.fromtimestamp(ts, timezone.utc).isoformat()
    return str(ts)


def no_dashes(s):
    return s.replace("—", ",").replace("–", "-") if isinstance(s, str) else s


class Run:
    def __init__(self, agent):
        self.agent = agent
        self.id = db("POST", "br_runs", {"agent": agent}, "return=representation")[0]["id"]

    def done(self, ok, summary):
        db("PATCH", f"br_runs?id=eq.{self.id}", {"finished_at": datetime.now(timezone.utc).isoformat(), "ok": ok, "summary": summary[:600]})
        print(f"[{self.agent}] {'ok' if ok else 'FAILED'}: {summary}")


# ---------- agent: collect ----------
def scan_tiktok(handle):
    j = ytdlp("--flat-playlist", "-J", "--playlist-items", "1-40", f"https://www.tiktok.com/@{handle}")
    try:
        es = [e for e in (json.loads(j).get("entries") or []) if e and e.get("view_count") is not None] if j else []
    except ValueError:
        es = []
    return [{"id": f"tiktok:{e['id']}", "platform": "tiktok", "handle": handle, "url": e.get("url") or f"https://www.tiktok.com/@{handle}/video/{e['id']}",
             "posted_at": iso(e.get("timestamp")), "views": e.get("view_count"), "likes": e.get("like_count"), "comments": e.get("comment_count"),
             "shares": e.get("repost_count"), "length_sec": e.get("duration"), "caption": (e.get("title") or "")[:500]} for e in es], None


def scan_instagram(handle):
    items = apify("apify~instagram-reel-scraper", {"username": [handle], "resultsLimit": 40})
    out, followers = [], None
    for it in items:
        if not it.get("shortCode"):
            continue
        m = it.get("musicInfo") or {}
        followers = followers or it.get("ownerFollowersCount")
        out.append({"id": f"instagram:{it['shortCode']}", "platform": "instagram", "handle": handle, "url": f"https://www.instagram.com/reel/{it['shortCode']}/",
                    "posted_at": it.get("timestamp"), "views": it.get("videoPlayCount") or it.get("videoViewCount"), "likes": it.get("likesCount"),
                    "comments": it.get("commentsCount"), "length_sec": it.get("videoDuration"), "caption": (it.get("caption") or "")[:500],
                    "audio": " - ".join(x for x in [m.get("song_name"), m.get("artist_name")] if x) or None,
                    "thumb": it.get("displayUrl"), "video_src": it.get("videoUrl")})
    return out, followers


def scan_own():
    posts = http("GET", BOT + "posts.json") or {}
    pipe = db("GET", "pipe_posts?select=id,variant,format,hook,music,trial,caption,video_url,results&status=eq.posted") or []
    by_url = {(p.get("results") or {}).get("instagram", {}).get("url", "").rstrip("/"): p for p in pipe}
    rows = []
    for p in posts.values():
        url = (p.get("permalink") or "").rstrip("/")
        if "/reel/" not in url:
            continue
        code = url.split("/reel/")[1].strip("/")
        meta = by_url.get(url)
        rows.append({"id": f"instagram:{code}", "platform": "instagram", "handle": p.get("account"), "url": url + "/", "posted_at": p.get("timestamp"),
                     "views": p.get("views"), "likes": p.get("likes"), "comments": p.get("comments"), "shares": p.get("shares"),
                     "caption": (p.get("caption") or "")[:500], "thumb": BOT + p["thumb"].replace("stats/", "") if p.get("thumb") else None,
                     "video_src": meta.get("video_url") if meta else None,
                     "own_meta": {k: meta.get(k) for k in ("id", "variant", "format", "hook", "music", "trial")} if meta else None})
    return rows


def finish_account(handle, platform, rows, role, followers=None):
    mature = [r["views"] for r in rows if r.get("views") is not None and (not r.get("posted_at") or
              datetime.fromisoformat(str(r["posted_at"]).replace("Z", "+00:00").replace("+0000", "+00:00")) < NOW - timedelta(days=2))]
    med = statistics.median(mature) if len(mature) >= 5 else None
    for r in rows:
        r["multiple"] = round(r["views"] / med, 2) if med and r.get("views") is not None else None
        big = r["multiple"] is not None and r["multiple"] >= (2 if role == "own" else 3) and (r["views"] or 0) >= (5_000 if role == "own" else 50_000)
        r["is_outlier"] = bool(big)
        r["updated_at"] = NOW.isoformat()
    if rows:
        keys = set().union(*rows)
        upsert("br_videos", [{k: r.get(k) for k in keys} for r in rows], "id")
    patch = {"last_scanned": NOW.isoformat(), "videos": len(rows)}
    if med:
        patch["median_views"] = med
    if followers:
        patch["followers"] = followers
    db("PATCH", f"br_accounts?platform=eq.{platform}&handle=eq.{handle}", patch)
    return med


def collect():
    run = Run("collect")
    accs = db("GET", "br_accounts?active=eq.true&select=*") or []
    n, outl, skipped = 0, 0, []
    for a in accs:
        if a["role"] == "own":
            continue
        if a["platform"] == "tiktok":
            rows, fol = scan_tiktok(a["handle"])
        elif APIFY:
            rows, fol = scan_instagram(a["handle"])
        else:
            skipped.append("@" + a["handle"])
            continue
        if not rows:
            skipped.append("@" + a["handle"])
            continue
        finish_account(a["handle"], a["platform"], rows, a["role"], fol)
        n += len(rows)
        outl += sum(r["is_outlier"] for r in rows)
        time.sleep(1)
    own = scan_own()
    for h in {r["handle"] for r in own}:
        finish_account(h, "instagram", [r for r in own if r["handle"] == h], "own")
    run.done(True, f"{n} competitor videos ({outl} outliers), {len(own)} of ours"
             + (f"; skipped {', '.join(skipped)} (Instagram needs APIFY_TOKEN)" if skipped else ""))


# ---------- agent: analyze ----------
ANALYZE_PROMPT = (
    "You study short videos in the height niche (teens, growth, heightmaxxing, height prediction apps). Describe this video as data. "
    "Return JSON only with keys: format (one of " + ", ".join(FORMATS) + "), hook_type (one of " + ", ".join(HOOKS) + "), "
    "hook_text (what the first screen says or what happens in the first 2 seconds, max 14 words), talking (true if the person speaks to camera), "
    "has_app_screen (true if an app screen is shown), app_screen_when (start|middle|end|none), text_style (none|single_line|list|captions), "
    "setting (bedroom|bathroom|car|outdoor|gym|school|kitchen|other), cta (comment|link_in_bio|send_to_friend|follow|download|none), "
    "audio (original_voice|original_sound_loop|trending_song|voiceover|none), emotion (deadpan|serious|hype|funny|sad), "
    "length_sec (number), why (max 20 words: why this would or would not get views). Never use em dashes or en dashes.")


def length_bucket(s):
    s = s or 0
    return "0-8s" if s <= 8 else "9-20s" if s <= 20 else "21-45s" if s <= 45 else "46s+"


def analyze(limit_outliers=14, limit_normal=8, limit_own=10):
    run = Run("analyze")
    sel = "select=id,platform,handle,url,video_src,caption,length_sec,multiple,is_outlier&analyzed_at=is.null"
    own_h = ",".join(a["handle"] for a in (db("GET", "br_accounts?role=eq.own&select=handle") or []))
    todo = (db("GET", f"br_videos?{sel}&is_outlier=eq.true&handle=not.in.({own_h})&order=multiple.desc&limit={limit_outliers}") or [])
    normal = db("GET", f"br_videos?{sel}&is_outlier=eq.false&multiple=not.is.null&handle=not.in.({own_h})&limit=200") or []
    todo += random.sample(normal, min(limit_normal, len(normal)))
    todo += db("GET", f"br_videos?{sel}&handle=in.({own_h})&order=posted_at.desc&limit={limit_own}") or []
    ok = fail = 0
    for v in todo:
        b = video_bytes(v)
        if b is None:
            # platform blocked the download: mark so we don't retry forever, keep caption-only features
            try:
                f = gemini([{"text": ANALYZE_PROMPT + "\nYou only get the caption, not the video. Guess carefully.\nCaption: " + (v.get("caption") or "")}])
                f["from_caption_only"] = True
            except Exception:
                fail += 1
                continue
        else:
            try:
                f = gemini([{"inline_data": {"mime_type": "video/mp4", "data": base64.b64encode(b).decode()}}, {"text": ANALYZE_PROMPT}])
            except Exception as e:
                print("analyze failed", v["url"], e, file=sys.stderr)
                fail += 1
                continue
        f = {k: no_dashes(x) for k, x in f.items()}
        f["length_bucket"] = length_bucket(f.get("length_sec") or v.get("length_sec"))
        db("PATCH", f"br_videos?id=eq.{urllib.parse.quote(v['id'])}", {"features": f, "analyzed_at": datetime.now(timezone.utc).isoformat()})
        ok += 1
        time.sleep(2)
    run.done(fail == 0 or ok > 0, f"analyzed {ok} videos" + (f", {fail} failed" if fail else ""))


# ---------- agent: learn ----------
def lifts(videos):
    vs = [v for v in videos if v.get("features") and v.get("multiple")]
    if len(vs) < 8:
        return {"n": len(vs), "groups": {}}
    base = statistics.median(min(v["multiple"], 20) for v in vs) or 1
    groups = {}
    for k in FEATURE_KEYS:
        by = {}
        for v in vs:
            val = v["features"].get(k)
            if val is None:
                continue
            by.setdefault(str(val).lower(), []).append(v)
        rows = []
        for val, g in by.items():
            if len(g) < 4:
                continue
            med = statistics.median(min(x["multiple"], 20) for x in g)   # one 300x video shouldn't define a group
            rows.append({"value": val, "n": len(g), "median_multiple": round(med, 2), "lift": round(med / base, 2),
                         "outlier_rate": round(sum(x["is_outlier"] for x in g) / len(g), 2)})
        groups[k] = sorted(rows, key=lambda r: -r["lift"])
    return {"n": len(vs), "base_multiple": round(base, 2), "groups": groups}


def learn():
    run = Run("learn")
    own_h = {a["handle"] for a in (db("GET", "br_accounts?role=eq.own&select=handle") or [])}
    vs = db("GET", "br_videos?select=id,handle,url,views,multiple,is_outlier,features,posted_at&analyzed_at=not.is.null&limit=5000") or []
    comp, own = [v for v in vs if v["handle"] not in own_h], [v for v in vs if v["handle"] in own_h]
    body = {"computed_at": NOW.isoformat(), "competitors": lifts(comp), "own": lifts(own)}
    db("POST", "br_insights", {"kind": "patterns", "title": "feature lift", "body": body}, "return=minimal")
    top = sorted([v for v in comp if v["is_outlier"]], key=lambda v: -(v["multiple"] or 0))[:15]
    prompt = ("You are GoPeak's market research lead. GoPeak is a height prediction app for teens (Instagram accounts mav.tallteen, maverick.pranks, gopeak.app). "
              "Below is measured data: 'lift' = how many times a feature beats the account's normal views (1.0 = average). 'competitors' = GoTall, HeightGPT and UGC creators; "
              "'own' = our posts. Plus the top outlier videos with their breakdowns. Write what performs, only from this evidence, citing numbers. Each group has n = number of videos: trust n >= 8, call n < 8 'early signal', and never present a single viral video as a pattern. "
              "Return JSON: {headline (max 14 words), what_works: [5 to 7 short findings, each with the number that backs it], what_flops: [2 to 4], "
              "our_gap (max 30 words: what competitors do that we don't), next_posts: [3 concrete post ideas for GoPeak]}. No em dashes or en dashes.\n"
              + json.dumps({"patterns": body, "top_outliers": [{"handle": v["handle"], "views": v["views"], "multiple": v["multiple"], "features": v["features"]} for v in top]})[:60000])
    try:
        s = gemini([{"text": prompt}], 0.3)
        db("POST", "br_insights", {"kind": "summary", "title": no_dashes(s.get("headline", "what performs")), "body": s}, "return=minimal")
    except Exception as e:
        print("summary failed", e, file=sys.stderr)
    run.done(True, f"learned from {len(comp)} competitor + {len(own)} own analyzed videos")


# ---------- agent: predict ----------
def latest(kind):
    r = db("GET", f"br_insights?kind=eq.{kind}&order=created_at.desc&limit=1") or []
    return r[0] if r else None


def predict():
    run = Run("predict")
    pat = (latest("patterns") or {}).get("body") or {}
    summ = (latest("summary") or {}).get("body") or {}
    done = {p["post_id"] for p in (db("GET", "br_predictions?select=post_id") or [])}
    queue = [p for p in (db("GET", "pipe_posts?select=id,account,variant,format,hook,caption,trial,video_url,status,scheduled_at"
                                   "&status=in.(rendered,scheduled)&video_url=not.is.null&order=created_at.desc&limit=60") or []) if p["id"] not in done][:15]
    meds = {a["handle"]: a.get("median_views") for a in (db("GET", "br_accounts?role=eq.own&select=handle,median_views") or [])}
    made = 0
    for p in queue:
        v = {"url": p["video_url"], "video_src": p["video_url"]}
        b = video_bytes(v)
        if b is None:
            continue
        try:
            f = gemini([{"inline_data": {"mime_type": "video/mp4", "data": base64.b64encode(b).decode()}}, {"text": ANALYZE_PROMPT}])
        except Exception as e:
            print("predict analyze failed", e, file=sys.stderr)
            continue
        f["length_bucket"] = length_bucket(f.get("length_sec"))
        logm, used = 0.0, []
        for k in FEATURE_KEYS:
            val = str(f.get(k)).lower()
            for src in ("own", "competitors"):
                g = next((r for r in (pat.get(src, {}).get("groups", {}).get(k) or []) if r["value"] == val), None)
                if g and g["n"] >= 5:
                    raw = min(max(g["lift"], 1 / 3), 3)                 # cap any one feature at 3x either way
                    lift = math.exp(math.log(raw) * g["n"] / (g["n"] + 15))  # shrink small samples toward 1
                    logm += math.log(lift)
                    used.append({"feature": k, "value": val, "lift": round(lift, 2), "from": src, "n": g["n"]})
                    break
        # average effect across the features we have evidence for, scaled up a little for agreement; total capped 0.25x to 4x
        mult = math.exp(logm / max(1, len(used)) * min(3, 1 + len(used) / 4)) if used else 1.0
        mult = min(max(mult, 0.25), 4)
        base = int(meds.get(p["account"]) or 1000)
        exp_v = int(base * mult)
        score = max(1, min(99, round(50 + 24 * math.log2(mult))))
        try:
            critique = gemini([{"text": "GoPeak height app short video about to post. Features: " + json.dumps(f) + "\nWhat performs (measured): " + json.dumps(summ)[:8000]
                                + "\nGive JSON {reasons: [2 or 3 short reasons it will or won't do well], fix: one concrete change that would raise views (max 18 words)}. No em dashes."}], 0.3)
        except Exception:
            critique = {}
        db("POST", "br_predictions?on_conflict=post_id", {"post_id": p["id"], "account": p["account"], "score": score, "expected_views": exp_v,
              "low": int(exp_v * 0.4), "high": int(exp_v * 2.5), "baseline_views": base, "features": f,
              "reasons": {"drivers": sorted(used, key=lambda u: -abs(math.log(u["lift"])))[:5], **{k: no_dashes(x) if isinstance(x, str) else x for k, x in critique.items()}}},
           "resolution=merge-duplicates,return=minimal")
        made += 1
        time.sleep(2)
    # self-check: fill actual views for posts that went live 3+ days ago
    checked = 0
    for pr in db("GET", "br_predictions?select=post_id&actual_views=is.null") or []:
        q = (db("GET", f"pipe_posts?select=status,scheduled_at,results&id=eq.{pr['post_id']}") or [{}])[0]
        url = ((q.get("results") or {}).get("instagram") or {}).get("url")
        if q.get("status") != "posted" or not url or datetime.fromisoformat(q["scheduled_at"]) > NOW - timedelta(days=3):
            continue
        code = url.rstrip("/").split("/reel/")[-1]
        row = (db("GET", f"br_videos?select=views&id=eq.instagram:{code}") or [{}])[0]
        if row.get("views") is not None:
            db("PATCH", f"br_predictions?post_id=eq.{pr['post_id']}", {"actual_views": row["views"], "checked_at": NOW.isoformat()})
            checked += 1
    run.done(True, f"scored {made} queued videos, checked {checked} past predictions")


# ---------- agent: ideas ----------
def ideas(n=5):
    run = Run("ideas")
    summ = (latest("summary") or {}).get("body") or {}
    pat = (latest("patterns") or {}).get("body") or {}
    recent = db("GET", "br_videos?select=handle,url,views,multiple,features&is_outlier=eq.true&analyzed_at=not.is.null&order=first_seen.desc&limit=12") or []
    old = [i["title"] for i in (db("GET", "br_insights?kind=eq.idea&select=title&order=created_at.desc&limit=40") or [])]
    prompt = ("Write " + str(n) + " new short-video ideas for GoPeak (height prediction app; creator is a teen guy filming on his phone; accounts are on Instagram). "
              "Base every idea on the measured evidence below and say which evidence. Avoid repeating these past ideas: " + json.dumps(old) + "\n"
              "Return JSON {ideas: [{title (max 8 words), format, hook (first screen text, max 12 words), on_screen_text, shot_list (3 to 5 steps), "
              "length_sec, trial_reel (true|false), why (max 20 words, cite a number), based_on (urls)}]}. No em dashes or en dashes.\n"
              + json.dumps({"summary": summ, "patterns": pat, "recent_outliers": recent})[:50000])
    out = gemini([{"text": prompt}], 0.7).get("ideas", [])
    for i in out[:n]:
        db("POST", "br_insights", {"kind": "idea", "title": no_dashes(i.get("title", "idea")), "body": {k: no_dashes(x) if isinstance(x, str) else x for k, x in i.items()}}, "return=minimal")
    run.done(True, f"{len(out[:n])} new ideas")


# ---------- agent: creators ----------
def creators():
    run = Run("creators")
    if not APIFY:
        run.done(False, "needs APIFY_TOKEN (hashtag search)")
        return
    items = apify("clockworks~tiktok-scraper", {"hashtags": HASHTAGS, "resultsPerPage": 40, "shouldDownloadVideos": False}, timeout=600)
    known = {(a["platform"], a["handle"]) for a in (db("GET", "br_accounts?select=platform,handle") or [])}
    seen = {i["body"].get("handle") for i in (db("GET", "br_insights?kind=eq.creator&select=body&limit=500") or [])}
    tracked = prospects = 0
    by = {}
    for it in items:
        au = it.get("authorMeta") or {}
        h, plays = au.get("name"), it.get("playCount") or 0
        if not h or ("tiktok", h) in known:
            continue
        ts = it.get("createTime")
        if ts and NOW - datetime.fromtimestamp(ts, timezone.utc) > timedelta(days=45):
            continue
        b = by.setdefault(h, {"handle": h, "followers": au.get("fans"), "best_views": 0, "best_url": None, "caption": "", "app": None})
        if plays > b["best_views"]:
            b.update(best_views=plays, best_url=it.get("webVideoUrl"), caption=(it.get("text") or "")[:200])
        low = ((it.get("text") or "") + " " + h).lower()
        b["app"] = b["app"] or next((v for k, v in APPS.items() if k in low), None)
    for h, b in by.items():
        if b["best_views"] < 50_000:
            continue
        if b["app"]:   # UGC for a competitor app: track it as a research account
            db("POST", "br_accounts?on_conflict=platform,handle", {"handle": h, "platform": "tiktok", "role": "ugc", "brand": b["app"],
               "followers": b["followers"], "note": f"found by creators agent {NOW.date()}"}, "resolution=ignore-duplicates,return=minimal")
            tracked += 1
        elif h not in seen and (b["followers"] or 0) < 100_000:
            b["why"] = f"{b['best_views']:,} views on a height video with {b['followers'] or 0:,} followers"
            db("POST", "br_insights", {"kind": "creator", "title": "@" + h, "body": b}, "return=minimal")
            prospects += 1
    run.done(True, f"{len(items)} hashtag videos: {prospects} new creator prospects, {tracked} competitor UGC accounts now tracked")


# ---------- agent: report ----------
def report():
    run = Run("report")
    daily = http("GET", BOT + "daily.json") or []
    since = (NOW - timedelta(days=14)).date().isoformat()
    views = [r for r in daily if r["day"] >= since]
    live = db("POST", "rpc/hq_live", {}) or {}
    sales = db("POST", "rpc/hq_sales", {}) or []
    preds = db("GET", "br_predictions?select=score,expected_views,low,high,actual_views&actual_views=not.is.null") or []
    summ = (latest("summary") or {}).get("body") or {}
    prompt = ("Write GoPeak's weekly growth report for the founder (a teen; plain words, short). Data: Instagram views per account per day (last 14 days), "
              "app installs per day, trials/paid/revenue in USD per day, prediction accuracy, and what the research brain learned. "
              "Return JSON {headline (max 12 words), numbers: [4 to 6 lines with this week vs last week], what_worked: [3], what_didnt: [2], "
              "next_steps: [5 concrete actions for next week, most useful first]}. Only use numbers from the data. No em dashes or en dashes.\n"
              + json.dumps({"views": views, "installs": (live.get("days") or [])[-14:], "sales": [s for s in sales if s["day"] >= since],
                            "predictions_checked": preds, "brain": summ})[:60000])
    r = gemini([{"text": prompt}], 0.3)
    db("POST", "br_insights", {"kind": "report", "title": no_dashes(r.get("headline", f"week of {NOW.date()}")), "body": r}, "return=minimal")
    run.done(True, "weekly report written")


AGENTS = {"collect": collect, "analyze": analyze, "learn": learn, "predict": predict, "ideas": ideas, "creators": creators, "report": report}

if __name__ == "__main__":
    failed = False
    for name in sys.argv[1:]:
        try:
            AGENTS[name]()
        except Exception as e:
            failed = True
            print(f"[{name}] crashed: {e}", file=sys.stderr)
            try:
                db("POST", "br_runs", {"agent": name, "finished_at": datetime.now(timezone.utc).isoformat(), "ok": False, "summary": str(e)[:600]}, "return=minimal")
            except Exception:
                pass
    sys.exit(1 if failed else 0)
