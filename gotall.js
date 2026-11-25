// GoPeak HQ · GoTall tab: @gotall.app's best recent Instagram reels (data/gotall.json, text + links only).
// Videos + sounds live in iCloud "GoPeak References/gotall instagram". The daily scout refreshes thumbnails.
(() => {
  const css = `
  #p-gotall .gh{margin-top:16px;padding:20px;border-radius:28px;background:var(--card);border:1px solid rgba(255,255,255,.07);box-shadow:0 6px 0 #0a0a0c}
  #p-gotall .gh b.big{display:block;font-size:30px;font-weight:900;letter-spacing:-.6px;margin-top:4px}
  #p-gotall .gh .sub{font-size:13px;font-weight:700;color:var(--dim);margin-top:4px}
  #p-gotall .gst{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}
  #p-gotall .gst div{padding:12px;border-radius:16px;background:#1c1c20}#p-gotall .gst b{display:block;font-size:20px;font-weight:900}#p-gotall .gst span{font-size:11px;font-weight:700;color:var(--dim)}
  #p-gotall .tk{margin:14px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}
  #p-gotall .tk li{padding:12px 14px;border-radius:16px;background:#1c1c20;font-size:14px;font-weight:600;line-height:1.4}
  #p-gotall .gseg{display:flex;gap:6px;margin-top:16px}
  #p-gotall .gseg button{height:36px;padding:0 14px;border-radius:999px;background:var(--card);font-weight:800;font-size:13px;color:var(--dim)}
  #p-gotall .gseg button[aria-pressed=true]{background:#fff;color:#000}
  #p-gotall .gg{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-top:12px}
  #p-gotall .gv{display:flex;flex-direction:column;border-radius:22px;background:var(--card);overflow:hidden;box-shadow:0 5px 0 #0a0a0c;text-align:left;color:#fff;text-decoration:none}
  #p-gotall .gv .im{position:relative;aspect-ratio:9/16;background:#1c1c20;overflow:hidden}
  #p-gotall .gv .im img{width:100%;height:100%;object-fit:cover;display:block}
  #p-gotall .gv .im .fb{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:14px;text-align:center;font-weight:900;font-size:15px;line-height:1.3}
  #p-gotall .gv .vw{position:absolute;left:8px;bottom:8px;padding:4px 9px;border-radius:999px;background:rgba(0,0,0,.72);font-weight:900;font-size:13px}
  #p-gotall .gv .kd{position:absolute;right:8px;top:8px;padding:3px 8px;border-radius:999px;font-size:10px;font-weight:900;letter-spacing:.6px;background:#fff;color:#000}
  #p-gotall .gv .kd.talk{background:#2f8cff;color:#fff}
  #p-gotall .gv .tx{padding:12px}#p-gotall .gv .tx b{display:block;font-size:14px;font-weight:800;line-height:1.3}
  #p-gotall .gv .tx p{margin:6px 0 0;font-size:12px;font-weight:600;color:var(--dim);line-height:1.35}
  #p-gotall .gv .tx small{display:block;margin-top:8px;font-size:11px;font-weight:700;color:var(--dim)}`;
  document.head.append(Object.assign(document.createElement("style"), { textContent: css }));
  const sec = $("#p-gotall");
  let G = null, kind = "all";
  const k = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : n >= 1e3 ? Math.round(n / 1e3) + "K" : String(n ?? 0));
  const day = (d) => new Date(d + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  function render() {
    if (!G) { sec.innerHTML = `<div class="gh"><div class="sub">loading…</div></div>`; return; }
    const list = G.videos.filter((v) => kind === "all" || v.kind === kind);
    sec.innerHTML = `<div class="gh"><div class="label">competitor</div><b class="big">@${esc(G.account)} best reels</b>
        <div class="sub">${esc(G.window)} · last post ${day(G.last_post)}</div>
        <div class="gst"><div><b>${k(G.followers)}</b><span>followers</span></div><div><b>${k(G.median_views)}</b><span>median views</span></div><div><b>${G.videos.length}</b><span>of ${G.reels_checked} reels</span></div></div>
        <ul class="tk">${G.takeaways.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
      <div class="gseg">${[["all", "all"], ["short", "short 6-7s"], ["talking", "talking 30-50s"]].map(([v, l]) => `<button data-k="${v}" aria-pressed="${kind === v}">${l}</button>`).join("")}</div>
      <div class="gg">${list.map((v) => `<a class="gv" href="${esc(v.url)}" target="_blank" rel="noopener">
        <div class="im"><div class="fb">${esc(v.hook)}</div>${v.thumb ? `<img src="${esc(v.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}
          <span class="vw">${k(v.views)}</span><span class="kd ${v.kind === "talking" ? "talk" : ""}">${v.kind === "talking" ? "TALK" : "SHORT"}</span></div>
        <div class="tx"><b>${esc(v.hook)}</b><p>${esc(v.what)}</p><small>${day(v.posted)} · ${v.length_sec}s · ${k(v.comments)} comments</small></div></a>`).join("")}</div>`;
    sec.querySelectorAll("[data-k]").forEach((b) => (b.onclick = () => { kind = b.dataset.k; render(); }));
  }
  render();
  fetch("data/gotall.json?t=" + Date.now()).then((r) => r.json()).then((d) => { G = d; render(); }).catch(() => {});
})();
