(function () {
  'use strict';
  if (!document.getElementById('page-notes')) return;

  var LS_CACHE = 'nt_notes_cache_v1';
  var LS_GH_TOKEN = 'xh_gh_token_v1'; // 沿用銷售資料同步分頁已存的 GitHub token，同一個 repo 不用重貼
  var GH_OWNER = 'larissa0707';
  var GH_REPO = 'Larissacloud-work';
  var GH_NOTES_PATH = 'notes.json';

  var IMG_MAX_DIM = 1400;
  var IMG_QUALITY = 0.82;
  var DRAW_QUALITY = 0.9;

  var notes = [];        // [{id, title, html, updatedAt}]
  var activeId = null;
  var dirty = false;

  function el(id) { return document.getElementById(id); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function escapeHtml(s) { return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // ---------- local persistence ----------
  function saveLocal() {
    try {
      localStorage.setItem(LS_CACHE, JSON.stringify({ notes: notes, savedAt: new Date().toISOString() }));
      return true;
    } catch (e) {
      console.error('筆記本機存檔失敗', e);
      el('nt-savedHint').textContent = '⚠️ 本機存檔空間不足，建議先同步到GitHub後刪除較大的圖片';
      return false;
    }
  }
  function loadLocal() {
    try {
      var raw = localStorage.getItem(LS_CACHE);
      if (!raw) return null;
      var data = JSON.parse(raw);
      return (data && Array.isArray(data.notes)) ? data.notes : null;
    } catch (e) { return null; }
  }

  // ---------- GitHub sync (reuses the same token as the sales-data sync tab) ----------
  function utf8ToBase64(str) { return btoa(unescape(encodeURIComponent(str))); }

  function getGithubToken(forcePrompt) {
    var token = localStorage.getItem(LS_GH_TOKEN);
    if (!token || forcePrompt) {
      var entered = prompt('貼上你的 GitHub Personal Access Token（開頭通常是 github_pat_ 或 ghp_；只會存在這台裝置）：', '');
      if (entered === null) return null;
      token = entered.trim();
      if (!token) return null;
      localStorage.setItem(LS_GH_TOKEN, token);
    }
    return token;
  }

  async function ghApi(path, token, options) {
    options = options || {};
    var headers = Object.assign({
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }, options.headers || {});
    var finalOpts = Object.assign({}, options, { headers: headers });
    return fetch('https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO + path, finalOpts);
  }

  async function ghErrorMsg(resp) {
    try { var j = await resp.json(); return j.message || JSON.stringify(j); } catch (e) { return ''; }
  }

  async function syncNotesToGithub() {
    var statusEl = el('nt-savedHint');
    var token = getGithubToken(false);
    if (!token) return;
    statusEl.textContent = '同步中...';
    try {
      var payload = { savedAt: new Date().toISOString(), notes: notes };
      var content = utf8ToBase64(JSON.stringify(payload));

      var refResp = await ghApi('/git/refs/heads/main', token);
      if (refResp.status === 401 || refResp.status === 403) { return authFail(statusEl); }
      if (!refResp.ok) throw new Error('讀取分支失敗 (' + refResp.status + ') ' + (await ghErrorMsg(refResp)));
      var refData = await refResp.json();
      var commitSha = refData.object.sha;

      var commitResp = await ghApi('/git/commits/' + commitSha, token);
      if (commitResp.status === 401 || commitResp.status === 403) { return authFail(statusEl); }
      if (!commitResp.ok) throw new Error('讀取commit失敗 (' + commitResp.status + ') ' + (await ghErrorMsg(commitResp)));
      var commitData = await commitResp.json();
      var baseTreeSha = commitData.tree.sha;

      var blobResp = await ghApi('/git/blobs', token, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content, encoding: 'base64' })
      });
      if (blobResp.status === 401 || blobResp.status === 403) { return authFail(statusEl); }
      if (!blobResp.ok) throw new Error('建立blob失敗 (' + blobResp.status + ') ' + (await ghErrorMsg(blobResp)));
      var blobData = await blobResp.json();

      var treeResp = await ghApi('/git/trees', token, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_tree: baseTreeSha, tree: [{ path: GH_NOTES_PATH, mode: '100644', type: 'blob', sha: blobData.sha }] })
      });
      if (treeResp.status === 401 || treeResp.status === 403) { return authFail(statusEl); }
      if (!treeResp.ok) throw new Error('建立tree失敗 (' + treeResp.status + ') ' + (await ghErrorMsg(treeResp)));
      var treeData = await treeResp.json();

      var newCommitResp = await ghApi('/git/commits', token, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '同步筆記 ' + new Date().toLocaleString('zh-TW'), tree: treeData.sha, parents: [commitSha] })
      });
      if (newCommitResp.status === 401 || newCommitResp.status === 403) { return authFail(statusEl); }
      if (!newCommitResp.ok) throw new Error('建立commit失敗 (' + newCommitResp.status + ') ' + (await ghErrorMsg(newCommitResp)));
      var newCommitData = await newCommitResp.json();

      var updateRefResp = await ghApi('/git/refs/heads/main', token, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha: newCommitData.sha, force: true })
      });
      if (updateRefResp.status === 401 || updateRefResp.status === 403) { return authFail(statusEl); }
      if (!updateRefResp.ok) throw new Error('更新分支失敗 (' + updateRefResp.status + ') ' + (await ghErrorMsg(updateRefResp)));

      statusEl.textContent = '✅ 筆記已同步 ' + new Date().toLocaleString('zh-TW');
    } catch (e) {
      console.error('筆記同步失敗', e);
      statusEl.textContent = '❌ 同步失敗：' + e.message;
    }
  }
  function authFail(statusEl) {
    localStorage.removeItem(LS_GH_TOKEN);
    statusEl.textContent = '❌ Token 無效，請按右上角「🔑 Token」重設';
    alert('這台裝置的 GitHub Token 無效或已失效（例如你在 GitHub 重新產生過）。\n\n已清除舊的。請按右上角「🔑 Token」貼上新的，再按一次同步。\n\n（產生 Token 時 Contents 要設為 Read and write）');
  }

  async function tryLoadRemoteNotes() {
    try {
      var resp = await fetch('notes.json', { cache: 'no-store' });
      if (!resp.ok) return null;
      var data = await resp.json();
      if (!data || !Array.isArray(data.notes)) return null;
      return data.notes;
    } catch (e) { return null; }
  }

  // ---------- image → WebP ----------
  function fileToWebp(file, maxDim, quality) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight;
        var scale = Math.min(1, maxDim / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
        var canvas = document.createElement('canvas');
        canvas.width = cw; canvas.height = ch;
        canvas.getContext('2d').drawImage(img, 0, 0, cw, ch);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/webp', quality));
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('圖片讀取失敗')); };
      img.src = url;
    });
  }

  function insertImageDataUrl(dataUrl) {
    var editor = el('nt-editor');
    editor.focus();
    document.execCommand('insertImage', false, dataUrl);
    onEditorChange();
  }

  function handleImageFile(file) {
    if (!file || file.type.indexOf('image') === -1) return;
    fileToWebp(file, IMG_MAX_DIM, IMG_QUALITY).then(insertImageDataUrl).catch(function (e) {
      alert('圖片轉換失敗：' + e.message);
    });
  }

  // ---------- notes CRUD ----------
  function getActive() { return notes.find(function (n) { return n.id === activeId; }); }

  function newNote() {
    var n = { id: uid(), title: '', html: '', updatedAt: Date.now() };
    notes.unshift(n);
    activeId = n.id;
    saveLocal();
    renderList();
    renderEditor();
    el('nt-titleInput').focus();
  }

  function deleteActive() {
    var n = getActive();
    if (!n) return;
    if (!confirm('確定要刪除「' + (n.title || '無標題筆記') + '」嗎？此動作無法復原（除非之前有同步到GitHub）。')) return;
    notes = notes.filter(function (x) { return x.id !== n.id; });
    activeId = notes.length ? notes[0].id : null;
    saveLocal();
    renderList();
    renderEditor();
  }

  function onEditorChange() {
    var n = getActive();
    if (!n) return;
    n.html = el('nt-editor').innerHTML;
    n.updatedAt = Date.now();
    dirty = true;
    scheduleAutosave();
    renderList();
  }
  function onTitleChange() {
    var n = getActive();
    if (!n) return;
    n.title = el('nt-titleInput').value;
    n.updatedAt = Date.now();
    dirty = true;
    scheduleAutosave();
    renderList();
  }

  var autosaveTimer = null;
  function scheduleAutosave() {
    clearTimeout(autosaveTimer);
    el('nt-savedHint').textContent = '編輯中…';
    autosaveTimer = setTimeout(function () {
      if (saveLocal()) el('nt-savedHint').textContent = '已存在本機 ' + new Date().toLocaleTimeString('zh-TW');
      dirty = false;
    }, 500);
  }

  // ---------- render ----------
  function fmtWhen(ts) {
    var d = new Date(ts);
    var today = new Date();
    var sameDay = d.toDateString() === today.toDateString();
    return sameDay ? d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('zh-TW');
  }
  function plainPreview(html) {
    var div = document.createElement('div');
    div.innerHTML = html || '';
    var t = (div.textContent || '').trim();
    return t.slice(0, 40) || (div.querySelector('img') ? '［圖片］' : '空白筆記');
  }

  function renderList() {
    var listEl = el('nt-list');
    var term = (el('nt-search').value || '').trim().toLowerCase();
    var sorted = notes.slice().sort(function (a, b) { return b.updatedAt - a.updatedAt; });
    var filtered = term ? sorted.filter(function (n) {
      return (n.title || '').toLowerCase().indexOf(term) !== -1 || plainPreview(n.html).toLowerCase().indexOf(term) !== -1;
    }) : sorted;

    if (!filtered.length) {
      listEl.innerHTML = '<div class="nt-empty-list">' + (term ? '沒有符合的筆記' : '還沒有筆記，按上面「＋ 新增筆記」開始') + '</div>';
      return;
    }
    listEl.innerHTML = filtered.map(function (n) {
      return '<div class="nt-item' + (n.id === activeId ? ' nt-active' : '') + '" data-nt-id="' + n.id + '">' +
        '<div class="nt-item-title">' + escapeHtml(n.title || '無標題筆記') + '</div>' +
        '<div class="nt-item-meta">' + fmtWhen(n.updatedAt) + ' · ' + escapeHtml(plainPreview(n.html)) + '</div>' +
        '</div>';
    }).join('');
    listEl.querySelectorAll('[data-nt-id]').forEach(function (item) {
      item.onclick = function () {
        activeId = item.getAttribute('data-nt-id');
        renderList();
        renderEditor();
      };
    });
  }

  function renderEditor() {
    var main = el('nt-editorArea');
    var n = getActive();
    if (!n) {
      main.style.display = 'none';
      el('nt-noNote').style.display = 'flex';
      return;
    }
    main.style.display = 'flex';
    el('nt-noNote').style.display = 'none';
    el('nt-titleInput').value = n.title || '';
    el('nt-editor').innerHTML = n.html || '';
  }

  // ---------- toolbar ----------
  function bindToolbar() {
    document.querySelectorAll('#page-notes [data-nt-cmd]').forEach(function (b) {
      b.addEventListener('click', function () {
        el('nt-editor').focus();
        document.execCommand(b.getAttribute('data-nt-cmd'), false, null);
        onEditorChange();
      });
    });
    document.querySelectorAll('#page-notes [data-nt-block]').forEach(function (b) {
      b.addEventListener('click', function () {
        el('nt-editor').focus();
        document.execCommand('formatBlock', false, b.getAttribute('data-nt-block'));
        onEditorChange();
      });
    });
    el('nt-imgBtn').onclick = function () { el('nt-fileInput').click(); };
    el('nt-fileInput').onchange = function (e) {
      Array.prototype.forEach.call(e.target.files, handleImageFile);
      e.target.value = '';
    };

    var editor = el('nt-editor');
    editor.addEventListener('input', onEditorChange);
    editor.addEventListener('paste', function (e) {
      var items = (e.clipboardData || window.clipboardData).items || [];
      var hadImage = false;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.indexOf('image') !== -1) {
          hadImage = true;
          handleImageFile(items[i].getAsFile());
        }
      }
      if (hadImage) e.preventDefault();
    });
    editor.addEventListener('dragover', function (e) { e.preventDefault(); });
    editor.addEventListener('drop', function (e) {
      var files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length) {
        e.preventDefault();
        Array.prototype.forEach.call(files, handleImageFile);
      }
    });

    el('nt-titleInput').addEventListener('input', onTitleChange);
    el('nt-newBtn').onclick = newNote;
    el('nt-deleteBtn').onclick = deleteActive;
    el('nt-search').addEventListener('input', renderList);
    el('nt-syncBtn').onclick = syncNotesToGithub;
  }

  // ---------- handwriting ----------
  var draw = { ctx: null, drawing: false, color: '#1e293b', size: 4, undoStack: [] };
  var SWATCHES = ['#1e293b', '#e11d48', '#d97706', '#059669', '#0284c7', '#7c3aed'];

  function openDrawModal() {
    var modal = el('nt-drawModal');
    modal.classList.remove('nt-hidden');
    var canvas = el('nt-canvas');
    var rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(600, Math.round(rect.width * 2));
    canvas.height = Math.max(400, Math.round(rect.height * 2));
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    draw.ctx = ctx;
    draw.undoStack = [];
  }
  function closeDrawModal() { el('nt-drawModal').classList.add('nt-hidden'); }

  function canvasPoint(e) {
    var canvas = el('nt-canvas');
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }
  function pushUndoSnapshot() {
    var canvas = el('nt-canvas');
    draw.undoStack.push(draw.ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (draw.undoStack.length > 30) draw.undoStack.shift();
  }
  function undoDraw() {
    if (!draw.undoStack.length) return;
    var img = draw.undoStack.pop();
    draw.ctx.putImageData(img, 0, 0);
  }
  function clearDraw() {
    pushUndoSnapshot();
    var canvas = el('nt-canvas');
    draw.ctx.fillStyle = '#ffffff';
    draw.ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function bindDrawing() {
    var swatchWrap = el('nt-swatches');
    swatchWrap.innerHTML = SWATCHES.map(function (c, i) {
      return '<button type="button" class="nt-swatch' + (i === 0 ? ' nt-active' : '') + '" style="background:' + c + '" data-nt-color="' + c + '"></button>';
    }).join('');
    swatchWrap.querySelectorAll('[data-nt-color]').forEach(function (b) {
      b.onclick = function () {
        draw.color = b.getAttribute('data-nt-color');
        el('nt-colorPicker').value = draw.color;
        swatchWrap.querySelectorAll('.nt-swatch').forEach(function (s) { s.classList.remove('nt-active'); });
        b.classList.add('nt-active');
      };
    });
    el('nt-colorPicker').oninput = function (e) { draw.color = e.target.value; };
    el('nt-brushSize').oninput = function (e) { draw.size = +e.target.value; };

    var canvas = el('nt-canvas');
    var lastPt = null;
    function down(e) {
      draw.drawing = true;
      pushUndoSnapshot();
      lastPt = canvasPoint(e);
      canvas.setPointerCapture(e.pointerId);
    }
    function move(e) {
      if (!draw.drawing) return;
      var p = canvasPoint(e);
      var ctx = draw.ctx;
      var pressure = (e.pointerType === 'pen' && e.pressure) ? Math.max(0.3, e.pressure) : 1;
      ctx.strokeStyle = draw.color;
      ctx.lineWidth = draw.size * pressure * (canvas.width / canvas.getBoundingClientRect().width);
      ctx.beginPath();
      ctx.moveTo(lastPt.x, lastPt.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      lastPt = p;
    }
    function up(e) { draw.drawing = false; lastPt = null; }
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointerleave', up);

    el('nt-drawBtn').onclick = openDrawModal;
    el('nt-drawCancelBtn').onclick = closeDrawModal;
    el('nt-undoBtn').onclick = undoDraw;
    el('nt-clearBtn').onclick = clearDraw;
    el('nt-drawInsertBtn').onclick = function () {
      var dataUrl = canvas.toDataURL('image/webp', DRAW_QUALITY);
      closeDrawModal();
      insertImageDataUrl(dataUrl);
    };
    el('nt-drawModal').addEventListener('click', function (e) {
      if (e.target === el('nt-drawModal')) closeDrawModal();
    });
  }

  // ---------- boot ----------
  async function boot() {
    var remote = await tryLoadRemoteNotes();
    var local = loadLocal();
    notes = remote || local || [];
    if (remote && local) {
      // 遠端(GitHub)資料存在時以遠端為主，但保留本機上比遠端更新的筆記，避免離線編輯被覆蓋掉
      var remoteIds = {};
      remote.forEach(function (n) { remoteIds[n.id] = n; });
      local.forEach(function (ln) {
        var rn = remoteIds[ln.id];
        if (!rn || ln.updatedAt > rn.updatedAt) {
          var idx = notes.findIndex(function (n) { return n.id === ln.id; });
          if (idx === -1) notes.unshift(ln); else notes[idx] = ln;
        }
      });
    }
    activeId = notes.length ? notes.slice().sort(function (a, b) { return b.updatedAt - a.updatedAt; })[0].id : null;
    bindToolbar();
    bindDrawing();
    renderList();
    renderEditor();
  }

  document.addEventListener('DOMContentLoaded', boot);
  if (document.readyState === 'complete' || document.readyState === 'interactive') boot();
})();
