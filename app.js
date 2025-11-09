// ✦────────────────────────────────────────────────────────────────────────────✦
// ✦  TOOLTRACKER V1 — THE LEDGER OF IRON & INK BECAUSE IF ELSE DOOMSDAY        ✦
// ✦  In which tools are named, their journeys chronicled, and their spirits    ✦
// ✦  recalled from the Vault of Local Storage.  NARROW YE JOURNEY COMING SOON  ✦
// ✦────────────────────────────────────────────────────────────────────────────✦

// ToolTracker V1 - Streamlined
// =============================

//* Storage Keys *
const STORE_KEY = "tooltracker_v1";
const SIGN_KEY  = "tooltracker_signouts_v1";

//* DOM Helpers *
const $  = (s,p=document)=>p.querySelector(s);
const $$ = (s,p=document)=>Array.from(p.querySelectorAll(s));

//* State *
let tools = load(STORE_KEY) || [];
let signs = load(SIGN_KEY)  || [];

//* Utils *
function load(key){ try{ const raw=localStorage.getItem(key); return raw?JSON.parse(raw):null; }catch{ return null; } }
function save(key,val){ localStorage.setItem(key, JSON.stringify(val)); }
function uuid(){ return crypto.randomUUID ? crypto.randomUUID() :
 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{ const r=Math.random()*16|0, v=c==='x'?r:(r&0x3|0x8); return v.toString(16); }); }
const nowISO = ()=>new Date().toISOString();
const toYMD  = d=>new Date(d).toISOString().slice(0,10);

//* Tool History *
function logHistory(t, action, extra={}){ t.history=t.history||[]; t.history.push({ts:nowISO(),action,...extra}); }
function upsertTool(tool){ const i=tools.findIndex(x=>x.id===tool.id); if(i===-1) tools.push(tool); else tools[i]=tool; save(STORE_KEY,tools); renderCards(); }
function findTool(id){ return tools.find(t=>t.id===id); }

//* UI Elements *
const els={ tabSign:$("#tabSign"), tabHistory:$("#tabHistory"),
  panelSign:$("#panelSign"), panelHistory:$("#panelHistory"),
  modeQR:$("#modeQR"), modeRFID:$("#modeRFID"), modeManual:$("#modeManual"),
  actionBar:$("#actionBar"), barText:$("#barText"),
  form:$("#signForm"), ident:$("#fIdent"), date:$("#fDate"), init:$("#fInit"),
  job:$("#fJob"), bldg:$("#fBldg"), sect:$("#fSect"), submit:$("#submitSign"),
  histSearch:$("#histSearch"), histList:$("#histList"),
  list:$("#toolList"), tmpl:$("#toolCardTmpl"),
  qrDlg:$("#qrDialog"), qrTitle:$("#qrDialogTitle"), qrWrap:$("#qrCanvasWrap"), qrClose:$("#qrCloseBtn"),
  scanDlg:$("#scanDialog"), scanVideo:$("#scanVideo"), scanCanvas:$("#scanCanvas"), scanClose:$("#scanCloseBtn"), scanStatus:$("#scanStatus"),
};

//* Tabs *
function setTab(which){
  const isSign = which==="sign";
  els.tabSign.classList.toggle("active",isSign);
  els.tabHistory.classList.toggle("active",!isSign);
  els.panelSign.classList.toggle("hide",!isSign);
  els.panelHistory.classList.toggle("hide",isSign);
  if(!isSign) renderHistory();
}
els.tabSign.onclick=()=>setTab("sign");
els.tabHistory.onclick=()=>setTab("history");

//* Modes *
let currentMode="qr";
function setMode(m){
  currentMode=m;
  els.modeQR.classList.toggle("active",m==="qr");
  els.modeRFID.classList.toggle("active",m==="rfid");
  els.modeManual.classList.toggle("active",m==="manual");
  els.barText.textContent={
    qr: "Start QR Scanner",
    rfid: "Scan RFID Tag",
    manual: "Manual Entry Active"
  }[m];
}
els.modeQR.onclick = ()=>setMode("qr");
els.modeRFID.onclick = ()=>setMode("rfid");
els.modeManual.onclick = ()=>setMode("manual");

//* Action Bar *
els.actionBar.onclick = async ()=>{
  if(currentMode==="qr") startQrScan();
  else if(currentMode==="rfid"){
    if(!("serial" in navigator)){ const uid=prompt("Enter RFID UID (hex):",""); if(uid) els.ident.value=uid.trim(); return; }
    await ensureSerial(); alert("Present a tag to the connected RFID reader.");
  } else {
    els.ident.focus();
  }
};

//* Form Submit *
els.date.value = toYMD(new Date());
els.form.onsubmit = e=>{
  e.preventDefault();
  const rec={
    id:uuid(), ts:nowISO(),
    ident:els.ident.value.trim(),
    date:els.date.value||toYMD(new Date()),
    initials:els.init.value.trim(),
    job:(els.job.value||"").trim(),
    building:(els.bldg.value||"").trim(),
    section:(els.sect.value||"").trim(),
    mode:currentMode
  };
  if(!rec.ident){ alert("Enter a tool identifier."); return; }
  if(!rec.initials || rec.initials.length<2){ alert("Enter user initials (2–4 letters)."); return; }

  const toolId = parseToolTagPayload(rec.ident) || rec.ident;
  const t = findTool(toolId);
  if(t){
    t.status="checked_out";
    t.assignedJob=rec.job;
    t.checkedOutBy=rec.initials;
    t.turnedInToday=false;
    logHistory(t,"checkout",{job:t.assignedJob,by:t.checkedOutBy,building:rec.building,section:rec.section});
    upsertTool(t);
  }
  signs.unshift(rec);
  save(SIGN_KEY,signs);
  els.ident.value=""; els.job.value=""; els.bldg.value=""; els.sect.value="";
  alert("Tool signed out.");
  renderHistory();
};

//* History *
function renderHistory(){
  const q=(els.histSearch.value||"").toLowerCase().trim();
  const list=els.histList; list.innerHTML="";
  const rows=signs.filter(r=>{
    const s=`${r.ident} ${r.initials} ${r.job} ${r.building} ${r.section}`.toLowerCase();
    return !q || s.includes(q);
  });
  if(!rows.length){ list.innerHTML='<div class="empty">No sign-out records yet</div>'; return; }
  rows.slice(0,200).forEach(r=>{
    const row=document.createElement("div");
    row.className="history-item";
    row.innerHTML=`
      <div><strong>${r.ident}</strong></div>
      <div>${r.initials}</div>
      <div>${r.job||"—"}</div>
      <div>${r.building||"—"}</div>
      <div>${r.section||"—"}</div>
    `;
    list.appendChild(row);
  });
}
els.histSearch.oninput=renderHistory;

//* Cards *
function renderCards(){
  if(!els.list||!els.tmpl) return;
  els.list.innerHTML="";
  tools.sort((a,b)=>(a.name||"").localeCompare(b.name||"")).forEach(t=>{
    const frag=els.tmpl.content.cloneNode(true);
    const card=$(".card",frag);
    if(card){ card.dataset.id=t.id; card.dataset.status=t.status||"available"; }
    $(".tool-name",frag).textContent=t.name;
    $(".tool-category",frag).textContent=t.category||"—";
    $(".tool-condition",frag).textContent=t.condition||"—";
    $(".tool-job",frag).textContent=t.assignedJob||"—";
    $(".tool-by",frag).textContent=t.checkedOutBy||"—";

    const b=$(".status",frag);
    if(b){
      b.classList.remove("out","archived");
      if(t.status==="archived"){ b.textContent="Archived"; b.classList.add("archived"); }
      else if(t.status==="checked_out"){ b.textContent="Checked Out"; b.classList.add("out"); }
      else b.textContent="Available";
    }

    const hook=(sel,fn)=>{ const el=$(sel,frag); if(el) el.onclick=fn; };
    hook(".edit",()=>openEdit(t.id));
    hook(".checkout",()=>quickCheckout(t));
    hook(".checkin",()=>quickCheckin(t));
    hook(".archive",()=>archiveTool(t.id));
    hook(".qr-show",()=>showToolQR(t));
    hook(".rfid-bind",()=>bindRfidManual(t));

    const chk=$(".turned-in-toggle",frag);
    if(chk){
      chk.checked=!!t.turnedInToday;
      chk.onchange=()=>{
        t.turnedInToday=chk.checked;
        if(t.turnedInToday){ t.status="available"; t.assignedJob=t.checkedOutBy=undefined; logHistory(t,"checkin",{notes:"Marked turned in"}); }
        else { logHistory(t,"update",{notes:"Unchecked"}); }
        upsertTool(t);
      };
    }
    els.list.appendChild(frag);
  });
}

//* Tag Payloads *
function toolTagPayload(t){ return `TT:${t.id}`; }
function parseToolTagPayload(text){ const m=String(text||"").trim().match(/^TT:([0-9a-fA-F-]{8,})$/); return m?m[1]:null; }

//* QR Viewer *
function showToolQR(t){
  const dlg=els.qrDlg, box=els.qrWrap; if(!dlg||!box) return;
  box.innerHTML=""; els.qrTitle.textContent=`QR • ${t.name||t.id}`;
  const payload=toolTagPayload(t);
  if(window.QRCode){ const canvas=document.createElement("canvas"); box.appendChild(canvas); QRCode.toCanvas(canvas,payload,{width:256,margin:2},err=>{ if(err) box.textContent=payload; }); }
  else { box.textContent=payload; }
  dlg.showModal();
}
if(els.qrClose) els.qrClose.onclick=()=>els.qrDlg?.close();

//* QR Camera Scan *
let _scanStream=null,_scanRaf=0;
async function startQrScan(){
  if(!els.scanDlg||!els.scanVideo||!els.scanCanvas) return;
  els.scanStatus.textContent="Starting camera…";
  try{
    _scanStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
    els.scanVideo.srcObject=_scanStream; await els.scanVideo.play();
    els.scanDlg.showModal(); tickScan();
  }catch{ els.scanStatus.textContent="Camera unavailable."; }
}
function stopQrScan(){ cancelAnimationFrame(_scanRaf); _scanStream?.getTracks().forEach(t=>t.stop()); _scanStream=null; els.scanVideo.srcObject=null; els.scanDlg?.close(); }
if(els.scanClose) els.scanClose.onclick=stopQrScan;

async function tickScan(){
  _scanRaf=requestAnimationFrame(tickScan);
  const v=els.scanVideo,c=els.scanCanvas; if(!v||!c||v.readyState<2) return;
  const w=v.videoWidth,h=v.videoHeight; if(!w||!h) return;
  c.width=w;c.height=h; const ctx=c.getContext("2d"); ctx.drawImage(v,0,0,w,h);

  if("BarcodeDetector" in window){
    try{ const det=new window.BarcodeDetector({formats:["qr_code"]}); const codes=await det.detect(c); if(codes?.length){ if(handleScannedText(codes[0].rawValue||codes[0].displayValue)) return; } }catch{}
  }
  if(window.jsQR){ const img=ctx.getImageData(0,0,w,h); const res=jsQR(img.data,w,h,{inversionAttempts:"dontInvert"}); if(res?.data){ if(handleScannedText(res.data)) return; } }
  els.scanStatus.textContent="Scanning… align QR within the frame.";
}
function handleScannedText(text){ const id=parseToolTagPayload(text)||text; els.ident.value=id; stopQrScan(); return true; }

//* Serial/RFID Support *
let _serialPort=null,_serialReader=null,_serialAbort=null;
async function ensureSerial(){
  if(_serialPort) return _serialPort;
  _serialPort=await navigator.serial.requestPort();
  await _serialPort.open({baudRate:9600});
  _serialAbort=new AbortController();
  const dec=new TextDecoderStream(); _serialPort.readable.pipeTo(dec.writable);
  _serialReader=dec.readable.getReader({signal:_serialAbort.signal});
  readSerialLoop();
  return _serialPort;
}
async function readSerialLoop(){
  let buffer="";
  while(_serialReader){
    const {value,done}=await _serialReader.read(); if(done) break;
    buffer+=value||"";
    let idx; while((idx=buffer.indexOf("\n"))>=0){
      const line=buffer.slice(0,idx).trim(); buffer=buffer.slice(idx+1);
      const uid=line.replace(/[^0-9A-Fa-f]/g,"").toUpperCase();
      if(uid.length>=8){ els.ident.value=uid; alert(`RFID: ${uid}`); }
    }
  }
}
function bindRfidManual(t){
  const uid=prompt("Enter RFID UID (hex):",t.rfidUid||""); if(!uid) return;
  t.rfidUid=uid.trim(); logHistory(t,"update",{notes:"RFID bound (manual)"}); upsertTool(t);
}

//* Card Quick Actions *
function openEdit(id){ alert("Edit not implemented. Use quick actions."); }
function quickCheckout(t){
  t.status="checked_out";
  t.assignedJob=prompt("Job number (optional):",t.assignedJob||"")||"";
  t.checkedOutBy=prompt("Your initials (2–4):",t.checkedOutBy||"")||"";
  t.turnedInToday=false;
  logHistory(t,"checkout",{job:t.assignedJob,by:t.checkedOutBy});
  upsertTool(t);
}
function quickCheckin(t){
  t.status="available"; t.turnedInToday=true; t.assignedJob=t.checkedOutBy=undefined;
  logHistory(t,"checkin",{notes:"Quick check-in"});
  upsertTool(t);
}
function archiveTool(id){ const t=findTool(id); if(!t) return; t.status=(t.status==="archived")?"available":"archived"; logHistory(t,"archive"); upsertTool(t); }

//* Keyboard Shortcut *
window.onkeydown=(e)=>{ const k=(e.key||"").toLowerCase(); if(k==="/"){ e.preventDefault(); els.ident?.focus(); } };

//* Initial Demo Data *
if(tools.length===0){
  tools=[
    {id:uuid(),name:"Cordless Drill",category:"Power Tools",condition:"Functional",status:"available",turnedInToday:true,history:[{ts:nowISO(),action:"create"}]},
    {id:uuid(),name:"Torque Wrench", category:"Hand Tools", condition:"Functional",status:"available",turnedInToday:true,history:[{ts:nowISO(),action:"create"}]},
    {id:uuid(),name:"Label Maker",   category:"Shop",       condition:"Functional",status:"available",turnedInToday:true,history:[{ts:nowISO(),action:"create"}]},
  ];
  save(STORE_KEY,tools);
}
renderCards();
setMode("qr");
setTab("sign");
