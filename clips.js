// GoPeak HQ · Clips tab: the stream clipper (github.com/blackbargoat/stream-clipper).
// Who's live, streams being clipped, every clip (watch, approve, skip), add creators, paste a stream link.
// Data through the 'clips' edge function with the HQ password.
(() => {
  const FN = "https://etdbjahwegsmuelcawgf.supabase.co/functions/v1/clips/";
  const call = (route, body = {}) => fetch(FN + route, { method: "POST", headers: { apikey: KEY, "content-type": "application/json", "x-hq-key": PW || "" }, body: JSON.stringify(body) })
    .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || r.status); return j; });
  const css = `
  #p-clips .ck{display:flex;align-items:center;justify-content:space-between;gap:10px}
  #p-clips .cap{font-size:11px;font-weight:800;letter-spacing:1.1px;text-transform:uppercase;color:var(--dim)}
  #p-clips .src{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
  #p-clips .pill{display:flex;align-items:center;gap:8px;height:40px;padding:0 14px;border-radius:999px;background:var(--card2);font-weight:800;font-size:14px}
  #p-clips .dot{width:9px;height:9px;border-radius:50%;background:#3a3a40}
  #p-clips .dot.on{background:var(--bad)}
  #p-clips .add{display:flex;gap:8px;margin-top:12px}
  #p-clips .add input,#p-clips .add select{flex:1;min-width:0;height:46px;border-radius:14px;border:0;background:var(--card2);color:#fff;font:inherit;font-weight:600;padding:0 14px}
  #p-clips .add select{flex:0 0 110px}
  #p-clips .streams{display:grid;gap:8px;margin-top:12px}
  #p-clips .st{display:grid;grid-template-columns:1fr auto;gap:4px 10px;padding:12px 14px;border-radius:16px;background:var(--card2);font-size:14px}
  #p-clips .st b{font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #p-clips .st small{color:var(--dim);font-weight:600}
  #p-clips .tag{font-size:11px;font-weight:900;letter-spacing:.6px;padding:4px 9px;border-radius:999px;background:#2c2c33;text-transform:uppercase;align-self:center}
  #p-clips .tag.capturing,#p-clips .tag.live{background:var(--bad);color:#fff}#p-clips .tag.done{background:var(--good);color:#000}
  #p-clips .seg{display:flex;gap:6px;margin-top:12px;flex-wrap:wrap}
  #p-clips .seg button{height:36px;padding:0 14px;border-radius:999px;background:var(--card2);font-weight:800;font-size:13px;color:var(--dim)}
  #p-clips .seg button[aria-pressed=true]{background:#fff;color:#000}
  #p-clips .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-top:14px}
  #p-clips .cl{position:relative;aspect-ratio:9/16;border-radius:16px;overflow:hidden;background:#111;padding:0;border:0}
  #p-clips .cl img{width:100%;height:100%;object-fit:cover;display:block}
  #p-clips .cl .t{position:absolute;left:0;right:0;bottom:0;padding:26px 8px 8px;background:linear-gradient(transparent,rgba(0,0,0,.9));font-size:12px;font-weight:800;text-align:left}
  #p-clips .cl .s{position:absolute;left:6px;top:6px;font-size:10px;font-weight:900;padding:3px 8px;border-radius:999px;background:#fff;color:#000;text-transform:uppercase}
  #p-clips .cl .s.approved{background:var(--blue);color:#fff}#p-clips .cl .s.scheduled,#p-clips .cl .s.posted{background:var(--good)}#p-clips .cl .s.skipped{background:#3a3a40;color:#aaa}
  #p-clips .cl .sc{position:absolute;right:6px;top:6px;font-size:10px;font-weight:900;padding:3px 8px;border-radius:999px;background:rgba(0,0,0,.7)}
  .clv video{width:100%;max-height:64vh;border-radius:20px;background:#000;display:block}
  .clv .acts{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}`;
  document.head.insertAdjacentHTML("beforeend", `<style>${css}</style>`);
  const sec = document.getElementById("p-clips");
  sec.innerHTML = `
    <div class="card flat"><div class="ck"><span class="cap">creators</span><span class="cap" style="text-transform:none;letter-spacing:0">red dot = live now</span></div>
      <div class="src" id="csrc"></div>
      <div class="add"><select id="cplat" aria-label="Platform"><option value="youtube">YouTube</option><option value="twitch">Twitch</option></select>
        <input id="chandle" placeholder="@handle or twitch name" aria-label="Creator handle"><button class="btn3d" id="caddsrc">add</button></div></div>
    <div class="card flat"><div class="ck"><span class="cap">clip a stream now</span></div>
      <div class="add"><input id="curl" placeholder="paste a YouTube or Twitch live / VOD link" aria-label="Stream link"><button class="btn3d" id="caddurl">clip it</button></div>
      <div class="streams" id="cstreams"></div></div>
    <div class="card flat"><div class="ck"><span class="cap">clips</span><span class="cap" id="ccount" style="text-transform:none;letter-spacing:0"></span></div>
      <div class="seg" id="cfilter"><button data-f="ready" aria-pressed="true">to post</button><button data-f="approved">approved</button><button data-f="scheduled">posted</button><button data-f="skipped">skipped</button><button data-f="all">all</button></div>
      <div class="grid" id="cgrid"></div></div>`;
  let D = { sources: [], streams: [], clips: [] }, F = "ready";
  const ago = (iso) => { const m = Math.round((Date.now() - Date.parse(iso)) / 60000); return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };
  const mmss = (s) => `${Math.floor(s / 3600) ? Math.floor(s / 3600) + ":" : ""}${String(Math.floor(s % 3600 / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  async function load() { try { D = await call("list"); } catch (e) { console.warn("clips", e); } render(); }
  function render() {
    const liveSrc = new Set(D.streams.filter((s) => ["live", "capturing"].includes(s.status)).map((s) => s.source_id));
    $("#csrc").innerHTML = D.sources.map((s) => `<span class="pill"><i class="dot ${liveSrc.has(s.id) ? "on" : ""}"></i>${esc(s.name)} <small style="color:var(--dim)">${s.platform}</small></span>`).join("") || `<span class="label">no creators yet</span>`;
    $("#cstreams").innerHTML = D.streams.slice(0, 8).map((s) => {
      const n = D.clips.filter((c) => c.stream_id === s.id).length;
      return `<div class="st"><b>${esc(s.title || s.url)}</b><span class="tag ${s.status}">${s.status === "capturing" ? "clipping live" : s.status}</span>
        <small>${n} clip${n === 1 ? "" : "s"} · scanned ${mmss(s.checked_to || 0)} · ${ago(s.created_at)}${s.error ? " · " + esc(s.error).slice(0, 80) : ""}</small></div>`;
    }).join("");
    const list = D.clips.filter((c) => F === "all" || c.status === F || (F === "scheduled" && c.status === "posted"));
    $("#ccount").textContent = `${list.length} shown · ${D.clips.filter((c) => c.status === "ready").length} waiting`;
    $("#cgrid").innerHTML = list.map((c) => `<button class="cl" data-clip="${esc(c.id)}"><img src="${esc(c.thumb_url)}" alt="" loading="lazy">
      <span class="s ${c.status}">${c.status === "ready" ? "new" : c.status}</span><span class="sc">${Number(c.score || 0).toFixed(1)}</span><span class="t">${esc(c.title)}</span></button>`).join("")
      || `<div class="label" style="grid-column:1/-1">nothing here yet. clips show up a few minutes after a creator goes live.</div>`;
    $("#cfilter").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.f === F));
  }
  function openClip(id) {
    const c = D.clips.find((x) => x.id === id); if (!c) return;
    const s = D.streams.find((x) => x.id === c.stream_id);
    openSheet(`<div class="clv"><video src="${esc(c.video_url)}" poster="${esc(c.thumb_url)}" controls playsinline autoplay></video>
      <div style="margin-top:12px;font-weight:800;font-size:17px">${esc(c.title)}</div>
      <div class="label" style="margin-top:6px">${esc(s?.title || "")} · at ${mmss(c.t)} · ${c.duration}s · score ${Number(c.score || 0).toFixed(1)} (${(c.why || []).join(", ")})</div>
      ${["ready", "approved", "skipped"].includes(c.status) ? `<div class="acts"><button class="btn3d ghost" data-s="skipped">skip</button><button class="btn3d" data-s="${c.status === "approved" ? "ready" : "approved"}">${c.status === "approved" ? "unapprove" : "post this"}</button></div>` : `<div class="label" style="margin-top:12px">sent to Buffer ${c.posted_at ? ago(c.posted_at) : ""}</div>`}</div>`);
    $("#sheetBody").querySelectorAll("[data-s]").forEach((b) => (b.onclick = async () => { try { await call("set", { id: c.id, status: b.dataset.s }); toast(b.dataset.s === "skipped" ? "skipped" : b.dataset.s === "approved" ? "goes out next" : "saved"); } catch { toast("didn't save"); } closeSheet(); load(); }));
  }
  sec.addEventListener("click", (e) => {
    const c = e.target.closest("[data-clip]"); if (c) return openClip(c.dataset.clip);
    const f = e.target.closest("#cfilter button"); if (f) { F = f.dataset.f; render(); }
  });
  $("#caddsrc").onclick = async () => {
    const h = $("#chandle").value.trim(); if (!h) return toast("type a handle");
    const plat = $("#cplat").value, name = h.replace(/^@/, "");
    try { await call("source", { name, platform: plat, handle: plat === "youtube" && !h.startsWith("@") ? "@" + h : h.replace(/^@/, plat === "twitch" ? "" : "@") }); $("#chandle").value = ""; toast("watching " + name); load(); } catch { toast("didn't save"); }
  };
  $("#caddurl").onclick = async () => {
    const u = $("#curl").value.trim(); if (!u) return toast("paste a link");
    try { await call("stream", { url: u }); $("#curl").value = ""; toast("clipping it, first clips in ~10 min"); load(); } catch (e) { toast(String(e.message || "didn't save")); }
  };
  document.querySelector('nav.tabs button[data-p="clips"]')?.addEventListener("click", load);
  if (typeof PW !== "undefined" && PW) load();
  setInterval(() => { if (sec.classList.contains("on")) load(); }, 60e3);
})();
