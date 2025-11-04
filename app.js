const STORE_KEY = "tooltracker_v1";
const $ = (sel, parent = document) => parent.querySelector(sel);
const $$ = (sel, parent = document) => Array.from(parent.querySelectorAll(sel));

let tools = loadTools();

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}
function nowISO() { return new Date().toISOString(); }
function toYMD(d) { return d ? new Date(d).toISOString().slice(0,10) : ""; }

function loadTools() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveTools() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(tools));
  } catch {
    alert("Save failed. Export data and clear storage.");
  }
  render();
}
function logHistory(t, action, extra = {}) {
  t.history = t.history || [];
  t.history.push({ ts: nowISO(), action, ...extra });
}
function upsertTool(tool) {
  const i = tools.findIndex(x => x.id === tool.id);
  if (i === -1) tools.push(tool);
  else tools[i] = tool;
  saveTools();
}
function findTool(id) { return tools.find(t => t.id === id); }

const els = {
  list: $("#toolList"),
  tmpl: $("#toolCardTmpl"),
  dlgTool: $("#toolDialog"),
  formTool: $("#toolForm"),
  id: $("#toolId"),
  name: $("#toolName"),
  cat: $("#toolCategory"),
  cond: $("#toolCondition"),
  notes: $("#toolNotes"),
  title: $("#dialogTitle"),
  dlgOut: $("#checkoutDialog"),
  formOut: $("#checkoutForm"),
  outId: $("#checkoutToolId"),
  outJob: $("#checkoutJob"),
  outBy: $("#checkoutBy"),
  dlgIn: $("#checkinDialog"),
  formIn: $("#checkinForm"),
  inId: $("#checkinToolId"),
  inCond: $("#checkinCondition"),
  inNotes: $("#checkinNotes"),
  add: $("#addToolBtn"),
  exp: $("#exportBtn"),
  imp: $("#importInput"),
  fStat: $("#filterStatus"),
  fCat: $("#filterCategory"),
  search: $("#searchInput"),
};

function getFilters() {
  const s = els.fStat?.value || "all";
  const c = els.fCat?.value || "all";
  const q = (els.search?.value || "").trim().toLowerCase();
  return { s, c, q };
}

function render() {
  els.list.innerHTML = "";
  if (els.fCat) {
    const cats = ["all", ...new Set(tools.map(t => (t.category || "").trim()).filter(Boolean))].sort();
    const cur = els.fCat.value || "all";
    els.fCat.innerHTML = cats.map(c => `<option value="${c}">${c === "all" ? "All Categories" : c}</option>`).join("");
    els.fCat.value = cur;
  }
  const { s, c, q } = getFilters();
  const filtered = tools.filter(t => {
    if (s === "available" && t.status !== "available") return false;
    if (s === "checked_out" && t.status !== "checked_out") return false;
    if (s === "archived" && t.status !== "archived") return false;
    if (c !== "all" && (t.category || "").trim() !== c) return false;
    if (q && !`${t.name} ${t.assignedJob||""} ${t.checkedOutBy||""}`.toLowerCase().includes(q)) return false;
    return true;
  });
  filtered.sort((a,b)=>a.name.localeCompare(b.name)).forEach(t => {
    const n = els.tmpl.content.cloneNode(true);
    $(".card", node).dataset.category = (t.category || "").trim();
    
    $(".tool-name", n).textContent = t.name;
    $(".tool-category", n).textContent = t.category || "—";
    $(".tool-condition", n).textContent = t.condition || "—";
    $(".tool-job", n).textContent = t.assignedJob || "—";
    $(".tool-by", n).textContent = t.checkedOutBy || "—";
    const b = $(".status", n);
    if (t.status === "archived") { b.textContent="Archived"; b.classList.add("archived"); }
    else if (t.status === "checked_out") { b.textContent="Checked Out"; b.classList.add("out"); }
    else b.textContent="Available";
    const chk = $(".turned-in-toggle", n);
    if (chk) {
      chk.checked = !!t.turnedInToday;
      chk.addEventListener("change", () => {
        t.turnedInToday = chk.checked;
        if (t.turnedInToday) {
          t.status="available";
          t.assignedJob=t.checkedOutBy=undefined;
          logHistory(t,"checkin",{notes:"Marked turned in"});
        } else logHistory(t,"update",{notes:"Unchecked"});
        upsertTool(t);
      });
    }
    $(".edit", n).onclick = ()=>openEdit(t.id);
    $(".checkout", n).onclick = ()=>openCheckout(t.id);
    $(".checkin", n).onclick = ()=>openCheckin(t.id);
    $(".archive", n).onclick = ()=>archiveTool(t.id);
    els.list.appendChild(n);
  });
}

els.add.onclick = () => {
  els.title.textContent="Add Tool";
  els.id.value=""; els.name.value=""; els.cat.value="";
  els.cond.value="Functional"; els.notes.value="";
  els.dlgTool.showModal();
};
els.formTool.onsubmit = e => {
  e.preventDefault();
  const id = els.id.value||uuid();
  const newT=!els.id.value;
  const t=findTool(id)||{id,name:"",status:"available",history:[]};
  const allowed=["Functional","Needs repair","Turned in for repair"];
  Object.assign(t,{
    name:els.name.value.trim(),
    category:els.cat.value.trim()||undefined,
    condition:allowed.includes(els.cond.value)?els.cond.value:"Functional",
    notes:els.notes.value.trim()||undefined
  });
  logHistory(t,newT?"create":"update");
  upsertTool(t);
  els.dlgTool.close();
};

function openEdit(id){
  const t=findTool(id); if(!t)return;
  els.title.textContent="Edit Tool";
  els.id.value=t.id; els.name.value=t.name;
  els.cat.value=t.category||""; els.cond.value=t.condition||"Functional";
  els.notes.value=t.notes||""; els.dlgTool.showModal();
}
function openCheckout(id){
  const t=findTool(id); if(!t||t.status==="archived")return;
  els.outId.value=t.id; els.outJob.value=t.assignedJob||"";
  els.outBy.value=t.checkedOutBy||""; els.dlgOut.showModal();
}
els.formOut.onsubmit=e=>{
  e.preventDefault();
  const t=findTool(els.outId.value); if(!t)return;
  t.status="checked_out";
  t.assignedJob=els.outJob.value.trim();
  t.checkedOutBy=els.outBy.value.trim();
  t.turnedInToday=false;
  logHistory(t,"checkout",{job:t.assignedJob,by:t.checkedOutBy});
  upsertTool(t); els.dlgOut.close();
};
function openCheckin(id){
  const t=findTool(id); if(!t||t.status==="archived")return;
  els.inId.value=t.id; els.inCond.value=t.condition||"Functional";
  els.inNotes.value=""; els.dlgIn.showModal();
}
els.formIn.onsubmit=e=>{
  e.preventDefault();
  const t=findTool(els.inId.value); if(!t)return;
  const allowed=["Functional","Needs repair","Turned in for repair"];
  t.status="available";
  t.condition=allowed.includes(els.inCond.value)?els.inCond.value:"Functional";
  t.turnedInToday=true;
  const notes=els.inNotes.value.trim();
  if(notes)t.notes=[t.notes,notes].filter(Boolean).join(" | ");
  t.assignedJob=t.checkedOutBy=undefined;
  logHistory(t,"checkin",{notes});
  upsertTool(t); els.dlgIn.close();
};
function archiveTool(id){
  const t=findTool(id); if(!t)return;
  t.status=t.status==="archived"?"available":"archived";
  logHistory(t,"archive"); upsertTool(t);
}

els.fStat.onchange=render;
els.fCat.onchange=render;
els.search.oninput=render;

els.exp.onclick=()=>{
  const blob=new Blob([JSON.stringify(tools,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=`tooltracker-${toYMD(new Date())}.json`;
  a.click(); URL.revokeObjectURL(url);
};
els.imp.onchange=async e=>{
  const f=e.target.files?.[0]; if(!f)return;
  const text=await f.text();
  try{
    const data=JSON.parse(text);
    if(!Array.isArray(data))throw new Error("Invalid data");
    const allowed=["Functional","Needs repair","Turned in for repair"];
    data.forEach(d=>{
      d.id=d.id||uuid();
      d.status=["archived","checked_out"].includes(d.status)?d.status:"available";
      d.turnedInToday=!!d.turnedInToday;
      d.condition=allowed.includes(d.condition)?d.condition:"Functional";
      d.history=Array.isArray(d.history)?d.history:[{ts:nowISO(),action:"create"}];
    });
    tools=data; saveTools(); alert("Import successful.");
  }catch(err){alert("Import failed: "+err.message);}
  e.target.value="";
};

window.onkeydown=e=>{
  if(e.key==="/"){e.preventDefault();els.search.focus();}
  if(e.key.toLowerCase()==="a")els.add.click();
  if(e.key.toLowerCase()==="e")els.exp.click();
};

if(tools.length===0){
  const demo=[
    {name:"Cordless Drill",category:"Power Tools"},
    {name:"Torque Wrench",category:"Hand Tools"},
    {name:"Label Maker",category:"Shop"}
  ].map(x=>({
    id:uuid(),name:x.name,category:x.category,
    condition:"Functional",status:"available",
    turnedInToday:true,notes:"",
    history:[{ts:nowISO(),action:"create"}]
  }));
  tools=demo; saveTools();
}else render();
