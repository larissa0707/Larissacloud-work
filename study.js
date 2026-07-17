(function () {
  'use strict';
  if (!document.getElementById('page-study')) return;

  // ── 資料 ──
  var RAW = [
   ["汽車","active","P21 (S1)","D21 PRO","靈通5247","2.4″","H62 4玻 170° 1080P","無","無",600],
   ["汽車","active","P21XW (S1XW)","D21XW PRO","靈通5247","2.4″","H62 4玻 170° 1080P","V06 全塑 120° 480P","無",670],
   ["汽車","active","P30XW","M300XW","靈通2247","4.5″","H62 4玻 135° 1080P","V01 四玻 120°","TYPE-C OTA 區間測速",960],
   ["汽車","active","P10PLUS","MX10PLUS","靈通6248","9.66″","2053 140-170° 1080P","2053方頭 1080P","一體10吋 區間測速",1100],
   ["汽車","active","GSY13XW","MX245D","靈通6248","11.26″","2053 140-170° 1080P","2053飛機頭 1080P","一體10吋 區間測速",1440],
   ["汽車","active","TX1000","","靈通6247","4.5″","2053 1080P","V06 480P","一體10吋",null],
   ["汽車","active","Z1000","","杰里5211","4.5″","2368 140° 1080P","V06 全塑 130° 480P","無",480],
   ["汽車","active","A550D","MX558D／588D","全志533","10.99″","2093 4玻 130° 足2K","4502AHD 120° 1080P","分離12吋 OTA 區測",1710],
   ["汽車","active","A550D PLUS","MX620D／637D","全志536","11.26″","4663 4玻 155° 足4K","4502AHD 120° 1080P","分離12吋 OTA 區測",2020],
   ["汽車","active","MX647D","","全志536","11.26″","4663 4玻 155° 足4K","SONY662 六玻 120° 1080P","分離12吋 OTA 區測",null],
   ["汽車","active","MX920D","分離式 NEW","7083W 全志V553","10.99″","2053 四玻 135°","4502AHD 120° 1080P","TYPE-C OTA 區測",1920],
   ["汽車","active","MX900DS","P650XW 三錄","全志8083","11.26″","2093 四玻 135°","2053 120° + 室內2053","TYPE-C OTA 區測",2000],
   ["汽車","active","CP12PRO","後照鏡","全志536","10.26″","2053 140-170° 2K","無","無",1600],
   ["汽車","active","CP12XW","MP220D 後照鏡","全志536","11.8″","2053 140-170° 1080P","2308Y方頭 1080P","無",2120],
   ["汽車","active","P15XW","MX520D","凌陽V39AX","11.26″","335 4玻2塑 170° 4K","2308Y方頭 1080P","無",2400],
   ["汽車","active","P15PLUS","MX537D／P15SPLUS","凌陽V39AX","11.26″","335 4玻2塑 170° 4K","SONY307 170° 2K","分離12吋 區測",2880],
   ["汽車","active","P16PLUS","MX720D 4K2K","聯詠96529","11.26″","OV08C 六玻 150°","SONY675 六玻 135°","TYPE-C OTA 區測",4130],
   ["汽車","active","P20S+ 汽車版","MT550S+","國科 GK7201","無屏 WIFI","2K 120° 2玻3塑 GC2083","無","無",660],
   ["汽車","active","GT50 (S2)","阿尼機","全新 GP6248","1.66″","2053 紅外 140° 1080P","無","分離12吋 區測",1450],
   ["汽車","active","GT50XW (S2PLUS)","阿尼機","全新 GP6248","1.66″","2053 紅外 140° 1080P","2053 紅外 140° 1080P","分離12吋 區測",null],
   ["汽車","active","P600XW","MX910D 雙錄","全志536","10.88″","GC4653 3玻3塑 140° 足2K補4K","307DX 140° 1080P","分離12吋 區測",2860],
   ["汽車","active","P600XWD","MX910DS 三錄","全志536","10.88″","GC4653 足2K補4K","307DX 1080P + 室內F53","分離12吋 區測",3170],
   ["汽車","discontinued","P12XW","MX220D","海思3556","11.66″","335 4玻2塑 170° 2K","2308Y方頭 1080P","無",null],
   ["汽車","discontinued","P12PLUS","MX237D","海思3556","11.66″","335 4玻2塑 170° 2K","SONY307 170° 2K","分離12吋 區測",2290],
   ["汽車","discontinued","P580XW","MX900D","M-STAR 8339","10.88″","2308Y方頭 140-170° 1080P","2308Y方頭 1080P","MSTAR 區測",null],
   ["汽車","discontinued","M30XW","觸屏","杰里5601","4.5″","2053 140-170° 1080P","V06 120° 480P","無",null],
   ["機車","active","MT30","MT388／MT30A","杰里5211","2″ 防水","720P 120° 黃","V09方頭 480P 藍","無",800],
   ["機車","active","MI50","MT19C","杰里5701","3″","1080P 120° 黃","720P 藍","無",970],
   ["機車","active","MT50","MT588","杰里5701","3″","1080P 120° 黃","720P 藍","無",1270],
   ["機車","active","MT50PRO","MT588PRO","杰里5701","3″","1080P 120° 黃","1080P 藍","無",1310],
   ["機車","active","MT55","MT688","聯詠96672","3″ 防水","1080P 黃","1080P 黃","內建GPS軌跡",2090],
   ["機車","active","P20S","MT550S","國科 GK7201","無屏 WIFI","2K 120° 2玻3塑 GC2083","無","無",610],
  ];
  var brandOf = function (c) { return c.replace(/[0-9A-Za-z].*/, "").replace(/\s.*/, "") || c; };
  var DATA = RAW.map(function (r) {
    var tier = r[9] == null ? "—" : r[9] <= 1000 ? "低" : r[9] <= 2000 ? "中" : "高";
    return {
      cat: r[0], status: r[1], model: r[2], alias: r[3], chip: r[4], brand: brandOf(r[4]),
      screen: r[5], front: r[6], rear: r[7], gps: r[8], cost: r[9], tier: tier, id: r[2]
    };
  });
  var tierClass = function (t) { return t === "高" ? "sq-t-hi" : t === "中" ? "sq-t-mid" : t === "低" ? "sq-t-lo" : "sq-t-na"; };
  var tierLabel = function (t) { return t === "—" ? "無成本" : t + "成本"; };
  var shuffle = function (a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.random() * (i + 1) | 0; var tmp = a[i]; a[i] = a[j]; a[j] = tmp; }
    return a;
  };

  // ── 狀態 ──
  var S = { mode: "card", cat: "汽車", tier: "全部", disc: false };
  var mastered = {};
  try { mastered = JSON.parse(localStorage.getItem("paipai_cfg_mastered") || "{}"); } catch (e) { mastered = {}; }
  var saveM = function () { try { localStorage.setItem("paipai_cfg_mastered", JSON.stringify(mastered)); } catch (e) { } };

  // ── 型號圖片（WebP dataURL，存本機，可同步到 GitHub）──
  var IMG_KEY = "paipai_cfg_images";
  var images = {};
  try { images = JSON.parse(localStorage.getItem(IMG_KEY) || "{}"); } catch (e) { images = {}; }
  function saveImages() {
    try { localStorage.setItem(IMG_KEY, JSON.stringify(images)); return true; }
    catch (e) {
      alert("圖片存不下了（瀏覽器容量已滿）。\n請先刪掉幾張圖片，或改用小一點的圖。");
      return false;
    }
  }
  // 壓成 WebP，避免塞爆瀏覽器容量
  function fileToWebp(file, maxDim, quality) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight;
        var scale = Math.min(1, maxDim / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
        var c = document.createElement("canvas");
        c.width = cw; c.height = ch;
        c.getContext("2d").drawImage(img, 0, 0, cw, ch);
        URL.revokeObjectURL(url);
        try { resolve(c.toDataURL("image/webp", quality)); }
        catch (e) { reject(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("圖片讀取失敗")); };
      img.src = url;
    });
  }
  var imgTargetId = null;
  function pickImageFor(id) {
    imgTargetId = id;
    var inp = document.getElementById("sq-imgInput");
    inp.value = "";
    inp.click();
  }
  function imgHTML(id, cls) {
    return images[id] ? '<img class="' + cls + '" src="' + images[id] + '" alt="">' : "";
  }

  var pool = function () {
    return DATA
      .filter(function (d) { return S.cat === "全部" || d.cat === S.cat; })
      .filter(function (d) { return S.disc || d.status !== "discontinued"; })
      .filter(function (d) { return S.tier === "全部" || d.tier === S.tier; });
  };

  var fOrder = [], fIdx = 0, fFlip = false;
  var qCur = null, qPicked = null, qScore = { ok: 0, n: 0 };

  // ── 階梯測驗：每 5 台一階，每台的 方案/前鏡頭/後鏡頭 三題都答對才算過 ──
  var STAGE_SIZE = 5;
  var LFIELDS = [
    { key: "chip", label: "方案", q: function (d) { return d.model + " 用什麼方案（晶片）？"; } },
    { key: "front", label: "前鏡頭", q: function (d) { return d.model + " 的前鏡頭是？"; } },
    { key: "rear", label: "後鏡頭", q: function (d) { return d.model + " 的後鏡頭是？"; } }
  ];
  var LKEY = "paipai_cfg_ladder";
  var ladder = {};   // { "型號|欄位": true } 已答對的
  try { ladder = JSON.parse(localStorage.getItem(LKEY) || "{}"); } catch (e) { ladder = {}; }
  var saveL = function () { try { localStorage.setItem(LKEY, JSON.stringify(ladder)); } catch (e) { } };
  var lStage = 0, lCur = null, lPicked = null;

  function stages() {
    var p = pool(), out = [];
    for (var i = 0; i < p.length; i += STAGE_SIZE) out.push(p.slice(i, i + STAGE_SIZE));
    return out;
  }
  function stageDone(st) {
    return st.every(function (d) {
      return LFIELDS.every(function (f) { return ladder[d.id + "|" + f.key]; });
    });
  }
  // 目前這一階還沒答對的 (型號, 欄位) 組合
  function lPending() {
    var st = stages()[lStage] || [], out = [];
    st.forEach(function (d) {
      LFIELDS.forEach(function (f) { if (!ladder[d.id + "|" + f.key]) out.push({ d: d, f: f }); });
    });
    return out;
  }
  function genLQ() {
    var pend = lPending();
    if (!pend.length) { lCur = null; return; }
    var pick = pend[Math.random() * pend.length | 0];
    var d = pick.d, f = pick.f, ans = d[f.key];
    // 誘答從全部型號取，才有鑑別度
    var others = shuffle(pool().map(function (x) { return x[f.key]; })
      .filter(function (x) { return x && x !== ans; }));
    var uniq = [];
    for (var i = 0; i < others.length; i++) {
      if (uniq.indexOf(others[i]) === -1) uniq.push(others[i]);
      if (uniq.length >= 3) break;
    }
    lCur = { d: d, f: f, ans: ans, opts: shuffle([ans].concat(uniq)) };
    lPicked = null;
  }
  // 跳到第一個還沒過關的階
  function firstUnfinishedStage() {
    var all = stages();
    for (var i = 0; i < all.length; i++) { if (!stageDone(all[i])) return i; }
    return all.length ? all.length - 1 : 0;
  }

  function esc(s) { return (s == null ? "" : String(s)).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function renderFilters() {
    document.querySelectorAll("#page-study [data-sqcat]").forEach(function (b) { b.classList.toggle("sq-on", b.dataset.sqcat === S.cat); });
    document.querySelectorAll("#page-study [data-sqtier]").forEach(function (b) { b.classList.toggle("sq-on", b.dataset.sqtier === S.tier); });
    document.querySelectorAll("#page-study [data-sqmode]").forEach(function (b) { b.classList.toggle("sq-on", b.dataset.sqmode === S.mode); });
    var p = pool(); var m = p.filter(function (d) { return mastered[d.id]; }).length;
    document.getElementById("sq-prog").textContent = "熟記 " + m + "/" + p.length;
  }

  function render() {
    renderFilters();
    var v = document.getElementById("sq-view");
    if (S.mode === "card") v.innerHTML = cardHTML();
    else if (S.mode === "ladder") v.innerHTML = ladderHTML();
    else if (S.mode === "quiz") v.innerHTML = quizHTML();
    else if (S.mode === "browse") v.innerHTML = browseHTML();
    else if (S.mode === "glossary") v.innerHTML = glossaryHTML();
    else v.innerHTML = referenceHTML();
    bind();
  }

  function ensureOrder() {
    var ids = pool().map(function (d) { return d.id; });
    if (!fOrder.length || fOrder.some(function (id) { return ids.indexOf(id) === -1; }) || fOrder.length !== ids.length) {
      fOrder = shuffle(ids); fIdx = 0; fFlip = false;
    }
  }
  function cardHTML() {
    var p = pool();
    if (!p.length) return '<div class="sq-panel sq-empty">此範圍沒有型號，請放寬篩選條件。</div>';
    ensureOrder();
    var d = DATA.filter(function (x) { return x.id === fOrder[fIdx]; })[0];
    var face = fFlip ? (
      '<div class="sq-back">' +
      '<div class="sq-bm">' + esc(d.model) + ' <span style="font-size:14px;font-weight:400;color:var(--sq-mut)">' + esc(d.alias) + '</span></div>' +
      '<div class="sq-fr"><span class="sq-lb">方案</span><span class="sq-vl sq-hl">' + esc(d.chip) + '</span></div>' +
      '<div class="sq-fr"><span class="sq-lb">前鏡頭</span><span class="sq-vl">' + esc(d.front) + '</span></div>' +
      '<div class="sq-fr"><span class="sq-lb">後鏡頭</span><span class="sq-vl">' + esc(d.rear) + '</span></div>' +
      '<div class="sq-fr"><span class="sq-lb">GPS</span><span class="sq-vl">' + esc(d.gps) + '</span></div>' +
      '<div class="sq-fr"><span class="sq-lb">成本</span><span class="sq-vl">' + (d.cost != null ? "$" + d.cost : "—") + '</span></div>' +
      '</div>'
    ) : (
      '<div class="sq-front">' +
      (images[d.id] ? '<div class="sq-cimgwrap">' + imgHTML(d.id, "sq-cimg") + '</div>' : '') +
      '<div class="sq-model">' + esc(d.model) + '</div>' +
      (d.alias ? '<div class="sq-alias">' + esc(d.alias) + '</div>' : '') +
      (d.screen ? '<div class="sq-screen">' + esc(d.screen) + '</div>' : '') +
      '<div class="sq-hint">點卡片看答案</div>' +
      '</div>'
    );
    var buttons = fFlip ? (
      '<div class="sq-actions">' +
      '<button class="sq-no" data-sqact="no">還不熟</button>' +
      '<button class="sq-yes" data-sqact="yes">熟了</button>' +
      '</div>'
    ) : '<button class="sq-big" data-sqact="flip">看答案</button>';
    return (
      '<div class="sq-meta">' +
      '<span>' + (fIdx + 1) + ' / ' + fOrder.length + '</span>' +
      '<button data-sqact="shuffle">重新洗牌 ↻</button>' +
      '</div>' +
      '<div class="sq-panel">' +
      '<div class="sq-cardface" data-sqact="flip">' +
      '<div class="sq-cardtop">' +
      '<span class="sq-tag ' + tierClass(d.tier) + '">' + tierLabel(d.tier) + '</span>' +
      '<span style="font-size:12px;color:var(--sq-mut)">' + d.cat + (d.status === "discontinued" ? " · 已停產" : "") + '</span>' +
      '</div>' +
      face +
      '</div>' +
      '</div>' +
      buttons +
      '<div class="sq-nav">' +
      '<button data-sqact="prev">← 上一張</button>' +
      '<button data-sqact="next">下一張 →</button>' +
      '</div>' +
      '<div class="sq-imgbar">' +
      '<button data-sqact="addimg" data-sqid="' + esc(d.id) + '">' + (images[d.id] ? "🖼 換張圖片" : "🖼 加入圖片") + '</button>' +
      (images[d.id] ? '<button data-sqact="delimg" data-sqid="' + esc(d.id) + '">刪除圖片</button>' : '') +
      '</div>'
    );
  }

  var FIELDS = [
    { key: "chip", label: "方案", q: function (d) { return d.model + " 用什麼方案（晶片）？"; } },
    { key: "front", label: "前鏡頭", q: function (d) { return d.model + " 的前鏡頭是？"; } },
    { key: "rear", label: "後鏡頭", q: function (d) { return d.model + " 的後鏡頭是？"; } },
    { key: "model", label: "型號", q: function (d) { return "哪一台用「" + d.chip + "」方案？"; } },
  ];
  function genQ() {
    var p = pool();
    if (p.length < 4) { qCur = null; return; }
    var f = FIELDS[Math.random() * FIELDS.length | 0];
    var item = p[Math.random() * p.length | 0];
    var ans = f.key === "model" ? item.model : item[f.key];
    var others = shuffle(p.map(function (d) { return f.key === "model" ? d.model : d[f.key]; })
      .filter(function (x) { return x && x !== ans && x !== "無" && x !== "—"; }));
    var uniq = [];
    for (var i = 0; i < others.length; i++) { if (uniq.indexOf(others[i]) === -1) uniq.push(others[i]); if (uniq.length >= 3) break; }
    qCur = { ask: f.label, q: f.q(item), ans: ans, opts: shuffle([ans].concat(uniq)), item: item };
    qPicked = null;
  }
  function quizHTML() {
    if (!qCur) genQ();
    if (!qCur) return '<div class="sq-panel sq-empty">此範圍題目不足（至少需 4 台），請放寬篩選。</div>';
    var pct = qScore.n ? Math.round(qScore.ok / qScore.n * 100) : 0;
    var opts = qCur.opts.map(function (o) {
      var cls = "sq-opt";
      if (qPicked) {
        if (o === qCur.ans) cls = "sq-opt sq-correct";
        else if (o === qPicked) cls = "sq-opt sq-wrong";
        else cls = "sq-opt sq-dim";
      }
      return '<button class="' + cls + '" data-sqopt="' + esc(o) + '" ' + (qPicked ? "disabled" : "") + '>' + esc(o) + '</button>';
    }).join("");
    var foot = qPicked ? (
      '<div class="sq-qfoot">' +
      '<span style="font-size:14px;font-weight:600;color:' + (qPicked === qCur.ans ? "var(--sq-lo)" : "var(--sq-hi)") + '">' +
      (qPicked === qCur.ans ? "答對 ✓" : "答錯，正解：" + esc(qCur.ans)) + '</span>' +
      '<button class="sq-btn sq-dark" data-sqact="nextq">下一題 →</button>' +
      '</div>'
    ) : "";
    return (
      '<div class="sq-meta">' +
      '<span>得分 <b style="color:var(--sq-indigo)">' + qScore.ok + '</b> / ' + qScore.n + (qScore.n ? "（" + pct + "%）" : "") + '</span>' +
      '<button data-sqact="resetscore">歸零</button>' +
      '</div>' +
      '<div class="sq-panel sq-qpanel">' +
      '<div class="sq-qask">問 · ' + qCur.ask + '</div>' +
      '<div class="sq-qq">' + esc(qCur.q) + '</div>' +
      // 「哪一台用XX方案」的題目附圖會直接洩答案，所以只有問某台規格時才附圖
      (qCur.item && qCur.ask !== "型號" && images[qCur.item.id] ? '<div class="sq-qimgwrap">' + imgHTML(qCur.item.id, "sq-qimg") + '</div>' : '') +
      opts +
      foot +
      '</div>'
    );
  }

  function ladderHTML() {
    var all = stages();
    if (!all.length) return '<div class="sq-panel sq-empty">此範圍沒有型號，請放寬篩選條件。</div>';
    if (pool().length < 4) return '<div class="sq-panel sq-empty">此範圍題目不足（至少需 4 台）才能出選項，請放寬篩選。</div>';
    if (lStage >= all.length) lStage = all.length - 1;

    var st = all[lStage];
    var total = st.length * LFIELDS.length;
    var done = total - lPending().length;
    var allDone = all.every(stageDone);

    // 階梯進度條
    var steps = all.map(function (s, i) {
      var cls = stageDone(s) ? "sq-step sq-step-done" : (i === lStage ? "sq-step sq-step-cur" : "sq-step");
      var lock = (i > lStage && !stageDone(s)) ? " 🔒" : (stageDone(s) ? " ✓" : "");
      return '<button class="' + cls + '" data-sqstage="' + i + '">第' + (i + 1) + '階' + lock + '</button>';
    }).join("");

    var header =
      '<div class="sq-meta">' +
      '<span>第 <b style="color:var(--sq-indigo)">' + (lStage + 1) + '</b> / ' + all.length + ' 階 · 本階進度 ' + done + '/' + total + '</span>' +
      '<button data-sqact="resetladder">整個階梯歸零</button>' +
      '</div>' +
      '<div class="sq-steps">' + steps + '</div>' +
      '<div class="sq-stagelist">本階型號：' + st.map(function (d) {
        var ok = LFIELDS.every(function (f) { return ladder[d.id + "|" + f.key]; });
        return '<span class="sq-chipm' + (ok ? " sq-chipm-ok" : "") + '">' + esc(d.model) + (ok ? " ✓" : "") + '</span>';
      }).join("") + '</div>';

    if (!lCur) genLQ();

    // 本階全過
    if (!lCur) {
      var nextBtn = allDone
        ? '<button class="sq-big" data-sqact="gorandom">全部階梯完成！去隨機測驗 →</button>'
        : '<button class="sq-big" data-sqact="nextstage">進入第 ' + (lStage + 2) + ' 階 →</button>';
      return header +
        '<div class="sq-panel sq-empty" style="padding:28px 16px">' +
        '<div style="font-size:34px;margin-bottom:8px">🎉</div>' +
        '<div style="font-size:16px;font-weight:600;margin-bottom:4px">第 ' + (lStage + 1) + ' 階過關！</div>' +
        '<div style="color:var(--sq-mut);font-size:13px;margin-bottom:16px">這 ' + st.length + ' 台的方案／前鏡頭／後鏡頭都答對了</div>' +
        nextBtn +
        '</div>';
    }

    var d = lCur.d;
    var opts = lCur.opts.map(function (o) {
      var cls = "sq-opt";
      if (lPicked) {
        if (o === lCur.ans) cls = "sq-opt sq-correct";
        else if (o === lPicked) cls = "sq-opt sq-wrong";
        else cls = "sq-opt sq-dim";
      }
      return '<button class="' + cls + '" data-sqlopt="' + esc(o) + '" ' + (lPicked ? "disabled" : "") + '>' + esc(o) + '</button>';
    }).join("");
    var foot = lPicked ? (
      '<div class="sq-qfoot">' +
      '<span style="font-size:14px;font-weight:600;color:' + (lPicked === lCur.ans ? "var(--sq-lo)" : "var(--sq-hi)") + '">' +
      (lPicked === lCur.ans ? "答對 ✓ 這題過了" : "答錯，正解：" + esc(lCur.ans) + "（這題稍後會再出現）") + '</span>' +
      '<button class="sq-btn sq-dark" data-sqact="nextlq">下一題 →</button>' +
      '</div>'
    ) : "";

    return header +
      '<div class="sq-panel sq-qpanel">' +
      '<div class="sq-qask">問 · ' + lCur.f.label + '</div>' +
      '<div class="sq-qq">' + esc(lCur.f.q(d)) + '</div>' +
      (images[d.id] ? '<div class="sq-qimgwrap">' + imgHTML(d.id, "sq-qimg") + '</div>' : '') +
      opts +
      foot +
      '</div>';
  }

  function browseHTML() {
    var p = pool();
    if (!p.length) return '<div class="sq-panel sq-empty">此範圍沒有型號，請放寬篩選條件。</div>';
    var g = {};
    p.forEach(function (d) { (g[d.brand] = g[d.brand] || []).push(d); });
    var groups = Object.keys(g).map(function (k) { return [k, g[k]]; }).sort(function (a, b) { return b[1].length - a[1].length; });
    return groups.map(function (pair) {
      var brand = pair[0], list = pair[1];
      return (
        '<div class="sq-grp">' +
        '<div class="sq-grph"><span class="sq-bar"></span>' + esc(brand) + ' <span style="color:var(--sq-mut);font-weight:400">（' + list.length + '）</span></div>' +
        list.map(function (d) {
          return (
            '<div class="sq-bcard">' +
            '<div class="sq-bhead">' +
            '<span class="sq-bmodel">' + esc(d.model) + ' <span style="font-size:12px;font-weight:400;color:var(--sq-mut)">' + esc(d.alias) + '</span></span>' +
            '<span class="sq-bchip">' + esc(d.chip) + '</span>' +
            '</div>' +
            '<div class="sq-brow">' +
            (images[d.id] ? '<div class="sq-bimgwrap">' + imgHTML(d.id, "sq-bimg") + '</div>' : '') +
            '<button class="sq-bimgbtn" data-sqact="addimg" data-sqid="' + esc(d.id) + '">' + (images[d.id] ? "換圖" : "🖼 加圖") + '</button>' +
            (images[d.id] ? '<button class="sq-bimgbtn" data-sqact="delimg" data-sqid="' + esc(d.id) + '">刪圖</button>' : '') +
            '</div>' +
            '<div class="sq-bgrid">' +
            '<span>前：' + esc(d.front) + '</span>' +
            '<span>後：' + esc(d.rear) + '</span>' +
            '<span>GPS：' + esc(d.gps) + '</span>' +
            '<span>' + esc(d.screen) + ' · ' + (d.cost != null ? "$" + d.cost : "無成本") + ' <span class="sq-tag ' + tierClass(d.tier) + '" style="padding:0 5px">' + d.tier + '</span></span>' +
            '</div>' +
            '</div>'
          );
        }).join("") +
        '</div>'
      );
    }).join("");
  }

  function glossaryHTML() {
    var G = [
      ["方案（晶片）", [
        ["方案 = 主機的「大腦」",
          "就是主機的<b>主晶片／處理器平台</b>，決定最高畫質、HDR、夜視、編碼效率與流暢度。概念上像手機的高通或 A 系列晶片——<b>越高階越好</b>。看到方案，就能大致推出這台的畫質與價位。",
          "高階4K：<span class='sq-gk'>聯詠96529</span>（P16PLUS 最貴）、<span class='sq-gk'>凌陽V39AX</span>（P15 系列）　▸　中階主力：<span class='sq-gk'>全志</span>(533/536/8083/V553)、<span class='sq-gk'>海思3556</span>　▸　入門：<span class='sq-gk'>靈通</span>、<span class='sq-gk'>杰里</span>、<span class='sq-gk'>國科</span>、<span class='sq-gk'>全新</span>、<span class='sq-gk'>M-STAR</span>"]
      ]],
      ["鏡頭：幾玻幾塑", [
        ["「玻」與「塑」= 鏡片材質",
          "鏡頭是好幾片鏡片疊起來的。<b>玻＝玻璃鏡片、塑＝塑膠鏡片</b>。例：「4玻2塑」＝ 4 片玻璃＋2 片塑膠，共 6 片。", ""],
        ["差別：耐熱與清晰度",
          "玻璃 → <b>更清晰、耐高溫、不易變形發黃</b>；塑膠 → 便宜輕，但車內夏天曝曬高溫容易<b>變形、霧化、畫面糊掉</b>。車用最怕曬，所以<b>玻片越多越耐用、越清楚</b>。",
          "好壞順序：六玻(全玻) ▸ 4玻2塑 ▸ 2玻2塑 ▸ 全塑。前鏡頭通常玻片多；後鏡頭如 V06「全塑」較陽春。"]
      ]],
      ["畫質：解析度・足 vs 補差值", [
        ["1080P / 2K / 4K",
          "解析度由低到高：<b>1080P &lt; 2K &lt; 4K</b>，越高越清晰、檔案也越大。", ""],
        ["「足」才是真的",
          "<b>足4K＝原生真 4K</b>；而「足2K補4K」「補差值4K」＝ 原生只有 2K，靠軟體<b>插值放大</b>到 4K，不是真 4K。看到<b>「足」</b>才是硬底子。", ""]
      ]],
      ["GPS：一體 vs 分離・幾吋・OTA", [
        ["一體式 vs 分離式",
          "<b>一體式</b>：GPS 做在主機裡，安裝簡單，但訊號可能被擋。<b>分離式</b>：GPS 是一顆獨立小盒用線接出，可貼近前擋<b>收訊更好、走線更乾淨</b>，通常較優。（「12吋/10吋」是指搭配的後照鏡螢幕尺寸）", ""],
        ["OTA = 空中更新",
          "Over-The-Air，可透過<b>網路／WIFI 自動更新</b>測速照相資料庫，不用把機器拆下來手動更新。", ""],
        ["帶區測・科技執法",
          "<b>區間測速</b>＝一段路測平均車速取締；<b>科技執法</b>＝自動照相取締（違規變換車道、未繫安全帶、講電話等）。GPS 資料庫含這些點，會提前語音提醒。", ""]
      ]],
      ["常見功能（手冊）", [
        ["G-sensor 重力感應",
          "偵測到<b>碰撞衝擊</b>時，自動把該段影片<b>鎖檔</b>，避免被循環錄影覆蓋掉——出事時的關鍵畫面才留得住。", ""],
        ["循環錄影",
          "影片以固定長度分段錄（白板常見 1 分鐘或 20–21 分鐘），<b>卡滿了自動覆蓋最舊</b>的一般影片；被 G-sensor 鎖檔的不會被蓋。", ""],
        ["移動偵測",
          "停車熄火後，只要<b>畫面有物體移動就自動觸發錄影</b>，省電省空間。", ""],
        ["停車監控／ACC",
          "停車時的持續監控模式。<b>ACC</b> 是接<b>車輛電門訊號</b>來判斷熄火/啟動，藉此切換行車或停車模式。", ""],
        ["AR 實境導航",
          "把<b>測速照相、路況等提醒疊加</b>顯示在畫面上（擴增實境）。", ""],
        ["WiFi／APP互聯",
          "手機用 WiFi 連機器，可<b>下載影片、改設定</b>。", ""],
        ["OTA 空中更新",
          "韌體/測速資料庫可<b>透過網路遠端更新，不用回廠</b>。", ""],
        ["GPS 軌跡（X/Y 座標）",
          "記錄行車路線與座標，可<b>回放行車軌跡</b>。", ""],
      ]],
      ["其他常見詞", [
        ["畫面與夜視",
          "<b>星光夜視</b>：低光感光強，晚上更清楚。<b>HDR</b>：明暗反差大的場景（如隧道口）曝光更均衡。<b>廣角 XX 度</b>：可視角度，越大照越寬，但邊緣較易變形。", ""],
        ["錄影路數與機型",
          "<b>前後／雙錄／三錄</b>＝ 只錄前 / 前+後 / 前+車內+後。<b>後照鏡型（電子後照鏡・流媒體）</b>：做成後視鏡的機型，螢幕即後視鏡。", ""],
        ["感光元件型號",
          "前/後鏡頭後面的號碼是<b>感光元件（sensor）</b>：SONY（307/335/662/675）、OV08C、GC、H62 等。一般 <b>SONY、OV 較高階</b>（夜視佳），GC / H6x 偏入門。", ""],
        ["連線與操作",
          "<b>WIFI／APP互聯</b>：手機連線觀看或下載影片。<b>觸控／聲控</b>：操作方式（觸控螢幕 / 語音指令）。", ""]
      ]],
    ];
    return G.map(function (pair) {
      var sec = pair[0], items = pair[1];
      return (
        '<div class="sq-gsec"><span class="sq-bar"></span>' + sec + '</div>' +
        items.map(function (it) {
          var term = it[0], body = it[1], rank = it[2];
          return (
            '<div class="sq-gcard">' +
            '<div class="sq-gterm">' + term + '</div>' +
            '<div class="sq-gbody">' + body + '</div>' +
            (rank ? '<div class="sq-grank">' + rank + '</div>' : '') +
            '</div>'
          );
        }).join("")
      );
    }).join("");
  }

  function referenceHTML() {
    return (
      '<div class="sq-gsec"><span class="sq-bar"></span>產品線分類・「幾鏡」怎麼看</div>' +
      '<div class="sq-note">💡 看到型號先分辨<b>幾鏡</b>：單鏡＝1 顆鏡頭、雙鏡＝前+後、三鏡＝前+車內+後、四鏡…這是同事討論產品最常用的簡稱。</div>' +
      '<ul class="sq-plist">' +
      '<li><b>汽車・單機型</b>（主機一體機）：裝擋風玻璃、自帶螢幕的傳統款，數量最多。單鏡或雙鏡，最高規劃到 4K+4K。</li>' +
      '<li><b>汽車・後照鏡型</b>：直接取代車內後視鏡、螢幕在鏡面裡（如 GSY13XW）。單/雙/三鏡（三鏡為 4K 特殊機種）。另有<b>分離式</b>：主機與前鏡頭分開裝，常見 2K+2K 或 4K+4K。</li>' +
      '<li><b>汽車・中控型</b>：CP 系列。</li>' +
      '<li><b>機車・安裝型</b>：固定裝車身、支援 WiFi，規劃雙鏡（防水如 MT55、不防水如 MT50 PRO；單鏡防水如 P20S）。</li>' +
      '<li><b>機車・頭戴式</b>：戴安全帽上的運動相機類型，單/雙鏡皆有規劃。</li>' +
      '</ul>' +

      '<div class="sq-gsec"><span class="sq-bar"></span>解析度對照表</div>' +
      '<div class="sq-twrap"><table class="sq-rtbl">' +
      '<tr><th>常見說法</th><th>代號</th><th>像素</th><th>說明</th></tr>' +
      '<tr><td>標清</td><td class="sq-res">480P</td><td>720×480</td><td>最基本，檔案最小，多用在副鏡頭（車內/後鏡）</td></tr>' +
      '<tr><td>高清</td><td class="sq-res">720P</td><td>1280×720</td><td>入門等級</td></tr>' +
      '<tr><td>全高清</td><td class="sq-res">1080P</td><td>1920×1080</td><td>市場主流，主鏡頭多從這起跳</td></tr>' +
      '<tr><td>2K</td><td class="sq-res">1440P</td><td>2560×1440</td><td>介於 1080P 與 4K，更細緻</td></tr>' +
      '<tr><td>4K</td><td class="sq-res">2160P</td><td>3840×2160</td><td>目前最高階，最清楚、檔案最大</td></tr>' +
      '</table></div>' +

      '<div class="sq-gsec"><span class="sq-bar"></span>感光元件（晶片）↔ 解析度 對照</div>' +
      '<div class="sq-note">💡 配置表裡「2053」「2308Y」「SONY307」這類號碼是<b>感光元件型號</b>，不是解析度。記住這張表就能<b>直接把鏡頭代號翻成畫質等級</b>。</div>' +
      '<div class="sq-twrap"><table class="sq-rtbl">' +
      '<tr><th>解析度</th><th>常見晶片/型號</th><th>備註</th></tr>' +
      '<tr><td class="sq-res">480P</td><td>V01（可媲美720）、V06（汽車）、V09（機車）</td><td>多用於副鏡頭，廣角約 120–170°</td></tr>' +
      '<tr><td class="sq-res">720P</td><td>H62、H63</td><td>入門主鏡頭或副鏡頭</td></tr>' +
      '<tr><td class="sq-res">1080P</td><td>2053、2308Y、5060J、Cl100、SONY H550 系列</td><td>用量最大的等級，配置表裡 2053、2308Y 反覆出現</td></tr>' +
      '<tr><td class="sq-res">2K</td><td>SONY 307、415、662（另有 675）</td><td>中高階雙鏡的副鏡頭常見，如 SONY307</td></tr>' +
      '<tr><td class="sq-res">4K</td><td>SONY 678、46S3</td><td>高階主鏡頭；部分機種以 2K 感光元件<b>補差值</b>輸出 4K</td></tr>' +
      '</table></div>' +
      '<div class="sq-note">⚠️ <b>H63 = 偷料版</b>：把原本好品質的配件換成較差的（相對 H62）。看到 H63 要留意。另：「足4K」才是原生真 4K，「補差值/補4K」是 2K 放大的假 4K。</div>' +

      '<div class="sq-gsec"><span class="sq-bar"></span>接頭與線材規格</div>' +
      '<ul class="sq-plist">' +
      '<li><b>4 針接頭</b>：用於 <b>1080P 以上</b>的鏡頭線材</li>' +
      '<li><b>5 針接頭</b>：用於 <b>1080P 以下</b>的鏡頭線材</li>' +
      '<li><b>USB-C</b>：較新規格，逐步導入中</li>' +
      '<li>倉庫常見延長線：<b>四針 5 米線、四針 10 米線</b></li>' +
      '</ul>' +
      '<div class="sq-note">📌 <b>P 製 vs N 製</b>：P 製＝PAL（50Hz）、N 製＝NTSC（60Hz），會影響鏡頭線材是否相容。實際哪個接頭對應哪個規格，白板畫得模糊，<b>建議入職後直接問產線或研發確認一次</b>。</div>'
    );
  }

  function bind() {
    var v = document.getElementById("sq-view");
    v.querySelectorAll("[data-sqact]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.stopPropagation();
        var a = el.dataset.sqact;
        if (a === "flip") fFlip = !fFlip;
        else if (a === "prev") { fFlip = false; fIdx = (fIdx - 1 + fOrder.length) % fOrder.length; }
        else if (a === "next") { fFlip = false; fIdx = (fIdx + 1) % fOrder.length; }
        else if (a === "shuffle") { fOrder = shuffle(pool().map(function (d) { return d.id; })); fIdx = 0; fFlip = false; }
        else if (a === "yes" || a === "no") { mastered[fOrder[fIdx]] = (a === "yes"); saveM(); fFlip = false; fIdx = (fIdx + 1) % fOrder.length; }
        else if (a === "nextq") { genQ(); }
        else if (a === "resetscore") { qScore = { ok: 0, n: 0 }; }
        else if (a === "nextlq") { genLQ(); }
        else if (a === "nextstage") { lStage++; lCur = null; lPicked = null; }
        else if (a === "gorandom") { S.mode = "quiz"; genQ(); }
        else if (a === "resetladder") {
          if (!confirm("確定要把整個階梯的進度歸零嗎？")) return;
          ladder = {}; saveL(); lStage = 0; lCur = null; lPicked = null;
        }
        else if (a === "addimg") { pickImageFor(el.dataset.sqid); return; }
        else if (a === "delimg") {
          if (!confirm("確定要刪掉這張圖片嗎？")) return;
          delete images[el.dataset.sqid]; saveImages();
        }
        render();
      });
    });
    v.querySelectorAll("[data-sqopt]").forEach(function (el) {
      el.addEventListener("click", function () {
        if (qPicked) return;
        qPicked = el.dataset.sqopt;
        qScore.n++; if (qPicked === qCur.ans) qScore.ok++;
        render();
      });
    });
    v.querySelectorAll("[data-sqlopt]").forEach(function (el) {
      el.addEventListener("click", function () {
        if (lPicked || !lCur) return;
        lPicked = el.dataset.sqlopt;
        // 答對才標記過關；答錯就留在待答清單裡，之後會再被抽到
        if (lPicked === lCur.ans) { ladder[lCur.d.id + "|" + lCur.f.key] = true; saveL(); }
        render();
      });
    });
    v.querySelectorAll("[data-sqstage]").forEach(function (el) {
      el.addEventListener("click", function () {
        var i = +el.dataset.sqstage;
        var all = stages();
        // 只能跳到已過關的階，或目前這一階（避免跳過還沒背的）
        if (i > lStage && !stageDone(all[i])) { alert("這一階還沒解鎖，先把前面的階梯過完喔。"); return; }
        lStage = i; lCur = null; lPicked = null;
        render();
      });
    });
  }

  // 篩選條件一改，階梯的分組就變了，要重新定位到第一個沒過的階
  function refilter() {
    fOrder = [];
    genQ();
    lStage = firstUnfinishedStage();
    lCur = null; lPicked = null;
  }

  document.querySelectorAll("#page-study [data-sqcat]").forEach(function (b) {
    b.onclick = function () { S.cat = b.dataset.sqcat; refilter(); render(); };
  });
  document.querySelectorAll("#page-study [data-sqtier]").forEach(function (b) {
    b.onclick = function () { S.tier = b.dataset.sqtier; refilter(); render(); };
  });
  document.querySelectorAll("#page-study [data-sqmode]").forEach(function (b) {
    b.onclick = function () {
      S.mode = b.dataset.sqmode;
      if (S.mode === "ladder") { lStage = firstUnfinishedStage(); lCur = null; lPicked = null; }
      render();
    };
  });
  document.getElementById("sq-disc").onchange = function (e) { S.disc = e.target.checked; refilter(); render(); };

  document.getElementById("sq-imgInput").onchange = async function (e) {
    var file = e.target.files[0];
    var id = imgTargetId;
    imgTargetId = null;
    if (!file || !id) return;
    try {
      var dataUrl = await fileToWebp(file, 800, 0.75);
      images[id] = dataUrl;
      if (!saveImages()) delete images[id];
      render();
    } catch (err) {
      console.error("圖片處理失敗", err);
      alert("這張圖片讀不進來：" + err.message);
    }
  };

  lStage = firstUnfinishedStage();
  render();
})();
