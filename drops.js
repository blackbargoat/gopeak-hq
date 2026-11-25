// GoPeak HQ · @gopeak.app tab. Not the pipeline: drop finished videos, they get scheduled straight away.
// Trial reel by default (max 2 a day, 11a + 7p ET); "normal post" = feed reel (1 a day, 1p ET).
// Server: pipe function routes drop-start / drop-done, rpc hq_drops + hq_drop_set. Publisher: HeightReplyBot publish.yml.
(() => {
  const css = `
  #p-drop .dc{margin-top:16px;padding:20px;border-radius:28px;background:var(--card);border:1px solid rgba(255,255,255,.07);box-shadow:0 6px 0 #0a0a0c}
  #p-drop .dh{display:flex;align-items:center;gap:12px}
  #p-drop .dav{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:#2f8cff;box-shadow:0 4px 0 #1a5fbf;font-weight:900;font-size:16px;color:#fff;flex:none}
  #p-drop .dh b{font-size:20px;font-weight:900;letter-spacing:-.3px}#p-drop .dh small{display:block;font-size:12px;font-weight:700;color:var(--dim);margin-top:2px}
  #p-drop .seg2{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:18px;padding:5px;border-radius:999px;background:#111114}
  #p-drop .seg2 button{height:42px;border-radius:999px;font-weight:800;font-size:14px;color:var(--dim)}
  #p-drop .seg2 button[aria-pressed=true]{background:#2a2a30;color:#fff;box-shadow:0 3px 0 #0a0a0c}
  #p-drop .seg2 button[aria-pressed=true].tr{background:#ffd23f;color:#000;box-shadow:0 3px 0 #b8932a}
  #p-drop textarea{width:100%;min-height:74px;margin-top:12px;padding:12px 14px;border-radius:16px;border:0;background:#1c1c20;color:#fff;font:inherit;font-size:15px;resize:vertical}
  #p-drop .dz{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;width:100%;height:120px;margin-top:12px;border-radius:22px;
    border:2px dashed #34343c;font-weight:800;font-size:15px;color:#fff;transition:border-color .15s,background .15s}
  #p-drop .dz svg{width:26px;height:26px}#p-drop .dz small{font-size:12px;color:var(--dim);font-weight:700}
  #p-drop.dropping .dz{border-color:#2f8cff;background:#14213a}
  #p-drop .ql{display:flex;flex-direction:column;gap:8px;margin-top:12px}
  #p-drop .qr{display:flex;align-items:center;gap:12px;width:100%;padding:10px;border-radius:18px;background:#1c1c20;text-align:left}
  #p-drop .qr .th{width:42px;height:56px;border-radius:10px;background:#111114;overflow:hidden;flex:none}#p-drop .qr .th video{width:100%;height:100%;object-fit:cover}
  #p-drop .qr .tx{min-width:0;flex:1}#p-drop .qr .tx b{display:block;font-size:15px;font-weight:800}
  #p-drop .qr .tx small{display:block;font-size:12px;color:var(--dim);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #p-drop .tg{font-size:10px;font-weight:900;letter-spacing:.8px;padding:4px 8px;border-radius:999px;background:#2a2a30;color:#fff;flex:none}
  #p-drop .tg.tr{background:#ffd23f;color:#000}#p-drop .tg.ok{background:#34c77b;color:#000}#p-drop .tg.bad{background:#ff6b5e;color:#000}
  #p-drop .cap2{font-size:11px;font-weight:800;letter-spacing:1.1px;text-transform:uppercase;color:var(--dim);margin-top:4px}
  #p-drop .none{padding:18px;text-align:center;color:var(--dim);font-weight:700;font-size:14px}
  .dsh .ubar{width:96px;height:8px;border-radius:999px;background:#111114;overflow:hidden;flex:none}
  .dsh .ubar i{display:block;height:100%;width:0;background:#2f8cff;transition:width .2s}.dsh .ubar i.ok{width:100%!important;background:#34c77b}.dsh .ubar i.bad{width:100%!important;background:#ff6b5e}
  .dsh .row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0}.dsh .row b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .dsh textarea{width:100%;min-height:90px;margin-top:10px;padding:12px 14px;border-radius:16px;border:0;background:#1c1c20;color:#fff;font:inherit;font-size:15px}
  .dsh .acts2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}`;
  document.head.append(Object.assign(document.createElement("style"), { textContent: css }));

  const sec = $("#p-drop");
  const FN = "https://etdbjahwegsmuelcawgf.supabase.co/functions/v1/pipe/", PART = 45 * 1024 * 1024;
  const pfn = (route, body) => fetch(FN + route, { method: "POST", headers: { apikey: KEY, "content-type": "application/json", "x-hq-key": PW || "" }, body: JSON.stringify(body) })
    .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || r.status); return j; });
  const put = (url, blob, onp) => new Promise((ok, bad) => {
    const x = new XMLHttpRequest(); x.open("PUT", url); x.setRequestHeader("content-type", "video/mp4");
    x.upload.onprogress = (e) => e.lengthComputable && onp(e.loaded); x.onload = () => (x.status < 300 ? ok() : bad(new Error("upload " + x.status))); x.onerror = () => bad(new Error("connection lost")); x.send(blob);
  });
  const when = (iso) => {
    if (!iso) return "finding a slot";
    const d = new Date(iso), o = { timeZone: "America/New_York" };
    const day = d.toLocaleDateString("en-CA", o), today = new Date().toLocaleDateString("en-CA", o), tom = new Date(Date.now() + 864e5).toLocaleDateString("en-CA", o);
    const t = d.toLocaleTimeString("en-US", { ...o, hour: "numeric", minute: "2-digit" }).replace(":00", "").replace(" ", "").toLowerCase();
    return (day === today ? "today" : day === tom ? "tomorrow" : d.toLocaleDateString("en-US", { ...o, weekday: "short", month: "short", day: "numeric" })) + " " + t;
  };
  const UP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>';
  let D = [], trial = true;

  sec.innerHTML = `<div class="dc">
      <div class="dh"><div class="dav">G</div><div><b>@gopeak.app</b><small>trial reels 2 a day · posts 1 a day</small></div></div>
      <div class="seg2"><button class="tr" data-t="1" aria-pressed="true">trial reel</button><button data-t="0" aria-pressed="false">normal post</button></div>
      <textarea id="dCap" placeholder="caption (optional)" maxlength="2200"></textarea>
      <button class="dz" id="dDrop">${UP}drop videos<small>or tap to pick</small></button>
    </div>
    <div class="dc"><div class="cap2">up next</div><div class="ql" id="dNext"></div></div>
    <div class="dc"><div class="cap2">posted</div><div class="ql" id="dDone"></div></div>`;

  sec.querySelectorAll(".seg2 button").forEach((b) => (b.onclick = () => {
    trial = b.dataset.t === "1"; sec.querySelectorAll(".seg2 button").forEach((x) => x.setAttribute("aria-pressed", x === b));
  }));

  function row(p) {
    const tag = p.status === "posted" ? `<span class="tg ok">LIVE</span>` : p.status === "failed" ? `<span class="tg bad">FAILED</span>`
      : p.trial ? `<span class="tg tr">TRIAL</span>` : `<span class="tg">POST</span>`;
    const vid = p.parts === 1 && p.video_url ? `<video src="${esc(p.video_url)}#t=0.5" preload="metadata" muted playsinline></video>` : "";
    const sub = p.status === "failed" ? (p.error || "didn't post") : p.caption || p.name || "";
    return `<button class="qr" data-d="${esc(p.id)}"><div class="th">${vid}</div><div class="tx"><b>${esc(when(p.scheduled_at))}</b><small>${esc(sub)}</small></div>${tag}</button>`;
  }
  function render() {
    const next = D.filter((p) => p.status !== "posted").sort((a, b) => new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0));
    const done = D.filter((p) => p.status === "posted");
    $("#dNext").innerHTML = next.length ? next.map(row).join("") : `<div class="none">nothing scheduled</div>`;
    $("#dDone").innerHTML = done.length ? done.map(row).join("") : `<div class="none">nothing yet</div>`;
    sec.querySelectorAll("[data-d]").forEach((b) => (b.onclick = () => openDrop(b.dataset.d)));
  }
  async function load() { if (!PW) return; try { D = await rpc("hq_drops", { p_key: PW }); } catch { D = []; } render(); }

  function openDrop(id) {
    const p = D.find((x) => x.id === id); if (!p) return;
    const live = p.status === "posted", sched = p.status === "scheduled", failed = p.status === "failed";
    openSheet(`<div class="dsh"><div class="row"><b>${esc(when(p.scheduled_at))}</b><span class="chip">${live ? "live" : p.trial ? "trial reel" : "normal post"}</span></div>
      ${p.error ? `<div style="color:#ffb020;font-size:14px;font-weight:700">${esc(p.error)}</div>` : ""}
      ${sched || failed ? `<textarea id="dEdit" maxlength="2200" placeholder="caption">${esc(p.caption || "")}</textarea>` : `<div style="font-size:14px;color:var(--dim)">${esc(p.caption || "")}</div>`}
      <div class="acts2">
        ${sched ? `<button class="btn3d ghost" data-a="${p.trial ? "normal" : "trial"}">make it ${p.trial ? "a normal post" : "a trial reel"}</button>` : ""}
        ${failed ? `<button class="btn3d ghost" data-a="retry">try again</button>` : ""}
        ${sched || failed ? `<button class="btn3d ghost" data-a="caption">save caption</button><button class="btn3d ghost" data-a="remove">remove</button>` : ""}
        ${live && p.url ? `<a class="btn3d ghost" href="${esc(p.url)}" target="_blank" rel="noopener">open on instagram</a>` : ""}
      </div></div>`);
    $("#sheetBody").querySelectorAll("[data-a]").forEach((b) => (b.onclick = async () => {
      try { await rpc("hq_drop_set", { p_key: PW, p_id: id, p_action: b.dataset.a, p_caption: $("#dEdit")?.value ?? null }); toast(b.dataset.a === "remove" ? "removed" : "saved"); }
      catch { toast("didn't work"); }
      closeSheet(); load();
    }));
  }

  function upload(files) {
    const cap = $("#dCap").value.trim(), asTrial = trial;
    openSheet(`<div class="dsh"><div class="row"><b>${files.length} video${files.length > 1 ? "s" : ""}</b><span class="chip">${asTrial ? "trial reel" : "normal post"}</span></div>
      ${files.map((f, i) => `<div class="row"><b>${esc(f.name)}</b><div class="ubar"><i id="dub${i}"></i></div></div>`).join("")}</div>`);
    (async () => {
      let ok = 0;
      for (const [i, f] of files.entries()) {
        const bar = () => $("#dub" + i);
        try {
          const parts = Math.max(1, Math.ceil(f.size / PART));
          const { id, urls } = await pfn("drop-start", { size: f.size, parts });
          let sent = 0;
          for (let k = 0; k < parts; k++) {
            const blob = f.slice(k * PART, Math.min(f.size, (k + 1) * PART));
            await put(urls[k], blob, (n) => { const b = bar(); if (b) b.style.width = ((sent + n) / f.size) * 100 + "%"; });
            sent += blob.size;
          }
          await pfn("drop-done", { id, parts, name: f.name, trial: asTrial, caption: cap || null });
          bar()?.classList.add("ok"); ok++;
        } catch (e) { console.warn(e); bar()?.classList.add("bad"); }
      }
      toast(ok === files.length ? "scheduled" : `${files.length - ok} failed, try again`);
      if (ok) $("#dCap").value = "";
      setTimeout(closeSheet, 800); load();
    })();
  }

  const pick = Object.assign(document.createElement("input"), { type: "file", accept: "video/*", multiple: true, hidden: true });
  document.body.append(pick);
  pick.onchange = () => { const f = [...pick.files]; pick.value = ""; if (f.length) upload(f); };
  $("#dDrop").onclick = () => { if (!PW) return toast("sign in to HQ first"); pick.click(); };
  sec.addEventListener("dragover", (e) => { e.preventDefault(); if (e.dataTransfer.types.includes("Files")) sec.classList.add("dropping"); });
  sec.addEventListener("dragleave", (e) => { if (!sec.contains(e.relatedTarget)) sec.classList.remove("dropping"); });
  sec.addEventListener("drop", (e) => {
    e.preventDefault(); sec.classList.remove("dropping"); if (!PW) return toast("sign in to HQ first");
    const f = [...e.dataTransfer.files].filter((x) => x.type.startsWith("video/")); if (f.length) upload(f);
  });
  document.querySelector('nav.tabs button[data-p="drop"]')?.addEventListener("click", load);
  render(); load(); setInterval(load, 60e3);
})();
