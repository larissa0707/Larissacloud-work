(function () {
  'use strict';

  var LS_OVERRIDES = 'xh_channel_overrides_v1';
  var LS_CACHE = 'xh_dataset_cache_v2';
  var LS_PLATFORMS = 'xh_platforms_v1';
  var LS_AUTH = 'xh_authed_v1';
  var LS_GH_TOKEN = 'xh_gh_token_v1';
  var AUTH_HASH = '409094ed5881f4489ea6e3685ed24a339da9a394f2bd70d5248c18a5a058d5ad';
  var GH_OWNER = 'larissa0707';
  var GH_REPO = 'Larissacloud-work';
  var GH_DATA_PATH = 'data.json';

  var EC_KEYWORDS = [
    'momo', '蝦皮', 'shopee', '露天', 'ruten', 'pchome', '奇摩', 'yahoo',
    '樂天', 'rakuten', 'friday', 'fri day', '森森', '東森', 'etmall',
    '生活市集', 'payeasy', '官網', 'woocommerce', '網路商店', '嘖嘖',
    '好而寶', 'gomaji', '創業家', 'ihergo'
  ];
  var STATUS_EXCLUDE_KEYWORDS = ['作廢', '刪除', '取消', '停用'];

  var records = [];       // {ym,ymd,year,month,channel,product,brand,qty,amount,status}
  var excludedCount = 0;
  var channelOverrides = {}; // name -> 'ec' | 'phys' | 'excluded'
  var charts = {};
  var rankSort = { col: 'amount', dir: 'desc' };
  var expandedBrands = {}; // brand -> expanded in ranking table
  var overviewRange = 'all';
  var overviewCustomStart = null, overviewCustomEnd = null;
  var platforms = []; // [{id, name, commissionPct, idHeader, priceCols, rows:[{product,id,prices,note}]}]
  var activePlatformId = null;
  var pendingPlatformAction = null; // {mode:'add', name, commissionPct} | {mode:'reimport', platformId}

  // ---------- utils ----------
  function ymToIndex(ym) {
    var p = ym.split('-');
    return (+p[0]) * 12 + (+p[1] - 1);
  }
  function indexToYm(idx) {
    var y = Math.floor(idx / 12);
    var m = (idx % 12 + 12) % 12 + 1;
    return y + '-' + String(m).padStart(2, '0');
  }
  function fmtMoney(n) {
    n = Math.round(n || 0);
    return n.toLocaleString('zh-Hant-TW');
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return '—';
    var s = (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
    return s;
  }
  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms || 200);
    };
  }
  function el(id) { return document.getElementById(id); }

  // ---------- auth gate ----------
  async function sha256Hex(str) {
    var enc = new TextEncoder().encode(str);
    var buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  function isAuthed() { return localStorage.getItem(LS_AUTH) === '1'; }

  function setupAuthGate() {
    var gate = el('authGate');
    if (isAuthed()) { gate.classList.add('hidden'); return; }
    gate.classList.remove('hidden');
    var input = el('authInput');
    var errorEl = el('authError');
    async function tryLogin() {
      var val = input.value;
      if (!val) return;
      var hash = await sha256Hex(val);
      if (hash === AUTH_HASH) {
        localStorage.setItem(LS_AUTH, '1');
        gate.classList.add('hidden');
        boot();
      } else {
        errorEl.textContent = '密碼錯誤，請再試一次';
        input.value = '';
        input.focus();
      }
    }
    el('authBtn').onclick = tryLogin;
    input.onkeydown = function (e) { if (e.key === 'Enter') tryLogin(); };
    input.focus();
  }

  // ---------- GitHub sync ----------
  function utf8ToBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  function getGithubToken(forcePrompt) {
    var token = localStorage.getItem(LS_GH_TOKEN);
    if (!token || forcePrompt) {
      token = prompt('貼上你的 GitHub Personal Access Token（只會存在這台裝置的瀏覽器裡，不會上傳到別的地方）：', token || '');
      if (!token) return null;
      localStorage.setItem(LS_GH_TOKEN, token);
    }
    return token;
  }

  async function ghApi(path, token, options) {
    options = options || {};
    var resp = await fetch('https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO + path, Object.assign({
      headers: Object.assign({ Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' }, options.headers || {})
    }, options));
    return resp;
  }

  async function syncToGithub() {
    if (!records.length) { alert('目前沒有已載入的銷售資料可以同步，請先匯入Excel檔案。'); return; }
    var statusEl = el('githubSyncStatus');
    var token = getGithubToken(false);
    if (!token) return;
    statusEl.textContent = '同步中...';
    try {
      var payload = { savedAt: new Date().toISOString(), records: records, excludedCount: excludedCount };
      var content = utf8ToBase64(JSON.stringify(payload));

      var refResp = await ghApi('/git/refs/heads/main', token);
      if (refResp.status === 401) { token = getGithubToken(true); if (!token) return; refResp = await ghApi('/git/refs/heads/main', token); }
      if (!refResp.ok) throw new Error('讀取分支失敗 (' + refResp.status + ')');
      var refData = await refResp.json();
      var commitSha = refData.object.sha;

      var commitResp = await ghApi('/git/commits/' + commitSha, token);
      if (!commitResp.ok) throw new Error('讀取commit失敗 (' + commitResp.status + ')');
      var commitData = await commitResp.json();
      var baseTreeSha = commitData.tree.sha;

      var blobResp = await ghApi('/git/blobs', token, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content, encoding: 'base64' })
      });
      if (!blobResp.ok) throw new Error('建立blob失敗 (' + blobResp.status + ')');
      var blobData = await blobResp.json();

      var treeResp = await ghApi('/git/trees', token, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_tree: baseTreeSha, tree: [{ path: GH_DATA_PATH, mode: '100644', type: 'blob', sha: blobData.sha }] })
      });
      if (!treeResp.ok) throw new Error('建立tree失敗 (' + treeResp.status + ')');
      var treeData = await treeResp.json();

      var newCommitResp = await ghApi('/git/commits', token, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '同步銷售資料 ' + new Date().toLocaleString('zh-TW'), tree: treeData.sha, parents: [commitSha] })
      });
      if (!newCommitResp.ok) throw new Error('建立commit失敗 (' + newCommitResp.status + ')');
      var newCommitData = await newCommitResp.json();

      var updateRefResp = await ghApi('/git/refs/heads/main', token, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha: newCommitData.sha })
      });
      if (!updateRefResp.ok) throw new Error('更新分支失敗 (' + updateRefResp.status + ')');

      statusEl.textContent = '✅ 同步成功 ' + new Date().toLocaleString('zh-TW');
    } catch (e) {
      console.error('GitHub同步失敗', e);
      statusEl.textContent = '❌ 同步失敗';
      alert('同步到GitHub失敗：' + e.message + '\n\n請確認Token有效、且有這個repo的寫入權限（repo scope）。');
    }
  }

  async function tryLoadRemoteSnapshot() {
    try {
      var resp = await fetch('data.json', { cache: 'no-store' });
      if (!resp.ok) return false;
      var data = await resp.json();
      if (!data.records || !data.records.length) return false;
      records = data.records;
      excludedCount = data.excludedCount || 0;
      return data.savedAt || true;
    } catch (e) { return false; }
  }

  // ---------- overrides persistence ----------
  function loadOverrides() {
    try { channelOverrides = JSON.parse(localStorage.getItem(LS_OVERRIDES) || '{}'); }
    catch (e) { channelOverrides = {}; }
  }
  function saveOverrides() {
    localStorage.setItem(LS_OVERRIDES, JSON.stringify(channelOverrides));
  }

  function guessChannelType(name) {
    var lower = name.toLowerCase();
    for (var i = 0; i < EC_KEYWORDS.length; i++) {
      if (lower.indexOf(EC_KEYWORDS[i].toLowerCase()) !== -1) return 'ec';
    }
    return 'phys';
  }
  function getChannelType(name) {
    if (channelOverrides[name]) return channelOverrides[name];
    return guessChannelType(name);
  }

  function extractBrand(product) {
    var m = product.match(/^【([^】]+)】/);
    return m ? m[1] : '其他/未分類';
  }

  function getBrandDisplay(rawBrand) {
    if (/^MOIN/i.test(rawBrand)) return 'MOIN';
    if (/^PAIPAI/i.test(rawBrand)) return 'PAIPAI';
    return rawBrand;
  }

  function parseDateCell(v) {
    if (!v) return null;
    if (v instanceof Date && !isNaN(v)) return v;
    var s = String(v);
    var m = s.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    return null;
  }

  function findCol(header, subs) {
    for (var i = 0; i < header.length; i++) {
      var h = header[i];
      if (!h) continue;
      for (var j = 0; j < subs.length; j++) {
        if (h.indexOf(subs[j]) !== -1) return i;
      }
    }
    return -1;
  }

  // ---------- parsing ----------
  function parseWorkbook(wb, fileName) {
    var sheetName = wb.SheetNames.find(function (n) { return n.indexOf('明細') !== -1; });
    if (!sheetName) {
      sheetName = wb.SheetNames.find(function (n) {
        var ws = wb.Sheets[n];
        var rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, range: 0 });
        var first = (rows[0] || []).join('');
        return first.indexOf('品項名稱') !== -1 || first.indexOf('品名') !== -1;
      });
    }
    if (!sheetName) {
      console.warn('[行銷分析] 找不到銷貨明細分頁：', fileName, wb.SheetNames);
      return 0;
    }
    var ws = wb.Sheets[sheetName];
    var rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
    if (!rows.length) return 0;
    var header = rows[0].map(function (h) { return (h || '').toString().trim(); });

    var iDate = findCol(header, ['日期']);
    var iChannel = findCol(header, ['客戶', '供應商', '通路']);
    var iProduct = findCol(header, ['品項名稱', '品名']);
    var iQty = findCol(header, ['數量']);
    var iAmount = findCol(header, ['合計']);
    var iPreTax = findCol(header, ['稅前']);
    var iStatus = findCol(header, ['憑證狀態', '狀態']);

    if (iProduct === -1 || iDate === -1) {
      console.warn('[行銷分析] 欄位對不上，略過分頁：', fileName, sheetName, header);
      return 0;
    }

    var count = 0;
    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      if (!row) continue;
      var productRaw = row[iProduct];
      if (!productRaw) continue;
      var date = parseDateCell(row[iDate]);
      if (!date) continue;
      var product = productRaw.toString().trim();
      var channel = (iChannel !== -1 ? row[iChannel] : '') || '(未標示通路)';
      channel = channel.toString().trim() || '(未標示通路)';
      var qty = Number(row[iQty]) || 0;
      var amount = iAmount !== -1 ? Number(row[iAmount]) : null;
      if (amount === null || isNaN(amount)) {
        amount = iPreTax !== -1 ? Number(row[iPreTax]) || 0 : 0;
      }
      var status = iStatus !== -1 ? (row[iStatus] || '').toString().trim() : '';

      var isExcludedStatus = STATUS_EXCLUDE_KEYWORDS.some(function (kw) {
        return status.indexOf(kw) !== -1;
      });
      var ym = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
      var ymd = ym + '-' + String(date.getDate()).padStart(2, '0');

      if (isExcludedStatus) { excludedCount++; continue; }

      records.push({
        ym: ym,
        ymd: ymd,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        channel: channel,
        product: product,
        brand: extractBrand(product),
        qty: qty,
        amount: amount,
        status: status
      });
      count++;
    }
    return count;
  }

  async function handleFiles(fileList) {
    if (!fileList || !fileList.length) return;
    records = [];
    excludedCount = 0;
    el('statusLine').textContent = '解析中...';
    var totalRows = 0;
    for (var i = 0; i < fileList.length; i++) {
      var file = fileList[i];
      try {
        var buf = await file.arrayBuffer();
        var wb = XLSX.read(buf, { type: 'array', cellDates: true });
        totalRows += parseWorkbook(wb, file.name);
      } catch (e) {
        console.error('讀取失敗', file.name, e);
        alert('讀取「' + file.name + '」失敗，可能不是支援的 Excel 格式。\n' + e.message);
      }
    }
    if (!records.length) {
      alert('沒有解析到任何銷售資料列，請確認選的是含「銷貨單明細」分頁的年度銷售檔。');
      el('statusLine').textContent = '尚未載入資料';
      return;
    }
    cacheDataset();
    renderAll(true);
  }

  function cacheDataset() {
    try {
      localStorage.setItem(LS_CACHE, JSON.stringify({
        savedAt: new Date().toISOString(),
        records: records,
        excludedCount: excludedCount
      }));
    } catch (e) { console.warn('無法快取資料（可能超過瀏覽器儲存上限）', e); }
  }
  function loadCachedDataset() {
    try {
      var raw = localStorage.getItem(LS_CACHE);
      if (!raw) return false;
      var obj = JSON.parse(raw);
      if (!obj.records || !obj.records.length) return false;
      records = obj.records;
      excludedCount = obj.excludedCount || 0;
      return obj.savedAt || true;
    } catch (e) { return false; }
  }

  // ---------- aggregation ----------
  function dataRange() {
    var yms = records.map(function (r) { return r.ym; });
    yms.sort();
    return { min: yms[0], max: yms[yms.length - 1] };
  }

  function filterRecords(opts) {
    opts = opts || {};
    return records.filter(function (r) {
      if (opts.startIdx !== undefined && ymToIndex(r.ym) < opts.startIdx) return false;
      if (opts.endIdx !== undefined && ymToIndex(r.ym) > opts.endIdx) return false;
      if (opts.channelType && opts.channelType !== 'all') {
        var t = getChannelType(r.channel);
        if (t === 'excluded') return false;
        if (t !== opts.channelType) return false;
      } else {
        if (getChannelType(r.channel) === 'excluded') return false;
      }
      return true;
    });
  }

  function groupKeyOf(r, groupBy) {
    return groupBy === 'brand' ? getBrandDisplay(r.brand) : r.product;
  }

  function sumBy(list, keyFn) {
    var map = {};
    list.forEach(function (r) {
      var k = keyFn(r);
      if (!map[k]) map[k] = { key: k, qty: 0, amount: 0, count: 0 };
      map[k].qty += r.qty;
      map[k].amount += r.amount;
      map[k].count += 1;
    });
    return map;
  }

  function presetRange(preset, range) {
    var minIdx = ymToIndex(range.min), maxIdx = ymToIndex(range.max);
    if (preset === 'all') return { s: minIdx, e: maxIdx };
    if (preset === 'thisYear') {
      var y = +range.max.split('-')[0];
      return { s: Math.max(minIdx, ymToIndex(y + '-01')), e: maxIdx };
    }
    if (preset === 'lastYear') {
      var y2 = +range.max.split('-')[0] - 1;
      return { s: Math.max(minIdx, ymToIndex(y2 + '-01')), e: Math.min(maxIdx, ymToIndex(y2 + '-12')) };
    }
    var months = { last3: 3, last6: 6, last12: 12 }[preset] || 12;
    return { s: Math.max(minIdx, maxIdx - months + 1), e: maxIdx };
  }

  // ---------- rendering: shell ----------
  function renderAll(isFreshLoad) {
    el('emptyState').style.display = 'none';
    el('appBody').style.display = 'block';
    var range = dataRange();
    var savedNote = '';
    el('statusLine').textContent =
      '共 ' + records.length.toLocaleString() + ' 筆交易明細　|　範圍 ' + range.min + ' ~ ' + range.max +
      (excludedCount ? ('　|　已排除 ' + excludedCount + ' 筆作廢/取消單據') : '');

    setupOverviewToolbar(range);
    setupRankToolbar(range);
    setupTrendToolbar();

    renderOverview(range);
    renderRanking();
    renderTrend();
    renderChannelTable();
    renderWinback();
    renderCampaignTab();
  }

  // ---------- overview ----------
  function setupOverviewToolbar(range) {
    var box = el('overviewRangeToolbar');
    box.innerHTML = '';
    var presets = [
      ['all', '全部'], ['thisYear', '今年'], ['lastYear', '去年'],
      ['last3', '近3個月'], ['last6', '近6個月'], ['last12', '近12個月']
    ];
    var group = document.createElement('div');
    group.className = 'chip-group';
    presets.forEach(function (p) {
      var b = document.createElement('button');
      b.className = 'chip' + (overviewRange === p[0] ? ' active' : '');
      b.textContent = p[1];
      b.onclick = function () {
        overviewRange = p[0];
        overviewCustomStart = null;
        overviewCustomEnd = null;
        renderOverview(dataRange());
      };
      group.appendChild(b);
    });
    box.appendChild(group);

    var startLabel = document.createElement('label');
    startLabel.textContent = '起始月 ';
    var startInput = document.createElement('input');
    startInput.type = 'month'; startInput.id = 'overviewStart';
    startInput.min = range.min; startInput.max = range.max;
    startLabel.appendChild(startInput);

    var endLabel = document.createElement('label');
    endLabel.textContent = '結束月 ';
    var endInput = document.createElement('input');
    endInput.type = 'month'; endInput.id = 'overviewEnd';
    endInput.min = range.min; endInput.max = range.max;
    endLabel.appendChild(endInput);

    startInput.onchange = endInput.onchange = function () {
      overviewCustomStart = startInput.value;
      overviewCustomEnd = endInput.value;
      overviewRange = 'custom';
      renderOverview(dataRange());
    };

    box.appendChild(startLabel);
    box.appendChild(endLabel);
  }

  function renderOverview(range) {
    var box = el('overviewRangeToolbar');
    Array.prototype.forEach.call(box.querySelectorAll('.chip'), function (c) {
      c.classList.toggle('active', c.textContent === ({
        all: '全部', thisYear: '今年', lastYear: '去年', last3: '近3個月', last6: '近6個月', last12: '近12個月'
      })[overviewRange]);
    });

    var r = (overviewRange === 'custom' && overviewCustomStart && overviewCustomEnd)
      ? { s: Math.min(ymToIndex(overviewCustomStart), ymToIndex(overviewCustomEnd)), e: Math.max(ymToIndex(overviewCustomStart), ymToIndex(overviewCustomEnd)) }
      : presetRange(overviewRange, range);
    el('overviewStart').value = indexToYm(r.s);
    el('overviewEnd').value = indexToYm(r.e);
    var recs = filterRecords({ startIdx: r.s, endIdx: r.e });

    var totalAmount = recs.reduce(function (s, x) { return s + x.amount; }, 0);
    var ecAmount = recs.filter(function (x) { return getChannelType(x.channel) === 'ec'; })
      .reduce(function (s, x) { return s + x.amount; }, 0);
    var physAmount = totalAmount - ecAmount;

    // MoM / YoY — use the last COMPLETE month, not a possibly still-in-progress current month
    function sum(list) { return list.reduce(function (s, x) { return s + x.amount; }, 0); }
    var maxIdx = ymToIndex(range.max);
    var today = new Date();
    var todayYm = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
    var isPartial = range.max === todayYm;
    var refIdx = isPartial ? maxIdx - 1 : maxIdx;
    var refYm = indexToYm(refIdx);
    var refAmt = sum(filterRecords({ startIdx: refIdx, endIdx: refIdx }));
    var prevAmt = sum(filterRecords({ startIdx: refIdx - 1, endIdx: refIdx - 1 }));
    var yoyAmt = sum(filterRecords({ startIdx: refIdx - 12, endIdx: refIdx - 12 }));
    var mom = prevAmt ? (refAmt - prevAmt) / prevAmt * 100 : null;
    var yoy = yoyAmt ? (refAmt - yoyAmt) / yoyAmt * 100 : null;

    var kpis = [
      { label: '所選期間總營收', value: '$' + fmtMoney(totalAmount) },
      { label: '電商佔比', value: totalAmount ? (ecAmount / totalAmount * 100).toFixed(1) + '%' : '—', sub: '$' + fmtMoney(ecAmount) },
      { label: '實體／經銷佔比', value: totalAmount ? (physAmount / totalAmount * 100).toFixed(1) + '%' : '—', sub: '$' + fmtMoney(physAmount) },
      { label: refYm + ' 營收（最近完整月）', value: '$' + fmtMoney(refAmt), delta: mom, deltaLabel: '較上月' },
      { label: refYm + ' 年增率', value: fmtPct(yoy), delta: null }
    ];
    if (isPartial) {
      var partialAmt = sum(filterRecords({ startIdx: maxIdx, endIdx: maxIdx }));
      kpis.push({ label: range.max + ' 累計（本月未結束）', value: '$' + fmtMoney(partialAmt), sub: '僅供參考，非完整月份' });
    }

    var kpiRow = el('kpiRow');
    kpiRow.innerHTML = '';
    kpis.forEach(function (k) {
      var card = document.createElement('div');
      card.className = 'kpi-card';
      var deltaHtml = '';
      if (k.delta !== undefined && k.delta !== null && isFinite(k.delta)) {
        deltaHtml = '<div class="delta ' + (k.delta >= 0 ? 'up' : 'down') + '">' + fmtPct(k.delta) + ' ' + (k.deltaLabel || '') + '</div>';
      }
      card.innerHTML = '<div class="label">' + k.label + '</div><div class="value">' + k.value + '</div>' +
        (k.sub ? '<div class="delta">' + k.sub + '</div>' : '') + deltaHtml;
      kpiRow.appendChild(card);
    });

    renderMonthlyTrendChart(r);
    renderChannelSplitChart(recs);
    renderBrandSplitChart(recs);
  }

  function renderMonthlyTrendChart(r) {
    var labels = [], ecData = [], physData = [];
    for (var i = r.s; i <= r.e; i++) {
      var ym = indexToYm(i);
      labels.push(ym);
      var recs = filterRecords({ startIdx: i, endIdx: i });
      var ec = 0, phys = 0;
      recs.forEach(function (r) {
        if (getChannelType(r.channel) === 'ec') ec += r.amount; else phys += r.amount;
      });
      ecData.push(Math.round(ec));
      physData.push(Math.round(phys));
    }
    drawChart('chartMonthlyTrend', {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: '電商', data: ecData, backgroundColor: '#2563eb', stack: 's' },
          { label: '實體／經銷', data: physData, backgroundColor: '#f59e0b', stack: 's' }
        ]
      },
      options: baseChartOptions({ stacked: true })
    });
  }

  function renderChannelSplitChart(recs) {
    var ec = 0, phys = 0;
    recs.forEach(function (r) { if (getChannelType(r.channel) === 'ec') ec += r.amount; else phys += r.amount; });
    drawChart('chartChannelSplit', {
      type: 'doughnut',
      data: {
        labels: ['電商', '實體／經銷'],
        datasets: [{ data: [Math.round(ec), Math.round(phys)], backgroundColor: ['#2563eb', '#f59e0b'] }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
  }

  function renderBrandSplitChart(recs) {
    var map = sumBy(recs, function (r) { return getBrandDisplay(r.brand); });
    var arr = Object.values(map).sort(function (a, b) { return b.amount - a.amount; });
    var grandTotal = arr.reduce(function (s, x) { return s + x.amount; }, 0);
    var top = arr.slice(0, 7);
    var rest = arr.slice(7);
    if (rest.length) {
      var restSum = rest.reduce(function (s, x) { return s + x.amount; }, 0);
      top.push({ key: '其他品牌', amount: restSum });
    }
    var palette = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#94a3b8'];
    drawChart('chartBrandSplit', {
      type: 'doughnut',
      data: {
        labels: top.map(function (x) { return x.key; }),
        datasets: [{ data: top.map(function (x) { return Math.round(x.amount); }), backgroundColor: palette }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    var tableEl = el('brandSplitTable');
    if (tableEl) {
      tableEl.innerHTML = '<table class="data"><thead><tr><th>品牌</th><th class="num">金額</th><th class="num">佔比</th></tr></thead><tbody>' +
        top.map(function (x, i) {
          var pct = grandTotal ? (x.amount / grandTotal * 100).toFixed(1) + '%' : '—';
          var swatch = '<span style="display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;background:' + palette[i] + '"></span>';
          return '<tr><td>' + swatch + escapeHtml(x.key) + '</td><td class="num">$' + fmtMoney(x.amount) + '</td><td class="num">' + pct + '</td></tr>';
        }).join('') + '</tbody></table>';
    }
  }

  function baseChartOptions(opts) {
    opts = opts || {};
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { stacked: !!opts.stacked },
        y: { stacked: !!opts.stacked, ticks: { callback: function (v) { return '$' + fmtMoney(v); } } }
      },
      plugins: { legend: { position: 'bottom' } }
    };
  }

  function drawChart(canvasId, config) {
    if (charts[canvasId]) charts[canvasId].destroy();
    var ctx = el(canvasId).getContext('2d');
    charts[canvasId] = new Chart(ctx, config);
  }

  // ---------- ranking ----------
  function setupRankToolbar(range) {
    var presetBox = el('rankPreset');
    presetBox.innerHTML = '';
    var presets = [
      ['all', '全部'], ['thisYear', '今年'], ['lastYear', '去年'],
      ['last3', '近3個月'], ['last6', '近6個月'], ['last12', '近12個月']
    ];
    presets.forEach(function (p) {
      var b = document.createElement('button');
      b.className = 'chip';
      b.textContent = p[1];
      b.onclick = function () {
        var r = presetRange(p[0], range);
        el('rankStart').value = indexToYm(r.s);
        el('rankEnd').value = indexToYm(r.e);
        renderRanking();
      };
      presetBox.appendChild(b);
    });

    el('rankStart').min = range.min; el('rankStart').max = range.max;
    el('rankEnd').min = range.min; el('rankEnd').max = range.max;
    if (!el('rankStart').value) el('rankStart').value = range.min;
    if (!el('rankEnd').value) el('rankEnd').value = range.max;

    el('rankStart').onchange = renderRanking;
    el('rankEnd').onchange = renderRanking;
    el('rankGroupBy').onchange = renderRanking;
    el('rankChannelType').onchange = renderRanking;
    el('rankMinRevenue').oninput = debounce(renderRanking, 250);
    el('rankSearch').oninput = debounce(renderRanking, 250);
  }

  function growthCell(growth) {
    var growthTxt, growthClass = '';
    if (growth === null) growthTxt = '—';
    else if (growth === Infinity) { growthTxt = '新品/新增'; growthClass = 'growth-up'; }
    else { growthTxt = fmtPct(growth); growthClass = growth >= 0 ? 'growth-up' : 'growth-down'; }
    return '<td class="num ' + growthClass + '">' + growthTxt + '</td>';
  }

  function renderRanking() {
    var range = dataRange();
    var dataMinIdx = ymToIndex(range.min);
    var startYm = el('rankStart').value || range.min;
    var endYm = el('rankEnd').value || range.max;
    var sIdx = ymToIndex(startYm), eIdx = ymToIndex(endYm);
    if (eIdx < sIdx) { var t = sIdx; sIdx = eIdx; eIdx = t; }
    var n = eIdx - sIdx + 1;
    var prevE = sIdx - 1, prevS = sIdx - n;
    var noBaseline = sIdx <= dataMinIdx;

    var channelType = el('rankChannelType').value;
    var groupBy = el('rankGroupBy').value;
    var minRevenue = Number(el('rankMinRevenue').value) || 0;
    var search = (el('rankSearch').value || '').trim().toLowerCase();

    var curRecs = filterRecords({ startIdx: sIdx, endIdx: eIdx, channelType: channelType });
    var prevRecs = filterRecords({ startIdx: prevS, endIdx: prevE, channelType: channelType });
    var curMap = sumBy(curRecs, function (r) { return groupKeyOf(r, groupBy); });
    var prevMap = sumBy(prevRecs, function (r) { return groupKeyOf(r, groupBy); });

    var rows = Object.values(curMap).map(function (c) {
      var prev = prevMap[c.key];
      var prevAmount = prev ? prev.amount : 0;
      var growth = noBaseline ? null : (prevAmount ? (c.amount - prevAmount) / prevAmount * 100 : (c.amount > 0 ? Infinity : null));
      return { key: c.key, qty: c.qty, amount: c.amount, prevAmount: prevAmount, growth: growth };
    });

    if (minRevenue) rows = rows.filter(function (r) { return Math.abs(r.amount) >= minRevenue; });
    if (search) rows = rows.filter(function (r) { return r.key.toLowerCase().indexOf(search) !== -1; });

    rows.sort(function (a, b) {
      var dir = rankSort.dir === 'asc' ? 1 : -1;
      var av = a[rankSort.col], bv = b[rankSort.col];
      if (av === Infinity) av = 1e15; if (bv === Infinity) bv = 1e15;
      if (av === null) av = -1e15; if (bv === null) bv = -1e15;
      if (typeof av === 'string') return dir * av.localeCompare(bv);
      return dir * (av - bv);
    });

    var thead = document.querySelector('#rankTable thead');
    var groupLabel = groupBy === 'brand' ? '品牌' : '商品';
    var cols = [
      ['key', groupLabel, false], ['qty', '數量', true], ['amount', '本期營收', true],
      ['prevAmount', '前期營收', true], ['growth', '成長率', true]
    ];
    thead.innerHTML = '<tr>' + cols.map(function (c) {
      var arrow = rankSort.col === c[0] ? (rankSort.dir === 'asc' ? ' ▲' : ' ▼') : '';
      return '<th class="' + (c[2] ? 'num' : '') + '" data-col="' + c[0] + '">' + c[1] + arrow + '</th>';
    }).join('') + '</tr>';
    Array.prototype.forEach.call(thead.querySelectorAll('th'), function (th) {
      th.onclick = function () {
        var col = th.getAttribute('data-col');
        if (rankSort.col === col) rankSort.dir = rankSort.dir === 'asc' ? 'desc' : 'asc';
        else { rankSort.col = col; rankSort.dir = 'desc'; }
        renderRanking();
      };
    });

    var bodyHtml = '';
    rows.slice(0, 500).forEach(function (r) {
      var isBrandMode = groupBy === 'brand';
      var expanded = isBrandMode && !!expandedBrands[r.key];
      var toggle = isBrandMode ? '<span class="expand-toggle" data-brand="' + escapeHtml(r.key) + '" style="cursor:pointer;display:inline-block;width:16px">' + (expanded ? '▼' : '▶') + '</span>' : '';
      bodyHtml += '<tr>' +
        '<td>' + toggle + escapeHtml(r.key) + '</td><td class="num">' + r.qty.toLocaleString() +
        '</td><td class="num">$' + fmtMoney(r.amount) + '</td><td class="num">$' + fmtMoney(r.prevAmount) +
        '</td>' + growthCell(r.growth) + '</tr>';
      if (expanded) {
        var prodCurMap = sumBy(curRecs.filter(function (x) { return getBrandDisplay(x.brand) === r.key; }), function (x) { return x.product; });
        var prodPrevMap = sumBy(prevRecs.filter(function (x) { return getBrandDisplay(x.brand) === r.key; }), function (x) { return x.product; });
        var prodRows = Object.values(prodCurMap).sort(function (a, b) { return b.amount - a.amount; });
        prodRows.forEach(function (pr) {
          var prev = prodPrevMap[pr.key];
          var prevAmount = prev ? prev.amount : 0;
          var growth = noBaseline ? null : (prevAmount ? (pr.amount - prevAmount) / prevAmount * 100 : (pr.amount > 0 ? Infinity : null));
          bodyHtml += '<tr class="rank-sub-row">' +
            '<td style="padding-left:32px;color:#6b7280">' + escapeHtml(pr.key) + '</td><td class="num">' + pr.qty.toLocaleString() +
            '</td><td class="num">$' + fmtMoney(pr.amount) + '</td><td class="num">$' + fmtMoney(prevAmount) +
            '</td>' + growthCell(growth) + '</tr>';
        });
      }
    });

    var tbody = document.querySelector('#rankTable tbody');
    tbody.innerHTML = bodyHtml || '<tr><td colspan="5" style="text-align:center;color:#9ca3af">沒有符合條件的資料</td></tr>';
    Array.prototype.forEach.call(tbody.querySelectorAll('.expand-toggle'), function (sp) {
      sp.onclick = function (ev) {
        ev.stopPropagation();
        var brand = sp.getAttribute('data-brand');
        expandedBrands[brand] = !expandedBrands[brand];
        renderRanking();
      };
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- trend detail ----------
  function setupTrendToolbar() {
    el('trendGroupBy').onchange = function () { populateTrendTargets(); renderTrend(); };
    el('trendTarget').onchange = renderTrend;
    populateTrendTargets();
  }

  function populateTrendTargets() {
    var groupBy = el('trendGroupBy').value;
    var recs = filterRecords({});
    var map = sumBy(recs, function (r) { return groupKeyOf(r, groupBy); });
    var arr = Object.values(map).sort(function (a, b) { return b.amount - a.amount; });
    var sel = el('trendTarget');
    var prev = sel.value;
    sel.innerHTML = arr.map(function (a) {
      return '<option value="' + escapeHtml(a.key) + '">' + escapeHtml(a.key) + ' ($' + fmtMoney(a.amount) + ')</option>';
    }).join('');
    if (arr.some(function (a) { return a.key === prev; })) sel.value = prev;
  }

  function renderTrend() {
    var range = dataRange();
    var groupBy = el('trendGroupBy').value;
    var target = el('trendTarget').value;
    if (!target) { if (charts.chartTrendDetail) charts.chartTrendDetail.destroy(); return; }
    var minIdx = ymToIndex(range.min), maxIdx = ymToIndex(range.max);
    var labels = [], qtyData = [], amountData = [];
    for (var i = minIdx; i <= maxIdx; i++) {
      var ym = indexToYm(i);
      labels.push(ym);
      var recs = records.filter(function (r) {
        return r.ym === ym && groupKeyOf(r, groupBy) === target && getChannelType(r.channel) !== 'excluded';
      });
      qtyData.push(recs.reduce(function (s, x) { return s + x.qty; }, 0));
      amountData.push(Math.round(recs.reduce(function (s, x) { return s + x.amount; }, 0)));
    }
    drawChart('chartTrendDetail', {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { type: 'line', label: '營收 ($)', data: amountData, borderColor: '#2563eb', backgroundColor: '#2563eb', yAxisID: 'y', tension: 0.25 },
          { type: 'bar', label: '數量', data: qtyData, backgroundColor: '#cbd5e1', yAxisID: 'y1' }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: { position: 'left', ticks: { callback: function (v) { return '$' + fmtMoney(v); } } },
          y1: { position: 'right', grid: { drawOnChartArea: false } }
        },
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }

  // ---------- channel settings ----------
  function renderChannelTable(filterText) {
    var map = {};
    records.forEach(function (r) {
      if (!map[r.channel]) map[r.channel] = { channel: r.channel, amount: 0, count: 0 };
      map[r.channel].amount += r.amount;
      map[r.channel].count += 1;
    });
    var rows = Object.values(map).sort(function (a, b) { return b.amount - a.amount; });
    if (filterText) {
      var f = filterText.toLowerCase();
      rows = rows.filter(function (r) { return r.channel.toLowerCase().indexOf(f) !== -1; });
    }
    var tbody = document.querySelector('#channelTable tbody');
    tbody.innerHTML = rows.map(function (r) {
      var t = getChannelType(r.channel);
      var tagClass = t === 'ec' ? 'ec' : (t === 'phys' ? 'phys' : 'excluded');
      var tagLabel = t === 'ec' ? '電商' : (t === 'phys' ? '實體／經銷' : '不計入');
      return '<tr><td>' + escapeHtml(r.channel) + ' <span class="tag ' + tagClass + '">' + tagLabel + '</span></td>' +
        '<td class="num">$' + fmtMoney(r.amount) + '</td>' +
        '<td class="num">' + r.count.toLocaleString() + '</td>' +
        '<td><select class="bucket-select" data-channel="' + escapeHtml(r.channel).replace(/"/g, '&quot;') + '">' +
        '<option value="ec"' + (t === 'ec' ? ' selected' : '') + '>電商</option>' +
        '<option value="phys"' + (t === 'phys' ? ' selected' : '') + '>實體／經銷</option>' +
        '<option value="excluded"' + (t === 'excluded' ? ' selected' : '') + '>不計入統計</option>' +
        '</select></td></tr>';
    }).join('');
    Array.prototype.forEach.call(tbody.querySelectorAll('select.bucket-select'), function (sel) {
      sel.onchange = function () {
        channelOverrides[sel.getAttribute('data-channel')] = sel.value;
        saveOverrides();
        renderAll();
      };
    });
  }

  // ---------- winback (customer re-engagement) ----------
  function renderWinback() {
    var typeSel = el('winbackChannelType');
    if (!typeSel) return;
    var channelType = typeSel.value;
    var minSpend = Number(el('winbackMinSpend').value) || 0;
    var minIdle = Number(el('winbackMinIdleDays').value) || 0;
    var search = (el('winbackSearch').value || '').trim().toLowerCase();

    var maxYmd = records.reduce(function (m, r) { return r.ymd > m ? r.ymd : m; }, '0000-00-00');
    if (maxYmd === '0000-00-00') {
      document.querySelector('#winbackTable thead').innerHTML = '';
      document.querySelector('#winbackTable tbody').innerHTML = '';
      return;
    }
    var maxDate = new Date(maxYmd);

    var map = {};
    records.forEach(function (r) {
      var t = getChannelType(r.channel);
      if (t === 'excluded') return;
      if (channelType !== 'all' && t !== channelType) return;
      if (!map[r.channel]) map[r.channel] = { channel: r.channel, amount: 0, count: 0, lastYmd: '0000-00-00' };
      var m = map[r.channel];
      m.amount += r.amount;
      m.count += 1;
      if (r.ymd > m.lastYmd) m.lastYmd = r.ymd;
    });

    var rows = Object.values(map).map(function (m) {
      var idleDays = Math.round((maxDate - new Date(m.lastYmd)) / 86400000);
      return { channel: m.channel, amount: m.amount, count: m.count, lastYmd: m.lastYmd, idleDays: idleDays };
    });

    if (minSpend) rows = rows.filter(function (r) { return r.amount >= minSpend; });
    if (minIdle) rows = rows.filter(function (r) { return r.idleDays >= minIdle; });
    if (search) rows = rows.filter(function (r) { return r.channel.toLowerCase().indexOf(search) !== -1; });

    rows.sort(function (a, b) { return b.idleDays - a.idleDays || b.amount - a.amount; });

    document.querySelector('#winbackTable thead').innerHTML =
      '<tr><th>客戶／通路</th><th class="num">累計消費</th><th class="num">交易次數</th><th>最後購買日</th><th class="num">距今天數</th></tr>';
    document.querySelector('#winbackTable tbody').innerHTML = rows.slice(0, 500).map(function (r) {
      var warnStyle = r.idleDays >= 180 ? ' style="color:#dc2626;font-weight:600"' : '';
      return '<tr><td>' + escapeHtml(r.channel) + '</td><td class="num">$' + fmtMoney(r.amount) +
        '</td><td class="num">' + r.count.toLocaleString() + '</td><td>' + r.lastYmd +
        '</td><td class="num"' + warnStyle + '>' + r.idleDays + '</td></tr>';
    }).join('') || '<tr><td colspan="5" style="text-align:center;color:#9ca3af">沒有符合條件的資料</td></tr>';
  }

  // ---------- campaign planning (檔期選品規劃) ----------
  function stripBrandPrefix(name) { return name.replace(/^【[^】]*】\s*/, ''); }
  function normCode(s) { return s.toLowerCase().replace(/[^a-z0-9一-鿿]/g, ''); }
  function candidateCodes(name) {
    var rest = stripBrandPrefix(name).trim();
    var tokens = rest.split(/\s+/);
    var out = [];
    var c1 = normCode(tokens[0] || '');
    if (c1) out.push(c1);
    if (tokens.length > 1) {
      var c2 = normCode(tokens[0] + tokens[1]);
      if (c2 && out.indexOf(c2) === -1) out.push(c2);
    }
    return out;
  }

  function computeProductStats() {
    var maxYmd = records.reduce(function (m, r) { return r.ymd > m ? r.ymd : m; }, '0000-00-00');
    var maxDate = new Date(maxYmd);
    var stats = {};
    records.forEach(function (r) {
      if (!stats[r.product]) stats[r.product] = { allQty: 0, allAmount: 0, recentQty: 0, recentAmount: 0, lastYmd: '0000-00-00' };
      var s = stats[r.product];
      s.allQty += r.qty;
      s.allAmount += r.amount;
      if (r.ymd > s.lastYmd) s.lastYmd = r.ymd;
      var daysAgo = Math.round((maxDate - new Date(r.ymd)) / 86400000);
      if (daysAgo <= 90) { s.recentQty += r.qty; s.recentAmount += r.amount; }
    });
    return stats;
  }

  function buildProductCodeIndex(stats) {
    var index = {};
    Object.keys(stats).forEach(function (p) {
      candidateCodes(p).forEach(function (code) {
        if (!index[code]) index[code] = [];
        if (index[code].indexOf(p) === -1) index[code].push(p);
      });
    });
    return index;
  }

  function matchProduct(name, codeIndex, stats) {
    var codes = candidateCodes(name);
    var best = null;
    codes.forEach(function (code) {
      var arr = codeIndex[code];
      if (!arr) return;
      arr.forEach(function (pname) {
        var s = stats[pname];
        if (!best || s.allAmount > stats[best].allAmount) best = pname;
      });
    });
    return best;
  }

  var CAMPAIGN_ID_KEYWORDS_PRIMARY = ['上架商品id', '品號', '貨號', 'sku'];
  var CAMPAIGN_ID_KEYWORDS_FALLBACK = ['no.', 'no', 'id', '編號'];
  var CAMPAIGN_SKIP_KEYWORDS = ['備註', '備貨', 'ec'];
  var CAMPAIGN_COST_KEYWORDS = ['成本', '進價'];

  function classifyCampaignColumns(header, productColIdx) {
    var lowerHeaders = header.map(function (h) { return (h || '').toString().trim().toLowerCase(); });
    var idIdx = -1;
    for (var i = 0; i < header.length && idIdx === -1; i++) {
      if (i === productColIdx || !lowerHeaders[i]) continue;
      if (CAMPAIGN_ID_KEYWORDS_PRIMARY.some(function (k) { return lowerHeaders[i].indexOf(k) !== -1; })) idIdx = i;
    }
    if (idIdx === -1) {
      for (var j = 0; j < header.length && idIdx === -1; j++) {
        if (j === productColIdx || !lowerHeaders[j]) continue;
        if (CAMPAIGN_ID_KEYWORDS_FALLBACK.some(function (k) { return lowerHeaders[j].indexOf(k) !== -1; })) idIdx = j;
      }
    }
    var allIdKeywords = CAMPAIGN_ID_KEYWORDS_PRIMARY.concat(CAMPAIGN_ID_KEYWORDS_FALLBACK);
    return header.map(function (h, idx) {
      var hl = (h || '').toString().trim();
      var lower = hl.toLowerCase();
      var type;
      if (idx === productColIdx) type = 'product';
      else if (idx === idIdx) type = 'id';
      else if (!hl) type = 'skip';
      else if (allIdKeywords.some(function (k) { return lower.indexOf(k) !== -1; })) type = 'skip';
      else if (CAMPAIGN_SKIP_KEYWORDS.some(function (k) { return lower.indexOf(k) !== -1; })) type = 'skip';
      else if (CAMPAIGN_COST_KEYWORDS.some(function (k) { return hl.indexOf(k) !== -1; })) type = 'cost';
      else type = 'price';
      return { idx: idx, header: hl, type: type };
    });
  }

  function parseCampaignWorkbook(wb) {
    var sheetsOut = [];
    wb.SheetNames.forEach(function (sn) {
      var ws = wb.Sheets[sn];
      if (!ws || !ws['!ref']) return;
      var rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });
      var headerRowIdx = -1, header = null, productColIdx = -1;
      for (var i = 0; i < Math.min(rows.length, 15); i++) {
        var r = rows[i];
        if (!r) continue;
        var idx = r.findIndex(function (c) { return c && String(c).indexOf('品名') !== -1; });
        if (idx !== -1) { headerRowIdx = i; header = r.map(function (c) { return (c || '').toString().trim(); }); productColIdx = idx; break; }
      }
      if (headerRowIdx === -1) return;

      var cols = classifyCampaignColumns(header, productColIdx);
      var idCol = cols.find(function (c) { return c.type === 'id'; });
      var fallbackCostIdx = -1;
      for (var c = 0; c < cols.length; c++) { if (cols[c].type === 'cost') { fallbackCostIdx = c; break; } }
      var pairMap = {};
      cols.forEach(function (col) {
        if (col.type === 'price') {
          var next = cols[col.idx + 1];
          if (next && next.type === 'cost') pairMap[col.idx] = next.idx;
        }
      });
      var priceCols = cols.filter(function (c) { return c.type === 'price'; });
      if (!priceCols.length) return;

      var dataRows = [];
      for (var r2 = headerRowIdx + 1; r2 < rows.length; r2++) {
        var row = rows[r2];
        if (!row) continue;
        var pname = row[productColIdx];
        if (!pname) continue;
        pname = pname.toString().trim();
        var idVal = idCol ? row[idCol.idx] : null;
        if (idVal !== null && idVal !== undefined) idVal = idVal.toString().trim();
        var prices = priceCols.map(function (pc) {
          var raw = row[pc.idx];
          var costIdx = pairMap[pc.idx] !== undefined ? pairMap[pc.idx] : fallbackCostIdx;
          var costVal = costIdx !== -1 ? Number(row[costIdx]) : NaN;
          var priceNum = Number(raw);
          var isNumericPrice = raw !== null && raw !== '' && !isNaN(priceNum);
          var margin = null, marginPct = null;
          if (isNumericPrice && !isNaN(costVal) && costVal !== 0) { margin = priceNum - costVal; marginPct = margin / priceNum * 100; }
          return {
            header: pc.header, raw: raw, isNumericPrice: isNumericPrice,
            price: isNumericPrice ? priceNum : null,
            cost: isNaN(costVal) ? null : costVal,
            marginPct: marginPct
          };
        });
        dataRows.push({ product: pname, id: idVal || '', prices: prices, note: '' });
      }
      if (dataRows.length) sheetsOut.push({
        sheet: sn, idHeader: idCol ? idCol.header : null,
        priceCols: priceCols.map(function (c) { return c.header; }), rows: dataRows
      });
    });
    return sheetsOut;
  }

  function marginClass(marginPct) {
    if (marginPct === null) return '';
    return marginPct >= 15 ? 'growth-up' : (marginPct >= 0 ? '' : 'growth-down');
  }

  function savePlatforms() {
    try { localStorage.setItem(LS_PLATFORMS, JSON.stringify(platforms)); } catch (e) { }
  }
  function loadPlatforms() {
    try {
      var raw = localStorage.getItem(LS_PLATFORMS);
      platforms = raw ? JSON.parse(raw) : [];
    } catch (e) { platforms = []; }
  }

  function flattenParsedSheets(sheets) {
    var idHeader = sheets[0].idHeader;
    var priceCols = sheets[0].priceCols;
    var rows = [];
    sheets.forEach(function (s) { rows = rows.concat(s.rows); });
    return { idHeader: idHeader, priceCols: priceCols, rows: rows };
  }

  function addPlatformFlow() {
    var name = prompt('平台名稱（例如 momo、PCHOME、蝦皮）：');
    if (!name || !name.trim()) return;
    var commissionStr = prompt('這個平台的抽成%（純參考用，例如輸入 8 代表8%，不確定可以留空）：', '');
    var commissionPct = null;
    if (commissionStr && commissionStr.trim() !== '') {
      var n = Number(commissionStr);
      if (!isNaN(n)) commissionPct = n;
    }
    pendingPlatformAction = { mode: 'add', name: name.trim(), commissionPct: commissionPct };
    el('campaignFileInput').value = '';
    el('campaignFileInput').click();
  }

  function reimportPlatformFlow(id) {
    pendingPlatformAction = { mode: 'reimport', platformId: id };
    el('campaignFileInput').value = '';
    el('campaignFileInput').click();
  }

  function renamePlatformFlow(id) {
    var platform = platforms.find(function (p) { return p.id === id; });
    if (!platform) return;
    var name = prompt('平台名稱：', platform.name);
    if (!name || !name.trim()) return;
    var commissionStr = prompt('抽成%（純參考，可留空）：', (platform.commissionPct === null || platform.commissionPct === undefined) ? '' : String(platform.commissionPct));
    var commissionPct = null;
    if (commissionStr && commissionStr.trim() !== '') {
      var n = Number(commissionStr);
      if (!isNaN(n)) commissionPct = n;
    }
    platform.name = name.trim();
    platform.commissionPct = commissionPct;
    savePlatforms();
    renderCampaignTab();
  }

  function removePlatformFlow(id) {
    var platform = platforms.find(function (p) { return p.id === id; });
    if (!platform) return;
    if (!confirm('確定要刪除「' + platform.name + '」這個平台的所有資料嗎？此動作無法復原。')) return;
    platforms = platforms.filter(function (p) { return p.id !== id; });
    if (activePlatformId === id) activePlatformId = platforms.length ? platforms[0].id : null;
    savePlatforms();
    renderCampaignTab();
  }

  async function onCampaignFileChosen() {
    var file = this.files[0];
    var action = pendingPlatformAction;
    pendingPlatformAction = null;
    if (!file || !action) return;
    try {
      var buf = await file.arrayBuffer();
      var wb = XLSX.read(buf, { type: 'array', cellDates: true });
      var sheets = parseCampaignWorkbook(wb);
      if (!sheets.length) { alert('沒有解析到任何品項，請確認檔案裡有一欄叫「品名」的表格。'); return; }
      var flat = flattenParsedSheets(sheets);

      if (action.mode === 'add') {
        var id = 'p' + Date.now();
        platforms.push({
          id: id, name: action.name, commissionPct: action.commissionPct,
          idHeader: flat.idHeader, priceCols: flat.priceCols, rows: flat.rows
        });
        activePlatformId = id;
      } else {
        var idx = platforms.findIndex(function (p) { return p.id === action.platformId; });
        if (idx === -1) return;
        var oldNoteMap = {};
        platforms[idx].rows.forEach(function (r) { if (r.note) oldNoteMap[r.product] = r.note; });
        flat.rows.forEach(function (r) { if (oldNoteMap[r.product]) r.note = oldNoteMap[r.product]; });
        platforms[idx].idHeader = flat.idHeader;
        platforms[idx].priceCols = flat.priceCols;
        platforms[idx].rows = flat.rows;
        activePlatformId = platforms[idx].id;
      }
      savePlatforms();
      renderCampaignTab();
    } catch (e) {
      console.error('讀取檔期檔失敗', file.name, e);
      alert('讀取「' + file.name + '」失敗。\n' + e.message);
    }
  }

  function renderCampaignTab() {
    var container = el('campaignResults');
    if (!container) return;
    if (!platforms.length) {
      container.innerHTML = '<div class="empty-state" style="padding:30px;margin-top:14px"><div class="big">🗂️</div>尚未新增任何平台，按上面「+ 新增平台」開始</div>';
      return;
    }
    if (!platforms.find(function (p) { return p.id === activePlatformId; })) activePlatformId = platforms[0].id;

    var stats = computeProductStats();
    var codeIndex = buildProductCodeIndex(stats);
    var platform = platforms.find(function (p) { return p.id === activePlatformId; });

    var html = '<div class="chip-group" style="margin-bottom:14px;flex-wrap:wrap">';
    platforms.forEach(function (p) {
      var commissionLabel = (p.commissionPct === null || p.commissionPct === undefined) ? '' : (' (抽成' + p.commissionPct + '%)');
      html += '<button class="chip camp-subtab' + (p.id === activePlatformId ? ' active' : '') + '" data-id="' + p.id + '">' + escapeHtml(p.name) + commissionLabel + '</button>';
    });
    html += '</div>';

    html += '<div class="toolbar" style="margin-bottom:10px">' +
      '<button class="btn secondary" id="reimportPlatformBtn" data-id="' + platform.id + '">🔄 重新匯入「' + escapeHtml(platform.name) + '」</button>' +
      '<button class="btn secondary" id="renamePlatformBtn" data-id="' + platform.id + '">✏️ 改名稱／抽成%</button>' +
      '<button class="btn secondary" id="removePlatformBtn" data-id="' + platform.id + '" style="color:#dc2626;border-color:#dc2626">🗑 刪除此平台</button>' +
      '</div>';

    html += '<div style="overflow-x:auto"><table class="data camp-table"><thead><tr><th>商品</th>' +
      (platform.idHeader ? '<th>' + escapeHtml(platform.idHeader) + '</th>' : '') +
      '<th class="num">近90天銷量／營收</th>';
    platform.priceCols.forEach(function (h) { html += '<th class="num">' + escapeHtml(h) + '</th>'; });
    html += '<th>備註／決定</th></tr></thead><tbody>';
    platform.rows.forEach(function (row, ri) {
      var matchName = matchProduct(row.product, codeIndex, stats);
      var histCell;
      if (matchName) {
        var s = stats[matchName];
        histCell = '<span title="比對到：' + escapeHtml(matchName) + '">' + s.recentQty.toLocaleString() + ' 件／$' + fmtMoney(s.recentAmount) + '</span>';
      } else {
        histCell = '<span style="color:#9ca3af">查無歷史(可能新品)</span>';
      }
      html += '<tr><td>' + escapeHtml(row.product) + '</td>' +
        (platform.idHeader ? '<td>' + escapeHtml(row.id || '') + '</td>' : '') +
        '<td class="num">' + histCell + '</td>';
      row.prices.forEach(function (p, pi) {
        var val = p.isNumericPrice ? p.price : '';
        var marginHtml = '';
        if (val !== '') {
          marginHtml = p.marginPct !== null
            ? ('<br><span class="margin-note ' + marginClass(p.marginPct) + '" style="font-size:11px">毛利' + p.marginPct.toFixed(1) + '%</span>')
            : '<br><span class="margin-note" style="font-size:11px;color:#9ca3af">(無成本可比)</span>';
        }
        html += '<td class="num"><input type="number" class="camp-price-input" style="width:78px;text-align:right" ' +
          'data-platform="' + platform.id + '" data-ri="' + ri + '" data-pi="' + pi + '" value="' + val + '">' + marginHtml + '</td>';
      });
      html += '<td><input type="text" class="camp-note-input" style="width:140px" placeholder="例如：已提報1799" ' +
        'data-platform="' + platform.id + '" data-ri="' + ri + '" value="' + escapeHtml(row.note || '') + '"></td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    container.innerHTML = html;

    Array.prototype.forEach.call(container.querySelectorAll('.camp-subtab'), function (btn) {
      btn.onclick = function () { activePlatformId = btn.getAttribute('data-id'); renderCampaignTab(); };
    });
    var reimportBtn = container.querySelector('#reimportPlatformBtn');
    if (reimportBtn) reimportBtn.onclick = function () { reimportPlatformFlow(reimportBtn.getAttribute('data-id')); };
    var renameBtn = container.querySelector('#renamePlatformBtn');
    if (renameBtn) renameBtn.onclick = function () { renamePlatformFlow(renameBtn.getAttribute('data-id')); };
    var removeBtn = container.querySelector('#removePlatformBtn');
    if (removeBtn) removeBtn.onclick = function () { removePlatformFlow(removeBtn.getAttribute('data-id')); };
    Array.prototype.forEach.call(container.querySelectorAll('.camp-price-input'), function (inp) {
      inp.oninput = debounce(function () { onCampaignPriceEdit(inp); }, 300);
    });
    Array.prototype.forEach.call(container.querySelectorAll('.camp-note-input'), function (inp) {
      inp.oninput = debounce(function () { onCampaignNoteEdit(inp); }, 300);
    });
  }

  function onCampaignPriceEdit(inp) {
    var platformId = inp.getAttribute('data-platform'), ri = +inp.getAttribute('data-ri'), pi = +inp.getAttribute('data-pi');
    var platform = platforms.find(function (p) { return p.id === platformId; });
    if (!platform) return;
    var p = platform.rows[ri].prices[pi];
    var noteSpan = inp.parentElement.querySelector('.margin-note');

    if (inp.value === '') {
      p.isNumericPrice = false; p.price = null; p.raw = ''; p.marginPct = null;
      if (noteSpan) {
        var br = noteSpan.previousElementSibling;
        if (br && br.tagName === 'BR') br.remove();
        noteSpan.remove();
      }
      savePlatforms();
      return;
    }

    var newPrice = Number(inp.value);
    if (isNaN(newPrice)) return;
    p.isNumericPrice = true; p.price = newPrice; p.raw = newPrice;
    p.marginPct = (p.cost !== null && p.cost !== 0) ? (newPrice - p.cost) / newPrice * 100 : null;

    if (!noteSpan) {
      inp.insertAdjacentHTML('afterend', '<br><span class="margin-note"></span>');
      noteSpan = inp.parentElement.querySelector('.margin-note');
    }
    if (p.marginPct !== null) {
      noteSpan.textContent = '毛利' + p.marginPct.toFixed(1) + '%';
      noteSpan.className = 'margin-note ' + marginClass(p.marginPct);
      noteSpan.style.color = '';
    } else {
      noteSpan.textContent = '(無成本可比)';
      noteSpan.className = 'margin-note';
      noteSpan.style.color = '#9ca3af';
    }
    savePlatforms();
  }

  function onCampaignNoteEdit(inp) {
    var platformId = inp.getAttribute('data-platform'), ri = +inp.getAttribute('data-ri');
    var platform = platforms.find(function (p) { return p.id === platformId; });
    if (!platform) return;
    platform.rows[ri].note = inp.value;
    savePlatforms();
  }

  function exportCampaignExcel() {
    if (!platforms.length) { alert('目前沒有任何平台的資料可以匯出。'); return; }
    var stats = computeProductStats();
    var codeIndex = buildProductCodeIndex(stats);
    var wb = XLSX.utils.book_new();
    var usedSheetNames = {};
    platforms.forEach(function (platform) {
      var header = ['商品'];
      if (platform.idHeader) header.push(platform.idHeader);
      header.push('近90天銷量', '近90天營收');
      platform.priceCols.forEach(function (h) { header.push(h); header.push(h + '_成本'); header.push(h + '_毛利率'); });
      header.push('備註/決定');
      var aoa = [header];
      var marginFormulaSpots = [];

      platform.rows.forEach(function (row, rIdx) {
        var matchName = matchProduct(row.product, codeIndex, stats);
        var s = matchName ? stats[matchName] : null;
        var line = [row.product];
        if (platform.idHeader) line.push(row.id || '');
        line.push(s ? s.recentQty : '', s ? s.recentAmount : '');
        row.prices.forEach(function (p) {
          var priceCol = line.length;
          line.push(p.isNumericPrice ? p.price : (p.raw || ''));
          var costCol = line.length;
          line.push(p.cost !== null ? p.cost : '');
          var marginCol = line.length;
          line.push(p.marginPct !== null ? Math.round(p.marginPct * 10) / 10 / 100 : '');
          if (p.isNumericPrice && p.cost !== null) {
            marginFormulaSpots.push({ dataRowIdx: rIdx, priceCol: priceCol, costCol: costCol, marginCol: marginCol });
          }
        });
        line.push(row.note || '');
        aoa.push(line);
      });

      var ws = XLSX.utils.aoa_to_sheet(aoa);
      marginFormulaSpots.forEach(function (spot) {
        var excelRow = spot.dataRowIdx + 1;
        var priceRef = XLSX.utils.encode_cell({ r: excelRow, c: spot.priceCol });
        var costRef = XLSX.utils.encode_cell({ r: excelRow, c: spot.costCol });
        var marginRef = XLSX.utils.encode_cell({ r: excelRow, c: spot.marginCol });
        ws[marginRef] = { t: 'n', f: '(' + priceRef + '-' + costRef + ')/' + priceRef, z: '0.0%', v: ws[marginRef] ? ws[marginRef].v : 0 };
      });

      var baseName = platform.name.slice(0, 28) || 'Sheet';
      var sheetName = baseName, n = 1;
      while (usedSheetNames[sheetName]) { sheetName = (baseName + '_' + (++n)).slice(0, 31); }
      usedSheetNames[sheetName] = true;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
    var today = new Date();
    var stamp = today.getFullYear() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');
    XLSX.writeFile(wb, '檔期選品規劃_匯出_' + stamp + '.xlsx');
  }

  // ---------- tabs ----------
  function setupTabs() {
    var buttons = document.querySelectorAll('#tabs button');
    buttons.forEach(function (b) {
      b.onclick = function () {
        buttons.forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
        el('page-' + b.getAttribute('data-page')).classList.add('active');
      };
    });
  }

  // ---------- boot ----------
  var booted = false;
  async function boot() {
    if (booted) return;
    booted = true;
    loadOverrides();
    setupTabs();

    el('parseBtn').onclick = function () { handleFiles(el('fileInput').files); };
    el('channelSearch').oninput = debounce(function () { renderChannelTable(el('channelSearch').value); }, 200);
    el('resetOverrides').onclick = function () {
      if (!confirm('確定要清除所有手動分類設定嗎？')) return;
      channelOverrides = {};
      saveOverrides();
      renderAll();
    };

    el('addPlatformBtn').onclick = addPlatformFlow;
    el('campaignFileInput').onchange = onCampaignFileChosen;
    el('campaignExportBtn').onclick = exportCampaignExcel;
    el('winbackChannelType').onchange = renderWinback;
    el('winbackMinSpend').oninput = debounce(renderWinback, 250);
    el('winbackMinIdleDays').oninput = debounce(renderWinback, 250);
    el('winbackSearch').oninput = debounce(renderWinback, 250);
    el('githubSyncBtn').onclick = syncToGithub;

    loadPlatforms();
    renderCampaignTab();
    if (platforms.length) {
      el('campaignStatusLine').textContent = '共 ' + platforms.length + ' 個平台';
    }

    var remoteSavedAt = await tryLoadRemoteSnapshot();
    if (remoteSavedAt) {
      renderAll();
      var remoteWhen = typeof remoteSavedAt === 'string' ? new Date(remoteSavedAt).toLocaleString('zh-TW') : '';
      el('statusLine').textContent += remoteWhen ? ('　|　已自動載入GitHub同步資料（' + remoteWhen + '）') : '　|　已自動載入GitHub同步資料';
      return;
    }

    var cached = loadCachedDataset();
    if (cached) {
      renderAll();
      var when = typeof cached === 'string' ? new Date(cached).toLocaleString('zh-TW') : '';
      if (when) el('statusLine').textContent += '　|　資料快取於 ' + when;
    }
  }

  function init() {
    setupAuthGate();
    if (isAuthed()) boot();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
