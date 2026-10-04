const $ = id => document.getElementById(id);
let currentType = "movie";
let contentItems = [];
let seasons = [];
let currentSeasonId = null;

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

async function loadGenres(selected = []) {
  const data = await api("/api/genres");
  $("genres").innerHTML = data.genres.map(g =>
    `<label class="chip"><input type="checkbox" value="${esc(g.name)}" ${selected.includes(g.name) ? "checked" : ""}> ${esc(g.name)}</label>`
  ).join("") || '<span class="muted">Add your first genre below.</span>';
}

async function loadList() {
  const type = $("filterType").value;
  const q = $("search").value.trim();
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (q) params.set("q", q);
  const data = await api("/api/content?" + params);
  contentItems = data.content;
  $("contentList").innerHTML = contentItems.map(item =>
    `<div class="item" data-id="${item.id}">
      <span class="status">${esc(item.status)}</span>
      <strong>${esc(item.title)}</strong>
      <small>${item.type === "show" ? "TV Show" : "Movie"} · ${esc(item.year || "")} ${item.rating ? "· " + esc(item.rating) : ""}</small>
    </div>`
  ).join("") || '<p class="muted">No content yet.</p>';
  document.querySelectorAll(".item").forEach(el => {
    el.onclick = () => editContent(el.dataset.id);
  });
}

async function editContent(id) {
  const item = contentItems.find(x => x.id === id);
  if (!item) return;
  currentType = item.type;
  $("formTitle").textContent = item.type === "show" ? "Edit TV Show" : "Edit Movie";
  $("contentId").value = item.id;
  $("title").value = item.title || "";
  $("year").value = item.year || "";
  $("description").value = item.description || "";
  $("runtime").value = item.runtime_minutes || "";
  $("rating").value = item.rating || "";
  $("status").value = item.status || "draft";
  $("releaseAt").value = item.release_at ? item.release_at.slice(0,16) : "";
  $("posterUrl").value = item.poster_url || "";
  $("backdropUrl").value = item.backdrop_url || "";
  $("trailerUrl").value = item.trailer_url || "";
  $("videoUrl").value = item.video_url || "";
  $("featured").checked = !!item.featured;
  $("posterPreview").innerHTML = item.poster_url ? `<img src="${esc(item.poster_url)}">` : "Poster preview";
  $("backdropPreview").innerHTML = item.backdrop_url ? `<img src="${esc(item.backdrop_url)}">` : "Netflix-style backdrop preview";
  $("showTools").style.display = item.type === "show" ? "block" : "none";
  const genreData = await api("/api/genres");
  const selected = String(item.genres || "").split("||").filter(Boolean);
  const all = await api("/api/content?type=" + item.type);
  const full = all.content.find(x => x.id === id);
  // Genres are loaded separately below.
  await loadGenres(selected);
  if (item.type === "show") loadSeasons(item.id);
}

function resetForm(type = "movie") {
  currentType = type;
  $("contentForm").reset();
  $("contentId").value = "";
  $("formTitle").textContent = type === "show" ? "Add TV Show" : "Add Movie";
  $("showTools").style.display = type === "show" ? "block" : "none";
  $("posterPreview").textContent = "Poster preview";
  $("backdropPreview").textContent = "Netflix-style backdrop preview";
  $("status").value = "draft";
  $("releaseAt").value = "";
  loadGenres();
}

async function save(statusOverride) {
  const genres = [...document.querySelectorAll("#genres input:checked")].map(x => x.value);
  const body = {
    id: $("contentId").value || undefined,
    type: currentType,
    title: $("title").value.trim(),
    year: $("year").value || null,
    description: $("description").value,
    runtime_minutes: $("runtime").value || null,
    rating: $("rating").value,
    status: statusOverride || $("status").value,
    release_at: $("releaseAt").value ? new Date($("releaseAt").value).toISOString() : null,
    poster_url: $("posterUrl").value.trim(),
    backdrop_url: $("backdropUrl").value.trim(),
    trailer_url: $("trailerUrl").value.trim(),
    video_url: $("videoUrl").value.trim(),
    genres,
    featured: $("featured").checked
  };
  if (!body.title) return alert("Please enter a title.");
  const data = await api("/api/content", {method:"POST", body:JSON.stringify(body)});
  $("contentId").value = data.id;
  alert(statusOverride === "published" ? "Published." : "Saved.");
  await loadList();
  if (currentType === "show") await loadSeasons(data.id);
}

async function uploadFile(file, folder, targetInput, preview) {
  if (!file) return;
  try {
    $("notice").textContent = "Uploading " + file.name + " securely...";
    const res = await fetch("/api/upload?folder=" + encodeURIComponent(folder) + "&filename=" + encodeURIComponent(file.name), {
      method:"POST", headers:{"Content-Type":file.type || "application/octet-stream"}, body:file
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data.ok || !data.url) throw new Error(data.error || ("Upload failed (" + res.status + ")"));
    targetInput.value = data.url;
    if (preview && file.type.startsWith("image/")) preview.innerHTML = '<img src="' + esc(data.url) + '" alt="">';
    $("notice").textContent = "Uploaded " + file.name + ". Click Save to attach it to this title.";
  } catch (err) {
    $("notice").textContent = "Upload failed: " + err.message;
    alert("Upload failed: " + err.message);
  }
}
async function importVideoUrl(inputId, targetId, statusId, folder) {
  const source = $(inputId).value.trim();
  if (!source) return alert("Paste a direct video file link first.");
  $(statusId).textContent = "Downloading video and storing it. Keep this page open while it transfers...";
  $(inputId).disabled = true;
  try {
    const data = await api("/api/import-url", {
      method:"POST",
      body:JSON.stringify({url:source, folder})
    });
    $(targetId).value = data.url || "";
    $(statusId).textContent = data.content_length
      ? "Video imported (" + Math.round(data.content_length/1048576) + " MB) and attached."
      : "Video imported and attached.";
  } catch (err) {
    $(statusId).textContent = "Import failed: " + err.message;
  } finally {
    $(inputId).disabled = false;
  }
}

$("newMovie").onclick = () => resetForm("movie");

async function loadSiteSettings(){
  const d=await api("/api/site-settings"),s=d.settings||{};
  $("blockedSearchTerms").value=(s.blocked_search_terms||[]).join(", ");
  $("featuredIds").value=(s.featured_ids||[]).join(", ");
  $("watchNowIds").value=(s.watch_now_ids||[]).join(", ");
  $("recentIds").value=(s.recent_ids||[]).join(", ");
  $("promoIds").value=(s.promo_ids||[]).join(", ");
}
$("saveSite").onclick=async()=>{
  try{
    $("notice").textContent="Saving site settings...";
    await api("/api/site-settings",{method:"POST",body:JSON.stringify({
      blocked_search_terms:$("blockedSearchTerms").value.split(",").map(x=>x.trim()).filter(Boolean),
      featured_ids:$("featuredIds").value.split(",").map(x=>x.trim()).filter(Boolean),
      watch_now_ids:$("watchNowIds").value.split(",").map(x=>x.trim()).filter(Boolean),
      recent_ids:$("recentIds").value.split(",").map(x=>x.trim()).filter(Boolean),
      promo_ids:$("promoIds").value.split(",").map(x=>x.trim()).filter(Boolean)
    })});
    $("notice").textContent="Site settings saved.";
  }catch(err){$("notice").textContent="Could not save site settings: "+err.message}
};
$("loadUsers").onclick=async()=>{
  try{
    const d=await api("/api/admin/users");
    $("usersPanel").innerHTML=d.users.map(u=>'<div class="item"><strong>'+esc(u.email)+'</strong><small>Created '+esc(u.created_at||"")+' · '+esc(u.profiles||0)+' profiles'+(u.is_admin?' · Admin':"")+(u.disabled?' · Disabled':"")+'</small></div>').join("")||'<p class="muted">No accounts yet.</p>';
  }catch(err){$("usersPanel").innerHTML='<p class="muted">'+esc(err.message)+'</p>'}
};

async function uploadBuilderAsset(file,folder,targetId,statusId){
  if(!file)return;
  try{
    $(statusId).textContent="Uploading "+file.name+"...";
    const r=await fetch("/api/upload?folder="+encodeURIComponent(folder)+"&filename="+encodeURIComponent(file.name),{method:"POST",headers:{"Content-Type":file.type||"application/octet-stream"},body:file});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok)throw new Error(d.error||("Upload failed ("+r.status+")"));
    $(targetId).value=d.url;
    window.builderLogoUrl=$("builderLogoUrl").value;
    $(statusId).textContent="Uploaded. Publish to apply it.";
    refreshBuilder();
  }catch(e){$(statusId).textContent="Upload failed: "+e.message}
}
async function loadBuilder(){
  const d=await api("/api/site-settings"),s=window.ORBITTheme.normalizeSiteTheme(d.settings||{});
  const v={builderLogo:s.logo_text,builderBg:s.background_color,builderHeaderBg:s.header_background,builderCardBg:s.card_background,builderAccent:s.accent,builderText:s.text_color,builderMuted:s.muted_color,builderButton:s.button_color,builderHover:s.button_hover,builderHeroTitle:s.hero_title,builderHeroDescription:s.hero_description,builderHeroBackdrop:s.hero_backdrop,builderFeaturedTitle:s.featured_title,builderRecentTitle:s.recent_title,builderWatchTitle:s.watch_now_title,builderTvTitle:s.tv_title,builderWatchText:s.watch_button_text,builderMaxWidth:s.max_width,builderAdText:s.ad_text,builderFooterAbout:s.footer_about,builderFooterContact:s.footer_contact,builderFooterCopyright:s.footer_copyright,builderFooterPrivacy:s.footer_privacy,builderRadius:s.card_radius,builderShadow:s.card_shadow,builderHeroOverlay:s.hero_overlay,builderPosterHeight:s.poster_height,builderSectionGap:s.section_gap,builderGlow:s.page_glow};
  Object.entries(v).forEach(([k,val])=>{if($(k))$(k).value=val});
  $("builderAdEnabled").checked=s.ad_enabled;$("builderLogoSize").value=s.logo_size;$("builderMaxWidth").value=s.max_width;$("builderLogoUrl").value=s.logo_url;window.builderLogoUrl=s.logo_url;updateBuilderOutputs();refreshBuilder();
}
function updateBuilderOutputs(){
  $("builderLogoSizeOut").textContent=$("builderLogoSize").value;
  $("builderMaxWidthOut").textContent=$("builderMaxWidth").value;
  $("builderRadiusOut").textContent=$("builderRadius").value+"px";
  $("builderShadowOut").textContent=$("builderShadow").value+"px";
  $("builderHeroOverlayOut").textContent=$("builderHeroOverlay").value+"%";
  $("builderPosterHeightOut").textContent=$("builderPosterHeight").value+"px";
  $("builderSectionGapOut").textContent=$("builderSectionGap").value+"px";
  $("builderGlowOut").textContent=$("builderGlow").value+"px";
}
function builderPayload(){
  return window.ORBITTheme.normalizeSiteTheme({
    logo_text:$("builderLogo").value.trim(),logo_url:$("builderLogoUrl").value||window.builderLogoUrl||"",logo_size:Number($("builderLogoSize").value),
    background_color:$("builderBg").value,header_background:$("builderHeaderBg").value,card_background:$("builderCardBg").value,accent:$("builderAccent").value,text_color:$("builderText").value,muted_color:$("builderMuted").value,button_color:$("builderButton").value,button_hover:$("builderHover").value,
    hero_title:$("builderHeroTitle").value.trim(),hero_description:$("builderHeroDescription").value.trim(),hero_backdrop:$("builderHeroBackdrop").value.trim(),featured_title:$("builderFeaturedTitle").value.trim(),recent_title:$("builderRecentTitle").value.trim(),watch_now_title:$("builderWatchTitle").value.trim(),tv_title:$("builderTvTitle").value.trim(),watch_button_text:$("builderWatchText").value.trim(),max_width:Number($("builderMaxWidth").value),
    ad_enabled:$("builderAdEnabled").checked,ad_text:$("builderAdText").value.trim(),footer_about:$("builderFooterAbout").value,footer_contact:$("builderFooterContact").value,footer_copyright:$("builderFooterCopyright").value,footer_privacy:$("builderFooterPrivacy").value,
    card_radius:Number($("builderRadius").value),card_shadow:Number($("builderShadow").value),hero_overlay:Number($("builderHeroOverlay").value),poster_height:Number($("builderPosterHeight").value),section_gap:Number($("builderSectionGap").value),page_glow:Number($("builderGlow").value)
  });
}
function refreshBuilder(){
  const s=builderPayload(),f=$("sitePreview");
  const logo=s.logo_url?'<img src="'+esc(s.logo_url)+'" alt="'+esc(s.logo_text)+'" style="height:'+s.logo_size+'px;max-width:180px;object-fit:contain">':esc(s.logo_text);
  f.srcdoc='<!doctype html><html><head><style>*{box-sizing:border-box}body{margin:0;background:'+s.background_color+';color:'+s.text_color+';font-family:Arial,sans-serif}.bar{height:68px;background:'+s.header_background+';display:flex;align-items:center;padding:0 25px;gap:24px}.hero{min-height:300px;padding:55px;background:linear-gradient(90deg,'+s.background_color+',rgba(0,0,0,.25)),url("'+esc(s.hero_backdrop)+'") center/cover}.hero h1{font-size:48px}.hero p{max-width:650px;color:'+s.muted_color+'}.btn{display:inline-block;background:'+s.button_color+';color:#000;padding:10px 15px;border-radius:'+s.card_radius+'px;box-shadow:0 14px '+s.card_shadow+'px rgba(0,0,0,.45)}.section{max-width:'+s.max_width+'px;margin:auto;padding:'+s.section_gap+'px}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:'+s.section_gap+'px}.card{height:'+s.poster_height+'px;background:'+s.card_background+';border-radius:'+s.card_radius+'px;box-shadow:0 14px '+s.card_shadow+'px rgba(0,0,0,.45)}.ad{margin:15px auto;padding:20px;max-width:'+s.max_width+'px;border:1px dashed #555;text-align:center;color:'+s.muted_color+'}.footer{padding:'+s.section_gap+'px;color:'+s.muted_color+'}</style></head><body><div class="bar"><div>'+logo+'</div><span>Home</span><span>Movies</span><span>TV</span><span style="margin-left:auto">Search</span></div><div class="hero" style="box-shadow:inset 0 0 0 999px rgba(0,0,0,'+(s.hero_overlay/100)+')"><h1>'+esc(s.hero_title)+'</h1><p>'+esc(s.hero_description)+'</p><span class="btn">'+esc(s.watch_button_text)+'</span></div>'+(s.ad_enabled?'<div class="ad">'+esc(s.ad_text)+'</div>':"")+'<div class="section"><h2>'+esc(s.featured_title)+'</h2><div class="grid"><div class="card"></div><div class="card"></div><div class="card"></div><div class="card"></div><div class="card"></div></div></div><div class="section"><h2>'+esc(s.recent_title)+'</h2><div class="grid"><div class="card"></div><div class="card"></div><div class="card"></div><div class="card"></div><div class="card"></div></div></div><div class="footer">'+esc(s.footer_about)+'</div></body></html>';
}
["builderLogo","builderLogoSize","builderBg","builderHeaderBg","builderCardBg","builderAccent","builderText","builderMuted","builderButton","builderHover","builderHeroTitle","builderHeroDescription","builderHeroBackdrop","builderFeaturedTitle","builderRecentTitle","builderWatchTitle","builderTvTitle","builderWatchText","builderMaxWidth","builderAdEnabled","builderAdText","builderFooterAbout","builderFooterContact","builderFooterCopyright","builderFooterPrivacy","builderRadius","builderShadow","builderHeroOverlay","builderPosterHeight","builderSectionGap","builderGlow"].forEach(id=>$(id)?.addEventListener("input",()=>{updateBuilderOutputs();refreshBuilder()}));
$("builderLogoUpload").onclick=()=>uploadBuilderAsset($("builderLogoFile").files[0],"site","builderLogoUrl","builderLogoStatus");
$("builderHeroUpload").onclick=()=>uploadBuilderAsset($("builderHeroFile").files[0],"site-backgrounds","builderHeroBackdrop","builderLogoStatus");
$("builderRefresh").onclick=()=>loadBuilder().catch(e=>$("notice").textContent="Could not reset preview: "+e.message);
$("builderSave").onclick=async()=>{try{$("notice").textContent="Saving website changes...";const saved=await api("/api/site-settings",{method:"POST",body:JSON.stringify(builderPayload())});$("notice").textContent="Website changes saved.";await loadBuilder()}catch(e){$("notice").textContent="Could not save website changes: "+e.message}};
const themes={builderThemeNight:{background_color:"#090b12",header_background:"#111522",card_background:"#181d2b",accent:"#7c5cff",text_color:"#f4f6ff",muted_color:"#aab1c2",button_color:"#f4f6ff",button_hover:"#d8dced"},builderThemeNeon:{background_color:"#05050a",header_background:"#0b0b14",card_background:"#151525",accent:"#00e5ff",text_color:"#ffffff",muted_color:"#9aa7b8",button_color:"#00e5ff",button_hover:"#66f0ff"},builderThemeCinema:{background_color:"#100b08",header_background:"#17120f",card_background:"#241a14",accent:"#d7a45a",text_color:"#fff7eb",muted_color:"#c5b8a7",button_color:"#d7a45a",button_hover:"#e7c07e"},builderThemeClean:{background_color:"#f4f5f7",header_background:"#ffffff",card_background:"#e9ebef",accent:"#5b5bd6",text_color:"#17181c",muted_color:"#5e6470",button_color:"#5b5bd6",button_hover:"#7373e2"}};
Object.entries(themes).forEach(([id,v])=>$(id)?.addEventListener("click",()=>{const map={background_color:"builderBg",header_background:"builderHeaderBg",card_background:"builderCardBg",accent:"builderAccent",text_color:"builderText",muted_color:"builderMuted",button_color:"builderButton",button_hover:"builderHover"};Object.entries(v).forEach(([k,val])=>$(map[k]).value=val);updateBuilderOutputs();refreshBuilder()}));
async function bootstrapAdmin(){try{const me=await api("/api/auth/me");if(!me.authenticated){$("accessMessage").textContent="You are not signed in.";return}if(!me.user||Number(me.user.is_admin)!==1){$("accessMessage").textContent="This account does not have administrator access.";return}document.body.classList.remove("locked");$("accessGate").style.display="none";resetForm("movie");await Promise.all([loadList(),loadBuilder(),loadSiteSettings()])}catch(e){$("accessMessage").textContent=e.message||"Could not verify administrator access."}}
bootstrapAdmin();