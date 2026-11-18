// GoPeak HQ · Pipeline tab. Raw clip → cut → style → queue → live, scheduled across both accounts.
// Look: solid HQ cards (no glass), 3D buttons.
// Data: rpc hq_pipe(p_key) in production; on localhost it reads the pipeline's local preview file.
(() => {
  const css = `
  /* palette: split-complementary off the brand blue (212°): blue = @maverick.pranks, coral (5°) = @mav.tallteen, yellow (52°) = trial reel */
  #p-pipe{--pa:#2f8cff;--pa-d:#1a5fbf;--pb:#ff6b5e;--pb-d:#c2443a;--tr:#ffd23f;--tr-d:#b8932a;--edge:#0a0a0c}
  #p-pipe .glass{position:relative;margin-top:16px;padding:20px;border-radius:28px;background:var(--card);
    border:1px solid rgba(255,255,255,.07);box-shadow:0 6px 0 var(--edge),0 18px 30px -12px rgba(0,0,0,.8);
    transform:perspective(1200px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .6s cubic-bezier(.2,.8,.2,1)}
  #p-pipe .hd{display:flex;align-items:center;justify-content:space-between;gap:10px}
  #p-pipe .cap{font-size:11px;font-weight:800;letter-spacing:1.1px;text-transform:uppercase;color:var(--dim)}
  #p-pipe button:active{transform:translateY(2px)}
  .when{display:flex;gap:8px;margin-top:14px}.when input{flex:1;min-width:0;height:48px;border-radius:14px;border:0;background:#1c1c20;color:#fff;font:inherit;font-weight:700;padding:0 12px;color-scheme:dark}.when .btn3d{flex:none}
  #p-pipe .gbtn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;height:52px;margin-top:18px;border-radius:999px;font-weight:800;font-size:15px;color:#fff;
    background:var(--pa);box-shadow:0 5px 0 var(--pa-d);transition:transform .12s,box-shadow .12s}
  #p-pipe .gbtn:active{transform:translateY(4px);box-shadow:0 1px 0 var(--pa-d)}
  #p-pipe .gbtn svg{width:20px;height:20px}

  /* pipeline: 3D discs on a straight track */
  #p-pipe .rail{display:grid;grid-template-columns:auto 1fr auto 1fr auto 1fr auto 1fr auto;align-items:start;margin-top:20px}
  #p-pipe .st{display:flex;flex-direction:column;align-items:center;gap:10px;width:62px}
  #p-pipe .orb{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:#1c1c20;box-shadow:0 5px 0 var(--edge)}
  #p-pipe .orb svg{width:24px;height:24px;stroke:#5a5a63;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  #p-pipe .orb.on{background:var(--pa);box-shadow:0 5px 0 var(--pa-d)}#p-pipe .orb.on svg{stroke:#fff}
  #p-pipe .orb.o-live.on{background:var(--tr);box-shadow:0 5px 0 var(--tr-d)}#p-pipe .orb.o-live.on svg{stroke:#000}
  #p-pipe .st b{font-size:22px;font-weight:900;letter-spacing:-.5px;font-variant-numeric:tabular-nums;line-height:1}
  #p-pipe .st b.zero{color:#3a3a40}
  #p-pipe .st small{font-size:10px;font-weight:800;letter-spacing:.9px;text-transform:uppercase;color:var(--dim)}
  #p-pipe .plink{position:relative;height:4px;margin:26px 4px 0;border-radius:2px;background:#26262c;overflow:hidden}
  #p-pipe .plink::after{content:"";position:absolute;right:-1px;top:-4px;border:6px solid transparent;border-left:7px solid #26262c;border-right:0}
  #p-pipe .plink i{position:absolute;top:0;left:-20px;width:18px;height:4px;border-radius:2px;background:#fff;opacity:.85;animation:travel 2.2s cubic-bezier(.5,0,.5,1) infinite}
  #p-pipe .plink.off i{display:none}
  @keyframes travel{from{left:-20px}to{left:100%}}

  /* segmented controls */
  #p-pipe .seg{position:relative;display:inline-flex;padding:4px;border-radius:999px;background:#111114;box-shadow:inset 0 2px 4px rgba(0,0,0,.6)}
  #p-pipe .seg.full{display:flex;width:100%;margin-top:14px}#p-pipe .seg.full button{flex:1}
  #p-pipe .seg button{position:relative;z-index:1;height:36px;padding:0 14px;border-radius:999px;font-size:13px;font-weight:800;color:var(--dim);display:flex;align-items:center;justify-content:center;gap:6px;transition:color .2s}
  #p-pipe .seg button[aria-pressed=true]{color:#000}
  #p-pipe .seg button svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
  #p-pipe .seg .thumb{position:absolute;top:4px;bottom:4px;border-radius:999px;background:#fff;box-shadow:0 3px 0 #9a9aa2;transition:left .45s cubic-bezier(.34,1.4,.64,1),width .45s cubic-bezier(.34,1.4,.64,1)}
  #p-pipe .seg[data-v=trial] .thumb{background:var(--tr);box-shadow:0 3px 0 var(--tr-d)}
  #p-pipe .nav{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:800}
  #p-pipe .nav b{min-width:92px;text-align:center}
  #p-pipe .nav button{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#1c1c20;box-shadow:0 3px 0 var(--edge)}
  #p-pipe .nav svg{width:16px;height:16px;stroke:#fff;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}

  /* totals + mix */
  #p-pipe .tot{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}
  #p-pipe .tot div{border-radius:18px;padding:12px 6px 10px;text-align:center;background:#1c1c20;box-shadow:0 4px 0 var(--edge)}
  #p-pipe .tot b{display:block;font-size:24px;font-weight:900;letter-spacing:-.6px;font-variant-numeric:tabular-nums}
  #p-pipe .tot span{font-size:10px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--dim)}
  #p-pipe .tot .k-tr b{color:var(--tr)}#p-pipe .tot .k-a b{color:var(--pa)}#p-pipe .tot .k-b b{color:var(--pb)}
  #p-pipe .mix{display:grid;gap:10px;margin-top:16px}
  #p-pipe .mx{display:grid;grid-template-columns:20px 92px 1fr 22px;align-items:center;gap:10px;font-size:12px;font-weight:800;color:var(--dim)}
  #p-pipe .mx svg{width:18px;height:18px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  #p-pipe .mx .bar{position:relative;height:10px;border-radius:999px;background:#111114}
  #p-pipe .mx .bar i{position:absolute;left:0;top:0;bottom:0;border-radius:999px;background:#fff;transition:width .6s cubic-bezier(.2,.8,.2,1)}
  #p-pipe .mx .bar u{position:absolute;top:-4px;bottom:-4px;width:2px;border-radius:2px;background:var(--dim)}
  #p-pipe .mx b{color:#fff;text-align:right;font-variant-numeric:tabular-nums}

  /* account + type marks (used everywhere) */
  #p-pipe .a1{--ac:var(--pa)}#p-pipe .a2{--ac:var(--pb)}
  #p-pipe .lbl{position:absolute;left:6px;top:6px;height:20px;padding:0 8px;border-radius:999px;display:flex;align-items:center;font-size:10px;font-weight:900;letter-spacing:.6px;background:#fff;color:#000}
  #p-pipe .lbl.tr{background:var(--tr)}

  /* today */
  #p-pipe .acc{display:flex;align-items:center;gap:12px;margin-top:14px}
  #p-pipe .av{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-weight:900;font-size:17px;flex:none;color:#fff;background:var(--ac);box-shadow:0 4px 0 var(--edge)}
  #p-pipe .an{display:flex;flex-direction:column;gap:2px;min-width:150px;flex:none;font-size:13px;font-weight:800;white-space:nowrap}
  #p-pipe .an small{color:var(--dim);font-size:11px}
  #p-pipe .slots{display:grid;grid-template-columns:repeat(3,minmax(0,118px));gap:10px;flex:1}
  #p-pipe .slot{position:relative;aspect-ratio:9/16;border-radius:16px;overflow:hidden;padding:0;background:#1c1c20;border:3px solid var(--ac,#26262c);box-shadow:0 5px 0 var(--edge)}
  #p-pipe .slot img{width:100%;height:100%;object-fit:cover;display:block}
  #p-pipe .slot.open{border:2px dashed #2c2c33;background:transparent;box-shadow:none}
  #p-pipe .slot .t{position:absolute;left:0;right:0;bottom:0;padding:18px 6px 7px;text-align:center;font-size:12px;font-weight:900;background:linear-gradient(transparent,rgba(0,0,0,.85))}
  #p-pipe .slot.open .t{background:none;color:#4a4a52;top:50%;bottom:auto;transform:translateY(-50%);padding:0}
  #p-pipe .done{position:absolute;top:6px;right:6px;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:var(--good)}
  #p-pipe .done svg{width:12px;height:12px}

  /* week */
  #p-pipe .week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin-top:16px}
  #p-pipe .wd{display:flex;flex-direction:column;gap:6px;align-items:center}
  #p-pipe .wd .dh{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10px;font-weight:800;letter-spacing:.8px;color:var(--dim)}
  #p-pipe .wd .dh b{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:13px;color:#fff;letter-spacing:0}
  #p-pipe .wd .dh.today b{background:#fff;color:#000;box-shadow:0 3px 0 #9a9aa2}
  #p-pipe .mini{position:relative;width:100%;max-width:46px;aspect-ratio:9/16;border-radius:9px;overflow:hidden;padding:0;border:2.5px solid var(--ac);box-shadow:0 3px 0 var(--edge)}
  #p-pipe .mini img{width:100%;height:100%;object-fit:cover;display:block}
  #p-pipe .mini .ty{position:absolute;left:0;right:0;bottom:0;height:12px;display:grid;place-items:center;font-size:7.5px;font-weight:900;letter-spacing:.4px;background:#fff;color:#000}
  #p-pipe .mini .ty.tr{background:var(--tr)}
  #p-pipe .mini.dim{opacity:.15}
  #p-pipe .mini.open{width:6px;height:6px;aspect-ratio:auto;border:0;border-radius:50%;background:#2c2c33;box-shadow:none;margin:6px 0}
  #p-pipe .wsep{width:60%;height:2px;border-radius:2px;background:#26262c;margin:2px 0}

  /* month */
  #p-pipe .month{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin-top:16px}
  #p-pipe .month .dn{font-size:10px;font-weight:800;letter-spacing:.8px;color:var(--dim);text-align:center}
  #p-pipe .mday{aspect-ratio:1/1.08;border-radius:14px;padding:6px;display:flex;flex-direction:column;gap:5px;align-items:flex-start;background:#1c1c20;box-shadow:0 4px 0 var(--edge)}
  #p-pipe .mday.out{opacity:.25}
  #p-pipe .mday.today{background:#fff;color:#000;box-shadow:0 4px 0 #9a9aa2}
  #p-pipe .mday b{font-size:12px;font-weight:900}
  #p-pipe .dots{display:flex;flex-wrap:wrap;gap:3px}
  #p-pipe .dots i{width:8px;height:8px;border-radius:50%;background:var(--ac)}
  #p-pipe .dots i.tr{box-shadow:0 0 0 2px var(--tr)}

  #p-pipe .legend{display:flex;flex-wrap:wrap;justify-content:center;gap:16px;margin-top:18px;font-size:12px;font-weight:800;color:var(--dim)}
  #p-pipe .legend span{display:flex;align-items:center;gap:7px}
  #p-pipe .legend i{width:14px;height:14px;border-radius:4px}
  #p-pipe .legend em{font-style:normal;height:16px;padding:0 6px;border-radius:999px;font-size:9px;font-weight:900;display:grid;place-items:center;color:#000}

  /* clips */
  #p-pipe .clips{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px}
  @media (min-width:1000px){#p-pipe .clips{grid-template-columns:repeat(8,1fr)}}
  #p-pipe .clip{position:relative;aspect-ratio:9/16;border-radius:16px;overflow:hidden;box-shadow:0 5px 0 var(--edge)}
  #p-pipe .clip img{width:100%;height:100%;object-fit:cover;display:block}
  #p-pipe .pips{position:absolute;left:0;right:0;bottom:0;padding:16px 0 8px;display:flex;justify-content:center;gap:5px;background:linear-gradient(transparent,rgba(0,0,0,.85))}
  #p-pipe .pips i{width:10px;height:10px;border-radius:50%;background:#3a3a40}
  #p-pipe .pips i.a1{background:var(--pa)}#p-pipe .pips i.a2{background:var(--pb)}


  #p-pipe .st{padding:0;background:none;border:0;cursor:pointer}
  #p-pipe .orb{position:relative}
  #p-pipe .gear{position:absolute;right:-4px;bottom:-2px;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;background:#2c2c33;box-shadow:0 2px 0 var(--edge)}
  #p-pipe .gear svg{width:12px!important;height:12px!important;stroke:#fff!important;stroke-width:2.4}
  #p-pipe .st:hover .orb{transform:translateY(-2px)}
  /* agent panel (sheet) */
  .ag{--pa:#2f8cff;--pa-d:#1a5fbf;--pb:#ff6b5e;--tr:#ffd23f;--tr-d:#b8932a;--edge:#0a0a0c}
  .ag .top{display:flex;align-items:center;gap:14px}
  .ag .top .ico{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:var(--pa);box-shadow:0 4px 0 var(--pa-d);flex:none}
  .ag .top .ico svg{width:24px;height:24px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  .ag .top h3{font-size:22px;font-weight:900;letter-spacing:-.4px}
  .ag .top p{font-size:13px;font-weight:600;color:var(--dim);margin-top:3px;line-height:1.35}
  .ag .grp{margin-top:18px;background:#1c1c20;border-radius:20px;padding:4px 14px;box-shadow:0 4px 0 var(--edge)}
  .ag .gt{font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--dim);margin:20px 4px -8px}
  .ag .arow{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-top:1px solid #26262c}
  .ag .arow:first-child{border-top:0}
  .ag .arow b{display:block;font-size:14px;font-weight:800}
  .ag .arow small{display:block;font-size:12px;font-weight:600;color:var(--dim);margin-top:2px;line-height:1.3}
  .ag .sw{position:relative;width:52px;height:32px;border-radius:999px;background:#2c2c33;flex:none;transition:background .2s}
  .ag .sw::after{content:"";position:absolute;left:3px;top:3px;width:26px;height:26px;border-radius:50%;background:#fff;box-shadow:0 2px 0 #9a9aa2;transition:left .3s cubic-bezier(.34,1.4,.64,1)}
  .ag .sw[aria-checked=true]{background:var(--pa)}.ag .sw[aria-checked=true]::after{left:23px}
  .ag .stp{display:flex;align-items:center;gap:8px;flex:none}
  .ag .stp button{width:32px;height:32px;border-radius:50%;background:#2c2c33;font-size:18px;font-weight:900;box-shadow:0 3px 0 var(--edge)}
  .ag .stp b{min-width:26px;text-align:center;font-size:17px}
  .ag .mixrow{padding:12px 0;border-top:1px solid #26262c}.ag .mixrow:first-child{border-top:0}
  .ag .mixrow .between{font-size:14px;font-weight:800}
  .ag .mixrow input{width:100%;margin-top:10px;accent-color:var(--pa)}
  .ag .times{display:flex;gap:8px;flex-wrap:wrap}
  .ag .times input{height:38px;border-radius:12px;border:0;background:#2c2c33;color:#fff;font:800 14px var(--font);padding:0 10px;color-scheme:dark}
  .ag .txt{width:100%;height:42px;border-radius:12px;border:0;background:#2c2c33;color:#fff;font:700 14px var(--font);padding:0 12px;margin-top:8px}
  .ag .learn{display:grid;gap:10px;padding:12px 0}
  .ag .lr{display:grid;grid-template-columns:96px 1fr 44px;gap:10px;align-items:center;font-size:12px;font-weight:800}
  .ag .lr .bars{display:grid;gap:4px}
  .ag .lr .bars i{display:block;height:8px;border-radius:999px;background:var(--pa)}
  .ag .lr .bars i.you{background:#3a3a40}
  .ag .lr span{color:var(--dim)}
  .ag .lr b{text-align:right}
  .ag .note{font-size:12px;font-weight:600;color:var(--dim);line-height:1.4;padding:4px 4px 0}
  .ag .save{margin-top:20px;width:100%}
  .ag .folder{display:flex;align-items:center;gap:10px;padding:12px 0}
  .ag .folder b{flex:1;font-size:14px}

  /* formats + sounds */
  #p-pipe .fmts{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:14px}
  #p-pipe .fmt{position:relative;padding:0;text-align:left;background:none;border:0;cursor:pointer}
  #p-pipe .fmt .im{position:relative;aspect-ratio:9/16;border-radius:16px;overflow:hidden;background:#1c1c20;box-shadow:0 5px 0 var(--edge)}
  #p-pipe .fmt img{width:100%;height:100%;object-fit:cover;display:block}
  #p-pipe .fmt b{display:block;margin-top:10px;font-size:13px;font-weight:800}
  #p-pipe .st-chip{position:absolute;left:8px;top:8px;height:22px;padding:0 9px;border-radius:999px;display:flex;align-items:center;font-size:10px;font-weight:900;letter-spacing:.6px;text-transform:uppercase;background:#fff;color:#000}
  #p-pipe .st-chip.approved{background:#34c759;color:#000}#p-pipe .st-chip.new{background:var(--tr)}#p-pipe .st-chip.review{background:#3a3a40;color:#fff}
  #p-pipe .snds{display:grid;gap:8px;margin-top:14px}
  #p-pipe .snd{display:grid;grid-template-columns:40px 1fr auto;align-items:center;gap:12px;padding:10px 12px;border-radius:16px;background:#1c1c20;box-shadow:0 3px 0 var(--edge)}
  #p-pipe .snd .ic{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:#2c2c33;font-size:18px}
  #p-pipe .snd b{display:block;font-size:14px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #p-pipe .snd small{display:block;font-size:12px;font-weight:600;color:var(--dim);margin-top:2px}
  #p-pipe .snd .u{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}
  #p-pipe .snd .u span{font-size:10px;font-weight:800;padding:2px 7px;border-radius:999px;background:#2c2c33}
  #p-pipe .snd a{height:34px;padding:0 14px;border-radius:999px;display:flex;align-items:center;font-size:12px;font-weight:800;background:#fff;color:#000;box-shadow:0 3px 0 #9a9aa2;white-space:nowrap}
  #p-pipe .snd a.off{background:#2c2c33;color:var(--dim);box-shadow:none}
  @media (max-width:440px){nav.tabs button{width:52px!important;font-size:10px}#p-pipe .an{display:none}#p-pipe .st{width:48px}#p-pipe .orb{width:46px;height:46px}#p-pipe .tot{grid-template-columns:repeat(2,1fr)}}
  @media (prefers-reduced-motion:reduce){#p-pipe *{animation:none!important;transition:none!important}}

  .pv video{width:100%;max-height:62vh;border-radius:22px;background:#000;display:block}
  .pv .meta{display:flex;align-items:center;gap:10px;margin-top:14px}
  .pv .hook{font-weight:800;font-size:16px;line-height:1.3;margin-top:10px;white-space:pre-line}
  .pv .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
  .pv .acts{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}
  .pv .pvav{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-weight:900;font-size:14px;color:#fff}
  .pv .daylist{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px}
  .pv .dslot{position:relative;aspect-ratio:9/16;border-radius:16px;overflow:hidden;padding:0;border:3px solid}
  .pv .dslot img{width:100%;height:100%;object-fit:cover;display:block}
  .pv .dslot span{position:absolute;left:0;right:0;bottom:0;padding:14px 6px 6px;background:linear-gradient(transparent,rgba(0,0,0,.85));font-size:11px;font-weight:800}

  #p-pipe.dropping #pfac{outline:3px dashed var(--pa);outline-offset:4px}
  #p-pipe .clip{padding:0;border:0;background:#1c1c20;cursor:pointer}
  #p-pipe .cst{position:absolute;left:6px;top:6px;height:20px;padding:0 8px;border-radius:999px;display:flex;align-items:center;font-size:10px;font-weight:900;letter-spacing:.4px;background:#fff;color:#000}
  #p-pipe .cst.processing{background:var(--pa);color:#fff}#p-pipe .cst.failed{background:var(--pb);color:#fff}
  .ag.up .ubar{width:96px;height:8px;border-radius:999px;background:#111114;overflow:hidden;flex:none}
  .ag.up .ubar i{display:block;height:100%;width:0;background:#2f8cff;transition:width .2s}
  .ag.up .ubar i.ok{width:100%!important;background:#34c77b}.ag.up .ubar i.bad{width:100%!important;background:#ff6b5e}
  .ag.up .wants{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}
  .ag.up .want{text-align:left;padding:12px 14px;border-radius:18px;background:#1c1c20;box-shadow:0 4px 0 #0a0a0c;color:#fff}
  .ag.up .want:first-child{grid-column:1/-1}
  .ag.up .want b{display:block;font-size:14px;font-weight:800}.ag.up .want small{display:block;font-size:12px;font-weight:600;color:var(--dim);margin-top:2px}
  .ag.up .want[aria-pressed=true]{background:#2f8cff;box-shadow:0 4px 0 #1a5fbf}.ag.up .want[aria-pressed=true] small{color:rgba(255,255,255,.8)}
  .ag.up .save{width:100%;margin-top:18px}
  .pv .rm[data-sure]{background:#ff6b5e;color:#fff;box-shadow:0 4px 0 #c2443a}
  .pv .mslots{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .pv .mslot{position:relative;height:56px;border-radius:16px;background:#1c1c20;box-shadow:0 4px 0 #0a0a0c;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden}
  .pv .mslot b{font-size:13px;font-weight:800;position:relative}.pv .mslot small{font-size:10px;font-weight:700;color:var(--dim);position:relative}
  .pv .mslot img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.28}
  .pv .mslot.now{background:#ffd23f;color:#000;box-shadow:0 4px 0 #b8932a}.pv .mslot.now small{color:rgba(0,0,0,.6)}
  `;
  document.head.insertAdjacentHTML("beforeend", `<style>${css}</style>`);

  // ---------- icons (line icons, no emoji) ----------
  const I = {
    inbox: '<path d="M4 13l2.5-7h11L20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M4 13h4l1.5 2.5h5L16 13h4"/>',
    cut: '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M8.2 15 18 4M15.8 15 6 4"/>',
    style: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    plan: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    live: '<path d="M4 12l16-8-6 16-3-7z"/>',
    trial: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/><path d="M7.5 15h9"/>',
    post: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M10 9l5 3-5 3z"/>',
    live2: '<circle cx="12" cy="12" r="3"/><path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4"/>',
    bait: '<path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z"/>',
    peek: '<path d="M20 11a7 7 0 0 1-10.2 6.2L5 18.5l1.2-4A7 7 0 1 1 20 11z"/><rect x="13" y="12" width="8" height="10" rx="2" fill="#1c1c20"/>',
    app: '<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M10 6h4M9.5 16.5v-3M12 16.5v-6M14.5 16.5v-4"/>',
    remake: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 9h18M8 5l-2 4M14 5l-2 4M20 5l-2 4"/>',
    up: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    prev: '<path d="M15 5l-7 7 7 7"/>',
    next: '<path d="M9 5l7 7-7 7"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    check: '<path d="M5 12l5 5 9-10" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  };
  const ic = (k, extra = "") => `<svg viewBox="0 0 24 24" ${extra}>${I[k]}</svg>`;

  const ACC = { "maverick.pranks": { n: "M", c: "a1", col: "#2f8cff", name: "pranks" }, "mav.tallteen": { n: "T", c: "a2", col: "#ff6b5e", name: "tallteen" } };
  const ACCS = Object.keys(ACC);
  const FORMATS = [["comment_bait", "bait", 0.3, "comment bait"], ["bait_peek", "peek", 0.25, "bait + peek"], ["app_reveal", "app", 0.25, "app reveal"], ["text_remake", "remake", 0.2, "remake"]];
  const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const tz = "America/New_York";
  const dayKey = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
  const hm = (d) => new Date(d).toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).replace(":00", "").replace(" ", "").toLowerCase();
  const ls = { get: (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  let P = null, VIEW = ls.get("pipe-view", "week"), TYPE = ls.get("pipe-type", "all"), OFF = 0;
  const DAY = 864e5;
  const CLIP_ST = { uploading: "uploading", queued: "waiting", processing: "editing", ready: "done", failed: "failed", archived: "hidden" };
  const noonOf = (key) => new Date(key + "T12:00:00");
  const isTrial = (p) => !!p.trial;
  const keep = (p) => TYPE === "all" || (TYPE === "trial" ? isTrial(p) : !isTrial(p));

  // ---------- layout ----------
  const sec = document.getElementById("p-pipe");
  sec.innerHTML = `
    <div class="glass tilt" id="pfac">
      <div class="hd"><span class="cap">pipeline</span><span class="cap" style="text-transform:none;letter-spacing:0">tap a step to change how it works</span></div>
      <div class="rail" id="prail"></div>
      <button class="gbtn" id="pdrop">${ic("up", 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"')}upload clips</button>
    </div>
    <div class="glass tilt"><div class="hd"><span class="cap">today</span></div><div id="ptoday"></div></div>
    <div class="glass tilt" id="pcalCard">
      <div class="hd"><div class="seg" id="pview" role="group" aria-label="Range"><span class="thumb"></span><button data-v="week">week</button><button data-v="month">month</button></div>
        <div class="nav"><button id="pprev" aria-label="Previous">${ic("prev")}</button><b id="prange"></b><button id="pnext" aria-label="Next">${ic("next")}</button></div></div>
      <div class="seg full" id="ptype" role="group" aria-label="Type"><span class="thumb"></span><button data-v="all">all</button><button data-v="trial">${ic("trial")}trial reels</button><button data-v="post">${ic("post")}posts</button></div>
      <div class="tot" id="ptot"></div>
      <div class="mix" id="pmix"></div>
      <div id="pcal"></div>
      <div class="legend"><span><i style="background:var(--pa)"></i>@maverick.pranks</span><span><i style="background:var(--pb)"></i>@mav.tallteen</span><span><em style="background:var(--tr)">TRIAL</em>trial reel</span><span><em style="background:#fff">POST</em>feed post</span></div>
    </div>
    <div class="glass tilt"><div class="hd"><span class="cap">formats</span><span class="cap" style="text-transform:none;letter-spacing:0">tap to watch</span></div><div class="fmts" id="pfmts"></div></div>
    <div class="glass tilt"><div class="hd"><span class="cap">sounds</span><span class="cap" style="text-transform:none;letter-spacing:0">add these in the TikTok app when you post</span></div><div class="snds" id="psnds"></div></div>
    <div class="glass tilt"><div class="hd"><span class="cap">clips</span><span class="cap">5 videos each</span></div><div class="clips" id="pclips"></div></div>`;

  // ---------- interaction: small 3D tilt (max ~1.5°) ----------
  const fine = matchMedia("(pointer:fine)").matches && !matchMedia("(prefers-reduced-motion:reduce)").matches;
  if (fine) {
    sec.addEventListener("pointermove", (e) => {
      const g = e.target.closest(".glass"); if (!g) return;
      const r = g.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      g.style.setProperty("--ry", `${x * 1.6}deg`); g.style.setProperty("--rx", `${-y * 1.2}deg`);
    });
    sec.addEventListener("pointerout", (e) => { const g = e.target.closest?.(".glass"); if (g && !g.contains(e.relatedTarget)) { g.style.setProperty("--rx", "0deg"); g.style.setProperty("--ry", "0deg"); } });
  }

  function moveThumb(seg) {
    const on = seg.querySelector("button[aria-pressed=true]"), th = seg.querySelector(".thumb");
    if (!on || !th) return;
    th.style.left = on.offsetLeft + "px"; th.style.width = on.offsetWidth + "px";
  }

  // ---------- pipeline rail ----------
  function rail(c) {
    const steps = [["inbox", c.inbox, "inbox"], ["cut", c.cut, "cut"], ["style", c.style, "style"], ["plan", c.plan, "queued"], ["live", c.post, "live"]];
    return steps.map(([k, n, name], i) => {
      const st = `<button class="st" data-agent="${k}" aria-label="${name} settings"><div class="orb o-${k} ${n ? "on" : ""}">${ic(k)}<span class="gear">${ic("gear")}</span></div><b class="${n ? "" : "zero"}">${n}</b><small>${name}</small></button>`;
      if (i === steps.length - 1) return st;
      const moving = n > 0 || steps.slice(i + 1).some((s) => s[1] > 0);
      return st + `<div class="plink ${moving ? "" : "off"}"><i style="animation-delay:${-i * 0.45}s"></i></div>`;
    }).join("");
  }

  async function loadPipe() {
    try {
      if (LOCAL) P = await (await fetch("/GoPeakPipeline/out/hq-preview.json", { cache: "no-store" })).json();
      else if (typeof PW !== "undefined" && PW) P = await rpc("hq_pipe", { p_key: PW });
    } catch (e) { console.warn("pipe", e); }
    render();
  }

  function render() {
    const posts = (P?.posts || []).filter((p) => p.status !== "skipped");
    const clips = P?.clips || [];
    const now = Date.now();
    const c = {
      inbox: clips.filter((x) => x.status === "queued" || x.status === "uploading").length,
      cut: clips.filter((x) => x.status === "processing").length,
      style: posts.filter((p) => p.status === "rendered").length,
      plan: posts.filter((p) => p.status === "scheduled").length,
      post: posts.filter((p) => p.status === "posted").length,
    };
    $("#prail").innerHTML = rail(c);

    const slots = P?.settings?.trial_slots || P?.settings?.slots || ["07:00", "19:00"];
    const today = dayKey(new Date());
    const at = (acc, day) => posts.filter((p) => p.account === acc && p.scheduled_at && dayKey(new Date(p.scheduled_at)) === day).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
    const slotLbl = (s) => { const [h, m] = s.split(":").map(Number); return `${h % 12 || 12}${m ? ":" + String(m).padStart(2, "0") : ""}${h < 12 ? "a" : "p"}`; };
    $("#ptoday").innerHTML = ACCS.map((acc) => {
      const list = at(acc, today);
      const cells = slots.map((s, i) => {
        const p = list[i];
        if (!p) return `<div class="slot open"><span class="t">${slotLbl(s)}</span></div>`;
        return `<button class="slot ${ACC[acc].c}" data-post="${esc(p.id)}"><img src="${esc(p.thumb_url)}" alt="">${isTrial(p) ? `<span class="lbl tr">TRIAL</span>` : `<span class="lbl">POST</span>`}${p.status === "posted" ? `<span class="done">${ic("check")}</span>` : ""}<span class="t">${hm(p.scheduled_at)}</span></button>`;
      }).join("");
      const n = list.length, t = list.filter(isTrial).length;
      return `<div class="acc ${ACC[acc].c}"><div class="av">${ACC[acc].n}</div><div class="an">@${acc}<small>${n ? `${t} trial · ${n - t} post` : "nothing today"}</small></div><div class="slots">${cells}</div></div>`;
    }).join("");

    renderCal(posts, slots, today);

    $("#pclips").innerHTML = clips.length ? clips.map((cl) => {
      const used = posts.filter((p) => p.clip_id === cl.id);
      const pips = [...Array(5)].map((_, i) => `<i class="${used[i] ? ACC[used[i].account]?.c : ""}"></i>`).join("");
      const st = ["uploading", "queued", "processing", "failed"].includes(cl.status) ? `<span class="cst ${cl.status}">${CLIP_ST[cl.status]}</span>` : "";
      return `<button class="clip" data-clip="${esc(cl.id)}">${cl.thumb_url ? `<img src="${esc(cl.thumb_url)}" alt="" loading="lazy">` : ""}${st}<div class="pips">${pips}</div></button>`;
    }).join("") : `<div class="empty" style="grid-column:1/-1">no clips yet</div>`;

    sec.querySelectorAll("[data-post]").forEach((b) => (b.onclick = () => openPost(b.dataset.post)));
    requestAnimationFrame(() => sec.querySelectorAll(".seg").forEach(moveThumb));
  }

  // ---------- calendar: week / month, trial reels vs posts ----------
  function rangeDays() {
    const t = noonOf(dayKey(new Date()));
    if (VIEW === "week") {
      const start = new Date(t.getTime() - ((t.getDay() + 6) % 7) * DAY + OFF * 7 * DAY);
      const end = new Date(start.getTime() + 6 * DAY);
      return { days: [...Array(7)].map((_, i) => new Date(start.getTime() + i * DAY)),
        label: `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", start.getMonth() === end.getMonth() ? { day: "numeric" } : { month: "short", day: "numeric" })}` };
    }
    const m = new Date(t.getFullYear(), t.getMonth() + OFF, 1, 12);
    const start = new Date(m.getTime() - ((m.getDay() + 6) % 7) * DAY);
    const cells = [...Array(42)].map((_, i) => new Date(start.getTime() + i * DAY));
    return { days: cells[35].getMonth() === m.getMonth() ? cells : cells.slice(0, 35), month: m.getMonth(), label: m.toLocaleDateString("en-US", { month: "long", year: "numeric" }) };
  }
  function renderCal(posts, slots, today) {
    document.querySelectorAll("#pview button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === VIEW));
    document.querySelectorAll("#ptype button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === TYPE)); $("#ptype").dataset.v = TYPE;
    const R = rangeDays();
    $("#prange").textContent = R.label;
    const inRange = new Set(R.days.filter((d) => R.month == null || d.getMonth() === R.month).map(dayKey));
    const visible = posts.filter((p) => p.scheduled_at && inRange.has(dayKey(new Date(p.scheduled_at))));
    const tr = visible.filter(isTrial).length, po = visible.length - tr, live = visible.filter((p) => p.status === "posted").length;
    const na = visible.filter((p) => p.account === "maverick.pranks").length;
    $("#ptot").innerHTML = `<div class="k-tr"><b>${tr}</b><span>trial reels</span></div><div><b>${po}</b><span>feed posts</span></div><div class="k-a"><b>${na}</b><span>pranks</span></div><div class="k-b"><b>${visible.length - na}</b><span>tallteen</span></div>`;
    $("#pmix").innerHTML = FORMATS.map(([f, k, tgt, name]) => {
      const n = visible.filter((p) => (p.format || "text_remake") === f).length, sh = visible.length ? n / visible.length : 0;
      return `<div class="mx" title="${name}: ${n} · target ${Math.round(tgt * 100)}%">${ic(k)}<span>${name}</span><div class="bar"><i style="width:${Math.round(sh * 100)}%"></i><u style="left:${tgt * 100}%"></u></div><b>${n}</b></div>`;
    }).join("");
    const onDay = (k) => posts.filter((p) => p.scheduled_at && dayKey(new Date(p.scheduled_at)) === k).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
    const thumb = (p) => `<button draggable="${!["posted", "posting"].includes(p.status)}" class="mini ${ACC[p.account]?.c} ${keep(p) ? "" : "dim"}" data-post="${esc(p.id)}" title="${esc(`@${p.account} · ${hm(p.scheduled_at)} · ${isTrial(p) ? "trial reel" : "post"}`)}"><img src="${esc(p.thumb_url)}" alt="" loading="lazy"><span class="ty ${isTrial(p) ? "tr" : ""}">${isTrial(p) ? "TRIAL" : "POST"}</span></button>`;
    if (VIEW === "week") {
      $("#pcal").innerHTML = `<div class="week">${R.days.map((d) => {
        const k = dayKey(d), list = onDay(k);
        const col = ACCS.map((acc) => { const mine = list.filter((p) => p.account === acc);
          return slots.map((_, i) => (mine[i] ? thumb(mine[i]) : `<div class="mini open"></div>`)).join(""); }).join(`<div class="wsep"></div>`);
        return `<div class="wd"><div class="dh ${k === today ? "today" : ""}">${d.toLocaleDateString("en-US", { weekday: "narrow" })}<b>${d.getDate()}</b></div>${col}</div>`;
      }).join("")}</div>`;
    } else {
      const head = ["M", "T", "W", "T", "F", "S", "S"].map((x) => `<div class="dn">${x}</div>`).join("");
      $("#pcal").innerHTML = `<div class="month">${head}${R.days.map((d) => {
        const k = dayKey(d), list = onDay(k).filter(keep);
        const dots = list.map((p) => `<i class="${ACC[p.account]?.c} ${isTrial(p) ? "tr" : ""}"></i>`).join("");
        return `<button class="mday ${d.getMonth() !== R.month ? "out" : ""} ${k === today ? "today" : ""}" data-day="${k}"><b>${d.getDate()}</b><div class="dots">${dots}</div></button>`;
      }).join("")}</div>`;
      $("#pcal").querySelectorAll("[data-day]").forEach((b) => (b.onclick = () => openDay(b.dataset.day, onDay(b.dataset.day))));
    }
  }
  function openDay(key, list) {
    openSheet(`<div class="pv"><div class="label">${noonOf(key).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</div>
      ${list.length ? `<div class="daylist">${list.map((p) => `<button class="dslot" data-post="${esc(p.id)}" style="border-color:${ACC[p.account].col}"><img src="${esc(p.thumb_url)}" alt=""><span>${isTrial(p) ? "trial · " : "post · "}${hm(p.scheduled_at)}</span></button>`).join("")}</div>` : `<div class="empty">nothing scheduled</div>`}</div>`);
    $("#sheetBody").querySelectorAll("[data-post]").forEach((x) => (x.onclick = () => openPost(x.dataset.post)));
  }
  document.addEventListener("click", (e) => {
    const v = e.target.closest("#pview button"), t = e.target.closest("#ptype button");
    if (v) { VIEW = v.dataset.v; OFF = 0; ls.set("pipe-view", VIEW); render(); }
    if (t) { TYPE = t.dataset.v; ls.set("pipe-type", TYPE); render(); }
    if (e.target.closest("#pprev")) { OFF--; render(); }
    if (e.target.closest("#pnext")) { OFF++; render(); }
  });
  addEventListener("resize", () => sec.querySelectorAll(".seg").forEach(moveThumb));
  document.querySelector('nav.tabs button[data-p="pipe"]')?.addEventListener("click", () => requestAnimationFrame(() => sec.querySelectorAll(".seg").forEach(moveThumb)));


  // ---------- agents: tap a step to change how it works (saved to pipe_settings.agents) ----------
  const AG_DEFAULT = {
    inbox: { auto: true },
    cut: { trimSetup: true, cutSilence: true, strength: "normal" },
    style: { usesPerClip: 5, perAccountMax: 3, learn: true, mix: { comment_bait: 0.3, bait_peek: 0.25, app_reveal: 0.25, text_remake: 0.2 },
      vary: { mirror: true, crop: true, speed: true, grade: true, audio: true, caption: true }, cta: "your full prediction in the app, link in bio" },
    queue: { slots: ["07:00", "19:00"], gapDays: 2, notSameDay: true },
    live: { autopilot: false, tiktok: "drafts", instagram: "trial", graduateAt: 10000 },
  };
  const merge = (a, b) => { const o = { ...a }; for (const k in b || {}) o[k] = b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) ? merge(a[k] || {}, b[k]) : b[k]; return o; };
  const agents = () => merge(AG_DEFAULT, LOCAL ? JSON.parse(ls.get("pipe-agents", "{}")) : P?.settings?.agents);
  const AG_INFO = {
    inbox: ["inbox", "Clips you upload here wait for the cloud editor, which checks every 5 minutes."],
    cut: ["cut", "Trims the phone setup at the start and end, and cuts silent gaps in talking clips."],
    style: ["style", "Turns one clip into several videos: picks references, text, audio, and makes each one a little different."],
    plan: ["queue", "Puts every video into a posting slot so no clip shows up twice too close together."],
    live: ["live", "Posts on schedule: Instagram as trial reels, TikTok to your drafts so you add the sound."],
  };
  const sw = (path, on) => `<button class="sw" role="switch" aria-checked="${!!on}" data-path="${path}"></button>`;
  const stp = (path, v, min, max) => `<div class="stp"><button data-step="${path}" data-d="-1" data-min="${min}" data-max="${max}">−</button><b>${v}</b><button data-step="${path}" data-d="1" data-min="${min}" data-max="${max}">+</button></div>`;
  const row = (title, sub, control) => `<div class="arow"><div><b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</div>${control}</div>`;
  function agentBody(k, A) {
    if (k === "inbox") return `<div class="grp">${row("Start editing on its own", "As soon as an upload finishes", sw("inbox.auto", A.inbox.auto))}</div>
      <button class="btn3d save" style="width:100%;margin-top:14px" onclick="document.getElementById('pdrop').click()">upload clips</button>`;
    if (k === "cut") return `<div class="grp">${row("Trim the phone setup", "Removes you setting the phone down and picking it up", sw("cut.trimSetup", A.cut.trimSetup))}
      ${row("Cut silences", "Only for talking clips", sw("cut.cutSilence", A.cut.cutSilence))}</div>`;
    if (k === "style") {
      const L = P?.settings?.learned || {};
      const names = { comment_bait: "comment bait", bait_peek: "bait + peek", app_reveal: "app reveal", text_remake: "remake" };
      const lm = L.mix || A.style.mix;
      const learnRows = Object.keys(names).map((f) => { const st = L.stats?.[f];
        return `<div class="lr"><span>${names[f]}</span><div class="bars"><i style="width:${Math.round((lm[f] || 0) * 100)}%"></i><i class="you" style="width:${Math.round(A.style.mix[f] * 100)}%"></i></div><b>${Math.round((lm[f] || 0) * 100)}%</b></div>
          ${st ? `<div class="note" style="margin:-4px 0 0 106px">${st.posts} videos · ${fmt(st.medianViews)} typical views · ${st.commentsPer1k} comments per 1k</div>` : ""}`; }).join("");
      return `<div class="gt">how many videos per clip</div><div class="grp">${row("Videos from one clip", "2 feed posts + the rest as trial reels", stp("style.usesPerClip", A.style.usesPerClip, 1, 12))}
        ${row("Max per account", "", stp("style.perAccountMax", A.style.perAccountMax, 1, 6))}</div>
        <div class="gt">make each trial reel different</div><div class="grp">
        ${row("Mirror the video", "Flips you left to right (text stays normal)", sw("style.vary.mirror", A.style.vary.mirror))}
        ${row("Zoom and crop a little", "", sw("style.vary.crop", A.style.vary.crop))}
        ${row("Speed ±3%", "", sw("style.vary.speed", A.style.vary.speed))}
        ${row("Color tweak", "", sw("style.vary.grade", A.style.vary.grade))}
        ${row("Switch the audio", "Uses another sound from the same kind of video", sw("style.vary.audio", A.style.vary.audio))}
        ${row("Change the caption a little", "Emoji, punctuation, the comment line", sw("style.vary.caption", A.style.vary.caption))}</div>
        <div class="gt">content mix</div><div class="grp">
        ${row("Let it learn", "Shifts the mix toward what gets views and comments", sw("style.learn", A.style.learn))}
        ${A.style.learn ? `<div class="learn">${learnRows}<div class="note">Blue = what it will post. Grey = your setting. ${esc(L.basis || "Learns from both accounts' stats")}.</div></div>` :
          Object.keys(names).map((f) => `<div class="mixrow"><div class="between"><span>${names[f]}</span><span>${Math.round(A.style.mix[f] * 100)}%</span></div><input type="range" min="0" max="100" value="${Math.round(A.style.mix[f] * 100)}" data-mix="${f}"></div>`).join("")}</div>
        <div class="gt">end card</div><div class="grp" style="padding:12px 14px"><input class="txt" data-text="style.cta" value="${esc(A.style.cta)}" style="margin:0"></div>`;
    }
    if (k === "plan") return `<div class="gt">post times (eastern)</div><div class="grp" style="padding:14px"><div class="times">${A.queue.slots.map((t, i) => `<input type="time" value="${t}" data-slot="${i}">`).join("")}</div></div>
      <div class="grp">${row("Days before reusing a clip", "On the same account", stp("queue.gapDays", A.queue.gapDays, 1, 7))}
      ${row("Never the same clip on both accounts the same day", "", sw("queue.notSameDay", A.queue.notSameDay))}</div>`;
    if (k === "live") return `<div class="grp">${row("Autopilot", "Post on schedule without asking", sw("live.autopilot", A.live.autopilot))}
      ${row("Instagram", "Trial reels first (only non-followers see them)", `<span class="chip" style="background:#ffd23f;color:#000">TRIAL</span>`)}
      ${row("TikTok", "Sent to drafts so you add the trending sound", `<span class="chip">DRAFTS</span>`)}
      ${row("Move a trial reel to the feed at", "Views in the first 48 hours", stp("live.graduateAt", fmt(A.live.graduateAt), 1, 100))}</div>`;
    return "";
  }
  function setPath(o, path, v) { const ks = path.split("."); let x = o; ks.slice(0, -1).forEach((k) => (x = x[k] ??= {})); x[ks.at(-1)] = v; }
  function getPath(o, path) { return path.split(".").reduce((x, k) => x?.[k], o); }
  async function saveAgents(A) {
    if (LOCAL) { ls.set("pipe-agents", JSON.stringify(A)); return; }
    try { await rpc("hq_pipe_agents_save", { p_key: PW, p_agents: A }); P.settings.agents = A; } catch { toast?.("didn't save"); }
  }
  function openAgent(k) {
    const A = agents();
    const [name, desc] = AG_INFO[k];
    const draw = () => {
      openSheet(`<div class="ag"><div class="top"><div class="ico">${ic(k)}</div><div><h3>${name}</h3><p>${desc}</p></div></div>${agentBody(k, A)}
        <button class="btn3d save" data-save>save</button></div>`);
      const body = $("#sheetBody");
      body.querySelectorAll("[data-path]").forEach((b) => (b.onclick = () => { setPath(A, b.dataset.path, !getPath(A, b.dataset.path)); draw(); }));
      body.querySelectorAll("[data-step]").forEach((b) => (b.onclick = () => {
        const p = b.dataset.step, big = p === "live.graduateAt";
        const cur = getPath(A, p), d = +b.dataset.d * (big ? 2500 : 1);
        setPath(A, p, big ? Math.max(2500, Math.min(250000, cur + d)) : Math.max(+b.dataset.min, Math.min(+b.dataset.max, cur + d))); draw();
      }));
      body.querySelectorAll("[data-mix]").forEach((r) => (r.oninput = () => {
        A.style.mix[r.dataset.mix] = +r.value / 100;
        const t = Object.values(A.style.mix).reduce((a, b) => a + b, 0) || 1;
        r.closest(".mixrow").querySelector(".between span:last-child").textContent = Math.round((+r.value / 100 / t) * 100) + "%";
      }));
      body.querySelectorAll("[data-slot]").forEach((x) => (x.onchange = () => (A.queue.slots[+x.dataset.slot] = x.value)));
      body.querySelectorAll("[data-text]").forEach((x) => (x.oninput = () => setPath(A, x.dataset.text, x.value)));
      body.querySelector("[data-save]").onclick = async () => {
        const t = Object.values(A.style.mix).reduce((a, b) => a + b, 0) || 1;
        for (const f in A.style.mix) A.style.mix[f] = +(A.style.mix[f] / t).toFixed(3);
        await saveAgents(A); closeSheet(); toast?.("saved"); render();
      };
    };
    draw();
  }
  sec.addEventListener("click", (e) => { const b = e.target.closest("[data-agent]"); if (b) openAgent(b.dataset.agent); });


  // ---------- formats + sounds (data/formats.json, written by GoPeakPipeline/scripts/hq-formats.mjs) ----------
  let FM = null;
  const ST = { approved: "approved", fixed: "re-check", new: "new", review: "review" };
  async function loadFormats() {
    try { FM = await (await fetch("data/formats.json", { cache: "no-store" })).json(); } catch { FM = null; }
    if (!FM) return;
    $("#pfmts").innerHTML = FM.formats.map((f) => `<button class="fmt" data-fmt="${esc(f.key)}"><div class="im"><img src="${esc(f.poster)}" alt="" loading="lazy"><span class="st-chip ${f.status}">${ST[f.status] || f.status}</span></div><b>${esc(f.name)}</b></button>`).join("");
    $("#psnds").innerHTML = FM.sounds.map((x) => `<div class="snd"><div class="ic">♪</div><div style="min-width:0"><b>${esc(x.name || "original audio")}</b><small>${esc(x.creator)} · ${fmt(x.views)} views</small>${x.usedBy.length ? `<div class="u">${x.usedBy.map((u) => `<span>${esc(u)}</span>`).join("")}</div>` : ""}</div>${x.tiktok ? `<a href="${esc(x.tiktok)}" target="_blank" rel="noopener">open on TikTok</a>` : `<a class="off" href="${esc(x.video || "#")}" target="_blank" rel="noopener">see reel</a>`}</div>`).join("");
    $("#pfmts").querySelectorAll("[data-fmt]").forEach((b) => (b.onclick = () => {
      const f = FM.formats.find((x) => x.key === b.dataset.fmt);
      const snd = FM.sounds.filter((x) => x.usedBy.includes(f.name) || (f.key === "bait_peek" && x.usedBy.includes("Bait + peek")));
      openSheet(`<div class="pv"><video src="${esc(f.video)}" poster="${esc(f.poster)}" controls playsinline autoplay></video>
        <div class="meta"><b style="font-size:18px">${esc(f.name)}</b><span class="chip" style="margin-left:auto">${ST[f.status] || f.status}</span></div>
        <div class="hook" style="font-weight:600;color:#c7c7cf">${esc(f.desc)}</div>
        ${snd.length ? `<div class="chips">${snd.slice(0, 4).map((x) => x.tiktok ? `<a class="chip" href="${esc(x.tiktok)}" target="_blank" rel="noopener">♪ ${esc(x.name)}</a>` : "").join("")}</div>` : ""}</div>`);
    }));
  }

  // ET wall clock <-> ISO for the schedule picker
  const toLocal = (iso) => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(iso)).map((x) => [x.type, x.value])); return `${p.year}-${p.month}-${p.day}T${String(+p.hour % 24).padStart(2, "0")}:${p.minute}`; };
  const fromLocal = (v) => { const g = new Date(v + ":00Z"); const l = toLocal(g.toISOString()); return new Date(g.getTime() - (new Date(l + ":00Z") - g)).toISOString(); };
  // ---------- moving posts: next open slots for the post's account (trial or feed times), swap when taken ----------
  const set = (body) => rpc("hq_pipe_post_set", { p_key: PW, p_scheduled_at: null, p_status: null, p_trial: null, ...body });
  function slotChoices(p) {
    const S = p.trial ? P?.settings?.trial_slots || ["07:00", "19:00"] : P?.settings?.feed_slots || ["12:00", "17:00"];
    const soon = Date.now() + 5 * 60e3, out = [{ at: new Date(Date.now() + 60e3), label: "now", now: true }];
    for (let d = 0; d < 8 && out.length < 9; d++) {
      const day = dayKey(new Date(Date.now() + d * DAY));
      for (const t of S) {
        const at = new Date(fromLocal(`${day}T${t}`));
        if (+at < soon || (p.scheduled_at && Math.abs(new Date(p.scheduled_at) - at) < 60e3)) continue;
        const other = P.posts.find((q) => q.id !== p.id && q.account === p.account && q.scheduled_at && q.status === "scheduled" && Math.abs(new Date(q.scheduled_at) - at) < 60e3);
        const label = (d === 0 ? "today" : d === 1 ? "tmrw" : at.toLocaleDateString("en-US", { timeZone: tz, weekday: "short" })) + " " + hm(at);
        out.push({ at, other, label });
        if (out.length >= 9) break;
      }
    }
    return out;
  }
  async function movePost(p, at, other) {
    if (LOCAL) return;
    if (other) {
      // the other post takes this one's old time, or goes back to waiting if this one had none
      if (p.scheduled_at) await set({ p_id: other.id, p_scheduled_at: p.scheduled_at, p_status: "scheduled" });
      else await set({ p_id: other.id, p_status: "rendered" });
    }
    await set({ p_id: p.id, p_scheduled_at: at.toISOString(), p_status: "scheduled" });
  }
  // desktop: drag a post onto another post in the week view to swap their times
  sec.addEventListener("dragstart", (e) => { const m = e.target.closest(".mini[data-post]"); if (m) e.dataTransfer.setData("text/gp-post", m.dataset.post); });
  sec.addEventListener("drop", async (e) => {
    const id = e.dataTransfer.getData("text/gp-post"), t = e.target.closest(".mini[data-post]");
    if (!id || !t || t.dataset.post === id) return;
    e.stopPropagation(); e.preventDefault();
    const a = P.posts.find((x) => x.id === id), b = P.posts.find((x) => x.id === t.dataset.post);
    if (!a || !b || a.account !== b.account || !b.scheduled_at || [a.status, b.status].some((s) => ["posted", "posting"].includes(s))) return toast?.("same account, not posted yet");
    try { await movePost(a, new Date(b.scheduled_at), b); toast?.("swapped"); } catch { toast?.("didn't save"); }
    loadPipe();
  }, true);

  function openPost(id) {
    const p = P.posts.find((x) => x.id === id); if (!p) return;
    const fmt = FORMATS.find((f) => f[0] === p.format);
    openSheet(`<div class="pv">
      <video src="${esc(p.video_url)}" poster="${esc(p.thumb_url)}" controls playsinline autoplay></video>
      <div class="meta"><div class="pvav" style="background:${ACC[p.account].col}">${ACC[p.account].n}</div>
        <b>@${esc(p.account)}</b><span class="chip" style="margin-left:auto">${p.scheduled_at ? new Date(p.scheduled_at).toLocaleString("en-US", { timeZone: tz, weekday: "short", hour: "numeric", minute: "2-digit" }) : "unscheduled"}</span></div>
      <div class="hook">${esc(p.hook)}</div>
      <div class="chips">${p.trial ? `<span class="chip" style="background:#ffd23f;color:#000">TRIAL REEL</span>` : `<span class="chip" style="background:#fff;color:#000">FEED POST</span>`}${fmt ? `<span class="chip">${fmt[3]}</span>` : ""}${(p.platforms || []).map((x) => `<span class="chip">${esc(x)}</span>`).join("")}${p.music ? `<span class="chip">♪ ${esc(p.music)}</span>` : ""}</div>
      ${p.sound?.url ? `<a class="btn3d ghost" style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:12px;height:48px" href="${esc(p.sound.url)}" target="_blank" rel="noopener">♪ use this sound on TikTok · ${esc(p.sound.name || "")}</a>` : ""}
      ${p.error ? `<div class="hook" style="color:#ffb020">${esc(p.error)}</div>` : ""}
      ${p.results?.instagram?.url ? `<a class="btn3d ghost" style="display:flex;align-items:center;justify-content:center;margin-top:12px;height:48px" href="${esc(p.results.instagram.url)}" target="_blank" rel="noopener">open on instagram</a>` : ""}
      ${["posted", "posting"].includes(p.status) ? "" : `<div class="when"><input type="datetime-local" id="pwhen" value="${p.scheduled_at ? toLocal(p.scheduled_at) : ""}" step="900"><button class="btn3d" data-act="time">schedule</button></div>
      <div class="gt" style="margin:16px 4px 8px">move to</div><div class="mslots">${slotChoices(p).map((c, i) => `<button class="mslot${c.other ? " taken" : ""}${c.now ? " now" : ""}" data-slot="${i}">${c.other ? `<img src="${esc(c.other.thumb_url)}" alt="">` : ""}<b>${c.label}</b><small>${c.now ? "next check" : c.other ? "swap" : "free"}</small></button>`).join("")}</div>
      <div class="acts">
        <button class="btn3d ghost rm" data-act="skip">remove</button>
        <button class="btn3d" data-act="approve">${p.status === "scheduled" ? "unapprove" : "approve"}</button></div>`}
      ${p.video_url ? `<button class="btn3d ghost" id="psave" style="width:100%;margin-top:10px;height:48px">save video</button>` : ""}</div>`);
    // Save to camera roll: the file is fetched as soon as the sheet opens, so the tap can open the share sheet
    // right away (iPhone only allows it straight from a tap). Share sheet > Save Video puts it in Photos.
    let file = null;
    if (p.video_url) fetch(p.video_url).then((r) => r.blob()).then((b) => (file = new File([b], `gopeak-${p.variant.replace(/[^\w-]+/g, "")}.mp4`, { type: "video/mp4" }))).catch(() => {});
    const sv = $("#psave");
    if (sv) sv.onclick = async () => {
      if (!file) { sv.textContent = "loading video, tap again in a sec"; return; }
      try {
        if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); return; }
        const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(file), download: file.name });
        document.body.append(a); a.click(); a.remove(); sv.textContent = "downloaded";
      } catch (e) { if (e.name !== "AbortError") window.open(p.video_url, "_blank", "noopener"); }
    };
    const choices = slotChoices(p);
    $("#sheetBody").querySelectorAll("[data-slot]").forEach((b) => (b.onclick = async () => {
      const c = choices[+b.dataset.slot];
      try { await movePost(p, c.at, c.other); toast?.(c.other ? "swapped" : "moved"); } catch { toast?.("didn't save"); }
      closeSheet(); loadPipe();
    }));
    $("#sheetBody").querySelectorAll("[data-act]").forEach((b) => (b.onclick = async () => {
      const a = b.dataset.act;
      // remove asks twice so a stray tap can't take a video off the schedule
      if (a === "skip" && !b.dataset.sure) { b.dataset.sure = "1"; b.textContent = "tap again to remove"; return; }
      const body = { p_key: PW, p_id: p.id, p_scheduled_at: null, p_status: null, p_trial: null };
      if (a === "skip") body.p_status = "skipped";
      else if (a === "trial") body.p_trial = !p.trial;
      else if (a === "time") { const v = $("#pwhen").value; if (!v) { toast?.("pick a day and time"); return; } body.p_scheduled_at = fromLocal(v); body.p_status = "scheduled"; }
      else body.p_status = p.status === "scheduled" ? "rendered" : "scheduled";
      if (!LOCAL) { try { await rpc("hq_pipe_post_set", body); toast?.(a === "time" ? "scheduled" : a === "skip" ? "removed" : a === "approve" && body.p_status === "scheduled" ? "approved" : "saved"); } catch { toast?.("didn't save"); } }
      closeSheet(); loadPipe();
    }));
  }

  // ---------- upload raw clips: split into 45 MB parts (storage caps one file at 50 MB), signed URLs from the pipe function ----------
  const PIPE_FN = "https://etdbjahwegsmuelcawgf.supabase.co/functions/v1/pipe/";
  const PART = 45 * 1024 * 1024;
  const pfn = (route, body) => fetch(PIPE_FN + route, { method: "POST", headers: { apikey: KEY, "content-type": "application/json", "x-hq-key": PW || "" }, body: JSON.stringify(body) })
    .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || r.status); return j; });
  const putPart = (url, blob, onp) => new Promise((ok, bad) => {
    const x = new XMLHttpRequest(); x.open("PUT", url); x.setRequestHeader("content-type", "application/octet-stream");
    x.upload.onprogress = (e) => e.lengthComputable && onp(e.loaded); x.onload = () => (x.status < 300 ? ok() : bad(new Error("upload " + x.status))); x.onerror = () => bad(new Error("connection lost")); x.send(blob);
  });
  const mb = (n) => (n / 1e6).toFixed(n > 1e8 ? 0 : 1) + " MB";
  function openUpload(files) {
    let busy = false;
    const draw = () => {
      openSheet(`<div class="ag up"><div class="top"><div class="ico">${ic("up")}</div><div><h3>new clips</h3><p>Each one becomes 2 feed posts and 3 trial reels. They show up here for you to approve in about 10 minutes.</p></div></div>
        <div class="gt">clips</div><div class="grp">${files.map((f, i) => `<div class="arow"><div style="min-width:0"><b style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(f.name)}</b><small>${mb(f.size)}</small></div><div class="ubar"><i id="ub${i}"></i></div></div>`).join("")}</div>
        <button class="btn3d save" id="ugo">${busy ? "uploading…" : `upload ${files.length} clip${files.length > 1 ? "s" : ""}`}</button></div>`);
      $("#ugo").onclick = go;
    };
    async function go() {
      if (busy) return; busy = true; $("#ugo").textContent = "uploading…"; $("#ugo").disabled = true;
      let ok = 0;
      for (const [i, f] of files.entries()) {
        const bar = () => $("#ub" + i);
        try {
          const parts = Math.max(1, Math.ceil(f.size / PART));
          const { id, urls } = await pfn("upload-start", { name: f.name, size: f.size, parts });
          let sent = 0;
          for (let k = 0; k < parts; k++) {
            const blob = f.slice(k * PART, Math.min(f.size, (k + 1) * PART));
            await putPart(urls[k], blob, (n) => { const b = bar(); if (b) b.style.width = ((sent + n) / f.size) * 100 + "%"; });
            sent += blob.size;
          }
          await pfn("upload-done", { id });
          bar()?.classList.add("ok"); ok++;
        } catch (e) { console.warn(e); bar()?.classList.add("bad"); }
      }
      toast?.(ok === files.length ? "uploaded, editing now" : `${files.length - ok} failed, try again`);
      if (ok === files.length) setTimeout(closeSheet, 700); else { busy = false; $("#ugo").disabled = false; $("#ugo").textContent = "try again"; }
      loadPipe();
    }
    draw();
  }
  const picker = Object.assign(document.createElement("input"), { type: "file", accept: "video/*", multiple: true, hidden: true });
  document.body.append(picker);
  picker.onchange = () => { const f = [...picker.files]; picker.value = ""; if (f.length) openUpload(f); };
  $("#pdrop").onclick = () => { if (!PW) return toast?.("sign in to HQ first"); picker.click(); };
  // desktop: drop files anywhere on the pipeline tab
  sec.addEventListener("dragover", (e) => { e.preventDefault(); if (e.dataTransfer.types.includes("Files")) sec.classList.add("dropping"); });
  sec.addEventListener("dragleave", (e) => { if (!sec.contains(e.relatedTarget)) sec.classList.remove("dropping"); });
  sec.addEventListener("drop", (e) => { e.preventDefault(); sec.classList.remove("dropping"); const f = [...e.dataTransfer.files].filter((x) => x.type.startsWith("video/")); if (f.length) openUpload(f); });
  // clip status: tap a failed clip to retry it, a finished one to hide it
  sec.addEventListener("click", async (e) => {
    const c = e.target.closest("[data-clip]"); if (!c) return;
    const cl = P?.clips?.find((x) => x.id === c.dataset.clip); if (!cl) return;
    const st = CLIP_ST[cl.status] || cl.status;
    openSheet(`<div class="pv">${cl.thumb_url ? `<img src="${esc(cl.thumb_url)}" alt="" style="width:46%;border-radius:18px;display:block;margin:0 auto">` : ""}
      <div class="meta"><b>${esc(cl.upload_name || cl.source_name)}</b><span class="chip" style="margin-left:auto">${st}</span></div>
      ${cl.error ? `<div class="hook" style="color:#ffb020;font-size:14px">${esc(cl.error)}</div>` : ""}
      <div class="acts">${["failed", "ready"].includes(cl.status) ? `<button class="btn3d ghost" data-ca="clip-retry">${cl.status === "failed" ? "try again" : "make more"}</button>` : "<span></span>"}<button class="btn3d ghost" data-ca="clip-archive">hide</button></div></div>`);
    $("#sheetBody").querySelectorAll("[data-ca]").forEach((b) => (b.onclick = async () => { try { await pfn(b.dataset.ca, { id: cl.id }); toast?.("done"); } catch { toast?.("didn't work"); } closeSheet(); loadPipe(); }));
  });
  window.loadPipe = loadPipe;
  render();
  loadPipe(); loadFormats(); setInterval(loadPipe, 60e3);
})();
