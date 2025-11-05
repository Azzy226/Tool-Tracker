// ✦────────────────────────────────────────────────────────────────────────────✦
// ✦  TOOLTRACKER V1 — THE LEDGER OF IRON & INK BECAUSE IF ELSE DOOMSDAY        ✦
// ✦  In which tools are named, their journeys chronicled, and their spirits    ✦
// ✦  recalled from the Vault of Local Storage.  NARROW YE JOURNEY COMING SOON  ✦
// ✦────────────────────────────────────────────────────────────────────────────✦

/* ✦ Rune: Storage Key — the rune by which our ledger is summoned */
const STORE_KEY = "tooltracker_v1";

/* ✦ Rune: Short Hands — swift familiars for querying the DOM forest */
const $  = (sel, parent = document) => parent.querySelector(sel);
const $$ = (sel, parent = document) => Array.from(parent.querySelectorAll(sel));

/* ✦ Awakening: Draw forth the remembered tools from the vault */
let tools = loadTools();

/* ✦ Forge-Mark: UUID — brands a tool with a unique True Name */
function uuid() {
  // ⟡ If the modern spirits grant a true UUID, invoke them; else, inscribe one by hand
  return crypto.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

/* ✦ Chronometer: Now — carve the current moment into ISO crystal */
function nowISO() { return new Date().toISOString(); }

/* ✦ Calendar Blade: Trim an ISO date to Year-Month-Day (YMD) */
function toYMD(d) { return d ? new Date(d).toISOString().slice(0,10) : ""; }

/* ✦ Rite of Retrieval: Call the Vault and return its contents (or an empty shelf) */
function loadTools() {
  try {
    const raw = localStorage.getItem(STORE_KEY);          // ⟡ Unseal the vault
    if (!raw) return [];                                  // ⟡ Empty vault, empty list
    const parsed = JSON.parse(raw);                       // ⟡ Translate runes to objects
    return Array.isArray(parsed) ? parsed : [];           // ⟡ Guard against corruption
  } catch {
    return [];                                            // ⟡ If the vault sputters, start anew
  }
}

/* ✦ Rite of Sealing: Save the current Chronicle back to the Vault */
function saveTools() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(tools)); // ⟡ Scribe the ledger
  } catch {
    alert("Save failed. Export data and clear storage.");    // ⟡ If the ward fails, warn the guild
  }
  render();                                                  // ⟡ Renew the display altar
}

/* ✦ Chronicle Quill: Append a line to a tool’s saga */
function logHistory(t, action, extra = {}) {
  t.history = t.history || [];                               // ⟡ Ensure the scroll exists
  t.history.push({ ts: nowISO(), action, ...extra });        // ⟡ Ink a fresh entry
}

/* ✦ Council Decree: Insert a tool if new; replace it if known */
function upsertTool(tool) {
  const i = tools.findIndex(x => x.id === tool.id);          // ⟡ Search for the True Name
  if (i === -1) tools.push(tool);                            // ⟡ New oathsworn joins the ranks
  else tools[i] = tool;                                      // ⟡ Knight's record is updated
  saveTools();                                               // ⟡ Seal and display in Pensive
}

/* ✦ Seeking Stone: Find one by True Name */
function findTool(id) { return tools.find(t => t.id === id); }

/* ✦ The Hall of Hooks: Bind DOM reliquaries to their names */
const els = {
  list: $("#toolList"),               // ⟡ The Gallery of Cards
  tmpl: $("#toolCardTmpl"),           // ⟡ The Mould from which cards emerge

  // ✦ Dialogs of Craft
  dlgTool: $("#toolDialog"),
  formTool: $("#toolForm"),
  id: $("#toolId"),
  name: $("#toolName"),
  cat: $("#toolCategory"),
  cond: $("#toolCondition"),
  notes: $("#toolNotes"),
  title: $("#dialogTitle"),

  // ✦ Ritual of Checkout
  dlgOut: $("#checkoutDialog"),
  formOut: $("#checkoutForm"),
  outId: $("#checkoutToolId"),
  outJob: $("#checkoutJob"),
  outBy: $("#checkoutBy"),

  // ✦ Ritual of Checkin
  dlgIn: $("#checkinDialog"),
  formIn: $("#checkinForm"),
  inId: $("#checkinToolId"),
  inCond: $("#checkinCondition"),
  inNotes: $("#checkinNotes"),

  // ✦ Sigils of Action
  add: $("#addToolBtn"),
  exp: $("#exportBtn"),
  imp: $("#importInput"),

  // ✦ Filters & Scrying
  fStat: $("#filterStatus"),
  fCat: $("#filterCategory"),
  search: $("#searchInput"),
};

/* ✦ Scrying Glass: Read the user’s filters and query */
function getFilters() {
  const s = els.fStat?.value || "all";                        // ⟡ Status rune
  const c = els.fCat?.value || "all";                         // ⟡ Category rune
  const q = (els.search?.value || "").trim().toLowerCase();   // ⟡ Whispered query
  return { s, c, q };
}

/* ✦ Illumination: Render all visible cards upon the Gallery table */
function render() {
  if (!els.list || !els.tmpl) return;                         // ⟡ If the altar is missing, desist
  els.list.innerHTML = "";                                     // ⟡ Sweep the table clean

  // ✦ Reforging Categories: Gather all known domains for the dropdown
  if (els.fCat) {
    const cats = ["all", ...new Set(tools.map(t => (t.category || "").trim()).filter(Boolean))].sort();
    const cur = els.fCat.value || "all";
    els.fCat.innerHTML = cats
      .map(c => `<option value="${c}">${c === "all" ? "All Categories" : c}</option>`)
      .join("");
    els.fCat.value = cats.includes(cur) ? cur : "all";
  }

  // ✦ The Filtering: Decide which spirits are presently called to the stage
  const { s, c, q } = getFilters();
  const filtered = tools.filter(t => {
    if (s === "available"   && t.status !== "available")   return false; // ⟡ Only those free of oath
    if (s === "checked_out" && t.status !== "checked_out") return false; // ⟡ Only those on quest
    if (s === "archived"    && t.status !== "archived")    return false; // ⟡ Only those deceased
    if (c !== "all" && (t.category || "").trim() !== c)    return false; // ⟡ Only of this guild
    if (q && !`${t.name} ${t.assignedJob||""} ${t.checkedOutBy||""}`.toLowerCase().includes(q)) return false; // ⟡ Query must match
    return true;                                                             // ⟡ Else, welcome to staaaaaageeee
  });

  // ✦ Procession: In name-order they appear, each from the Mould
  filtered
    .sort((a,b)=>(a.name||"").localeCompare(b.name||""))
    .forEach(t => {
      const frag = els.tmpl.content.cloneNode(true);                          // ⟡ Call forth a new card
      const card = $(".card", frag);                                          // ⟡ The card’s body

      if (card) {
        card.dataset.category = (t.category || "").trim();                    // ⟡ Imprint guild mark
        card.dataset.status   = t.status || "available";                      // ⟡ Imprint current status
      }

      // ✦ Inscribe visible traits
      $(".tool-name", frag).textContent      = t.name;
      $(".tool-category", frag).textContent  = t.category || "—";
      $(".tool-condition", frag).textContent = t.condition || "—";
      $(".tool-job", frag).textContent       = t.assignedJob || "—";
      $(".tool-by", frag).textContent        = t.checkedOutBy || "—";

      // ✦ Seal of State
      const b = $(".status", frag);
      if (b) {
        b.classList.remove("archived","out");                                  // ⟡ Clear old colors // ressurect le tool o.o
        if (t.status === "archived")      { b.textContent="Archived";    b.classList.add("archived"); }
        else if (t.status === "checked_out"){ b.textContent="Checked Out"; b.classList.add("out"); }
        else                               { b.textContent="Available"; }
      }

      // ✦ Daily Token: Turned-in toggle
      const chk = $(".turned-in-toggle", frag);
      if (chk) {
        chk.checked = !!t.turnedInToday;                                       // ⟡ Mirror current token
        chk.addEventListener("change", () => {
          t.turnedInToday = chk.checked;                                       // ⟡ Flip the token
          if (t.turnedInToday) {
            t.status="available";                                              // ⟡ Quest ended; at the rack
            t.assignedJob = t.checkedOutBy = undefined;                        // ⟡ Clear bindings
            logHistory(t,"checkin",{notes:"Marked turned in"});                // ⟡ Chronicle the return
          } else {
            logHistory(t,"update",{notes:"Unchecked"});                        // ⟡ Chronicle the doubt
          }
          upsertTool(t);                                                       // ⟡ Seal the change
        });
      }

      // ✦ Small familiars: Safe event bindings
      const hook = (sel, fn) => { const el = $(sel, frag); if (el) el.onclick = fn; };
      hook(".edit",     () => openEdit(t.id));                                 // ⟡ Open the Forge
      hook(".checkout", () => openCheckout(t.id));                             // ⟡ Issue the Quest
      hook(".checkin",  () => openCheckin(t.id));                              // ⟡ Receive the Return
      hook(".archive",  () => archiveTool(t.id));                              // ⟡ Send to the Halls of Rest

      els.list.appendChild(frag);                                              // ⟡ Let the card take its place
    });
}

/* ✦ Invocation: Add Tool ritual — opens the crafting dialog */
if (els.add) {
  els.add.onclick = () => {
    els.title.textContent="Add Tool";                    // ⟡ Title the rite
    els.id.value=""; els.name.value="";                  // ⟡ Clear the anvils
    els.cat.value=""; els.cond.value="Functional";
    els.notes.value="";
    els.dlgTool?.showModal();                            // ⟡ Draw the curtain
  };
}

/* ✦ Consecration: When the form is sealed, create or update the tool */
if (els.formTool) {
  els.formTool.onsubmit = e => {
    e.preventDefault();                                  // ⟡ Still the default winds
    const id   = els.id.value||uuid();                   // ⟡ Determine True Name
    const newT = !els.id.value;                          // ⟡ Squire or Knight?
    const t    = findTool(id)||{id,name:"",status:"available",history:[]};
    const allowed = ["Functional","Needs repair","Turned in for repair"]; // ⟡ Accepted conditions

    Object.assign(t,{
      name: els.name.value.trim(),                       // ⟡ Inscribe Name
      category: els.cat.value.trim()||undefined,         // ⟡ Inscribe Guild
      condition: allowed.includes(els.cond.value) ? els.cond.value : "Functional",
      notes: els.notes.value.trim()||undefined           // ⟡ Optional marginalia OMG I FORGOT TO ADD other categories fml im tired. not going back...... ⟡ ONWARD
    });

    logHistory(t, newT ? "create" : "update");           // ⟡ Chronicle the rite
    upsertTool(t);                                       // ⟡ Seat the tool in the ledger
    els.dlgTool?.close();                                // ⟡ Extinguish the lamps
  };
}

/* ✦ Forge Re-Open: Prepare the edit dialog with an old blade */
function openEdit(id){
  const t=findTool(id); if(!t)return;                    // ⟡ If ghost, do nothing
  els.title.textContent="Edit Tool";                     // ⟡ Rename the rite
  els.id.value=t.id; els.name.value=t.name||"";          // ⟡ Lay out current runes
  els.cat.value=t.category||"";                          // ⟡ Guild
  els.cond.value=t.condition||"Functional";              // ⟡ Health of steel
  els.notes.value=t.notes||"";                           // ⟡ Marginalia
  els.dlgTool?.showModal();                              // ⟡ Raise the curtain
}

/* ✦ Issue the Quest: Prepare the checkout ritual */
function openCheckout(id){
  const t=findTool(id); if(!t||t.status==="archived")return; // ⟡ Do not awaken the retired
  els.outId.value=t.id;                                      // ⟡ Bind True Name
  els.outJob.value=t.assignedJob||"";                        // ⟡ Task rune
  els.outBy.value=t.checkedOutBy||"";                        // ⟡ Bearer rune
  els.dlgOut?.showModal();                                   // ⟡ Open the gate
}

/* ✦ Seal the Quest: On submit, send the tool forth */
if (els.formOut) {
  els.formOut.onsubmit=e=>{
    e.preventDefault();
    const t=findTool(els.outId.value); if(!t)return;         // ⟡ If phantom, cease
    t.status="checked_out";                                  // ⟡ Mark as on journey
    t.assignedJob=els.outJob.value.trim();                   // ⟡ Task rune inscribed
    t.checkedOutBy=els.outBy.value.trim();                   // ⟡ Bearer rune inscribed
    t.turnedInToday=false;                                   // ⟡ The daily token falls
    logHistory(t,"checkout",{job:t.assignedJob,by:t.checkedOutBy}); // ⟡ Chronicle the departure
    upsertTool(t); els.dlgOut?.close();                      // ⟡ Seal and close the gate
  };
}

/* ✦ Receive the Return: Prepare the check-in ritual */
function openCheckin(id){
  const t=findTool(id); if(!t||t.status==="archived")return; // ⟡ The retired do not march
  els.inId.value=t.id;                                       // ⟡ Bind True Name
  els.inCond.value=t.condition||"Functional";                // ⟡ Current health
  els.inNotes.value="";                                      // ⟡ Clear notes
  els.dlgIn?.showModal();                                    // ⟡ Open the hall
}

/* ✦ Seal the Return: On submit, restore the tool to the rack */
if (els.formIn) {
  els.formIn.onsubmit=e=>{
    e.preventDefault();
    const t=findTool(els.inId.value); if(!t)return;          // ⟡ If shade, desist
    const allowed=["Functional","Needs repair","Turned in for repair"];
    t.status="available";                                    // ⟡ Back at the rack
    t.condition=allowed.includes(els.inCond.value)?els.inCond.value:"Functional";
    t.turnedInToday=true;                                    // ⟡ Daily token is raised

    const notes=els.inNotes.value.trim();
    if(notes) t.notes=[t.notes,notes].filter(Boolean).join(" | "); // ⟡ Marginalia stitched

    t.assignedJob=t.checkedOutBy=undefined;                  // ⟡ Cut the old bindings
    logHistory(t,"checkin",{notes});                         // ⟡ Chronicle the return
    upsertTool(t); els.dlgIn?.close();                       // ⟡ Seal the hall
  };
}

/* ✦ The Long Sleep: Archive or Awaken a tool */
function archiveTool(id){
  const t=findTool(id); if(!t)return;                        // ⟡ Only the living
  t.status = (t.status==="archived") ? "available" : "archived"; // ⟡ Toggle rest
  logHistory(t,"archive");                                   // ⟡ Chronicle the change
  upsertTool(t);                                             // ⟡ Seal the fate
}

/* ✦ Levers & Lenses: When the scrying shifts, repaint the world */
if (els.fStat)  els.fStat.onchange  = render;
if (els.fCat)   els.fCat.onchange   = render;
if (els.search) els.search.oninput  = render;

/* ✦ Export Spell: Cast the ledger into a portable scroll */
if (els.exp) {
  els.exp.onclick=()=>{
    const blob=new Blob([JSON.stringify(tools,null,2)],{type:"application/json"}); // ⟡ Form the scroll
    const url=URL.createObjectURL(blob);                                           // ⟡ Open the path
    const a=document.createElement("a");                                           // ⟡ Summon courier
    a.href=url; a.download=`tooltracker-${toYMD(new Date())}.json`;                // ⟡ Name the scroll
    a.click(); URL.revokeObjectURL(url);                                           // ⟡ Path dissolves
  };
}

/* ✦ Import Spell: Read a foreign scroll and merge its tales */
if (els.imp) {
  els.imp.onchange=async e=>{
    const f=e.target.files?.[0]; if(!f)return;                                     // ⟡ No scroll, no spell
    const text=await f.text();                                                      // ⟡ Read the runes
    try{
      const data=JSON.parse(text);                                                 // ⟡ Translate
      if(!Array.isArray(data)) throw new Error("Invalid data");
      const allowed=["Functional","Needs repair","Turned in for repair"];

      // ⟡ Purify each entry against our guild laws
      data.forEach(d=>{
        d.id=d.id||uuid();
        d.name = d.name || "";
        d.status=["archived","checked_out","available"].includes(d.status)?d.status:"available";
        d.turnedInToday=!!d.turnedInToday;
        d.condition=allowed.includes(d.condition)?d.condition:"Functional";
        d.history=Array.isArray(d.history)&&d.history.length?d.history:[{ts:nowISO(),action:"create"}];
      });

      tools=data; saveTools(); alert("Import successful.");                         // ⟡ The guild accepts
    }catch(err){
      alert("Import failed: "+err.message);                                         // ⟡ The guild refuses
    }
    e.target.value="";                                                              // ⟡ Clean the totem
  };
}

/* ✦ Shortcut Runes: Keys that beckon swift action */
window.onkeydown=e=>{
  if(e.key==="/"){ e.preventDefault(); els.search?.focus(); }  // ⟡ Scry quicker
  if(e.key.toLowerCase()==="a") els.add?.click();              // ⟡ Conjure forge
  if(e.key.toLowerCase()==="e") els.exp?.click();              // ⟡ Cast export
};

/* ✦ First Dawn: If no tools exist, call forth three exemplars; else, reveal the hall */
if(tools.length===0){
  const demo=[
    {name:"Cordless Drill",category:"Power Tools"},
    {name:"Torque Wrench", category:"Hand Tools"},
    {name:"Label Maker",   category:"Shop"}
  ].map(x=>({
    id:uuid(), name:x.name, category:x.category,
    condition:"Functional", status:"available",
    turnedInToday:true, notes:"",
    history:[{ts:nowISO(),action:"create"}]
  }));
  tools=demo; saveTools();                                // ⟡ Seal and render
} else {
  render();                                               // ⟡ Show the current Chronicle
}
