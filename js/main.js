(function () {
  'use strict';

  var SERIES = window.SERIES || [];

  var stage = document.getElementById('stage');
  var stageWrap = document.getElementById('stage-wrap');
  var roomName = document.getElementById('roomName');
  var navLeft = document.getElementById('navLeft');
  var navRight = document.getElementById('navRight');
  var enterBtn = document.getElementById('enterBtn');
  var homeBtn = document.getElementById('homeBtn');
  var walker = document.getElementById('walker');

  var lightbox = document.getElementById('lightbox');
  var lbWrap = document.getElementById('lbWrap');
  var lbZoom = document.getElementById('lbZoom');
  var lbRestore = document.getElementById('lbRestore');
  var lbAuto = document.getElementById('lbAuto');
  var lbAutoH = document.getElementById('lbAutoH');
  var lbImg = document.getElementById('lbImg');
  var lbTitle = document.getElementById('lbTitle');
  var lbDesc = document.getElementById('lbDesc');
  var lbExif = document.getElementById('lbExif');
  var lbNote = document.getElementById('lbNote');
  var lbTag = document.getElementById('lbTag');
  var lbClose = document.getElementById('lbClose');
  var lbPrev = document.getElementById('lbPrev');
  var lbNext = document.getElementById('lbNext');

  var rooms = [];
  var PHOTOS = [];
  var idx = 0;
  var walkTimer = null;
  var lbOpen = false;
  var lbIndex = 0;
  var lastFocus = null;

  function buildRooms() {    var anchor = document.getElementById('series-anchor');
    var frag = document.createDocumentFragment();

    SERIES.forEach(function (s) {
      var sec = document.createElement('section');
      sec.className = 'room room-series';
      sec.setAttribute('data-name', s.title);
      sec.setAttribute('data-theme', s.theme || 'warm');

      var head = document.createElement('div');
      head.className = 'series-head';
      var h2 = document.createElement('h2');
      h2.className = 'series-title';
      h2.textContent = s.title;
      var meta = document.createElement('p');
      meta.className = 'series-meta';
      var sorted = s.photos.slice().sort(function (a, b) {
        a = a.date || ''; b = b.date || '';
        return a < b ? -1 : a > b ? 1 : 0;
      });
      var range = sorted.length > 1 ? ' · ' + sorted[0].date + ' ~ ' + sorted[sorted.length - 1].date : '';
      meta.textContent = s.desc + ' · ' + s.photos.length + ' 张' + range;
      head.appendChild(h2);
      head.appendChild(meta);

      var frames = document.createElement('div');
      frames.className = 'frames';
      var n = s.photos.length;
      var fh = n <= 8 ? 210 : n <= 16 ? 185 : n <= 30 ? 155 : 135;
      frames.style.setProperty('--fh', fh + 'px');

      sorted.forEach(function (p) {
        p.seriesTitle = s.title;
        p.seriesDesc = s.desc;
        p.__series = s;
        p.index = PHOTOS.length;
        PHOTOS.push(p);

        var fig = document.createElement('figure');
        fig.className = 'frame';
        fig.setAttribute('data-photo', p.index);
        fig.tabIndex = 0;
        fig.setAttribute('role', 'button');
        fig.setAttribute('aria-label', '查看作品' + (p.caption || p.date));
        p.__fig = fig;

        var inner = document.createElement('span');
        inner.className = 'frame-inner';
        var img = document.createElement('img');
        img.src = p.src;
        img.alt = p.caption || (s.title + ' ' + p.date);
        img.loading = 'lazy';
        inner.appendChild(img);

        var cap = document.createElement('figcaption');
        cap.className = 'plaque';
        cap.textContent = p.caption || p.date;

        var del = document.createElement('span');
        del.className = 'del-btn';
        del.setAttribute('role', 'button');
        del.setAttribute('aria-label', '删除这张照片');
        del.textContent = '✕';

        fig.appendChild(inner);
        fig.appendChild(cap);
        fig.appendChild(del);
        frames.appendChild(fig);
      });

      sec.appendChild(head);
      sec.appendChild(frames);

      var corner = document.createElement('button');
      corner.type = 'button';
      corner.className = 'add-corner';
      corner.setAttribute('data-series', s.id);
      corner.textContent = '＋ 添加照片';
      sec.appendChild(corner);

      frag.appendChild(sec);
    });

    anchor.parentNode.replaceChild(frag, anchor);
    rooms = Array.prototype.slice.call(stage.querySelectorAll('.room'));

    var indexBox = document.getElementById('lobbyIndex');
    if (indexBox) {
      indexBox.innerHTML = '';
      SERIES.forEach(function (s, si) {
        var sorted = s.photos.slice().sort(function (a, b) {
          a = a.date || ''; b = b.date || '';
          return a < b ? -1 : a > b ? 1 : 0;
        });
        var card = document.createElement('button');
        card.type = 'button';
        card.className = 'idx-card';
        card.setAttribute('data-theme', s.theme || 'warm');
        if (sorted.length) {
          var cover = document.createElement('img');
          cover.className = 'idx-cover';
          cover.src = sorted[0].src;
          cover.alt = s.title;
          cover.loading = 'lazy';
          card.appendChild(cover);
        }
        var t = document.createElement('div');
        t.className = 'idx-title';
        t.textContent = s.title;
        var m = document.createElement('div');
        m.className = 'idx-meta';
        m.textContent = s.desc + ' · ' + s.photos.length + ' 张' + (sorted.length > 1 ? ' · ' + sorted[0].date + ' ~ ' + sorted[sorted.length - 1].date : '');
        card.appendChild(t);
        card.appendChild(m);
        card.addEventListener('click', function () {
          var target = 1 + si;
          if (target === idx) return;
          var dir = target > idx ? 1 : -1;
          idx = target;
          updateRoom();
          walkAnim(dir);
        });
        indexBox.appendChild(card);
      });
    }
  }

  function updateRoom() {
    stage.style.transform = 'translateX(-' + (idx * 100) + 'vw)';
    roomName.textContent = rooms[idx] ? rooms[idx].getAttribute('data-name') : '';
    navLeft.disabled = idx === 0;
    navRight.disabled = idx === rooms.length - 1;
    homeBtn.disabled = idx === 0;
  }

  function walkAnim(dir) {
    walker.classList.remove('idle');
    walker.classList.add('walk');
    walker.classList.toggle('flip', dir < 0);
    if (walkTimer) clearTimeout(walkTimer);
    walkTimer = setTimeout(function () {
      walker.classList.remove('walk');
      walker.classList.add('idle');
    }, 740);
  }

  function go(dir) {
    var next = idx + dir;
    if (next < 0 || next >= rooms.length) return;
    idx = next;
    updateRoom();
    walkAnim(dir);
  }

  function addRow(list, k, v) {
    var li = document.createElement('li');
    var a = document.createElement('span');
    a.textContent = k;
    var b = document.createElement('span');
    b.textContent = v;
    li.appendChild(a); li.appendChild(b);
    list.appendChild(li);
  }

  function bindAutoScroll(btn, axis) {
    var scrolling = false;
    var hold = false;
    var holdStart = 0;
    var lastTs = 0;

    function stop() {
      scrolling = false;
      hold = false;
      btn.classList.remove('active');
      btn.textContent = axis === 'y' ? '▼ 长按下滑' : '▶ 长按横滑';
    }

    function start() {
      if (scrolling) return;
      scrolling = true;
      lastTs = 0;
      btn.classList.add('active');
      btn.textContent = axis === 'y' ? '▼ 下滑中' : '▶ 横滑中';
      requestAnimationFrame(step);
    }

    function step(ts) {
      if (!scrolling) return;
      if (lastTs) {
        var d = 0.15 * (ts - lastTs);
        if (axis === 'y') { lbWrap.scrollTop += d; } else { lbWrap.scrollLeft += d; }
        var pos = axis === 'y' ? lbWrap.scrollTop : lbWrap.scrollLeft;
        var max = axis === 'y' ? (lbWrap.scrollHeight - lbWrap.clientHeight) : (lbWrap.scrollWidth - lbWrap.clientWidth);
        if (pos >= max - 1) { stop(); return; }
      }
      lastTs = ts;
      requestAnimationFrame(step);
    }

    function down(e) {
      if (!lbWrap.classList.contains('zoom')) return;
      e.preventDefault();
      e.stopPropagation();
      hold = true;
      holdStart = Date.now();
      btn._wasPlaying = scrolling;
      start();
    }

    function up() {
      if (!hold) return;
      hold = false;
      var held = Date.now() - holdStart;
      if (held >= 260) { stop(); return; }
      if (btn._wasPlaying) stop();
    }

    btn.addEventListener('mousedown', down);
    btn.addEventListener('mouseup', up);
    btn.addEventListener('mouseleave', function () { if (hold) stop(); });
    btn.addEventListener('touchstart', function (e) { down(e); }, { passive: false });
    btn.addEventListener('touchend', up);
    btn.addEventListener('touchcancel', stop);
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    return stop;
  }

  var stopAutoV = bindAutoScroll(lbAuto, 'y');
  var stopAutoH = bindAutoScroll(lbAutoH, 'x');

  function stopAutoScroll() {
    stopAutoV();
    stopAutoH();
  }

  function setZoom(mode) {
    lbWrap.classList.toggle('zoom', !!mode);
    stopAutoScroll();
  }

  /* 拖拽平移（在放大的照片上按住拖动） */
  var panning = false;
  var panMoved = false;
  var panX = 0;
  var panY = 0;

  lbImg.addEventListener('mousedown', function (e) {
    if (!lbWrap.classList.contains('zoom')) return;
    e.preventDefault();
    panning = true;
    panMoved = false;
    panX = e.clientX;
    panY = e.clientY;
  });

  document.addEventListener('mousemove', function (e) {
    if (!panning) return;
    var dx = e.clientX - panX;
    var dy = e.clientY - panY;
    if (Math.abs(dx) + Math.abs(dy) > 4) panMoved = true;
    lbWrap.scrollLeft -= dx;
    lbWrap.scrollTop -= dy;
    panX = e.clientX;
    panY = e.clientY;
  });

  document.addEventListener('mouseup', function () {
    if (panning) {
      panning = false;
      setTimeout(function () { panMoved = false; }, 0);
    }
  });

  function renderPhoto(i) {
    setZoom(false);
    var p = PHOTOS[i];
    lbImg.src = p.src;
    lbImg.alt = p.caption || p.date;
    lbTitle.textContent = p.caption || (p.seriesTitle + ' · ' + p.date);
    lbDesc.textContent = p.caption ? p.seriesDesc : '';

    lbExif.innerHTML = '';
    if (p.camera) addRow(lbExif, '相机', p.camera);
    if (p.lens) addRow(lbExif, '镜头', p.lens);
    if (p.aperture) addRow(lbExif, '光圈', p.aperture);
    if (p.shutter) addRow(lbExif, '快门', p.shutter);
    if (p.iso) addRow(lbExif, '感光度', p.iso);
    if (p.focal) addRow(lbExif, '焦距', p.focal);
    if (p.date) addRow(lbExif, '日期', p.date);
    addRow(lbExif, '原始尺寸', p.w + ' × ' + p.h);

    var hasShotExif = !!(p.camera || p.aperture || p.shutter || p.iso || p.focal);
    lbNote.hidden = hasShotExif;

    lbTag.textContent = '系列 · ' + p.seriesTitle;
    lbIndex = i;
  }

  function openLB(i) {
    lastFocus = document.activeElement;
    renderPhoto(i);
    lbOpen = true;
    lightbox.hidden = false;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { lightbox.classList.add('show'); });
    });
    lbClose.focus();
  }

  function closeLB() {
    lbOpen = false;
    setZoom(false);
    lightbox.classList.remove('show');
    setTimeout(function () { lightbox.hidden = true; }, 190);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function stepPhoto(dir) {
    var n = (lbIndex + dir + PHOTOS.length) % PHOTOS.length;
    renderPhoto(n);
  }

  function bindEvents() {
    Array.prototype.forEach.call(document.querySelectorAll('.frame'), function (f) {
      f.addEventListener('click', function () { openLB(parseInt(f.getAttribute('data-photo'), 10)); });
      f.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLB(parseInt(f.getAttribute('data-photo'), 10));
        }
      });
    });
  }

  navLeft.addEventListener('click', function () { go(-1); });
  navRight.addEventListener('click', function () { go(1); });
  enterBtn.addEventListener('click', function () { go(1); });

  homeBtn.addEventListener('click', function () {
    if (idx === 0) return;
    idx = 0;
    updateRoom();
    walkAnim(-1);
  });

  lbClose.addEventListener('click', closeLB);
  lbPrev.addEventListener('click', function () { stepPhoto(-1); });
  lbNext.addEventListener('click', function () { stepPhoto(1); });

  lbZoom.addEventListener('click', function (e) {
    e.stopPropagation();
    if (!lbWrap.classList.contains('zoom')) setZoom('one');
  });

  lbWrap.addEventListener('wheel', function () {
    if (lbWrap.classList.contains('zoom')) { stopAutoV(); stopAutoH(); }
  }, { passive: true });

  lbRestore.addEventListener('click', function (e) {
    e.stopPropagation();
    setZoom(null);
  });

  lbWrap.addEventListener('click', function (e) {
    if (panMoved) return;
    if (lbWrap.classList.contains('zoom') && e.target !== lbZoom && e.target !== lbRestore && e.target !== lbAuto && e.target !== lbAutoH) setZoom(null);
  });

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLB();
  });

  document.addEventListener('keydown', function (e) {
    if (lbOpen) {
      if (e.key === 'Escape') {
        if (lbWrap.classList.contains('zoom')) { setZoom(false); } else { closeLB(); }
      }
      if (e.key === 'ArrowLeft') stepPhoto(-1);
      if (e.key === 'ArrowRight') stepPhoto(1);
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'd') go(1);
    if (e.key === 'ArrowLeft' || e.key === 'a') go(-1);
  });

  var touchX = 0;
  stageWrap.addEventListener('touchstart', function (e) {
    touchX = e.touches[0].clientX;
  }, { passive: true });

  stageWrap.addEventListener('touchend', function (e) {
    if (lbOpen) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1);
  }, { passive: true });

  /* ---------- 管理模式：删除 / 上传 ---------- */

  var manageBtn = document.getElementById('manageBtn');
  var filePick = document.getElementById('filePick');
  var rootHandle = null;
  var pendingSeries = null;

  function idbOpen() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open('pixel-corridor', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }

  function idbGet(k) {
    return idbOpen().then(function (db) {
      return new Promise(function (res) {
        var t = db.transaction('kv').objectStore('kv').get(k);
        t.onsuccess = function () { res(t.result || null); };
        t.onerror = function () { res(null); };
      });
    }).catch(function () { return null; });
  }

  function idbSet(k, v) {
    return idbOpen().then(function (db) {
      return new Promise(function (res) {
        var t = db.transaction('kv', 'readwrite');
        t.objectStore('kv').put(v, k);
        t.oncomplete = function () { res(); };
        t.onerror = function () { res(); };
      });
    }).catch(function () { });
  }

  async function ensureRoot() {
    if (!window.showDirectoryPicker) {
      alert('管理功能需要 Chrome 或 Edge 浏览器支持。');
      return null;
    }
    try {
      if (!rootHandle) rootHandle = await idbGet('root');
      if (rootHandle) {
        var perm = await rootHandle.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted') perm = await rootHandle.requestPermission({ mode: 'readwrite' });
        if (perm !== 'granted') rootHandle = null;
      }
      if (!rootHandle) {
        alert('首次使用需要授权：请在接下来的窗口中，选择网站文件夹 pixel-gallery（包含 index.html 的那个文件夹）。');
        rootHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        var ok = true;
        try { await rootHandle.getFileHandle('index.html'); } catch (e) { ok = false; }
        if (!ok) {
          alert('选中的文件夹不对：请重新操作，选择包含 index.html 的 pixel-gallery 项目文件夹。');
          rootHandle = null;
          return null;
        }
        await idbSet('root', rootHandle);
      }
      return rootHandle;
    } catch (e) {
      return null;
    }
  }

  function fmtDate(d) {
    var p = function (x) { return (x < 10 ? '0' : '') + x; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function readTiff(dv, base) {
    var little = dv.getUint16(base) === 0x4949;
    function u16(o) { return dv.getUint16(o, little); }
    function u32(o) { return dv.getUint32(o, little); }
    function rat(o) { var n = u32(o), d = u32(o + 4); return d ? n / d : 0; }
    function ascii(o, len) {
      var s = '';
      for (var i = 0; i < len && i < 256; i++) {
        var c = dv.getUint8(o + i);
        if (!c) break;
        s += String.fromCharCode(c);
      }
      return s.trim();
    }
    var out = {};
    function readIFD(o) {
      if (o + 2 > dv.byteLength) return;
      var n = u16(o);
      for (var i = 0; i < n; i++) {
        var e = o + 2 + i * 12;
        if (e + 12 > dv.byteLength) return;
        var tag = u16(e), type = u16(e + 2), cnt = u32(e + 4);
        var unit = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 10: 8 }[type] || 1;
        var sz = unit * cnt;
        var vo = sz <= 4 ? e + 8 : base + u32(e + 8);
        switch (tag) {
          case 0x0110: out.camera = ascii(vo, cnt); break;
          case 0xA434: out.lens = ascii(vo, cnt); break;
          case 0x829D: var f = rat(vo); if (f > 0) out.aperture = 'f/' + (Math.round(f * 10) / 10); break;
          case 0x829A: var t = rat(vo); if (t > 0) out.shutter = t >= 1 ? (Math.round(t * 10) / 10) + 's' : '1/' + Math.round(1 / t) + 's'; break;
          case 0x8827: var iso = type === 3 ? u16(vo) : u32(vo); if (iso > 0) out.iso = 'ISO ' + iso; break;
          case 0x920A: var fl = rat(vo); if (fl > 0) out.focal = Math.round(fl) + 'mm'; break;
          case 0x9003: var d = ascii(vo, cnt); if (d.length >= 10) out.date = d.slice(0, 10).replace(/:/g, '-'); break;
          case 0x8769: readIFD(base + u32(e + 8)); break;
        }
      }
    }
    try { readIFD(base + u32(base + 4)); } catch (e) { }
    return out;
  }

  function parseExif(buf) {
    try {
      var dv = new DataView(buf);
      if (dv.getUint16(0) !== 0xFFD8) return {};
      var off = 2;
      while (off + 4 < dv.byteLength) {
        var marker = dv.getUint16(off);
        if ((marker & 0xFF00) !== 0xFF00) return {};
        var size = dv.getUint16(off + 2);
        if (marker === 0xFFE1 && dv.getUint32(off + 4) === 0x45786966) {
          return readTiff(dv, off + 10);
        }
        off += 2 + size;
      }
    } catch (e) { }
    return {};
  }

  async function toWebJpeg(file) {
    var bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    var ow = bmp.width, oh = bmp.height;
    var scale = Math.min(1, 1800 / Math.max(ow, oh));
    var w = Math.round(ow * scale), h = Math.round(oh * scale);
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var cx = cv.getContext('2d');
    cx.imageSmoothingEnabled = true;
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(bmp, 0, 0, w, h);
    var blob = await new Promise(function (res) { cv.toBlob(res, 'image/jpeg', 0.88); });
    bmp.close();
    return { blob: blob, w: ow, h: oh };
  }

  async function getDir(root, parts, create) {
    var d = root;
    for (var i = 0; i < parts.length; i++) {
      d = await d.getDirectoryHandle(parts[i], { create: !!create });
    }
    return d;
  }

  function cleanSeries(s) {
    return {
      id: s.id, title: s.title, desc: s.desc, theme: s.theme || 'warm',
      photos: s.photos.map(function (p) {
        var o = { src: p.src, w: p.w, h: p.h, date: p.date, caption: p.caption || '' };
        ['camera', 'lens', 'aperture', 'shutter', 'iso', 'focal'].forEach(function (k) {
          if (p[k]) o[k] = p[k];
        });
        return o;
      })
    };
  }

  async function saveManifest(root) {
    var data = SERIES.map(cleanSeries);
    var jsDir = await getDir(root, ['js']);
    var fh = await jsDir.getFileHandle('photos-data.js', { create: true });
    var ws = await fh.createWritable();
    await ws.write('window.SERIES = ' + JSON.stringify(data, null, 4) + ';\n');
    await ws.close();
  }

  async function deletePhoto(p) {
    var root = await ensureRoot();
    if (!root) return;
    if (!confirm('删除这张照片？\n（将同时删除项目文件 ' + p.src + '）')) return;

    var s = p.__series;
    var si = s.photos.indexOf(p);
    if (si > -1) s.photos.splice(si, 1);

    try {
      await saveManifest(root);
    } catch (e) {
      if (si > -1) s.photos.splice(si, 0, p);
      alert('清单保存失败，照片未被删除：' + (e.message || e));
      return;
    }

    try {
      var dir = await getDir(root, p.src.split('/').slice(0, -1));
      await dir.removeEntry(p.src.split('/').pop());
    } catch (e) { }

    var pi = PHOTOS.indexOf(p);
    if (pi > -1) PHOTOS.splice(pi, 1);
    PHOTOS.forEach(function (q, ni) { q.index = ni; });
    PHOTOS.forEach(function (q) { if (q.__fig) q.__fig.setAttribute('data-photo', q.index); });
    if (p.__fig) {
      var box = p.__fig.parentNode;
      p.__fig.remove();
      if (box && box.querySelectorAll('.frame').length === 0) {
        var note = document.createElement('p');
        note.className = 'empty-note';
        note.textContent = '这间展厅空了 · 点上方「＋ 添加照片」补充作品';
        box.appendChild(note);
      }
    }
  }

  function bindManage() {
    manageBtn.addEventListener('click', function () {
      var on = document.body.classList.toggle('manage');
      manageBtn.textContent = on ? '完成' : '管理';
    });

    Array.prototype.forEach.call(document.querySelectorAll('.frame .del-btn'), function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var f = btn.closest('.frame');
        var p = PHOTOS[parseInt(f.getAttribute('data-photo'), 10)];
        deletePhoto(p);
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll('.add-corner'), function (btn) {
      btn.addEventListener('click', async function () {
        var root = await ensureRoot();
        if (!root) return;
        pendingSeries = btn.getAttribute('data-series');
        filePick.value = '';
        filePick.click();
      });
    });
  }

  filePick.addEventListener('change', async function () {
    if (!filePick.files || !filePick.files.length) return;
    var s = null;
    for (var i = 0; i < SERIES.length; i++) {
      if (SERIES[i].id === pendingSeries) { s = SERIES[i]; break; }
    }
    if (!s) return;
    var root = await ensureRoot();
    if (!root) return;
    var dir = await getDir(root, ['assets', 'series', s.id], true);
    var maxIdx = 0;
    var it = dir.values();
    while (true) {
      var r = await it.next();
      if (r.done) break;
      var m = /^(\d+)\.jpg$/.exec(r.value.name);
      if (m) maxIdx = Math.max(maxIdx, parseInt(m[1], 10));
    }
    for (var j = 0; j < filePick.files.length; j++) {
      var file = filePick.files[j];
      try {
        var out = await toWebJpeg(file);
        var ex = /\.jpe?g$/i.test(file.name) ? parseExif(await file.arrayBuffer()) : {};
        maxIdx++;
        var name = (maxIdx < 10 ? '0' : '') + maxIdx + '.jpg';
        var fh = await dir.getFileHandle(name, { create: true });
        var ws = await fh.createWritable();
        await ws.write(out.blob);
        await ws.close();
        var p = {
          src: 'assets/series/' + s.id + '/' + name,
          w: out.w, h: out.h,
          date: ex.date || fmtDate(new Date(file.lastModified)),
          caption: ''
        };
        ['camera', 'lens', 'aperture', 'shutter', 'iso', 'focal'].forEach(function (k) {
          if (ex[k]) p[k] = ex[k];
        });
        s.photos.push(p);
      } catch (err) {
        maxIdx--;
        console.error(err);
        alert('这张照片处理失败：' + file.name);
      }
    }
    await saveManifest(root);
    location.reload();
  });

  /* ---------- 环境动效 ---------- */

  function rnd(min, max) {
    return Math.random() * (max - min) + min;
  }

  function spawnDust(room, color, count) {
    for (var i = 0; i < count; i++) {
      var d = document.createElement('span');
      d.className = 'pdust';
      d.style.left = rnd(4, 94) + 'vw';
      d.style.background = color;
      var sz = rnd(4, 6);
      d.style.width = sz + 'px';
      d.style.height = sz + 'px';
      d.style.setProperty('--o', rnd(0.45, 0.8).toFixed(2));
      d.style.setProperty('--dx', rnd(-50, 50) + 'px');
      d.style.animationDuration = rnd(10, 19) + 's';
      d.style.animationDelay = '-' + rnd(0, 18) + 's';
      room.appendChild(d);
    }
  }

  function spawnHeart(room, color, count) {
    for (var i = 0; i < count; i++) {
      var h = document.createElement('span');
      h.className = 'pheart';
      h.style.left = rnd(8, 88) + 'vw';
      h.style.setProperty('--c', color);
      h.style.setProperty('--o', rnd(0.5, 0.85).toFixed(2));
      h.style.setProperty('--dx', rnd(-30, 30) + 'px');
      h.style.animationDuration = rnd(9, 15) + 's';
      h.style.animationDelay = '-' + rnd(0, 14) + 's';
      room.appendChild(h);
    }
  }

  function spawnVisitor(room) {
    var v = document.createElement('span');
    v.className = 'pvisitor';
    v.style.left = rnd(12, 55) + 'vw';
    v.style.setProperty('--dist', rnd(80, 210) + 'px');
    v.style.setProperty('--vd', rnd(15, 28) + 's');
    v.style.animationDelay = '-' + rnd(0, 20) + 's';
    var w = rnd(38, 48);
    v.style.width = w + 'px';
    v.style.height = (w * 17 / 12) + 'px';
    v.style.filter = 'hue-rotate(' + rnd(0, 360).toFixed(0) + 'deg) saturate(' + rnd(0.85, 1.25).toFixed(2) + ')';
    v.innerHTML = '<img src="assets/visitor-a.png" alt=""><img class="b" src="assets/visitor-b.png" alt="">';
    room.appendChild(v);
  }

  function decorateRooms() {
    rooms.forEach(function (room) {
      var theme = room.getAttribute('data-theme') || '';
      var isSeries = room.classList.contains('room-series');

      if (isSeries && theme !== 'dark') {
        [14, 38, 62, 86].forEach(function (l) {
          var s = document.createElement('span');
          s.className = 'spot';
          s.style.left = l + 'vw';
          room.appendChild(s);
        });
      }

      if (theme === 'warm') {
        spawnDust(room, 'rgba(214, 178, 120, 0.7)', 20);
        spawnHeart(room, '#d98a96', 4);
        var yarn = document.createElement('span');
        yarn.className = 'pyarn';
        room.appendChild(yarn);
        var cat = document.createElement('div');
        cat.className = 'pcat';
        cat.innerHTML = '<img src="assets/cat-a.png" alt=""><img class="b" src="assets/cat-b.png" alt="">';
        room.appendChild(cat);
      }

      if (theme === 'park') {
        var c1 = document.createElement('span');
        c1.className = 'pcloud';
        room.appendChild(c1);
        var c2 = document.createElement('span');
        c2.className = 'pcloud c2';
        room.appendChild(c2);
        var c3 = document.createElement('span');
        c3.className = 'pcloud c3';
        room.appendChild(c3);
        var birds = document.createElement('span');
        birds.className = 'pbirds';
        room.appendChild(birds);
        var birds2 = document.createElement('span');
        birds2.className = 'pbirds';
        birds2.style.top = '26vh';
        birds2.style.animationDuration = '58s';
        birds2.style.animationDelay = '-24s';
        room.appendChild(birds2);
        var kite = document.createElement('span');
        kite.className = 'pkite';
        room.appendChild(kite);
        spawnDust(room, 'rgba(176, 169, 130, 0.6)', 16);
      }

      if (theme === 'zen') {
        var inc = document.createElement('span');
        inc.className = 'pincense';
        room.appendChild(inc);
        for (var i = 0; i < 8; i++) {
          var sm = document.createElement('span');
          sm.className = 'psmoke';
          sm.style.right = 'calc(12vw + ' + rnd(2, 12) + 'px)';
          var msz = rnd(4, 6);
          sm.style.width = msz + 'px';
          sm.style.height = msz + 'px';
          sm.style.background = 'rgba(216, 209, 192, 0.75)';
          sm.style.setProperty('--dx', rnd(-16, 16) + 'px');
          sm.style.setProperty('--o', rnd(0.3, 0.55).toFixed(2));
          sm.style.animationDuration = rnd(5, 8) + 's';
          sm.style.animationDelay = '-' + rnd(0, 7) + 's';
          room.appendChild(sm);
        }
        for (var lf = 0; lf < 7; lf++) {
          var leaf = document.createElement('span');
          leaf.className = 'pleaf';
          leaf.style.left = rnd(4, 92) + 'vw';
          leaf.style.width = '5px';
          leaf.style.height = '5px';
          leaf.style.background = lf % 2 ? '#8a9a6a' : '#a5b078';
          leaf.style.setProperty('--dx', rnd(-40, 40) + 'px');
          leaf.style.setProperty('--o', rnd(0.4, 0.7).toFixed(2));
          leaf.style.animationDuration = rnd(10, 17) + 's';
          leaf.style.animationDelay = '-' + rnd(0, 15) + 's';
          room.appendChild(leaf);
        }
        spawnDust(room, 'rgba(200, 195, 180, 0.5)', 12);
      }

      if (theme === 'bloom') {
        var petalColors = ['#d3bfc3', '#c9a2ab', '#e0b9c4'];
        for (var j = 0; j < 16; j++) {
          var pt = document.createElement('span');
          pt.className = 'ppetal';
          pt.style.left = rnd(4, 92) + 'vw';
          pt.style.width = '6px';
          pt.style.height = '6px';
          pt.style.background = petalColors[j % 3];
          pt.style.setProperty('--dx', rnd(-60, 60) + 'px');
          pt.style.setProperty('--o', rnd(0.5, 0.85).toFixed(2));
          pt.style.animationDuration = rnd(9, 16) + 's';
          pt.style.animationDelay = '-' + rnd(0, 14) + 's';
          room.appendChild(pt);
        }
        var bf1 = document.createElement('span');
        bf1.className = 'pbutterfly';
        bf1.innerHTML = '<span class="w"></span>';
        room.appendChild(bf1);
        var bf2 = document.createElement('span');
        bf2.className = 'pbutterfly';
        bf2.style.animationDelay = '-9.5s';
        bf2.innerHTML = '<span class="w" style="animation-delay:-0.22s"></span>';
        room.appendChild(bf2);
        spawnDust(room, 'rgba(216, 193, 195, 0.55)', 12);
      }

      if (theme === 'dark') {
        for (var k = 0; k < 34; k++) {
          var st = document.createElement('span');
          st.className = 'pstar';
          st.style.left = rnd(3, 94) + 'vw';
          st.style.top = rnd(4, 56) + 'vh';
          var sz = rnd(2.5, 6);
          st.style.width = sz + 'px';
          st.style.height = sz + 'px';
          st.style.background = k % 7 === 0 ? '#8ea0e0' : k % 5 === 0 ? '#d8a0a0' : '#e9e6dc';
          st.style.animationDuration = rnd(2.5, 6) + 's';
          st.style.animationDelay = '-' + rnd(0, 5) + 's';
          room.appendChild(st);
        }
        var moon = document.createElement('span');
        moon.className = 'pmoon';
        room.appendChild(moon);
        for (var sh = 0; sh < 3; sh++) {
          var shoot = document.createElement('span');
          shoot.className = 'pshoot';
          shoot.style.left = rnd(58, 88) + 'vw';
          shoot.style.top = rnd(5, 16) + 'vh';
          shoot.style.animationDelay = '-' + (sh * 3.1) + 's';
          room.appendChild(shoot);
        }
      }

      if (room.classList.contains('room-lobby')) {
        spawnDust(room, 'rgba(232, 168, 124, 0.6)', 16);
        spawnHeart(room, '#e0a394', 3);
      }
      if (room.classList.contains('room-about')) spawnDust(room, 'rgba(232, 168, 124, 0.5)', 10);

      if (isSeries || room.classList.contains('room-lobby')) {
        var vc = theme === 'dark' ? 1 : 2;
        for (var vi = 0; vi < vc; vi++) spawnVisitor(room);
      }
    });
  }

  buildRooms();
  bindEvents();
  bindManage();
  decorateRooms();
  updateRoom();

  PHOTOS.forEach(function (p) { (new Image()).src = p.src; });

  /* ---------- 背景音乐 ---------- */

  var bgm = document.getElementById('bgm');
  var musicBtn = document.getElementById('musicBtn');
  bgm.volume = 0.45;

  function startMusic() {
    var p = bgm.play();
    if (p && p.catch) p.catch(function () { });
    musicBtn.textContent = '♪ 音乐开';
    musicBtn.classList.add('on');
  }

  function pauseMusic() {
    bgm.pause();
    musicBtn.textContent = '♪ 音乐关';
    musicBtn.classList.remove('on');
  }

  musicBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (bgm.paused) startMusic(); else pauseMusic();
  });

  window.addEventListener('load', function () {
    var p = bgm.play();
    if (p && p.catch) {
      p.catch(function () {
        var tryWeixin = function () {
          try {
            window.WeixinJSBridge.invoke('getNetworkType', {}, function () {
              if (bgm.paused) startMusic();
            });
          } catch (err) { }
        };
        if (typeof window.WeixinJSBridge !== 'undefined') {
          tryWeixin();
        } else {
          document.addEventListener('WeixinJSBridgeReady', tryWeixin, false);
          window.addEventListener('WeixinJSBridgeReady', tryWeixin, false);
        }
        var kick = function (e) {
          if (musicBtn.contains(e.target)) return;
          document.removeEventListener('pointerdown', kick);
          document.removeEventListener('keydown', kick);
          if (bgm.paused) startMusic();
        };
        document.addEventListener('pointerdown', kick);
        document.addEventListener('keydown', kick);
      });
    } else {
      musicBtn.textContent = '♪ 音乐开';
      musicBtn.classList.add('on');
    }
  });

  window.addEventListener('load', function () {
    var loader = document.getElementById('loader');
    setTimeout(function () {
      loader.classList.add('done');
      setTimeout(function () { loader.remove(); }, 450);
    }, 1350);
  });
})();
