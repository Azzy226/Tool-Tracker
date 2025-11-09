C:\Users\xethi\source\repos\Azzy226\Tool-Tracker\app.js
// ✦────────────────────────────────────────────────────────────────────────────✦
// ✦  TOOLTRACKER V1 — The ledger of iron & ink. Improved and slightly less rude. ✦
// ✦────────────────────────────────────────────────────────────────────────────✦
(() => {
  //✦ Storage Keys ✦
  const STORE_KEY = "tooltracker_v1";
  const SIGN_KEY = "tooltracker_signouts_v1";

  //✦ DOM Helpers ✦
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));

  //* Safe storage helpers *
  function load(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error("load error", key, e);
      return null;
    }
  }
  function save(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.error("save error", key, e);
    }
  }

  function uuid() {
    return crypto?.randomUUID
      ? crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0,
            v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
  }
  const nowISO = () => new Date().toISOString();
  const toYMD = (d) => new Date(d).toISOString().slice(0, 10);

  //* App State *
  let tools = load(STORE_KEY) || [];
  let signs = load(SIGN_KEY) || [];

  //* Utils for history on tools *
  function logHistory(t, action, extra = {}) {
    t.history = t.history || [];
    t.history.push({ ts: nowISO(), action, ...extra });
  }
  function upsertTool(tool) {
    const i = tools.findIndex((x) => x.id === tool.id);
    if (i === -1) tools.push(tool);
    else tools[i] = tool;
    save(STORE_KEY, tools);
    renderCards();
  }
  function findTool(id) {
    return tools.find((t) => t.id === id);
  }

  //* UI Refs (cached) *
  const els = {
    tabSign: $("#tabSign"),
    tabHistory: $("#tabHistory"),
    panelSign: $("#panelSign"),
    panelHistory: $("#panelHistory"),
    modeQR: $("#modeQR"),
    modeRFID: $("#modeRFID"),
    modeManual: $("#modeManual"),
    actionBar: $("#actionBar"),
    barText: $("#barText"),
    form: $("#signForm"),
    ident: $("#fIdent"),
    date: $("#fDate"),
    init: $("#fInit"),
    job: $("#fJob"),
    bldg: $("#fBldg"),
    sect: $("#fSect"),
    submit: $("#submitSign"),
    histSearch: $("#histSearch"),
    histList: $("#histList"),
    list: $("#toolList"),
    tmpl: $("#toolCardTmpl"),
    qrDlg: $("#qrDialog"),
    qrTitle: $("#qrDialogTitle"),
    qrWrap: $("#qrCanvasWrap"),
    qrClose: $("#qrCloseBtn"),
    scanDlg: $("#scanDialog"),
    scanVideo: $("#scanVideo"),
    scanCanvas: $("#scanCanvas"),
    scanClose: $("#scanCloseBtn"),
    scanStatus: $("#scanStatus"),
  };

  // Tabs
  function setTab(which) {
    const isSign = which === "sign";
    els.tabSign?.classList?.toggle("active", isSign);
    els.tabHistory?.classList?.toggle("active", !isSign);
    els.panelSign?.classList?.toggle("hide", !isSign);
    els.panelHistory?.classList?.toggle("hide", isSign);
    if (!isSign) renderHistory();
  }
  els.tabSign && (els.tabSign.onclick = () => setTab("sign"));
  els.tabHistory && (els.tabHistory.onclick = () => setTab("history"));

  // Modes
  let currentMode = "qr";
  function setMode(m) {
    currentMode = m;
    els.modeQR?.classList?.toggle("active", m === "qr");
    els.modeRFID?.classList?.toggle("active", m === "rfid");
    els.modeManual?.classList?.toggle("active", m === "manual");
    if (m === "qr") els.barText && (els.barText.textContent = "Start QR Scanner");
    if (m === "rfid") els.barText && (els.barText.textContent = "Scan RFID Tag");
    if (m === "manual")
      els.barText && (els.barText.textContent = "Manual Entry Active");
  }
  els.modeQR && (els.modeQR.onclick = () => setMode("qr"));
  els.modeRFID && (els.modeRFID.onclick = () => setMode("rfid"));
  els.modeManual && (els.modeManual.onclick = () => setMode("manual"));

  // Simple toast instead of alert spam
  function showToast(msg, ms = 2500) {
    try {
      let t = document.createElement("div");
      t.className = "tt-toast";
      t.textContent = msg;
      Object.assign(t.style, {
        position: "fixed",
        right: "16px",
        bottom: "16px",
        background: "#222",
        color: "#fff",
        padding: "8px 12px",
        borderRadius: "6px",
        zIndex: 9999,
        opacity: 0,
        transition: "opacity 150ms ease",
      });
      document.body.appendChild(t);
      requestAnimationFrame(() => (t.style.opacity = "1"));
      setTimeout(() => {
        t.style.opacity = "0";
        setTimeout(() => t.remove(), 180);
      }, ms);
    } catch (e) {
      // fallback
      try {
        alert(msg);
      } catch {}
    }
  }

  // Action Bar
  els.actionBar &&
    (els.actionBar.onclick = async () => {
      if (currentMode === "qr") startQrScan();
      else if (currentMode === "rfid") {
        if (!("serial" in navigator)) {
          const uid = prompt("Enter RFID UID (hex):", "");
          if (uid) els.ident.value = uid.trim();
          return;
        }
        try {
          await ensureSerial();
          showToast("Present a tag to the connected RFID reader.");
        } catch (e) {
          console.error("serial start failed", e);
          showToast("RFID reader connection failed.");
        }
      } else {
        els.ident && els.ident.focus();
      }
    });

  // Form Submit
  els.date && (els.date.value = toYMD(new Date()));
  els.form &&
    (els.form.onsubmit = (e) => {
      e.preventDefault();
      const rec = {
        id: uuid(),
        ts: nowISO(),
        ident: (els.ident.value || "").trim(),
        date: els.date.value || toYMD(new Date()),
        initials: (els.init.value || "").trim(),
        job: (els.job.value || "").trim(),
        building: (els.bldg.value || "").trim(),
        section: (els.sect.value || "").trim(),
        mode: currentMode,
      };
      if (!rec.ident) {
        showToast("Enter a tool identifier.");
        return;
      }
      if (!rec.initials || rec.initials.length < 2) {
        showToast("Enter user initials (2–4 letters).");
        return;
      }

      const toolId = parseToolTagPayload(rec.ident) || rec.ident;
      const t = findTool(toolId);
      if (t) {
        t.status = "checked_out";
        t.assignedJob = rec.job;
        t.checkedOutBy = rec.initials;
        t.turnedInToday = false;
        logHistory(t, "checkout", {
          job: t.assignedJob,
          by: t.checkedOutBy,
          building: rec.building,
          section: rec.section,
        });
        upsertTool(t);
      }

      signs.unshift(rec);
      save(SIGN_KEY, signs);

      // clear fields
      els.ident.value = "";
      els.job.value = "";
      els.bldg.value = "";
      els.sect.value = "";
      showToast("Tool signed out.");
      renderHistory();
    });

  // History (debounced)
  const debounce = (fn, wait = 200) => {
    let t = 0;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  };

  function renderHistory() {
    const q = (els.histSearch.value || "").toLowerCase().trim();
    const list = els.histList;
    if (!list) return;
    list.innerHTML = "";
    const rows = signs.filter((r) => {
      const s = `${r.ident} ${r.initials} ${r.job} ${r.building} ${r.section}`.toLowerCase();
      return !q || s.includes(q);
    });
    if (!rows.length) {
      list.innerHTML = '<div class="empty">No sign-out records yet</div>';
      return;
    }
    rows.slice(0, 200).forEach((r) => {
      const row = document.createElement("div");
      row.className = "history-item";
      row.innerHTML = `
        <div><strong>${escapeHtml(r.ident)}</strong></div>
        <div>${escapeHtml(r.initials)}</div>
        <div>${escapeHtml(r.job)||"—"}</div>
        <div>${escapeHtml(r.building)||"—"}</div>
        <div>${escapeHtml(r.section)||"—"}</div>
      `;
      list.appendChild(row);
    });
  }
  els.histSearch && (els.histSearch.oninput = debounce(renderHistory, 180));

  // Cards: render and event delegation for actions
  function renderCards() {
    if (!els.list || !els.tmpl) return;
    els.list.innerHTML = "";
    tools
      .slice()
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
      .forEach((t) => {
        const frag = els.tmpl.content.cloneNode(true);
        const card = $(".card", frag);
        if (card) {
          card.dataset.id = t.id;
          card.dataset.status = t.status || "available";
        }
        const nameEl = $(".tool-name", frag);
        if (nameEl) nameEl.textContent = t.name || t.id;
        const catEl = $(".tool-category", frag);
        if (catEl) catEl.textContent = t.category || "—";
        const condEl = $(".tool-condition", frag);
        if (condEl) condEl.textContent = t.condition || "—";
        const jobEl = $(".tool-job", frag);
        if (jobEl) jobEl.textContent = t.assignedJob || "—";
        const byEl = $(".tool-by", frag);
        if (byEl) byEl.textContent = t.checkedOutBy || "—";

        const b = $(".status", frag);
        if (b) {
          b.classList.remove("out", "archived");
          if (t.status === "archived") {
            b.textContent = "Archived";
            b.classList.add("archived");
          } else if (t.status === "checked_out") {
            b.textContent = "Checked Out";
            b.classList.add("out");
          } else b.textContent = "Available";
        }

        const chk = $(".turned-in-toggle", frag);
        if (chk) {
          chk.checked = !!t.turnedInToday;
          chk.onchange = () => {
            t.turnedInToday = chk.checked;
            if (t.turnedInToday) {
              t.status = "available";
              t.assignedJob = t.checkedOutBy = undefined;
              logHistory(t, "checkin", { notes: "Marked turned in" });
            } else {
              logHistory(t, "update", { notes: "Unchecked" });
            }
            upsertTool(t);
          };
        }

        // leave buttons as-is in template; we'll use event delegation on the parent
        els.list.appendChild(frag);
      });
  }

  // event delegation for card actions
  els.list &&
    els.list.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-action], .edit, .checkout, .checkin, .archive, .qr-show, .rfid-bind");
      if (!btn) return;
      const card = ev.target.closest(".card");
      const id = card?.dataset?.id;
      if (!id) return;
      const t = findTool(id);
      if (!t) return;

      // respect data-action attr first
      const action = btn.dataset.action || (btn.classList.contains("edit") ? "edit" : btn.classList.contains("checkout") ? "checkout" : btn.classList.contains("checkin") ? "checkin" : btn.classList.contains("archive") ? "archive" : btn.classList.contains("qr-show") ? "qr" : btn.classList.contains("rfid-bind") ? "rfid" : null);

      switch (action) {
        case "edit":
          openEdit(id);
          break;
        case "checkout":
          quickCheckout(t);
          break;
        case "checkin":
          quickCheckin(t);
          break;
        case "archive":
          archiveTool(id);
          break;
        case "qr":
          showToolQR(t);
          break;
        case "rfid":
          bindRfidManual(t);
          break;
        default:
          break;
      }
    });

  // Quick Card Actions (kept simple)
  function openEdit(id) {
    showToast("Edit not implemented in this view. Use card quick actions.");
  }
  function quickCheckout(t) {
    t.status = "checked_out";
    t.assignedJob = prompt("Job number (optional):", t.assignedJob || "") || "";
    t.checkedOutBy = prompt("Your initials (2–4):", t.checkedOutBy || "") || "";
    t.turnedInToday = false;
    logHistory(t, "checkout", { job: t.assignedJob, by: t.checkedOutBy });
    upsertTool(t);
  }
  function quickCheckin(t) {
    t.status = "available";
    t.turnedInToday = true;
    t.assignedJob = t.checkedOutBy = undefined;
    logHistory(t, "checkin", { notes: "Card quick check-in" });
    upsertTool(t);
  }
  function archiveTool(id) {
    const t = findTool(id);
    if (!t) return;
    t.status = t.status === "archived" ? "available" : "archived";
    logHistory(t, "archive");
    upsertTool(t);
  }

  // Tag payload helpers
  function toolTagPayload(t) {
    return `TT:${t.id}`;
  }
  function parseToolTagPayload(text) {
    // Accept TT: + uuid-ish tokens, be a bit tolerant
    const m = String(text || "").trim().match(/^TT:([0-9a-fA-F-]{8,})$/);
    return m ? m[1] : null;
  }

  // Show QR (uses QRCode lib if available)
  function showToolQR(t) {
    const dlg = els.qrDlg,
      box = els.qrWrap;
    if (!dlg || !box) return;
    box.innerHTML = "";
    els.qrTitle && (els.qrTitle.textContent = `QR • ${t.name || t.id}`);
    const payload = toolTagPayload(t);
    if (window.QRCode && QRCode.toCanvas) {
      const canvas = document.createElement("canvas");
      box.appendChild(canvas);
      try {
        QRCode.toCanvas(canvas, payload, { width: 256, margin: 2 }, (err) => {
          if (err) box.textContent = payload;
        });
      } catch {
        box.textContent = payload;
      }
    } else {
      box.textContent = payload;
    }
    try {
      dlg.showModal && dlg.showModal();
    } catch {
      // ignore
    }
  }
  els.qrClose && (els.qrClose.onclick = () => els.qrDlg?.close && els.qrDlg.close());

  // QR camera scan: reuse detector and minimize allocations
  let _scanStream = null,
    _scanRaf = 0,
    _barcodeDetector = null;
  async function startQrScan() {
    if (!els.scanDlg || !els.scanVideo || !els.scanCanvas) return;
    els.scanStatus && (els.scanStatus.textContent = "Starting camera…");
    try {
      _scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      els.scanVideo.srcObject = _scanStream;
      await els.scanVideo.play();
      try {
        els.scanDlg.showModal && els.scanDlg.showModal();
      } catch {}
      // lazily create detector
      if ("BarcodeDetector" in window && !_barcodeDetector) {
        try {
          _barcodeDetector = new window.BarcodeDetector({ formats: ["qr_code"] });
        } catch (e) {
          _barcodeDetector = null;
        }
      }
      tickScan();
    } catch (e) {
      console.error("startQrScan error", e);
      els.scanStatus && (els.scanStatus.textContent = "Camera unavailable.");
      showToast("Camera unavailable.");
    }
  }
  function stopQrScan() {
    cancelAnimationFrame(_scanRaf);
    _scanRaf = 0;
    if (_scanStream) {
      _scanStream.getTracks().forEach((t) => t.stop());
      _scanStream = null;
    }
    if (els.scanVideo) {
      els.scanVideo.pause();
      els.scanVideo.srcObject = null;
    }
    try {
      els.scanDlg?.close && els.scanDlg.close();
    } catch {}
  }
  els.scanClose && (els.scanClose.onclick = stopQrScan);

  async function tickScan() {
    _scanRaf = requestAnimationFrame(tickScan);
    const v = els.scanVideo,
      c = els.scanCanvas;
    if (!v || !c || v.readyState < 2) return;
    const w = v.videoWidth,
      h = v.videoHeight;
    if (!w || !h) return;
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.drawImage(v, 0, 0, w, h);

    // Try BarcodeDetector first (faster when available)
    if (_barcodeDetector) {
      try {
        const codes = await _barcodeDetector.detect(c);
        if (codes?.length) {
          if (handleScannedText(codes[0].rawValue || codes[0].displayValue)) return;
        }
      } catch (e) {
        // fallback to jsQR below
      }
    }

    if (window.jsQR) {
      try {
        const img = ctx.getImageData(0, 0, w, h);
        const res = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
        if (res?.data) {
          if (handleScannedText(res.data)) return;
        }
      } catch (e) {
        // ignore decoding errors
      }
    }
    els.scanStatus && (els.scanStatus.textContent = "Scanning… align QR within the frame.");
  }
  function handleScannedText(text) {
    const id = parseToolTagPayload(text) || String(text || "").trim();
    els.ident && (els.ident.value = id);
    stopQrScan();
    return true;
  }

  // Web Serial RFID: improved lifecycle
  let _serialPort = null,
    _serialReader = null,
    _serialAbort = null;
  async function ensureSerial() {
    if (_serialPort) return _serialPort;
    if (!("serial" in navigator)) throw new Error("Web Serial not available");
    _serialPort = await navigator.serial.requestPort();
    await _serialPort.open({ baudRate: 9600 });
    _serialAbort = new AbortController();
    const dec = new TextDecoderStream();
    _serialPort.readable.pipeTo(dec.writable);
    _serialReader = dec.readable.getReader({ signal: _serialAbort.signal });
    readSerialLoop().catch((e) => {
      console.error("readSerialLoop error", e);
      stopSerial();
    });
    return _serialPort;
  }
  async function readSerialLoop() {
    let buffer = "";
    while (_serialReader) {
      const { value, done } = await _serialReader.read();
      if (done) break;
      buffer += value || "";
      let idx;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        const uid = line.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
        if (uid.length >= 8) {
          els.ident && (els.ident.value = uid);
          showToast(`RFID: ${uid}`);
        }
      }
    }
  }
  async function stopSerial() {
    try {
      _serialAbort?.abort();
    } catch {}
    try {
      await _serialReader?.cancel();
    } catch {}
    try {
      await _serialPort?.close();
    } catch {}
    _serialReader = null;
    _serialAbort = null;
    _serialPort = null;
  }

  // Manual RFID bind
  function bindRfidManual(t) {
    const uid = prompt("Enter RFID UID (hex):", t.rfidUid || "");
    if (!uid) return;
    t.rfidUid = uid.trim();
    logHistory(t, "update", { notes: "RFID bound (manual)" });
    upsertTool(t);
  }

  // keyboard shortcuts
  window.addEventListener("keydown", (e) => {
    const k = (e.key || "").toLowerCase();
    if (k === "/") {
      e.preventDefault();
      els.ident?.focus();
    }
  });

  // small helper to escape output in history
  function escapeHtml(s) {
    if (!s) return s;
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // Demo bootstrap if empty
  if (!Array.isArray(tools) || tools.length === 0) {
    tools = [
      { id: uuid(), name: "Cordless Drill", category: "Power Tools", condition: "Functional", status: "available", turnedInToday: true, notes: "", history: [{ ts: nowISO(), action: "create" }] },
      { id: uuid(), name: "Torque Wrench", category: "Hand Tools", condition: "Functional", status: "available", turnedInToday: true, notes: "", history: [{ ts: nowISO(), action: "create" }] },
      { id: uuid(), name: "Label Maker", category: "Shop", condition: "Functional", status: "available", turnedInToday: true, notes: "", history: [{ ts: nowISO(), action: "create" }] },
    ];
    save(STORE_KEY, tools);
  }

  // Boot
  renderCards();
  setMode("qr");
  setTab("sign");

  // Expose a minimal API for debugging in console
  window.ToolTracker = {
    tools,
    signs,
    upsertTool,
    findTool,
    stopQrScan,
    startQrScan,
    ensureSerial,
    stopSerial,
  };
})();
