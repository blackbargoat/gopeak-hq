// GoPeak HQ · Brain tab: the cloud research agents (agents/brain.py, GitHub Actions) and what they learned.
// Data: rpc hq_brain(p_key). Ideas / creators can be marked used or dismissed (rpc hq_brain_mark).
(() => {
  const css = `
  #p-brain .bc{margin-top:16px;padding:20px;border-radius:28px;background:var(--card);border:1px solid rgba(255,255,255,.07);box-shadow:0 6px 0 #0a0a0c}
  #p-brain .cap3{font-size:11px;font-weight:800;letter-spacing:1.1px;text-transform:uppercase;color:var(--dim)}
  #p-brain h2{margin:6px 0 0;font-size:24px;font-weight:900;letter-spacing:-.4px;line-height:1.2}
  #p-brain .st3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}
  #p-brain .st3 div{padding:12px;border-radius:16px;background:#1c1c20}#p-brain .st3 b{display:block;font-size:20px;font-weight:900}#p-brain .st3 span{font-size:11px;font-weight:700;color:var(--dim)}
  #p-brain .ag{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid #222228}
  #p-brain .ag:first-of-type{border-top:0}
  #p-brain .dot{width:10px;height:10px;border-radius:50%;background:#3a3a40;flex:none}#p-brain .dot.ok{background:#34c77b}#p-brain .dot.bad{background:#ff6b5e}
  #p-brain .ag b{display:block;font-size:15px;font-weight:800}#p-brain .ag small{display:block;font-size:12px;font-weight:600;color:var(--dim);margin-top:2px}
  #p-brain .ag .when{margin-left:auto;font-size:11px;font-weight:800;color:var(--dim);white-space:nowrap}
  #p-brain ul.ls{margin:12px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}
  #p-brain ul.ls li{padding:12px 14px;border-radius:16px;background:#1c1c20;font-size:14px;font-weight:600;line-height:1.4}
  #p-brain ul.ls li.bad{color:#ffb4ad}
  #p-brain .lift{display:grid;grid-template-columns:1fr auto;gap:6px 12px;margin-top:12px;font-size:13px;font-weight:700}
  #p-brain .lift .bar{grid-column:1/-1;height:6px;border-radius:3px;background:#1c1c20;overflow:hidden;margin-bottom:6px}#p-brain .lift .bar i{display:block;height:100%;background:#2f8cff}
  #p-brain .pr{display:flex;gap:12px;padding:12px 0;border-top:1px solid #222228}#p-brain .pr:first-of-type{border-top:0}
  #p-brain .pr .th{width:54px;height:96px;border-radius:12px;background:#1c1c20;overflow:hidden;flex:none}#p-brain .pr .th img,#p-brain .pr .th video{width:100%;height:100%;object-fit:cover}
  #p-brain .sc{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;font-weight:900;font-size:18px;flex:none;background:#1c1c20;box-shadow:inset 0 0 0 4px var(--c,#3a3a40)}
  #p-brain .pr .tx{min-width:0;flex:1}#p-brain .pr .tx b{display:block;font-size:14px;font-weight:800}
  #p-brain .pr .tx small{display:block;font-size:12px;font-weight:600;color:var(--dim);margin-top:3px;line-height:1.35}
  #p-brain .card2{padding:14px;border-radius:18px;background:#1c1c20;margin-top:10px}
  #p-brain .card2 b{display:block;font-size:15px;font-weight:800}#p-brain .card2 p{margin:6px 0 0;font-size:13px;font-weight:600;color:var(--dim);line-height:1.4}
  #p-brain .card2 .row{display:flex;gap:8px;margin-top:10px}#p-brain .card2 .row button,#p-brain .card2 .row a{height:34px;padding:0 14px;border-radius:999px;background:#2a2a30;font-weight:800;font-size:12px;color:#fff;display:inline-flex;align-items:center;text-decoration:none}
  #p-brain .acc{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}#p-brain .acc span{padding:6px 10px;border-radius:999px;background:#1c1c20;font-size:12px;font-weight:700}
  #p-brain .acc span i{font-style:normal;color:var(--dim)}
  #p-brain .none{padding:14px 0 2px;color:var(--dim);font-weight:700;font-size:14px}`;
  document.head.append(Object.assign(document.createElement("style"), { textContent: css }));
  const sec = $("#p-brain");
  const AG = [["collect", "Scout", "scans GoTall, HeightGPT, Taller, UGC creators and our posts"], ["analyze", "Analyst", "watches the videos and tags hook, format, length, app screen"],
    ["learn", "Brain", "finds which features beat normal views"], ["predict", "Predictor", "scores queued videos before they post, checks itself after"],
    ["ideas", "Writer", "turns the research into post ideas + scripts"], ["creators", "Creator finder", "hashtag search for creators that fit GoPeak"],
    ["report", "Weekly report", "Monday: numbers + next steps"]];
  const LBL = { format: "format", hook_type: "hook", talking: "talking", has_app_screen: "shows app", app_screen_when: "app screen at", text_style: "text style",
    setting: "setting", cta: "call to action", audio: "audio", emotion: "vibe", length_bucket: "length" };
  let B = null;
  const k = (n) => (n == null ? "-" : n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : n >= 1e3 ? Math.round(n / 1e3) + "K" : String(Math.round(n)));
  const ago = (t) => { if (!t) return "never"; const m = (Date.now() - new Date(t)) / 6e4; return m < 60 ? Math.round(m) + "m ago" : m < 2880 ? Math.round(m / 60) + "h ago" : Math.round(m / 1440) + "d ago"; };
  const li = (a, cls = "") => (a || []).map((x) => `<li class="${cls}">${esc(x)}</li>`).join("");
  function liftRows(g) {
    const rows = [];
    for (const [key, list] of Object.entries(g || {})) for (const r of list) if (r.n >= 3) rows.push({ key, ...r });
    const top = rows.sort((a, b) => b.lift - a.lift).slice(0, 8), max = Math.max(1, ...top.map((r) => r.lift));
    return top.length ? `<div class="lift">${top.map((r) => `<span>${esc(LBL[r.key] || r.key)}: ${esc(String(r.value).replaceAll("_", " "))} <i style="color:var(--dim);font-style:normal">(${r.n})</i></span><b>${r.lift}x</b><div class="bar"><i style="width:${(100 * r.lift) / max}%"></i></div>`).join("")}</div>` : `<div class="none">needs more analyzed videos</div>`;
  }
  function render() {
    if (!B) { sec.innerHTML = `<div class="bc"><div class="none">loading…</div></div>`; return; }
    const runs = Object.fromEntries((B.runs || []).map((r) => [r.agent, r]));
    const s = B.summary?.body, rep = B.report?.body, pat = B.patterns || {}, acc = B.accuracy || {};
    const comp = (B.accounts || []).filter((a) => a.role !== "own");
    sec.innerHTML = `
      <div class="bc"><div class="cap3">research brain</div><h2>${esc(s?.headline || "learning what performs")}</h2>
        <div class="st3"><div><b>${k(B.counts?.videos)}</b><span>videos tracked</span></div><div><b>${k(B.counts?.analyzed)}</b><span>watched by AI</span></div><div><b>${k(B.counts?.outliers)}</b><span>outliers</span></div></div></div>
      <div class="bc"><div class="cap3">agents · run in the cloud, pc off</div>${AG.map(([id, n, d]) => { const r = runs[id];
        return `<div class="ag"><span class="dot ${r ? (r.ok ? "ok" : "bad") : ""}"></span><div><b>${n}</b><small>${esc(r?.summary || d)}</small></div><span class="when">${ago(r?.finished_at || r?.started_at)}</span></div>`; }).join("")}</div>
      <div class="bc"><div class="cap3">predictions · queued videos</div>
        ${acc.n ? `<div style="font-size:13px;font-weight:700;color:var(--dim);margin-top:8px">checked ${acc.n} after posting · ${acc.within_range} landed in range</div>` : ""}
        ${(B.predictions || []).length ? B.predictions.map((p) => { const c = p.score >= 65 ? "#34c77b" : p.score >= 45 ? "#2f8cff" : "#ff6b5e";
          return `<div class="pr"><div class="th">${p.thumb ? `<img src="${esc(p.thumb)}" alt="" loading="lazy">` : p.video ? `<video src="${esc(p.video)}#t=1" preload="metadata" muted playsinline></video>` : ""}</div>
            <div class="tx"><b>@${esc(p.account)} · ${p.actual != null ? `got ${k(p.actual)}` : `expect ~${k(p.expected)}`}</b><small>${k(p.low)} to ${k(p.high)} views · normal ${k(p.baseline)}${p.trial ? " · trial" : ""}</small>
              <small>${esc((p.reasons?.reasons || []).join(" · "))}</small>${p.reasons?.fix ? `<small style="color:#fff">fix: ${esc(p.reasons.fix)}</small>` : ""}</div>
            <div class="sc" style="--c:${c}">${p.score}</div></div>`; }).join("") : `<div class="none">scores show here when the pipeline queues videos</div>`}</div>
      <div class="bc"><div class="cap3">what performs</div>${s ? `<ul class="ls">${li(s.what_works)}${li(s.what_flops, "bad")}</ul>${s.our_gap ? `<div class="card2"><b>our gap</b><p>${esc(s.our_gap)}</p></div>` : ""}` : `<div class="none">the brain writes this after its first run</div>`}
        <div class="cap3" style="margin-top:18px">biggest lifts · competitors</div>${liftRows(pat.competitors?.groups)}
        <div class="cap3" style="margin-top:18px">biggest lifts · our posts</div>${liftRows(pat.own?.groups)}</div>
      <div class="bc"><div class="cap3">ideas + scripts</div>${(B.ideas || []).length ? B.ideas.map((i) => `<div class="card2"><b>${esc(i.title)}</b>
          <p><b style="display:inline;font-size:13px">hook:</b> ${esc(i.body?.hook || "")}</p><p>${esc((i.body?.shot_list || []).join(" → "))}</p><p>${esc(i.body?.why || "")}</p>
          <div class="row"><button data-m="${i.id}" data-s="used">${i.status === "used" ? "used ✓" : "mark used"}</button><button data-m="${i.id}" data-s="dismissed">dismiss</button></div></div>`).join("") : `<div class="none">ideas arrive after the first daily run</div>`}</div>
      <div class="bc"><div class="cap3">creators that fit</div>${(B.creators || []).length ? B.creators.map((c) => `<div class="card2"><b>${esc(c.title)} <span style="color:var(--dim);font-weight:700">${k(c.body?.followers)} followers</span></b>
          <p>${esc(c.body?.why || "")}</p><div class="row">${c.body?.best_url ? `<a href="${esc(c.body.best_url)}" target="_blank" rel="noopener">their video</a>` : ""}<button data-m="${c.id}" data-s="used">${c.status === "used" ? "contacted ✓" : "contacted"}</button><button data-m="${c.id}" data-s="dismissed">dismiss</button></div></div>`).join("") : `<div class="none">the creator finder runs on Mondays (needs Apify)</div>`}</div>
      <div class="bc"><div class="cap3">weekly report</div>${rep ? `<h2 style="font-size:20px">${esc(B.report.title)}</h2><ul class="ls">${li(rep.numbers)}</ul><div class="cap3" style="margin-top:14px">next steps</div><ul class="ls">${li(rep.next_steps)}</ul>` : `<div class="none">first report on Monday</div>`}</div>
      <div class="bc"><div class="cap3">accounts the scout watches</div><div class="acc">${comp.map((a) => `<span>${a.platform === "instagram" ? "ig" : "tt"} @${esc(a.handle)} <i>${esc(a.brand || "")} · ${a.last_scanned ? "median " + k(a.median_views) : a.platform === "instagram" ? "needs apify" : "not scanned"}</i></span>`).join("")}</div></div>`;
    sec.querySelectorAll("[data-m]").forEach((b) => (b.onclick = async () => { try { await rpc("hq_brain_mark", { p_key: PW, p_id: +b.dataset.m, p_status: b.dataset.s }); } catch { toast("didn't save"); } load(); }));
  }
  async function load() { if (!PW) return; try { B = await rpc("hq_brain", { p_key: PW }); } catch { B = null; } render(); }
  document.querySelector('nav.tabs button[data-p="brain"]')?.addEventListener("click", load);
  render(); load(); setInterval(load, 120e3);
})();
