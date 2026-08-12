const APP_KEY = "food-storage-pwa-v1";
const CATEGORY_LIST = ["肉类","蔬菜","水果","海鲜","蛋奶","豆制品","主食","零食","饮料","甜品","调味","其他"];
const STORAGE_LABEL = {fridge:"冰箱",snacks:"零食柜",cabinet:"橱柜"};
const ZONE_LABEL = {chiller:"冷藏",freezer:"冷冻"};
const defaultData = {
  version: 1,
  updatedAt: new Date().toISOString(),
  settings: { expirySoonDays: 7 },
  items: []
};

const recipes = [
  {name:"鸡腿肉蔬菜饭", time:25, categories:["肉类","蔬菜","主食"], ingredients:["鸡腿肉","任意蔬菜","米饭"], steps:["鸡腿肉切块并煎熟","加入蔬菜翻炒","配米饭装盘"]},
  {name:"番茄鸡蛋面", time:18, categories:["蔬菜","蛋奶","主食"], ingredients:["番茄","鸡蛋","面"], steps:["番茄炒出汁","加入鸡蛋","煮面后浇上汤汁"]},
  {name:"三文鱼拌饭", time:20, categories:["海鲜","主食","蔬菜"], ingredients:["三文鱼","米饭","蔬菜"], steps:["三文鱼煎熟","蔬菜简单处理","和米饭一起装碗"]},
  {name:"牛肉蔬菜炒饭", time:20, categories:["肉类","蔬菜","主食"], ingredients:["牛肉","蔬菜","米饭"], steps:["牛肉快炒盛出","炒蔬菜与米饭","牛肉回锅调味"]},
  {name:"酸奶水果碗", time:5, categories:["蛋奶","水果","甜品"], ingredients:["酸奶","水果"], steps:["水果切块","加入酸奶","可撒坚果或麦片"]},
  {name:"清冰箱杂蔬汤", time:25, categories:["蔬菜"], ingredients:["任意蔬菜","调味料"], steps:["蔬菜切块","加水煮软","按口味调味"]},
  {name:"海鲜蔬菜乌冬", time:15, categories:["海鲜","蔬菜","主食"], ingredients:["海鲜","蔬菜","乌冬"], steps:["蔬菜下锅","加入海鲜与汤底","放乌冬煮熟"]},
  {name:"奶香土豆炖肉", time:35, categories:["肉类","蔬菜","蛋奶"], ingredients:["肉类","土豆","牛奶"], steps:["肉类煎香","加入土豆炖软","少量牛奶收汁"]},
  {name:"鸡蛋蔬菜三明治", time:12, categories:["蛋奶","蔬菜","主食"], ingredients:["鸡蛋","蔬菜","面包"], steps:["鸡蛋煎熟","蔬菜洗净","夹入面包"]},
  {name:"豆腐蔬菜煲", time:20, categories:["豆制品","蔬菜"], ingredients:["豆腐","任意蔬菜","调味料"], steps:["豆腐切块煎至定型","加入蔬菜翻炒","加少量水和调味料焖煮"]},
  {name:"水果气泡饮", time:5, categories:["水果","饮料"], ingredients:["水果","气泡水"], steps:["水果切片","加入冰块","倒入气泡水"]}
];

let state = loadLocal();
let currentView = "storage";
let currentStorage = "fridge";
let currentZone = "chiller";
let currentCategory = "全部";
let sortByExpiry = true;
let selectedCategory = "其他";
let selectedOpened = false;
let deferredPrompt = null;
let boundFileHandle = null;

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

function normalizeData(obj){
  if(!obj || typeof obj !== "object") return structuredClone(defaultData);
  if(!Array.isArray(obj.items)) obj.items = [];
  obj.items = obj.items.map(i => {
    const note = String(i.note || "");
    let opened = typeof i.opened === "boolean" ? i.opened : /已开封/.test(note);
    let cleanNote = note;
    if(typeof i.opened !== "boolean" && note.trim() === "已开封") cleanNote = "";
    return {
      ...i,
      category: i.category || "其他",
      qty: Number(i.qty || 1),
      unit: i.unit || "份",
      expiry: i.expiry || "",
      note: cleanNote,
      opened
    };
  });
  if(!obj.settings) obj.settings = {expirySoonDays:7};
  return obj;
}

function loadLocal(){
  try{
    const raw = localStorage.getItem(APP_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      if(parsed && Array.isArray(parsed.items)) return normalizeData(parsed);
    }
  }catch(e){}
  return structuredClone(defaultData);
}

function saveLocal(){
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(APP_KEY, JSON.stringify(state));
  renderAll();
}

function daysUntil(dateStr){
  if(!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target - today)/86400000);
}

function expiryText(item){
  const d = daysUntil(item.expiry);
  if(d === null) return {text:"未设置到期日", cls:""};
  if(d < 0) return {text:`已过期 ${Math.abs(d)} 天`, cls:"expired"};
  if(d === 0) return {text:"今天到期", cls:"soon"};
  if(d === 1) return {text:"明天到期", cls:"soon"};
  if(d <= 7) return {text:`${d} 天后到期`, cls:"soon"};
  return {text:`${item.expiry} 到期`, cls:""};
}

function escapeHtml(str=""){
  return String(str ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

function makeId(){
  if(window.crypto && typeof window.crypto.randomUUID === "function"){
    return window.crypto.randomUUID();
  }
  return "food-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function renderAll(){
  renderSummary();
  renderCategoryChips();
  renderStorage();
  renderAlerts();
  renderRecipes();
  refreshDataTextarea();
  updateControls();
}

function renderSummary(){
  const items = state.items;
  const expired = items.filter(i => {const d=daysUntil(i.expiry); return d!==null && d<0;}).length;
  const soon = items.filter(i => {const d=daysUntil(i.expiry); return d!==null && d>=0 && d<=7;}).length;
  $("#totalCount").textContent = items.length;
  $("#soonCount").textContent = soon;
  $("#expiredCount").textContent = expired;
  $("#summaryHint").textContent = expired ? `有 ${expired} 件已过期，建议优先处理。` : soon ? `有 ${soon} 件将在 7 天内到期。` : items.length ? "目前没有临近到期的食物。" : "开始登记你的食物。";
  const badgeNum = expired + soon;
  $("#alertBadge").textContent = badgeNum;
  $("#alertBadge").classList.toggle("hidden", badgeNum === 0);
}

function renderCategoryChips(){
  $("#categoryChips").innerHTML = ["全部",...CATEGORY_LIST].map(c =>
    `<button class="chip ${currentCategory===c?'active':''}" data-category="${c}" type="button">${c}</button>`
  ).join("");
  $$("#categoryChips .chip").forEach(btn => btn.onclick = () => {
    currentCategory = btn.dataset.category;
    renderStorage(); renderCategoryChips();
  });
}

function filteredItems(){
  let list = state.items.filter(i => i.storage === currentStorage);
  if(currentStorage === "fridge") list = list.filter(i => (i.zone || "chiller") === currentZone);
  if(currentCategory !== "全部") list = list.filter(i => i.category === currentCategory);
  const q = $("#searchInput").value.trim().toLowerCase();
  if(q) list = list.filter(i => `${i.name} ${i.note||""} ${i.category} ${i.opened?"已开封":"未开封"}`.toLowerCase().includes(q));
  if(sortByExpiry){
    list.sort((a,b) => {
      if(!a.expiry && !b.expiry) return (b.addedAt||"").localeCompare(a.addedAt||"");
      if(!a.expiry) return 1;if(!b.expiry) return -1;
      return a.expiry.localeCompare(b.expiry);
    });
  } else {
    list.sort((a,b)=>(b.addedAt||"").localeCompare(a.addedAt||""));
  }
  return list;
}

function renderStorage(){
  const list = filteredItems();
  $("#fridgeZoneTabs").classList.toggle("hidden", currentStorage !== "fridge");
  $("#storageTitle").textContent = currentStorage === "fridge" ? `冰箱 · ${ZONE_LABEL[currentZone]}` : STORAGE_LABEL[currentStorage];
  $("#storageSubtitle").textContent = `${list.length} 件食物`;
  $("#foodList").classList.toggle("hidden", list.length===0);
  $("#storageEmpty").classList.toggle("hidden", list.length!==0);
  $("#foodList").innerHTML = list.map(item => {
    const exp = expiryText(item);
    return `<article class="food-card" data-id="${item.id}">
      <div class="food-card-top">
        <div class="food-name">${escapeHtml(item.name)}</div>
        <button class="card-menu" data-edit="${item.id}" type="button" aria-label="编辑">•••</button>
      </div>
      <div class="food-meta">
        <span class="tag">${item.category}</span>
        <span class="tag">${STORAGE_LABEL[item.storage]}${item.storage==="fridge"?" · "+ZONE_LABEL[item.zone||"chiller"]:""}</span>
        <span class="tag open-tag ${item.opened?"opened":"sealed"}">${item.opened?"已开封":"未开封"}</span>
      </div>
      <div class="expiry ${exp.cls}">${exp.text}</div>
      ${item.note?`<div class="note-tag"><span>备注</span>${escapeHtml(item.note)}</div>`:""}
      <div class="card-foot">
        <div class="qty">${item.qty ?? 1} ${escapeHtml(item.unit||"份")}</div>
        <button class="use-btn" data-use="${item.id}" type="button">用完</button>
      </div>
    </article>`;
  }).join("");
  $$("[data-edit]").forEach(b => b.onclick = () => openFoodDialog(b.dataset.edit));
  $$("[data-use]").forEach(b => b.onclick = () => consumeItem(b.dataset.use));
}

function renderAlerts(){
  const expired = [], three = [], seven = [], nodate = [];
  state.items.forEach(i => {
    const d = daysUntil(i.expiry);
    if(d === null) nodate.push(i);
    else if(d < 0) expired.push(i);
    else if(d <= 3) three.push(i);
    else if(d <= 7) seven.push(i);
  });
  $("#alertSummary").innerHTML = `
    <div class="alert-stat"><strong>${expired.length}</strong><span>已过期</span></div>
    <div class="alert-stat"><strong>${three.length}</strong><span>3 天内到期</span></div>
    <div class="alert-stat"><strong>${seven.length}</strong><span>4–7 天内到期</span></div>`;
  const byExpiry = (a,b) => (a.expiry||"9999-99-99").localeCompare(b.expiry||"9999-99-99");
  expired.sort(byExpiry); three.sort(byExpiry); seven.sort(byExpiry);
  nodate.sort((a,b)=>(b.addedAt||"").localeCompare(a.addedAt||""));
  const groups = [
    ["已过期", expired, "expired"],
    ["3 天内到期", three, "soon"],
    ["4–7 天内到期", seven, "soon"],
    ["未设置到期日", nodate, ""]
  ];
  $("#alertGroups").innerHTML = groups.map(([title,list,cls]) => {
    if(!list.length) return "";
    return `<section class="alert-group"><h3>${title} · ${list.length}</h3>${list.map(i => {
      const exp = expiryText(i);
      return `<div class="alert-row"><div><strong>${escapeHtml(i.name)}</strong><br><small>${STORAGE_LABEL[i.storage]}${i.storage==="fridge"?" · "+ZONE_LABEL[i.zone||"chiller"]:""} · ${i.category}</small></div><div class="expiry ${cls}">${exp.text}</div></div>`;
    }).join("")}</section>`;
  }).join("") || `<div class="empty-state"><h3>暂无日期提醒</h3><p>添加到期日后，这里会自动整理提醒。</p></div>`;
}

function recipeScore(r){
  const categories = new Set(state.items.map(i => i.category));
  const urgentCategories = new Set(
    state.items
      .filter(i => { const d = daysUntil(i.expiry); return d !== null && d <= 7; })
      .map(i => i.category)
  );
  const base = r.categories.reduce((n,c)=>n+(categories.has(c)?1:0),0);
  const urgentBoost = r.categories.reduce((n,c)=>n+(urgentCategories.has(c)?0.35:0),0);
  return base + urgentBoost;
}

function recommendedRecipes(){
  const mode = $("#recipeMode")?.value || "best";
  let list = recipes.map(r => ({...r, score: recipeScore(r)}));
  if(mode === "quick") list = list.filter(r => r.time <= 25).sort((a,b)=>b.score-a.score || a.time-b.time);
  else if(mode === "random") list.sort(()=>Math.random()-.5);
  else list.sort((a,b)=>b.score-a.score || a.time-b.time);
  return list;
}

function renderRecipes(){
  const list = recommendedRecipes();
  if(!$("#recipeCard").dataset.recipe) $("#recipeCard").dataset.recipe = list[0]?.name || recipes[0].name;
  let selected = recipes.find(r=>r.name === $("#recipeCard").dataset.recipe) || list[0];
  renderRecipeCard(selected);
  $("#recipeList").innerHTML = list.slice(0,6).map(r => `
    <button class="recipe-mini" data-recipe="${r.name}" type="button">
      <strong>${r.name}</strong>
      <small>${r.time} 分钟 · 匹配 ${r.categories.filter(c=>state.items.some(i=>i.category===c)).length}/${r.categories.length} 类库存</small>
    </button>`).join("");
  $$("[data-recipe]").forEach(b => b.onclick = () => {
    const r = recipes.find(x=>x.name===b.dataset.recipe);
    $("#recipeCard").dataset.recipe = r.name; renderRecipeCard(r);
  });
}

function renderRecipeCard(r){
  const categories = new Set(state.items.map(i => i.category));
  const have = r.categories.filter(c=>categories.has(c));
  const miss = r.categories.filter(c=>!categories.has(c));
  $("#recipeCard").innerHTML = `
    <div class="recipe-muted">当前推荐 · ${r.time} 分钟</div>
    <div class="recipe-title">${r.name}</div>
    <div class="recipe-tags">${r.categories.map(c=>`<span class="recipe-tag">${c}</span>`).join("")}</div>
    <div class="recipe-columns">
      <div><div class="recipe-muted">库存匹配</div><ul>
        ${(have.length?have:["暂无匹配标签"]).map(x=>`<li>${x}</li>`).join("")}
      </ul></div>
      <div><div class="recipe-muted">可能还缺</div><ul>
        ${(miss.length?miss:["基本齐全"]).map(x=>`<li>${x}</li>`).join("")}
      </ul></div>
    </div>
    <div class="recipe-muted">建议食材：${r.ingredients.join("、")}</div>`;
}

function updateControls(){
  $$(".top-tab").forEach(b=>b.classList.toggle("active",b.dataset.view===currentView));
  $$(".view").forEach(v=>v.classList.toggle("active",v.id===currentView+"View"));
  $$(".bottom-tab").forEach(b=>b.classList.toggle("active",b.dataset.storage===currentStorage));
  $$(".zone-tab").forEach(b=>b.classList.toggle("active",b.dataset.zone===currentZone));
  const storageNavVisible = currentView === "storage";
  $(".bottom-tabs").style.display = storageNavVisible ? "" : "none";
  $("#fabAdd").style.display = (storageNavVisible && innerWidth <= 860) ? "" : "none";
}

function openFoodDialog(id=null){
  $("#foodForm").reset();
  $("#foodFormFeedback")?.classList.add("hidden");
  $("#itemId").value = id || "";
  $("#deleteItemBtn").classList.toggle("hidden", !id);
  $("#foodDialogTitle").textContent = id ? "编辑食物" : "添加食物";
  selectedCategory = "其他";
  selectedOpened = false;
  if(id){
    const i = state.items.find(x=>x.id===id);
    if(!i) return;
    $("#foodName").value=i.name; $("#foodStorage").value=i.storage;
    $("#foodZone").value=i.zone||"chiller"; selectedCategory=i.category;
    $("#foodQty").value=i.qty??1; $("#foodUnit").value=i.unit||"份";
    $("#foodExpiry").value=i.expiry||""; $("#foodNote").value=i.note||"";
    selectedOpened=Boolean(i.opened);
  }else{
    $("#foodStorage").value=currentStorage;
    $("#foodZone").value=currentZone;
  }
  renderCategoryPicker(); renderOpenStatePicker(); updateZoneField();
  $("#foodDialog").showModal();
}

function renderCategoryPicker(){
  $("#categoryPicker").innerHTML = CATEGORY_LIST.map(c=>`<button type="button" class="category-option ${selectedCategory===c?'active':''}" data-pickcat="${c}">${c}</button>`).join("");
  $$("[data-pickcat]").forEach(b=>b.onclick=()=>{
    selectedCategory=b.dataset.pickcat;
    $("#foodFormFeedback")?.classList.add("hidden");
    renderCategoryPicker();
  });
}

function renderOpenStatePicker(){
  $$("#openStatePicker .state-option").forEach(btn => {
    const isOpened = btn.dataset.opened === "true";
    btn.classList.toggle("active", selectedOpened === isOpened);
    btn.setAttribute("aria-pressed", selectedOpened === isOpened ? "true" : "false");
    btn.onclick = () => {
      selectedOpened = isOpened;
      renderOpenStatePicker();
    };
  });
}

function updateZoneField(){
  $("#zoneField").classList.toggle("hidden", $("#foodStorage").value !== "fridge");
}

function saveItem(){
  const name=$("#foodName").value.trim();
  if(!name){
    $("#foodName").focus();
    if(typeof $("#foodName").reportValidity === "function") $("#foodName").reportValidity();
    return;
  }
  const id=$("#itemId").value;
  const item={
    id:id||makeId(),
    name,
    storage:$("#foodStorage").value,
    zone:$("#foodStorage").value==="fridge"?$("#foodZone").value:null,
    category:selectedCategory,
    qty:Number($("#foodQty").value||1),
    unit:$("#foodUnit").value,
    expiry:$("#foodExpiry").value||"",
    opened:selectedOpened,
    note:$("#foodNote").value.trim(),
    addedAt:id?(state.items.find(x=>x.id===id)?.addedAt||new Date().toISOString()):new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };
  try{
    if(id){
      const editIndex = state.items.findIndex(x=>x.id===id);
      if(editIndex >= 0) state.items[editIndex] = item;
      else state.items.unshift(item);
    }else{
      state.items.unshift(item);
    }
    currentStorage=item.storage;
    if(item.storage==="fridge") currentZone=item.zone||"chiller";
    saveLocal();
    $("#foodDialog").close();
    toast(id?"已更新":"已添加");
  }catch(err){
    console.error("保存食物失败", err);
    const feedback = $("#foodFormFeedback");
    if(feedback){
      feedback.textContent = "保存失败，请重新尝试。若仍无法保存，请刷新页面后再试。";
      feedback.classList.remove("hidden");
    }
  }
}

function consumeItem(id){
  const i=state.items.find(x=>x.id===id); if(!i)return;
  state.items=state.items.filter(x=>x.id!==id); saveLocal(); toast(`已将「${i.name}」标记为用完`);
}

function deleteCurrent(){
  const id=$("#itemId").value;if(!id)return;
  const i=state.items.find(x=>x.id===id);
  state.items=state.items.filter(x=>x.id!==id);saveLocal();$("#foodDialog").close();toast(`已删除「${i?.name||"食物"}」`);
}

function refreshDataTextarea(){
  const el=$("#dataTextarea"); if(el) el.value=JSON.stringify(state,null,2);
}

function validateData(obj){
  if(!obj || typeof obj!=="object" || !Array.isArray(obj.items)) throw new Error("数据格式不正确：缺少 items 数组");
  obj.items.forEach((i,idx)=>{
    if(!i.id || !i.name || !i.storage) throw new Error(`第 ${idx+1} 条食物缺少必要字段`);
  });
  return normalizeData(obj);
}

function applyImported(obj){
  state=validateData(obj);
  saveLocal();
  toast("数据已导入并保存");
}

function exportData(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="food-data.json";a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast("已导出 food-data.json");
}

async function importFile(file){
  try{ applyImported(JSON.parse(await file.text())); }catch(e){toast("导入失败："+e.message);}
}

async function loadRepoData(){
  try{
    const r=await fetch(`./food-data.json?t=${Date.now()}`,{cache:"no-store"});
    if(!r.ok) throw new Error("未找到本站数据文件");
    applyImported(await r.json());
  }catch(e){toast("读取失败："+e.message);}
}

async function bindFile(){
  if(!window.showOpenFilePicker){toast("当前浏览器不支持绑定本地文件");return;}
  try{
    [boundFileHandle]=await window.showOpenFilePicker({types:[{description:"JSON 数据",accept:{"application/json":[".json"],"text/plain":[".txt"]}}],multiple:false});
    $("#readBoundBtn").disabled=false;$("#writeBoundBtn").disabled=false;toast("已绑定文件");
  }catch(e){ if(e.name!=="AbortError") toast("绑定失败"); }
}
async function readBound(){
  try{applyImported(JSON.parse(await (await boundFileHandle.getFile()).text()));}catch(e){toast("读取失败："+e.message);}
}
async function writeBound(){
  try{
    const w=await boundFileHandle.createWritable();await w.write(JSON.stringify(state,null,2));await w.close();toast("已写入绑定文件");
  }catch(e){toast("写入失败："+e.message);}
}

function toast(msg){
  const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove("show"),2200);
}

$$(".top-tab").forEach(b=>b.onclick=()=>{currentView=b.dataset.view;updateControls();if(currentView==="ideas")renderRecipes();});
$$(".bottom-tab").forEach(b=>b.onclick=()=>{currentStorage=b.dataset.storage;currentCategory="全部";renderAll();});
$$(".zone-tab").forEach(b=>b.onclick=()=>{currentZone=b.dataset.zone;renderAll();});
$("#searchInput").oninput=renderStorage;
$("#sortBtn").onclick=()=>{sortByExpiry=!sortByExpiry;$("#sortBtn").textContent=sortByExpiry?"按到期日排序":"按添加时间排序";renderStorage();};
$("#filterBtn").onclick=()=>{currentCategory="全部";renderCategoryChips();renderStorage();};
$("#addBtnDesktop").onclick=()=>openFoodDialog();
$("#fabAdd").onclick=()=>openFoodDialog();
$("#emptyAddBtn").onclick=()=>openFoodDialog();
$("#foodStorage").onchange=updateZoneField;
$("#closeFoodBtn").onclick=()=>$("#foodDialog").close();
$("#cancelFoodBtn").onclick=()=>$("#foodDialog").close();
$("#foodForm").addEventListener("submit",e=>e.preventDefault());
$("#saveItemBtn").onclick=saveItem;
$("#deleteItemBtn").onclick=deleteCurrent;
$("#syncBtn").onclick=()=>{$("#syncDialog").showModal();refreshDataTextarea();};
$("#closeSyncBtn").onclick=()=>$("#syncDialog").close();
$("#exportBtn").onclick=exportData;
$("#importFile").onchange=e=>{if(e.target.files[0])importFile(e.target.files[0]);e.target.value="";};
$("#loadRepoBtn").onclick=loadRepoData;
$("#refreshTextBtn").onclick=refreshDataTextarea;
$("#copyTextBtn").onclick=async()=>{await navigator.clipboard.writeText($("#dataTextarea").value);toast("已复制");};
$("#applyTextBtn").onclick=()=>{try{applyImported(JSON.parse($("#dataTextarea").value));}catch(e){toast("应用失败："+e.message);}};
$("#bindFileBtn").onclick=bindFile;$("#readBoundBtn").onclick=readBound;$("#writeBoundBtn").onclick=writeBound;
$("#randomRecipeBtn").onclick=()=>{
  const list=recommendedRecipes();const pool=$("#recipeMode").value==="best"?list.slice(0,Math.max(1,Math.min(4,list.length))):list;
  const r=pool[Math.floor(Math.random()*pool.length)]||recipes[0];$("#recipeCard").dataset.recipe=r.name;renderRecipeCard(r);
};
$("#recipeMode").onchange=()=>{$("#recipeCard").dataset.recipe="";renderRecipes();};

window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("#installBtn").classList.remove("hidden");});
$("#installBtn").onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("#installBtn").classList.add("hidden");};
window.addEventListener("resize",updateControls);

if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js"));

(async function firstSeed(){
  if(!localStorage.getItem(APP_KEY)){
    try{
      const r=await fetch("./food-data.json",{cache:"no-store"});
      if(r.ok){const d=await r.json();if(Array.isArray(d.items)) state=normalizeData(d);}
    }catch(e){}
    localStorage.setItem(APP_KEY,JSON.stringify(state));
  }
  renderAll();
})();