const DATA_URL = "./data/dashboard.json";
const $ = (id) => document.getElementById(id);
let lastWarSignature = "";

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString("id-ID");
}
function esc(value="") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
async function loadDashboard() {
  try {
    const res = await fetch(`${DATA_URL}?t=${Date.now()}`, {cache:"no-store"});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    render(data);
    $("updated").textContent = data.updatedAt ? `Update: ${fmtDate(data.updatedAt)}` : "Data belum diperbarui";
    $("syncStatus").textContent = data.error ? "API PERLU DICEK" : "SINKRON";
  } catch (err) {
    $("updated").textContent = "Gagal membaca data dashboard";
    $("syncStatus").textContent = "DATA OFFLINE";
    console.error(err);
  }
}
function render(data) {
  const clan = data.clan || {};
  $("clanTag").textContent = `TAG: ${clan.tag || "BELUM DIATUR"}`;
  $("clanName").textContent = clan.name || "Nama clan";
  $("clanLevel").textContent = clan.clanLevel ?? "—";
  $("clanPoints").textContent = clan.clanPoints ?? "—";
  const members = data.members || [];
  $("memberCount").textContent = clan.members ?? members.length ?? "—";
  $("rosterCount").textContent = `${members.length} / 50`;
  $("members").innerHTML = members.length ? members.map(m =>
    `<div class="member"><span><span class="member-name">${esc(m.name)}</span><br><span class="member-meta">${esc(m.role || "member")} · TH ${m.townHallLevel ?? "—"}</span></span><b>${Number(m.trophies||0).toLocaleString("id-ID")} 🏆</b></div>`
  ).join("") : `<div class="empty">Belum ada data anggota.</div>`;
  renderWar(data.currentWar || {});
}
function renderWar(war) {
  const state = war.state || "unknown";
  const labels = {notInWar:"Tidak sedang war", preparation:"Persiapan", inWar:"War berlangsung", warEnded:"War selesai", unknown:"Tidak ada data war"};
  $("warState").textContent = labels[state] || state;
  $("warSub").textContent = war.endTime ? `Berakhir: ${fmtDate(war.endTime)}` : "Status war terbaru";
  if (state === "notInWar" || state === "unknown" || !war.clan) {
    $("warPanel").innerHTML = `<div class="empty">${state === "notInWar" ? "Clan tidak sedang mengikuti war." : "Status war belum tersedia. Pastikan API key dan akses clan sudah benar."}</div>`;
  } else {
    const c = war.clan || {}, o = war.opponent || {};
    $("warPanel").innerHTML = `<div class="war-grid">
      <div class="war-side ours"><small>CLAN KITA</small><b>${esc(c.name||"Clan")}</b><div class="war-score">${c.stars ?? 0} ⭐</div><small>${c.destructionPercentage ?? 0}% kehancuran</small></div>
      <div class="war-side"><small>LAWAN</small><b>${esc(o.name||"Opponent")}</b><div class="war-score">${o.stars ?? 0} ⭐</div><small>${o.destructionPercentage ?? 0}% kehancuran</small></div>
    </div><div class="war-note">Status: ${esc(labels[state]||state)}${war.endTime ? " · Selesai: "+esc(fmtDate(war.endTime)) : ""}</div>`;
  }
  const signature = `${state}|${war.endTime||""}|${war.clan?.stars}|${war.opponent?.stars}`;
  if (lastWarSignature && signature !== lastWarSignature && Notification.permission === "granted") {
    new Notification("ClashOps — Update War", {body: `${labels[state] || state}. ${war.clan?.stars ?? 0} ⭐ vs ${war.opponent?.stars ?? 0} ⭐`});
  }
  lastWarSignature = signature;
}

let oneSignalReady = false;
window.OneSignalDeferred = window.OneSignalDeferred || [];
window.OneSignalDeferred.push(async function(OneSignal) {
  const appId = window.CLASHOPS_ONESIGNAL_APP_ID || "";
  if (!appId || appId === "YOUR_ONESIGNAL_APP_ID") {
    $("notifyBtn").textContent = "Atur Push Notification";
    return;
  }
  try {
    await OneSignal.init({ appId, notifyButton: { enable: false } });
    oneSignalReady = true;
    $("notifyBtn").textContent = OneSignal.User.PushSubscription.optedIn ? "Notifikasi aktif" : "Aktifkan notifikasi";
  } catch (err) {
    console.error("OneSignal initialization failed", err);
    $("notifyBtn").textContent = "Notifikasi belum siap";
  }
});
$("notifyBtn").addEventListener("click", async () => {
  if (oneSignalReady && window.OneSignal) {
    try {
      await window.OneSignal.Notifications.requestPermission();
      $("notifyBtn").textContent = window.OneSignal.User.PushSubscription.optedIn ? "Notifikasi aktif" : "Aktifkan notifikasi";
    } catch (err) { console.error(err); alert("Tidak bisa mengaktifkan push. Periksa izin notifikasi browser."); }
  } else {
    alert("Push belum dikonfigurasi. Isi OneSignal App ID di config.js dan Secrets/Variables GitHub sesuai README.");
  }
});

let installPrompt = null;
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
  $("installBtn").hidden = false;
});
$("installBtn").addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  $("installBtn").hidden = true;
});
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(console.error));
}

const STORAGE_KEY = "clashops-upgrades-v1";
function getUpgrades(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");}catch{return [];} }
function saveUpgrades(items){localStorage.setItem(STORAGE_KEY,JSON.stringify(items));renderUpgrades();}
function renderUpgrades(){
  const items=getUpgrades();
  if(!items.length){$("upgrades").innerHTML='<div class="empty">Belum ada timer upgrade.</div>';return;}
  $("upgrades").innerHTML=items.sort((a,b)=>a.end-b.end).map(item=>{
    const remaining=item.end-Date.now();
    let time=remaining<=0?"SELESAI":`${Math.floor(remaining/3600000)}j ${Math.floor((remaining%3600000)/60000)}m`;
    return `<div class="upgrade"><div><b>${esc(item.name)}</b><small>${fmtDate(item.end)}</small></div><div><span class="upgrade-time">${time}</span><button class="remove" data-id="${item.id}" title="Hapus">×</button></div></div>`;
  }).join("");
  document.querySelectorAll(".remove").forEach(btn=>btn.addEventListener("click",()=>saveUpgrades(getUpgrades().filter(x=>x.id!==btn.dataset.id))));
}
$("upgradeForm").addEventListener("submit",e=>{
  e.preventDefault();
  const name=$("upgradeName").value.trim(), end=new Date($("upgradeEnd").value).getTime();
  if(!name||!Number.isFinite(end)||end<=Date.now()) return alert("Pilih waktu selesai yang valid di masa depan.");
  saveUpgrades([...getUpgrades(),{id:crypto.randomUUID(),name,end}]);
  $("upgradeName").value=""; $("upgradeEnd").value="";
});
loadDashboard();
renderUpgrades();
setInterval(loadDashboard, 5*60*1000);
setInterval(renderUpgrades, 30*1000);


// MAX level planner: user-provided levels and average upgrade duration.
const MAX_KEY = "clashops-max-planner-v1";
function getMaxItems(){try{return JSON.parse(localStorage.getItem(MAX_KEY)||"[]");}catch{return [];}}
function saveMaxItems(items){localStorage.setItem(MAX_KEY,JSON.stringify(items));renderMaxPlanner();}
function daysText(days){
  if (!Number.isFinite(days)) return "—";
  const totalHours = Math.round(days * 24);
  const d = Math.floor(totalHours / 24), h = totalHours % 24;
  return `${d} hari ${h} jam`;
}
function slotCount(category){
  const ids = {builder:"builderSlots",lab:"labSlots",pet:"petSlots"};
  const n = Number($(ids[category]).value);
  return Math.max(1, Number.isFinite(n) ? n : 1);
}
function renderMaxPlanner(){
  const items = getMaxItems();
  const categories = {
    builder:{label:"Builder", total:0, maxTask:0},
    lab:{label:"Laboratory", total:0, maxTask:0},
    pet:{label:"Pet House", total:0, maxTask:0}
  };
  items.forEach(item=>{
    const levels = Math.max(0, item.target-item.current);
    const total = levels*item.days;
    if(categories[item.category]){
      categories[item.category].total += total;
      categories[item.category].maxTask = Math.max(categories[item.category].maxTask,total);
    }
  });
  const active = Object.entries(categories).filter(([key,v])=>v.total>0);
  if(!items.length){
    $("maxSummary").innerHTML='<div class="empty">Tambahkan item untuk melihat estimasi menuju MAX.</div>';
  } else {
    const cards = active.map(([key,v])=>{
      const slots=slotCount(key);
      // Approximate workload scheduling: divide total remaining work by concurrent slots.
      const calendar=Math.max(v.maxTask,v.total/slots);
      return `<div class="max-total"><small>${v.label.toUpperCase()} · ${slots} SLOT</small><b>${daysText(v.total)}</b><span>Estimasi kalender: ${daysText(calendar)}</span></div>`;
    }).join("");
    const totalWork=active.reduce((sum,[,v])=>sum+v.total,0);
    $("maxSummary").innerHTML=`<div class="max-summary-grid">${cards}<div class="max-total overall"><small>TOTAL SELURUH UPGRADE</small><b>${daysText(totalWork)}</b><span>Akumulasi hari kerja, bukan tanggal selesai akun.</span></div></div>`;
  }
  $("maxItems").innerHTML=items.map(item=>{
    const levels=Math.max(0,item.target-item.current), total=levels*item.days;
    const category={builder:"Builder",lab:"Laboratory",pet:"Pet House"}[item.category];
    return `<div class="upgrade"><div><b>${esc(item.name)}</b><small>${category} · Lv ${item.current} → Lv ${item.target} · ${levels} level tersisa · ${item.days} hari/level</small></div><div><span class="upgrade-time">${daysText(total)}</span><button class="remove" data-max-id="${item.id}" title="Hapus">×</button></div></div>`;
  }).join("");
  document.querySelectorAll("[data-max-id]").forEach(btn=>btn.addEventListener("click",()=>saveMaxItems(getMaxItems().filter(x=>x.id!==btn.dataset.maxId))));
}
$("maxForm").addEventListener("submit",e=>{
  e.preventDefault();
  const name=$("maxItemName").value.trim();
  const category=$("maxCategory").value;
  const current=Number($("maxCurrent").value), target=Number($("maxTarget").value), days=Number($("maxDays").value);
  if(!name || !Number.isInteger(current) || !Number.isInteger(target) || current<0 || target<1 || target<=current || !Number.isFinite(days) || days<=0){
    return alert("Periksa input: level MAX harus lebih tinggi dari level sekarang dan durasi harus lebih dari 0.");
  }
  saveMaxItems([...getMaxItems(),{id:crypto.randomUUID(),name,category,current,target,days}]);
  $("maxItemName").value="";
});
["builderSlots","labSlots","petSlots"].forEach(id=>$(id).addEventListener("input",renderMaxPlanner));
renderMaxPlanner();
